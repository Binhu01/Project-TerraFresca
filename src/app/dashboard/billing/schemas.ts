import { z } from "zod";

// ============================================================================
// NEXORA FASE 14 — Schemas Zod para Billing & Subscriptions
// ============================================================================

// ---------------------------------------------------------------------------
// Planos (Admin)
// ---------------------------------------------------------------------------

export const entitlementSchema = z.object({
  feature_key: z.string().min(1, "Feature key é obrigatória"),
  is_enabled: z.boolean(),
  limit_value: z.number().int().min(0).nullable().optional(),
  limit_unit: z.string().max(50).nullable().optional(),
});

export const createPlanSchema = z.object({
  slug: z
    .string()
    .min(2, "Slug deve ter pelo menos 2 caracteres")
    .max(50)
    .regex(/^[a-z0-9-]+$/, "Slug deve conter apenas letras minúsculas, números e hífens"),
  name: z.string().min(2, "Nome é obrigatório").max(100),
  description: z.string().max(500).optional(),
  is_active: z.boolean().optional(),
  is_featured: z.boolean().optional(),
  display_order: z.number().int().min(0).optional(),
  monthly_price: z.number().min(0, "Preço mensal não pode ser negativo"),
  annual_price: z.number().min(0, "Preço anual não pode ser negativo"),
  trial_days: z.number().int().min(0).max(365).optional(),
  grace_period_days: z.number().int().min(0).max(90).optional(),
  entitlements: z.array(entitlementSchema).min(1, "Pelo menos um entitlement é obrigatório"),
});

export const updatePlanSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  description: z.string().max(500).nullable().optional(),
  is_active: z.boolean().optional(),
  is_featured: z.boolean().optional(),
  display_order: z.number().int().min(0).optional(),
});

export const createPlanVersionSchema = z.object({
  plan_id: z.string().uuid("ID do plano inválido"),
  monthly_price: z.number().min(0),
  annual_price: z.number().min(0),
  trial_days: z.number().int().min(0).max(365).optional(),
  grace_period_days: z.number().int().min(0).max(90).optional(),
  external_plan_id: z.string().max(200).nullable().optional(),
  entitlements: z.array(entitlementSchema).min(1),
});

// ---------------------------------------------------------------------------
// Assinaturas (Empresa)
// ---------------------------------------------------------------------------

export const requestPlanChangeSchema = z.object({
  requested_plan_version_id: z.string().uuid("ID da versão do plano inválido"),
  billing_interval: z.enum(["monthly", "annual"], {
    errorMap: () => ({ message: "Intervalo de cobrança deve ser 'monthly' ou 'annual'" }),
  }),
});

// ---------------------------------------------------------------------------
// Suporte
// ---------------------------------------------------------------------------

export const createSupportTicketSchema = z.object({
  subject: z.string().min(5, "Assunto deve ter pelo menos 5 caracteres").max(200),
  description: z.string().min(10, "Descrição deve ter pelo menos 10 caracteres").max(5000),
  priority: z.enum(["low", "medium", "high", "urgent"]).optional(),
});

// ---------------------------------------------------------------------------
// Admin: Gerenciamento de Assinaturas
// ---------------------------------------------------------------------------

export const adminManageSubscriptionSchema = z.object({
  subscription_id: z.string().uuid(),
  action: z.enum(["activate", "pause", "cancel", "extend_trial"]),
  metadata: z.record(z.unknown()).optional(),
});

// ---------------------------------------------------------------------------
// Admin: Tickets de Suporte
// ---------------------------------------------------------------------------

export const adminUpdateTicketSchema = z.object({
  status: z.enum(["open", "in_progress", "waiting_customer", "resolved", "closed"]),
  assigned_admin_id: z.string().uuid().nullable().optional(),
});

// ---------------------------------------------------------------------------
// Export types inferidos
// ---------------------------------------------------------------------------

export type CreatePlanInput = z.infer<typeof createPlanSchema>;
export type UpdatePlanInput = z.infer<typeof updatePlanSchema>;
export type CreatePlanVersionInput = z.infer<typeof createPlanVersionSchema>;
export type RequestPlanChangeInput = z.infer<typeof requestPlanChangeSchema>;
export type CreateSupportTicketInput = z.infer<typeof createSupportTicketSchema>;
export type AdminManageSubscriptionInput = z.infer<typeof adminManageSubscriptionSchema>;
export type AdminUpdateTicketInput = z.infer<typeof adminUpdateTicketSchema>;