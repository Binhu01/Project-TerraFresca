"use server";

import { createClient } from "@/lib/supabase/server";
import { getActiveOrganization } from "@/lib/organizations";
import { revalidatePath } from "next/cache";
import type { ProductWithDetails, ProductCategory, ProductStats } from "@/types/inventory";
import {
  createProductSchema,
  updateProductSchema,
  createCategorySchema,
  updateCategorySchema,
  type CreateProductInput,
  type UpdateProductInput,
  type CreateCategoryInput,
  type UpdateCategoryInput,
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
// CATEGORIES
// ============================================================================

export async function getCategories(): Promise<ProductCategory[]> {
  const { supabase, orgId } = await getCtx();
  const { data, error } = await supabase
    .from("product_categories")
    .select("*")
    .eq("organization_id", orgId)
    .order("name");
  if (error) throw error;
  return (data ?? []) as ProductCategory[];
}

export async function createCategory(input: CreateCategoryInput) {
  const parsed = createCategorySchema.parse(input);
  const { supabase, orgId } = await getCtx();

  if (parsed.parent_id) {
    const { data: parent } = await supabase
      .from("product_categories")
      .select("id, parent_id")
      .eq("id", parsed.parent_id)
      .eq("organization_id", orgId)
      .single();
    if (!parent) throw new Error("Categoria pai não encontrada");
  }

  const { error } = await supabase.from("product_categories").insert({
    organization_id: orgId,
    name: parsed.name,
    description: parsed.description ?? null,
    parent_id: parsed.parent_id ?? null,
  });
  if (error) throw error;
  revalidatePath("/dashboard/produtos/categorias");
  revalidatePath("/dashboard/produtos");
  return { success: true };
}

export async function updateCategory(id: string, input: UpdateCategoryInput) {
  const parsed = updateCategorySchema.parse(input);
  const { supabase, orgId } = await getCtx();
  const { error } = await supabase
    .from("product_categories")
    .update({
      name: parsed.name,
      description: parsed.description ?? null,
      parent_id: parsed.parent_id ?? null,
      is_active: parsed.is_active,
    })
    .eq("id", id)
    .eq("organization_id", orgId);
  if (error) throw error;
  revalidatePath("/dashboard/produtos/categorias");
  revalidatePath("/dashboard/produtos");
  return { success: true };
}

export async function archiveCategory(id: string) {
  const { supabase, orgId } = await getCtx();
  const { count } = await supabase
    .from("products")
    .select("*", { count: "exact", head: true })
    .eq("category_id", id)
    .eq("organization_id", orgId)
    .eq("is_active", true);
  if ((count ?? 0) > 0) {
    throw new Error("Não é possível arquivar uma categoria com produtos ativos.");
  }
  const { error } = await supabase
    .from("product_categories")
    .update({ is_active: false })
    .eq("id", id)
    .eq("organization_id", orgId);
  if (error) throw error;
  revalidatePath("/dashboard/produtos/categorias");
  return { success: true };
}

// ============================================================================
// PRODUCTS
// ============================================================================

export async function getProducts(params?: {
  search?: string;
  category_id?: string;
  product_type?: string;
  is_active?: boolean;
  track_inventory?: boolean;
  page?: number;
  perPage?: number;
}) {
  const { supabase, orgId } = await getCtx();
  const page = params?.page ?? 1;
  const perPage = params?.perPage ?? 20;
  const from = (page - 1) * perPage;
  const to = from + perPage - 1;

  let query = supabase
    .from("products")
    .select("*, category:product_categories(id, name)", { count: "exact" })
    .eq("organization_id", orgId)
    .order("created_at", { ascending: false })
    .range(from, to);

  if (params?.search) {
    query = query.or(
      `name.ilike.%${params.search}%,sku.ilike.%${params.search}%,barcode.ilike.%${params.search}%`
    );
  }
  if (params?.category_id && params.category_id !== "all") {
    query = query.eq("category_id", params.category_id);
  }
  if (params?.product_type && params.product_type !== "all") {
    query = query.eq("product_type", params.product_type);
  }
  if (params?.is_active !== undefined) {
    query = query.eq("is_active", params.is_active);
  }
  if (params?.track_inventory !== undefined) {
    query = query.eq("track_inventory", params.track_inventory);
  }

  const { data, error, count } = await query;
  if (error) throw error;
  return { products: (data ?? []) as unknown as Array<ProductWithDetails>, total: count ?? 0 };
}

export async function getProductById(id: string) {
  const { supabase, orgId } = await getCtx();
  const { data, error } = await supabase
    .from("products")
    .select(`
      *,
      category:product_categories(id, name),
      variants:product_variants(*),
      balances:inventory_balances(*, warehouse:warehouses(id, name, code))
    `)
    .eq("id", id)
    .eq("organization_id", orgId)
    .single();
  if (error) {
    if (error.code === "PGRST116") return null;
    throw error;
  }
  return data as unknown as ProductWithDetails;
}

export async function createProduct(input: CreateProductInput) {
  const parsed = createProductSchema.parse(input);
  const { supabase, orgId } = await getCtx();

  if (parsed.sku) {
    const { count } = await supabase
      .from("products")
      .select("*", { count: "exact", head: true })
      .eq("organization_id", orgId)
      .eq("sku", parsed.sku);
    if ((count ?? 0) > 0) throw new Error("SKU já existe nesta organização");
  }

  const { data: product, error: prodErr } = await supabase
    .from("products")
    .insert({
      organization_id: orgId,
      category_id: parsed.category_id ?? null,
      name: parsed.name,
      description: parsed.description ?? null,
      image_url: parsed.image_url ?? null,
      sku: parsed.sku ?? null,
      barcode: parsed.barcode ?? null,
      brand: parsed.brand ?? null,
      product_type: parsed.product_type,
      unit: parsed.unit,
      cost_price: parsed.cost_price ?? null,
      sale_price: parsed.sale_price,
      track_inventory: parsed.track_inventory,
      minimum_stock: parsed.minimum_stock,
    })
    .select("id")
    .single();
  if (prodErr) throw prodErr;

  if (parsed.variants && parsed.variants.length > 0) {
    const variantRows = parsed.variants.map((v) => ({
      organization_id: orgId,
      product_id: product.id,
      name: v.name,
      attributes: v.attributes,
      sku: v.sku ?? null,
      barcode: v.barcode ?? null,
      cost_price_override: v.cost_price_override ?? null,
      sale_price_override: v.sale_price_override ?? null,
      minimum_stock: v.minimum_stock,
      is_active: v.is_active,
    }));
    const { error: varErr } = await supabase.from("product_variants").insert(variantRows);
    if (varErr) throw varErr;
  }

  revalidatePath("/dashboard/produtos");
  return { success: true, id: product.id };
}

export async function updateProduct(id: string, input: UpdateProductInput) {
  const parsed = updateProductSchema.parse(input);
  const { supabase, orgId } = await getCtx();

  if (parsed.sku) {
    const { count } = await supabase
      .from("products")
      .select("*", { count: "exact", head: true })
      .eq("organization_id", orgId)
      .eq("sku", parsed.sku)
      .neq("id", id);
    if ((count ?? 0) > 0) throw new Error("SKU já existe nesta organização");
  }

  const { error: prodErr } = await supabase
    .from("products")
    .update({
      category_id: parsed.category_id ?? null,
      name: parsed.name,
      description: parsed.description ?? null,
      image_url: parsed.image_url ?? null,
      sku: parsed.sku ?? null,
      barcode: parsed.barcode ?? null,
      brand: parsed.brand ?? null,
      product_type: parsed.product_type,
      unit: parsed.unit,
      cost_price: parsed.cost_price ?? null,
      sale_price: parsed.sale_price,
      track_inventory: parsed.track_inventory,
      minimum_stock: parsed.minimum_stock,
      is_active: parsed.is_active,
    })
    .eq("id", id)
    .eq("organization_id", orgId);
  if (prodErr) throw prodErr;

  // Diff-based variant update to preserve existing variant IDs (prevents orphaned inventory/reservations)
  const { data: existingVariants } = await supabase
    .from("product_variants")
    .select("id, name, sku, attributes")
    .eq("product_id", id)
    .eq("organization_id", orgId);

  const incomingVariants = parsed.variants ?? [];
  const existingMap = new Map<string, string>(); // key -> existing variant id
  for (const ev of existingVariants ?? []) {
    const key = ev.id || `${ev.name}|${JSON.stringify(ev.attributes)}|${ev.sku}`;
    existingMap.set(key, ev.id);
  }

  const updatedIds = new Set<string>();
  const toInsert: Array<Record<string, unknown>> = [];
  const toUpdate: Array<{ id: string; data: Record<string, unknown> }> = [];

  for (const v of incomingVariants) {
    // Match by explicit id first, then by natural key
    const matchKey = v.id || `${v.name}|${JSON.stringify(v.attributes)}|${v.sku}`;
    const existingId = v.id ? existingMap.get(v.id) : existingMap.get(matchKey);

    const rowData = {
      name: v.name,
      attributes: v.attributes,
      sku: v.sku ?? null,
      barcode: v.barcode ?? null,
      cost_price_override: v.cost_price_override ?? null,
      sale_price_override: v.sale_price_override ?? null,
      minimum_stock: v.minimum_stock,
      is_active: v.is_active,
    };

    if (existingId) {
      toUpdate.push({ id: existingId, data: rowData });
      updatedIds.add(existingId);
    } else {
      toInsert.push({ organization_id: orgId, product_id: id, ...rowData });
    }
  }

  // Update existing variants in place
  for (const u of toUpdate) {
    const { error } = await supabase.from("product_variants").update(u.data).eq("id", u.id).eq("organization_id", orgId);
    if (error) throw error;
  }

  // Insert new variants
  if (toInsert.length > 0) {
    const { error } = await supabase.from("product_variants").insert(toInsert);
    if (error) throw error;
  }

  // Delete only variants that are no longer in the incoming set
  const idsToDelete = (existingVariants ?? [])
    .filter((ev) => !updatedIds.has(ev.id))
    .map((ev) => ev.id);
  if (idsToDelete.length > 0) {
    const { error } = await supabase.from("product_variants").delete().in("id", idsToDelete).eq("organization_id", orgId);
    if (error) throw error;
  }

  revalidatePath("/dashboard/produtos");
  revalidatePath(`/dashboard/produtos/${id}`);
  return { success: true };
}

export async function archiveProduct(id: string) {
  const { supabase, orgId } = await getCtx();
  const { error } = await supabase
    .from("products")
    .update({ is_active: false, archived_at: new Date().toISOString() })
    .eq("id", id)
    .eq("organization_id", orgId);
  if (error) throw error;
  revalidatePath("/dashboard/produtos");
  revalidatePath(`/dashboard/produtos/${id}`);
  return { success: true };
}

export async function getProductStats(orgId: string): Promise<ProductStats> {
  const supabase = await createClient();

  const { data: allProducts } = await supabase
    .from("products")
    .select("id, product_type, is_active, track_inventory, minimum_stock")
    .eq("organization_id", orgId);

  const products = allProducts ?? [];
  const active = products.filter((p) => p.is_active);
  const services = products.filter((p) => p.product_type === "service");

  // Low stock / out of stock requires joining inventory_balances
  let lowStockCount = 0;
  let outOfStockCount = 0;

  const trackedProducts = active.filter((p) => p.track_inventory);
  if (trackedProducts.length > 0) {
    const productIds = trackedProducts.map((p) => p.id);
    const { data: balances } = await supabase
      .from("inventory_balances")
      .select("product_id, quantity_on_hand, quantity_reserved")
      .in("product_id", productIds)
      .eq("organization_id", orgId);

    const balanceMap = new Map<string, { on_hand: number; reserved: number }>();
    for (const b of balances ?? []) {
      const existing = balanceMap.get(b.product_id);
      if (existing) {
        existing.on_hand += Number(b.quantity_on_hand);
        existing.reserved += Number(b.quantity_reserved);
      } else {
        balanceMap.set(b.product_id, {
          on_hand: Number(b.quantity_on_hand),
          reserved: Number(b.quantity_reserved),
        });
      }
    }

    for (const p of trackedProducts) {
      const bal = balanceMap.get(p.id);
      const available = bal ? bal.on_hand - bal.reserved : 0;
      if (available <= 0) {
        outOfStockCount++;
      } else if (available <= p.minimum_stock) {
        lowStockCount++;
      }
    }
  }

  return {
    total_products: products.length,
    active_products: active.length,
    services_count: services.length,
    low_stock_count: lowStockCount,
    out_of_stock_count: outOfStockCount,
  };
}