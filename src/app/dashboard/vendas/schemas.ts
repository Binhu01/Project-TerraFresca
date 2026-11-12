import { z } from "zod";

// ============================================================================
// LINE ITEM SCHEMA (shared between orders and quotes)
// ============================================================================
export const lineItemSchema = z.object({
  description: z.string().min(1, "Descrição é obrigatória"),
  quantity: z.number().positive("Quantidade deve ser maior que zero"),
  unit_price: z.number().min(0, "Preço unitário não pode ser negativo"),
  discount: z.number().min(0, "Desconto não pode ser negativo").default(0),
  product_id: z.string().uuid().nullable().optional(),
  variant_id: z.string().uuid().nullable().optional(),
});

export type LineItemInput = z.infer<typeof lineItemSchema>;

// ============================================================================
// ORDER SCHEMAS
// ============================================================================
export const createOrderSchema = z.object({
  customer_id: z.string().uuid("Cliente inválido"),
  channel_id: z.string().uuid().nullable().optional(),
  lead_id: z.string().uuid().nullable().optional(),
  notes: z.string().max(2000).optional(),
  items: z.array(lineItemSchema).min(1, "Adicione pelo menos um item"),
});

export const updateOrderSchema = z.object({
  customer_id: z.string().uuid("Cliente inválido"),
  channel_id: z.string().uuid().nullable().optional(),
  lead_id: z.string().uuid().nullable().optional(),
  notes: z.string().max(2000).optional(),
  items: z.array(lineItemSchema).min(1, "Adicione pelo menos um item"),
});

export const updateOrderStatusSchema = z.object({
  status: z.enum(["draft", "confirmed", "preparing", "completed", "cancelled"]),
  reason: z.string().max(500).optional(),
});

export type CreateOrderInput = z.infer<typeof createOrderSchema>;
export type UpdateOrderInput = z.infer<typeof updateOrderSchema>;
export type UpdateOrderStatusInput = z.infer<typeof updateOrderStatusSchema>;

// ============================================================================
// QUOTE SCHEMAS
// ============================================================================
export const createQuoteSchema = z.object({
  customer_id: z.string().uuid("Cliente inválido"),
  channel_id: z.string().uuid().nullable().optional(),
  lead_id: z.string().uuid().nullable().optional(),
  valid_until: z.string().min(1, "Data de validade é obrigatória"),
  notes: z.string().max(2000).optional(),
  items: z.array(lineItemSchema).min(1, "Adicione pelo menos um item"),
});

export const updateQuoteSchema = z.object({
  customer_id: z.string().uuid("Cliente inválido"),
  channel_id: z.string().uuid().nullable().optional(),
  lead_id: z.string().uuid().nullable().optional(),
  valid_until: z.string().min(1, "Data de validade é obrigatória"),
  notes: z.string().max(2000).optional(),
  items: z.array(lineItemSchema).min(1, "Adicione pelo menos um item"),
});

export const updateQuoteStatusSchema = z.object({
  status: z.enum(["draft", "sent", "accepted", "rejected", "expired", "converted"]),
  reason: z.string().max(500).optional(),
});

export type CreateQuoteInput = z.infer<typeof createQuoteSchema>;
export type UpdateQuoteInput = z.infer<typeof updateQuoteSchema>;
export type UpdateQuoteStatusInput = z.infer<typeof updateQuoteStatusSchema>;

// ============================================================================
// SALES CHANNEL SCHEMAS
// ============================================================================
export const createChannelSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório").max(100),
  description: z.string().max(500).optional(),
  is_active: z.boolean().default(true),
});

export const updateChannelSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório").max(100),
  description: z.string().max(500).optional(),
  is_active: z.boolean(),
});

export type CreateChannelInput = z.infer<typeof createChannelSchema>;
export type UpdateChannelInput = z.infer<typeof updateChannelSchema>;