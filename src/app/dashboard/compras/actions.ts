"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import type {
  Supplier,
  SupplierAddress,
  SupplierContact,
  SupplierProduct,
  PurchaseOrder,
  PurchaseOrderItem,
  PurchaseOrderWithItems,
  GoodsReceipt,
  GoodsReceiptWithItems,
  PurchasesDashboardStats,
  PurchasesBySupplier,
  PurchasesByPeriod,
  MostPurchasedProducts,
} from "@/types/purchases";

// ============================================================================
// CONTEXT HELPER
// ============================================================================

async function getCtx() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Não autenticado");

  const { data: membership } = await supabase
    .from("memberships")
    .select("organization_id")
    .eq("user_id", user.id)
    .eq("status", "active")
    .single();
  if (!membership) throw new Error("Organização não encontrada");

  return { supabase, user, orgId: membership.organization_id };
}

function reval() {
  revalidatePath("/dashboard/compras");
  revalidatePath("/dashboard/compras/fornecedores");
  revalidatePath("/dashboard/compras/ordens");
  revalidatePath("/dashboard/compras/recebimentos");
  revalidatePath("/dashboard/estoque");
  revalidatePath("/dashboard/financeiro");
}

// ============================================================================
// ZOD SCHEMAS
// ============================================================================

const createSupplierSchema = z.object({
  supplier_type: z.enum(["individual", "company"]),
  legal_name: z.string().min(1, "Nome é obrigatório").max(200),
  trade_name: z.string().max(200).optional().nullable(),
  document: z.string().max(20).optional().nullable(),
  state_registration: z.string().max(30).optional().nullable(),
  email: z.string().email().max(200).optional().nullable().or(z.literal("")),
  phone: z.string().max(30).optional().nullable(),
  whatsapp: z.string().max(30).optional().nullable(),
  website: z.string().url().max(500).optional().nullable().or(z.literal("")),
  category: z.string().max(100).optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
});

const updateSupplierSchema = createSupplierSchema.partial().extend({
  status: z.enum(["active", "inactive"]).optional(),
});

const supplierAddressSchema = z.object({
  address_type: z.enum(["main", "billing", "shipping", "other"]).default("main"),
  postal_code: z.string().max(10).optional().nullable(),
  street: z.string().max(200).optional().nullable(),
  number: z.string().max(20).optional().nullable(),
  complement: z.string().max(100).optional().nullable(),
  neighborhood: z.string().max(100).optional().nullable(),
  city: z.string().max(100).optional().nullable(),
  state: z.string().max(5).optional().nullable(),
  country: z.string().max(5).default("BR"),
});

const supplierContactSchema = z.object({
  name: z.string().min(1, "Nome do contato é obrigatório").max(200),
  job_title: z.string().max(100).optional().nullable(),
  email: z.string().email().max(200).optional().nullable().or(z.literal("")),
  phone: z.string().max(30).optional().nullable(),
  whatsapp: z.string().max(30).optional().nullable(),
  notes: z.string().max(1000).optional().nullable(),
});

const supplierProductSchema = z.object({
  product_id: z.string().uuid("Produto inválido"),
  variant_id: z.string().uuid().optional().nullable(),
  supplier_product_code: z.string().max(100).optional().nullable(),
  purchase_price: z.number().min(0).optional().nullable(),
  lead_time_days: z.number().int().min(0).optional().nullable(),
  minimum_order_quantity: z.number().min(0).optional().nullable(),
  notes: z.string().max(1000).optional().nullable(),
});

const purchaseOrderItemSchema = z.object({
  product_id: z.string().uuid("Produto inválido"),
  variant_id: z.string().uuid().optional().nullable(),
  quantity: z.number().positive("Quantidade deve ser maior que zero"),
  unit_price: z.number().min(0, "Preço não pode ser negativo"),
  discount: z.number().min(0).default(0),
  notes: z.string().max(500).optional().nullable(),
});

const createPurchaseOrderSchema = z.object({
  supplier_id: z.string().uuid("Fornecedor inválido"),
  issue_date: z.string().min(1, "Data de emissão é obrigatória"),
  expected_delivery_date: z.string().optional().nullable(),
  destination_warehouse_id: z.string().uuid().optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
  commercial_terms: z.string().max(2000).optional().nullable(),
  freight_amount: z.number().min(0).default(0),
  additional_costs: z.number().min(0).default(0),
  items: z.array(purchaseOrderItemSchema).min(1, "Adicione pelo menos um item"),
});

const confirmReceiptSchema = z.object({
  purchase_order_id: z.string().uuid("Ordem de compra inválida"),
  warehouse_id: z.string().uuid("Depósito inválido"),
  received_at: z.string().min(1, "Data de recebimento é obrigatória"),
  notes: z.string().max(2000).optional().nullable(),
  items: z.array(z.object({
    purchase_order_item_id: z.string().uuid(),
    quantity_received: z.number().positive("Quantidade deve ser maior que zero"),
    quantity_accepted: z.number().min(0),
    quantity_rejected: z.number().min(0),
    rejection_reason: z.string().max(500).optional().nullable(),
  })).min(1, "Adicione pelo menos um item recebido"),
});

const generatePayableFromPurchaseSchema = z.object({
  purchase_order_id: z.string().uuid(),
  amount: z.number().positive("Valor deve ser maior que zero"),
  due_date: z.string().min(1),
  category_id: z.string().uuid().optional().nullable(),
  installments: z.number().int().min(1).max(48).default(1),
  interval_days: z.number().int().min(1).max(365).default(30),
});

const updateProductCostSchema = z.object({
  product_id: z.string().uuid(),
  variant_id: z.string().uuid().optional().nullable(),
  new_cost: z.number().min(0),
  purchase_order_id: z.string().uuid(),
});

// ============================================================================
// SUPPLIERS CRUD
// ============================================================================

export async function getSuppliers(filters?: {
  search?: string;
  status?: string;
  category?: string;
  page?: number;
  perPage?: number;
}) {
  const { supabase, orgId } = await getCtx();
  const page = filters?.page ?? 1;
  const perPage = filters?.perPage ?? 20;

  let query = supabase
    .from("suppliers")
    .select("*", { count: "exact" })
    .eq("organization_id", orgId)
    .is("archived_at", null)
    .order("legal_name", { ascending: true });

  if (filters?.search) {
    // Escape PostgREST special characters to prevent SQL injection via .or() filter
    const escaped = filters.search.replace(/([%_,()])/g, "\\$1");
    query = query.or(`legal_name.ilike.%${escaped}%,document.ilike.%${escaped}%,email.ilike.%${escaped}%`);
  }
  if (filters?.status) {
    query = query.eq("status", filters.status);
  }
  if (filters?.category) {
    query = query.eq("category", filters.category);
  }

  query = query.range((page - 1) * perPage, page * perPage - 1);

  const { data, error, count } = await query;
  if (error) throw error;

  return { suppliers: (data ?? []) as Supplier[], total: count ?? 0, page, perPage };
}

export async function getSupplierById(id: string) {
  const { supabase, orgId } = await getCtx();

  const { data, error } = await supabase
    .from("suppliers")
    .select("*")
    .eq("id", id)
    .eq("organization_id", orgId)
    .single();
  if (error) throw error;

  // Fetch related data
  const [addresses, contacts, products] = await Promise.all([
    supabase.from("supplier_addresses").select("*").eq("supplier_id", id).eq("organization_id", orgId).order("address_type"),
    supabase.from("supplier_contacts").select("*").eq("supplier_id", id).eq("organization_id", orgId).order("name"),
    supabase
      .from("supplier_products")
      .select("*, products(name, sku), product_variants(name, sku)")
      .eq("supplier_id", id)
      .eq("organization_id", orgId)
      .eq("is_active", true),
  ]);

  return {
    ...(data as Supplier),
    addresses: (addresses.data ?? []) as SupplierAddress[],
    contacts: (contacts.data ?? []) as SupplierContact[],
    products: (products.data ?? []) as SupplierProduct[],
  };
}

export async function createSupplier(input: unknown) {
  const parsed = createSupplierSchema.parse(input);
  const { supabase, orgId, user } = await getCtx();

  const { data, error } = await supabase
    .from("suppliers")
    .insert({ ...parsed, organization_id: orgId })
    .select("id")
    .single();
  if (error) throw error;

  await supabase.rpc("log_audit", {
    p_org_id: orgId, p_actor: user.id, p_action: "supplier_created",
    p_module: "suppliers", p_resource_type: "supplier", p_resource_id: data.id,
  });
  reval();
  return { success: true, id: data.id };
}

export async function updateSupplier(id: string, input: unknown) {
  const parsed = updateSupplierSchema.parse(input);
  const { supabase, orgId, user } = await getCtx();

  const { error } = await supabase
    .from("suppliers")
    .update(parsed)
    .eq("id", id)
    .eq("organization_id", orgId);
  if (error) throw error;

  await supabase.rpc("log_audit", {
    p_org_id: orgId, p_actor: user.id, p_action: "supplier_updated",
    p_module: "suppliers", p_resource_type: "supplier", p_resource_id: id,
  });
  reval();
  return { success: true };
}

export async function archiveSupplier(id: string) {
  const { supabase, orgId, user } = await getCtx();

  // Check for existing purchase orders
  const { count } = await supabase
    .from("purchase_orders")
    .select("id", { count: "exact", head: true })
    .eq("supplier_id", id)
    .eq("organization_id", orgId);

  if ((count ?? 0) > 0) {
    // Archive instead of delete — preserve history
    const { error } = await supabase
      .from("suppliers")
      .update({ archived_at: new Date().toISOString(), status: "inactive" })
      .eq("id", id)
      .eq("organization_id", orgId);
    if (error) throw error;
  } else {
    const { error } = await supabase
      .from("suppliers")
      .update({ archived_at: new Date().toISOString(), status: "inactive" })
      .eq("id", id)
      .eq("organization_id", orgId);
    if (error) throw error;
  }

  await supabase.rpc("log_audit", {
    p_org_id: orgId, p_actor: user.id, p_action: "supplier_archived",
    p_module: "suppliers", p_resource_type: "supplier", p_resource_id: id,
  });
  reval();
  return { success: true };
}

// ============================================================================
// SUPPLIER ADDRESSES & CONTACTS
// ============================================================================

export async function addSupplierAddress(supplierId: string, input: unknown) {
  const parsed = supplierAddressSchema.parse(input);
  const { supabase, orgId } = await getCtx();

  // Validate supplier belongs to this organization (BUG-03 fix)
  const { data: supplier } = await supabase
    .from("suppliers")
    .select("id")
    .eq("id", supplierId)
    .eq("organization_id", orgId)
    .single();
  if (!supplier) throw new Error("Fornecedor não encontrado nesta organização");

  const { error } = await supabase
    .from("supplier_addresses")
    .insert({ ...parsed, supplier_id: supplierId, organization_id: orgId });
  if (error) throw error;

  reval();
  return { success: true };
}

export async function deleteSupplierAddress(addressId: string) {
  const { supabase, orgId } = await getCtx();
  const { error } = await supabase
    .from("supplier_addresses")
    .delete()
    .eq("id", addressId)
    .eq("organization_id", orgId);
  if (error) throw error;
  reval();
  return { success: true };
}

export async function addSupplierContact(supplierId: string, input: unknown) {
  const parsed = supplierContactSchema.parse(input);
  const { supabase, orgId } = await getCtx();

  // Validate supplier belongs to this organization (BUG-03 fix)
  const { data: supplier } = await supabase
    .from("suppliers")
    .select("id")
    .eq("id", supplierId)
    .eq("organization_id", orgId)
    .single();
  if (!supplier) throw new Error("Fornecedor não encontrado nesta organização");

  const { error } = await supabase
    .from("supplier_contacts")
    .insert({ ...parsed, supplier_id: supplierId, organization_id: orgId });
  if (error) throw error;

  reval();
  return { success: true };
}

export async function deleteSupplierContact(contactId: string) {
  const { supabase, orgId } = await getCtx();
  const { error } = await supabase
    .from("supplier_contacts")
    .delete()
    .eq("id", contactId)
    .eq("organization_id", orgId);
  if (error) throw error;
  reval();
  return { success: true };
}

// ============================================================================
// SUPPLIER PRODUCTS
// ============================================================================

export async function linkSupplierProduct(supplierId: string, input: unknown) {
  const parsed = supplierProductSchema.parse(input);
  const { supabase, orgId } = await getCtx();

  const { error } = await supabase
    .from("supplier_products")
    .upsert({
      ...parsed,
      supplier_id: supplierId,
      organization_id: orgId,
    }, { onConflict: "organization_id,supplier_id,product_id,COALESCE(variant_id,'00000000-0000-0000-0000-000000000000')" });
  if (error) throw error;

  reval();
  return { success: true };
}

export async function unlinkSupplierProduct(id: string) {
  const { supabase, orgId } = await getCtx();
  const { error } = await supabase
    .from("supplier_products")
    .update({ is_active: false })
    .eq("id", id)
    .eq("organization_id", orgId);
  if (error) throw error;
  reval();
  return { success: true };
}

// ============================================================================
// PURCHASE ORDERS
// ============================================================================

export async function getPurchaseOrders(filters?: {
  status?: string;
  supplier_id?: string;
  search?: string;
  page?: number;
  perPage?: number;
}) {
  const { supabase, orgId } = await getCtx();
  const page = filters?.page ?? 1;
  const perPage = filters?.perPage ?? 20;

  let query = supabase
    .from("purchase_orders")
    .select("*, suppliers(legal_name), warehouses(name), profiles(full_name)", { count: "exact" })
    .eq("organization_id", orgId)
    .order("issue_date", { ascending: false });

  if (filters?.status) query = query.eq("status", filters.status);
  if (filters?.supplier_id) query = query.eq("supplier_id", filters.supplier_id);
  if (filters?.search) query = query.ilike("purchase_number", `%${filters.search}%`);

  query = query.range((page - 1) * perPage, page * perPage - 1);

  const { data, error, count } = await query;
  if (error) throw error;

  const orders = (data ?? []).map((row: any) => ({
    ...row,
    supplier_name: Array.isArray(row.suppliers) ? row.suppliers[0]?.legal_name : row.suppliers?.legal_name,
    warehouse_name: Array.isArray(row.warehouses) ? row.warehouses[0]?.name : row.warehouses?.name,
    creator_name: Array.isArray(row.profiles) ? row.profiles[0]?.full_name : row.profiles?.full_name,
  })) as PurchaseOrder[];

  return { orders, total: count ?? 0, page, perPage };
}

export async function getPurchaseOrderById(id: string): Promise<PurchaseOrderWithItems> {
  const { supabase, orgId } = await getCtx();

  const { data, error } = await supabase
    .from("purchase_orders")
    .select("*, suppliers(legal_name), warehouses(name), profiles(full_name)")
    .eq("id", id)
    .eq("organization_id", orgId)
    .single();
  if (error) throw error;

  const { data: items } = await supabase
    .from("purchase_order_items")
    .select("*")
    .eq("purchase_order_id", id)
    .eq("organization_id", orgId)
    .order("created_at");

  const po = data as any;
  return {
    ...po,
    supplier_name: Array.isArray(po.suppliers) ? po.suppliers[0]?.legal_name : po.suppliers?.legal_name,
    warehouse_name: Array.isArray(po.warehouses) ? po.warehouses[0]?.name : po.warehouses?.name,
    creator_name: Array.isArray(po.profiles) ? po.profiles[0]?.full_name : po.profiles?.full_name,
    items: (items ?? []) as PurchaseOrderItem[],
  };
}

export async function createPurchaseOrder(input: unknown) {
  const parsed = createPurchaseOrderSchema.parse(input);
  const { supabase, orgId, user } = await getCtx();

  // Get next purchase number atomically
  const { data: numResult, error: numError } = await supabase.rpc("next_purchase_number", { p_org_id: orgId });
  if (numError) throw numError;

  // Fetch product snapshots
  const productIds = [...new Set(parsed.items.map((i) => i.product_id))];
  const { data: products } = await supabase
    .from("products")
    .select("id, name, sku, unit")
    .in("id", productIds)
    .eq("organization_id", orgId);

  const productMap = new Map((products ?? []).map((p: any) => [p.id, p]));

  // Calculate totals
  let subtotal = 0;
  let discountTotal = 0;
  const itemsWithSnapshots = parsed.items.map((item) => {
    const prod = productMap.get(item.product_id);
    const lineDiscount = item.discount ?? 0;
    const lineTotal = item.quantity * item.unit_price - lineDiscount;
    subtotal += item.quantity * item.unit_price;
    discountTotal += lineDiscount;

    return {
      ...item,
      organization_id: orgId,
      product_name_snapshot: prod?.name ?? "Produto desconhecido",
      sku_snapshot: prod?.sku ?? null,
      unit_snapshot: prod?.unit ?? "un",
      discount: lineDiscount,
      line_total: Math.max(0, lineTotal),
    };
  });

  const totalAmount = subtotal - discountTotal + parsed.freight_amount + parsed.additional_costs;

  // Insert PO header
  const { data: po, error: poError } = await supabase
    .from("purchase_orders")
    .insert({
      organization_id: orgId,
      purchase_number: numResult,
      supplier_id: parsed.supplier_id,
      issue_date: parsed.issue_date,
      expected_delivery_date: parsed.expected_delivery_date ?? null,
      destination_warehouse_id: parsed.destination_warehouse_id ?? null,
      subtotal,
      discount_total: discountTotal,
      freight_amount: parsed.freight_amount,
      additional_costs: parsed.additional_costs,
      total_amount: totalAmount,
      notes: parsed.notes ?? null,
      commercial_terms: parsed.commercial_terms ?? null,
      created_by: user.id,
      status: "draft",
    })
    .select("id")
    .single();
  if (poError) throw poError;

  // Insert items
  const { error: itemsError } = await supabase
    .from("purchase_order_items")
    .insert(itemsWithSnapshots.map((item) => ({
      ...item,
      purchase_order_id: po.id,
      quantity_ordered: item.quantity,
    })));
  if (itemsError) throw itemsError;

  await supabase.rpc("log_audit", {
    p_org_id: orgId, p_actor: user.id, p_action: "purchase_order_created",
    p_module: "purchases", p_resource_type: "purchase_order", p_resource_id: po.id,
  });
  reval();
  return { success: true, id: po.id, purchase_number: numResult };
}

export async function approvePurchaseOrder(id: string) {
  const { supabase, orgId, user } = await getCtx();

  // Atomic update: only succeeds if status is still 'draft' (prevents TOCTOU race)
  const { error, count } = await supabase
    .from("purchase_orders")
    .update({ status: "approved", approved_by: user.id, approved_at: new Date().toISOString() })
    .eq("id", id)
    .eq("organization_id", orgId)
    .eq("status", "draft");
  if (error) throw error;
  if (!count || count === 0) throw new Error("Apenas rascunhos podem ser aprovados");

  await supabase.rpc("log_audit", {
    p_org_id: orgId, p_actor: user.id, p_action: "purchase_order_approved",
    p_module: "purchases", p_resource_type: "purchase_order", p_resource_id: id,
  });
  reval();
  return { success: true };
}

export async function sendPurchaseOrder(id: string) {
  const { supabase, orgId, user } = await getCtx();

  // Atomic update: only succeeds if status is 'approved' or 'draft' (prevents TOCTOU race)
  // Note: auto-approving drafts on send is intentional per business rule
  const now = new Date().toISOString();
  const { error, count } = await supabase
    .from("purchase_orders")
    .update({
      status: "sent",
      sent_at: now,
      approved_by: user.id,
      approved_at: now,
    })
    .eq("id", id)
    .eq("organization_id", orgId)
    .in("status", ["approved", "draft"]);
  if (error) throw error;
  if (!count || count === 0) {
    throw new Error("Apenas ordens aprovadas ou em rascunho podem ser marcadas como enviadas");
  }

  await supabase.rpc("log_audit", {
    p_org_id: orgId, p_actor: user.id, p_action: "purchase_order_sent",
    p_module: "purchases", p_resource_type: "purchase_order", p_resource_id: id,
  });
  reval();
  return { success: true };
}

export async function cancelPurchaseOrder(id: string, reason?: string) {
  const { supabase, orgId, user } = await getCtx();

  // Read current state for audit metadata and to determine cancellation type
  const { data: po } = await supabase
    .from("purchase_orders")
    .select("status")
    .eq("id", id)
    .eq("organization_id", orgId)
    .single();

  if (!po) throw new Error("Ordem não encontrada");
  if (["received", "cancelled"].includes(po.status)) {
    throw new Error("Ordens recebidas ou já canceladas não podem ser canceladas novamente");
  }

  // Check if partially received
  const { data: items } = await supabase
    .from("purchase_order_items")
    .select("quantity_received")
    .eq("purchase_order_id", id)
    .eq("organization_id", orgId);

  const hasReceived = (items ?? []).some((i: any) => Number(i.quantity_received) > 0);
  const newStatus = hasReceived ? "partially_cancelled" : "cancelled";

  // Atomic update: only succeeds if status hasn't changed since our read (prevents TOCTOU race)
  const { error, count } = await supabase
    .from("purchase_orders")
    .update({ status: newStatus })
    .eq("id", id)
    .eq("organization_id", orgId)
    .eq("status", po.status);
  if (error) throw error;
  if (!count || count === 0) {
    throw new Error("A ordem foi modificada por outra operação. Tente novamente.");
  }

  await supabase.rpc("log_audit", {
    p_org_id: orgId, p_actor: user.id, p_action: "purchase_order_cancelled",
    p_module: "purchases", p_resource_type: "purchase_order", p_resource_id: id,
    p_metadata: { reason, previous_status: po.status },
  });
  reval();
  return { success: true, newStatus };
}

// ============================================================================
// GOODS RECEIPTS
// ============================================================================

export async function confirmGoodsReceipt(input: unknown) {
  const parsed = confirmReceiptSchema.parse(input);
  const { supabase, orgId, user } = await getCtx();

  // Validate PO exists and is in a receivable state
  const { data: po } = await supabase
    .from("purchase_orders")
    .select("status")
    .eq("id", parsed.purchase_order_id)
    .eq("organization_id", orgId)
    .single();

  if (!po) throw new Error("Ordem de compra não encontrada");
  if (!["approved", "sent", "partially_received"].includes(po.status)) {
    throw new Error(`Não é possível receber mercadorias de uma ordem com status "${po.status}"`);
  }

  // Validate each item against pending quantities
  for (const item of parsed.items) {
    const { data: poItem } = await supabase
      .from("purchase_order_items")
      .select("quantity_ordered, quantity_received, quantity_cancelled")
      .eq("id", item.purchase_order_item_id)
      .eq("organization_id", orgId)
      .single();

    if (!poItem) throw new Error(`Item da ordem não encontrado: ${item.purchase_order_item_id}`);

    const pending = Number(poItem.quantity_ordered) - Number(poItem.quantity_received) - Number(poItem.quantity_cancelled);
    if (item.quantity_received > pending) {
      throw new Error(`Quantidade recebida (${item.quantity_received}) excede pendente (${pending}) para este item`);
    }

    if (item.quantity_accepted + item.quantity_rejected !== item.quantity_received) {
      throw new Error("Aceitos + rejeitados deve ser igual à quantidade recebida");
    }
  }

  // Generate receipt number
  const { data: receiptNum, error: numErr } = await supabase.rpc("next_receipt_number", { p_org_id: orgId });
  if (numErr) throw numErr;

  // Insert goods receipt
  const { data: receipt, error: receiptErr } = await supabase
    .from("goods_receipts")
    .insert({
      organization_id: orgId,
      purchase_order_id: parsed.purchase_order_id,
      warehouse_id: parsed.warehouse_id,
      receipt_number: receiptNum,
      received_at: parsed.received_at,
      status: parsed.items.some((i) => i.quantity_rejected > 0) ? "with_discrepancies" : "confirmed",
      notes: parsed.notes ?? null,
      received_by: user.id,
    })
    .select("id")
    .single();
  if (receiptErr) throw receiptErr;

  // Insert receipt items
  const { error: itemsErr } = await supabase
    .from("goods_receipt_items")
    .insert(parsed.items.map((item) => ({
      organization_id: orgId,
      goods_receipt_id: receipt.id,
      purchase_order_item_id: item.purchase_order_item_id,
      product_id: "", // Will be filled by the RPC or we need to look it up
      variant_id: null,
      quantity_received: item.quantity_received,
      quantity_accepted: item.quantity_accepted,
      quantity_rejected: item.quantity_rejected,
      rejection_reason: item.rejection_reason ?? null,
    })));

  // We need product_id for each receipt item — fetch from PO items
  const poItemIds = parsed.items.map((i) => i.purchase_order_item_id);
  const { data: poItems } = await supabase
    .from("purchase_order_items")
    .select("id, product_id, variant_id")
    .in("id", poItemIds)
    .eq("organization_id", orgId);

  const poItemMap = new Map((poItems ?? []).map((p: any) => [p.id, p]));

  // Update receipt items with correct product_id and variant_id
  for (const item of parsed.items) {
    const poItem = poItemMap.get(item.purchase_order_item_id);
    if (poItem) {
      await supabase
        .from("goods_receipt_items")
        .update({ product_id: poItem.product_id, variant_id: poItem.variant_id })
        .eq("goods_receipt_id", receipt.id)
        .eq("purchase_order_item_id", item.purchase_order_item_id);
    }
  }

  if (itemsErr) throw itemsErr;

  // Call the atomic RPC to update PO items, PO status, and create inventory movements
  const { error: rpcErr } = await supabase.rpc("confirm_goods_receipt", {
    p_org_id: orgId,
    p_receipt_id: receipt.id,
    p_user_id: user.id,
  });
  if (rpcErr) throw rpcErr;

  await supabase.rpc("log_audit", {
    p_org_id: orgId, p_actor: user.id, p_action: "goods_receipt_confirmed",
    p_module: "purchases", p_resource_type: "goods_receipt", p_resource_id: receipt.id,
  });
  reval();
  return { success: true, id: receipt.id, receipt_number: receiptNum };
}

export async function getGoodsReceipts(filters?: {
  purchase_order_id?: string;
  page?: number;
  perPage?: number;
}) {
  const { supabase, orgId } = await getCtx();
  const page = filters?.page ?? 1;
  const perPage = filters?.perPage ?? 20;

  let query = supabase
    .from("goods_receipts")
    .select("*, purchase_orders(purchase_number), warehouses(name), profiles(full_name)", { count: "exact" })
    .eq("organization_id", orgId)
    .order("received_at", { ascending: false });

  if (filters?.purchase_order_id) query = query.eq("purchase_order_id", filters.purchase_order_id);
  query = query.range((page - 1) * perPage, page * perPage - 1);

  const { data, error, count } = await query;
  if (error) throw error;

  const receipts = (data ?? []).map((row: any) => ({
    ...row,
    purchase_number: Array.isArray(row.purchase_orders) ? row.purchase_orders[0]?.purchase_number : row.purchase_orders?.purchase_number,
    warehouse_name: Array.isArray(row.warehouses) ? row.warehouses[0]?.name : row.warehouses?.name,
    receiver_name: Array.isArray(row.profiles) ? row.profiles[0]?.full_name : row.profiles?.full_name,
  })) as GoodsReceipt[];

  return { receipts, total: count ?? 0, page, perPage };
}

export async function getGoodsReceiptById(id: string): Promise<GoodsReceiptWithItems> {
  const { supabase, orgId } = await getCtx();

  const { data, error } = await supabase
    .from("goods_receipts")
    .select("*, purchase_orders(purchase_number), warehouses(name), profiles(full_name)")
    .eq("id", id)
    .eq("organization_id", orgId)
    .single();
  if (error) throw error;

  const { data: items } = await supabase
    .from("goods_receipt_items")
    .select("*, purchase_order_items(quantity_ordered, quantity_received, product_name_snapshot)")
    .eq("goods_receipt_id", id)
    .eq("organization_id", orgId);

  const gr = data as any;
  return {
    ...gr,
    purchase_number: Array.isArray(gr.purchase_orders) ? gr.purchase_orders[0]?.purchase_number : gr.purchase_orders?.purchase_number,
    warehouse_name: Array.isArray(gr.warehouses) ? gr.warehouses[0]?.name : gr.warehouses?.name,
    receiver_name: Array.isArray(gr.profiles) ? gr.profiles[0]?.full_name : gr.profiles?.full_name,
    items: (items ?? []).map((item: any) => {
      const poi = Array.isArray(item.purchase_order_items) ? item.purchase_order_items[0] : item.purchase_order_items;
      return {
        ...item,
        quantity_ordered: poi?.quantity_ordered,
        quantity_previously_received: poi ? Number(poi.quantity_received) - Number(item.quantity_received) : undefined,
        quantity_pending: poi ? Number(poi.quantity_ordered) - Number(poi.quantity_received) : undefined,
      };
    }),
  };
}

// ============================================================================
// FINANCIAL INTEGRATION
// ============================================================================

export async function generatePayableFromPurchase(input: unknown) {
  const parsed = generatePayableFromPurchaseSchema.parse(input);
  const { supabase, orgId, user } = await getCtx();

  // Get PO and supplier info
  const { data: po } = await supabase
    .from("purchase_orders")
    .select("total_amount, suppliers(legal_name)")
    .eq("id", parsed.purchase_order_id)
    .eq("organization_id", orgId)
    .single();
  if (!po) throw new Error("Ordem de compra não encontrada");

  const supplierName = Array.isArray(po.suppliers) ? po.suppliers[0]?.legal_name : (po.suppliers as any)?.legal_name ?? "Fornecedor";

  // Check existing linked payables
  const { data: existingLinks } = await supabase
    .from("purchase_payable_links")
    .select("linked_amount")
    .eq("purchase_order_id", parsed.purchase_order_id)
    .eq("organization_id", orgId);

  const alreadyLinked = (existingLinks ?? []).reduce((sum: number, l: any) => sum + Number(l.linked_amount), 0);
  if (alreadyLinked + parsed.amount > Number(po.total_amount) + 0.01) {
    throw new Error(`Valor total vinculado (${alreadyLinked + parsed.amount}) excede o valor da ordem (${po.total_amount})`);
  }

  // Create payable(s) using existing financial infrastructure
  if (parsed.installments > 1) {
    const groupId = crypto.randomUUID();
    const baseAmount = Math.trunc((parsed.amount / parsed.installments) * 100) / 100;
    const remainder = Math.round((parsed.amount - baseAmount * parsed.installments) * 100) / 100;

    const rows = [];
    for (let i = 1; i <= parsed.installments; i++) {
      const dueDate = new Date(parsed.due_date);
      dueDate.setDate(dueDate.getDate() + (i - 1) * parsed.interval_days);
      const amount = i === parsed.installments ? baseAmount + remainder : baseAmount;

      rows.push({
        organization_id: orgId,
        counterparty_name: supplierName,
        description: `Compra ${Array.isArray(po.suppliers) ? "" : ""}(${i}/${parsed.installments})`,
        original_amount: amount,
        issue_date: new Date().toISOString().split("T")[0],
        due_date: dueDate.toISOString().split("T")[0],
        category_id: parsed.category_id ?? null,
        installment_group_id: groupId,
        installment_number: i,
        status: "open",
        created_by: user.id,
      });
    }

    const { data: payables, error } = await supabase.from("payables").insert(rows).select("id");
    if (error) throw error;

    // Link each payable to the PO
    for (const payable of (payables ?? [])) {
      const linkedAmt = (payable as any).original_amount ?? parsed.amount / parsed.installments;
      await supabase.from("purchase_payable_links").insert({
        organization_id: orgId,
        purchase_order_id: parsed.purchase_order_id,
        payable_id: payable.id,
        linked_amount: linkedAmt,
      });
    }
  } else {
    const { data: payable, error } = await supabase
      .from("payables")
      .insert({
        organization_id: orgId,
        counterparty_name: supplierName,
        description: `Compra `,
        original_amount: parsed.amount,
        issue_date: new Date().toISOString().split("T")[0],
        due_date: parsed.due_date,
        category_id: parsed.category_id ?? null,
        status: "open",
        created_by: user.id,
      })
      .select("id")
      .single();
    if (error) throw error;

    await supabase.from("purchase_payable_links").insert({
      organization_id: orgId,
      purchase_order_id: parsed.purchase_order_id,
      payable_id: payable.id,
      linked_amount: parsed.amount,
    });
  }

  await supabase.rpc("log_audit", {
    p_org_id: orgId, p_actor: user.id, p_action: "payable_generated_from_purchase",
    p_module: "purchases", p_resource_type: "purchase_order", p_resource_id: parsed.purchase_order_id,
  });
  reval();
  return { success: true };
}

// ============================================================================
// PRODUCT COST UPDATE
// ============================================================================

export async function updateProductCostFromPurchase(input: unknown) {
  const parsed = updateProductCostSchema.parse(input);
  const { supabase, orgId, user } = await getCtx();

  // Update cost on product or variant
  if (parsed.variant_id) {
    const { error } = await supabase
      .from("product_variants")
      .update({ cost_price_override: parsed.new_cost })
      .eq("id", parsed.variant_id)
      .eq("organization_id", orgId);
    if (error) throw error;
  } else {
    const { error } = await supabase
      .from("products")
      .update({ cost_price: parsed.new_cost })
      .eq("id", parsed.product_id)
      .eq("organization_id", orgId);
    if (error) throw error;
  }

  await supabase.rpc("log_audit", {
    p_org_id: orgId, p_actor: user.id, p_action: "product_cost_updated_from_purchase",
    p_module: "purchases", p_resource_type: "product", p_resource_id: parsed.product_id,
    p_metadata: { new_cost: parsed.new_cost, purchase_order_id: parsed.purchase_order_id, variant_id: parsed.variant_id },
  });
  reval();
  return { success: true };
}

// ============================================================================
// DASHBOARD
// ============================================================================

export async function getPurchasesDashboard(): Promise<PurchasesDashboardStats> {
  const { supabase, orgId } = await getCtx();

  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 86400000);
  const dateFrom = thirtyDaysAgo.toISOString().split("T")[0];

  // Run queries in parallel
  const [
    activeSuppliersResult,
    ordersInPeriodResult,
    inProgressResult,
    awaitingReceiptResult,
    partialResult,
    completedResult,
    lateResult,
    totalAmountResult,
    payablesResult,
    topSuppliersResult,
    recentOrdersResult,
    upcomingResult,
  ] = await Promise.all([
    supabase.from("suppliers").select("id", { count: "exact", head: true }).eq("organization_id", orgId).eq("status", "active").is("archived_at", null),
    supabase.from("purchase_orders").select("id", { count: "exact", head: true }).eq("organization_id", orgId).gte("issue_date", dateFrom),
    supabase.from("purchase_orders").select("id", { count: "exact", head: true }).eq("organization_id", orgId).in("status", ["approved", "sent"]),
    supabase.from("purchase_orders").select("id", { count: "exact", head: true }).eq("organization_id", orgId).in("status", ["approved", "sent", "partially_received"]),
    supabase.from("purchase_orders").select("id", { count: "exact", head: true }).eq("organization_id", orgId).eq("status", "partially_received"),
    supabase.from("purchase_orders").select("id", { count: "exact", head: true }).eq("organization_id", orgId).eq("status", "received").gte("issue_date", dateFrom),
    supabase.from("purchase_orders").select("id", { count: "exact", head: true }).eq("organization_id", orgId).lt("expected_delivery_date", dateFrom).in("status", ["approved", "sent", "partially_received"]),
    supabase.from("purchase_orders").select("total_amount").eq("organization_id", orgId).gte("issue_date", dateFrom),
    supabase.from("purchase_payable_links").select("linked_amount").eq("organization_id", orgId),
    supabase
      .from("purchase_orders")
      .select("supplier_id, total_amount, suppliers(legal_name)")
      .eq("organization_id", orgId)
      .gte("issue_date", dateFrom)
      .neq("status", "cancelled")
      .limit(100),
    supabase
      .from("purchase_orders")
      .select("id, purchase_number, total_amount, status, issue_date, suppliers(legal_name)")
      .eq("organization_id", orgId)
      .order("issue_date", { ascending: false })
      .limit(5),
    supabase
      .from("purchase_orders")
      .select("id, purchase_number, total_amount, expected_delivery_date, suppliers(legal_name)")
      .eq("organization_id", orgId)
      .in("status", ["approved", "sent"])
      .not("expected_delivery_date", "is", null)
      .gte("expected_delivery_date", now.toISOString().split("T")[0])
      .order("expected_delivery_date", { ascending: true })
      .limit(5),
  ]);

  // Top suppliers aggregation
  const supplierTotals = new Map<string, { name: string; count: number; total: number }>();
  for (const row of (topSuppliersResult.data ?? [])) {
    const sid = row.supplier_id;
    const sName = Array.isArray(row.suppliers) ? row.suppliers[0]?.legal_name : (row.suppliers as any)?.legal_name ?? "Desconhecido";
    const existing = supplierTotals.get(sid) ?? { name: sName, count: 0, total: 0 };
    existing.count++;
    existing.total += Number(row.total_amount);
    supplierTotals.set(sid, existing);
  }

  return {
    activeSuppliers: activeSuppliersResult.count ?? 0,
    totalOrdersInPeriod: ordersInPeriodResult.count ?? 0,
    ordersInProgress: inProgressResult.count ?? 0,
    ordersAwaitingReceipt: awaitingReceiptResult.count ?? 0,
    partiallyReceivedOrders: partialResult.count ?? 0,
    completedOrders: completedResult.count ?? 0,
    lateDeliveries: lateResult.count ?? 0,
    totalPurchaseAmount: (totalAmountResult.data ?? []).reduce((sum: number, r: any) => sum + Number(r.total_amount), 0),
    payablesFromPurchases: (payablesResult.data ?? []).reduce((sum: number, r: any) => sum + Number(r.linked_amount), 0),
    topSuppliers: [...supplierTotals.entries()]
      .map(([id, v]) => ({ supplierId: id, supplierName: v.name, orderCount: v.count, totalAmount: v.total }))
      .sort((a, b) => b.totalAmount - a.totalAmount)
      .slice(0, 5),
    recentOrders: (recentOrdersResult.data ?? []).map((r: any) => ({
      id: r.id,
      purchaseNumber: r.purchase_number,
      supplierName: Array.isArray(r.suppliers) ? r.suppliers[0]?.legal_name : r.suppliers?.legal_name ?? "Desconhecido",
      totalAmount: Number(r.total_amount),
      status: r.status,
      issueDate: r.issue_date,
    })),
    upcomingReceipts: (upcomingResult.data ?? []).map((r: any) => ({
      id: r.id,
      purchaseNumber: r.purchase_number,
      supplierName: Array.isArray(r.suppliers) ? r.suppliers[0]?.legal_name : r.suppliers?.legal_name ?? "Desconhecido",
      expectedDeliveryDate: r.expected_delivery_date,
      totalAmount: Number(r.total_amount),
      itemCount: 0,
    })),
  };
}

// ============================================================================
// REPORTS
// ============================================================================

export async function getPurchasesBySupplier(dateRange: { from: string; to: string }): Promise<PurchasesBySupplier[]> {
  const { supabase, orgId } = await getCtx();

  const { data, error } = await supabase
    .from("purchase_orders")
    .select("supplier_id, total_amount, suppliers(legal_name)")
    .eq("organization_id", orgId)
    .gte("issue_date", dateRange.from)
    .lte("issue_date", dateRange.to)
    .neq("status", "cancelled");
  if (error) throw error;

  const map = new Map<string, { name: string; count: number; total: number }>();
  for (const row of (data ?? [])) {
    const sid = row.supplier_id;
    const sName = Array.isArray(row.suppliers) ? row.suppliers[0]?.legal_name : (row.suppliers as any)?.legal_name ?? "Desconhecido";
    const existing = map.get(sid) ?? { name: sName, count: 0, total: 0 };
    existing.count++;
    existing.total += Number(row.total_amount);
    map.set(sid, existing);
  }

  return [...map.entries()]
    .map(([id, v]) => ({
      supplierId: id,
      supplierName: v.name,
      orderCount: v.count,
      totalAmount: v.total,
      avgOrderValue: v.count > 0 ? v.total / v.count : 0,
    }))
    .sort((a, b) => b.totalAmount - a.totalAmount);
}

export async function getPurchasesByPeriod(dateRange: { from: string; to: string }): Promise<PurchasesByPeriod[]> {
  const { supabase, orgId } = await getCtx();

  const { data, error } = await supabase
    .from("purchase_orders")
    .select("issue_date, total_amount")
    .eq("organization_id", orgId)
    .gte("issue_date", dateRange.from)
    .lte("issue_date", dateRange.to)
    .neq("status", "cancelled")
    .order("issue_date");
  if (error) throw error;

  const map = new Map<string, { count: number; total: number }>();
  for (const row of (data ?? [])) {
    const month = row.issue_date.substring(0, 7); // YYYY-MM
    const existing = map.get(month) ?? { count: 0, total: 0 };
    existing.count++;
    existing.total += Number(row.total_amount);
    map.set(month, existing);
  }

  return [...map.entries()]
    .map(([period, v]) => ({ period, orderCount: v.count, totalAmount: v.total }))
    .sort((a, b) => a.period.localeCompare(b.period));
}

export async function getMostPurchasedProducts(dateRange: { from: string; to: string }): Promise<MostPurchasedProducts[]> {
  const { supabase, orgId } = await getCtx();

  const { data, error } = await supabase
    .from("purchase_order_items")
    .select("product_id, product_name_snapshot, sku_snapshot, quantity_ordered, line_total, purchase_orders!inner(issue_date, organization_id)")
    .eq("organization_id", orgId)
    .gte("purchase_orders.issue_date", dateRange.from)
    .lte("purchase_orders.issue_date", dateRange.to);
  if (error) throw error;

  const map = new Map<string, { name: string; sku: string | null; qty: number; total: number; suppliers: Set<string> }>();
  for (const row of (data ?? [])) {
    const existing = map.get(row.product_id) ?? { name: row.product_name_snapshot, sku: row.sku_snapshot, qty: 0, total: 0, suppliers: new Set() };
    existing.qty += Number(row.quantity_ordered);
    existing.total += Number(row.line_total);
    map.set(row.product_id, existing);
  }

  return [...map.entries()]
    .map(([id, v]) => ({
      productId: id,
      productName: v.name,
      sku: v.sku,
      totalQuantity: v.qty,
      totalAmount: v.total,
      supplierCount: v.suppliers.size,
    }))
    .sort((a, b) => b.totalQuantity - a.totalQuantity)
    .slice(0, 20);
}