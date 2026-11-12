// Nexora Fase 09 — Fornecedores e Gestão de Compras

// ============================================================================
// SUPPLIERS
// ============================================================================

export type SupplierType = "individual" | "company";
export type SupplierStatus = "active" | "inactive";

export interface Supplier {
  id: string;
  organization_id: string;
  supplier_type: SupplierType;
  legal_name: string;
  trade_name: string | null;
  document: string | null;
  state_registration: string | null;
  email: string | null;
  phone: string | null;
  whatsapp: string | null;
  website: string | null;
  category: string | null;
  notes: string | null;
  status: SupplierStatus;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface SupplierAddress {
  id: string;
  organization_id: string;
  supplier_id: string;
  address_type: "main" | "billing" | "shipping" | "other";
  postal_code: string | null;
  street: string | null;
  number: string | null;
  complement: string | null;
  neighborhood: string | null;
  city: string | null;
  state: string | null;
  country: string;
  created_at: string;
  updated_at: string;
}

export interface SupplierContact {
  id: string;
  organization_id: string;
  supplier_id: string;
  name: string;
  job_title: string | null;
  email: string | null;
  phone: string | null;
  whatsapp: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface SupplierProduct {
  id: string;
  organization_id: string;
  supplier_id: string;
  product_id: string;
  variant_id: string | null;
  supplier_product_code: string | null;
  purchase_price: number | null;
  lead_time_days: number | null;
  minimum_order_quantity: number | null;
  notes: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  // Joined fields
  product_name?: string;
  product_sku?: string;
  variant_name?: string;
  variant_sku?: string;
}

export interface SupplierWithDetails extends Supplier {
  addresses?: SupplierAddress[];
  contacts?: SupplierContact[];
  products?: SupplierProduct[];
}

// ============================================================================
// PURCHASE ORDERS
// ============================================================================

export type PurchaseOrderStatus =
  | "draft"
  | "approved"
  | "sent"
  | "partially_received"
  | "received"
  | "partially_cancelled"
  | "cancelled";

export interface PurchaseOrder {
  id: string;
  organization_id: string;
  purchase_number: string;
  supplier_id: string;
  status: PurchaseOrderStatus;
  issue_date: string;
  expected_delivery_date: string | null;
  destination_warehouse_id: string | null;
  subtotal: number;
  discount_total: number;
  freight_amount: number;
  additional_costs: number;
  total_amount: number;
  notes: string | null;
  commercial_terms: string | null;
  created_by: string;
  approved_by: string | null;
  approved_at: string | null;
  sent_at: string | null;
  received_at: string | null;
  created_at: string;
  updated_at: string;
  // Joined fields
  supplier_name?: string;
  warehouse_name?: string;
  creator_name?: string;
  item_count?: number;
}

export interface PurchaseOrderItem {
  id: string;
  organization_id: string;
  purchase_order_id: string;
  product_id: string;
  variant_id: string | null;
  product_name_snapshot: string;
  sku_snapshot: string | null;
  quantity_ordered: number;
  quantity_received: number;
  quantity_cancelled: number;
  unit_snapshot: string;
  unit_price: number;
  discount: number;
  line_total: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface PurchaseOrderWithItems extends PurchaseOrder {
  items: PurchaseOrderItem[];
}

// ============================================================================
// GOODS RECEIPTS
// ============================================================================

export type GoodsReceiptStatus = "confirmed" | "partial" | "with_discrepancies";

export interface GoodsReceipt {
  id: string;
  organization_id: string;
  purchase_order_id: string;
  warehouse_id: string;
  receipt_number: string;
  received_at: string;
  status: GoodsReceiptStatus;
  notes: string | null;
  received_by: string;
  created_at: string;
  // Joined fields
  purchase_number?: string;
  warehouse_name?: string;
  receiver_name?: string;
}

export interface GoodsReceiptItem {
  id: string;
  organization_id: string;
  goods_receipt_id: string;
  purchase_order_item_id: string;
  product_id: string;
  variant_id: string | null;
  quantity_received: number;
  quantity_accepted: number;
  quantity_rejected: number;
  rejection_reason: string | null;
  created_at: string;
  // Joined fields
  product_name?: string;
  sku?: string;
  quantity_ordered?: number;
  quantity_previously_received?: number;
  quantity_pending?: number;
}

export interface GoodsReceiptWithItems extends GoodsReceipt {
  items: GoodsReceiptItem[];
}

// ============================================================================
// PURCHASE PAYABLE LINKS
// ============================================================================

export interface PurchasePayableLink {
  id: string;
  organization_id: string;
  purchase_order_id: string;
  payable_id: string;
  linked_amount: number;
  created_at: string;
}

// ============================================================================
// DASHBOARD & REPORTS
// ============================================================================

export interface PurchasesDashboardStats {
  activeSuppliers: number;
  totalOrdersInPeriod: number;
  ordersInProgress: number;
  ordersAwaitingReceipt: number;
  partiallyReceivedOrders: number;
  completedOrders: number;
  lateDeliveries: number;
  totalPurchaseAmount: number;
  payablesFromPurchases: number;
  topSuppliers: Array<{
    supplierId: string;
    supplierName: string;
    orderCount: number;
    totalAmount: number;
  }>;
  recentOrders: Array<{
    id: string;
    purchaseNumber: string;
    supplierName: string;
    totalAmount: number;
    status: PurchaseOrderStatus;
    issueDate: string;
  }>;
  upcomingReceipts: Array<{
    id: string;
    purchaseNumber: string;
    supplierName: string;
    expectedDeliveryDate: string;
    totalAmount: number;
    itemCount: number;
  }>;
}

export interface PurchasesBySupplier {
  supplierId: string;
  supplierName: string;
  orderCount: number;
  totalAmount: number;
  avgOrderValue: number;
}

export interface PurchasesByPeriod {
  period: string;
  orderCount: number;
  totalAmount: number;
}

export interface MostPurchasedProducts {
  productId: string;
  productName: string;
  sku: string | null;
  totalQuantity: number;
  totalAmount: number;
  supplierCount: number;
}

export interface PurchasePriceHistory {
  productId: string;
  productName: string;
  variantId: string | null;
  variantName: string | null;
  supplierId: string;
  supplierName: string;
  purchaseDate: string;
  purchaseNumber: string;
  unitPrice: number;
  quantity: number;
}

// ============================================================================
// FORM INPUTS (used by Zod schemas in actions)
// ============================================================================

export interface CreateSupplierInput {
  supplier_type: SupplierType;
  legal_name: string;
  trade_name?: string;
  document?: string;
  state_registration?: string;
  email?: string;
  phone?: string;
  whatsapp?: string;
  website?: string;
  category?: string;
  notes?: string;
}

export interface UpdateSupplierInput {
  legal_name?: string;
  trade_name?: string;
  document?: string;
  state_registration?: string;
  email?: string;
  phone?: string;
  whatsapp?: string;
  website?: string;
  category?: string;
  notes?: string;
  status?: SupplierStatus;
}

export interface CreatePurchaseOrderInput {
  supplier_id: string;
  issue_date: string;
  expected_delivery_date?: string;
  destination_warehouse_id?: string;
  notes?: string;
  commercial_terms?: string;
  freight_amount?: number;
  additional_costs?: number;
  items: Array<{
    product_id: string;
    variant_id?: string;
    quantity: number;
    unit_price: number;
    discount?: number;
    notes?: string;
  }>;
}

export interface ConfirmReceiptInput {
  purchase_order_id: string;
  warehouse_id: string;
  received_at: string;
  notes?: string;
  items: Array<{
    purchase_order_item_id: string;
    quantity_received: number;
    quantity_accepted: number;
    quantity_rejected: number;
    rejection_reason?: string;
  }>;
}

export interface GeneratePayableFromPurchaseInput {
  purchase_order_id: string;
  amount: number;
  due_date: string;
  category_id?: string;
  installments?: number;
  interval_days?: number;
}

export interface UpdateProductCostInput {
  product_id: string;
  variant_id?: string;
  new_cost: number;
  purchase_order_id: string;
}