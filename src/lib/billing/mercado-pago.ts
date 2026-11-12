/**
 * NEXORA FASE 14 — Adaptador Mercado Pago para Billing SaaS
 *
 * Integração server-side com a API do Mercado Pago para gerenciamento de
 * assinaturas recorrentes da plataforma Nexora. Esta integração é separada
 * da integração de pagamentos de clientes (Fase 12) — usa credenciais
 * próprias da Nexora como merchant.
 *
 * Fluxo:
 * 1. Criar customer no MP (se não existir)
 * 2. Criar preapproval plan (mapeia subscription_plan_version)
 * 3. Criar preapproval (subscription) vinculada ao customer + plan
 * 4. Webhook recebe eventos de pagamento e atualiza status local
 */

import { createClient } from "@/lib/supabase/server";

// ============================================================================
// CONFIGURAÇÃO
// ============================================================================

const MP_BASE_URL = process.env.MP_SAAS_API_URL ?? "https://api.mercadopago.com";
const MP_ACCESS_TOKEN = process.env.MP_SAAS_ACCESS_TOKEN ?? "";
const MP_WEBHOOK_SECRET = process.env.MP_SAAS_WEBHOOK_SECRET ?? "";

function requireToken(): string {
  if (!MP_ACCESS_TOKEN) {
    throw new Error("MP_SAAS_ACCESS_TOKEN não configurado no ambiente.");
  }
  return MP_ACCESS_TOKEN;
}

// ============================================================================
// TIPOS INTERNOS DA API MERCADO PAGO
// ============================================================================

interface MpCustomer {
  id: string;
  email: string;
  first_name?: string;
  last_name?: string;
}

interface MpPreapprovalPlan {
  id: string;
  reason: string;
  auto_recurring: {
    frequency: number;
    frequency_type: "months" | "days";
    transaction_amount: number;
    currency_id: string;
  };
}

interface MpPreapproval {
  id: string;
  payer_email: string;
  preapproval_plan_id?: string;
  reason: string;
  status: "pending" | "authorized" | "paused" | "cancelled";
  auto_recurring?: {
    frequency: number;
    frequency_type: string;
    transaction_amount: number;
    currency_id: string;
    start_date?: string;
    end_date?: string;
  };
  init_point?: string; // URL de checkout
  sandbox_init_point?: string;
}

interface MpPayment {
  id: number;
  status: "approved" | "pending" | "rejected" | "cancelled" | "refunded";
  transaction_amount: number;
  currency_id: string;
  date_approved: string | null;
  external_reference: string | null;
  metadata: Record<string, unknown>;
}

// ============================================================================
// HTTP HELPER
// ============================================================================

async function mpFetch<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const token = requireToken();
  const url = `${MP_BASE_URL}${path}`;

  const res = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Mercado Pago API error ${res.status}: ${body}`);
  }

  // 204 No Content
  if (res.status === 204) return undefined as T;

  return res.json() as Promise<T>;
}

// ============================================================================
// CUSTOMER
// ============================================================================

/**
 * Busca ou cria um customer no Mercado Pago para a organização.
 * Retorna o external_customer_id.
 */
export async function getOrCreateMpCustomer(
  organizationId: string,
  email: string,
  name?: string,
): Promise<string> {
  const supabase = await createClient();

  // Check existing billing_customer
  const { data: existing } = await supabase
    .from("billing_customers")
    .select("external_customer_id")
    .eq("organization_id", organizationId)
    .eq("provider", "mercadopago")
    .single();

  if (existing?.external_customer_id) {
    return existing.external_customer_id;
  }

  // Create on MP
  const [firstName, ...rest] = (name ?? "").split(" ");
  const lastName = rest.join(" ") || undefined;

  const customer = await mpFetch<MpCustomer>("/v1/customers", {
    method: "POST",
    body: JSON.stringify({
      email,
      first_name: firstName || undefined,
      last_name: lastName,
      description: `Nexora Organization ${organizationId}`,
    }),
  });

  // Persist locally
  await supabase.from("billing_customers").insert({
    organization_id: organizationId,
    provider: "mercadopago",
    external_customer_id: customer.id,
    billing_email: email,
  });

  return customer.id;
}

// ============================================================================
// PREAPPROVAL PLAN (catálogo de planos no MP)
// ============================================================================

/**
 * Cria ou retorna um preapproval plan no Mercado Pago para uma versão de plano.
 * O external_plan_id é armazenado em subscription_plan_versions.
 */
export async function getOrCreateMpPlan(
  planVersionId: string,
  planName: string,
  monthlyPrice: number,
  currency: string = "BRL",
): Promise<string> {
  const supabase = await createClient();

  // Check existing external_plan_id
  const { data: version } = await supabase
    .from("subscription_plan_versions")
    .select("external_plan_id")
    .eq("id", planVersionId)
    .single();

  if (version?.external_plan_id) {
    return version.external_plan_id;
  }

  // Create preapproval plan on MP
  const mpPlan = await mpFetch<MpPreapprovalPlan>("/preapproval_plans", {
    method: "POST",
    body: JSON.stringify({
      reason: `Nexora - ${planName}`,
      auto_recurring: {
        frequency: 1,
        frequency_type: "months",
        transaction_amount: monthlyPrice,
        currency_id: currency,
      },
      back_url: `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/dashboard/billing`,
    }),
  });

  // Store external_plan_id
  await supabase
    .from("subscription_plan_versions")
    .update({ external_plan_id: mpPlan.id })
    .eq("id", planVersionId);

  return mpPlan.id;
}

// ============================================================================
// SUBSCRIPTION (PREAPPROVAL)
// ============================================================================

/**
 * Cria uma assinatura recorrente no Mercado Pago.
 * Retorna a URL de checkout (init_point) para o usuário aprovar.
 */
export async function createMpSubscription(params: {
  organizationId: string;
  customerEmail: string;
  customerName?: string;
  planVersionId: string;
  planName: string;
  monthlyPrice: number;
  currency?: string;
  trialDays?: number;
}): Promise<{ subscriptionId: string; checkoutUrl: string }> {
  const customerId = await getOrCreateMpCustomer(
    params.organizationId,
    params.customerEmail,
    params.customerName,
  );

  const mpPlanId = await getOrCreateMpPlan(
    params.planVersionId,
    params.planName,
    params.monthlyPrice,
    params.currency,
  );

  // Calculate trial end date if applicable
  let startDate: string | undefined;
  if (params.trialDays && params.trialDays > 0) {
    const trialEnd = new Date();
    trialEnd.setDate(trialEnd.getDate() + params.trialDays);
    startDate = trialEnd.toISOString();
  }

  const preapproval = await mpFetch<MpPreapproval>("/preapproval", {
    method: "POST",
    body: JSON.stringify({
      payer_email: params.customerEmail,
      customer_id: customerId,
      preapproval_plan_id: mpPlanId,
      reason: `Nexora - ${params.planName}`,
      external_reference: params.organizationId,
      auto_recurring: {
        frequency: 1,
        frequency_type: "months",
        transaction_amount: params.monthlyPrice,
        currency_id: params.currency ?? "BRL",
        ...(startDate ? { start_date: startDate } : {}),
      },
      back_url: `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/dashboard/billing`,
    }),
  });

  const checkoutUrl = preapproval.init_point ?? preapproval.sandbox_init_point ?? "";

  return {
    subscriptionId: preapproval.id,
    checkoutUrl,
  };
}

/**
 * Cancela uma assinatura no Mercado Pago.
 */
export async function cancelMpSubscription(externalSubscriptionId: string): Promise<void> {
  await mpFetch(`/preapproval/${externalSubscriptionId}`, {
    method: "PUT",
    body: JSON.stringify({ status: "cancelled" }),
  });
}

/**
 * Pausa uma assinatura no Mercado Pago.
 */
export async function pauseMpSubscription(externalSubscriptionId: string): Promise<void> {
  await mpFetch(`/preapproval/${externalSubscriptionId}`, {
    method: "PUT",
    body: JSON.stringify({ status: "paused" }),
  });
}

/**
 * Reativa uma assinatura pausada no Mercado Pago.
 */
export async function resumeMpSubscription(externalSubscriptionId: string): Promise<void> {
  await mpFetch(`/preapproval/${externalSubscriptionId}`, {
    method: "PUT",
    body: JSON.stringify({ status: "authorized" }),
  });
}

// ============================================================================
// PAYMENT QUERY
// ============================================================================

/**
 * Busca detalhes de um pagamento no Mercado Pago.
 */
export async function getMpPayment(paymentId: string): Promise<MpPayment> {
  return mpFetch<MpPayment>(`/v1/payments/${paymentId}`);
}

// ============================================================================
// WEBHOOK VERIFICATION & PROCESSING
// ============================================================================

/**
 * Verifica a assinatura do webhook do Mercado Pago.
 */
export function verifyWebhookSignature(signature: string, payload: string): boolean {
  if (!MP_WEBHOOK_SECRET) {
    console.warn("MP_SAAS_WEBHOOK_SECRET não configurado — pulando verificação.");
    return true; // Em dev sem secret, aceita
  }

  // Mercado Pago usa HMAC-SHA256 para assinar webhooks
  // A verificação exata depende do header x-signature
  // Simplificação: comparar hash direto
  try {
    const crypto = require("crypto");
    const expected = crypto
      .createHmac("sha256", MP_WEBHOOK_SECRET)
      .update(payload)
      .digest("hex");
    return expected === signature;
  } catch {
    console.error("Erro ao verificar assinatura do webhook MP");
    return false;
  }
}

/**
 * Processa evento de webhook do Mercado Pago.
 * Idempotente via event_id UNIQUE constraint.
 */
export async function processMpWebhookEvent(event: {
  id: string;
  type: string;
  action?: string;
  data?: { id?: string };
  api_version?: string;
}): Promise<void> {
  const supabase = await createClient();

  // Map MP event types to internal actions
  switch (event.type) {
    case "payment": {
      if (!event.data?.id) return;

      const payment = await getMpPayment(event.data.id);
      const orgId = payment.external_reference;
      if (!orgId) return;

      // Find subscription for this org
      const { data: sub } = await supabase
        .from("subscriptions")
        .select("id, status")
        .eq("organization_id", orgId)
        .in("status", ["active", "trialing", "past_due", "grace_period"])
        .limit(1)
        .single();

      if (!sub) return;

      // Insert payment event (idempotent via event_id unique)
      const { error: insertError } = await supabase
        .from("subscription_payment_events")
        .insert({
          organization_id: orgId,
          subscription_id: sub.id,
          external_payment_id: String(payment.id),
          event_id: event.id,
          amount: payment.transaction_amount,
          currency: payment.currency_id,
          status: payment.status,
          paid_at: payment.date_approved,
        });

      if (insertError) {
        // Duplicate event_id = already processed, safe to ignore
        if (insertError.code === "23505") return;
        throw insertError;
      }

      // Update subscription status based on payment
      if (payment.status === "approved") {
        await supabase
          .from("subscriptions")
          .update({
            status: "active",
            current_period_start: new Date().toISOString(),
            current_period_end: new Date(
              Date.now() + 30 * 24 * 60 * 60 * 1000,
            ).toISOString(),
          })
          .eq("id", sub.id);

        // Record subscription event
        await supabase.rpc("record_subscription_event", {
          p_org_id: orgId,
          p_subscription_id: sub.id,
          p_event_type: "payment_received",
          p_previous_status: sub.status,
          p_new_status: "active",
          p_source: "webhook",
          p_metadata: { payment_id: payment.id, amount: payment.transaction_amount },
        });
      } else if (payment.status === "rejected") {
        await supabase
          .from("subscriptions")
          .update({ status: "past_due" })
          .eq("id", sub.id);

        await supabase.rpc("record_subscription_event", {
          p_org_id: orgId,
          p_subscription_id: sub.id,
          p_event_type: "payment_failed",
          p_previous_status: sub.status,
          p_new_status: "past_due",
          p_source: "webhook",
          p_metadata: { payment_id: payment.id },
        });
      }

      break;
    }

    case "subscription_preapproval": {
      if (!event.data?.id) return;

      // Preapproval status change
      const preapproval = await mpFetch<MpPreapproval>(
        `/preapproval/${event.data.id}`,
      );

      const orgId = preapproval.reason?.includes("Nexora")
        ? undefined // Need to find by external_reference
        : undefined;

      // Find org by external subscription reference
      const { data: sub } = await supabase
        .from("subscriptions")
        .select("id, organization_id, status")
        .eq("external_subscription_id", event.data.id)
        .single();

      if (!sub) return;

      const statusMap: Record<string, string> = {
        authorized: "active",
        pending: "trialing",
        paused: "paused",
        cancelled: "canceled",
      };

      const newStatus = statusMap[preapproval.status];
      if (newStatus && newStatus !== sub.status) {
        await supabase
          .from("subscriptions")
          .update({ status: newStatus as never })
          .eq("id", sub.id);

        await supabase.rpc("record_subscription_event", {
          p_org_id: sub.organization_id,
          p_subscription_id: sub.id,
          p_event_type: `subscription_${preapproval.status}`,
          p_previous_status: sub.status,
          p_new_status: newStatus,
          p_source: "webhook",
          p_metadata: { mp_preapproval_id: event.data.id },
        });
      }

      break;
    }

    default:
      // Unknown event type — log but don't fail
      console.log(`[MP Webhook] Evento ignorado: ${event.type}`);
  }
}

// ============================================================================
// STATUS SYNC
// ============================================================================

/**
 * Sincroniza o status de uma assinatura com o Mercado Pago.
 * Usado para reconciliação quando webhooks são perdidos.
 */
export async function syncSubscriptionStatus(subscriptionId: string): Promise<void> {
  const supabase = await createClient();

  const { data: sub } = await supabase
    .from("subscriptions")
    .select("external_subscription_id, status, organization_id")
    .eq("id", subscriptionId)
    .single();

  if (!sub?.external_subscription_id) return;

  try {
    const preapproval = await mpFetch<MpPreapproval>(
      `/preapproval/${sub.external_subscription_id}`,
    );

    const statusMap: Record<string, string> = {
      authorized: "active",
      pending: "trialing",
      paused: "paused",
      cancelled: "canceled",
    };

    const newStatus = statusMap[preapproval.status];
    if (newStatus && newStatus !== sub.status) {
      await supabase
        .from("subscriptions")
        .update({ status: newStatus as never })
        .eq("id", subscriptionId);

      await supabase.rpc("record_subscription_event", {
        p_org_id: sub.organization_id,
        p_subscription_id: subscriptionId,
        p_event_type: "status_synced",
        p_previous_status: sub.status,
        p_new_status: newStatus,
        p_source: "admin",
        p_metadata: { synced_from: "mercadopago" },
      });
    }
  } catch (err) {
    console.error(`[MP Sync] Erro ao sincronizar assinatura ${subscriptionId}:`, err);
  }
}