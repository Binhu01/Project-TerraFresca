"use server";

import { createClient } from "@/lib/supabase/server";
import { getActiveOrganization } from "@/lib/organizations";
import { requirePermission, canManageRole } from "@/lib/permissions";
import { revalidatePath } from "next/cache";
import type { UserRole } from "@/types/database";
import type {
  MemberWithDetails,
  TeamDashboardStats,
  Department,
  OrganizationRole,
  InvitationWithDetails,
  AuditLog,
  ApprovalRequestWithDetails,
  RoleWithMemberCount,
  EffectivePermissions,
  MemberFilters,
  AuditFilters,
} from "@/types/team";
import {
  createDepartmentSchema,
  updateDepartmentSchema,
  updateMemberProfileSchema,
  updateMemberRoleSchema,
  createInvitationSchema,
  createCustomRoleSchema,
  updateRolePermissionsSchema,
  updateMemberPermissionsSchema,
  createApprovalRequestSchema,
  voteOnApprovalSchema,
  type CreateDepartmentInput,
  type UpdateDepartmentInput,
  type UpdateMemberProfileInput,
  type UpdateMemberRoleInput,
  type CreateInvitationInput,
  type CreateCustomRoleInput,
  type UpdateRolePermissionsInput,
  type UpdateMemberPermissionsInput,
  type CreateApprovalRequestInput,
  type VoteOnApprovalInput,
} from "./schemas";

async function getCtx() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Não autenticado");
  const activeData = await getActiveOrganization();
  if (!activeData) throw new Error("Nenhuma organização ativa");
  return { supabase, user, orgId: activeData.org.id, membership: activeData.org.membership };
}

function reval() {
  revalidatePath("/dashboard/equipe", "layout");
}

// ============================================================
// DASHBOARD
// ============================================================

export async function getTeamDashboard(): Promise<TeamDashboardStats> {
  const { supabase, orgId } = await getCtx();

  const [membersResult, invitesResult, deptsResult, auditResult] = await Promise.all([
    supabase.from("memberships").select("role, status").eq("organization_id", orgId),
    supabase.from("invitations").select("id", { count: "exact", head: true }).eq("organization_id", orgId).is("accepted_at", null).is("revoked_at", null),
    supabase.from("departments").select("id", { count: "exact", head: true }).eq("organization_id", orgId).eq("is_active", true),
    supabase.from("audit_logs").select("*").eq("organization_id", orgId).order("created_at", { ascending: false }).limit(10),
  ]);

  const members = membersResult.data ?? [];
  const activeMembers = members.filter((m) => m.status === "active");

  return {
    total_active_members: activeMembers.length,
    pending_invitations: invitesResult.count ?? 0,
    owner_count: activeMembers.filter((m) => m.role === "OWNER").length,
    admin_count: activeMembers.filter((m) => m.role === "ADMIN").length,
    manager_count: activeMembers.filter((m) => m.role === "MANAGER").length,
    employee_count: activeMembers.filter((m) => m.role === "EMPLOYEE").length,
    department_count: deptsResult.count ?? 0,
    recent_activities: (auditResult.data ?? []) as AuditLog[],
  };
}

// ============================================================
// MEMBERS
// ============================================================

export async function getMembers(filters?: MemberFilters) {
  const { supabase, orgId } = await getCtx();
  const page = filters?.page ?? 1;
  const perPage = filters?.perPage ?? 20;
  const from = (page - 1) * perPage;
  const to = from + perPage - 1;

  let query = supabase
    .from("memberships")
    .select(`
      id,
      user_id,
      role,
      status,
      created_at,
      profiles!inner(id, full_name, email, avatar_url),
      employee_profiles(id, department_id, job_title, professional_phone, start_date, notes, departments(id, name))
    `, { count: "exact" })
    .eq("organization_id", orgId)
    .order("created_at", { ascending: false })
    .range(from, to);

  if (filters?.status) query = query.eq("status", filters.status);
  if (filters?.role) query = query.eq("role", filters.role);

  const { data, error, count } = await query;
  if (error) throw error;

  // Apply search and department filter client-side (Supabase doesn't support nested filtering well)
  let results = (data ?? []) as unknown as Array<{
    id: string;
    user_id: string;
    role: string;
    status: string;
    created_at: string;
    profiles: { id: string; full_name: string | null; email: string; avatar_url: string | null };
    employee_profiles: Array<{
      id: string;
      department_id: string | null;
      job_title: string | null;
      professional_phone: string | null;
      start_date: string | null;
      notes: string | null;
      departments: { id: string; name: string } | null;
    }>;
  }>;

  if (filters?.search) {
    const s = filters.search.toLowerCase();
    results = results.filter(
      (r) =>
        r.profiles.full_name?.toLowerCase().includes(s) ||
        r.profiles.email.toLowerCase().includes(s)
    );
  }

  if (filters?.department_id) {
    results = results.filter(
      (r) => r.employee_profiles?.[0]?.department_id === filters.department_id
    );
  }

  const members: MemberWithDetails[] = results.map((r) => ({
    membership_id: r.id,
    user_id: r.user_id,
    full_name: r.profiles.full_name,
    email: r.profiles.email,
    avatar_url: r.profiles.avatar_url,
    role: r.role as UserRole,
    status: r.status as "active" | "suspended",
    joined_at: r.created_at,
    department_id: r.employee_profiles?.[0]?.department_id ?? null,
    department_name: r.employee_profiles?.[0]?.departments?.name ?? null,
    job_title: r.employee_profiles?.[0]?.job_title ?? null,
    professional_phone: r.employee_profiles?.[0]?.professional_phone ?? null,
    start_date: r.employee_profiles?.[0]?.start_date ?? null,
    notes: r.employee_profiles?.[0]?.notes ?? null,
  }));

  return { members, total: count ?? 0 };
}

export async function getMemberById(membershipId: string) {
  const { supabase, orgId } = await getCtx();

  const { data, error } = await supabase
    .from("memberships")
    .select(`
      id,
      user_id,
      role,
      status,
      created_at,
      profiles!inner(id, full_name, email, avatar_url),
      employee_profiles(id, department_id, job_title, professional_phone, start_date, notes, departments(id, name))
    `)
    .eq("id", membershipId)
    .eq("organization_id", orgId)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  const r = data as unknown as {
    id: string;
    user_id: string;
    role: string;
    status: string;
    created_at: string;
    profiles: { id: string; full_name: string | null; email: string; avatar_url: string | null };
    employee_profiles: Array<{
      id: string;
      department_id: string | null;
      job_title: string | null;
      professional_phone: string | null;
      start_date: string | null;
      notes: string | null;
      departments: { id: string; name: string } | null;
    }>;
  };

  const member: MemberWithDetails = {
    membership_id: r.id,
    user_id: r.user_id,
    full_name: r.profiles.full_name,
    email: r.profiles.email,
    avatar_url: r.profiles.avatar_url,
    role: r.role as UserRole,
    status: r.status as "active" | "suspended",
    joined_at: r.created_at,
    department_id: r.employee_profiles?.[0]?.department_id ?? null,
    department_name: r.employee_profiles?.[0]?.departments?.name ?? null,
    job_title: r.employee_profiles?.[0]?.job_title ?? null,
    professional_phone: r.employee_profiles?.[0]?.professional_phone ?? null,
    start_date: r.employee_profiles?.[0]?.start_date ?? null,
    notes: r.employee_profiles?.[0]?.notes ?? null,
  };

  return member;
}

export async function updateMemberProfile(membershipId: string, input: UpdateMemberProfileInput) {
  const parsed = updateMemberProfileSchema.parse(input);
  const { supabase, orgId, user } = await getCtx();
  await requirePermission("team.edit_profile");

  // Verify membership belongs to this org
  const { data: mem } = await supabase
    .from("memberships")
    .select("id")
    .eq("id", membershipId)
    .eq("organization_id", orgId)
    .maybeSingle();
  if (!mem) throw new Error("Membro não encontrado");

  // Upsert employee_profile
  const { error } = await supabase.from("employee_profiles").upsert({
    organization_id: orgId,
    membership_id: membershipId,
    job_title: parsed.job_title ?? null,
    department_id: parsed.department_id ?? null,
    professional_phone: parsed.professional_phone ?? null,
    start_date: parsed.start_date ?? null,
    notes: parsed.notes ?? null,
  }, { onConflict: "membership_id" });

  if (error) throw error;

  await supabase.rpc("log_audit", {
    p_org_id: orgId,
    p_actor: user.id,
    p_action: "member_profile_updated",
    p_module: "team",
    p_resource_type: "membership",
    p_resource_id: membershipId,
  });

  reval();
  return { success: true };
}

export async function updateMemberRole(membershipId: string, input: UpdateMemberRoleInput) {
  const parsed = updateMemberRoleSchema.parse(input);
  const { supabase, orgId, user, membership } = await getCtx();
  await requirePermission("team.edit_role");

  // Get target member
  const { data: target } = await supabase
    .from("memberships")
    .select("id, role, user_id, status")
    .eq("id", membershipId)
    .eq("organization_id", orgId)
    .maybeSingle();
  if (!target) throw new Error("Membro não encontrado");

  // Hierarchy check
  if (!canManageRole(membership.role, target.role)) {
    throw new Error("Você não tem autoridade para alterar o papel deste membro");
  }
  if (!canManageRole(membership.role, parsed.role)) {
    throw new Error("Você não pode promover alguém a um nível superior ao seu");
  }

  // If promoting to OWNER, requires approval flow
  if (parsed.role === "OWNER" && target.role !== "OWNER") {
    throw new Error("Promoção para Proprietário requer aprovação. Use a funcionalidade de aprovações.");
  }

  // Cannot change OWNER role through this endpoint
  if (target.role === "OWNER") {
    throw new Error("Alterações de Proprietário devem ser feitas através da área de Aprovações.");
  }

  const { error } = await supabase
    .from("memberships")
    .update({ role: parsed.role })
    .eq("id", membershipId)
    .eq("organization_id", orgId);
  if (error) throw error;

  await supabase.rpc("log_audit", {
    p_org_id: orgId,
    p_actor: user.id,
    p_action: "member_role_changed",
    p_module: "team",
    p_resource_type: "membership",
    p_resource_id: membershipId,
    p_metadata: JSON.stringify({ from: target.role, to: parsed.role }),
  });

  reval();
  return { success: true };
}

export async function suspendMember(membershipId: string) {
  const { supabase, orgId, user, membership } = await getCtx();
  await requirePermission("team.suspend");

  const { data: target } = await supabase
    .from("memberships")
    .select("id, role")
    .eq("id", membershipId)
    .eq("organization_id", orgId)
    .maybeSingle();
  if (!target) throw new Error("Membro não encontrado");
  if (target.role === "OWNER") throw new Error("Proprietários não podem ser suspensos");
  if (target.id === membership.id) throw new Error("Você não pode suspender a si mesmo");

  const { error } = await supabase
    .from("memberships")
    .update({ status: "suspended" })
    .eq("id", membershipId);
  if (error) throw error;

  await supabase.rpc("log_audit", {
    p_org_id: orgId,
    p_actor: user.id,
    p_action: "member_suspended",
    p_module: "team",
    p_resource_type: "membership",
    p_resource_id: membershipId,
  });

  reval();
  return { success: true };
}

export async function reactivateMember(membershipId: string) {
  const { supabase, orgId, user } = await getCtx();
  await requirePermission("team.suspend");

  const { error } = await supabase
    .from("memberships")
    .update({ status: "active" })
    .eq("id", membershipId)
    .eq("organization_id", orgId);
  if (error) throw error;

  await supabase.rpc("log_audit", {
    p_org_id: orgId,
    p_actor: user.id,
    p_action: "member_reactivated",
    p_module: "team",
    p_resource_type: "membership",
    p_resource_id: membershipId,
  });

  reval();
  return { success: true };
}

export async function removeMember(membershipId: string) {
  const { supabase, orgId, user, membership } = await getCtx();
  await requirePermission("team.remove");

  const { data: target } = await supabase
    .from("memberships")
    .select("id, role, user_id")
    .eq("id", membershipId)
    .eq("organization_id", orgId)
    .maybeSingle();
  if (!target) throw new Error("Membro não encontrado");
  if (target.role === "OWNER") throw new Error("Remoção de Proprietário requer aprovação. Use a área de Aprovações.");
  if (target.id === membership.id) throw new Error("Você não pode remover a si mesmo");

  // Delete membership (cascades employee_profile)
  const { error } = await supabase
    .from("memberships")
    .delete()
    .eq("id", membershipId)
    .eq("organization_id", orgId);
  if (error) throw error;

  await supabase.rpc("log_audit", {
    p_org_id: orgId,
    p_actor: user.id,
    p_action: "member_removed",
    p_module: "team",
    p_resource_type: "membership",
    p_resource_id: membershipId,
    p_metadata: JSON.stringify({ removed_user_id: target.user_id }),
  });

  reval();
  return { success: true };
}

// ============================================================
// DEPARTMENTS
// ============================================================

export async function getDepartments() {
  const { supabase, orgId } = await getCtx();

  const { data, error } = await supabase
    .from("departments")
    .select("*, employee_profiles(count)")
    .eq("organization_id", orgId)
    .order("name");

  if (error) throw error;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data ?? []).map((d: any) => ({
    ...d,
    member_count: d.employee_profiles?.[0]?.count ?? 0,
  })) as (Department & { member_count: number })[];
}

export async function createDepartment(input: CreateDepartmentInput) {
  const parsed = createDepartmentSchema.parse(input);
  const { supabase, orgId, user } = await getCtx();
  await requirePermission("departments.manage");

  const { data, error } = await supabase
    .from("departments")
    .insert({ organization_id: orgId, name: parsed.name, description: parsed.description ?? null })
    .select()
    .single();
  if (error) throw error;

  await supabase.rpc("log_audit", {
    p_org_id: orgId,
    p_actor: user.id,
    p_action: "department_created",
    p_module: "team",
    p_resource_type: "department",
    p_resource_id: data.id,
  });

  reval();
  return { success: true, id: data.id };
}

export async function updateDepartment(id: string, input: UpdateDepartmentInput) {
  const parsed = updateDepartmentSchema.parse(input);
  const { supabase, orgId, user } = await getCtx();
  await requirePermission("departments.manage");

  const { error } = await supabase
    .from("departments")
    .update({ name: parsed.name, description: parsed.description ?? null })
    .eq("id", id)
    .eq("organization_id", orgId);
  if (error) throw error;

  await supabase.rpc("log_audit", {
    p_org_id: orgId,
    p_actor: user.id,
    p_action: "department_updated",
    p_module: "team",
    p_resource_type: "department",
    p_resource_id: id,
  });

  reval();
  return { success: true };
}

export async function archiveDepartment(id: string) {
  const { supabase, orgId, user } = await getCtx();
  await requirePermission("departments.manage");

  // Check for active members
  const { count } = await supabase
    .from("employee_profiles")
    .select("id", { count: "exact", head: true })
    .eq("department_id", id)
    .eq("organization_id", orgId);

  if ((count ?? 0) > 0) {
    throw new Error("Não é possível arquivar um departamento com membros ativos. Reatribua os membros primeiro.");
  }

  const { error } = await supabase
    .from("departments")
    .update({ is_active: false })
    .eq("id", id)
    .eq("organization_id", orgId);
  if (error) throw error;

  await supabase.rpc("log_audit", {
    p_org_id: orgId,
    p_actor: user.id,
    p_action: "department_archived",
    p_module: "team",
    p_resource_type: "department",
    p_resource_id: id,
  });

  reval();
  return { success: true };
}

// ============================================================
// INVITATIONS
// ============================================================

export async function getInvitations(status?: "pending" | "accepted" | "revoked") {
  const { supabase, orgId } = await getCtx();

  let query = supabase
    .from("invitations")
    .select(`
      *,
      organization_roles(name),
      departments(name),
      inviter:profiles!invited_by(full_name)
    `)
    .eq("organization_id", orgId)
    .order("created_at", { ascending: false });

  const { data, error } = await query;
  if (error) throw error;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let results = (data ?? []) as any[];

  if (status === "pending") {
    results = results.filter((i) => !i.accepted_at && !i.revoked_at && new Date(i.expires_at) > new Date());
  } else if (status === "accepted") {
    results = results.filter((i) => i.accepted_at);
  } else if (status === "revoked") {
    results = results.filter((i) => i.revoked_at);
  }

  return results.map((i) => ({
    ...i,
    role_name: i.organization_roles?.name ?? "—",
    department_name: i.departments?.name ?? null,
    inviter_name: i.inviter?.full_name ?? null,
  })) as InvitationWithDetails[];
}

export async function createInvitation(input: CreateInvitationInput) {
  const parsed = createInvitationSchema.parse(input);
  const { supabase, orgId, user } = await getCtx();
  await requirePermission("team.invite");

  // Check if email already a member
  const { data: existingUser } = await supabase
    .from("profiles")
    .select("id")
    .eq("email", parsed.email)
    .maybeSingle();

  if (existingUser) {
    const { data: existingMembership } = await supabase
      .from("memberships")
      .select("id")
      .eq("organization_id", orgId)
      .eq("user_id", existingUser.id)
      .maybeSingle();
    if (existingMembership) throw new Error("Este e-mail já é membro desta organização");
  }

  // Check pending invitations for same email
  const { data: pendingInvite } = await supabase
    .from("invitations")
    .select("id")
    .eq("organization_id", orgId)
    .eq("email", parsed.email.toLowerCase())
    .is("accepted_at", null)
    .is("revoked_at", null)
    .gt("expires_at", new Date().toISOString())
    .maybeSingle();
  if (pendingInvite) throw new Error("Já existe um convite pendente para este e-mail");

  // Get role_id for the selected system role
  const { data: role } = await supabase
    .from("organization_roles")
    .select("id")
    .eq("organization_id", orgId)
    .eq("name", parsed.role)
    .eq("is_system_role", true)
    .maybeSingle();
  if (!role) throw new Error("Papel inválido");

  // Generate secure token
  const token = crypto.randomUUID() + "-" + crypto.randomUUID();
  const encoder = new TextEncoder();
  const hashBuffer = await crypto.subtle.digest("SHA-256", encoder.encode(token));
  const tokenHash = Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  // Expires in 7 days
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);

  const { data: invitation, error } = await supabase
    .from("invitations")
    .insert({
      organization_id: orgId,
      email: parsed.email.toLowerCase(),
      role_id: role.id,
      department_id: parsed.department_id ?? null,
      job_title: parsed.job_title ?? null,
      token_hash: tokenHash,
      invited_by: user.id,
      expires_at: expiresAt.toISOString(),
    })
    .select()
    .single();
  if (error) throw error;

  await supabase.rpc("log_audit", {
    p_org_id: orgId,
    p_actor: user.id,
    p_action: "invitation_created",
    p_module: "team",
    p_resource_type: "invitation",
    p_resource_id: invitation.id,
    p_metadata: JSON.stringify({ email: parsed.email, role: parsed.role }),
  });

  reval();
  // Return token ONCE — it cannot be retrieved again
  return { success: true, id: invitation.id, token };
}

export async function revokeInvitation(invitationId: string) {
  const { supabase, orgId, user } = await getCtx();
  await requirePermission("team.invite");

  const { error } = await supabase
    .from("invitations")
    .update({ revoked_at: new Date().toISOString() })
    .eq("id", invitationId)
    .eq("organization_id", orgId)
    .is("accepted_at", null);
  if (error) throw error;

  await supabase.rpc("log_audit", {
    p_org_id: orgId,
    p_actor: user.id,
    p_action: "invitation_revoked",
    p_module: "team",
    p_resource_type: "invitation",
    p_resource_id: invitationId,
  });

  reval();
  return { success: true };
}

// ============================================================
// ROLES & PERMISSIONS
// ============================================================

export async function getRoles(): Promise<RoleWithMemberCount[]> {
  const { supabase, orgId } = await getCtx();

  const { data: roles, error } = await supabase
    .from("organization_roles")
    .select("*")
    .eq("organization_id", orgId)
    .order("is_system_role", { ascending: false })
    .order("name");
  if (error) throw error;

  // Count members per role (system roles match by name, custom by role_id)
  const { data: memberships } = await supabase
    .from("memberships")
    .select("role")
    .eq("organization_id", orgId)
    .eq("status", "active");

  const roleCounts: Record<string, number> = {};
  for (const m of memberships ?? []) {
    roleCounts[m.role] = (roleCounts[m.role] ?? 0) + 1;
  }

  return ((roles ?? []) as OrganizationRole[]).map((r) => ({
    ...r,
    member_count: r.is_system_role ? (roleCounts[r.name] ?? 0) : 0,
  }));
}

export async function getRolePermissions(roleId: string) {
  const { supabase, orgId } = await getCtx();

  const { data, error } = await supabase
    .from("role_permissions")
    .select("permission_id, granted, permissions!inner(permission_key, module, action, description)")
    .eq("organization_id", orgId)
    .eq("role_id", roleId);
  if (error) throw error;

  return data ?? [];
}

export async function createCustomRole(input: CreateCustomRoleInput) {
  const parsed = createCustomRoleSchema.parse(input);
  const { supabase, orgId, user } = await getCtx();
  await requirePermission("roles.manage");

  // Create role
  const { data: role, error: roleErr } = await supabase
    .from("organization_roles")
    .insert({ organization_id: orgId, name: parsed.name, description: parsed.description ?? null, is_system_role: false })
    .select()
    .single();
  if (roleErr) throw roleErr;

  // Assign permissions
  const { data: perms } = await supabase
    .from("permissions")
    .select("id")
    .in("permission_key", parsed.permissions);

  if (perms && perms.length > 0) {
    const rolePerms = perms.map((p) => ({
      organization_id: orgId,
      role_id: role.id,
      permission_id: p.id,
      granted: true,
    }));
    const { error: permErr } = await supabase.from("role_permissions").insert(rolePerms);
    if (permErr) throw permErr;
  }

  await supabase.rpc("log_audit", {
    p_org_id: orgId,
    p_actor: user.id,
    p_action: "custom_role_created",
    p_module: "team",
    p_resource_type: "role",
    p_resource_id: role.id,
  });

  reval();
  return { success: true, id: role.id };
}

export async function updateRolePermissions(roleId: string, input: UpdateRolePermissionsInput) {
  const parsed = updateRolePermissionsSchema.parse(input);
  const { supabase, orgId, user } = await getCtx();
  await requirePermission("roles.manage");

  // Verify role is not a system role
  const { data: role } = await supabase
    .from("organization_roles")
    .select("is_system_role, name")
    .eq("id", roleId)
    .eq("organization_id", orgId)
    .maybeSingle();
  if (!role) throw new Error("Papel não encontrado");
  if (role.is_system_role) throw new Error("Papéis do sistema não podem ser editados");

  // Delete existing permissions
  await supabase.from("role_permissions").delete().eq("role_id", roleId).eq("organization_id", orgId);

  // Insert new permissions
  const { data: perms } = await supabase
    .from("permissions")
    .select("id")
    .in("permission_key", parsed.permissions);

  if (perms && perms.length > 0) {
    const rolePerms = perms.map((p) => ({
      organization_id: orgId,
      role_id: roleId,
      permission_id: p.id,
      granted: true,
    }));
    const { error } = await supabase.from("role_permissions").insert(rolePerms);
    if (error) throw error;
  }

  await supabase.rpc("log_audit", {
    p_org_id: orgId,
    p_actor: user.id,
    p_action: "role_permissions_updated",
    p_module: "team",
    p_resource_type: "role",
    p_resource_id: roleId,
  });

  reval();
  return { success: true };
}

export async function updateMemberPermissions(membershipId: string, input: UpdateMemberPermissionsInput) {
  const parsed = updateMemberPermissionsSchema.parse(input);
  const { supabase, orgId, user } = await getCtx();
  await requirePermission("roles.manage");

  // Remove existing overrides
  await supabase
    .from("membership_permissions")
    .delete()
    .eq("membership_id", membershipId)
    .eq("organization_id", orgId);

  // Insert new overrides
  if (parsed.overrides.length > 0) {
    const permKeys = parsed.overrides.map((o) => o.permission_key);
    const { data: perms } = await supabase
      .from("permissions")
      .select("id, permission_key")
      .in("permission_key", permKeys);

    const permMap = new Map((perms ?? []).map((p) => [p.permission_key, p.id]));

    const inserts = parsed.overrides
      .filter((o) => permMap.has(o.permission_key))
      .map((o) => ({
        organization_id: orgId,
        membership_id: membershipId,
        permission_id: permMap.get(o.permission_key)!,
        effect: o.effect,
        created_by: user.id,
      }));

    if (inserts.length > 0) {
      const { error } = await supabase.from("membership_permissions").insert(inserts);
      if (error) throw error;
    }
  }

  await supabase.rpc("log_audit", {
    p_org_id: orgId,
    p_actor: user.id,
    p_action: "member_permissions_updated",
    p_module: "team",
    p_resource_type: "membership",
    p_resource_id: membershipId,
  });

  reval();
  return { success: true };
}

export async function resetMemberPermissions(membershipId: string) {
  const { supabase, orgId, user } = await getCtx();
  await requirePermission("roles.manage");

  const { error } = await supabase
    .from("membership_permissions")
    .delete()
    .eq("membership_id", membershipId)
    .eq("organization_id", orgId);
  if (error) throw error;

  await supabase.rpc("log_audit", {
    p_org_id: orgId,
    p_actor: user.id,
    p_action: "member_permissions_reset",
    p_module: "team",
    p_resource_type: "membership",
    p_resource_id: membershipId,
  });

  reval();
  return { success: true };
}

// ============================================================
// APPROVAL REQUESTS
// ============================================================

export async function getApprovalRequests(status?: string): Promise<ApprovalRequestWithDetails[]> {
  const { supabase, orgId } = await getCtx();

  let query = supabase
    .from("approval_requests")
    .select(`
      *,
      requester:profiles!requested_by(full_name),
      target:memberships!target_membership_id(user_id, profiles(full_name)),
      votes:approval_votes(voter_user_id, decision, note, created_at, voter:profiles(full_name))
    `)
    .eq("organization_id", orgId)
    .order("created_at", { ascending: false });

  if (status) query = query.eq("status", status);

  const { data, error } = await query;
  if (error) throw error;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data ?? []).map((r: any) => ({
    ...r,
    requester_name: r.requester?.full_name ?? null,
    target_member_name: r.target?.profiles?.full_name ?? null,
    votes: (r.votes ?? []).map((v: any) => ({
      voter_name: v.voter?.full_name ?? null,
      decision: v.decision,
      note: v.note,
      created_at: v.created_at,
    })),
  })) as ApprovalRequestWithDetails[];
}

export async function createApprovalRequest(input: CreateApprovalRequestInput) {
  const parsed = createApprovalRequestSchema.parse(input);
  const { supabase, orgId, user, membership } = await getCtx();

  // Only OWNERs can create approval requests
  if (membership.role !== "OWNER") throw new Error("Apenas proprietários podem criar solicitações de aprovação");

  // Validate target exists
  const { data: target } = await supabase
    .from("memberships")
    .select("id, role")
    .eq("id", parsed.target_membership_id)
    .eq("organization_id", orgId)
    .maybeSingle();
  if (!target) throw new Error("Membro alvo não encontrado");

  // Validate operation makes sense
  if (parsed.request_type === "promote_to_owner" && target.role === "OWNER") {
    throw new Error("Este membro já é proprietário");
  }
  if ((parsed.request_type === "demote_owner" || parsed.request_type === "remove_owner") && target.role !== "OWNER") {
    throw new Error("Este membro não é proprietário");
  }

  // Check for existing pending request for same target+type
  const { data: existing } = await supabase
    .from("approval_requests")
    .select("id")
    .eq("organization_id", orgId)
    .eq("target_membership_id", parsed.target_membership_id)
    .eq("request_type", parsed.request_type)
    .eq("status", "pending")
    .maybeSingle();
  if (existing) throw new Error("Já existe uma solicitação pendente para esta operação");

  const { data: request, error } = await supabase
    .from("approval_requests")
    .insert({
      organization_id: orgId,
      request_type: parsed.request_type,
      requested_by: user.id,
      target_membership_id: parsed.target_membership_id,
      description: parsed.description,
      payload: {},
    })
    .select()
    .single();
  if (error) throw error;

  await supabase.rpc("log_audit", {
    p_org_id: orgId,
    p_actor: user.id,
    p_action: "approval_request_created",
    p_module: "team",
    p_resource_type: "approval_request",
    p_resource_id: request.id,
    p_metadata: JSON.stringify({ type: parsed.request_type }),
  });

  reval();
  return { success: true, id: request.id };
}

export async function voteOnApproval(requestId: string, input: VoteOnApprovalInput) {
  const parsed = voteOnApprovalSchema.parse(input);
  const { supabase, orgId, user, membership } = await getCtx();

  if (membership.role !== "OWNER") throw new Error("Apenas proprietários podem votar");

  // Check request exists and is pending
  const { data: request } = await supabase
    .from("approval_requests")
    .select("id, status")
    .eq("id", requestId)
    .eq("organization_id", orgId)
    .maybeSingle();
  if (!request) throw new Error("Solicitação não encontrada");
  if (request.status !== "pending") throw new Error("Esta solicitação já foi resolvida");

  // Check if already voted
  const { data: existingVote } = await supabase
    .from("approval_votes")
    .select("id")
    .eq("approval_request_id", requestId)
    .eq("voter_user_id", user.id)
    .maybeSingle();
  if (existingVote) throw new Error("Você já votou nesta solicitação");

  // Cast vote
  const { error: voteErr } = await supabase.from("approval_votes").insert({
    organization_id: orgId,
    approval_request_id: requestId,
    voter_user_id: user.id,
    decision: parsed.decision,
    note: parsed.note ?? null,
  });
  if (voteErr) throw voteErr;

  await supabase.rpc("log_audit", {
    p_org_id: orgId,
    p_actor: user.id,
    p_action: `approval_${parsed.decision}d`,
    p_module: "team",
    p_resource_type: "approval_request",
    p_resource_id: requestId,
  });

  // Try to resolve
  await supabase.rpc("resolve_approval", { p_request_id: requestId });

  reval();
  return { success: true };
}

export async function cancelApprovalRequest(requestId: string) {
  const { supabase, orgId, user, membership } = await getCtx();

  if (membership.role !== "OWNER") throw new Error("Apenas proprietários podem cancelar solicitações");

  const { error } = await supabase
    .from("approval_requests")
    .update({ status: "cancelled", resolved_at: new Date().toISOString() })
    .eq("id", requestId)
    .eq("organization_id", orgId)
    .eq("status", "pending");
  if (error) throw error;

  await supabase.rpc("log_audit", {
    p_org_id: orgId,
    p_actor: user.id,
    p_action: "approval_cancelled",
    p_module: "team",
    p_resource_type: "approval_request",
    p_resource_id: requestId,
  });

  reval();
  return { success: true };
}

// ============================================================
// AUDIT LOGS
// ============================================================

export async function getAuditLogs(filters?: AuditFilters) {
  const { supabase, orgId } = await getCtx();
  await requirePermission("audit.view");

  const page = filters?.page ?? 1;
  const perPage = filters?.perPage ?? 20;
  const from = (page - 1) * perPage;
  const to = from + perPage - 1;

  let query = supabase
    .from("audit_logs")
    .select(`*, actor:profiles!actor_user_id(full_name, email)`, { count: "exact" })
    .eq("organization_id", orgId)
    .order("created_at", { ascending: false })
    .range(from, to);

  if (filters?.user_id) query = query.eq("actor_user_id", filters.user_id);
  if (filters?.module) query = query.eq("module", filters.module);
  if (filters?.action) query = query.eq("action", filters.action);
  if (filters?.date_from) query = query.gte("created_at", filters.date_from);
  if (filters?.date_to) query = query.lte("created_at", filters.date_to);

  const { data, error, count } = await query;
  if (error) throw error;

  return { logs: (data ?? []) as (AuditLog & { actor?: { full_name: string | null; email: string } })[], total: count ?? 0 };
}

// ============================================================
// PERMISSIONS CATALOG (for UI)
// ============================================================

export async function getPermissionsCatalog() {
  const { supabase } = await getCtx();
  const { data, error } = await supabase
    .from("permissions")
    .select("*")
    .order("module")
    .order("action");
  if (error) throw error;
  return data ?? [];
}