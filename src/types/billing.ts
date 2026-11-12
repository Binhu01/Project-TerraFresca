// ============================================================================
// NEXORA FASE 14: Tipos TypeScript — Billing, Subscriptions & Platform Admin
// ============================================================================

// ---------------------------------------------------------------------------
// Planos
// ---------------------------------------------------------------------------

export interface SubscriptionPlan {
 id: string;
 slug: string;
 name: string;
 description: string | null;
 is_active: boolean;
 is_featured: boolean;
 display_order: number;
 created_at: string;
 updated_at: string;
}

export interface SubscriptionPlanVersion {
 id: string;
 plan_id: string;
 version: number;
 monthly_price: number;
 annual_price: number;
 currency: string;
 trial_days: number;
 grace_period_days: number;
 published_at: string | null;
 valid_until: string | null;
 external_plan_id: string | null;
 created_at: string;
}

export interface PlanWithCurrentVersion extends SubscriptionPlan {
 current_version: SubscriptionPlanVersion | null;
}

// ---------------------------------------------------------------------------
// Entitlements
// ---------------------------------------------------------------------------

export interface PlanEntitlement {
 id: string;
 plan_version_id: string;
 feature_key: string;
 is_enabled: boolean;
 limit_value: number | null;
 limit_unit: string | null;
 configuration: Record<string, unknown>;
 created_at: string;
}

export type FeatureKey =
 | "team.users"
 | "team.owners"
 | "crm.customers"
 | "crm.leads"
 | "sales.orders"
 | "inventory.products"
 | "inventory.warehouses"
 | "finance.receivables"
 | "finance.payables"
 | "reports.basic"
 | "reports.advanced"
 | "ai.assistant"
 | "integrations.whatsapp"
 | "integrations.instagram"
 | "automations.rules";

export interface EntitlementMap {
 [key: string]: {
 is_enabled: boolean;
 limit_value: number | null;
 limit_unit: string | null;
 };
}

// ---------------------------------------------------------------------------
// Billing Customers
// ---------------------------------------------------------------------------

export interface BillingCustomer {
 id: string;
 organization_id: string;
 provider: string;
 external_customer_id: string;
 billing_email: string | null;
 created_at: string;
 updated_at: string;
}

// ---------------------------------------------------------------------------
// Subscriptions
// ---------------------------------------------------------------------------

export type SubscriptionStatus =
 | "trialing"
 | "active"
 | "past_due"
 | "grace_period"
 | "paused"
 | "canceled"
 | "expired"
 | "incomplete";

export type BillingInterval = "monthly" | "annual";

export interface Subscription {
 id: string;
 organization_id: string;
 plan_version_id: string;
 billing_provider: string;
 external_subscription_id: string | null;
 status: SubscriptionStatus;
 billing_interval: BillingInterval;
 current_period_start: string | null;
 current_period_end: string | null;
 trial_start: string | null;
 trial_end: string | null;
 cancel_at_period_end: boolean;
 canceled_at: string | null;
 created_at: string;
 updated_at: string;
}

export interface SubscriptionWithPlan extends Subscription {
 plan_name: string;
 plan_slug: string;
 monthly_price: number;
 annual_price: number;
 currency: string;
}

// ---------------------------------------------------------------------------
// Subscription Events
// ---------------------------------------------------------------------------

export type SubscriptionEventSource = "system" | "webhook" | "admin" | "user";

export interface SubscriptionEvent {
 id: string;
 organization_id: string;
 subscription_id: string;
 event_type: string;
 previous_status: string | null;
 new_status: string;
 source: SubscriptionEventSource;
 metadata: Record<string, unknown>;
 occurred_at: string;
}

// ---------------------------------------------------------------------------
// Invoices
// ---------------------------------------------------------------------------

export type InvoiceStatus =
 | "pending"
 | "approved"
 | "refused"
 | "processing"
 | "refunded"
 | "cancelled";

export interface SubscriptionInvoice {
 id: string;
 organization_id: string;
 subscription_id: string;
 external_invoice_id: string | null;
 amount: number;
 currency: string;
 due_at: string;
 paid_at: string | null;
 status: InvoiceStatus;
 document_url: string | null;
 created_at: string;
}

// ---------------------------------------------------------------------------
// Payment Events
// ---------------------------------------------------------------------------

export interface SubscriptionPaymentEvent {
 id: string;
 organization_id: string;
 subscription_id: string;
 external_payment_id: string;
 event_id: string;
 amount: number | null;
 currency: string;
 status: string;
 paid_at: string | null;
 created_at: string;
}

// ---------------------------------------------------------------------------
// Plan Changes (upgrade/downgrade)
// ---------------------------------------------------------------------------

export type PlanChangeType = "upgrade" | "downgrade";
export type PlanChangeStatus = "pending" | "applied" | "cancelled";

export interface PlanChange {
 id: string;
 organization_id: string;
 current_subscription_id: string;
 requested_plan_version_id: string;
 change_type: PlanChangeType;
 effective_at: string;
 status: PlanChangeStatus;
 requested_by: string;
 created_at: string;
}

// ---------------------------------------------------------------------------
// Usage Records
// ---------------------------------------------------------------------------

export interface OrganizationUsageRecord {
 id: string;
 organization_id: string;
 feature_key: string;
 usage_value: number;
 period_start: string;
 period_end: string;
 updated_at: string;
}

export interface UsageSummary {
 feature_key: string;
 current_usage: number;
 limit: number | null;
 limit_unit: string | null;
 percentage: number | null;
}

// ---------------------------------------------------------------------------
// Platform Admins
// ---------------------------------------------------------------------------

export type InternalRole = "super_admin" | "billing_admin" | "support";

export interface PlatformAdmin {
 id: string;
 user_id: string;
 internal_role: InternalRole;
 is_active: boolean;
 created_at: string;
 updated_at: string;
}

export interface PlatformAdminWithProfile extends PlatformAdmin {
 full_name: string | null;
 email: string;
 avatar_url: string | null;
}

// ---------------------------------------------------------------------------
// Platform Audit Logs
// ---------------------------------------------------------------------------

export interface PlatformAuditLog {
 id: string;
 actor_user_id: string;
 action: string;
 resource_type: string;
 resource_id: string | null;
 metadata: Record<string, unknown>;
 created_at: string;
}

// ---------------------------------------------------------------------------
// Support Tickets
// ---------------------------------------------------------------------------

export type TicketPriority = "low" | "medium" | "high" | "urgent";
export type TicketStatus = "open" | "in_progress" | "waiting_customer" | "resolved" | "closed";

export interface SupportTicket {
 id: string;
 organization_id: string;
 subject: string;
 description: string;
 priority: TicketPriority;
 status: TicketStatus;
 assigned_admin_id: string | null;
 created_by: string;
 created_at: string;
 updated_at: string;
}

// ---------------------------------------------------------------------------
// Dashboard Stats (Nexora Admin)
// ---------------------------------------------------------------------------

export interface AdminDashboardStats {
 total_organizations: number;
 active_organizations: number;
 trialing_organizations: number;
 active_subscriptions: number;
 past_due_subscriptions: number;
 canceled_subscriptions: number;
 pending_invoices: number;
 failed_payments_last_30d: number;
 new_orgs_last_30d: number;
 plan_distribution: Array<{
 plan_slug: string;
 plan_name: string;
 count: number;
 }>;
}

// ---------------------------------------------------------------------------
// Input types for server actions
// ---------------------------------------------------------------------------

export interface CreatePlanInput {
 slug: string;
 name: string;
 description?: string;
 is_active?: boolean;
 is_featured?: boolean;
 display_order?: number;
 monthly_price: number;
 annual_price: number;
 trial_days?: number;
 grace_period_days?: number;
 entitlements: Array<{
 feature_key: string;
 is_enabled: boolean;
 limit_value?: number | null;
 limit_unit?: string | null;
 }>;
}

export interface UpdatePlanInput {
 name?: string;
 description?: string;
 is_active?: boolean;
 is_featured?: boolean;
 display_order?: number;
}

export interface CreatePlanVersionInput {
 plan_id: string;
 monthly_price: number;
 annual_price: number;
 trial_days?: number;
 grace_period_days?: number;
 external_plan_id?: string;
 entitlements: Array<{
 feature_key: string;
 is_enabled: boolean;
 limit_value?: number | null;
 limit_unit?: string | null;
 }>;
}

export interface RequestPlanChangeInput {
 requested_plan_version_id: string;
 billing_interval: BillingInterval;
}

export interface CreateSupportTicketInput {
 subject: string;
 description: string;
 priority?: TicketPriority;
}