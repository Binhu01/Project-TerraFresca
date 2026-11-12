-- Nexora Fase 05 — Produtos e Controle de Estoque
-- Product catalog, variants, warehouses, inventory balances, movements, reservations
-- All tables scoped by organization_id and protected by RLS via is_member_of().

-- ============================================================================
-- PRODUCT CATEGORIES (hierarchical)
-- ============================================================================
CREATE TABLE IF NOT EXISTS product_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  parent_id UUID REFERENCES product_categories(id) ON DELETE SET NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_product_categories_organization_id ON product_categories(organization_id);
CREATE INDEX IF NOT EXISTS idx_product_categories_parent_id ON product_categories(parent_id) WHERE parent_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_product_categories_unique_sibling ON product_categories(organization_id, COALESCE(parent_id, '00000000-0000-0000-0000-000000000000'), name);

-- ============================================================================
-- PRODUCTS
-- ============================================================================
CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  category_id UUID REFERENCES product_categories(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  sku TEXT,
  barcode TEXT,
  brand TEXT,
  product_type TEXT NOT NULL CHECK (product_type IN ('physical', 'service')) DEFAULT 'physical',
  unit TEXT NOT NULL DEFAULT 'un',
  cost_price NUMERIC(14, 2),
  sale_price NUMERIC(14, 2) NOT NULL DEFAULT 0,
  track_inventory BOOLEAN NOT NULL DEFAULT false,
  minimum_stock NUMERIC(14, 4) NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  archived_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_products_organization_id ON products(organization_id);
CREATE INDEX IF NOT EXISTS idx_products_category_id ON products(category_id) WHERE category_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_products_sku ON products(organization_id, sku) WHERE sku IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_products_barcode ON products(barcode) WHERE barcode IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_products_product_type ON products(product_type);
CREATE INDEX IF NOT EXISTS idx_products_is_active ON products(is_active);
CREATE INDEX IF NOT EXISTS idx_products_name_trgm ON products USING gin (name gin_trgm_ops);

-- Prevent services from tracking inventory
ALTER TABLE products ADD CONSTRAINT chk_service_no_inventory
  CHECK (NOT (product_type = 'service' AND track_inventory = true));

-- ============================================================================
-- PRODUCT VARIANTS
-- ============================================================================
CREATE TABLE IF NOT EXISTS product_variants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  attributes JSONB NOT NULL DEFAULT '{}',
  sku TEXT,
  barcode TEXT,
  cost_price_override NUMERIC(14, 2),
  sale_price_override NUMERIC(14, 2),
  minimum_stock NUMERIC(14, 4) NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_product_variants_product_id ON product_variants(product_id);
CREATE INDEX IF NOT EXISTS idx_product_variants_organization_id ON product_variants(organization_id);
CREATE INDEX IF NOT EXISTS idx_product_variants_sku ON product_variants(organization_id, sku) WHERE sku IS NOT NULL;

-- ============================================================================
-- WAREHOUSES
-- ============================================================================
CREATE TABLE IF NOT EXISTS warehouses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  code TEXT NOT NULL,
  address TEXT,
  description TEXT,
  is_default BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_warehouses_organization_id ON warehouses(organization_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_warehouses_code ON warehouses(organization_id, code);

-- ============================================================================
-- INVENTORY BALANCES
-- ============================================================================
CREATE TABLE IF NOT EXISTS inventory_balances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  warehouse_id UUID NOT NULL REFERENCES warehouses(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  variant_id UUID REFERENCES product_variants(id) ON DELETE CASCADE,
  quantity_on_hand NUMERIC(14, 4) NOT NULL DEFAULT 0,
  quantity_reserved NUMERIC(14, 4) NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT inventory_balances_unique UNIQUE (warehouse_id, product_id, COALESCE(variant_id, '00000000-0000-0000-0000-000000000000')),
  CONSTRAINT chk_balance_non_negative CHECK (quantity_on_hand >= 0 AND quantity_reserved >= 0),
  CONSTRAINT chk_reserved_leq_on_hand CHECK (quantity_on_hand >= quantity_reserved)
);

CREATE INDEX IF NOT EXISTS idx_inventory_balances_org ON inventory_balances(organization_id);
CREATE INDEX IF NOT EXISTS idx_inventory_balances_warehouse ON inventory_balances(warehouse_id);
CREATE INDEX IF NOT EXISTS idx_inventory_balances_product ON inventory_balances(product_id);
CREATE INDEX IF NOT EXISTS idx_inventory_balances_variant ON inventory_balances(variant_id) WHERE variant_id IS NOT NULL;

-- ============================================================================
-- INVENTORY MOVEMENTS (immutable audit trail)
-- ============================================================================
CREATE TABLE IF NOT EXISTS inventory_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  warehouse_id UUID NOT NULL REFERENCES warehouses(id) ON DELETE RESTRICT,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  variant_id UUID REFERENCES product_variants(id) ON DELETE RESTRICT,
  movement_type TEXT NOT NULL CHECK (movement_type IN (
    'initial_balance', 'manual_in', 'manual_out',
    'adjustment_in', 'adjustment_out',
    'transfer_in', 'transfer_out',
    'order_out'
  )),
  quantity_delta NUMERIC(14, 4) NOT NULL,
  reason TEXT,
  reference_type TEXT,
  reference_id UUID,
  created_by UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_inventory_movements_org ON inventory_movements(organization_id);
CREATE INDEX IF NOT EXISTS idx_inventory_movements_warehouse ON inventory_movements(warehouse_id);
CREATE INDEX IF NOT EXISTS idx_inventory_movements_product ON inventory_movements(product_id);
CREATE INDEX IF NOT EXISTS idx_inventory_movements_variant ON inventory_movements(variant_id) WHERE variant_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_inventory_movements_type ON inventory_movements(movement_type);
CREATE INDEX IF NOT EXISTS idx_inventory_movements_created_at ON inventory_movements(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_inventory_movements_reference ON inventory_movements(reference_type, reference_id) WHERE reference_type IS NOT NULL;

-- ============================================================================
-- STOCK RESERVATIONS
-- ============================================================================
CREATE TABLE IF NOT EXISTS stock_reservations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  order_item_id UUID NOT NULL REFERENCES order_items(id) ON DELETE CASCADE,
  warehouse_id UUID NOT NULL REFERENCES warehouses(id) ON DELETE RESTRICT,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  variant_id UUID REFERENCES product_variants(id) ON DELETE RESTRICT,
  quantity NUMERIC(14, 4) NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('active', 'consumed', 'released', 'cancelled')) DEFAULT 'active',
  reserved_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  released_at TIMESTAMPTZ,
  consumed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_stock_reservations_org ON stock_reservations(organization_id);
CREATE INDEX IF NOT EXISTS idx_stock_reservations_order ON stock_reservations(order_id);
CREATE INDEX IF NOT EXISTS idx_stock_reservations_status ON stock_reservations(status);
CREATE INDEX IF NOT EXISTS idx_stock_reservations_warehouse ON stock_reservations(warehouse_id);
CREATE INDEX IF NOT EXISTS idx_stock_reservations_product ON stock_reservations(product_id);

-- ============================================================================
-- ALTER TABLE: Add product linkage to order_items and quote_items
-- ============================================================================
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS product_id UUID REFERENCES products(id) ON DELETE SET NULL;
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS variant_id UUID REFERENCES product_variants(id) ON DELETE SET NULL;
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS product_name_snapshot TEXT;
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS product_sku_snapshot TEXT;
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS product_unit_snapshot TEXT;

ALTER TABLE quote_items ADD COLUMN IF NOT EXISTS product_id UUID REFERENCES products(id) ON DELETE SET NULL;
ALTER TABLE quote_items ADD COLUMN IF NOT EXISTS variant_id UUID REFERENCES product_variants(id) ON DELETE SET NULL;
ALTER TABLE quote_items ADD COLUMN IF NOT EXISTS product_name_snapshot TEXT;
ALTER TABLE quote_items ADD COLUMN IF NOT EXISTS product_sku_snapshot TEXT;
ALTER TABLE quote_items ADD COLUMN IF NOT EXISTS product_unit_snapshot TEXT;

CREATE INDEX IF NOT EXISTS idx_order_items_product ON order_items(product_id) WHERE product_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_order_items_variant ON order_items(variant_id) WHERE variant_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_quote_items_product ON quote_items(product_id) WHERE product_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_quote_items_variant ON quote_items(variant_id) WHERE variant_id IS NOT NULL;

-- ============================================================================
-- FUNCTIONS
-- ============================================================================

-- Atomic inventory adjustment: updates balance + records movement
CREATE OR REPLACE FUNCTION adjust_inventory(
  p_org_id UUID,
  p_warehouse_id UUID,
  p_product_id UUID,
  p_variant_id UUID,
  p_delta NUMERIC,
  p_movement_type TEXT,
  p_reason TEXT,
  p_reference_type TEXT,
  p_reference_id UUID,
  p_user_id UUID
) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_new_on_hand NUMERIC;
BEGIN
  -- Upsert balance atomically
  INSERT INTO inventory_balances (organization_id, warehouse_id, product_id, variant_id, quantity_on_hand, quantity_reserved)
  VALUES (p_org_id, p_warehouse_id, p_product_id, p_variant_id, p_delta, 0)
  ON CONFLICT (warehouse_id, product_id, COALESCE(variant_id, '00000000-0000-0000-0000-000000000000'))
  DO UPDATE SET quantity_on_hand = inventory_balances.quantity_on_hand + p_delta
  RETURNING quantity_on_hand INTO v_new_on_hand;

  -- Validate non-negative after adjustment
  IF v_new_on_hand < 0 THEN
    RAISE EXCEPTION 'Insufficient stock: resulting balance would be %', v_new_on_hand;
  END IF;

  -- Record immutable movement
  INSERT INTO inventory_movements (
    organization_id, warehouse_id, product_id, variant_id,
    movement_type, quantity_delta, reason, reference_type, reference_id, created_by
  ) VALUES (
    p_org_id, p_warehouse_id, p_product_id, p_variant_id,
    p_movement_type, p_delta, p_reason, p_reference_type, p_reference_id, p_user_id
  );
END;
$$;

-- Reserve stock for confirmed orders (atomic, all-or-nothing)
CREATE OR REPLACE FUNCTION reserve_stock(
  p_org_id UUID,
  p_order_id UUID,
  p_items JSONB
) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_item JSONB;
  v_available NUMERIC;
  v_warehouse_id UUID;
BEGIN
  -- Get default warehouse for this org
  SELECT id INTO v_warehouse_id FROM warehouses
  WHERE organization_id = p_org_id AND is_default = true AND is_active = true
  LIMIT 1;

  IF v_warehouse_id IS NULL THEN
    RAISE EXCEPTION 'No active default warehouse found for organization';
  END IF;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
    -- Check available stock
    SELECT COALESCE(quantity_on_hand - quantity_reserved, 0) INTO v_available
    FROM inventory_balances
    WHERE warehouse_id = v_warehouse_id
      AND product_id = (v_item->>'product_id')::UUID
      AND COALESCE(variant_id, '00000000-0000-0000-0000-000000000000') = COALESCE((v_item->>'variant_id')::UUID, '00000000-0000-0000-0000-000000000000');

    IF v_available IS NULL OR v_available < (v_item->>'quantity')::NUMERIC THEN
      RAISE EXCEPTION 'Insufficient stock for product %. Available: %, Requested: %',
        v_item->>'product_id', COALESCE(v_available, 0), v_item->>'quantity';
    END IF;

    -- Create reservation
    INSERT INTO stock_reservations (
      organization_id, order_id, order_item_id, warehouse_id,
      product_id, variant_id, quantity, status
    ) VALUES (
      p_org_id, p_order_id, (v_item->>'order_item_id')::UUID, v_warehouse_id,
      (v_item->>'product_id')::UUID, (v_item->>'variant_id')::UUID,
      (v_item->>'quantity')::NUMERIC, 'active'
    );

    -- Increment reserved quantity
    UPDATE inventory_balances
    SET quantity_reserved = quantity_reserved + (v_item->>'quantity')::NUMERIC
    WHERE warehouse_id = v_warehouse_id
      AND product_id = (v_item->>'product_id')::UUID
      AND COALESCE(variant_id, '00000000-0000-0000-0000-000000000000') = COALESCE((v_item->>'variant_id')::UUID, '00000000-0000-0000-0000-000000000000');
  END LOOP;
END;
$$;

-- Consume reservations on order completion
CREATE OR REPLACE FUNCTION consume_reservations(
  p_org_id UUID,
  p_order_id UUID
) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_reservation RECORD;
BEGIN
  FOR v_reservation IN
    SELECT * FROM stock_reservations
    WHERE order_id = p_order_id AND organization_id = p_org_id AND status = 'active'
    FOR UPDATE
  LOOP
    -- Decrement on_hand and reserved
    UPDATE inventory_balances
    SET quantity_on_hand = quantity_on_hand - v_reservation.quantity,
        quantity_reserved = quantity_reserved - v_reservation.quantity
    WHERE warehouse_id = v_reservation.warehouse_id
      AND product_id = v_reservation.product_id
      AND COALESCE(variant_id, '00000000-0000-0000-0000-000000000000') = COALESCE(v_reservation.variant_id, '00000000-0000-0000-0000-000000000000');

    -- Record movement
    INSERT INTO inventory_movements (
      organization_id, warehouse_id, product_id, variant_id,
      movement_type, quantity_delta, reason, reference_type, reference_id, created_by
    ) VALUES (
      p_org_id, v_reservation.warehouse_id, v_reservation.product_id, v_reservation.variant_id,
      'order_out', -v_reservation.quantity, 'Saída por pedido concluído',
      'order', p_order_id,
      (SELECT created_by FROM orders WHERE id = p_order_id)
    );

    -- Mark reservation consumed
    UPDATE stock_reservations
    SET status = 'consumed', consumed_at = now()
    WHERE id = v_reservation.id;
  END LOOP;
END;
$$;

-- Release reservations on order cancellation
CREATE OR REPLACE FUNCTION release_reservations(
  p_org_id UUID,
  p_order_id UUID
) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Decrement reserved quantities
  UPDATE inventory_balances ib
  SET quantity_reserved = quantity_reserved - sr.quantity
  FROM stock_reservations sr
  WHERE sr.order_id = p_order_id
    AND sr.organization_id = p_org_id
    AND sr.status = 'active'
    AND ib.warehouse_id = sr.warehouse_id
    AND ib.product_id = sr.product_id
    AND COALESCE(ib.variant_id, '00000000-0000-0000-0000-000000000000') = COALESCE(sr.variant_id, '00000000-0000-0000-0000-000000000000');

  -- Mark reservations as released
  UPDATE stock_reservations
  SET status = 'released', released_at = now()
  WHERE order_id = p_order_id AND organization_id = p_org_id AND status = 'active';
END;
$$;

-- ============================================================================
-- ENABLE RLS
-- ============================================================================
ALTER TABLE product_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE warehouses ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_reservations ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- RLS POLICIES (standard is_member_of pattern)
-- ============================================================================

-- Product Categories
CREATE POLICY "Members can view product categories" ON product_categories FOR SELECT USING (is_member_of(organization_id));
CREATE POLICY "Members can insert product categories" ON product_categories FOR INSERT WITH CHECK (is_member_of(organization_id));
CREATE POLICY "Members can update product categories" ON product_categories FOR UPDATE USING (is_member_of(organization_id)) WITH CHECK (is_member_of(organization_id));
CREATE POLICY "Members can delete product categories" ON product_categories FOR DELETE USING (is_member_of(organization_id));

-- Products
CREATE POLICY "Members can view products" ON products FOR SELECT USING (is_member_of(organization_id));
CREATE POLICY "Members can insert products" ON products FOR INSERT WITH CHECK (is_member_of(organization_id));
CREATE POLICY "Members can update products" ON products FOR UPDATE USING (is_member_of(organization_id)) WITH CHECK (is_member_of(organization_id));
CREATE POLICY "Members can delete products" ON products FOR DELETE USING (is_member_of(organization_id));

-- Product Variants
CREATE POLICY "Members can view product variants" ON product_variants FOR SELECT USING (is_member_of(organization_id));
CREATE POLICY "Members can insert product variants" ON product_variants FOR INSERT WITH CHECK (is_member_of(organization_id));
CREATE POLICY "Members can update product variants" ON product_variants FOR UPDATE USING (is_member_of(organization_id)) WITH CHECK (is_member_of(organization_id));
CREATE POLICY "Members can delete product variants" ON product_variants FOR DELETE USING (is_member_of(organization_id));

-- Warehouses
CREATE POLICY "Members can view warehouses" ON warehouses FOR SELECT USING (is_member_of(organization_id));
CREATE POLICY "Members can insert warehouses" ON warehouses FOR INSERT WITH CHECK (is_member_of(organization_id));
CREATE POLICY "Members can update warehouses" ON warehouses FOR UPDATE USING (is_member_of(organization_id)) WITH CHECK (is_member_of(organization_id));
CREATE POLICY "Members can delete warehouses" ON warehouses FOR DELETE USING (is_member_of(organization_id));

-- Inventory Balances
CREATE POLICY "Members can view inventory balances" ON inventory_balances FOR SELECT USING (is_member_of(organization_id));
CREATE POLICY "Members can insert inventory balances" ON inventory_balances FOR INSERT WITH CHECK (is_member_of(organization_id));
CREATE POLICY "Members can update inventory balances" ON inventory_balances FOR UPDATE USING (is_member_of(organization_id)) WITH CHECK (is_member_of(organization_id));
CREATE POLICY "Members can delete inventory balances" ON inventory_balances FOR DELETE USING (is_member_of(organization_id));

-- Inventory Movements (append-only: SELECT + INSERT only)
CREATE POLICY "Members can view inventory movements" ON inventory_movements FOR SELECT USING (is_member_of(organization_id));
CREATE POLICY "Members can insert inventory movements" ON inventory_movements FOR INSERT WITH CHECK (is_member_of(organization_id));

-- Stock Reservations
CREATE POLICY "Members can view stock reservations" ON stock_reservations FOR SELECT USING (is_member_of(organization_id));
CREATE POLICY "Members can insert stock reservations" ON stock_reservations FOR INSERT WITH CHECK (is_member_of(organization_id));
CREATE POLICY "Members can update stock reservations" ON stock_reservations FOR UPDATE USING (is_member_of(organization_id)) WITH CHECK (is_member_of(organization_id));

-- ============================================================================
-- UPDATED_AT TRIGGERS
-- ============================================================================
CREATE TRIGGER set_product_categories_updated_at BEFORE UPDATE ON product_categories FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER set_products_updated_at BEFORE UPDATE ON products FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER set_product_variants_updated_at BEFORE UPDATE ON product_variants FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER set_warehouses_updated_at BEFORE UPDATE ON warehouses FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER set_inventory_balances_updated_at BEFORE UPDATE ON inventory_balances FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- SEED DEFAULT WAREHOUSE ON ORGANIZATION CREATION
-- ============================================================================
CREATE OR REPLACE FUNCTION seed_default_warehouse()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO warehouses (organization_id, name, code, description, is_default, is_active)
  VALUES (NEW.id, 'Depósito Principal', 'PRINCIPAL', 'Depósito padrão da organização', true, true);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_seed_default_warehouse ON organizations;
CREATE TRIGGER trigger_seed_default_warehouse
  AFTER INSERT ON organizations
  FOR EACH ROW
  EXECUTE FUNCTION seed_default_warehouse();