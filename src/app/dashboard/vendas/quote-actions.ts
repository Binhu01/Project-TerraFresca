"use server";

import { createClient } from "@/lib/supabase/server";
import { getActiveOrganization } from "@/lib/organizations";
import { revalidatePath } from "next/cache";
import type { QuoteWithDetails, SalesStats, QuoteStats } from "@/types/sales";
import {
  createQuoteSchema,
  updateQuoteSchema,
  updateQuoteStatusSchema,
  type CreateQuoteInput,
  type UpdateQuoteInput,
} from "./schemas";

async function getCtx() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Não autenticado");
  const activeData = await getActiveOrganization();
  if (!activeData) throw new Error("Nenhuma organização ativa");
  return { supabase, user, orgId: activeData.org.id };
}

function calcTotals(items: { quantity: number; unit_price: number; discount: number }[]) {
  let subtotal = 0;
  let totalDiscount = 0;
  for (const item of items) {
    subtotal += item.quantity * item.unit_price;
    totalDiscount += item.discount;
  }
  return { subtotal, discount: totalDiscount, tax: 0, total: subtotal - totalDiscount };
}

export async function getQuotes(params?: { search?: string; status?: string; page?: number; perPage?: number }) {
  const { supabase, orgId } = await getCtx();
  const page = params?.page ?? 1;
  const perPage = params?.perPage ?? 20;
  const from = (page - 1) * perPage;
  const to = from + perPage - 1;

  let query = supabase
    .from("quotes")
    .select(`*, customer:customers!inner(id, name, email), channel:sales_channels(id, name), creator:profiles!inner(id, full_name), items:quote_items(*)`, { count: "exact" })
    .eq("organization_id", orgId)
    .order("created_at", { ascending: false })
    .range(from, to);

  if (params?.status && params.status !== "all") query = query.eq("status", params.status);
  if (params?.search) query = query.or(`document_number.ilike.%${params.search}%`);

  const { data, error, count } = await query;
  if (error) throw error;
  return { quotes: (data ?? []) as unknown as QuoteWithDetails[], total: count ?? 0 };
}

export async function getQuoteById(id: string) {
  const { supabase, orgId } = await getCtx();
  const { data, error } = await supabase
    .from("quotes")
    .select(`*, customer:customers!inner(id, name, email), channel:sales_channels(id, name), creator:profiles!inner(id, full_name), items:quote_items(*)`)
    .eq("id", id).eq("organization_id", orgId).single();
  if (error) { if (error.code === "PGRST116") return null; throw error; }
  return data as unknown as QuoteWithDetails;
}

export async function createQuote(input: CreateQuoteInput) {
  const parsed = createQuoteSchema.parse(input);
  const { supabase, orgId, user } = await getCtx();
  const { data: docNum, error: docErr } = await supabase.rpc("next_document_number", { p_org_id: orgId, p_type: "quote" });
  if (docErr) throw docErr;
  const totals = calcTotals(parsed.items);

  const { data: quote, error: quoteErr } = await supabase.from("quotes").insert({
    organization_id: orgId, customer_id: parsed.customer_id, channel_id: parsed.channel_id ?? null,
    lead_id: parsed.lead_id ?? null, document_number: docNum, status: "draft",
    subtotal: totals.subtotal, discount: totals.discount, tax: totals.tax, total: totals.total,
    notes: parsed.notes ?? null, valid_until: parsed.valid_until, created_by: user.id,
  }).select("id").single();
  if (quoteErr) throw quoteErr;

  const itemsWithSnapshots = await Promise.all(
    parsed.items.map(async (item) => {
      const base = {
        quote_id: quote.id, organization_id: orgId, description: item.description,
        quantity: item.quantity, unit_price: item.unit_price, discount: item.discount,
        total: item.quantity * item.unit_price - item.discount,
        product_id: item.product_id ?? null,
        variant_id: item.variant_id ?? null,
        product_name_snapshot: null as string | null,
        product_sku_snapshot: null as string | null,
        product_unit_snapshot: null as string | null,
      };
      if (item.product_id) {
        const { data: prod } = await supabase
          .from("products")
          .select("name, sku, unit")
          .eq("id", item.product_id)
          .eq("organization_id", orgId)
          .single();
        if (prod) {
          base.product_name_snapshot = prod.name;
          base.product_sku_snapshot = prod.sku;
          base.product_unit_snapshot = prod.unit;
        }
      }
      return base;
    })
  );
  const { error: itemsErr } = await supabase.from("quote_items").insert(itemsWithSnapshots);
  if (itemsErr) throw itemsErr;

  revalidatePath("/dashboard/vendas/orcamentos");
  return { success: true, id: quote.id };
}

export async function updateQuote(id: string, input: UpdateQuoteInput) {
  const parsed = updateQuoteSchema.parse(input);
  const { supabase, orgId } = await getCtx();
  const totals = calcTotals(parsed.items);

  const { error: quoteErr } = await supabase.from("quotes").update({
    customer_id: parsed.customer_id, channel_id: parsed.channel_id ?? null, lead_id: parsed.lead_id ?? null,
    notes: parsed.notes ?? null, valid_until: parsed.valid_until,
    subtotal: totals.subtotal, discount: totals.discount, tax: totals.tax, total: totals.total,
  }).eq("id", id).eq("organization_id", orgId);
  if (quoteErr) throw quoteErr;

  await supabase.from("quote_items").delete().eq("quote_id", id).eq("organization_id", orgId);
  const itemsWithSnapshots = await Promise.all(
    parsed.items.map(async (item) => {
      const base = {
        quote_id: id, organization_id: orgId, description: item.description,
        quantity: item.quantity, unit_price: item.unit_price, discount: item.discount,
        total: item.quantity * item.unit_price - item.discount,
        product_id: item.product_id ?? null,
        variant_id: item.variant_id ?? null,
        product_name_snapshot: null as string | null,
        product_sku_snapshot: null as string | null,
        product_unit_snapshot: null as string | null,
      };
      if (item.product_id) {
        const { data: prod } = await supabase
          .from("products")
          .select("name, sku, unit")
          .eq("id", item.product_id)
          .eq("organization_id", orgId)
          .single();
        if (prod) {
          base.product_name_snapshot = prod.name;
          base.product_sku_snapshot = prod.sku;
          base.product_unit_snapshot = prod.unit;
        }
      }
      return base;
    })
  );
  const { error: itemsErr } = await supabase.from("quote_items").insert(itemsWithSnapshots);
  if (itemsErr) throw itemsErr;

  revalidatePath("/dashboard/vendas/orcamentos");
  revalidatePath(`/dashboard/vendas/orcamentos/${id}`);
  return { success: true };
}

export async function updateQuoteStatus(id: string, input: { status: string; reason?: string }) {
  const parsed = updateQuoteStatusSchema.parse(input);
  const { supabase, orgId } = await getCtx();

  const { data: current } = await supabase.from("quotes").select("status").eq("id", id).eq("organization_id", orgId).single();
  if (!current) throw new Error("Orçamento não encontrado");

  const { error } = await supabase.from("quotes").update({ status: parsed.status }).eq("id", id).eq("organization_id", orgId);
  if (error) throw error;

  revalidatePath("/dashboard/vendas/orcamentos");
  revalidatePath(`/dashboard/vendas/orcamentos/${id}`);
  return { success: true };
}

export async function convertQuoteToOrder(quoteId: string) {
  const { supabase, orgId, user } = await getCtx();

  const { data: quote, error: qErr } = await supabase
    .from("quotes")
    .select("*, items:quote_items(*)")
    .eq("id", quoteId)
    .eq("organization_id", orgId)
    .single();
  if (qErr || !quote) throw new Error("Orçamento não encontrado");

  if (quote.status === "converted") throw new Error("Orçamento já convertido");

  const { data: docNum, error: docErr } = await supabase.rpc("next_document_number", { p_org_id: orgId, p_type: "order" });
  if (docErr) throw docErr;

  // Create order with cleanup on partial failure to prevent orphaned drafts
  let orderId: string | null = null;
  try {
    const { data: order, error: orderErr } = await supabase.from("orders").insert({
      organization_id: orgId, customer_id: quote.customer_id, channel_id: quote.channel_id,
      lead_id: quote.lead_id, document_number: docNum, status: "draft",
      subtotal: quote.subtotal, discount: quote.discount, tax: quote.tax, total: quote.total,
      notes: quote.notes, created_by: user.id,
    }).select("id").single();
    if (orderErr) throw orderErr;
    orderId = order.id;

    const items = (quote.items as Array<{
      description: string; quantity: number; unit_price: number; discount: number;
      product_id?: string | null; variant_id?: string | null;
      product_name_snapshot?: string | null; product_sku_snapshot?: string | null; product_unit_snapshot?: string | null;
    }>).map((item) => ({
      order_id: order.id, organization_id: orgId, description: item.description,
      quantity: item.quantity, unit_price: item.unit_price, discount: item.discount,
      total: item.quantity * item.unit_price - item.discount,
      product_id: item.product_id ?? null,
      variant_id: item.variant_id ?? null,
      product_name_snapshot: item.product_name_snapshot ?? null,
      product_sku_snapshot: item.product_sku_snapshot ?? null,
      product_unit_snapshot: item.product_unit_snapshot ?? null,
    }));
    if (items.length > 0) {
      const { error: itemsErr } = await supabase.from("order_items").insert(items);
      if (itemsErr) throw itemsErr;
    }

    await supabase.from("order_status_history").insert({
      order_id: order.id, organization_id: orgId, from_status: null, to_status: "draft", changed_by: user.id,
    });
  } catch (err) {
    // Cleanup orphaned order on partial failure
    if (orderId) {
      await supabase.from("order_status_history").delete().eq("order_id", orderId).eq("organization_id", orgId);
      await supabase.from("order_items").delete().eq("order_id", orderId).eq("organization_id", orgId);
      await supabase.from("orders").delete().eq("id", orderId).eq("organization_id", orgId);
    }
    throw err;
  }

  // Mark quote as converted
  await supabase.from("quotes").update({
    status: "converted", converted_order_id: orderId, converted_at: new Date().toISOString(),
  }).eq("id", quoteId).eq("organization_id", orgId);

  revalidatePath("/dashboard/vendas/orcamentos");
  revalidatePath("/dashboard/vendas/pedidos");
  return { success: true, orderId };
}

// ============================================================================
// STATS
// ============================================================================
export async function getSalesStats(orgId: string): Promise<SalesStats> {
  const supabase = await createClient();
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

  const { data: allOrders } = await supabase
    .from("orders").select("status, total, issued_at")
    .eq("organization_id", orgId);

  const orders = allOrders ?? [];
  const completed = orders.filter((o) => o.status === "completed");
  const revenueTotal = completed.reduce((sum, o) => sum + Number(o.total), 0);
  const revenueMonth = completed
    .filter((o) => o.issued_at >= monthStart)
    .reduce((sum, o) => sum + Number(o.total), 0);

  return {
    total_orders: orders.length,
    draft_orders: orders.filter((o) => o.status === "draft").length,
    confirmed_orders: orders.filter((o) => o.status === "confirmed" || o.status === "preparing").length,
    completed_orders: completed.length,
    cancelled_orders: orders.filter((o) => o.status === "cancelled").length,
    revenue_total: revenueTotal,
    revenue_month: revenueMonth,
    avg_ticket: completed.length > 0 ? revenueTotal / completed.length : 0,
  };
}

export async function getQuoteStats(orgId: string): Promise<QuoteStats> {
  const supabase = await createClient();
  const { data: allQuotes } = await supabase
    .from("quotes").select("status, total")
    .eq("organization_id", orgId);

  const quotes = allQuotes ?? [];
  const converted = quotes.filter((q) => q.status === "converted").length;
  const totalValue = quotes.reduce((sum, q) => sum + Number(q.total), 0);

  return {
    total_quotes: quotes.length,
    draft_quotes: quotes.filter((q) => q.status === "draft").length,
    sent_quotes: quotes.filter((q) => q.status === "sent").length,
    accepted_quotes: quotes.filter((q) => q.status === "accepted").length,
    rejected_quotes: quotes.filter((q) => q.status === "rejected").length,
    expired_quotes: quotes.filter((q) => q.status === "expired").length,
    converted_quotes: converted,
    total_value: totalValue,
    conversion_rate: quotes.length > 0 ? Math.round((converted / quotes.length) * 100) : 0,
  };
}