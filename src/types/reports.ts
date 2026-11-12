// Nexora Fase 08 — Reports & BI Types

// ============================================================================
// DATE RANGE & FILTERS
// ============================================================================

export type DatePreset =
  | "today"
  | "yesterday"
  | "last_7_days"
  | "last_30_days"
  | "this_week"
  | "last_week"
  | "this_month"
  | "last_month"
  | "this_quarter"
  | "this_year"
  | "last_year"
  | "custom";

export interface DateRange {
  from: string; // ISO date YYYY-MM-DD
  to: string; // ISO date YYYY-MM-DD
  preset?: DatePreset;
}

export interface ComparisonRange {
  current: DateRange;
  previous: DateRange;
}

export interface ReportFilters {
  dateRange: DateRange;
  compareWith?: DateRange;
  status?: string;
  customerId?: string;
  channelId?: string;
  categoryId?: string;
  productId?: string;
  warehouseId?: string;
  accountId?: string;
  departmentId?: string;
  userId?: string;
  search?: string;
  page?: number;
  perPage?: number;
}

// ============================================================================
// SALES REPORTS
// ============================================================================

export interface SalesSummaryRow {
  organization_id: string;
  order_id: string;
  document_number: string;
  status: string;
  channel_id: string | null;
  channel_name: string | null;
  customer_id: string | null;
  customer_name: string | null;
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  issued_at: string | null;
  completed_at: string | null;
  created_at: string;
  total_cost: number;
  gross_margin: number;
}

export interface SalesKPIs {
  totalOrders: number;
  totalRevenue: number;
  completedOrders: number;
  avgTicket: number;
  grossMargin: number;
  marginRate: number;
  previousTotalOrders: number | null;
  previousTotalRevenue: number | null;
  ordersChange: number | null;
  revenueChange: number | null;
}

export interface SalesByChannel {
  channelName: string;
  orderCount: number;
  totalRevenue: number;
  avgTicket: number;
  percentage: number;
}

export interface SalesByPeriod {
  period: string; // YYYY-MM or YYYY-MM-DD depending on granularity
  orderCount: number;
  totalRevenue: number;
}

export interface TopCustomer {
  customerId: string;
  customerName: string;
  orderCount: number;
  totalRevenue: number;
}

export interface TopProduct {
  productId: string;
  productName: string;
  sku: string | null;
  quantitySold: number;
  totalRevenue: number;
}

// ============================================================================
// CRM REPORTS
// ============================================================================

export interface PipelineFunnelStage {
  stageId: string;
  stageName: string;
  position: number;
  isWon: boolean;
  isLost: boolean;
  leadCount: number;
  totalValue: number;
  convertedCount: number;
}

export interface CRMKPIs {
  totalActiveCustomers: number;
  newCustomersInPeriod: number;
  totalLeads: number;
  wonLeads: number;
  lostLeads: number;
  conversionRate: number;
  pipelineValue: number;
  previousNewCustomers: number | null;
  previousLeads: number | null;
  customersChange: number | null;
  leadsChange: number | null;
}

export interface LeadsBySource {
  source: string;
  count: number;
  estimatedValue: number;
}

export interface LeadConversionTrend {
  period: string;
  created: number;
  won: number;
  lost: number;
  conversionRate: number;
}

// ============================================================================
// FINANCIAL REPORTS
// ============================================================================

export interface CashflowMonthlyRow {
  organization_id: string;
  month_start: string;
  total_income: number;
  total_expense: number;
  net_flow: number;
}

export interface FinancialKPIs {
  totalReceived: number;
  totalPaid: number;
  accountBalance: number;
  openReceivables: number;
  openPayables: number;
  overdueReceivables: number;
  overduePayables: number;
  netCashflow: number;
  previousReceived: number | null;
  previousPaid: number | null;
  receivedChange: number | null;
  paidChange: number | null;
}

export interface AgingBucket {
  bucket: "current" | "1_30" | "31_60" | "61_90" | "90_plus";
  label: string;
  count: number;
  totalAmount: number;
}

export interface ExpenseByCategory {
  categoryName: string;
  totalAmount: number;
  percentage: number;
}

export interface AccountBalanceSummary {
  accountId: string;
  accountName: string;
  accountType: string;
  balance: number;
}

// ============================================================================
// INVENTORY REPORTS
// ============================================================================

export interface InventoryValuationRow {
  organization_id: string;
  warehouse_id: string;
  warehouse_name: string;
  product_id: string;
  product_name: string;
  product_sku: string | null;
  variant_id: string | null;
  variant_name: string | null;
  variant_sku: string | null;
  quantity_on_hand: number;
  quantity_reserved: number;
  quantity_available: number;
  unit_cost: number;
  available_value: number;
  total_value: number;
}

export interface InventoryKPIs {
  totalProducts: number;
  lowStockProducts: number;
  outOfStockProducts: number;
  totalMovements: number;
  totalInventoryValue: number;
}

export interface MovementSummary {
  movementType: string;
  count: number;
  totalQuantity: number;
}

// ============================================================================
// TEAM REPORTS
// ============================================================================

export interface TeamPerformanceRow {
  organization_id: string;
  user_id: string;
  full_name: string | null;
  email: string;
  role: string;
  department_id: string | null;
  department_name: string | null;
  order_count: number;
  total_revenue: number;
  avg_ticket: number;
  first_order_at: string | null;
  last_order_at: string | null;
}

export interface TeamKPIs {
  activeMembers: number;
  membersByDepartment: Record<string, number>;
  pendingInvitations: number;
  acceptedInvitations: number;
}

// ============================================================================
// EXECUTIVE DASHBOARD
// ============================================================================

export interface ExecutiveDashboardData {
  sales: SalesKPIs;
  crm: CRMKPIs;
  financial: FinancialKPIs;
  inventory: InventoryKPIs;
  recentOrders: Array<{
    id: string;
    documentNumber: string;
    customerName: string | null;
    total: number;
    status: string;
    createdAt: string;
  }>;
  upcomingDue: Array<{
    id: string;
    description: string;
    amount: number;
    dueDate: string;
    type: "receivable" | "payable";
  }>;
  stockAlerts: Array<{
    productId: string;
    productName: string;
    quantityAvailable: number;
    minimumStock: number;
  }>;
}

// ============================================================================
// EXPORT
// ============================================================================

export type ExportFormat = "csv" | "xlsx" | "pdf";

export interface ExportRequest {
  reportType: string;
  format: ExportFormat;
  filters: ReportFilters;
  title: string;
}

// ============================================================================
// KPI CATALOG ENTRY
// ============================================================================

export interface KPICatalogEntry {
  key: string;
  name: string;
  description: string;
  formula: string;
  module: string;
  limitations?: string;
}

export const KPI_CATALOG: readonly KPICatalogEntry[] = [
  {
    key: "total_orders",
    name: "Total de pedidos",
    description: "Quantidade de pedidos registrados no período selecionado.",
    formula: "COUNT(orders) WHERE created_at BETWEEN date_from AND date_to",
    module: "sales",
  },
  {
    key: "total_revenue",
    name: "Valor total dos pedidos",
    description: "Soma dos valores totais dos pedidos no período. Não representa dinheiro recebido.",
    formula: "SUM(orders.total) WHERE created_at BETWEEN date_from AND date_to",
    module: "sales",
    limitations: "Inclui pedidos não pagos e cancelados conforme filtro de status aplicado.",
  },
  {
    key: "completed_orders",
    name: "Pedidos concluídos",
    description: "Quantidade de pedidos com status 'completed' no período.",
    formula: "COUNT(orders) WHERE status = 'completed' AND completed_at BETWEEN date_from AND date_to",
    module: "sales",
  },
  {
    key: "avg_ticket",
    name: "Ticket médio",
    description: "Valor médio por pedido no período.",
    formula: "SUM(orders.total) / COUNT(orders)",
    module: "sales",
  },
  {
    key: "gross_margin",
    name: "Margem bruta",
    description: "Diferença entre receita total e custo total dos itens vendidos.",
    formula: "SUM(orders.total) - SUM(order_items.cost_price_snapshot * order_items.quantity)",
    module: "sales",
    limitations: "Utiliza cost_price_snapshot registrado no momento da venda, não o custo atual do produto.",
  },
  {
    key: "quote_conversion_rate",
    name: "Taxa de conversão de orçamentos",
    description: "Percentual de orçamentos aceitos em relação ao total de orçamentos elegíveis.",
    formula: "COUNT(quotes WHERE status='accepted') / COUNT(quotes WHERE status NOT IN ('draft','cancelled'))",
    module: "sales",
    limitations: "Não conta rascunhos ou cancelados como propostas válidas.",
  },
  {
    key: "active_customers",
    name: "Clientes ativos",
    description: "Total de clientes com status ativo e não arquivados.",
    formula: "COUNT(customers) WHERE status = 'active' AND archived_at IS NULL",
    module: "crm",
  },
  {
    key: "new_customers",
    name: "Novos clientes",
    description: "Clientes cadastrados no período selecionado.",
    formula: "COUNT(customers) WHERE created_at BETWEEN date_from AND date_to",
    module: "crm",
  },
  {
    key: "lead_conversion_rate",
    name: "Taxa de conversão de leads",
    description: "Percentual de leads convertidos em relação ao total de leads do período.",
    formula: "COUNT(leads WHERE converted_at IS NOT NULL) / COUNT(leads)",
    module: "crm",
    limitations: "O denominador inclui todos os leads criados no período, independente do estágio atual.",
  },
  {
    key: "pipeline_value",
    name: "Valor do pipeline",
    description: "Soma dos valores estimados dos leads em andamento (não ganhos nem perdidos).",
    formula: "SUM(leads.estimated_value) WHERE stage.is_won = false AND stage.is_lost = false",
    module: "crm",
  },
  {
    key: "total_received",
    name: "Valor efetivamente recebido",
    description: "Soma dos pagamentos inbound liquidados no período.",
    formula: "SUM(financial_payments.gross_amount) WHERE payment_direction='inbound' AND paid_at BETWEEN date_from AND date_to AND reversal_of IS NULL",
    module: "financial",
    limitations: "Representa valor bruto recebido. Taxas são deduzidas separadamente.",
  },
  {
    key: "total_paid",
    name: "Valor efetivamente pago",
    description: "Soma dos pagamentos outbound liquidados no período.",
    formula: "SUM(financial_payments.gross_amount) WHERE payment_direction='outbound' AND paid_at BETWEEN date_from AND date_to AND reversal_of IS NULL",
    module: "financial",
  },
  {
    key: "account_balance",
    name: "Saldo das contas financeiras",
    description: "Soma dos saldos atuais de todas as contas financeiras ativas.",
    formula: "SUM(financial_transactions.amount) GROUP BY financial_account_id WHERE account.is_active = true",
    module: "financial",
  },
  {
    key: "open_receivables",
    name: "Contas a receber pendentes",
    description: "Soma dos saldos ainda não recebidos dos recebíveis não cancelados.",
    formula: "SUM(receivables.original_amount - receivables.amount_received) WHERE status NOT IN ('cancelled','fully_paid')",
    module: "financial",
  },
  {
    key: "open_payables",
    name: "Contas a pagar pendentes",
    description: "Soma dos saldos ainda não pagos das obrigações não canceladas.",
    formula: "SUM(payables.original_amount - payables.amount_paid) WHERE status NOT IN ('cancelled','fully_paid')",
    module: "financial",
  },
  {
    key: "overdue_receivables",
    name: "Recebíveis vencidos",
    description: "Soma dos saldos pendentes com data de vencimento anterior à data atual.",
    formula: "SUM(receivables.original_amount - receivables.amount_received) WHERE due_date < CURRENT_DATE AND status NOT IN ('cancelled','fully_paid')",
    module: "financial",
  },
  {
    key: "net_cashflow",
    name: "Fluxo de caixa líquido",
    description: "Diferença entre entradas e saídas realizadas no período.",
    formula: "SUM(financial_transactions.amount) WHERE reversal_of_transaction_id IS NULL AND occurred_at BETWEEN date_from AND date_to",
    module: "financial",
    limitations: "Transferências entre contas próprias são incluídas no cálculo. Para fluxo operacional, filtre por transaction_type.",
  },
  {
    key: "low_stock_products",
    name: "Produtos com estoque baixo",
    description: "Quantidade de produtos com estoque disponível menor ou igual ao mínimo configurado.",
    formula: "COUNT(inventory_balances) WHERE (quantity_on_hand - quantity_reserved) <= products.minimum_stock AND track_inventory = true",
    module: "inventory",
    limitations: "Considera reservas. Produtos sem controle de estoque (track_inventory=false) são excluídos.",
  },
  {
    key: "out_of_stock",
    name: "Produtos sem estoque",
    description: "Quantidade de produtos com estoque disponível igual a zero.",
    formula: "COUNT(inventory_balances) WHERE (quantity_on_hand - quantity_reserved) <= 0 AND track_inventory = true",
    module: "inventory",
  },
  {
    key: "operational_result",
    name: "Resultado operacional simplificado",
    description: "Diferença entre receitas e despesas realizadas no período. Indicador gerencial, não contábil.",
    formula: "Total recebido - Total pago (no período)",
    module: "financial",
    limitations: "NÃO é lucro contábil, DRE oficial ou resultado tributário. Não considera provisões, depreciação ou impostos.",
  },
] as const;