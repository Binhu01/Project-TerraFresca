"use server";

import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import type { Customer, CustomerType, CustomerStatus } from "@/types/crm";
import {
  createCustomerSchema,
  updateCustomerSchema,
  type CreateCustomerInput,
  type UpdateCustomerInput,
} from "./schemas";

// Schemas and types are exported from ./schemas.ts
// Re-exporting non-function values from a "use server" file is not allowed.

// --- Helpers ---

async function getActiveOrg(supabase: Awaited<ReturnType<typeof createClient>>) {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Usuário não autenticado." };
  }

  const cookieStore = await cookies();
  const activeOrgCookie = cookieStore.get("nexora_active_org")?.value;

  let organizationId: string | undefined;

  if (activeOrgCookie) {
    const { data: membership } = await supabase
      .from("memberships")
      .select("organization_id")
      .eq("organization_id", activeOrgCookie)
      .eq("user_id", user.id)
      .maybeSingle();

    if (membership) {
      organizationId = membership.organization_id;
    }
  }

  if (!organizationId) {
    const { data: firstMembership } = await supabase
      .from("memberships")
      .select("organization_id")
      .eq("user_id", user.id)
      .limit(1)
      .maybeSingle();

    if (firstMembership) {
      organizationId = firstMembership.organization_id;
    }
  }

  if (!organizationId) {
    return { error: "Nenhuma organização encontrada." };
  }

  return { userId: user.id, organizationId };
}

// --- Server Actions ---

export async function getCustomers(params: {
  search?: string;
  type?: string;
  category?: string;
  status?: string;
  page?: number;
  pageSize?: number;
}) {
  const supabase = await createClient();
  const org = await getActiveOrg(supabase);

  if ("error" in org) {
    return { customers: [] as Customer[], total: 0, page: 1, pageSize: 20, error: org.error };
  }

  const { search, type, category, status, page = 1, pageSize = 20 } = params;
  const offset = (page - 1) * pageSize;

  let query = supabase
    .from("customers")
    .select("*", { count: "exact" })
    .eq("organization_id", org.organizationId)
    .is("archived_at", null)
    .order("name", { ascending: true });

  if (search) {
    query = query.or(
      `name.ilike.%${search}%,email.ilike.%${search}%,phone.ilike.%${search}%`
    );
  }

  if (type) {
    query = query.eq("customer_type", type as CustomerType);
  }

  if (category) {
    query = query.eq("category", category);
  }

  if (status) {
    query = query.eq("status", status as CustomerStatus);
  }

  query = query.range(offset, offset + pageSize - 1);

  const { data, count, error } = await query;

  if (error) {
    return { customers: [] as Customer[], total: 0, page, pageSize, error: error.message };
  }

  return {
    customers: (data as Customer[]) ?? [],
    total: count ?? 0,
    page,
    pageSize,
  };
}

export async function getCustomerById(id: string) {
  const supabase = await createClient();
  const org = await getActiveOrg(supabase);

  if ("error" in org) {
    return null;
  }

  const { data, error } = await supabase
    .from("customers")
    .select("*")
    .eq("id", id)
    .eq("organization_id", org.organizationId)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return data as Customer;
}

export async function createCustomer(data: CreateCustomerInput) {
  const validated = createCustomerSchema.safeParse(data);

  if (!validated.success) {
    return { error: validated.error.errors[0].message };
  }

  const supabase = await createClient();
  const org = await getActiveOrg(supabase);

  if ("error" in org) {
    return { error: org.error };
  }

  const { data: inserted, error } = await supabase
    .from("customers")
    .insert({
      ...validated.data,
      organization_id: org.organizationId,
    })
    .select()
    .single();

  if (error) {
    return { error: error.message };
  }

  return { customer: inserted as Customer };
}

export async function updateCustomer(id: string, data: UpdateCustomerInput) {
  const validated = updateCustomerSchema.safeParse(data);

  if (!validated.success) {
    return { error: validated.error.errors[0].message };
  }

  const supabase = await createClient();
  const org = await getActiveOrg(supabase);

  if ("error" in org) {
    return { error: org.error };
  }

  // Verify customer belongs to user's org
  const { data: existing } = await supabase
    .from("customers")
    .select("id")
    .eq("id", id)
    .eq("organization_id", org.organizationId)
    .maybeSingle();

  if (!existing) {
    return { error: "Cliente não encontrado." };
  }

  const { data: updated, error } = await supabase
    .from("customers")
    .update(validated.data)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return { error: error.message };
  }

  return { customer: updated as Customer };
}

export async function archiveCustomer(id: string) {
  const supabase = await createClient();
  const org = await getActiveOrg(supabase);

  if ("error" in org) {
    return { error: org.error };
  }

  // Verify customer belongs to user's org
  const { data: existing } = await supabase
    .from("customers")
    .select("id")
    .eq("id", id)
    .eq("organization_id", org.organizationId)
    .maybeSingle();

  if (!existing) {
    return { error: "Cliente não encontrado." };
  }

  const { error } = await supabase
    .from("customers")
    .update({ archived_at: new Date().toISOString(), status: "inactive" })
    .eq("id", id);

  if (error) {
    return { error: error.message };
  }

  return { success: true as const };
}

export async function getCustomerStats(orgId: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("customers")
    .select("status")
    .eq("organization_id", orgId)
    .is("archived_at", null);

  if (error) {
    return { active: 0, inactive: 0, total: 0 };
  }

  const active = data?.filter((c) => c.status === "active").length ?? 0;
  const inactive = data?.filter((c) => c.status === "inactive").length ?? 0;

  return { active, inactive, total: active + inactive };
}