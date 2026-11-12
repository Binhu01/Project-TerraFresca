"use server";

import { createClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import type { InteractionType } from "@/types/crm";
import {
  createInteractionSchema,
  type CreateInteractionInput,
} from "./interaction-schemas";

// Schemas and types are in ./interaction-schemas.ts (cannot export non-functions from "use server")

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
 * Fetch interactions for a customer or lead, ordered by most recent first.
 * Exactly one of customerId or leadId must be provided.
 */
export async function getInteractions(params: {
  customerId?: string;
  leadId?: string;
}) {
  const { customerId, leadId } = params;

  if (Boolean(customerId) === Boolean(leadId)) {
    return { error: "Exactly one of customerId or leadId must be provided" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  const organizationId = await getActiveOrgId(user.id);

  let query = supabase
    .from("interactions")
    .select("*, profiles!interactions_created_by_fkey(full_name)")
    .eq("organization_id", organizationId)
    .order("occurred_at", { ascending: false });

  if (customerId) {
    query = query.eq("customer_id", customerId);
  } else {
    query = query.eq("lead_id", leadId!);
  }

  const { data, error } = await query;

  if (error) {
    return { error: error.message };
  }

  return { interactions: data };
}

/**
 * Create a new interaction linked to a customer or lead.
 */
export async function createInteraction(data: CreateInteractionInput) {
  const parsed = createInteractionSchema.safeParse(data);

  if (!parsed.success) {
    return { error: parsed.error.flatten() };
  }

  const { type, description, customerId, leadId, occurredAt } = parsed.data;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  const organizationId = await getActiveOrgId(user.id);

  // Verify the target customer/lead belongs to the org
  if (customerId) {
    const { data: customer } = await supabase
      .from("customers")
      .select("id")
      .eq("id", customerId)
      .eq("organization_id", organizationId)
      .maybeSingle();

    if (!customer) {
      return { error: "Customer not found or does not belong to your organization" };
    }
  } else {
    const { data: lead } = await supabase
      .from("leads")
      .select("id")
      .eq("id", leadId!)
      .eq("organization_id", organizationId)
      .maybeSingle();

    if (!lead) {
      return { error: "Lead not found or does not belong to your organization" };
    }
  }

  const { data: interaction, error } = await supabase
    .from("interactions")
    .insert({
      organization_id: organizationId,
      customer_id: customerId ?? null,
      lead_id: leadId ?? null,
      type,
      description,
      created_by: user.id,
      occurred_at: occurredAt ?? new Date().toISOString(),
    })
    .select()
    .single();

  if (error) {
    return { error: error.message };
  }

  return { interaction };
}

/**
 * Delete an interaction. Only the creator can delete it, and it must belong
 * to the user's active organization.
 */
export async function deleteInteraction(id: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  const organizationId = await getActiveOrgId(user.id);

  // Verify the interaction belongs to the org and was created by this user
  const { data: existing } = await supabase
    .from("interactions")
    .select("id")
    .eq("id", id)
    .eq("organization_id", organizationId)
    .eq("created_by", user.id)
    .maybeSingle();

  if (!existing) {
    return { error: "Interaction not found or you do not have permission to delete it" };
  }

  const { error } = await supabase.from("interactions").delete().eq("id", id);

  if (error) {
    return { error: error.message };
  }

  return { success: true as const };
}