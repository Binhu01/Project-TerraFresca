// ============================================================================
// NEXORA — FINANCIAL MODULE TYPES
// ============================================================================

// --- Union Types ---

export type FinancialAccountType =
  | "bank_account"
  | "cash"
  | "digital_wallet"
  | "payment_account"
  | "other";

export type CategoryType = "income" | "expense";

export type PaymentDirection = "inbound" | "outbound";

export type PaymentMethod =
  | "pix"
  | "cash"
  | "bank_transfer"
  | "boleto"
  | "debit_card"
  | "credit_card"
  | "other";

export type ReceivableStatus =
  | "open"
  | "partially_received"
  | "received"
  | "overdue"
  | "cancelled";

export type PayableStatus =
  | "open"
  | "partially_paid"
  | "paid"
  | "overdue"
  | "cancelled";

export type TransactionType =
  | "opening_balance"
  | "income"
  | "expense"
  | "transfer_in"
  | "transfer_out"
  | "fee"
  | "reversal";

// --- Base Interfaces ---

export interface FinancialAccount {
  id: string;
  organization_id: string;
  name: string;
  account_type: FinancialAccountType;
  institution_name: string | null;
  description: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface FinancialCategory {
  id: string;
  organization_id: string;
  name: string;
  category_type: CategoryType;
  parent_id: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Receivable {
  id: string;
  organization_id: string;
  customer_id: string;
  order_id: string | null;
  description: string;
  original_amount: number;
  amount_received: number;
  issue_date: string;
  due_date: string;
  category_id: string | null;
  installment_group_id: string | null;
  installment_number: number | null;
  status: ReceivableStatus;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface Payable {
  id: string;
  organization_id: string;
  counterparty_name: string;
  description: string;
  original_amount: number;
  amount_paid: number;
  issue_date: string;
  due_date: string;
  category_id: string | null;
  installment_group_id: string | null;
  installment_number: number | null;
  status: PayableStatus;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface FinancialPayment {
  id: string;
  organization_id: string;
  financial_account_id: string;
  payment_direction: PaymentDirection;
  payment_method: PaymentMethod;
  gross_amount: number;
  fee_amount: number;
  net_amount: number;
  paid_at: string;
  description: string | null;
  reversal_of: string | null;
  created_by: string | null;
  idempotency_key: string | null;
  created_at: string;
}

export interface PaymentAllocation {
  id: string;
  organization_id: string;
  payment_id: string;
  receivable_id: string | null;
  payable_id: string | null;
  allocated_amount: number;
  created_at: string;
}

export interface FinancialTransaction {
  id: string;
  organization_id: string;
  financial_account_id: string;
  transaction_type: TransactionType;
  amount: number;
  occurred_at: string;
  category_id: string | null;
  payment_id: string | null;
  transfer_group_id: string | null;
  description: string | null;
  reference_type: string | null;
  reference_id: string | null;
  reversal_of_transaction_id: string | null;
  created_by: string | null;
  created_at: string;
}

// --- Extended / Joined Interfaces ---

export interface ReceivableWithDetails extends Receivable {
  customer?: { id: string; name: string; email?: string | null } | null;
  category?: { id: string; name: string } | null;
  order?: { id: string; document_number: string | null } | null;
  allocations?: Array<{
    id: string;
    allocated_amount: number;
    payment: {
      id: string;
      payment_method: PaymentMethod;
      paid_at: string;
      description: string | null;
    };
  }>;
}

export interface PayableWithDetails extends Payable {
  category?: { id: string; name: string } | null;
  allocations?: Array<{
    id: string;
    allocated_amount: number;
    payment: {
      id: string;
      payment_method: PaymentMethod;
      paid_at: string;
      description: string | null;
    };
  }>;
}

export interface FinancialAccountWithBalance extends FinancialAccount {
  balance: number;
}

// --- Dashboard & Reports ---

export interface CashFlowEntry {
  date: string;
  type: TransactionType;
  amount: number;
  running_balance: number;
  category_name?: string | null;
  description?: string | null;
  account_name?: string | null;
}

export interface CashFlowSummary {
  entries: CashFlowEntry[];
  total_income: number;
  total_expense: number;
  net_flow: number;
  opening_balance: number;
  closing_balance: number;
}

export interface FinancialDashboardStats {
  total_balance: number;
  income_this_month: number;
  expense_this_month: number;
  net_flow_this_month: number;
  receivables_open: number;
  receivables_overdue: number;
  payables_open: number;
  payables_overdue: number;
  receivables_amount_open: number;
  payables_amount_open: number;
  projected_balance: number;
}

export interface InstallmentPreview {
  number: number;
  due_date: string;
  amount: number;
}

// --- Filter Params ---

export interface ReceivableFilters {
  search?: string;
  status?: ReceivableStatus | "all";
  customer_id?: string;
  category_id?: string;
  date_from?: string;
  date_to?: string;
  page?: number;
  perPage?: number;
}

export interface PayableFilters {
  search?: string;
  status?: PayableStatus | "all";
  category_id?: string;
  date_from?: string;
  date_to?: string;
  page?: number;
  perPage?: number;
}

export interface TransactionFilters {
  account_id?: string;
  category_id?: string;
  transaction_type?: TransactionType | "all";
  date_from?: string;
  date_to?: string;
  page?: number;
  perPage?: number;
}

export interface CashFlowParams {
  mode: "realized" | "projected";
  date_from: string;
  date_to: string;
  account_id?: string;
  category_id?: string;
}