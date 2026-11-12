import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import type { Organization, Membership, UserRole } from "@/types/database";

export interface UserOrganization extends Organization {
  membership: Membership;
}

/**
 * Fetch all organizations the current user belongs to, along with their role.
 */
export async function getUserOrganizations(): Promise<UserOrganization[]> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return [];

  const { data: memberships, error } = await supabase
    .from("memberships")
    .select(
      `
      id,
      organization_id,
      user_id,
      role,
      status,
      created_at,
      organizations (
        id,
        name,
        slug,
        created_by,
        created_at,
        updated_at
      )
    `
    )
    .eq("user_id", user.id);

  if (error || !memberships) return [];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (memberships as any[]).map((m) => ({
    id: m.organizations.id,
    name: m.organizations.name,
    slug: m.organizations.slug,
    created_by: m.organizations.created_by,
    created_at: m.organizations.created_at,
    updated_at: m.organizations.updated_at,
    membership: {
      id: m.id,
      organization_id: m.organization_id,
      user_id: m.user_id,
      role: m.role as UserRole,
      status: (m.status as "active" | "suspended") ?? "active",
      created_at: m.created_at,
    },
  }));
}

/**
 * Get the active organization for the current session.
 * Uses cookie-based selection, falling back to first org.
 */
export async function getActiveOrganization(): Promise<{
  org: UserOrganization;
  allOrgs: UserOrganization[];
} | null> {
  const allOrgs = await getUserOrganizations();

  if (allOrgs.length === 0) return null;

  const cookieStore = await cookies();
  const activeOrgId = cookieStore.get("nexora_active_org")?.value;

  const active = activeOrgId
    ? allOrgs.find((o) => o.id === activeOrgId) ?? allOrgs[0]
    : allOrgs[0];

  return { org: active, allOrgs };
}

/**
 * Get member count for an organization.
 */
export async function getOrganizationMemberCount(
  organizationId: string
): Promise<number> {
  const supabase = await createClient();

  const { count, error } = await supabase
    .from("memberships")
    .select("*", { count: "exact", head: true })
    .eq("organization_id", organizationId);

  if (error) return 0;
  return count ?? 0;
}