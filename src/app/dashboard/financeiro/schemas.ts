import { z } from "zod";

// ============================================================================
// FINANCIAL ACCOUNTS
// ============================================================================

export const createAccountSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório").max(100),
  account_type: z.enum(["bank_account", "cash", "digital_wallet", "payment_account", "other"]),
  institution_name: z.string().max(100).optional().nullable(),
  description: z.string().max(500).optional().nullable(),
  opening_balance: z.number().min(0, "Saldo inicial não pode ser negativo").optional().default(0),
});

export const updateAccountSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório").max(100),
  account_type: z.enum(["bank_account", "cash", "digital_wallet", "payment_account", "other"]),
  institution_name: z.string().max(100).optional().nullable(),
  description: z.string().max(500).optional().nullable(),
  is_active: z.boolean(),
});

export type CreateAccountInput = z.infer<typeof createAccountSchema>;
export type UpdateAccountInput = z.infer<typeof updateAccountSchema>;

// ============================================================================
// FINANCIAL CATEGORIES
// ============================================================================

export const createCategorySchema = z.object({
  name: z.string().min(1, "Nome é obrigatório").max(100),
  category_type: z.enum(["income", "expense"]),
  parent_id: z.string().uuid().optional().nullable(),
});

export const updateCategorySchema = z.object({
  name: z.string().min(1, "Nome é obrigatório").max(100),
  category_type: z.enum(["income", "expense"]),
  parent_id: z.string().uuid().optional().nullable(),
  is_active: z.boolean(),
});

export type CreateCategoryInput = z.infer<typeof createCategorySchema>;
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>;

// ============================================================================
// RECEIVABLES
// ============================================================================

export const createReceivableSchema = z.object({
  customer_id: z.string().uuid("Cliente é obrigatório"),
  order_id: z.string().uuid().optional().nullable(),
  description: z.string().min(1, "Descrição é obrigatória").max(500),
  original_amount: z.number().positive("Valor deve ser maior que zero"),
  issue_date: z.string().min(1, "Data de emissão é obrigatória"),
  due_date: z.string().min(1, "Data de vencimento é obrigatória"),
  category_id: z.string().uuid().optional().nullable(),
});

export const installmentReceivableSchema = z.object({
  customer_id: z.string().uuid("Cliente é obrigatório"),
  order_id: z.string().uuid().optional().nullable(),
  description: z.string().min(1, "Descrição é obrigatória").max(500),
  total_amount: z.number().positive("Valor total deve ser maior que zero"),
  installments_count: z.number().int().min(1).max(48, "Máximo de 48 parcelas"),
  first_due_date: z.string().min(1, "Primeiro vencimento é obrigatório"),
  interval_days: z.number().int().min(1).max(365).default(30),
  category_id: z.string().uuid().optional().nullable(),
});

export type CreateReceivableInput = z.infer<typeof createReceivableSchema>;
export type InstallmentReceivableInput = z.infer<typeof installmentReceivableSchema>;

// ============================================================================
// PAYABLES
// ============================================================================

export const createPayableSchema = z.object({
  counterparty_name: z.string().min(1, "Fornecedor/destinatário é obrigatório").max(200),
  description: z.string().min(1, "Descrição é obrigatória").max(500),
  original_amount: z.number().positive("Valor deve ser maior que zero"),
  issue_date: z.string().min(1, "Data de emissão é obrigatória"),
  due_date: z.string().min(1, "Data de vencimento é obrigatória"),
  category_id: z.string().uuid().optional().nullable(),
});

export const installmentPayableSchema = z.object({
  counterparty_name: z.string().min(1, "Fornecedor/destinatário é obrigatório").max(200),
  description: z.string().min(1, "Descrição é obrigatória").max(500),
  total_amount: z.number().positive("Valor total deve ser maior que zero"),
  installments_count: z.number().int().min(1).max(48, "Máximo de 48 parcelas"),
  first_due_date: z.string().min(1, "Primeiro vencimento é obrigatório"),
  interval_days: z.number().int().min(1).max(365).default(30),
  category_id: z.string().uuid().optional().nullable(),
});

export type CreatePayableInput = z.infer<typeof createPayableSchema>;
export type InstallmentPayableInput = z.infer<typeof installmentPayableSchema>;

// ============================================================================
// PAYMENTS
// ============================================================================

export const registerPaymentSchema = z.object({
  account_id: z.string().uuid("Conta financeira é obrigatória"),
  payment_method: z.enum(["pix", "cash", "bank_transfer", "boleto", "debit_card", "credit_card", "other"]),
  gross_amount: z.number().positive("Valor bruto deve ser maior que zero"),
  fee_amount: z.number().min(0, "Taxa não pode ser negativa").default(0),
  paid_at: z.string().min(1, "Data do pagamento é obrigatória"),
  description: z.string().max(500).optional().nullable(),
  idempotency_key: z.string().optional().nullable(),
});

export const allocatePaymentSchema = z.object({
  payment_id: z.string().uuid(),
  receivable_id: z.string().uuid().optional().nullable(),
  payable_id: z.string().uuid().optional().nullable(),
  amount: z.number().positive("Valor da alocação deve ser maior que zero"),
}).refine(
  (data) =>
    (data.receivable_id != null && data.payable_id == null) ||
    (data.receivable_id == null && data.payable_id != null),
  { message: "Informe exatamente um destino: recebível ou pagável" }
);

export const reversePaymentSchema = z.object({
  payment_id: z.string().uuid(),
  reason: z.string().min(1, "Motivo do estorno é obrigatório").max(500),
});

export type RegisterPaymentInput = z.infer<typeof registerPaymentSchema>;
export type AllocatePaymentInput = z.infer<typeof allocatePaymentSchema>;
export type ReversePaymentInput = z.infer<typeof reversePaymentSchema>;

// ============================================================================
// TRANSFERS
// ============================================================================

export const transferSchema = z.object({
  from_account_id: z.string().uuid("Conta de origem é obrigatória"),
  to_account_id: z.string().uuid("Conta de destino é obrigatória"),
  amount: z.number().positive("Valor deve ser maior que zero"),
  description: z.string().max(500).optional().nullable(),
}).refine((data) => data.from_account_id !== data.to_account_id, {
  message: "Conta de origem e destino devem ser diferentes",
  path: ["to_account_id"],
});

export type TransferInput = z.infer<typeof transferSchema>;

// ============================================================================
// GENERATE RECEIVABLES FROM ORDER
// ============================================================================

export const generateFromOrderSchema = z.object({
  order_id: z.string().uuid(),
  installments: z.number().int().min(1).max(48).default(1),
  first_due_date: z.string().min(1),
  interval_days: z.number().int().min(1).max(365).default(30),
  category_id: z.string().uuid().optional().nullable(),
});

export type GenerateFromOrderInput = z.infer<typeof generateFromOrderSchema>;