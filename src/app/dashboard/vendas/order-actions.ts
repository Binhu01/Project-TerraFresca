"use server";

import { createClient } from "@/lib/supabase/server";
import { getActiveOrganization } from "@/lib/organizations";
import { revalidatePath } from "next/cache";
import type { OrderWithDetails, OrderStatusHistoryEntry } from "@/types/sales";
import {
  createOrderSchema,
  updateOrderSchema,
  updateOrderStatusSchema,
  type CreateOrderInput,
  type UpdateOrderInput,
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

export async function getOrders(params?: { search?: string; status?: string; page?: number; perPage?: number }) {
  const { supabase, orgId } = await getCtx();
  const page = params?.page ?? 1;
  const perPage = params?.perPage ?? 20;
  const from = (page - 1) * perPage;
  const to = from + perPage - 1;

  let query = supabase
    .from("orders")
    .select(`*, customer:customers!inner(id, name, email), channel:sales_channels(id, name), creator:profiles!inner(id, full_name), items:order_items(*)`, { count: "exact" })
    .eq("organization_id", orgId)
    .order("issued_at", { ascending: false })
    .range(from, to);

  if (params?.status && params.status !== "all") query = query.eq("status", params.status);
  if (params?.search) query = query.or(`document_number.ilike.%${params.search}%`);

  const { data, error, count } = await query;
  if (error) throw error;
  return { orders: (data ?? []) as unknown as OrderWithDetails[], total: count ?? 0 };
}

export async function getOrderById(id: string) {
  const { supabase, orgId } = await getCtx();
  const { data, error } = await supabase
    .from("orders")
    .select(`*, customer:customers!inner(id, name, email), channel:sales_channels(id, name), creator:profiles!inner(id, full_name), items:order_items(*)`)
    .eq("id", id).eq("organization_id", orgId).single();
  if (error) { if (error.code === "PGRST116") return null; throw error; }
  return data as unknown as OrderWithDetails;
}

export async function createOrder(input: CreateOrderInput) {
  const parsed = createOrderSchema.parse(input);
  const { supabase, orgId, user } = await getCtx();
  const { data: docNum, error: docErr } = await supabase.rpc("next_document_number", { p_org_id: orgId, p_type: "order" });
  if (docErr) throw docErr;
  const totals = calcTotals(parsed.items);

  const { data: order, error: orderErr } = await supabase.from("orders").insert({
    organization_id: orgId, customer_id: parsed.customer_id, channel_id: parsed.channel_id ?? null,
    lead_id: parsed.lead_id ?? null, document_number: docNum, status: "draft",
    subtotal: totals.subtotal, discount: totals.discount, tax: totals.tax, total: totals.total,
    notes: parsed.notes ?? null, created_by: user.id,
  }).select("id").single();
  if (orderErr) throw orderErr;

  // Build items with optional product linkage and snapshots
  const itemsWithSnapshots = await Promise.all(
    parsed.items.map(async (item) => {
      const base = {
        order_id: order.id, organization_id: orgId, description: item.description,
        quantity: item.quantity, unit_price: item.unit_price, discount: item.discount,
        total: item.quantity * item.unit_price - item.discount,
        product_id: item.product_id ?? null,
        variant_id: item.variant_id ?? null,
        product_name_snapshot: null as string | null,
        product_sku_snapshot: null as string | null,
        product_unit_snapshot: null as string | null,
        cost_price_snapshot: null as number | null,
      };
      if (item.product_id) {
        const { data: prod } = await supabase
          .from("products")
          .select("name, sku, unit, cost_price")
          .eq("id", item.product_id)
          .eq("organization_id", orgId)
          .single();
        if (prod) {
          base.product_name_snapshot = prod.name;
          base.product_sku_snapshot = prod.sku;
          base.product_unit_snapshot = prod.unit;
          base.cost_price_snapshot = prod.cost_price ? Number(prod.cost_price) : null;
        }
      }
      // Override cost with variant price if available
      if (item.variant_id) {
        const { data: variant } = await supabase
          .from("product_variants")
          .select("cost_price_override")
          .eq("id", item.variant_id)
          .eq("organization_id", orgId)
          .maybeSingle();
        if (variant?.cost_price_override) {
          base.cost_price_snapshot = Number(variant.cost_price_override);
        }
      }
      return base;
    })
  );
  const { error: itemsErr } = await supabase.from("order_items").insert(itemsWithSnapshots);
  if (itemsErr) throw itemsErr;

  await supabase.from("order_status_history").insert({
    order_id: order.id, organization_id: orgId, from_status: null, to_status: "draft", changed_by: user.id,
  });

  revalidatePath("/dashboard/vendas/pedidos");
  return { success: true, id: order.id };
}

export async function updateOrder(id: string, input: UpdateOrderInput) {
  const parsed = updateOrderSchema.parse(input);
  const { supabase, orgId } = await getCtx();

  // Block editing non-draft orders to prevent inventory inconsistency
  const { data: currentOrder } = await supabase
    .from("orders")
    .select("status")
    .eq("id", id)
    .eq("organization_id", orgId)
    .single();
  if (!currentOrder) throw new Error("Pedido não encontrado");
  if (currentOrder.status !== "draft") {
    throw new Error("Apenas pedidos em rascunho podem ser editados. Cancele ou duplique o pedido para alterar itens.");
  }

  const totals = calcTotals(parsed.items);

  const { error: orderErr } = await supabase.from("orders").update({
    customer_id: parsed.customer_id, channel_id: parsed.channel_id ?? null, lead_id: parsed.lead_id ?? null,
    notes: parsed.notes ?? null, subtotal: totals.subtotal, discount: totals.discount, tax: totals.tax, total: totals.total,
  }).eq("id", id).eq("organization_id", orgId);
  if (orderErr) throw orderErr;

  await supabase.from("order_items").delete().eq("order_id", id).eq("organization_id", orgId);
  const itemsWithSnapshots = await Promise.all(
    parsed.items.map(async (item) => {
      const base = {
        order_id: id, organization_id: orgId, description: item.description,
        quantity: item.quantity, unit_price: item.unit_price, discount: item.discount,
        total: item.quantity * item.unit_price - item.discount,
        product_id: item.product_id ?? null,
        variant_id: item.variant_id ?? null,
        product_name_snapshot: null as string | null,
        product_sku_snapshot: null as string | null,
        product_unit_snapshot: null as string | null,
        cost_price_snapshot: null as number | null,
      };
      if (item.product_id) {
        const { data: prod } = await supabase
          .from("products")
          .select("name, sku, unit, cost_price")
          .eq("id", item.product_id)
          .eq("organization_id", orgId)
          .single();
        if (prod) {
          base.product_name_snapshot = prod.name;
          base.product_sku_snapshot = prod.sku;
          base.product_unit_snapshot = prod.unit;
          base.cost_price_snapshot = prod.cost_price ? Number(prod.cost_price) : null;
        }
      }
      if (item.variant_id) {
        const { data: variant } = await supabase
          .from("product_variants")
          .select("cost_price_override")
          .eq("id", item.variant_id)
          .eq("organization_id", orgId)
          .maybeSingle();
        if (variant?.cost_price_override) {
          base.cost_price_snapshot = Number(variant.cost_price_override);
        }
      }
      return base;
    })
  );
  const { error: itemsErr } = await supabase.from("order_items").insert(itemsWithSnapshots);
  if (itemsErr) throw itemsErr;

  revalidatePath("/dashboard/vendas/pedidos");
  revalidatePath(`/dashboard/vendas/pedidos/${id}`);
  return { success: true };
}

export async function updateOrderStatus(id: string, input: { status: string; reason?: string }) {
  const parsed = updateOrderStatusSchema.parse(input);
  const { supabase, orgId, user } = await getCtx();

  const { data: current } = await supabase.from("orders").select("status").eq("id", id).eq("organization_id", orgId).single();
  if (!current) throw new Error("Pedido não encontrado");

  // Inventory integration: reserve on confirm, consume on complete, release on cancel
  if (parsed.status === "confirmed" && current.status !== "confirmed") {
    // Gather items with product_id for reservation
    const { data: orderItems } = await supabase
      .from("order_items")
      .select("id, product_id, variant_id, quantity")
      .eq("order_id", id)
      .eq("organization_id", orgId)
      .not("product_id", "is", null);

    if (orderItems && orderItems.length > 0) {
      // Get default warehouse
      const { data: defaultWh } = await supabase
        .from("warehouses")
        .select("id")
        .eq("organization_id", orgId)
        .eq("is_default", true)
        .maybeSingle();

      if (!defaultWh) {
        throw new Error("Nenhum depósito padrão configurado. Configure um depósito padrão antes de confirmar pedidos com produtos de estoque.");
      }

      {
        const itemsForReservation = orderItems.map((item) => ({
          order_item_id: item.id,
          warehouse_id: defaultWh.id,
          product_id: item.product_id,
          variant_id: item.variant_id,
          quantity: item.quantity,
        }));

        const { error: reserveErr } = await supabase.rpc("reserve_stock", {
          p_org_id: orgId,
          p_order_id: id,
          p_items: itemsForReservation,
        });
        if (reserveErr) throw new Error(`Falha ao reservar estoque: ${reserveErr.message}`);
      }
    }
  } else if (parsed.status === "completed" && current.status !== "completed") {
    const { error: consumeErr } = await supabase.rpc("consume_reservations", {
      p_org_id: orgId,
      p_order_id: id,
    });
    if (consumeErr) throw new Error(`Falha ao consumir estoque: ${consumeErr.message}`);
  } else if (parsed.status === "cancelled" && current.status !== "cancelled") {
    const { error: releaseErr } = await supabase.rpc("release_reservations", {
      p_org_id: orgId,
      p_order_id: id,
    });
    if (releaseErr) throw new Error(`Falha ao liberar estoque: ${releaseErr.message}`);
  }

  const updateData: Record<string, unknown> = { status: parsed.status };
  if (parsed.status === "completed") updateData.completed_at = new Date().toISOString();
  if (parsed.status === "cancelled") updateData.cancelled_at = new Date().toISOString();

  const { error } = await supabase.from("orders").update(updateData).eq("id", id).eq("organization_id", orgId);
  if (error) throw error;

  await supabase.from("order_status_history").insert({
    order_id: id, organization_id: orgId, from_status: current.status, to_status: parsed.status,
    reason: parsed.reason ?? null, changed_by: user.id,
  });

  revalidatePath("/dashboard/vendas/pedidos");
  revalidatePath(`/dashboard/vendas/pedidos/${id}`);
  revalidatePath("/dashboard/estoque");
  return { success: true };
}

export async function getOrderStatusHistory(orderId: string): Promise<OrderStatusHistoryEntry[]> {
  const { supabase, orgId } = await getCtx();
  const { data, error } = await supabase.from("order_status_history")
    .select("*").eq("order_id", orderId).eq("organization_id", orgId).order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as OrderStatusHistoryEntry[];
}