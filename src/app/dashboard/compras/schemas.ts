import { z } from "zod";

// ============================================================================
// NEXORA — Schemas Zod para Compras (Suppliers, Purchase Orders, Receipts)
// ============================================================================

// ---------------------------------------------------------------------------
// Fornecedores
// ---------------------------------------------------------------------------

export const createSupplierSchema = z.object({
  name: z.string().min(2, "Nome do fornecedor é obrigatório").max(200),
  cnpj: z.string().optional(),
  email: z.string().email("Email inválido").optional().or(z.literal("")),
  phone: z.string().max(50).optional(),
  address: z.string().max(500).optional(),
  contact_person: z.string().max(200).optional(),
  notes: z.string().max(2000).optional(),
});

export const updateSupplierSchema = createSupplierSchema.partial();

// ---------------------------------------------------------------------------
// Ordens de Compra
// ---------------------------------------------------------------------------

export const purchaseOrderItemSchema = z.object({
  product_id: z.string().uuid("Produto inválido"),
  quantity: z.number().positive("Quantidade deve ser maior que zero"),
  unit_cost: z.number().min(0, "Custo unitário não pode ser negativo"),
  notes: z.string().max(500).optional(),
});

export const createPurchaseOrderSchema = z.object({
  supplier_id: z.string().uuid("Fornecedor inválido"),
  expected_at: z.string().optional(),
  notes: z.string().max(2000).optional(),
  items: z.array(purchaseOrderItemSchema).min(1, "Pelo menos um item é obrigatório"),
});

export const updatePurchaseOrderSchema = z.object({
  status: z.enum(["draft", "sent", "confirmed", "partial", "received", "cancelled"]).optional(),
  expected_at: z.string().optional(),
  notes: z.string().max(2000).nullable().optional(),
});

// ---------------------------------------------------------------------------
// Recebimentos
// ---------------------------------------------------------------------------

export const receiptItemSchema = z.object({
  purchase_order_item_id: z.string().uuid(),
  quantity_received: z.number().positive("Quantidade recebida deve ser maior que zero"),
  warehouse_id: z.string().uuid("Depósito inválido"),
});

export const createReceiptSchema = z.object({
  purchase_order_id: z.string().uuid("Ordem de compra inválida"),
  received_at: z.string().optional(),
  notes: z.string().max(2000).optional(),
  items: z.array(receiptItemSchema).min(1, "Pelo menos um item recebido é obrigatório"),
});

// ---------------------------------------------------------------------------
// Export inferred types
// ---------------------------------------------------------------------------

export type CreateSupplierInput = z.infer<typeof createSupplierSchema>;
export type UpdateSupplierInput = z.infer<typeof updateSupplierSchema>;
export type CreatePurchaseOrderInput = z.infer<typeof createPurchaseOrderSchema>;
export type UpdatePurchaseOrderInput = z.infer<typeof updatePurchaseOrderSchema>;
export type CreateReceiptInput = z.infer<typeof createReceiptSchema>;