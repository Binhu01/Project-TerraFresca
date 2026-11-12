"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import type {
  Task,
  TaskWithDetails,
  TaskChecklist,
  CreateTaskInput,
  UpdateTaskInput,
  TaskFilters,
  TasksDashboardStats,
  KanbanColumn,
  TaskStatus,
  CalendarEvent,
  CalendarEventWithDetails,
  EventAttendee,
  EventReminder,
  CreateEventInput,
  UpdateEventInput,
  CalendarFilters,
  Notification,
  NotificationCenterData,
  NotificationPreferences,
  UpdateNotificationPrefsInput,
} from "@/types/tasks-calendar";

// ============================================================================
// CONTEXT HELPER
// ============================================================================

async function getCtx() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Não autenticado");

  const { data: membership } = await supabase
    .from("memberships")
    .select("organization_id")
    .eq("user_id", user.id)
    .eq("status", "active")
    .single();
  if (!membership) throw new Error("Organização não encontrada");

  return { supabase, user, orgId: membership.organization_id };
}

function reval() {
  revalidatePath("/dashboard/tarefas");
  revalidatePath("/dashboard/tarefas/kanban");
  revalidatePath("/dashboard/agenda");
  revalidatePath("/dashboard/notificacoes");
}

// ============================================================================
// ZOD SCHEMAS
// ============================================================================

const createTaskSchema = z.object({
  title: z.string().min(1, "Título é obrigatório").max(300),
  description: z.string().max(5000).optional().nullable(),
  status: z.enum(["todo", "in_progress", "done", "cancelled"]).optional(),
  priority: z.enum(["low", "medium", "high", "urgent"]).optional(),
  due_date: z.string().optional().nullable(),
  assigned_to: z.string().uuid().optional().nullable(),
  parent_task_id: z.string().uuid().optional().nullable(),
  linked_client_id: z.string().uuid().optional().nullable(),
  linked_lead_id: z.string().uuid().optional().nullable(),
  linked_order_id: z.string().uuid().optional().nullable(),
  linked_supplier_id: z.string().uuid().optional().nullable(),
  linked_purchase_order_id: z.string().uuid().optional().nullable(),
  linked_invoice_id: z.string().uuid().optional().nullable(),
  linked_product_id: z.string().uuid().optional().nullable(),
});

const updateTaskSchema = z.object({
  title: z.string().min(1).max(300).optional(),
  description: z.string().max(5000).optional().nullable(),
  status: z.enum(["todo", "in_progress", "done", "cancelled"]).optional(),
  priority: z.enum(["low", "medium", "high", "urgent"]).optional(),
  due_date: z.string().optional().nullable(),
  assigned_to: z.string().uuid().optional().nullable(),
  sort_order: z.number().int().optional(),
});

const checklistItemSchema = z.object({
  title: z.string().min(1, "Item é obrigatório").max(300),
});

const createEventSchema = z.object({
  title: z.string().min(1, "Título é obrigatório").max(300),
  description: z.string().max(5000).optional().nullable(),
  start_at: z.string().min(1, "Início é obrigatório"),
  end_at: z.string().min(1, "Fim é obrigatório"),
  all_day: z.boolean().optional(),
  location: z.string().max(500).optional().nullable(),
  recurrence_rule: z.string().max(500).optional().nullable(),
  recurrence_end_date: z.string().optional().nullable(),
  linked_client_id: z.string().uuid().optional().nullable(),
  linked_lead_id: z.string().uuid().optional().nullable(),
  linked_order_id: z.string().uuid().optional().nullable(),
  linked_supplier_id: z.string().uuid().optional().nullable(),
  linked_task_id: z.string().uuid().optional().nullable(),
  color: z.string().max(30).optional(),
  attendee_ids: z.array(z.string().uuid()).optional(),
  reminders: z.array(z.object({
    reminder_type: z.enum(["notification", "email", "push"]),
    minutes_before: z.number().int().min(0).max(10080),
  })).optional(),
});

const updateEventSchema = z.object({
  title: z.string().min(1).max(300).optional(),
  description: z.string().max(5000).optional().nullable(),
  start_at: z.string().optional(),
  end_at: z.string().optional(),
  all_day: z.boolean().optional(),
  location: z.string().max(500).optional().nullable(),
  recurrence_rule: z.string().max(500).optional().nullable(),
  recurrence_end_date: z.string().optional().nullable(),
  color: z.string().max(30).optional(),
});

// ============================================================================
// TASKS — READ
// ============================================================================

export async function getTasks(filters?: TaskFilters) {
  const { supabase, orgId } = await getCtx();

  const page = filters?.page ?? 1;
  const perPage = filters?.perPage ?? 20;
  const offset = (page - 1) * perPage;

  let query = supabase
    .from("tasks")
    .select("*", { count: "exact" })
    .eq("organization_id", orgId)
    .is("parent_task_id", null)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false })
    .range(offset, offset + perPage - 1);

  if (filters?.status) {
    if (Array.isArray(filters.status)) {
      query = query.in("status", filters.status);
    } else {
      query = query.eq("status", filters.status);
    }
  }

  if (filters?.priority) {
    query = query.eq("priority", filters.priority);
  }

  if (filters?.assigned_to !== undefined) {
    if (filters.assigned_to === null) {
      query = query.is("assigned_to", null);
    } else {
      query = query.eq("assigned_to", filters.assigned_to);
    }
  }

  if (filters?.search) {
    const escaped = filters.search.replace(/([%_,()])/g, "\\$1");
    query = query.or(`title.ilike.%${escaped}%,description.ilike.%${escaped}%`);
  }

  const { data, error, count } = await query;
  if (error) throw new Error(error.message);

  const tasks = (data ?? []) as Task[];

  // Enrich with checklist and subtask counts
  const enriched: TaskWithDetails[] = await Promise.all(
    tasks.map(async (task) => {
      const [{ count: checkTotal }, { count: checkDone }, { count: subs }] = await Promise.all([
        supabase.from("task_checklists").select("*", { count: "exact", head: true }).eq("task_id", task.id),
        supabase.from("task_checklists").select("*", { count: "exact", head: true }).eq("task_id", task.id).eq("is_completed", true),
        supabase.from("tasks").select("*", { count: "exact", head: true }).eq("parent_task_id", task.id),
      ]);

      // Get assignee and creator names
      let assigneeName: string | null = null;
      let creatorName = "Desconhecido";

      if (task.assigned_to) {
        const { data: mem } = await supabase
          .from("memberships")
          .select("profiles(full_name)")
          .eq("id", task.assigned_to)
          .single();
        assigneeName = (mem?.profiles as { full_name?: string } | null)?.full_name ?? null;
      }

      const { data: prof } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", task.created_by)
        .single();
      creatorName = prof?.full_name ?? "Desconhecido";

      return {
        ...task,
        assignee_name: assigneeName,
        creator_name: creatorName,
        checklist_total: checkTotal ?? 0,
        checklist_completed: checkDone ?? 0,
        subtask_count: subs ?? 0,
      };
    }),
  );

  return {
    tasks: enriched,
    total: count ?? 0,
    page,
    perPage,
    totalPages: Math.ceil((count ?? 0) / perPage),
  };
}

export async function getTaskById(taskId: string): Promise<TaskWithDetails | null> {
  const { supabase, orgId } = await getCtx();

  const { data, error } = await supabase
    .from("tasks")
    .select("*")
    .eq("id", taskId)
    .eq("organization_id", orgId)
    .single();

  if (error || !data) return null;

  const task = data as Task;

  const [{ count: checkTotal }, { count: checkDone }, { count: subs }] = await Promise.all([
    supabase.from("task_checklists").select("*", { count: "exact", head: true }).eq("task_id", taskId),
    supabase.from("task_checklists").select("*", { count: "exact", head: true }).eq("task_id", taskId).eq("is_completed", true),
    supabase.from("tasks").select("*", { count: "exact", head: true }).eq("parent_task_id", taskId),
  ]);

  let assigneeName: string | null = null;
  let creatorName = "Desconhecido";

  if (task.assigned_to) {
    const { data: mem } = await supabase
      .from("memberships")
      .select("profiles(full_name)")
      .eq("id", task.assigned_to)
      .single();
    assigneeName = (mem?.profiles as { full_name?: string } | null)?.full_name ?? null;
  }

  const { data: prof } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", task.created_by)
    .single();
  creatorName = prof?.full_name ?? "Desconhecido";

  return {
    ...task,
    assignee_name: assigneeName,
    creator_name: creatorName,
    checklist_total: checkTotal ?? 0,
    checklist_completed: checkDone ?? 0,
    subtask_count: subs ?? 0,
  };
}

export async function getSubtasks(parentTaskId: string): Promise<Task[]> {
  const { supabase, orgId } = await getCtx();

  const { data, error } = await supabase
    .from("tasks")
    .select("*")
    .eq("organization_id", orgId)
    .eq("parent_task_id", parentTaskId)
    .order("sort_order", { ascending: true });

  if (error) throw new Error(error.message);
  return (data ?? []) as Task[];
}

export async function getTaskChecklists(taskId: string): Promise<TaskChecklist[]> {
  const { supabase, orgId } = await getCtx();

  const { data: task } = await supabase
    .from("tasks").select("id").eq("id", taskId).eq("organization_id", orgId).single();
  if (!task) throw new Error("Tarefa não encontrada nesta organização");

  const { data, error } = await supabase
    .from("task_checklists")
    .select("*")
    .eq("task_id", taskId)
    .order("sort_order", { ascending: true });

  if (error) throw new Error(error.message);
  return (data ?? []) as TaskChecklist[];
}

export async function getTasksDashboardStats(): Promise<TasksDashboardStats> {
  const { supabase, user, orgId } = await getCtx();

  const { data: membership } = await supabase
    .from("memberships")
    .select("id")
    .eq("organization_id", orgId)
    .eq("user_id", user.id)
    .single();

  const myMembershipId = membership?.id ?? null;
  const now = new Date().toISOString();

  const [
    { count: total },
    { count: todo },
    { count: inProgress },
    { count: done },
    { count: overdue },
    { count: urgent },
    { count: myTasks },
  ] = await Promise.all([
    supabase.from("tasks").select("*", { count: "exact", head: true }).eq("organization_id", orgId).is("parent_task_id", null),
    supabase.from("tasks").select("*", { count: "exact", head: true }).eq("organization_id", orgId).eq("status", "todo").is("parent_task_id", null),
    supabase.from("tasks").select("*", { count: "exact", head: true }).eq("organization_id", orgId).eq("status", "in_progress").is("parent_task_id", null),
    supabase.from("tasks").select("*", { count: "exact", head: true }).eq("organization_id", orgId).eq("status", "done").is("parent_task_id", null),
    supabase.from("tasks").select("*", { count: "exact", head: true }).eq("organization_id", orgId).neq("status", "done").lt("due_date", now).is("parent_task_id", null),
    supabase.from("tasks").select("*", { count: "exact", head: true }).eq("organization_id", orgId).eq("priority", "urgent").neq("status", "done").is("parent_task_id", null),
    myMembershipId
      ? supabase.from("tasks").select("*", { count: "exact", head: true }).eq("organization_id", orgId).eq("assigned_to", myMembershipId).neq("status", "done").is("parent_task_id", null)
      : Promise.resolve({ count: 0 }),
  ]);

  return {
    total_tasks: total ?? 0,
    todo_count: todo ?? 0,
    in_progress_count: inProgress ?? 0,
    done_count: done ?? 0,
    overdue_count: overdue ?? 0,
    urgent_count: urgent ?? 0,
    my_tasks_count: myTasks ?? 0,
  };
}

export async function getKanbanData(): Promise<KanbanColumn[]> {
  const { supabase, orgId } = await getCtx();

  const statuses: TaskStatus[] = ["todo", "in_progress", "done"];
  const labels: Record<string, string> = {
    todo: "A fazer",
    in_progress: "Em andamento",
    done: "Concluído",
  };

  const columns: KanbanColumn[] = [];

  for (const status of statuses) {
    const { data, error } = await supabase
      .from("tasks")
      .select("*")
      .eq("organization_id", orgId)
      .eq("status", status)
      .is("parent_task_id", null)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) throw new Error(error.message);

    const tasks = (data ?? []) as Task[];

    const enriched: TaskWithDetails[] = await Promise.all(
      tasks.map(async (task) => {
        let assigneeName: string | null = null;
        let creatorName = "Desconhecido";

        if (task.assigned_to) {
          const { data: mem } = await supabase
            .from("memberships").select("profiles(full_name)").eq("id", task.assigned_to).single();
          assigneeName = (mem?.profiles as { full_name?: string } | null)?.full_name ?? null;
        }

        const { data: prof } = await supabase
          .from("profiles").select("full_name").eq("id", task.created_by).single();
        creatorName = prof?.full_name ?? "Desconhecido";

        return {
          ...task,
          assignee_name: assigneeName,
          creator_name: creatorName,
          checklist_total: 0,
          checklist_completed: 0,
          subtask_count: 0,
        };
      }),
    );

    columns.push({ status, label: labels[status], tasks: enriched, count: enriched.length });
  }

  return columns;
}

// ============================================================================
// TASKS — WRITE
// ============================================================================

export async function createTask(input: CreateTaskInput) {
  const { supabase, user, orgId } = await getCtx();
  const parsed = createTaskSchema.parse(input);

  const { data, error } = await supabase
    .from("tasks")
    .insert({
      organization_id: orgId,
      created_by: user.id,
      title: parsed.title,
      description: parsed.description ?? null,
      status: parsed.status ?? "todo",
      priority: parsed.priority ?? "medium",
      due_date: parsed.due_date ?? null,
      assigned_to: parsed.assigned_to ?? null,
      parent_task_id: parsed.parent_task_id ?? null,
      linked_client_id: parsed.linked_client_id ?? null,
      linked_lead_id: parsed.linked_lead_id ?? null,
      linked_order_id: parsed.linked_order_id ?? null,
      linked_supplier_id: parsed.linked_supplier_id ?? null,
      linked_purchase_order_id: parsed.linked_purchase_order_id ?? null,
      linked_invoice_id: parsed.linked_invoice_id ?? null,
      linked_product_id: parsed.linked_product_id ?? null,
    })
    .select("id")
    .single();

  if (error) throw new Error(error.message);

  await supabase.rpc("log_audit", {
    p_org_id: orgId, p_actor: user.id, p_action: "task_created",
    p_module: "tasks", p_resource_type: "task", p_resource_id: data.id,
  });

  // Notify assignee
  if (parsed.assigned_to) {
    const { data: mem } = await supabase.from("memberships").select("user_id").eq("id", parsed.assigned_to).single();
    if (mem && mem.user_id !== user.id) {
      await supabase.rpc("create_notification", {
        p_org_id: orgId, p_recipient_id: mem.user_id, p_type: "task_assigned",
        p_title: "Nova tarefa atribuída", p_body: parsed.title, p_link: `/dashboard/tarefas/${data.id}`,
      });
    }
  }

  reval();
  return data;
}

export async function updateTask(taskId: string, input: UpdateTaskInput) {
  const { supabase, user, orgId } = await getCtx();
  const parsed = updateTaskSchema.parse(input);

  const { data: existing } = await supabase
    .from("tasks").select("id, status, assigned_to, title")
    .eq("id", taskId).eq("organization_id", orgId).single();

  if (!existing) throw new Error("Tarefa não encontrada nesta organização");

  const updateData: Record<string, unknown> = {};
  const prevStatus: string = existing.status;
  if (parsed.title !== undefined) updateData.title = parsed.title;
  if (parsed.description !== undefined) updateData.description = parsed.description;
  if (parsed.status !== undefined) {
    updateData.status = parsed.status;
    if (parsed.status === "done") updateData.completed_at = new Date().toISOString();
    else if (prevStatus === "done") updateData.completed_at = null;
  }
  if (parsed.priority !== undefined) updateData.priority = parsed.priority;
  if (parsed.due_date !== undefined) updateData.due_date = parsed.due_date;
  if (parsed.assigned_to !== undefined) updateData.assigned_to = parsed.assigned_to;
  if (parsed.sort_order !== undefined) updateData.sort_order = parsed.sort_order;

  const { error } = await supabase
    .from("tasks").update(updateData).eq("id", taskId).eq("organization_id", orgId);

  if (error) throw new Error(error.message);

  await supabase.rpc("log_audit", {
    p_org_id: orgId, p_actor: user.id, p_action: "task_updated",
    p_module: "tasks", p_resource_type: "task", p_resource_id: taskId,
    p_metadata: updateData,
  });

  if (parsed.assigned_to !== undefined && parsed.assigned_to !== existing.assigned_to && parsed.assigned_to !== null) {
    const { data: mem } = await supabase.from("memberships").select("user_id").eq("id", parsed.assigned_to).single();
    if (mem && mem.user_id !== user.id) {
      await supabase.rpc("create_notification", {
        p_org_id: orgId, p_recipient_id: mem.user_id, p_type: "task_assigned",
        p_title: "Tarefa atribuída a você", p_body: parsed.title ?? existing.title,
        p_link: `/dashboard/tarefas/${taskId}`,
      });
    }
  }

  reval();
}

export async function deleteTask(taskId: string) {
  const { supabase, user, orgId } = await getCtx();

  const { error } = await supabase
    .from("tasks").delete().eq("id", taskId).eq("organization_id", orgId);

  if (error) throw new Error(error.message);

  await supabase.rpc("log_audit", {
    p_org_id: orgId, p_actor: user.id, p_action: "task_deleted",
    p_module: "tasks", p_resource_type: "task", p_resource_id: taskId,
  });

  reval();
}

export async function completeTask(taskId: string) {
  const { supabase, user, orgId } = await getCtx();

  const { error } = await supabase.rpc("complete_task", {
    p_task_id: taskId, p_org_id: orgId, p_user_id: user.id,
  });

  if (error) throw new Error(error.message);
  reval();
}

// ============================================================================
// CHECKLIST ITEMS
// ============================================================================

export async function addChecklistItem(taskId: string, title: string) {
  const { supabase, orgId } = await getCtx();
  checklistItemSchema.parse({ title });

  const { data: task } = await supabase
    .from("tasks").select("id").eq("id", taskId).eq("organization_id", orgId).single();
  if (!task) throw new Error("Tarefa não encontrada nesta organização");

  const { count } = await supabase
    .from("task_checklists").select("*", { count: "exact", head: true }).eq("task_id", taskId);

  const { data, error } = await supabase
    .from("task_checklists")
    .insert({ task_id: taskId, title, sort_order: (count ?? 0) })
    .select("id")
    .single();

  if (error) throw new Error(error.message);
  reval();
  return data;
}

export async function toggleChecklistItem(itemId: string) {
  const { supabase, orgId } = await getCtx();

  const { data: item } = await supabase
    .from("task_checklists")
    .select("id, is_completed, tasks!inner(organization_id)")
    .eq("id", itemId)
    .single();

  if (!item) throw new Error("Item não encontrado");
  const taskOrg = (item.tasks as unknown as { organization_id: string }).organization_id;
  if (taskOrg !== orgId) throw new Error("Acesso negado");

  const { error } = await supabase
    .from("task_checklists")
    .update({ is_completed: !item.is_completed })
    .eq("id", itemId);

  if (error) throw new Error(error.message);
  reval();
}

export async function deleteChecklistItem(itemId: string) {
  const { supabase, orgId } = await getCtx();

  const { data: item } = await supabase
    .from("task_checklists")
    .select("id, tasks!inner(organization_id)")
    .eq("id", itemId)
    .single();

  if (!item) throw new Error("Item não encontrado");
  const taskOrg = (item.tasks as unknown as { organization_id: string }).organization_id;
  if (taskOrg !== orgId) throw new Error("Acesso negado");

  const { error } = await supabase.from("task_checklists").delete().eq("id", itemId);
  if (error) throw new Error(error.message);
  reval();
}

// ============================================================================
// CALENDAR EVENTS — READ
// ============================================================================

export async function getCalendarEvents(filters: CalendarFilters) {
  const { supabase, orgId } = await getCtx();

  const { data, error } = await supabase
    .from("calendar_events")
    .select("*")
    .eq("organization_id", orgId)
    .gte("start_at", filters.start_date)
    .lte("start_at", filters.end_date)
    .order("start_at", { ascending: true });

  if (error) throw new Error(error.message);

  const events = (data ?? []) as CalendarEvent[];

  const enriched: CalendarEventWithDetails[] = await Promise.all(
    events.map(async (event) => {
      const [{ count: attendees }, { count: reminders }] = await Promise.all([
        supabase.from("event_attendees").select("*", { count: "exact", head: true }).eq("event_id", event.id),
        supabase.from("event_reminders").select("*", { count: "exact", head: true }).eq("event_id", event.id),
      ]);

      const { data: prof } = await supabase
        .from("profiles").select("full_name").eq("id", event.created_by).single();

      return {
        ...event,
        creator_name: prof?.full_name ?? "Desconhecido",
        attendee_count: attendees ?? 0,
        reminder_count: reminders ?? 0,
      };
    }),
  );

  return enriched;
}

export async function getCalendarEventById(eventId: string): Promise<CalendarEventWithDetails | null> {
  const { supabase, orgId } = await getCtx();

  const { data, error } = await supabase
    .from("calendar_events")
    .select("*")
    .eq("id", eventId)
    .eq("organization_id", orgId)
    .single();

  if (error || !data) return null;

  const event = data as CalendarEvent;
  const { data: prof } = await supabase
    .from("profiles").select("full_name").eq("id", event.created_by).single();

  const [{ count: attendees }, { count: reminders }] = await Promise.all([
    supabase.from("event_attendees").select("*", { count: "exact", head: true }).eq("event_id", eventId),
    supabase.from("event_reminders").select("*", { count: "exact", head: true }).eq("event_id", eventId),
  ]);

  return {
    ...event,
    creator_name: prof?.full_name ?? "Desconhecido",
    attendee_count: attendees ?? 0,
    reminder_count: reminders ?? 0,
  };
}

export async function getEventAttendees(eventId: string): Promise<EventAttendee[]> {
  const { supabase, orgId } = await getCtx();

  const { data: event } = await supabase
    .from("calendar_events").select("id").eq("id", eventId).eq("organization_id", orgId).single();
  if (!event) throw new Error("Evento não encontrado nesta organização");

  const { data, error } = await supabase
    .from("event_attendees")
    .select("*, memberships!inner(profiles!inner(full_name, email))")
    .eq("event_id", eventId);

  if (error) throw new Error(error.message);

  return (data ?? []).map((row: Record<string, unknown>) => {
    const mem = row.memberships as { profiles?: { full_name?: string; email?: string } } | null;
    return {
      id: row.id as string,
      event_id: row.event_id as string,
      membership_id: row.membership_id as string,
      rsvp_status: row.rsvp_status as EventAttendee["rsvp_status"],
      responded_at: row.responded_at as string | null,
      member_name: mem?.profiles?.full_name ?? "Desconhecido",
      member_email: mem?.profiles?.email ?? "",
    };
  });
}

export async function getEventReminders(eventId: string): Promise<EventReminder[]> {
  const { supabase, orgId } = await getCtx();

  const { data: event } = await supabase
    .from("calendar_events").select("id").eq("id", eventId).eq("organization_id", orgId).single();
  if (!event) throw new Error("Evento não encontrado nesta organização");

  const { data, error } = await supabase
    .from("event_reminders")
    .select("*")
    .eq("event_id", eventId)
    .order("minutes_before", { ascending: true });

  if (error) throw new Error(error.message);
  return (data ?? []) as EventReminder[];
}

// ============================================================================
// CALENDAR EVENTS — WRITE
// ============================================================================

export async function createCalendarEvent(input: CreateEventInput) {
  const { supabase, user, orgId } = await getCtx();
  const parsed = createEventSchema.parse(input);

  const { data, error } = await supabase
    .from("calendar_events")
    .insert({
      organization_id: orgId,
      created_by: user.id,
      title: parsed.title,
      description: parsed.description ?? null,
      start_at: parsed.start_at,
      end_at: parsed.end_at,
      all_day: parsed.all_day ?? false,
      location: parsed.location ?? null,
      recurrence_rule: parsed.recurrence_rule ?? null,
      recurrence_end_date: parsed.recurrence_end_date ?? null,
      linked_client_id: parsed.linked_client_id ?? null,
      linked_lead_id: parsed.linked_lead_id ?? null,
      linked_order_id: parsed.linked_order_id ?? null,
      linked_supplier_id: parsed.linked_supplier_id ?? null,
      linked_task_id: parsed.linked_task_id ?? null,
      color: parsed.color ?? "blue",
    })
    .select("id")
    .single();

  if (error) throw new Error(error.message);

  // Add attendees
  if (parsed.attendee_ids && parsed.attendee_ids.length > 0) {
    const attendees = parsed.attendee_ids.map((mid) => ({
      event_id: data.id,
      membership_id: mid,
    }));
    await supabase.from("event_attendees").insert(attendees);
  }

  // Add reminders
  if (parsed.reminders && parsed.reminders.length > 0) {
    const reminders = parsed.reminders.map((r) => ({
      event_id: data.id,
      reminder_type: r.reminder_type,
      minutes_before: r.minutes_before,
    }));
    await supabase.from("event_reminders").insert(reminders);
  }

  await supabase.rpc("log_audit", {
    p_org_id: orgId, p_actor: user.id, p_action: "event_created",
    p_module: "calendar", p_resource_type: "calendar_event", p_resource_id: data.id,
  });

  reval();
  return data;
}

export async function updateCalendarEvent(eventId: string, input: UpdateEventInput) {
  const { supabase, user, orgId } = await getCtx();
  const parsed = updateEventSchema.parse(input);

  const { data: existing } = await supabase
    .from("calendar_events").select("id")
    .eq("id", eventId).eq("organization_id", orgId).single();

  if (!existing) throw new Error("Evento não encontrado nesta organização");

  const updateData: Record<string, unknown> = {};
  if (parsed.title !== undefined) updateData.title = parsed.title;
  if (parsed.description !== undefined) updateData.description = parsed.description;
  if (parsed.start_at !== undefined) updateData.start_at = parsed.start_at;
  if (parsed.end_at !== undefined) updateData.end_at = parsed.end_at;
  if (parsed.all_day !== undefined) updateData.all_day = parsed.all_day;
  if (parsed.location !== undefined) updateData.location = parsed.location;
  if (parsed.recurrence_rule !== undefined) updateData.recurrence_rule = parsed.recurrence_rule;
  if (parsed.recurrence_end_date !== undefined) updateData.recurrence_end_date = parsed.recurrence_end_date;
  if (parsed.color !== undefined) updateData.color = parsed.color;

  const { error } = await supabase
    .from("calendar_events").update(updateData)
    .eq("id", eventId).eq("organization_id", orgId);

  if (error) throw new Error(error.message);

  await supabase.rpc("log_audit", {
    p_org_id: orgId, p_actor: user.id, p_action: "event_updated",
    p_module: "calendar", p_resource_type: "calendar_event", p_resource_id: eventId,
    p_metadata: updateData,
  });

  reval();
}

export async function deleteCalendarEvent(eventId: string) {
  const { supabase, user, orgId } = await getCtx();

  const { error } = await supabase
    .from("calendar_events").delete()
    .eq("id", eventId).eq("organization_id", orgId);

  if (error) throw new Error(error.message);

  await supabase.rpc("log_audit", {
    p_org_id: orgId, p_actor: user.id, p_action: "event_deleted",
    p_module: "calendar", p_resource_type: "calendar_event", p_resource_id: eventId,
  });

  reval();
}

export async function respondToEvent(eventId: string, rsvpStatus: "accepted" | "declined" | "tentative") {
  const { supabase, user, orgId } = await getCtx();

  const { data: membership } = await supabase
    .from("memberships").select("id")
    .eq("organization_id", orgId).eq("user_id", user.id).single();

  if (!membership) throw new Error("Membro não encontrado");

  const { error } = await supabase
    .from("event_attendees")
    .upsert({
      event_id: eventId,
      membership_id: membership.id,
      rsvp_status: rsvpStatus,
      responded_at: new Date().toISOString(),
    }, { onConflict: "event_id,membership_id" });

  if (error) throw new Error(error.message);
  reval();
}

// ============================================================================
// NOTIFICATIONS
// ============================================================================

export async function getNotifications(page = 1, perPage = 20): Promise<NotificationCenterData> {
  const { supabase, user } = await getCtx();
  const offset = (page - 1) * perPage;

  const { data, error, count } = await supabase
    .from("notifications")
    .select("*", { count: "exact" })
    .eq("recipient_id", user.id)
    .order("created_at", { ascending: false })
    .range(offset, offset + perPage - 1);

  if (error) throw new Error(error.message);

  const { count: unreadCount } = await supabase
    .from("notifications")
    .select("*", { count: "exact", head: true })
    .eq("recipient_id", user.id)
    .eq("is_read", false);

  return {
    notifications: (data ?? []) as Notification[],
    unread_count: unreadCount ?? 0,
    has_more: (offset + perPage) < (count ?? 0),
  };
}

export async function getUnreadNotificationCount(): Promise<number> {
  const { supabase, user } = await getCtx();

  const { data, error } = await supabase.rpc("get_unread_notification_count", {
    p_user_id: user.id,
  });

  if (error) throw new Error(error.message);
  return data ?? 0;
}

export async function markNotificationRead(notificationId: string) {
  const { supabase, user } = await getCtx();

  const { error } = await supabase
    .from("notifications")
    .update({ is_read: true, read_at: new Date().toISOString() })
    .eq("id", notificationId)
    .eq("recipient_id", user.id);

  if (error) throw new Error(error.message);
  reval();
}

export async function markAllNotificationsRead() {
  const { supabase, user } = await getCtx();

  const { error } = await supabase.rpc("mark_all_notifications_read", {
    p_user_id: user.id,
  });

  if (error) throw new Error(error.message);
  reval();
}

export async function deleteNotification(notificationId: string) {
  const { supabase, user } = await getCtx();

  const { error } = await supabase
    .from("notifications")
    .delete()
    .eq("id", notificationId)
    .eq("recipient_id", user.id);

  if (error) throw new Error(error.message);
  reval();
}

// ============================================================================
// NOTIFICATION PREFERENCES
// ============================================================================

export async function getNotificationPreferences(): Promise<NotificationPreferences[]> {
  const { supabase, user, orgId } = await getCtx();

  const { data, error } = await supabase
    .from("notification_preferences")
    .select("*")
    .eq("user_id", user.id)
    .eq("organization_id", orgId)
    .order("category", { ascending: true })
    .order("channel", { ascending: true });

  if (error) throw new Error(error.message);
  return (data ?? []) as NotificationPreferences[];
}

export async function updateNotificationPreference(input: UpdateNotificationPrefsInput) {
  const { supabase, user, orgId } = await getCtx();

  const { error } = await supabase
    .from("notification_preferences")
    .upsert({
      user_id: user.id,
      organization_id: orgId,
      channel: input.channel,
      category: input.category,
      enabled: input.enabled,
    }, { onConflict: "user_id,organization_id,channel,category" });

  if (error) throw new Error(error.message);
  reval();
}

// ============================================================================
// MEMBERS LIST (for assignment dropdowns)
// ============================================================================

export async function getActiveMembers() {
  const { supabase, orgId } = await getCtx();

  const { data, error } = await supabase
    .from("memberships")
    .select("id, profiles!inner(id, full_name, email, avatar_url)")
    .eq("organization_id", orgId)
    .eq("status", "active")
    .order("profiles(full_name)", { ascending: true });

  if (error) throw new Error(error.message);

  return (data ?? []).map((row: Record<string, unknown>) => {
    const prof = row.profiles as { id: string; full_name: string | null; email: string; avatar_url: string | null };
    return {
      membership_id: row.id as string,
      user_id: prof.id,
      name: prof.full_name ?? prof.email,
      email: prof.email,
      avatar_url: prof.avatar_url,
    };
  });
}