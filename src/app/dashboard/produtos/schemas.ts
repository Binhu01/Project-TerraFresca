import { z } from "zod";

// ============================================================================
// PRODUCT CATEGORY SCHEMAS
// ============================================================================
export const createCategorySchema = z.object({
  name: z.string().min(1, "Nome é obrigatório").max(100),
  description: z.string().max(500).optional(),
  parent_id: z.string().uuid().nullable().optional(),
});

export const updateCategorySchema = z.object({
  name: z.string().min(1, "Nome é obrigatório").max(100),
  description: z.string().max(500).optional(),
  parent_id: z.string().uuid().nullable().optional(),
  is_active: z.boolean(),
});

export type CreateCategoryInput = z.infer<typeof createCategorySchema>;
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>;

// ============================================================================
// PRODUCT VARIANT SCHEMA (embedded in product forms)
// ============================================================================
export const variantSchema = z.object({
  id: z.string().uuid().optional(), // present when editing existing variant
  name: z.string().min(1, "Nome da variante é obrigatório"),
  attributes: z.record(z.string()).default({}),
  sku: z.string().max(50).optional().nullable(),
  barcode: z.string().max(100).optional().nullable(),
  cost_price_override: z.number().min(0).optional().nullable(),
  sale_price_override: z.number().min(0).optional().nullable(),
  minimum_stock: z.number().min(0).default(0),
  is_active: z.boolean().default(true),
});

export type VariantInput = z.infer<typeof variantSchema>;

// ============================================================================
// PRODUCT SCHEMAS
// ============================================================================
export const createProductSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório").max(200),
  description: z.string().max(5000).optional(),
  image_url: z.string().url("URL inválida").optional().nullable(),
  sku: z.string().max(50).optional().nullable(),
  barcode: z.string().max(100).optional().nullable(),
  brand: z.string().max(100).optional().nullable(),
  category_id: z.string().uuid().nullable().optional(),
  product_type: z.enum(["physical", "service"]),
  unit: z.string().min(1).max(10).default("un"),
  cost_price: z.number().min(0).optional().nullable(),
  sale_price: z.number().min(0, "Preço de venda não pode ser negativo"),
  track_inventory: z.boolean().default(false),
  minimum_stock: z.number().min(0).default(0),
  variants: z.array(variantSchema).optional().default([]),
});

export const updateProductSchema = createProductSchema.extend({
  is_active: z.boolean(),
});

export type CreateProductInput = z.infer<typeof createProductSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;