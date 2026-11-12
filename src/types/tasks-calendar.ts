// ============================================================================
// NEXORA FASE 10 — Tarefas, Agenda e Notificações: Tipos TypeScript
// ============================================================================

// --- TASKS ---

export type TaskStatus = "todo" | "in_progress" | "done" | "cancelled";
export type TaskPriority = "low" | "medium" | "high" | "urgent";

export interface Task {
  id: string;
  organization_id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  due_date: string | null;
  assigned_to: string | null;
  created_by: string;
  parent_task_id: string | null;
  linked_client_id: string | null;
  linked_lead_id: string | null;
  linked_order_id: string | null;
  linked_supplier_id: string | null;
  linked_purchase_order_id: string | null;
  linked_invoice_id: string | null;
  linked_product_id: string | null;
  sort_order: number;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface TaskWithDetails extends Task {
  assignee_name: string | null;
  creator_name: string;
  checklist_total: number;
  checklist_completed: number;
  subtask_count: number;
}

export interface TaskChecklist {
  id: string;
  task_id: string;
  title: string;
  is_completed: boolean;
  sort_order: number;
  created_at: string;
}

export interface CreateTaskInput {
  title: string;
  description?: string | null;
  status?: TaskStatus;
  priority?: TaskPriority;
  due_date?: string | null;
  assigned_to?: string | null;
  parent_task_id?: string | null;
  linked_client_id?: string | null;
  linked_lead_id?: string | null;
  linked_order_id?: string | null;
  linked_supplier_id?: string | null;
  linked_purchase_order_id?: string | null;
  linked_invoice_id?: string | null;
  linked_product_id?: string | null;
}

export interface UpdateTaskInput {
  title?: string;
  description?: string | null;
  status?: TaskStatus;
  priority?: TaskPriority;
  due_date?: string | null;
  assigned_to?: string | null;
  sort_order?: number;
}

export interface TaskFilters {
  status?: TaskStatus | TaskStatus[];
  priority?: TaskPriority;
  assigned_to?: string | null;
  search?: string;
  page?: number;
  perPage?: number;
}

export interface TasksDashboardStats {
  total_tasks: number;
  todo_count: number;
  in_progress_count: number;
  done_count: number;
  overdue_count: number;
  urgent_count: number;
  my_tasks_count: number;
}

export interface KanbanColumn {
  status: TaskStatus;
  label: string;
  tasks: TaskWithDetails[];
  count: number;
}

// --- CALENDAR EVENTS ---

export interface CalendarEvent {
  id: string;
  organization_id: string;
  title: string;
  description: string | null;
  start_at: string;
  end_at: string;
  all_day: boolean;
  location: string | null;
  recurrence_rule: string | null;
  recurrence_end_date: string | null;
  parent_event_id: string | null;
  linked_client_id: string | null;
  linked_lead_id: string | null;
  linked_order_id: string | null;
  linked_supplier_id: string | null;
  linked_task_id: string | null;
  created_by: string;
  color: string;
  created_at: string;
  updated_at: string;
}

export interface CalendarEventWithDetails extends CalendarEvent {
  creator_name: string;
  attendee_count: number;
  reminder_count: number;
}

export interface EventAttendee {
  id: string;
  event_id: string;
  membership_id: string;
  rsvp_status: "pending" | "accepted" | "declined" | "tentative";
  responded_at: string | null;
  member_name: string;
  member_email: string;
}

export interface EventReminder {
  id: string;
  event_id: string;
  reminder_type: "notification" | "email" | "push";
  minutes_before: number;
  sent_at: string | null;
  created_at: string;
}

export interface CreateEventInput {
  title: string;
  description?: string | null;
  start_at: string;
  end_at: string;
  all_day?: boolean;
  location?: string | null;
  recurrence_rule?: string | null;
  recurrence_end_date?: string | null;
  linked_client_id?: string | null;
  linked_lead_id?: string | null;
  linked_order_id?: string | null;
  linked_supplier_id?: string | null;
  linked_task_id?: string | null;
  color?: string;
  attendee_ids?: string[];
  reminders?: Array<{ reminder_type: "notification" | "email" | "push"; minutes_before: number }>;
}

export interface UpdateEventInput {
  title?: string;
  description?: string | null;
  start_at?: string;
  end_at?: string;
  all_day?: boolean;
  location?: string | null;
  recurrence_rule?: string | null;
  recurrence_end_date?: string | null;
  color?: string;
}

export interface CalendarFilters {
  start_date: string;
  end_date: string;
  created_by?: string;
}

export type CalendarViewMode = "month" | "week" | "day";

// --- NOTIFICATIONS ---

export type NotificationType =
  | "task_assigned"
  | "task_due_soon"
  | "task_overdue"
  | "task_completed"
  | "event_reminder"
  | "event_updated"
  | "event_cancelled"
  | "order_status_changed"
  | "payment_received"
  | "payment_overdue"
  | "stock_low"
  | "purchase_received"
  | "member_joined"
  | "system";

export interface Notification {
  id: string;
  organization_id: string;
  recipient_id: string;
  type: NotificationType;
  title: string;
  body: string | null;
  link: string | null;
  metadata: Record<string, unknown>;
  is_read: boolean;
  read_at: string | null;
  created_at: string;
}

export interface NotificationPreferences {
  id: string;
  user_id: string;
  organization_id: string;
  channel: "in_app" | "email" | "push";
  category: "tasks" | "calendar" | "orders" | "financial" | "inventory" | "team" | "system";
  enabled: boolean;
  created_at: string;
  updated_at: string;
}

export interface PushSubscription {
  id: string;
  user_id: string;
  endpoint: string;
  p256dh_key: string;
  auth_key: string;
  user_agent: string | null;
  created_at: string;
}

export interface NotificationCenterData {
  notifications: Notification[];
  unread_count: number;
  has_more: boolean;
}

export interface UpdateNotificationPrefsInput {
  channel: "in_app" | "email" | "push";
  category: "tasks" | "calendar" | "orders" | "financial" | "inventory" | "team" | "system";
  enabled: boolean;
}