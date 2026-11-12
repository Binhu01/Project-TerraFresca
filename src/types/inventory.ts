// Nexora Fase 05 — Products & Inventory types

export type ProductType = "physical" | "service";
export type MovementType =
  | "initial_balance"
  | "manual_in"
  | "manual_out"
  | "adjustment_in"
  | "adjustment_out"
  | "transfer_in"
  | "transfer_out"
  | "order_out";
export type ReservationStatus = "active" | "consumed" | "released" | "cancelled";

export const MEASUREMENT_UNITS = [
  { value: "un", label: "Unidade" },
  { value: "kg", label: "Quilograma" },
  { value: "g", label: "Grama" },
  { value: "l", label: "Litro" },
  { value: "ml", label: "Mililitro" },
  { value: "m", label: "Metro" },
  { value: "m2", label: "Metro quadrado" },
  { value: "cx", label: "Caixa" },
  { value: "pct", label: "Pacote" },
  { value: "par", label: "Par" },
  { value: "srv", label: "Serviço" },
] as const;

export interface ProductCategory {
  id: string;
  organization_id: string;
  name: string;
  description: string | null;
  parent_id: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Product {
  id: string;
  organization_id: string;
  category_id: string | null;
  name: string;
  description: string | null;
  image_url: string | null;
  sku: string | null;
  barcode: string | null;
  brand: string | null;
  product_type: ProductType;
  unit: string;
  cost_price: number | null;
  sale_price: number;
  track_inventory: boolean;
  minimum_stock: number;
  is_active: boolean;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProductVariant {
  id: string;
  organization_id: string;
  product_id: string;
  name: string;
  attributes: Record<string, string>;
  sku: string | null;
  barcode: string | null;
  cost_price_override: number | null;
  sale_price_override: number | null;
  minimum_stock: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Warehouse {
  id: string;
  organization_id: string;
  name: string;
  code: string;
  address: string | null;
  description: string | null;
  is_default: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface InventoryBalance {
  id: string;
  organization_id: string;
  warehouse_id: string;
  product_id: string;
  variant_id: string | null;
  quantity_on_hand: number;
  quantity_reserved: number;
  updated_at: string;
}

export interface InventoryMovement {
  id: string;
  organization_id: string;
  warehouse_id: string;
  product_id: string;
  variant_id: string | null;
  movement_type: MovementType;
  quantity_delta: number;
  reason: string | null;
  reference_type: string | null;
  reference_id: string | null;
  created_by: string;
  created_at: string;
}

export interface StockReservation {
  id: string;
  organization_id: string;
  order_id: string;
  order_item_id: string;
  warehouse_id: string;
  product_id: string;
  variant_id: string | null;
  quantity: number;
  status: ReservationStatus;
  reserved_at: string;
  released_at: string | null;
  consumed_at: string | null;
}

/** Product enriched with related entities */
export interface ProductWithDetails extends Product {
  category: { id: string; name: string } | null;
  variants: ProductVariant[];
  balances: (InventoryBalance & { warehouse: { id: string; name: string; code: string } })[];
}

/** Movement enriched with related entities */
export interface MovementWithDetails extends InventoryMovement {
  product: { id: string; name: string; sku: string | null };
  variant: { id: string; name: string } | null;
  warehouse: { id: string; name: string; code: string };
  creator: { id: string; full_name: string | null };
}

export interface ProductStats {
  total_products: number;
  active_products: number;
  services_count: number;
  low_stock_count: number;
  out_of_stock_count: number;
}

export interface InventoryStats {
  total_warehouses: number;
  total_movements_month: number;
  items_with_reservations: number;
  total_reserved_quantity: number;
}

export interface InventoryAlert {
  product_id: string;
  product_name: string;
  product_sku: string | null;
  variant_id: string | null;
  variant_name: string | null;
  warehouse_id: string;
  warehouse_name: string;
  quantity_on_hand: number;
  quantity_reserved: number;
  quantity_available: number;
  minimum_stock: number;
  alert_type: "out_of_stock" | "low_stock" | "below_minimum";
}