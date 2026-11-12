"use server";

import { createClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import type {
  Lead,
  LeadWithStage,
  Pipeline,
  PipelineStage,
} from "@/types/crm";
import {
  createLeadSchema,
  updateLeadSchema,
  type CreateLeadInput,
  type UpdateLeadInput,
} from "./schemas";

// Schemas and types are in ./schemas.ts (cannot export non-functions from "use server")

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

async function getActiveOrgId(userId: string): Promise<string> {
  const supabase = await createClient();
  const cookieStore = await cookies();
  const activeOrgCookie = cookieStore.get("nexora_active_org")?.value;

  if (activeOrgCookie) {
    const { data: membership } = await supabase
      .from("organization_members")
      .select("organization_id")
      .eq("user_id", userId)
      .eq("organization_id", activeOrgCookie)
      .maybeSingle();

    if (membership) {
      return membership.organization_id;
    }
  }

  // Fallback to first membership
  const { data: fallback } = await supabase
    .from("organization_members")
    .select("organization_id")
    .eq("user_id", userId)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (!fallback) {
    throw new Error("No organization membership found for user");
  }

  return fallback.organization_id;
}

// ---------------------------------------------------------------------------
// Server Actions
// ---------------------------------------------------------------------------

/**
 * Fetch paginated leads with optional filters.
 */
export async function getLeads(params: {
  search?: string;
  stageId?: string;
  status?: string;
  source?: string;
  assignedTo?: string;
  page?: number;
  pageSize?: number;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Not authenticated");

  const orgId = await getActiveOrgId(user.id);
  const page = params.page ?? 1;
  const pageSize = params.pageSize ?? 20;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabase
    .from("leads")
    .select(
      `*,
       stage:pipeline_stages!inner(*)`,
      { count: "exact" }
    )
    .eq("organization_id", orgId)
    .order("created_at", { ascending: false });

  // Archive filter
  if (params.status === "archived") {
    query = query.not("archived_at", "is", null);
  } else {
    query = query.is("archived_at", null);
  }

  // Additional status filter (non-archive)
  if (params.status && params.status !== "archived") {
    query = query.eq("status", params.status);
  }

  // Search across name, company_name, email
  if (params.search) {
    query = query.or(
      `name.ilike.%${params.search}%,company_name.ilike.%${params.search}%,email.ilike.%${params.search}%`
    );
  }

  if (params.stageId) {
    query = query.eq("stage_id", params.stageId);
  }

  if (params.source) {
    query = query.eq("source", params.source);
  }

  if (params.assignedTo) {
    query = query.eq("assigned_to", params.assignedTo);
  }

  const { data, error, count } = await query.range(from, to);

  if (error) throw new Error(error.message);

  return {
    leads: (data as unknown as LeadWithStage[]) ?? [],
    total: count ?? 0,
    page,
    pageSize,
  };
}

/**
 * Get leads grouped by pipeline stage for Kanban board display.
 */
export async function getLeadsByStage(pipelineId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Not authenticated");

  const orgId = await getActiveOrgId(user.id);

  // Fetch stages ordered by position
  const { data: stages, error: stagesError } = await supabase
    .from("pipeline_stages")
    .select("*")
    .eq("pipeline_id", pipelineId)
    .eq("organization_id", orgId)
    .order("position", { ascending: true });

  if (stagesError) throw new Error(stagesError.message);

  // Fetch all non-archived leads for this pipeline
  const { data: leads, error: leadsError } = await supabase
    .from("leads")
    .select(`*, stage:pipeline_stages!inner(*)`)
    .eq("pipeline_id", pipelineId)
    .eq("organization_id", orgId)
    .is("archived_at", null)
    .order("created_at", { ascending: false });

  if (leadsError) throw new Error(leadsError.message);

  const leadList = (leads as unknown as LeadWithStage[]) ?? [];

  // Group by stage_id
  const grouped = (stages as PipelineStage[]).map((stage) => ({
    stage,
    leads: leadList.filter((lead) => lead.stage_id === stage.id),
  }));

  return grouped;
}

/**
 * Fetch the default pipeline and its stages for the active organization.
 */
export async function getPipelineAndStages() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Not authenticated");

  const orgId = await getActiveOrgId(user.id);

  const { data: pipeline, error: pipelineError } = await supabase
    .from("pipelines")
    .select("*")
    .eq("organization_id", orgId)
    .eq("is_default", true)
    .maybeSingle();

  if (pipelineError) throw new Error(pipelineError.message);
  if (!pipeline) throw new Error("No default pipeline found");

  const { data: stages, error: stagesError } = await supabase
    .from("pipeline_stages")
    .select("*")
    .eq("pipeline_id", pipeline.id)
    .eq("organization_id", orgId)
    .order("position", { ascending: true });

  if (stagesError) throw new Error(stagesError.message);

  return {
    pipeline: pipeline as Pipeline,
    stages: (stages as PipelineStage[]) ?? [],
  };
}

/**
 * Fetch a single lead by ID with stage info.
 */
export async function getLeadById(id: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Not authenticated");

  const orgId = await getActiveOrgId(user.id);

  const { data, error } = await supabase
    .from("leads")
    .select(`*, stage:pipeline_stages!inner(*)`)
    .eq("id", id)
    .eq("organization_id", orgId)
    .maybeSingle();

  if (error) throw new Error(error.message);

  return (data as unknown as LeadWithStage) ?? null;
}

/**
 * Create a new lead.
 */
export async function createLead(data: CreateLeadInput) {
  const parsed = createLeadSchema.safeParse(data);
  if (!parsed.success) {
    return { error: parsed.error.errors[0].message };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated" };

  const orgId = await getActiveOrgId(user.id);

  // Resolve default pipeline
  const { data: pipeline } = await supabase
    .from("pipelines")
    .select("id")
    .eq("organization_id", orgId)
    .eq("is_default", true)
    .maybeSingle();

  if (!pipeline) {
    return { error: "No default pipeline found for organization" };
  }

  const insertData = {
    ...parsed.data,
    organization_id: orgId,
    pipeline_id: pipeline.id,
    assigned_to: parsed.data.assigned_to ?? user.id,
    status: "open" as const,
  };

  const { data: lead, error } = await supabase
    .from("leads")
    .insert(insertData)
    .select()
    .single();

  if (error) return { error: error.message };

  return { lead: lead as Lead };
}

/**
 * Update an existing lead.
 */
export async function updateLead(id: string, data: UpdateLeadInput) {
  const parsed = updateLeadSchema.safeParse(data);
  if (!parsed.success) {
    return { error: parsed.error.errors[0].message };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated" };

  const orgId = await getActiveOrgId(user.id);

  // Verify lead belongs to user's org
  const { data: existing } = await supabase
    .from("leads")
    .select("id")
    .eq("id", id)
    .eq("organization_id", orgId)
    .maybeSingle();

  if (!existing) {
    return { error: "Lead not found or access denied" };
  }

  const { data: lead, error } = await supabase
    .from("leads")
    .update(parsed.data)
    .eq("id", id)
    .select()
    .single();

  if (error) return { error: error.message };

  return { lead: lead as Lead };
}

/**
 * Move a lead to a different pipeline stage, updating status accordingly.
 */
export async function moveLeadStage(leadId: string, newStageId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated" };

  const orgId = await getActiveOrgId(user.id);

  // Verify lead belongs to org
  const { data: lead } = await supabase
    .from("leads")
    .select("id, pipeline_id")
    .eq("id", leadId)
    .eq("organization_id", orgId)
    .maybeSingle();

  if (!lead) {
    return { error: "Lead not found or access denied" };
  }

  // Verify stage belongs to org and same pipeline
  const { data: stage } = await supabase
    .from("pipeline_stages")
    .select("id, is_won, is_lost")
    .eq("id", newStageId)
    .eq("organization_id", orgId)
    .maybeSingle();

  if (!stage) {
    return { error: "Stage not found or access denied" };
  }

  let status: "open" | "won" | "lost" = "open";
  if (stage.is_won) status = "won";
  else if (stage.is_lost) status = "lost";

  const { error } = await supabase
    .from("leads")
    .update({ stage_id: newStageId, status })
    .eq("id", leadId);

  if (error) return { error: error.message };

  return { success: true as const };
}

/**
 * Archive a lead by setting archived_at and status.
 */
export async function archiveLead(id: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated" };

  const orgId = await getActiveOrgId(user.id);

  // Verify lead belongs to org
  const { data: existing } = await supabase
    .from("leads")
    .select("id")
    .eq("id", id)
    .eq("organization_id", orgId)
    .maybeSingle();

  if (!existing) {
    return { error: "Lead not found or access denied" };
  }

  const { error } = await supabase
    .from("leads")
    .update({ archived_at: new Date().toISOString(), status: "archived" })
    .eq("id", id);

  if (error) return { error: error.message };

  return { success: true as const };
}

/**
 * Get aggregate lead statistics for an organization.
 */
export async function getLeadStats(orgId: string) {
  const supabase = await createClient();

  const now = new Date().toISOString();

  // Count open leads
  const { count: open } = await supabase
    .from("leads")
    .select("*", { count: "exact", head: true })
    .eq("organization_id", orgId)
    .eq("status", "open")
    .is("archived_at", null);

  // Count won leads
  const { count: won } = await supabase
    .from("leads")
    .select("*", { count: "exact", head: true })
    .eq("organization_id", orgId)
    .eq("status", "won")
    .is("archived_at", null);

  // Count lost leads
  const { count: lost } = await supabase
    .from("leads")
    .select("*", { count: "exact", head: true })
    .eq("organization_id", orgId)
    .eq("status", "lost")
    .is("archived_at", null);

  // Count overdue leads (expected_return_at < now and status=open)
  const { count: overdue } = await supabase
    .from("leads")
    .select("*", { count: "exact", head: true })
    .eq("organization_id", orgId)
    .eq("status", "open")
    .is("archived_at", null)
    .lt("expected_return_at", now);

  // Sum estimated_value for open leads
  const { data: valueRows } = await supabase
    .from("leads")
    .select("estimated_value")
    .eq("organization_id", orgId)
    .eq("status", "open")
    .is("archived_at", null)
    .not("estimated_value", "is", null);

  const totalValue = (valueRows ?? []).reduce(
    (sum, row) => sum + (row.estimated_value ?? 0),
    0
  );

  return {
    open: open ?? 0,
    won: won ?? 0,
    lost: lost ?? 0,
    overdue: overdue ?? 0,
    totalValue,
  };
}