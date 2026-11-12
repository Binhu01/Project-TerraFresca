"use server";

import { createClient } from "@/lib/supabase/server";
import { z } from "zod";
import { cookies } from "next/headers";
import type { Customer, CustomerType } from "@/types/crm";

// ---------------------------------------------------------------------------
// Zod Schemas
// ---------------------------------------------------------------------------

const customerOverridesSchema = z.object({
  name: z.string().min(1).optional(),
  email: z.string().email().optional().nullable(),
  phone: z.string().optional().nullable(),
  customer_type: z.enum(["pf", "pj"]).optional(),
  document: z.string().optional().nullable(),
  category: z.string().optional().nullable(),
});

export type CustomerOverrides = z.infer<typeof customerOverridesSchema>;

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
// Duplicate Check
// ---------------------------------------------------------------------------

/**
 * Check for existing customers in the organization that match the given
 * email or phone. Used to preview duplicates before confirming a conversion.
 */
export async function checkDuplicateCustomer(
  orgId: string,
  email?: string | null,
  phone?: string | null,
): Promise<Customer[]> {
  const supabase = await createClient();

  const conditions: string[] = [];
  const values: Record<string, string> = {};

  if (email) {
    conditions.push("email = :email");
    values.email = email;
  }
  if (phone) {
    conditions.push("phone = :phone");
    values.phone = phone;
  }

  if (conditions.length === 0) {
    return [];
  }

  // Build an OR query: match on email OR phone within the same org
  let query = supabase
    .from("customers")
    .select("*")
    .eq("organization_id", orgId);

  if (email && phone) {
    query = query.or(`email.eq.${email},phone.eq.${phone}`);
  } else if (email) {
    query = query.eq("email", email);
  } else {
    query = query.eq("phone", phone!);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Failed to check duplicate customers: ${error.message}`);
  }

  return (data as Customer[]) ?? [];
}

// ---------------------------------------------------------------------------
// Client-safe duplicate check (resolves org from auth)
// ---------------------------------------------------------------------------

/**
 * Check for duplicate customers matching the given email/phone within the
 * active user's organization. Safe to call from client components — resolves
 * the org ID from the authenticated session internally.
 */
export async function checkLeadDuplicates(params: {
  email?: string | null;
  phone?: string | null;
}): Promise<{ duplicates: Customer[] }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Not authenticated");
  }

  const orgId = await getActiveOrgId(user.id);
  const duplicates = await checkDuplicateCustomer(
    orgId,
    params.email,
    params.phone,
  );

  return { duplicates };
}

// ---------------------------------------------------------------------------
// Conversion Result Types
// ---------------------------------------------------------------------------

export type ConvertLeadResult =
  | { customer: Customer; success: true }
  | { duplicates: Customer[]; requiresConfirmation: true }
  | { error: string };

// ---------------------------------------------------------------------------
// Server Action
// ---------------------------------------------------------------------------

/**
 * Convert a won lead into a customer.
 *
 * - Validates the lead belongs to the active org, is not already converted,
 *   and has status 'won'.
 * - Checks for duplicate customers by email/phone. If duplicates exist and
 *   `forceCreate` is false, returns them for user confirmation.
 * - Creates the customer and links it back to the lead.
 */
export async function convertLeadToCustomer(
  leadId: string,
  customerOverrides?: CustomerOverrides,
  forceCreate?: boolean,
): Promise<ConvertLeadResult> {
  try {
    // --- Auth & Org --------------------------------------------------------
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { error: "Not authenticated" };
    }

    const organizationId = await getActiveOrgId(user.id);

    // --- Fetch Lead --------------------------------------------------------
    const { data: lead, error: leadError } = await supabase
      .from("leads")
      .select("*")
      .eq("id", leadId)
      .eq("organization_id", organizationId)
      .maybeSingle();

    if (leadError) {
      return { error: `Failed to fetch lead: ${leadError.message}` };
    }

    if (!lead) {
      return { error: "Lead not found or does not belong to your organization" };
    }

    // --- Already converted? ------------------------------------------------
    if (lead.converted_customer_id) {
      return { error: "This lead has already been converted to a customer" };
    }

    // --- Must be won -------------------------------------------------------
    if (lead.status !== "won") {
      return { error: "Only leads with status 'won' can be converted to a customer" };
    }

    // --- Validate overrides ------------------------------------------------
    if (customerOverrides) {
      const parsed = customerOverridesSchema.safeParse(customerOverrides);
      if (!parsed.success) {
        return { error: `Invalid customer overrides: ${parsed.error.flatten().formErrors.join(", ")}` };
      }
    }

    // --- Duplicate check ---------------------------------------------------
    const effectiveEmail = customerOverrides?.email ?? lead.email;
    const effectivePhone = customerOverrides?.phone ?? lead.phone;

    if (!forceCreate) {
      const duplicates = await checkDuplicateCustomer(
        organizationId,
        effectiveEmail,
        effectivePhone,
      );

      if (duplicates.length > 0) {
        return { duplicates, requiresConfirmation: true };
      }
    }

    // --- Create Customer ---------------------------------------------------
    const customerPayload = {
      organization_id: organizationId,
      name: customerOverrides?.name ?? lead.name,
      email: effectiveEmail ?? null,
      phone: effectivePhone ?? null,
      whatsapp: lead.whatsapp ?? null,
      source: lead.source ?? null,
      customer_type: customerOverrides?.customer_type ?? ("pf" as CustomerType),
      document: customerOverrides?.document ?? null,
      category: customerOverrides?.category ?? null,
      notes: lead.notes ?? null,
      status: "active" as const,
    };

    const { data: newCustomer, error: customerError } = await supabase
      .from("customers")
      .insert(customerPayload)
      .select()
      .single();

    if (customerError) {
      return { error: `Failed to create customer: ${customerError.message}` };
    }

    // --- Link Lead to Customer ---------------------------------------------
    const { error: updateError } = await supabase
      .from("leads")
      .update({
        converted_customer_id: newCustomer.id,
        converted_at: new Date().toISOString(),
      })
      .eq("id", leadId);

    if (updateError) {
      // Best-effort rollback: remove the orphaned customer
      await supabase.from("customers").delete().eq("id", newCustomer.id);
      return { error: `Failed to link lead to customer: ${updateError.message}` };
    }

    return { customer: newCustomer as Customer, success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { error: `Unexpected error during conversion: ${message}` };
  }
}