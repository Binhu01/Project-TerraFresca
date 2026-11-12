import { z } from "zod";

// ============================================================================
// WAREHOUSE SCHEMAS
// ============================================================================
export const createWarehouseSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório").max(100),
  code: z.string().min(1, "Código é obrigatório").max(20),
  address: z.string().max(500).optional().nullable(),
  description: z.string().max(500).optional().nullable(),
  is_default: z.boolean().default(false),
});

export const updateWarehouseSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório").max(100),
  code: z.string().min(1, "Código é obrigatório").max(20),
  address: z.string().max(500).optional().nullable(),
  description: z.string().max(500).optional().nullable(),
  is_default: z.boolean(),
  is_active: z.boolean(),
});

export type CreateWarehouseInput = z.infer<typeof createWarehouseSchema>;
export type UpdateWarehouseInput = z.infer<typeof updateWarehouseSchema>;

// ============================================================================
// STOCK MOVEMENT SCHEMAS
// ============================================================================
export const stockEntrySchema = z.object({
  warehouse_id: z.string().uuid("Depósito inválido"),
  product_id: z.string().uuid("Produto inválido"),
  variant_id: z.string().uuid().nullable().optional(),
  quantity: z.number().positive("Quantidade deve ser maior que zero"),
  movement_type: z.enum(["initial_balance", "manual_in", "adjustment_in"]),
  reason: z.string().min(1, "Motivo é obrigatório").max(500),
});

export const stockExitSchema = z.object({
  warehouse_id: z.string().uuid("Depósito inválido"),
  product_id: z.string().uuid("Produto inválido"),
  variant_id: z.string().uuid().nullable().optional(),
  quantity: z.number().positive("Quantidade deve ser maior que zero"),
  movement_type: z.enum(["manual_out", "adjustment_out"]),
  reason: z.string().min(1, "Motivo é obrigatório").max(500),
});

export const stockAdjustmentSchema = z.object({
  warehouse_id: z.string().uuid("Depósito inválido"),
  product_id: z.string().uuid("Produto inválido"),
  variant_id: z.string().uuid().nullable().optional(),
  counted_quantity: z.number().min(0, "Quantidade contada não pode ser negativa"),
  reason: z.string().min(1, "Motivo é obrigatório").max(500),
});

export const stockTransferSchema = z.object({
  source_warehouse_id: z.string().uuid("Depósito de origem inválido"),
  destination_warehouse_id: z.string().uuid("Depósito de destino inválido"),
  product_id: z.string().uuid("Produto inválido"),
  variant_id: z.string().uuid().nullable().optional(),
  quantity: z.number().positive("Quantidade deve ser maior que zero"),
  reason: z.string().min(1, "Motivo é obrigatório").max(500),
});

export type StockEntryInput = z.infer<typeof stockEntrySchema>;
export type StockExitInput = z.infer<typeof stockExitSchema>;
export type StockAdjustmentInput = z.infer<typeof stockAdjustmentSchema>;
export type StockTransferInput = z.infer<typeof stockTransferSchema>;