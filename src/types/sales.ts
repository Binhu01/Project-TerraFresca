// Nexora Fase 04 — Sales module types

export type OrderStatus = "draft" | "confirmed" | "preparing" | "completed" | "cancelled";
export type QuoteStatus = "draft" | "sent" | "accepted" | "rejected" | "expired" | "converted";
export type DocumentType = "order" | "quote";

export interface SalesChannel {
  id: string;
  organization_id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface DocumentSequence {
  id: string;
  organization_id: string;
  document_type: DocumentType;
  year: number;
  current_number: number;
  created_at: string;
  updated_at: string;
}

export interface OrderItem {
  id: string;
  order_id: string;
  organization_id: string;
  description: string;
  quantity: number;
  unit_price: number;
  discount: number;
  total: number;
  product_id: string | null;
  variant_id: string | null;
  product_name_snapshot: string | null;
  product_sku_snapshot: string | null;
  product_unit_snapshot: string | null;
  cost_price_snapshot: number | null;
  created_at: string;
  updated_at: string;
}

export interface Order {
  id: string;
  organization_id: string;
  customer_id: string;
  channel_id: string | null;
  lead_id: string | null;
  document_number: string;
  status: OrderStatus;
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  notes: string | null;
  issued_at: string;
  completed_at: string | null;
  cancelled_at: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

/** Order enriched with related entities for display */
export interface OrderWithDetails extends Order {
  customer: { id: string; name: string; email: string | null };
  channel: { id: string; name: string } | null;
  items: OrderItem[];
  creator: { id: string; full_name: string | null };
}

export interface QuoteItem {
  id: string;
  quote_id: string;
  organization_id: string;
  description: string;
  quantity: number;
  unit_price: number;
  discount: number;
  total: number;
  product_id: string | null;
  variant_id: string | null;
  product_name_snapshot: string | null;
  product_sku_snapshot: string | null;
  product_unit_snapshot: string | null;
  created_at: string;
  updated_at: string;
}

export interface Quote {
  id: string;
  organization_id: string;
  customer_id: string;
  channel_id: string | null;
  lead_id: string | null;
  document_number: string;
  status: QuoteStatus;
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  notes: string | null;
  valid_until: string;
  converted_order_id: string | null;
  converted_at: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

/** Quote enriched with related entities for display */
export interface QuoteWithDetails extends Quote {
  customer: { id: string; name: string; email: string | null };
  channel: { id: string; name: string } | null;
  items: QuoteItem[];
  creator: { id: string; full_name: string | null };
}

export interface OrderStatusHistoryEntry {
  id: string;
  order_id: string;
  organization_id: string;
  from_status: string | null;
  to_status: string;
  reason: string | null;
  changed_by: string;
  created_at: string;
}

/** Input for creating/updating line items in forms */
export interface LineItemInput {
  description: string;
  quantity: number;
  unit_price: number;
  discount: number;
  product_id?: string | null;
  variant_id?: string | null;
}

/** Stats returned by getSalesStats / getQuoteStats */
export interface SalesStats {
  total_orders: number;
  draft_orders: number;
  confirmed_orders: number;
  completed_orders: number;
  cancelled_orders: number;
  revenue_total: number;
  revenue_month: number;
  avg_ticket: number;
}

export interface QuoteStats {
  total_quotes: number;
  draft_quotes: number;
  sent_quotes: number;
  accepted_quotes: number;
  rejected_quotes: number;
  expired_quotes: number;
  converted_quotes: number;
  total_value: number;
  conversion_rate: number;
}