-- ============================================================================
-- NEXORA FASE 09 — FORNECEDORES E GESTÃO DE COMPRAS
-- Tabelas: suppliers, supplier_addresses, supplier_contacts, supplier_products,
--          purchase_orders, purchase_order_items, goods_receipts,
--          goods_receipt_items, purchase_payable_links
-- Funções: next_purchase_number, next_receipt_number, confirm_goods_receipt,
--          seed_default_purchase_permissions
-- ============================================================================

-- ============================================================================
-- 1. SUPPLIERS (Fornecedores)
-- ============================================================================
CREATE TABLE IF NOT EXISTS suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  supplier_type TEXT NOT NULL CHECK (supplier_type IN ('individual', 'company')) DEFAULT 'company',
  legal_name TEXT NOT NULL,
  trade_name TEXT,
  document TEXT, -- CPF or CNPJ (optional, validated at app level)
  state_registration TEXT,
  email TEXT,
  phone TEXT,
  whatsapp TEXT,
  website TEXT,
  category TEXT,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  archived_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_suppliers_org ON suppliers(organization_id);
CREATE INDEX IF NOT EXISTS idx_suppliers_status ON suppliers(organization_id, status);
CREATE INDEX IF NOT EXISTS idx_suppliers_document ON suppliers(document) WHERE document IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_suppliers_name_trgm ON suppliers USING gin (legal_name gin_trgm_ops);

-- ============================================================================
-- 2. SUPPLIER ADDRESSES
-- ============================================================================
CREATE TABLE IF NOT EXISTS supplier_addresses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  supplier_id UUID NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
  address_type TEXT NOT NULL DEFAULT 'main' CHECK (address_type IN ('main', 'billing', 'shipping', 'other')),
  postal_code TEXT,
  street TEXT,
  number TEXT,
  complement TEXT,
  neighborhood TEXT,
  city TEXT,
  state TEXT,
  country TEXT DEFAULT 'BR',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_supplier_addresses_supplier ON supplier_addresses(supplier_id);
CREATE INDEX IF NOT EXISTS idx_supplier_addresses_org ON supplier_addresses(organization_id);

-- ============================================================================
-- 3. SUPPLIER CONTACTS
-- ============================================================================
CREATE TABLE IF NOT EXISTS supplier_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  supplier_id UUID NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  job_title TEXT,
  email TEXT,
  phone TEXT,
  whatsapp TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_supplier_contacts_supplier ON supplier_contacts(supplier_id);
CREATE INDEX IF NOT EXISTS idx_supplier_contacts_org ON supplier_contacts(organization_id);

-- ============================================================================
-- 4. SUPPLIER PRODUCTS (Relacionamento fornecedor ↔ produto)
-- ============================================================================
CREATE TABLE IF NOT EXISTS supplier_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  supplier_id UUID NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  variant_id UUID REFERENCES product_variants(id) ON DELETE CASCADE,
  supplier_product_code TEXT,
  purchase_price NUMERIC(14, 2),
  lead_time_days INT,
  minimum_order_quantity NUMERIC(14, 4),
  notes TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (organization_id, supplier_id, product_id, COALESCE(variant_id, '00000000-0000-0000-0000-000000000000'))
);

CREATE INDEX IF NOT EXISTS idx_supplier_products_supplier ON supplier_products(supplier_id);
CREATE INDEX IF NOT EXISTS idx_supplier_products_product ON supplier_products(product_id);
CREATE INDEX IF NOT EXISTS idx_supplier_products_org ON supplier_products(organization_id);

-- ============================================================================
-- 5. PURCHASE ORDERS (Ordens de Compra)
-- ============================================================================
CREATE TABLE IF NOT EXISTS purchase_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  purchase_number TEXT NOT NULL,
  supplier_id UUID NOT NULL REFERENCES suppliers(id) ON DELETE RESTRICT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN (
    'draft', 'approved', 'sent', 'partially_received', 'received', 'partially_cancelled', 'cancelled'
  )),
  issue_date DATE NOT NULL DEFAULT CURRENT_DATE,
  expected_delivery_date DATE,
  destination_warehouse_id UUID REFERENCES warehouses(id) ON DELETE SET NULL,
  subtotal NUMERIC(14, 2) NOT NULL DEFAULT 0,
  discount_total NUMERIC(14, 2) NOT NULL DEFAULT 0,
  freight_amount NUMERIC(14, 2) NOT NULL DEFAULT 0,
  additional_costs NUMERIC(14, 2) NOT NULL DEFAULT 0,
  total_amount NUMERIC(14, 2) NOT NULL DEFAULT 0,
  notes TEXT,
  commercial_terms TEXT,
  created_by UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  approved_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  approved_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  received_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (organization_id, purchase_number)
);

CREATE INDEX IF NOT EXISTS idx_purchase_orders_org ON purchase_orders(organization_id);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_supplier ON purchase_orders(supplier_id);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_status ON purchase_orders(organization_id, status);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_issue_date ON purchase_orders(organization_id, issue_date DESC);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_number ON purchase_orders(purchase_number);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_created_by ON purchase_orders(created_by);

-- ============================================================================
-- 6. PURCHASE ORDER ITEMS
-- ============================================================================
CREATE TABLE IF NOT EXISTS purchase_order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  purchase_order_id UUID NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  variant_id UUID REFERENCES product_variants(id) ON DELETE RESTRICT,
  product_name_snapshot TEXT NOT NULL,
  sku_snapshot TEXT,
  quantity_ordered NUMERIC(14, 4) NOT NULL CHECK (quantity_ordered > 0),
  quantity_received NUMERIC(14, 4) NOT NULL DEFAULT 0 CHECK (quantity_received >= 0),
  quantity_cancelled NUMERIC(14, 4) NOT NULL DEFAULT 0 CHECK (quantity_cancelled >= 0),
  unit_snapshot TEXT NOT NULL DEFAULT 'un',
  unit_price NUMERIC(14, 2) NOT NULL CHECK (unit_price >= 0),
  discount NUMERIC(14, 2) NOT NULL DEFAULT 0 CHECK (discount >= 0),
  line_total NUMERIC(14, 2) NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT chk_po_item_qty CHECK (quantity_received + quantity_cancelled <= quantity_ordered)
);

CREATE INDEX IF NOT EXISTS idx_po_items_order ON purchase_order_items(purchase_order_id);
CREATE INDEX IF NOT EXISTS idx_po_items_product ON purchase_order_items(product_id);
CREATE INDEX IF NOT EXISTS idx_po_items_org ON purchase_order_items(organization_id);

-- ============================================================================
-- 7. GOODS RECEIPTS (Recebimentos de Mercadoria)
-- ============================================================================
CREATE TABLE IF NOT EXISTS goods_receipts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  purchase_order_id UUID NOT NULL REFERENCES purchase_orders(id) ON DELETE RESTRICT,
  warehouse_id UUID NOT NULL REFERENCES warehouses(id) ON DELETE RESTRICT,
  receipt_number TEXT NOT NULL,
  received_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  status TEXT NOT NULL DEFAULT 'confirmed' CHECK (status IN ('confirmed', 'partial', 'with_discrepancies')),
  notes TEXT,
  received_by UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (organization_id, receipt_number)
);

CREATE INDEX IF NOT EXISTS idx_goods_receipts_org ON goods_receipts(organization_id);
CREATE INDEX IF NOT EXISTS idx_goods_receipts_po ON goods_receipts(purchase_order_id);
CREATE INDEX IF NOT EXISTS idx_goods_receipts_warehouse ON goods_receipts(warehouse_id);
CREATE INDEX IF NOT EXISTS idx_goods_receipts_received_at ON goods_receipts(received_at DESC);

-- ============================================================================
-- 8. GOODS RECEIPT ITEMS
-- ============================================================================
CREATE TABLE IF NOT EXISTS goods_receipt_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  goods_receipt_id UUID NOT NULL REFERENCES goods_receipts(id) ON DELETE CASCADE,
  purchase_order_item_id UUID NOT NULL REFERENCES purchase_order_items(id) ON DELETE RESTRICT,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  variant_id UUID REFERENCES product_variants(id) ON DELETE RESTRICT,
  quantity_received NUMERIC(14, 4) NOT NULL CHECK (quantity_received > 0),
  quantity_accepted NUMERIC(14, 4) NOT NULL DEFAULT 0 CHECK (quantity_accepted >= 0),
  quantity_rejected NUMERIC(14, 4) NOT NULL DEFAULT 0 CHECK (quantity_rejected >= 0),
  rejection_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT chk_gr_item_qty CHECK (quantity_accepted + quantity_rejected = quantity_received)
);

CREATE INDEX IF NOT EXISTS idx_gr_items_receipt ON goods_receipt_items(goods_receipt_id);
CREATE INDEX IF NOT EXISTS idx_gr_items_po_item ON goods_receipt_items(purchase_order_item_id);
CREATE INDEX IF NOT EXISTS idx_gr_items_org ON goods_receipt_items(organization_id);

-- ============================================================================
-- 9. PURCHASE PAYABLE LINKS (Vínculo compra ↔ conta a pagar)
-- ============================================================================
CREATE TABLE IF NOT EXISTS purchase_payable_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  purchase_order_id UUID NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
  payable_id UUID NOT NULL REFERENCES payables(id) ON DELETE CASCADE,
  linked_amount NUMERIC(14, 2) NOT NULL CHECK (linked_amount > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (organization_id, purchase_order_id, payable_id)
);

CREATE INDEX IF NOT EXISTS idx_ppl_po ON purchase_payable_links(purchase_order_id);
CREATE INDEX IF NOT EXISTS idx_ppl_payable ON purchase_payable_links(payable_id);
CREATE INDEX IF NOT EXISTS idx_ppl_org ON purchase_payable_links(organization_id);

-- ============================================================================
-- EXTEND document_sequences TO SUPPORT PURCHASE TYPES
-- ============================================================================
ALTER TABLE document_sequences DROP CONSTRAINT IF EXISTS chk_document_type;
ALTER TABLE document_sequences ADD CONSTRAINT chk_document_type CHECK (
  document_type IN ('order', 'quote', 'receivable', 'payable', 'payment', 'purchase_order', 'goods_receipt')
);

-- ============================================================================
-- UPDATED_AT TRIGGERS
-- ============================================================================
CREATE OR REPLACE TRIGGER set_suppliers_updated_at
  BEFORE UPDATE ON suppliers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE TRIGGER set_supplier_addresses_updated_at
  BEFORE UPDATE ON supplier_addresses FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE TRIGGER set_supplier_contacts_updated_at
  BEFORE UPDATE ON supplier_contacts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE TRIGGER set_supplier_products_updated_at
  BEFORE UPDATE ON supplier_products FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE TRIGGER set_purchase_orders_updated_at
  BEFORE UPDATE ON purchase_orders FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE TRIGGER set_purchase_order_items_updated_at
  BEFORE UPDATE ON purchase_order_items FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- FUNCTIONS (SECURITY DEFINER + SET search_path = public)
-- ============================================================================

-- Atomic numbering for purchase orders: COMP-YYYY-NNNNNN
CREATE OR REPLACE FUNCTION next_purchase_number(p_org_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_year INTEGER;
  v_next INTEGER;
BEGIN
  v_year := EXTRACT(YEAR FROM now());

  INSERT INTO document_sequences (organization_id, document_type, year, current_number)
  VALUES (p_org_id, 'purchase_order', v_year, 1)
  ON CONFLICT (organization_id, document_type, year)
  DO UPDATE SET current_number = document_sequences.current_number + 1
  RETURNING current_number INTO v_next;

  RETURN format('COMP-%s-%s', v_year, lpad(v_next::text, 6, '0'));
END;
$$;

-- Atomic numbering for goods receipts: REC-YYYY-NNNNNN
CREATE OR REPLACE FUNCTION next_receipt_number(p_org_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_year INTEGER;
  v_next INTEGER;
BEGIN
  v_year := EXTRACT(YEAR FROM now());

  INSERT INTO document_sequences (organization_id, document_type, year, current_number)
  VALUES (p_org_id, 'goods_receipt', v_year, 1)
  ON CONFLICT (organization_id, document_type, year)
  DO UPDATE SET current_number = document_sequences.current_number + 1
  RETURNING current_number INTO v_next;

  RETURN format('REC-%s-%s', v_year, lpad(v_next::text, 6, '0'));
END;
$$;

-- Confirm goods receipt: updates PO item quantities, PO status, and creates inventory movements
-- All within a single transaction to prevent partial state
CREATE OR REPLACE FUNCTION confirm_goods_receipt(
  p_org_id UUID,
  p_receipt_id UUID,
  p_user_id UUID
) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_receipt RECORD;
  v_item RECORD;
  v_po_item RECORD;
  v_pending NUMERIC;
  v_all_received BOOLEAN := true;
  v_any_received BOOLEAN := false;
BEGIN
  -- Lock the receipt
  SELECT gr.*, po.id AS po_id, po.status AS po_status, po.destination_warehouse_id
  INTO v_receipt
  FROM goods_receipts gr
  JOIN purchase_orders po ON po.id = gr.purchase_order_id AND po.organization_id = gr.organization_id
  WHERE gr.id = p_receipt_id AND gr.organization_id = p_org_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Recebimento não encontrado';
  END IF;

  -- Process each receipt item
  FOR v_item IN
    SELECT gri.*, poi.quantity_ordered, poi.quantity_received AS prev_received,
           poi.quantity_cancelled, poi.product_id AS poi_product_id, poi.variant_id AS poi_variant_id
    FROM goods_receipt_items gri
    JOIN purchase_order_items poi ON poi.id = gri.purchase_order_item_id
    WHERE gri.goods_receipt_id = p_receipt_id AND gri.organization_id = p_org_id
    FOR UPDATE OF poi
  LOOP
    -- Validate: cannot receive more than pending
    v_pending := v_item.quantity_ordered - v_item.prev_received - v_item.quantity_cancelled;
    IF v_item.quantity_received > v_pending THEN
      RAISE EXCEPTION 'Quantidade recebida (%) excede pendente (%) para item %',
        v_item.quantity_received, v_pending, v_item.purchase_order_item_id;
    END IF;

    -- Update PO item received quantity
    UPDATE purchase_order_items
    SET quantity_received = quantity_received + v_item.quantity_received
    WHERE id = v_item.purchase_order_item_id;

    -- Create inventory movement for accepted quantity only
    IF v_item.quantity_accepted > 0 THEN
      PERFORM adjust_inventory(
        p_org_id,
        v_receipt.warehouse_id,
        v_item.product_id,
        v_item.variant_id,
        v_item.quantity_accepted,
        'manual_in',
        'Recebimento de compra ' || v_receipt.receipt_number,
        'goods_receipt',
        p_receipt_id,
        p_user_id
      );
    END IF;

    v_any_received := true;
  END LOOP;

  -- Check if all PO items are fully received
  SELECT bool_and(quantity_received + quantity_cancelled >= quantity_ordered)
  INTO v_all_received
  FROM purchase_order_items
  WHERE purchase_order_id = v_receipt.po_id AND organization_id = p_org_id;

  -- Update PO status
  IF v_all_received THEN
    UPDATE purchase_orders
    SET status = 'received', received_at = now()
    WHERE id = v_receipt.po_id AND organization_id = p_org_id;
  ELSIF v_any_received THEN
    UPDATE purchase_orders
    SET status = 'partially_received'
    WHERE id = v_receipt.po_id AND organization_id = p_org_id
      AND status NOT IN ('received', 'cancelled');
  END IF;
END;
$$;

-- ============================================================================
-- SEED PURCHASE PERMISSIONS
-- ============================================================================
INSERT INTO permissions (permission_key, module, action, description) VALUES
  ('suppliers.view',       'suppliers', 'view',       'Visualizar fornecedores'),
  ('suppliers.create',     'suppliers', 'create',     'Criar fornecedores'),
  ('suppliers.edit',       'suppliers', 'edit',       'Editar fornecedores'),
  ('suppliers.archive',    'suppliers', 'archive',    'Arquivar fornecedores'),
  ('purchases.view',       'purchases', 'view',       'Visualizar ordens de compra'),
  ('purchases.create',     'purchases', 'create',     'Criar ordens de compra'),
  ('purchases.edit_draft', 'purchases', 'edit_draft', 'Editar ordens em rascunho'),
  ('purchases.approve',    'purchases', 'approve',    'Aprovar ordens de compra'),
  ('purchases.send',       'purchases', 'send',       'Registrar envio de ordem'),
  ('purchases.receive',    'purchases', 'receive',    'Registrar recebimentos'),
  ('purchases.discrepancy','purchases', 'discrepancy','Registrar divergências'),
  ('purchases.return',     'purchases', 'return',     'Registrar devoluções'),
  ('purchases.generate_payable', 'purchases', 'generate_payable', 'Gerar contas a pagar de compras'),
  ('purchases.update_cost','purchases', 'update_cost','Atualizar custo de produtos após compra'),
  ('purchases.export',     'purchases', 'export',     'Exportar relatórios de compras')
ON CONFLICT (permission_key) DO NOTHING;

-- Grant all purchase permissions to OWNER and ADMIN system roles
DO $$
DECLARE
  v_org RECORD;
  v_role RECORD;
  v_perm RECORD;
BEGIN
  FOR v_org IN SELECT id FROM organizations LOOP
    FOR v_role IN
      SELECT id FROM organization_roles
      WHERE organization_id = v_org.id AND is_system_role = true AND name IN ('OWNER', 'ADMIN')
    LOOP
      FOR v_perm IN
        SELECT id FROM permissions WHERE module IN ('suppliers', 'purchases')
      LOOP
        INSERT INTO role_permissions (organization_id, role_id, permission_id, granted)
        VALUES (v_org.id, v_role.id, v_perm.id, true)
        ON CONFLICT (organization_id, role_id, permission_id) DO NOTHING;
      END LOOP;
    END LOOP;
  END LOOP;
END $$;

-- Grant view + create + edit_draft + receive to MANAGER
DO $$
DECLARE
  v_org RECORD;
  v_role RECORD;
  v_perm RECORD;
BEGIN
  FOR v_org IN SELECT id FROM organizations LOOP
    FOR v_role IN
      SELECT id FROM organization_roles
      WHERE organization_id = v_org.id AND is_system_role = true AND name = 'MANAGER'
    LOOP
      FOR v_perm IN
        SELECT id FROM permissions
        WHERE module IN ('suppliers', 'purchases')
          AND permission_key IN (
            'suppliers.view', 'suppliers.create', 'suppliers.edit',
            'purchases.view', 'purchases.create', 'purchases.edit_draft',
            'purchases.receive', 'purchases.discrepancy', 'purchases.export'
          )
      LOOP
        INSERT INTO role_permissions (organization_id, role_id, permission_id, granted)
        VALUES (v_org.id, v_role.id, v_perm.id, true)
        ON CONFLICT (organization_id, role_id, permission_id) DO NOTHING;
      END LOOP;
    END LOOP;
  END LOOP;
END $$;

-- Grant view only to EMPLOYEE
DO $$
DECLARE
  v_org RECORD;
  v_role RECORD;
  v_perm RECORD;
BEGIN
  FOR v_org IN SELECT id FROM organizations LOOP
    FOR v_role IN
      SELECT id FROM organization_roles
      WHERE organization_id = v_org.id AND is_system_role = true AND name = 'EMPLOYEE'
    LOOP
      FOR v_perm IN
        SELECT id FROM permissions
        WHERE permission_key IN ('suppliers.view', 'purchases.view')
      LOOP
        INSERT INTO role_permissions (organization_id, role_id, permission_id, granted)
        VALUES (v_org.id, v_role.id, v_perm.id, true)
        ON CONFLICT (organization_id, role_id, permission_id) DO NOTHING;
      END LOOP;
    END LOOP;
  END LOOP;
END $$;

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE supplier_addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE supplier_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE supplier_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE goods_receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE goods_receipt_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_payable_links ENABLE ROW LEVEL SECURITY;

-- Standard is_member_of policies for all tables
CREATE POLICY "suppliers_select" ON suppliers FOR SELECT USING (is_member_of(organization_id));
CREATE POLICY "suppliers_insert" ON suppliers FOR INSERT WITH CHECK (is_member_of(organization_id));
CREATE POLICY "suppliers_update" ON suppliers FOR UPDATE USING (is_member_of(organization_id)) WITH CHECK (is_member_of(organization_id));
CREATE POLICY "suppliers_delete" ON suppliers FOR DELETE USING (is_member_of(organization_id));

CREATE POLICY "supplier_addresses_select" ON supplier_addresses FOR SELECT USING (is_member_of(organization_id));
CREATE POLICY "supplier_addresses_insert" ON supplier_addresses FOR INSERT WITH CHECK (is_member_of(organization_id));
CREATE POLICY "supplier_addresses_update" ON supplier_addresses FOR UPDATE USING (is_member_of(organization_id)) WITH CHECK (is_member_of(organization_id));
CREATE POLICY "supplier_addresses_delete" ON supplier_addresses FOR DELETE USING (is_member_of(organization_id));

CREATE POLICY "supplier_contacts_select" ON supplier_contacts FOR SELECT USING (is_member_of(organization_id));
CREATE POLICY "supplier_contacts_insert" ON supplier_contacts FOR INSERT WITH CHECK (is_member_of(organization_id));
CREATE POLICY "supplier_contacts_update" ON supplier_contacts FOR UPDATE USING (is_member_of(organization_id)) WITH CHECK (is_member_of(organization_id));
CREATE POLICY "supplier_contacts_delete" ON supplier_contacts FOR DELETE USING (is_member_of(organization_id));

CREATE POLICY "supplier_products_select" ON supplier_products FOR SELECT USING (is_member_of(organization_id));
CREATE POLICY "supplier_products_insert" ON supplier_products FOR INSERT WITH CHECK (is_member_of(organization_id));
CREATE POLICY "supplier_products_update" ON supplier_products FOR UPDATE USING (is_member_of(organization_id)) WITH CHECK (is_member_of(organization_id));
CREATE POLICY "supplier_products_delete" ON supplier_products FOR DELETE USING (is_member_of(organization_id));

CREATE POLICY "purchase_orders_select" ON purchase_orders FOR SELECT USING (is_member_of(organization_id));
CREATE POLICY "purchase_orders_insert" ON purchase_orders FOR INSERT WITH CHECK (is_member_of(organization_id));
CREATE POLICY "purchase_orders_update" ON purchase_orders FOR UPDATE USING (is_member_of(organization_id)) WITH CHECK (is_member_of(organization_id));

CREATE POLICY "po_items_select" ON purchase_order_items FOR SELECT USING (is_member_of(organization_id));
CREATE POLICY "po_items_insert" ON purchase_order_items FOR INSERT WITH CHECK (is_member_of(organization_id));
CREATE POLICY "po_items_update" ON purchase_order_items FOR UPDATE USING (is_member_of(organization_id)) WITH CHECK (is_member_of(organization_id));
CREATE POLICY "po_items_delete" ON purchase_order_items FOR DELETE USING (is_member_of(organization_id));

CREATE POLICY "goods_receipts_select" ON goods_receipts FOR SELECT USING (is_member_of(organization_id));
CREATE POLICY "goods_receipts_insert" ON goods_receipts FOR INSERT WITH CHECK (is_member_of(organization_id));

CREATE POLICY "gr_items_select" ON goods_receipt_items FOR SELECT USING (is_member_of(organization_id));
CREATE POLICY "gr_items_insert" ON goods_receipt_items FOR INSERT WITH CHECK (is_member_of(organization_id));

CREATE POLICY "ppl_select" ON purchase_payable_links FOR SELECT USING (is_member_of(organization_id));
CREATE POLICY "ppl_insert" ON purchase_payable_links FOR INSERT WITH CHECK (is_member_of(organization_id));

-- ============================================================================
-- PERFORMANCE INDEXES FOR REPORTS
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_po_items_org_product ON purchase_order_items(organization_id, product_id);
CREATE INDEX IF NOT EXISTS idx_gr_items_org_product ON goods_receipt_items(organization_id, product_id);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_expected ON purchase_orders(expected_delivery_date) WHERE expected_delivery_date IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_suppliers_category ON suppliers(organization_id, category) WHERE category IS NOT NULL;