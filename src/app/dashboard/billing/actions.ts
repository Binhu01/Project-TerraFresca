"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type {
 SubscriptionPlan,
 SubscriptionPlanVersion,
 PlanWithCurrentVersion,
 PlanEntitlement,
 Subscription,
 SubscriptionWithPlan,
 SubscriptionEvent,
 SubscriptionInvoice,
 PlanChange,
 UsageSummary,
 SupportTicket,
 AdminDashboardStats,
 CreatePlanInput,
 UpdatePlanInput,
 CreatePlanVersionInput,
 RequestPlanChangeInput,
 CreateSupportTicketInput,
 PlatformAdminWithProfile,
} from "@/types/billing";

// ============================================================================
// CONTEXT HELPERS
// ============================================================================

async function getCtx() {
 const supabase = await createClient();
 const { data: { user } } = await supabase.auth.getUser();
 if (!user) throw new Error("Não autenticado");

 const { data: membership } = await supabase
 .from("memberships")
 .select("organization_id, role, id, status")
 .eq("user_id", user.id)
 .eq("status", "active")
 .single();
 if (!membership) throw new Error("Organização não encontrada");

 return { supabase, user, orgId: membership.organization_id, role: membership.role };
}

async function getPlatformAdminCtx() {
 const ctx = await getCtx();
 const { data: admin } = await ctx.supabase
 .from("platform_admins")
 .select("id, internal_role, is_active")
 .eq("user_id", ctx.user.id)
 .eq("is_active", true)
 .single();

 if (!admin) throw new Error("Acesso negado: apenas administradores da plataforma.");
 return { ...ctx, adminRole: admin.internal_role };
}

// ============================================================================
// PUBLIC: Catálogo de Planos
// ============================================================================

export async function getActivePlans(): Promise<PlanWithCurrentVersion[]> {
 const supabase = await createClient();

 const { data: plans } = await supabase
 .from("subscription_plans")
 .select("*")
 .eq("is_active", true)
 .order("display_order", { ascending: true });

 const result: PlanWithCurrentVersion[] = [];
 for (const plan of plans ?? []) {
 const { data: version } = await supabase
 .from("subscription_plan_versions")
 .select("*")
 .eq("plan_id", plan.id)
 .not("published_at", "is", null)
 .is("valid_until", null)
 .order("version", { ascending: false })
 .limit(1)
 .single();

 result.push({ ...plan, current_version: version ?? null });
 }

 return result;
}

export async function getPlanEntitlements(planVersionId: string): Promise<PlanEntitlement[]> {
 const supabase = await createClient();

 const { data } = await supabase
 .from("plan_entitlements")
 .select("*")
 .eq("plan_version_id", planVersionId)
 .order("feature_key");

 return (data ?? []) as PlanEntitlement[];
}

// ============================================================================
// EMPRESA: Minha Assinatura
// ============================================================================

export async function getMySubscription(): Promise<SubscriptionWithPlan | null> {
 const { supabase, orgId } = await getCtx();

 const { data: sub } = await supabase
 .from("subscriptions")
 .select(`
 *,
 subscription_plan_versions!inner (
 monthly_price,
 annual_price,
 currency,
 subscription_plans!inner (name, slug)
 )
 `)
 .eq("organization_id", orgId)
 .single();

 if (!sub) return null;

 const pv = sub.subscription_plan_versions as unknown as {
 monthly_price: number;
 annual_price: number;
 currency: string;
 subscription_plans: { name: string; slug: string };
 };

 return {
 ...(sub as unknown as Subscription),
 plan_name: pv.subscription_plans.name,
 plan_slug: pv.subscription_plans.slug,
 monthly_price: pv.monthly_price,
 annual_price: pv.annual_price,
 currency: pv.currency,
 };
}

export async function getMyInvoices(): Promise<SubscriptionInvoice[]> {
 const { supabase, orgId } = await getCtx();

 const { data } = await supabase
 .from("subscription_invoices")
 .select("*")
 .eq("organization_id", orgId)
 .order("due_at", { ascending: false })
 .limit(50);

 return (data ?? []) as SubscriptionInvoice[];
}

export async function getMySubscriptionEvents(): Promise<SubscriptionEvent[]> {
 const { supabase, orgId } = await getCtx();

 const { data } = await supabase
 .from("subscription_events")
 .select("*")
 .eq("organization_id", orgId)
 .order("occurred_at", { ascending: false })
 .limit(50);

 return (data ?? []) as SubscriptionEvent[];
}

export async function getMyUsageSummary(): Promise<UsageSummary[]> {
 const { supabase, orgId } = await getCtx();

 // Get current subscription's entitlements
 const { data: sub } = await supabase
 .from("subscriptions")
 .select("plan_version_id")
 .eq("organization_id", orgId)
 .in("status", ["active", "trialing", "grace_period"])
 .limit(1)
 .single();

 if (!sub) return [];

 const { data: entitlements } = await supabase
 .from("plan_entitlements")
 .select("feature_key, limit_value, limit_unit")
 .eq("plan_version_id", sub.plan_version_id)
 .eq("is_enabled", true);

 const now = new Date();
 const periodStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0];

 const { data: usageRecords } = await supabase
 .from("organization_usage_records")
 .select("feature_key, usage_value")
 .eq("organization_id", orgId)
 .eq("period_start", periodStart);

 const usageMap = new Map((usageRecords ?? []).map((r) => [r.feature_key, r.usage_value]));

 return (entitlements ?? []).map((e) => {
 const current = usageMap.get(e.feature_key) ?? 0;
 const limit = e.limit_value;
 return {
 feature_key: e.feature_key,
 current_usage: current,
 limit,
 limit_unit: e.limit_unit,
 percentage: limit && limit > 0 ? Math.round((current / limit) * 100) : null,
 };
 });
}

// ============================================================================
// EMPRESA: Solicitar mudança de plano
// ============================================================================

export async function requestPlanChange(input: RequestPlanChangeInput) {
 const { supabase, user, orgId, role } = await getCtx();

 if (!["OWNER", "ADMIN"].includes(role)) {
 throw new Error("Apenas proprietários e administradores podem alterar o plano.");
 }

 // Verify current subscription exists
 const { data: currentSub } = await supabase
 .from("subscriptions")
 .select("id, status")
 .eq("organization_id", orgId)
 .in("status", ["active", "trialing"])
 .single();

 if (!currentSub) throw new Error("Nenhuma assinatura ativa encontrada.");

 // Verify target plan version exists and is published
 const { data: targetVersion } = await supabase
 .from("subscription_plan_versions")
 .select("id, plan_id")
 .eq("id", input.requested_plan_version_id)
 .not("published_at", "is", null)
 .single();

 if (!targetVersion) throw new Error("Plano selecionado não está disponível.");

 // Check no pending changes
 const { data: pending } = await supabase
 .from("plan_changes")
 .select("id")
 .eq("organization_id", orgId)
 .eq("status", "pending")
 .limit(1);

 if (pending && pending.length > 0) {
 throw new Error("Já existe uma alteração de plano pendente. Aguarde ou cancele a anterior.");
 }

 // Determine change type (simple heuristic based on price comparison)
 const { data: currentSubFull } = await supabase
 .from("subscriptions")
 .select("plan_version_id, subscription_plan_versions(monthly_price)")
 .eq("organization_id", orgId)
 .single();

 const currentPrice = (currentSubFull?.subscription_plan_versions as unknown as { monthly_price: number } | null)?.monthly_price ?? 0;
 const { data: targetPriceRow } = await supabase
 .from("subscription_plan_versions")
 .select("monthly_price")
 .eq("id", input.requested_plan_version_id)
 .single();
 const targetPrice = targetPriceRow?.monthly_price ?? 0;

 const changeType = targetPrice >= currentPrice ? "upgrade" : "downgrade";

 // Calculate effective date (next billing cycle or immediate for upgrades)
 const effectiveAt = changeType === "upgrade"
 ? new Date().toISOString()
 : (currentSubFull?.subscription_plan_versions as { current_period_end?: string } | null)?.current_period_end ?? new Date().toISOString();

 await supabase.from("plan_changes").insert({
 organization_id: orgId,
 current_subscription_id: currentSub.id,
 requested_plan_version_id: input.requested_plan_version_id,
 change_type: changeType,
 effective_at: effectiveAt,
 status: "pending",
 requested_by: user.id,
 });

 await supabase.rpc("log_platform_audit", {
 p_actor: user.id,
 p_action: "plan_change_requested",
 p_resource_type: "subscription",
 p_resource_id: currentSub.id,
 p_metadata: { change_type: changeType, target_plan_version_id: input.requested_plan_version_id },
 });

 revalidatePath("/dashboard/billing");
}

// ============================================================================
// EMPRESA: Suporte
// ============================================================================

export async function createSupportTicket(input: CreateSupportTicketInput) {
 const { supabase, user, orgId } = await getCtx();

 const { error } = await supabase.from("support_tickets").insert({
 organization_id: orgId,
 subject: input.subject,
 description: input.description,
 priority: input.priority ?? "medium",
 status: "open",
 created_by: user.id,
 });

 if (error) throw new Error(error.message);
 revalidatePath("/dashboard/billing");
}

export async function getMySupportTickets(): Promise<SupportTicket[]> {
 const { supabase, orgId } = await getCtx();

 const { data } = await supabase
 .from("support_tickets")
 .select("*")
 .eq("organization_id", orgId)
 .order("created_at", { ascending: false })
 .limit(50);

 return (data ?? []) as SupportTicket[];
}

// ============================================================================
// NEXORA ADMIN: Dashboard
// ============================================================================

export async function getAdminDashboardStats(): Promise<AdminDashboardStats> {
 await getPlatformAdminCtx();
 const supabase = await createClient();

 const thirtyDaysAgo = new Date();
 thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

 const [
 totalOrgs,
 activeSubs,
 pastDueSubs,
 canceledSubs,
 trialingSubs,
 pendingInvoices,
 failedPayments,
 newOrgs,
 ] = await Promise.all([
 supabase.from("organizations").select("id", { count: "exact", head: true }),
 supabase.from("subscriptions").select("id", { count: "exact", head: true }).eq("status", "active"),
 supabase.from("subscriptions").select("id", { count: "exact", head: true }).eq("status", "past_due"),
 supabase.from("subscriptions").select("id", { count: "exact", head: true }).eq("status", "canceled"),
 supabase.from("subscriptions").select("id", { count: "exact", head: true }).eq("status", "trialing"),
 supabase.from("subscription_invoices").select("id", { count: "exact", head: true }).eq("status", "pending"),
 supabase.from("subscription_payment_events").select("id", { count: "exact", head: true }).eq("status", "refused").gte("created_at", thirtyDaysAgo.toISOString()),
 supabase.from("organizations").select("id", { count: "exact", head: true }).gte("created_at", thirtyDaysAgo.toISOString()),
 ]);

 // Plan distribution
 const { data: planDist } = await supabase
 .from("subscriptions")
 .select("subscription_plan_versions(plan_id, subscription_plans(slug, name))")
 .eq("status", "active");

 const distMap = new Map<string, { name: string; count: number }>();
 for (const row of planDist ?? []) {
 const pv = row.subscription_plan_versions as unknown as {
 plan_id: string;
 subscription_plans: { slug: string; name: string };
 };
 const slug = pv.subscription_plans.slug;
 const existing = distMap.get(slug);
 if (existing) {
 existing.count++;
 } else {
 distMap.set(slug, { name: pv.subscription_plans.name, count: 1 });
 }
 }

 return {
 total_organizations: totalOrgs.count ?? 0,
 active_organizations: (activeSubs.count ?? 0) + (trialingSubs.count ?? 0),
 trialing_organizations: trialingSubs.count ?? 0,
 active_subscriptions: activeSubs.count ?? 0,
 past_due_subscriptions: pastDueSubs.count ?? 0,
 canceled_subscriptions: canceledSubs.count ?? 0,
 pending_invoices: pendingInvoices.count ?? 0,
 failed_payments_last_30d: failedPayments.count ?? 0,
 new_orgs_last_30d: newOrgs.count ?? 0,
 plan_distribution: Array.from(distMap.entries()).map(([slug, v]) => ({
 plan_slug: slug,
 plan_name: v.name,
 count: v.count,
 })),
 };
}

// ============================================================================
// NEXORA ADMIN: Gerenciar Planos
// ============================================================================

export async function getAllPlans(): Promise<PlanWithCurrentVersion[]> {
 await getPlatformAdminCtx();
 const supabase = await createClient();

 const { data: plans } = await supabase
 .from("subscription_plans")
 .select("*")
 .order("display_order", { ascending: true });

 const result: PlanWithCurrentVersion[] = [];
 for (const plan of plans ?? []) {
 const { data: version } = await supabase
 .from("subscription_plan_versions")
 .select("*")
 .eq("plan_id", plan.id)
 .order("version", { ascending: false })
 .limit(1)
 .single();

 result.push({ ...plan, current_version: version ?? null });
 }

 return result;
}

export async function createPlan(input: CreatePlanInput) {
 const { supabase, user } = await getPlatformAdminCtx();

 // Create plan
 const { data: plan, error: planError } = await supabase
 .from("subscription_plans")
 .insert({
 slug: input.slug,
 name: input.name,
 description: input.description ?? null,
 is_active: input.is_active ?? true,
 is_featured: input.is_featured ?? false,
 display_order: input.display_order ?? 0,
 })
 .select("id")
 .single();

 if (planError) throw new Error(planError.message);

 // Create first version
 const { data: version, error: versionError } = await supabase
 .from("subscription_plan_versions")
 .insert({
 plan_id: plan.id,
 version: 1,
 monthly_price: input.monthly_price,
 annual_price: input.annual_price,
 trial_days: input.trial_days ?? 0,
 grace_period_days: input.grace_period_days ?? 7,
 published_at: new Date().toISOString(),
 })
 .select("id")
 .single();

 if (versionError) throw new Error(versionError.message);

 // Insert entitlements
 if (input.entitlements.length > 0) {
 const { error: entError } = await supabase.from("plan_entitlements").insert(
 input.entitlements.map((e) => ({
 plan_version_id: version.id,
 feature_key: e.feature_key,
 is_enabled: e.is_enabled,
 limit_value: e.limit_value ?? null,
 limit_unit: e.limit_unit ?? null,
 })),
 );
 if (entError) throw new Error(entError.message);
 }

 await supabase.rpc("log_platform_audit", {
 p_actor: user.id,
 p_action: "plan_created",
 p_resource_type: "subscription_plan",
 p_resource_id: plan.id,
 p_metadata: { slug: input.slug, name: input.name },
 });

 revalidatePath("/admin/plans");
}

export async function updatePlan(planId: string, input: UpdatePlanInput) {
 const { supabase, user } = await getPlatformAdminCtx();

 const updateData: Record<string, unknown> = {};
 if (input.name !== undefined) updateData.name = input.name;
 if (input.description !== undefined) updateData.description = input.description;
 if (input.is_active !== undefined) updateData.is_active = input.is_active;
 if (input.is_featured !== undefined) updateData.is_featured = input.is_featured;
 if (input.display_order !== undefined) updateData.display_order = input.display_order;

 const { error } = await supabase
 .from("subscription_plans")
 .update(updateData)
 .eq("id", planId);

 if (error) throw new Error(error.message);

 await supabase.rpc("log_platform_audit", {
 p_actor: user.id,
 p_action: "plan_updated",
 p_resource_type: "subscription_plan",
 p_resource_id: planId,
 p_metadata: updateData,
 });

 revalidatePath("/admin/plans");
}

export async function createPlanVersion(input: CreatePlanVersionInput) {
 const { supabase, user } = await getPlatformAdminCtx();

 // Get next version number
 const { data: latest } = await supabase
 .from("subscription_plan_versions")
 .select("version")
 .eq("plan_id", input.plan_id)
 .order("version", { ascending: false })
 .limit(1)
 .single();

 const nextVersion = (latest?.version ?? 0) + 1;

 // Mark previous version as no longer valid
 await supabase
 .from("subscription_plan_versions")
 .update({ valid_until: new Date().toISOString() })
 .eq("plan_id", input.plan_id)
 .is("valid_until", null);

 // Create new version
 const { data: version, error } = await supabase
 .from("subscription_plan_versions")
 .insert({
 plan_id: input.plan_id,
 version: nextVersion,
 monthly_price: input.monthly_price,
 annual_price: input.annual_price,
 trial_days: input.trial_days ?? 0,
 grace_period_days: input.grace_period_days ?? 7,
 external_plan_id: input.external_plan_id ?? null,
 published_at: new Date().toISOString(),
 })
 .select("id")
 .single();

 if (error) throw new Error(error.message);

 // Insert entitlements
 if (input.entitlements.length > 0) {
 const { error: entError } = await supabase.from("plan_entitlements").insert(
 input.entitlements.map((e) => ({
 plan_version_id: version.id,
 feature_key: e.feature_key,
 is_enabled: e.is_enabled,
 limit_value: e.limit_value ?? null,
 limit_unit: e.limit_unit ?? null,
 })),
 );
 if (entError) throw new Error(entError.message);
 }

 await supabase.rpc("log_platform_audit", {
 p_actor: user.id,
 p_action: "plan_version_created",
 p_resource_type: "subscription_plan_version",
 p_resource_id: version.id,
 p_metadata: { plan_id: input.plan_id, version: nextVersion },
 });

 revalidatePath("/admin/plans");
}

// ============================================================================
// NEXORA ADMIN: Organizações e Assinaturas
// ============================================================================

export async function adminGetOrganizations(filters?: {
 search?: string;
 planSlug?: string;
 status?: string;
}) {
 await getPlatformAdminCtx();
 const supabase = await createClient();

 let query = supabase
 .from("organizations")
 .select(`
 id,
 name,
 slug,
 created_at,
 subscriptions (
 status,
 billing_interval,
 subscription_plan_versions (
 subscription_plans (slug, name)
 )
 )
 `)
 .order("created_at", { ascending: false })
 .limit(100);

 if (filters?.search) {
 query = query.ilike("name", `%${filters.search}%`);
 }

 const { data } = await query;
 return data ?? [];
}

export async function adminGetSubscriptions() {
 await getPlatformAdminCtx();
 const supabase = await createClient();

 const { data } = await supabase
 .from("subscriptions")
 .select(`
 *,
 organizations (name, slug),
 subscription_plan_versions (
 monthly_price,
 annual_price,
 subscription_plans (name, slug)
 )
 `)
 .order("created_at", { ascending: false })
 .limit(200);

 return data ?? [];
}

// ============================================================================
// NEXORA ADMIN: Suporte
// ============================================================================

export async function adminGetSupportTickets(status?: string) {
 await getPlatformAdminCtx();
 const supabase = await createClient();

 let query = supabase
 .from("support_tickets")
 .select(`
 *,
 organizations (name),
 profiles!created_by (full_name, email)
 `)
 .order("created_at", { ascending: false })
 .limit(100);

 if (status) {
 query = query.eq("status", status);
 }

 const { data } = await query;
 return data ?? [];
}

export async function adminUpdateTicketStatus(
 ticketId: string,
 status: string,
 assignedAdminId?: string | null,
) {
 const { supabase, user } = await getPlatformAdminCtx();

 const updateData: Record<string, unknown> = { status };
 if (assignedAdminId !== undefined) updateData.assigned_admin_id = assignedAdminId;

 const { error } = await supabase
 .from("support_tickets")
 .update(updateData)
 .eq("id", ticketId);

 if (error) throw new Error(error.message);

 await supabase.rpc("log_platform_audit", {
 p_actor: user.id,
 p_action: "ticket_updated",
 p_resource_type: "support_ticket",
 p_resource_id: ticketId,
 p_metadata: { status, assigned_admin_id: assignedAdminId },
 });

 revalidatePath("/admin/support");
}

// ============================================================================
// NEXORA ADMIN: Audit Logs
// ============================================================================

export async function adminGetAuditLogs(limit = 100) {
 await getPlatformAdminCtx();
 const supabase = await createClient();

 const { data } = await supabase
 .from("platform_audit_logs")
 .select(`
 *,
 profiles!actor_user_id (full_name, email)
 `)
 .order("created_at", { ascending: false })
 .limit(limit);

 return data ?? [];
}

// ============================================================================
// NEXORA ADMIN: Platform Admins
// ============================================================================

export async function adminGetPlatformAdmins(): Promise<PlatformAdminWithProfile[]> {
 await getPlatformAdminCtx();
 const supabase = await createClient();

 const { data } = await supabase
 .from("platform_admins")
 .select(`
 *,
 profiles!user_id (full_name, email, avatar_url)
 `)
 .order("created_at", { ascending: false });

 return (data ?? []).map((row) => {
 const profile = row.profiles as unknown as { full_name: string | null; email: string; avatar_url: string | null };
 return {
 ...(row as unknown as { id: string; user_id: string; internal_role: string; is_active: boolean; created_at: string; updated_at: string }),
 full_name: profile.full_name,
 email: profile.email,
 avatar_url: profile.avatar_url,
 } as PlatformAdminWithProfile;
 });
}