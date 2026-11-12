"use server";

import { createClient } from "@/lib/supabase/server";
import type { EntitlementMap, SubscriptionStatus } from "@/types/billing";

// ============================================================================
// CONTEXT HELPER
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

// ============================================================================
// ENTITLEMENT CHECK
// ============================================================================

/**
 * Verifica se a organização ativa tem acesso a um recurso específico.
 * Usa RPC SECURITY DEFINER para garantir consistência e performance.
 */
export async function hasEntitlement(featureKey: string): Promise<boolean> {
 const { supabase, orgId } = await getCtx();

 const { data, error } = await supabase.rpc("check_entitlement", {
 p_org_id: orgId,
 p_feature_key: featureKey,
 });

 if (error || data === null) return false;
 return data as boolean;
}

/**
 * Retorna o limite numérico de um recurso para a organização ativa.
 * Retorna 0 se o recurso não estiver habilitado ou não houver assinatura ativa.
 */
export async function getEntitlementLimit(featureKey: string): Promise<number> {
 const { supabase, orgId } = await getCtx();

 const { data, error } = await supabase.rpc("get_entitlement_limit", {
 p_org_id: orgId,
 p_feature_key: featureKey,
 });

 if (error || data === null) return 0;
 return data as number;
}

/**
 * Retorna todos os entitlements da assinatura ativa da organização.
 */
export async function getOrganizationEntitlements(): Promise<EntitlementMap> {
 const { supabase, orgId } = await getCtx();

 // Get active subscription's plan version
 const { data: sub } = await supabase
 .from("subscriptions")
 .select("plan_version_id")
 .eq("organization_id", orgId)
 .in("status", ["active", "trialing", "grace_period"] as SubscriptionStatus[])
 .limit(1)
 .single();

 if (!sub) return {};

 const { data: entitlements } = await supabase
 .from("plan_entitlements")
 .select("feature_key, is_enabled, limit_value, limit_unit")
 .eq("plan_version_id", sub.plan_version_id);

 const map: EntitlementMap = {};
 for (const e of entitlements ?? []) {
 map[e.feature_key] = {
 is_enabled: e.is_enabled,
 limit_value: e.limit_value,
 limit_unit: e.limit_unit,
 };
 }

 return map;
}

// ============================================================================
// LIMIT ENFORCEMENT
// ============================================================================

/**
 * Verifica se a organização pode criar mais um registro do tipo especificado.
 * Lança erro se o limite foi atingido.
 *
 * @param featureKey - Chave do recurso (ex: "crm.customers")
 * @param currentCount - Quantidade atual de registros
 * @throws Error se o limite foi atingido
 */
export async function enforceLimit(featureKey: string, currentCount: number): Promise<void> {
 const isEnabled = await hasEntitlement(featureKey);
 if (!isEnabled) {
 throw new Error(
 `O recurso "${featureKey}" não está disponível no seu plano atual. Faça upgrade para acessá-lo.`,
 );
 }

 const limit = await getEntitlementLimit(featureKey);
 // limit === 0 means unlimited (no numeric cap set)
 if (limit > 0 && currentCount >= limit) {
 throw new Error(
 `Limite de ${limit} ${featureKey.split(".")[1]} atingido no seu plano atual. Faça upgrade para adicionar mais.`,
 );
 }
}

/**
 * Verifica se a organização pode adicionar mais usuários sem violar o limite.
 * Garante que os dois OWNERs nunca sejam comprometidos.
 */
export async function enforceUserLimit(currentUserCount: number): Promise<void> {
 const isEnabled = await hasEntitlement("team.users");
 if (!isEnabled) {
 throw new Error("Gerenciamento de equipe não está disponível no seu plano atual.");
 }

 const limit = await getEntitlementLimit("team.users");
 if (limit > 0 && currentUserCount >= limit) {
 throw new Error(
 `Limite de ${limit} usuários atingido. Remova um membro ou faça upgrade para adicionar mais.`,
 );
 }
}

/**
 * Valida que uma mudança de plano não comprometerá os dois OWNERs.
 */
export async function validateOwnerProtection(targetPlanVersionId: string): Promise<void> {
 const { supabase, orgId } = await getCtx();

 // Count current owners
 const { count: ownerCount } = await supabase
 .from("memberships")
 .select("id", { count: "exact", head: true })
 .eq("organization_id", orgId)
 .eq("role", "OWNER")
 .eq("status", "active");

 // Check target plan's owner limit
 const { data: entitlement } = await supabase
 .from("plan_entitlements")
 .select("limit_value")
 .eq("plan_version_id", targetPlanVersionId)
 .eq("feature_key", "team.owners")
 .single();

 const ownerLimit = entitlement?.limit_value ?? 2;

 if ((ownerCount ?? 0) > ownerLimit) {
 throw new Error(
 `O plano selecionado permite apenas ${ownerLimit} proprietário(s), mas sua organização possui ${ownerCount}. Ajuste os proprietários antes de mudar de plano.`,
 );
 }
}

// ============================================================================
// USAGE TRACKING
// ============================================================================

/**
 * Registra/atualiza a utilização de um recurso para a organização ativa.
 */
export async function recordUsage(featureKey: string, value: number): Promise<void> {
 const { supabase, orgId } = await getCtx();

 const now = new Date();
 const periodStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0];
 const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split("T")[0];

 await supabase.from("organization_usage_records").upsert(
 {
 organization_id: orgId,
 feature_key: featureKey,
 usage_value: value,
 period_start: periodStart,
 period_end: periodEnd,
 },
 { onConflict: "organization_id,feature_key,period_start" },
 );
}