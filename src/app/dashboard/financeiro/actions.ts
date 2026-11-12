"use server";

import { createClient } from "@/lib/supabase/server";
import { getActiveOrganization } from "@/lib/organizations";
import { revalidatePath } from "next/cache";
import {
  createAccountSchema,
  updateAccountSchema,
  createCategorySchema,
  updateCategorySchema,
  createReceivableSchema,
  installmentReceivableSchema,
  createPayableSchema,
  installmentPayableSchema,
  registerPaymentSchema,
  allocatePaymentSchema,
  reversePaymentSchema,
  transferSchema,
  generateFromOrderSchema,
} from "./schemas";

// ============================================================================
// CONTEXT HELPER (same pattern as estoque/actions.ts and vendas/order-actions.ts)
// ============================================================================

async function getCtx() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Não autenticado");
  const activeData = await getActiveOrganization();
  if (!activeData) throw new Error("Nenhuma organização ativa");
  return { supabase, user, orgId: activeData.org.id };
}

function reval() {
  revalidatePath("/dashboard/financeiro", "layout");
}

// ============================================================================
// FINANCIAL ACCOUNTS
// ============================================================================

export async function getAccounts() {
  const { supabase, orgId } = await getCtx();
  const { data, error } = await supabase
    .from("financial_accounts")
    .select("*")
    .eq("organization_id", orgId)
    .order("name");
  if (error) throw error;
  return data ?? [];
}

export async function getAccountBalance(accountId: string) {
  const { supabase, orgId } = await getCtx();
  const { data, error } = await supabase
    .from("financial_transactions")
    .select("amount")
    .eq("organization_id", orgId)
    .eq("financial_account_id", accountId);
  if (error) throw error;
  return (data ?? []).reduce((sum, t) => sum + Number(t.amount), 0);
}

export async function createAccount(input: unknown) {
  const parsed = createAccountSchema.parse(input);
  const { supabase, orgId, user } = await getCtx();

  const { data: account, error } = await supabase
    .from("financial_accounts")
    .insert({
      organization_id: orgId,
      name: parsed.name,
      account_type: parsed.account_type,
      institution_name: parsed.institution_name ?? null,
      description: parsed.description ?? null,
    })
    .select("id")
    .single();
  if (error) throw error;

  // Create opening balance transaction if > 0
  if (parsed.opening_balance && parsed.opening_balance > 0) {
    const { error: txErr } = await supabase.from("financial_transactions").insert({
      organization_id: orgId,
      financial_account_id: account.id,
      transaction_type: "opening_balance",
      amount: parsed.opening_balance,
      occurred_at: new Date().toISOString(),
      description: "Saldo inicial",
      created_by: user.id,
    });
    if (txErr) throw txErr;
  }

  await supabase.rpc("log_audit", { p_org_id: orgId, p_actor: user.id, p_action: "account_created", p_module: "accounts", p_resource_type: "financial_account", p_resource_id: account.id });
  reval();
  return { success: true, id: account.id };
}

export async function updateAccount(id: string, input: unknown) {
  const parsed = updateAccountSchema.parse(input);
  const { supabase, orgId, user } = await getCtx();

  const { error } = await supabase
    .from("financial_accounts")
    .update({
      name: parsed.name,
      account_type: parsed.account_type,
      institution_name: parsed.institution_name ?? null,
      description: parsed.description ?? null,
      is_active: parsed.is_active,
    })
    .eq("id", id)
    .eq("organization_id", orgId);
  if (error) throw error;

  await supabase.rpc("log_audit", { p_org_id: orgId, p_actor: user.id, p_action: "account_updated", p_module: "accounts", p_resource_type: "financial_account", p_resource_id: id });
  reval();
  return { success: true };
}

export async function archiveAccount(id: string) {
  const { supabase, orgId, user } = await getCtx();

  // Check balance before archiving
  const { data: txns } = await supabase
    .from("financial_transactions")
    .select("amount")
    .eq("organization_id", orgId)
    .eq("financial_account_id", id);
  const balance = (txns ?? []).reduce((sum, t) => sum + Number(t.amount), 0);
  if (Math.abs(balance) > 0.01) {
    throw new Error(`Não é possível arquivar conta com saldo diferente de zero. Saldo atual: R$ ${balance.toFixed(2)}`);
  }

  const { error } = await supabase
    .from("financial_accounts")
    .update({ is_active: false })
    .eq("id", id)
    .eq("organization_id", orgId);
  if (error) throw error;

  await supabase.rpc("log_audit", { p_org_id: orgId, p_actor: user.id, p_action: "account_archived", p_module: "accounts", p_resource_type: "financial_account", p_resource_id: id });
  reval();
  return { success: true };
}

// ============================================================================
// FINANCIAL CATEGORIES
// ============================================================================

export async function getCategories(type?: "income" | "expense") {
  const { supabase, orgId } = await getCtx();
  let query = supabase
    .from("financial_categories")
    .select("*")
    .eq("organization_id", orgId)
    .order("name");
  if (type) query = query.eq("category_type", type);
  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

export async function createCategory(input: unknown) {
  const parsed = createCategorySchema.parse(input);
  const { supabase, orgId, user } = await getCtx();

  const { data, error } = await supabase.from("financial_categories").insert({
    organization_id: orgId,
    name: parsed.name,
    category_type: parsed.category_type,
    parent_id: parsed.parent_id ?? null,
  }).select("id").single();
  if (error) throw error;

  await supabase.rpc("log_audit", { p_org_id: orgId, p_actor: user.id, p_action: "category_created", p_module: "categories", p_resource_type: "financial_category", p_resource_id: data.id });
  reval();
  return { success: true };
}

export async function updateCategory(id: string, input: unknown) {
  const parsed = updateCategorySchema.parse(input);
  const { supabase, orgId, user } = await getCtx();

  const { error } = await supabase
    .from("financial_categories")
    .update({
      name: parsed.name,
      category_type: parsed.category_type,
      parent_id: parsed.parent_id ?? null,
      is_active: parsed.is_active,
    })
    .eq("id", id)
    .eq("organization_id", orgId);
  if (error) throw error;

  await supabase.rpc("log_audit", { p_org_id: orgId, p_actor: user.id, p_action: "category_updated", p_module: "categories", p_resource_type: "financial_category", p_resource_id: id });
  reval();
  return { success: true };
}

export async function archiveCategory(id: string) {
  const { supabase, orgId, user } = await getCtx();
  const { error } = await supabase
    .from("financial_categories")
    .update({ is_active: false })
    .eq("id", id)
    .eq("organization_id", orgId);
  if (error) throw error;

  await supabase.rpc("log_audit", { p_org_id: orgId, p_actor: user.id, p_action: "category_archived", p_module: "categories", p_resource_type: "financial_category", p_resource_id: id });
  reval();
  return { success: true };
}

// ============================================================================
// RECEIVABLES
// ============================================================================

export async function getReceivables(filters?: {
  status?: string;
  customer_id?: string;
  category_id?: string;
  date_from?: string;
  date_to?: string;
  search?: string;
  page?: number;
  perPage?: number;
}) {
  const { supabase, orgId } = await getCtx();
  const page = filters?.page ?? 1;
  const perPage = filters?.perPage ?? 20;
  const from = (page - 1) * perPage;
  const to = from + perPage - 1;

  let query = supabase
    .from("receivables")
    .select(`*, customer:customers(id, name, email), category:financial_categories(id, name)`, { count: "exact" })
    .eq("organization_id", orgId)
    .order("due_date", { ascending: false })
    .range(from, to);

  if (filters?.status && filters.status !== "all") query = query.eq("status", filters.status);
  if (filters?.customer_id) query = query.eq("customer_id", filters.customer_id);
  if (filters?.category_id) query = query.eq("category_id", filters.category_id);
  if (filters?.date_from) query = query.gte("due_date", filters.date_from);
  if (filters?.date_to) query = query.lte("due_date", filters.date_to);
  if (filters?.search) query = query.ilike("description", `%${filters.search}%`);

  const { data, error, count } = await query;
  if (error) throw error;
  return { receivables: data ?? [], total: count ?? 0 };
}

export async function getReceivableById(id: string) {
  const { supabase, orgId } = await getCtx();
  const { data, error } = await supabase
    .from("receivables")
    .select(`*, customer:customers(id, name, email), category:financial_categories(id, name), order:orders(id, document_number), allocations:payment_allocations(*, payment:financial_payments(id, payment_method, paid_at, description))`)
    .eq("id", id)
    .eq("organization_id", orgId)
    .single();
  if (error) {
    if (error.code === "PGRST116") return null;
    throw error;
  }
  return data;
}

export async function createReceivable(input: unknown) {
  const parsed = createReceivableSchema.parse(input);
  const { supabase, orgId, user } = await getCtx();

  const { data, error } = await supabase
    .from("receivables")
    .insert({
      organization_id: orgId,
      customer_id: parsed.customer_id,
      order_id: parsed.order_id ?? null,
      description: parsed.description,
      original_amount: parsed.original_amount,
      issue_date: parsed.issue_date,
      due_date: parsed.due_date,
      category_id: parsed.category_id ?? null,
      created_by: user.id,
    })
    .select("id")
    .single();
  if (error) throw error;

  await supabase.rpc("log_audit", { p_org_id: orgId, p_actor: user.id, p_action: "receivable_created", p_module: "receivables", p_resource_type: "receivable", p_resource_id: data.id });
  reval();
  return { success: true, id: data.id };
}

export async function createInstallmentReceivables(input: unknown) {
  const parsed = installmentReceivableSchema.parse(input);
  const { supabase, orgId, user } = await getCtx();

  const groupId = crypto.randomUUID();
  const baseAmount = Math.trunc((parsed.total_amount / parsed.installments_count) * 100) / 100;
  const remainder = Math.round((parsed.total_amount - baseAmount * parsed.installments_count) * 100) / 100;

  const rows = [];
  for (let i = 1; i <= parsed.installments_count; i++) {
    const dueDate = new Date(parsed.first_due_date);
    dueDate.setDate(dueDate.getDate() + (i - 1) * parsed.interval_days);
    const amount = i === parsed.installments_count ? baseAmount + remainder : baseAmount;

    rows.push({
      organization_id: orgId,
      customer_id: parsed.customer_id,
      order_id: parsed.order_id ?? null,
      description: `${parsed.description} (${i}/${parsed.installments_count})`,
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

  const { error } = await supabase.from("receivables").insert(rows);
  if (error) throw error;

  reval();
  return { success: true, group_id: groupId, count: rows.length };
}

export async function cancelReceivable(id: string) {
  const { supabase, orgId, user } = await getCtx();

  const { data: current } = await supabase
    .from("receivables")
    .select("status, amount_received")
    .eq("id", id)
    .eq("organization_id", orgId)
    .single();
  if (!current) throw new Error("Recebível não encontrado");
  if (Number(current.amount_received) > 0) {
    throw new Error("Não é possível cancelar recebível com pagamentos parciais. Faça o estorno dos pagamentos primeiro.");
  }

  const { error } = await supabase
    .from("receivables")
    .update({ status: "cancelled" })
    .eq("id", id)
    .eq("organization_id", orgId);
  if (error) throw error;

  await supabase.rpc("log_audit", { p_org_id: orgId, p_actor: user.id, p_action: "receivable_cancelled", p_module: "receivables", p_resource_type: "receivable", p_resource_id: id });
  reval();
  return { success: true };
}

// ============================================================================
// PAYABLES
// ============================================================================

export async function getPayables(filters?: {
  status?: string;
  category_id?: string;
  date_from?: string;
  date_to?: string;
  search?: string;
  page?: number;
  perPage?: number;
}) {
  const { supabase, orgId } = await getCtx();
  const page = filters?.page ?? 1;
  const perPage = filters?.perPage ?? 20;
  const from = (page - 1) * perPage;
  const to = from + perPage - 1;

  let query = supabase
    .from("payables")
    .select(`*, category:financial_categories(id, name)`, { count: "exact" })
    .eq("organization_id", orgId)
    .order("due_date", { ascending: false })
    .range(from, to);

  if (filters?.status && filters.status !== "all") query = query.eq("status", filters.status);
  if (filters?.category_id) query = query.eq("category_id", filters.category_id);
  if (filters?.date_from) query = query.gte("due_date", filters.date_from);
  if (filters?.date_to) query = query.lte("due_date", filters.date_to);
  if (filters?.search) query = query.or(`counterparty_name.ilike.%${filters.search}%,description.ilike.%${filters.search}%`);

  const { data, error, count } = await query;
  if (error) throw error;
  return { payables: data ?? [], total: count ?? 0 };
}

export async function getPayableById(id: string) {
  const { supabase, orgId } = await getCtx();
  const { data, error } = await supabase
    .from("payables")
    .select(`*, category:financial_categories(id, name), allocations:payment_allocations(*, payment:financial_payments(id, payment_method, paid_at, description))`)
    .eq("id", id)
    .eq("organization_id", orgId)
    .single();
  if (error) {
    if (error.code === "PGRST116") return null;
    throw error;
  }
  return data;
}

export async function createPayable(input: unknown) {
  const parsed = createPayableSchema.parse(input);
  const { supabase, orgId, user } = await getCtx();

  const { data, error } = await supabase
    .from("payables")
    .insert({
      organization_id: orgId,
      counterparty_name: parsed.counterparty_name,
      description: parsed.description,
      original_amount: parsed.original_amount,
      issue_date: parsed.issue_date,
      due_date: parsed.due_date,
      category_id: parsed.category_id ?? null,
      created_by: user.id,
    })
    .select("id")
    .single();
  if (error) throw error;

  await supabase.rpc("log_audit", { p_org_id: orgId, p_actor: user.id, p_action: "payable_created", p_module: "payables", p_resource_type: "payable", p_resource_id: data.id });
  reval();
  return { success: true, id: data.id };
}

export async function createInstallmentPayables(input: unknown) {
  const parsed = installmentPayableSchema.parse(input);
  const { supabase, orgId, user } = await getCtx();

  const groupId = crypto.randomUUID();
  const baseAmount = Math.trunc((parsed.total_amount / parsed.installments_count) * 100) / 100;
  const remainder = Math.round((parsed.total_amount - baseAmount * parsed.installments_count) * 100) / 100;

  const rows = [];
  for (let i = 1; i <= parsed.installments_count; i++) {
    const dueDate = new Date(parsed.first_due_date);
    dueDate.setDate(dueDate.getDate() + (i - 1) * parsed.interval_days);
    const amount = i === parsed.installments_count ? baseAmount + remainder : baseAmount;

    rows.push({
      organization_id: orgId,
      counterparty_name: parsed.counterparty_name,
      description: `${parsed.description} (${i}/${parsed.installments_count})`,
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

  const { error } = await supabase.from("payables").insert(rows);
  if (error) throw error;

  reval();
  return { success: true, group_id: groupId, count: rows.length };
}

export async function cancelPayable(id: string) {
  const { supabase, orgId, user } = await getCtx();

  const { data: current } = await supabase
    .from("payables")
    .select("status, amount_paid")
    .eq("id", id)
    .eq("organization_id", orgId)
    .single();
  if (!current) throw new Error("Pagável não encontrado");
  if (Number(current.amount_paid) > 0) {
    throw new Error("Não é possível cancelar pagável com pagamentos parciais. Faça o estorno dos pagamentos primeiro.");
  }

  const { error } = await supabase
    .from("payables")
    .update({ status: "cancelled" })
    .eq("id", id)
    .eq("organization_id", orgId);
  if (error) throw error;

  await supabase.rpc("log_audit", { p_org_id: orgId, p_actor: user.id, p_action: "payable_cancelled", p_module: "payables", p_resource_type: "payable", p_resource_id: id });
  reval();
  return { success: true };
}

// ============================================================================
// PAYMENTS
// ============================================================================

export async function registerInboundPayment(input: unknown) {
  const parsed = registerPaymentSchema.parse(input);
  const { supabase, orgId, user } = await getCtx();

  const { data, error } = await supabase.rpc("register_payment", {
    p_org_id: orgId,
    p_account_id: parsed.account_id,
    p_direction: "inbound",
    p_method: parsed.payment_method,
    p_gross_amount: parsed.gross_amount,
    p_fee_amount: parsed.fee_amount ?? 0,
    p_paid_at: parsed.paid_at,
    p_description: parsed.description ?? null,
    p_user_id: user.id,
    p_idempotency_key: parsed.idempotency_key ?? null,
  });
  if (error) throw error;

  await supabase.rpc("log_audit", { p_org_id: orgId, p_actor: user.id, p_action: "payment_registered_inbound", p_module: "payments", p_resource_type: "financial_payment", p_resource_id: data });
  reval();
  return { success: true, payment_id: data };
}

export async function registerOutboundPayment(input: unknown) {
  const parsed = registerPaymentSchema.parse(input);
  const { supabase, orgId, user } = await getCtx();

  const { data, error } = await supabase.rpc("register_payment", {
    p_org_id: orgId,
    p_account_id: parsed.account_id,
    p_direction: "outbound",
    p_method: parsed.payment_method,
    p_gross_amount: parsed.gross_amount,
    p_fee_amount: parsed.fee_amount ?? 0,
    p_paid_at: parsed.paid_at,
    p_description: parsed.description ?? null,
    p_user_id: user.id,
    p_idempotency_key: parsed.idempotency_key ?? null,
  });
  if (error) throw error;

  await supabase.rpc("log_audit", { p_org_id: orgId, p_actor: user.id, p_action: "payment_registered_outbound", p_module: "payments", p_resource_type: "financial_payment", p_resource_id: data });
  reval();
  return { success: true, payment_id: data };
}

export async function allocateToReceivable(paymentId: string, receivableId: string, amount: number) {
  const { supabase, orgId } = await getCtx();

  const { data, error } = await supabase.rpc("allocate_payment", {
    p_org_id: orgId,
    p_payment_id: paymentId,
    p_receivable_id: receivableId,
    p_payable_id: null,
    p_amount: amount,
  });
  if (error) throw error;

  reval();
  return { success: true, allocation_id: data };
}

export async function allocateToPayable(paymentId: string, payableId: string, amount: number) {
  const { supabase, orgId } = await getCtx();

  const { data, error } = await supabase.rpc("allocate_payment", {
    p_org_id: orgId,
    p_payment_id: paymentId,
    p_receivable_id: null,
    p_payable_id: payableId,
    p_amount: amount,
  });
  if (error) throw error;

  reval();
  return { success: true, allocation_id: data };
}

export async function reversePayment(paymentId: string, reason: string) {
  const { supabase, orgId, user } = await getCtx();

  const { data, error } = await supabase.rpc("reverse_payment", {
    p_org_id: orgId,
    p_payment_id: paymentId,
    p_reason: reason,
    p_user_id: user.id,
  });
  if (error) throw error;

  await supabase.rpc("log_audit", { p_org_id: orgId, p_actor: user.id, p_action: "payment_reversed", p_module: "payments", p_resource_type: "financial_payment", p_resource_id: paymentId, p_metadata: { reason } });

  reval();
  return { success: true, reversal_id: data };
}

export async function getPaymentHistory(targetId: string, targetType: "receivable" | "payable") {
  const { supabase, orgId } = await getCtx();
  const column = targetType === "receivable" ? "receivable_id" : "payable_id";

  const { data, error } = await supabase
    .from("payment_allocations")
    .select(`*, payment:financial_payments(*)`)
    .eq("organization_id", orgId)
    .eq(column, targetId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

// ============================================================================
// TRANSFERS
// ============================================================================

export async function transferBetweenAccounts(input: unknown) {
  const parsed = transferSchema.parse(input);
  const { supabase, orgId, user } = await getCtx();

  const { data, error } = await supabase.rpc("transfer_between_accounts", {
    p_org_id: orgId,
    p_from_account_id: parsed.from_account_id,
    p_to_account_id: parsed.to_account_id,
    p_amount: parsed.amount,
    p_description: parsed.description ?? null,
    p_user_id: user.id,
  });
  if (error) throw error;

  reval();
  return { success: true, transfer_group_id: data };
}

// ============================================================================
// GENERATE RECEIVABLES FROM ORDER
// ============================================================================

export async function generateReceivablesFromOrder(input: unknown) {
  const parsed = generateFromOrderSchema.parse(input);
  const { supabase, orgId, user } = await getCtx();

  const { data, error } = await supabase.rpc("generate_receivables_from_order", {
    p_org_id: orgId,
    p_order_id: parsed.order_id,
    p_installments: parsed.installments,
    p_first_due_date: parsed.first_due_date,
    p_interval_days: parsed.interval_days,
    p_category_id: parsed.category_id ?? null,
    p_user_id: user.id,
  });
  if (error) throw error;

  reval();
  revalidatePath("/dashboard/vendas/pedidos");
  return { success: true, receivable_ids: data };
}

// ============================================================================
// TRANSACTIONS & CASH FLOW
// ============================================================================

export async function getTransactions(filters?: {
  account_id?: string;
  category_id?: string;
  transaction_type?: string;
  date_from?: string;
  date_to?: string;
  page?: number;
  perPage?: number;
}) {
  const { supabase, orgId } = await getCtx();
  const page = filters?.page ?? 1;
  const perPage = filters?.perPage ?? 50;
  const from = (page - 1) * perPage;
  const to = from + perPage - 1;

  let query = supabase
    .from("financial_transactions")
    .select(`*, account:financial_accounts(id, name), category:financial_categories(id, name)`, { count: "exact" })
    .eq("organization_id", orgId)
    .order("occurred_at", { ascending: false })
    .range(from, to);

  if (filters?.account_id) query = query.eq("financial_account_id", filters.account_id);
  if (filters?.category_id) query = query.eq("category_id", filters.category_id);
  if (filters?.transaction_type && filters.transaction_type !== "all") query = query.eq("transaction_type", filters.transaction_type);
  if (filters?.date_from) query = query.gte("occurred_at", filters.date_from);
  if (filters?.date_to) query = query.lte("occurred_at", filters.date_to);

  const { data, error, count } = await query;
  if (error) throw error;
  return { transactions: data ?? [], total: count ?? 0 };
}

export async function getCashFlow(params: {
  date_from: string;
  date_to: string;
  account_id?: string;
  mode?: "realized" | "projected";
}) {
  const { supabase, orgId } = await getCtx();

  // Realized: sum of financial_transactions in period
  let txQuery = supabase
    .from("financial_transactions")
    .select("amount, occurred_at, transaction_type, description, category:financial_categories(id, name)")
    .eq("organization_id", orgId)
    .gte("occurred_at", params.date_from)
    .lte("occurred_at", params.date_to)
    .order("occurred_at", { ascending: true });

  if (params.account_id) txQuery = txQuery.eq("financial_account_id", params.account_id);

  const { data: transactions, error: txErr } = await txQuery;
  if (txErr) throw txErr;

  // Opening balance: sum of all transactions before date_from
  let openQuery = supabase
    .from("financial_transactions")
    .select("amount")
    .eq("organization_id", orgId)
    .lt("occurred_at", params.date_from);
  if (params.account_id) openQuery = openQuery.eq("financial_account_id", params.account_id);

  const { data: openData, error: openErr } = await openQuery;
  if (openErr) throw openErr;
  const openingBalance = (openData ?? []).reduce((sum, t) => sum + Number(t.amount), 0);

  let runningBalance = openingBalance;
  const entries = (transactions ?? []).map((t) => {
    runningBalance += Number(t.amount);
    return {
      date: t.occurred_at,
      type: t.transaction_type,
      amount: Number(t.amount),
      running_balance: runningBalance,
      category_name: (t.category as unknown as { name: string } | null)?.name ?? null,
      description: t.description,
    };
  });

  const totalIncome = entries.filter((e) => e.amount > 0).reduce((s, e) => s + e.amount, 0);
  const totalExpense = entries.filter((e) => e.amount < 0).reduce((s, e) => s + Math.abs(e.amount), 0);

  // Projected: add open receivables/payables with due_date in period
  let projectedReceivables = 0;
  let projectedPayables = 0;

  if (params.mode === "projected") {
    const { data: recvs } = await supabase
      .from("receivables")
      .select("original_amount, amount_received")
      .eq("organization_id", orgId)
      .in("status", ["open", "partially_received"])
      .gte("due_date", params.date_from)
      .lte("due_date", params.date_to);
    projectedReceivables = (recvs ?? []).reduce((s, r) => s + Number(r.original_amount) - Number(r.amount_received), 0);

    const { data: pays } = await supabase
      .from("payables")
      .select("original_amount, amount_paid")
      .eq("organization_id", orgId)
      .in("status", ["open", "partially_paid"])
      .gte("due_date", params.date_from)
      .lte("due_date", params.date_to);
    projectedPayables = (pays ?? []).reduce((s, p) => s + Number(p.original_amount) - Number(p.amount_paid), 0);
  }

  return {
    entries,
    opening_balance: openingBalance,
    closing_balance: runningBalance,
    total_income: totalIncome,
    total_expense: totalExpense,
    net_flow: totalIncome - totalExpense,
    projected_receivables: projectedReceivables,
    projected_payables: projectedPayables,
    projected_balance: runningBalance + projectedReceivables - projectedPayables,
  };
}

// ============================================================================
// FINANCIAL DASHBOARD
// ============================================================================

export async function getFinancialDashboard() {
  const { supabase, orgId } = await getCtx();
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString();

  // Total balance across all active accounts
  const { data: allTxns } = await supabase
    .from("financial_transactions")
    .select("amount")
    .eq("organization_id", orgId);
  const totalBalance = (allTxns ?? []).reduce((s, t) => s + Number(t.amount), 0);

  // Income/expense this month
  const { data: monthTxns } = await supabase
    .from("financial_transactions")
    .select("amount, transaction_type")
    .eq("organization_id", orgId)
    .gte("occurred_at", monthStart)
    .lte("occurred_at", monthEnd);

  let incomeMonth = 0;
  let expenseMonth = 0;
  for (const t of monthTxns ?? []) {
    const amt = Number(t.amount);
    if (amt > 0) incomeMonth += amt;
    else expenseMonth += Math.abs(amt);
  }

  // Receivables open/overdue
  const { data: recvs } = await supabase
    .from("receivables")
    .select("original_amount, amount_received, status, due_date")
    .eq("organization_id", orgId)
    .in("status", ["open", "partially_received", "overdue"]);

  let receivablesOpen = 0;
  let receivablesOverdue = 0;
  let receivablesAmountOpen = 0;
  const todayStr = now.toISOString().split("T")[0];
  for (const r of recvs ?? []) {
    const remaining = Number(r.original_amount) - Number(r.amount_received);
    receivablesAmountOpen += remaining;
    receivablesOpen++;
    if (r.due_date < todayStr && r.status !== "cancelled") receivablesOverdue++;
  }

  // Payables open/overdue
  const { data: pays } = await supabase
    .from("payables")
    .select("original_amount, amount_paid, status, due_date")
    .eq("organization_id", orgId)
    .in("status", ["open", "partially_paid", "overdue"]);

  let payablesOpen = 0;
  let payablesOverdue = 0;
  let payablesAmountOpen = 0;
  for (const p of pays ?? []) {
    const remaining = Number(p.original_amount) - Number(p.amount_paid);
    payablesAmountOpen += remaining;
    payablesOpen++;
    if (p.due_date < todayStr && p.status !== "cancelled") payablesOverdue++;
  }

  return {
    total_balance: totalBalance,
    income_this_month: incomeMonth,
    expense_this_month: expenseMonth,
    net_flow_this_month: incomeMonth - expenseMonth,
    receivables_open: receivablesOpen,
    receivables_overdue: receivablesOverdue,
    payables_open: payablesOpen,
    payables_overdue: payablesOverdue,
    receivables_amount_open: receivablesAmountOpen,
    payables_amount_open: payablesAmountOpen,
    projected_balance: totalBalance + receivablesAmountOpen - payablesAmountOpen,
  };
}