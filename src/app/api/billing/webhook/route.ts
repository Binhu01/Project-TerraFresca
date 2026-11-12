import { NextRequest, NextResponse } from "next/server";
import { processMpWebhookEvent, verifyWebhookSignature } from "@/lib/billing/mercado-pago";

/**
 * NEXORA FASE 14 — Webhook Endpoint para Mercado Pago SaaS Billing
 *
 * Recebe notificações assíncronas do Mercado Pago sobre:
 * - Pagamentos aprovados/rejeitados
 * - Mudanças de status em assinaturas (preapproval)
 * - Reembolsos e chargebacks
 *
 * URL: POST /api/billing/webhook
 * Configurar no painel MP: https://nexora.app/api/billing/webhook
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const signature = request.headers.get("x-signature") ?? "";

    // Verify webhook signature (if secret is configured)
    if (!verifyWebhookSignature(signature, body)) {
      console.error("[Billing Webhook] Assinatura inválida");
      return NextResponse.json(
        { error: "Invalid signature" },
        { status: 401 },
      );
    }

    const event = JSON.parse(body);

    // Validate basic structure
    if (!event.id || !event.type) {
      return NextResponse.json(
        { error: "Invalid event format" },
        { status: 400 },
      );
    }

    // Process the event idempotently
    await processMpWebhookEvent(event);

    // Always return 200 to acknowledge receipt
    // MP retries on non-2xx responses
    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("[Billing Webhook] Erro ao processar evento:", error);

    // Return 500 so MP retries
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// GET for health check / verification
export async function GET() {
  return NextResponse.json({ status: "ok", service: "billing-webhook" });
}