"use server";

import { createClient } from "@/lib/supabase/server";
import { getActiveOrganization } from "@/lib/organizations";
import { revalidatePath } from "next/cache";
import type {
  Warehouse,
  InventoryBalance,
  MovementWithDetails,
  InventoryAlert,
  InventoryStats,
} from "@/types/inventory";
import {
  createWarehouseSchema,
  updateWarehouseSchema,
  stockEntrySchema,
  stockExitSchema,
  stockAdjustmentSchema,
  stockTransferSchema,
  type CreateWarehouseInput,
  type UpdateWarehouseInput,
  type StockEntryInput,
  type StockExitInput,
  type StockAdjustmentInput,
  type StockTransferInput,
} from "./schemas";

async function getCtx() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Não autenticado");
  const activeData = await getActiveOrganization();
  if (!activeData) throw new Error("Nenhuma organização ativa");
  return { supabase, user, orgId: activeData.org.id };
}

// ============================================================================
// WAREHOUSES
// ============================================================================

export async function getWarehouses(): Promise<Warehouse[]> {
  const { supabase, orgId } = await getCtx();
  const { data, error } = await supabase
    .from("warehouses")
    .select("*")
    .eq("organization_id", orgId)
    .order("name");
  if (error) throw error;
  return (data ?? []) as Warehouse[];
}

export async function createWarehouse(input: CreateWarehouseInput) {
  const parsed = createWarehouseSchema.parse(input);
  const { supabase, orgId } = await getCtx();

  // If setting as default, unset other defaults first
  if (parsed.is_default) {
    await supabase
      .from("warehouses")
      .update({ is_default: false })
      .eq("organization_id", orgId);
  }

  const { error } = await supabase.from("warehouses").insert({
    organization_id: orgId,
    name: parsed.name,
    code: parsed.code,
    address: parsed.address ?? null,
    description: parsed.description ?? null,
    is_default: parsed.is_default,
  });
  if (error) throw error;
  revalidatePath("/dashboard/estoque/depositos");
  revalidatePath("/dashboard/estoque");
  return { success: true };
}

export async function updateWarehouse(id: string, input: UpdateWarehouseInput) {
  const parsed = updateWarehouseSchema.parse(input);
  const { supabase, orgId } = await getCtx();

  if (parsed.is_default) {
    await supabase
      .from("warehouses")
      .update({ is_default: false })
      .eq("organization_id", orgId)
      .neq("id", id);
  }

  const { error } = await supabase
    .from("warehouses")
    .update({
      name: parsed.name,
      code: parsed.code,
      address: parsed.address ?? null,
      description: parsed.description ?? null,
      is_default: parsed.is_default,
      is_active: parsed.is_active,
    })
    .eq("id", id)
    .eq("organization_id", orgId);
  if (error) throw error;
  revalidatePath("/dashboard/estoque/depositos");
  revalidatePath("/dashboard/estoque");
  return { success: true };
}

export async function deleteWarehouse(id: string) {
  const { supabase, orgId } = await getCtx();

  // Check for existing balances
  const { count } = await supabase
    .from("inventory_balances")
    .select("*", { count: "exact", head: true })
    .eq("warehouse_id", id)
    .eq("organization_id", orgId);
  if ((count ?? 0) > 0) {
    throw new Error("Não é possível excluir um depósito com saldo de estoque.");
  }

  // Check for movement history
  const { count: movCount } = await supabase
    .from("inventory_movements")
    .select("*", { count: "exact", head: true })
    .eq("warehouse_id", id)
    .eq("organization_id", orgId);
  if ((movCount ?? 0) > 0) {
    throw new Error("Não é possível excluir um depósito com histórico de movimentações.");
  }

  const { error } = await supabase
    .from("warehouses")
    .delete()
    .eq("id", id)
    .eq("organization_id", orgId);
  if (error) throw error;
  revalidatePath("/dashboard/estoque/depositos");
  return { success: true };
}

// ============================================================================
// INVENTORY BALANCES
// ============================================================================

export async function getInventoryBalances(warehouseId?: string) {
  const { supabase, orgId } = await getCtx();

  let query = supabase
    .from("inventory_balances")
    .select(`
      *,
      product:products(id, name, sku, unit, track_inventory, minimum_stock),
      variant:product_variants(id, name, sku),
      warehouse:warehouses(id, name, code)
    `)
    .eq("organization_id", orgId)
    .order("updated_at", { ascending: false });

  if (warehouseId && warehouseId !== "all") {
    query = query.eq("warehouse_id", warehouseId);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as unknown as Array<InventoryBalance & {
    product: { id: string; name: string; sku: string | null; unit: string; track_inventory: boolean; minimum_stock: number };
    variant: { id: string; name: string; sku: string | null } | null;
    warehouse: { id: string; name: string; code: string };
  }>;
}

// ============================================================================
// STOCK OPERATIONS
// ============================================================================

export async function recordStockEntry(input: StockEntryInput) {
  const parsed = stockEntrySchema.parse(input);
  const { supabase, orgId, user } = await getCtx();

  // Verify product tracks inventory
  const { data: product } = await supabase
    .from("products")
    .select("track_inventory, product_type")
    .eq("id", parsed.product_id)
    .eq("organization_id", orgId)
    .single();
  if (!product) throw new Error("Produto não encontrado");
  if (!product.track_inventory) throw new Error("Este produto não possui controle de estoque");

  const { error } = await supabase.rpc("adjust_inventory", {
    p_org_id: orgId,
    p_warehouse_id: parsed.warehouse_id,
    p_product_id: parsed.product_id,
    p_variant_id: parsed.variant_id ?? null,
    p_delta: parsed.quantity,
    p_movement_type: parsed.movement_type,
    p_reason: parsed.reason,
    p_reference_type: null,
    p_reference_id: null,
    p_user_id: user.id,
  });
  if (error) throw error;

  revalidatePath("/dashboard/estoque");
  revalidatePath("/dashboard/estoque/movimentacoes");
  revalidatePath("/dashboard/produtos");
  return { success: true };
}

export async function recordStockExit(input: StockExitInput) {
  const parsed = stockExitSchema.parse(input);
  const { supabase, orgId, user } = await getCtx();

  const { data: product } = await supabase
    .from("products")
    .select("track_inventory")
    .eq("id", parsed.product_id)
    .eq("organization_id", orgId)
    .single();
  if (!product) throw new Error("Produto não encontrado");
  if (!product.track_inventory) throw new Error("Este produto não possui controle de estoque");

  // Check available stock before exit
  const { data: balance } = await supabase
    .from("inventory_balances")
    .select("quantity_on_hand, quantity_reserved")
    .eq("warehouse_id", parsed.warehouse_id)
    .eq("product_id", parsed.product_id)
    .eq("organization_id", orgId)
    .is("variant_id", parsed.variant_id ?? undefined)
    .maybeSingle();

  const available = balance
    ? Number(balance.quantity_on_hand) - Number(balance.quantity_reserved)
    : 0;
  if (available < parsed.quantity) {
    throw new Error(`Estoque insuficiente. Disponível: ${available}, Solicitado: ${parsed.quantity}`);
  }

  const { error } = await supabase.rpc("adjust_inventory", {
    p_org_id: orgId,
    p_warehouse_id: parsed.warehouse_id,
    p_product_id: parsed.product_id,
    p_variant_id: parsed.variant_id ?? null,
    p_delta: -parsed.quantity,
    p_movement_type: parsed.movement_type,
    p_reason: parsed.reason,
    p_reference_type: null,
    p_reference_id: null,
    p_user_id: user.id,
  });
  if (error) throw error;

  revalidatePath("/dashboard/estoque");
  revalidatePath("/dashboard/estoque/movimentacoes");
  revalidatePath("/dashboard/produtos");
  return { success: true };
}

export async function recordStockAdjustment(input: StockAdjustmentInput) {
  const parsed = stockAdjustmentSchema.parse(input);
  const { supabase, orgId, user } = await getCtx();

  // Get current on-hand quantity
  const { data: balance } = await supabase
    .from("inventory_balances")
    .select("quantity_on_hand")
    .eq("warehouse_id", parsed.warehouse_id)
    .eq("product_id", parsed.product_id)
    .eq("organization_id", orgId)
    .is("variant_id", parsed.variant_id ?? undefined)
    .maybeSingle();

  const currentOnHand = balance ? Number(balance.quantity_on_hand) : 0;
  const delta = parsed.counted_quantity - currentOnHand;

  if (delta === 0) return { success: true, message: "Sem diferença detectada" };

  const movementType = delta > 0 ? "adjustment_in" : "adjustment_out";

  const { error } = await supabase.rpc("adjust_inventory", {
    p_org_id: orgId,
    p_warehouse_id: parsed.warehouse_id,
    p_product_id: parsed.product_id,
    p_variant_id: parsed.variant_id ?? null,
    p_delta: delta,
    p_movement_type: movementType,
    p_reason: `${parsed.reason} (Registrado: ${currentOnHand}, Contado: ${parsed.counted_quantity})`,
    p_reference_type: null,
    p_reference_id: null,
    p_user_id: user.id,
  });
  if (error) throw error;

  revalidatePath("/dashboard/estoque");
  revalidatePath("/dashboard/estoque/movimentacoes");
  revalidatePath("/dashboard/produtos");
  return { success: true, delta };
}

export async function transferStock(input: StockTransferInput) {
  const parsed = stockTransferSchema.parse(input);
  const { supabase, orgId, user } = await getCtx();

  if (parsed.source_warehouse_id === parsed.destination_warehouse_id) {
    throw new Error("Depósitos de origem e destino devem ser diferentes");
  }

  // Check available stock at source
  const { data: balance } = await supabase
    .from("inventory_balances")
    .select("quantity_on_hand, quantity_reserved")
    .eq("warehouse_id", parsed.source_warehouse_id)
    .eq("product_id", parsed.product_id)
    .eq("organization_id", orgId)
    .is("variant_id", parsed.variant_id ?? undefined)
    .maybeSingle();

  const available = balance
    ? Number(balance.quantity_on_hand) - Number(balance.quantity_reserved)
    : 0;
  if (available < parsed.quantity) {
    throw new Error(`Estoque insuficiente na origem. Disponível: ${available}, Solicitado: ${parsed.quantity}`);
  }

  // Exit from source
  const { error: exitErr } = await supabase.rpc("adjust_inventory", {
    p_org_id: orgId,
    p_warehouse_id: parsed.source_warehouse_id,
    p_product_id: parsed.product_id,
    p_variant_id: parsed.variant_id ?? null,
    p_delta: -parsed.quantity,
    p_movement_type: "transfer_out",
    p_reason: parsed.reason,
    p_reference_type: "transfer",
    p_reference_id: null,
    p_user_id: user.id,
  });
  if (exitErr) throw exitErr;

  // Entry at destination
  const { error: entryErr } = await supabase.rpc("adjust_inventory", {
    p_org_id: orgId,
    p_warehouse_id: parsed.destination_warehouse_id,
    p_product_id: parsed.product_id,
    p_variant_id: parsed.variant_id ?? null,
    p_delta: parsed.quantity,
    p_movement_type: "transfer_in",
    p_reason: parsed.reason,
    p_reference_type: "transfer",
    p_reference_id: null,
    p_user_id: user.id,
  });
  if (entryErr) throw entryErr;

  revalidatePath("/dashboard/estoque");
  revalidatePath("/dashboard/estoque/movimentacoes");
  revalidatePath("/dashboard/produtos");
  return { success: true };
}

// ============================================================================
// MOVEMENT HISTORY
// ============================================================================

export async function getInventoryMovements(params?: {
  product_id?: string;
  warehouse_id?: string;
  movement_type?: string;
  page?: number;
  perPage?: number;
}) {
  const { supabase, orgId } = await getCtx();
  const page = params?.page ?? 1;
  const perPage = params?.perPage ?? 20;
  const from = (page - 1) * perPage;
  const to = from + perPage - 1;

  let query = supabase
    .from("inventory_movements")
    .select(
      `*,
      product:products(id, name, sku),
      variant:product_variants(id, name),
      warehouse:warehouses(id, name, code),
      creator:profiles(id, full_name)`,
      { count: "exact" }
    )
    .eq("organization_id", orgId)
    .order("created_at", { ascending: false })
    .range(from, to);

  if (params?.product_id && params.product_id !== "all") {
    query = query.eq("product_id", params.product_id);
  }
  if (params?.warehouse_id && params.warehouse_id !== "all") {
    query = query.eq("warehouse_id", params.warehouse_id);
  }
  if (params?.movement_type && params.movement_type !== "all") {
    query = query.eq("movement_type", params.movement_type);
  }

  const { data, error, count } = await query;
  if (error) throw error;
  return { movements: (data ?? []) as unknown as MovementWithDetails[], total: count ?? 0 };
}

// ============================================================================
// ALERTS
// ============================================================================

export async function getInventoryAlerts(): Promise<InventoryAlert[]> {
  const { supabase, orgId } = await getCtx();

  const { data: products } = await supabase
    .from("products")
    .select("id, name, sku, minimum_stock, variants:product_variants(id, name, minimum_stock)")
    .eq("organization_id", orgId)
    .eq("is_active", true)
    .eq("track_inventory", true);

  if (!products || products.length === 0) return [];

  const productIds = products.map((p) => p.id);
  const { data: balances } = await supabase
    .from("inventory_balances")
    .select("*, warehouse:warehouses(id, name)")
    .in("product_id", productIds)
    .eq("organization_id", orgId);

  const alerts: InventoryAlert[] = [];

  for (const product of products) {
    const productBalances = (balances ?? []).filter((b) => b.product_id === product.id);

    if (productBalances.length === 0) {
      alerts.push({
        product_id: product.id,
        product_name: product.name,
        product_sku: product.sku,
        variant_id: null,
        variant_name: null,
        warehouse_id: "",
        warehouse_name: "Todos",
        quantity_on_hand: 0,
        quantity_reserved: 0,
        quantity_available: 0,
        minimum_stock: product.minimum_stock,
        alert_type: "out_of_stock",
      });
      continue;
    }

    for (const bal of productBalances) {
      const onHand = Number(bal.quantity_on_hand);
      const reserved = Number(bal.quantity_reserved);
      const available = onHand - reserved;
      const minStock = product.minimum_stock;

      let alertType: InventoryAlert["alert_type"] | null = null;
      if (available <= 0) alertType = "out_of_stock";
      else if (available <= minStock) alertType = "low_stock";

      if (alertType) {
        alerts.push({
          product_id: product.id,
          product_name: product.name,
          product_sku: product.sku,
          variant_id: bal.variant_id,
          variant_name: null,
          warehouse_id: bal.warehouse_id,
          warehouse_name: (bal.warehouse as { name: string }).name,
          quantity_on_hand: onHand,
          quantity_reserved: reserved,
          quantity_available: available,
          minimum_stock: minStock,
          alert_type: alertType,
        });
      }
    }
  }

  return alerts;
}

// ============================================================================
// STATS
// ============================================================================

export async function getInventoryStats(orgId: string): Promise<InventoryStats> {
  const supabase = await createClient();

  const { count: warehouseCount } = await supabase
    .from("warehouses")
    .select("*", { count: "exact", head: true })
    .eq("organization_id", orgId)
    .eq("is_active", true);

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const { count: movementCount } = await supabase
    .from("inventory_movements")
    .select("*", { count: "exact", head: true })
    .eq("organization_id", orgId)
    .gte("created_at", monthStart);

  const { data: reservations } = await supabase
    .from("stock_reservations")
    .select("quantity, product_id")
    .eq("organization_id", orgId)
    .eq("status", "active");

  const totalReserved = (reservations ?? []).reduce((sum, r) => sum + Number(r.quantity), 0);
  const itemsWithReservations = new Set((reservations ?? []).map((r) => r.product_id)).size;

  return {
    total_warehouses: warehouseCount ?? 0,
    total_movements_month: movementCount ?? 0,
    items_with_reservations: itemsWithReservations,
    total_reserved_quantity: totalReserved,
  };
}