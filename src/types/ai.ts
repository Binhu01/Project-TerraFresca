// ============================================================================
// NEXORA FASE 11 — Nexora Intelligence: Tipos TypeScript
// ============================================================================

// --- CONVERSATIONS ---

export interface AiConversation {
  id: string;
  organization_id: string;
  user_id: string;
  title: string;
  created_at: string;
  updated_at: string;
  archived_at: string | null;
}

export interface CreateConversationInput {
  title?: string;
}

// --- MESSAGES ---

export type AiMessageRole = "user" | "assistant" | "system" | "tool";

export interface AiMessage {
  id: string;
  organization_id: string;
  conversation_id: string;
  role: AiMessageRole;
  content: string;
  message_metadata: Record<string, unknown>;
  created_at: string;
}

export interface AiMessageWithTools extends AiMessage {
  tool_calls?: Array<{
    id: string;
    name: string;
    arguments: Record<string, unknown>;
  }>;
  tool_result_for?: string;
}

// --- USAGE RECORDS ---

export type AiOperationType = "chat" | "insight" | "summary" | "tool_call";
export type AiUsageStatus = "success" | "error" | "timeout" | "rate_limited";

export interface AiUsageRecord {
  id: string;
  organization_id: string;
  user_id: string;
  provider: string;
  model: string;
  operation_type: AiOperationType;
  input_tokens: number | null;
  output_tokens: number | null;
  estimated_cost: number | null;
  status: AiUsageStatus;
  error_message: string | null;
  created_at: string;
}

export interface AiUsageStats {
  today_requests: number;
  today_count: number;
  month_requests: number;
  total_cost_month: number;
  total_count: number;
  errors_today: number;
}

// --- SETTINGS ---

export interface AiSettings {
  id: string;
  organization_id: string;
  is_enabled: boolean;
  usage_limit_monthly: number;
  daily_limit: number;
  max_tokens_per_request: number;
  max_tokens_per_message: number;
  allowed_roles: string[];
  custom_instructions: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface UpdateAiSettingsInput {
  is_enabled?: boolean;
  usage_limit_monthly?: number;
  daily_limit?: number;
  max_tokens_per_request?: number;
  max_tokens_per_message?: number;
  allowed_roles?: string[];
  custom_instructions?: string;
}

// --- INSIGHTS ---

export type AiInsightType =
  | "sales_trend"
  | "expense_alert"
  | "stock_critical"
  | "overdue_receivable"
  | "lead_stale"
  | "order_delayed"
  | "performance_change"
  | "custom";

export type AiInsightStatus = "active" | "acknowledged" | "dismissed";

export interface AiInsight {
  id: string;
  organization_id: string;
  insight_type: AiInsightType;
  title: string;
  description: string;
  evidence_metadata: Record<string, unknown>;
  reference_type: string | null;
  reference_id: string | null;
  period_start: string | null;
  period_end: string | null;
  status: AiInsightStatus;
  generated_at: string;
  created_at: string;
}

// --- CHAT SERVICE TYPES ---

export interface ChatRequest {
  conversation_id: string;
  message: string;
}

export interface ChatStreamEvent {
  type: "text_delta" | "tool_use" | "tool_result" | "done" | "error";
  content?: string;
  tool_name?: string;
  tool_arguments?: Record<string, unknown>;
  tool_result?: unknown;
  error?: string;
}

export interface ToolDefinition {
  name: string;
  description: string;
  parameters: Record<string, unknown>; // JSON Schema
  required_permissions: string[];
}

// --- TOOL RESULT TYPES (structured returns for AI tools) ---

export interface ToolSalesSummary {
  period: string;
  total_orders: number;
  total_revenue: number;
  completed_orders: number;
  avg_ticket: number;
  gross_margin: number;
  margin_rate: number;
}

export interface ToolStockAlert {
  product_id: string;
  product_name: string;
  sku: string | null;
  quantity_available: number;
  minimum_stock: number;
  warehouse_name: string;
}

export interface ToolFinancialSummary {
  total_received: number;
  total_paid: number;
  account_balance: number;
  open_receivables: number;
  open_payables: number;
  overdue_receivables: number;
  overdue_payables: number;
}

export interface ToolCustomerSummary {
  customer_id: string;
  name: string;
  email: string | null;
  phone: string | null;
  type: string;
  status: string;
  total_orders: number;
  total_spent: number;
  last_order_date: string | null;
}

export interface ToolLeadSummary {
  lead_id: string;
  name: string;
  company: string | null;
  stage: string;
  value: number;
  source: string;
  assigned_to: string | null;
  next_follow_up: string | null;
  days_without_contact: number;
}

export interface ToolTaskSummary {
  task_id: string;
  title: string;
  status: string;
  priority: string;
  due_date: string | null;
  assignee_name: string | null;
  is_overdue: boolean;
}

export interface ToolPurchaseOrderSummary {
  order_id: string;
  purchase_number: string;
  supplier_name: string;
  status: string;
  total_amount: number;
  expected_delivery: string | null;
  items_pending: number;
}

// --- DASHBOARD DATA ---

export interface AiDashboardData {
  conversations: AiConversation[];
  insights: AiInsight[];
  settings: AiSettings | null;
  usage_stats: AiUsageStats | null;
  is_configured: boolean;
  is_enabled: boolean;
}