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
    const { pedido_id, retorno_url } = await req.json();

    if (!pedido_id || !retorno_url) {
      return new Response(
        JSON.stringify({ error: "pedido_id e retorno_url são obrigatórios" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Cliente autenticado como quem fez a chamada — assim, as regras de
    // segurança do banco (RLS) já garantem sozinhas que só dá pra criar
    // pagamento pra um pedido que seja realmente do próprio usuário.
    const supabaseUser = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: req.headers.get("Authorization")! } } }
    );

    const { data: pedido, error: erroPedido } = await supabaseUser
      .from("pedidos")
      .select("id")
      .eq("id", pedido_id)
      .single();

    if (erroPedido || !pedido) {
      return new Response(JSON.stringify({ error: "Pedido não encontrado" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Os itens (nome, preço, quantidade) vêm do banco — nunca do que o
    // navegador mandou — porque foram gravados pela função finalizar_pedido,
    // que já lê o preço real direto da tabela produtos.
    const { data: itens, error: erroItens } = await supabaseUser
      .from("pedido_itens")
      .select("nome_produto, preco_unitario, quantidade")
      .eq("pedido_id", pedido_id);

    if (erroItens || !itens || itens.length === 0) {
      return new Response(JSON.stringify({ error: "Itens do pedido não encontrados" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const preferencia = {
      items: itens.map((item: { nome_produto: string; preco_unitario: number; quantidade: number }) => ({
        title: item.nome_produto,
        quantity: item.quantidade,
        unit_price: Number(item.preco_unitario),
        currency_id: "BRL",
      })),
      external_reference: pedido_id,
      back_urls: {
        success: retorno_url,
        failure: retorno_url,
        pending: retorno_url,
      },
      auto_return: "approved",
      notification_url: `${Deno.env.get("SUPABASE_URL")}/functions/v1/pagamento-webhook`,
    };

    const respostaMP = await fetch("https://api.mercadopago.com/checkout/preferences", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${Deno.env.get("MP_ACCESS_TOKEN")}`,
      },
      body: JSON.stringify(preferencia),
    });

    const dadosMP = await respostaMP.json();

    if (!respostaMP.ok) {
      console.error("Erro do Mercado Pago:", dadosMP);
      return new Response(JSON.stringify({ error: "Não foi possível criar o pagamento" }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ init_point: dadosMP.init_point }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (erro) {
    console.error(erro);
    return new Response(JSON.stringify({ error: "Erro interno" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
