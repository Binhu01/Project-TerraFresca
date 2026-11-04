import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    let paymentId: string | null = url.searchParams.get("data.id") || url.searchParams.get("id");

    if (!paymentId && req.method === "POST") {
      const body = await req.json().catch(() => null);
      if (body?.data?.id) paymentId = String(body.data.id);
      if (!paymentId && body?.resource) {
        // formato antigo de webhook do Mercado Pago (.../payments/123456)
        const partes = String(body.resource).split("/");
        paymentId = partes[partes.length - 1];
      }
    }

    if (!paymentId) {
      // Não é uma notificação de pagamento — só confirma o recebimento.
      return new Response("ok", { status: 200, headers: corsHeaders });
    }

    // Nunca confiamos no status que vem dentro da notificação em si —
    // sempre confirmamos consultando direto na API do Mercado Pago,
    // usando o ID do pagamento.
    const respostaMP = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
      headers: { Authorization: `Bearer ${Deno.env.get("MP_ACCESS_TOKEN")}` },
    });

    if (!respostaMP.ok) {
      console.error("Não foi possível consultar o pagamento:", await respostaMP.text());
      return new Response("ok", { status: 200, headers: corsHeaders });
    }

    const pagamento = await respostaMP.json();
    const pedidoId = pagamento.external_reference;

    if (!pedidoId) {
      return new Response("ok", { status: 200, headers: corsHeaders });
    }

    let statusInterno: "aprovado" | "recusado" | null = null;
    if (pagamento.status === "approved") {
      statusInterno = "aprovado";
    } else if (["rejected", "cancelled", "refunded", "charged_back"].includes(pagamento.status)) {
      statusInterno = "recusado";
    }

    // Status intermediário (pending, in_process, authorized): ainda não é
    // definitivo — só confirma o recebimento e espera a próxima notificação.
    if (!statusInterno) {
      return new Response("ok", { status: 200, headers: corsHeaders });
    }

    // Chave de serviço: só essa função de servidor de confiança pode
    // gravar em "pagamentos" — o navegador não tem mais permissão
    // nenhuma de inserir aqui direto.
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // upsert por mp_payment_id evita gravar duas vezes caso o Mercado
    // Pago reenvie a mesma notificação (o que é comum e esperado).
    const { error } = await supabaseAdmin.from("pagamentos").upsert(
      {
        pedido_id: pedidoId,
        status: statusInterno,
        metodo: "mercado_pago",
        mp_payment_id: String(paymentId),
      },
      { onConflict: "mp_payment_id", ignoreDuplicates: true }
    );

    if (error) {
      console.error("Erro ao gravar pagamento:", error);
    }

    return new Response("ok", { status: 200, headers: corsHeaders });
  } catch (erro) {
    console.error(erro);
    return new Response("ok", { status: 200, headers: corsHeaders });
  }
});
