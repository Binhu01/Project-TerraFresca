-- Nexora Fase 04 — Vendas: sales_channels, orders, order_items, quotes, quote_items, order_status_history, document_sequences
-- All tables scoped by organization_id and protected by RLS via is_member_of().

-- ============================================================================
-- SALES CHANNELS (canais de venda: loja física, online, WhatsApp, etc.)
-- ============================================================================
CREATE TABLE IF NOT EXISTS sales_channels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sales_channels_organization_id ON sales_channels(organization_id);
CREATE INDEX IF NOT EXISTS idx_sales_channels_is_active ON sales_channels(is_active);

-- ============================================================================
-- DOCUMENT SEQUENCES (numeração sequencial atômica por org/tipo/ano)
-- ============================================================================
CREATE TABLE IF NOT EXISTS document_sequences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  document_type TEXT NOT NULL CHECK (document_type IN ('order', 'quote')),
  year INTEGER NOT NULL,
  current_number INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT document_sequences_unique UNIQUE (organization_id, document_type, year)
);

CREATE INDEX IF NOT EXISTS idx_document_sequences_lookup ON document_sequences(organization_id, document_type, year);

-- ============================================================================
-- ORDERS (pedidos de venda)
-- ============================================================================
CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
  channel_id UUID REFERENCES sales_channels(id) ON DELETE SET NULL,
  lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
  document_number TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('draft', 'confirmed', 'preparing', 'completed', 'cancelled')) DEFAULT 'draft',
  subtotal NUMERIC(14, 2) NOT NULL DEFAULT 0,
  discount NUMERIC(14, 2) NOT NULL DEFAULT 0,
  tax NUMERIC(14, 2) NOT NULL DEFAULT 0,
  total NUMERIC(14, 2) NOT NULL DEFAULT 0,
  notes TEXT,
  issued_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  created_by UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_orders_organization_id ON orders(organization_id);
CREATE INDEX IF NOT EXISTS idx_orders_customer_id ON orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_channel_id ON orders(channel_id) WHERE channel_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_orders_lead_id ON orders(lead_id) WHERE lead_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_document_number ON orders(document_number);
CREATE INDEX IF NOT EXISTS idx_orders_issued_at ON orders(issued_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_created_by ON orders(created_by);

-- ============================================================================
-- ORDER ITEMS
-- ============================================================================
CREATE TABLE IF NOT EXISTS order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  quantity NUMERIC(14, 4) NOT NULL DEFAULT 1,
  unit_price NUMERIC(14, 2) NOT NULL DEFAULT 0,
  discount NUMERIC(14, 2) NOT NULL DEFAULT 0,
  total NUMERIC(14, 2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_organization_id ON order_items(organization_id);

-- ============================================================================
-- QUOTES (orçamentos)
-- ============================================================================
CREATE TABLE IF NOT EXISTS quotes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
  channel_id UUID REFERENCES sales_channels(id) ON DELETE SET NULL,
  lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
  document_number TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('draft', 'sent', 'accepted', 'rejected', 'expired', 'converted')) DEFAULT 'draft',
  subtotal NUMERIC(14, 2) NOT NULL DEFAULT 0,
  discount NUMERIC(14, 2) NOT NULL DEFAULT 0,
  tax NUMERIC(14, 2) NOT NULL DEFAULT 0,
  total NUMERIC(14, 2) NOT NULL DEFAULT 0,
  notes TEXT,
  valid_until TIMESTAMPTZ NOT NULL,
  converted_order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
  converted_at TIMESTAMPTZ,
  created_by UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_quotes_organization_id ON quotes(organization_id);
CREATE INDEX IF NOT EXISTS idx_quotes_customer_id ON quotes(customer_id);
CREATE INDEX IF NOT EXISTS idx_quotes_channel_id ON quotes(channel_id) WHERE channel_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_quotes_lead_id ON quotes(lead_id) WHERE lead_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_quotes_status ON quotes(status);
CREATE INDEX IF NOT EXISTS idx_quotes_document_number ON quotes(document_number);
CREATE INDEX IF NOT EXISTS idx_quotes_valid_until ON quotes(valid_until);
CREATE INDEX IF NOT EXISTS idx_quotes_converted_order_id ON quotes(converted_order_id) WHERE converted_order_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_quotes_created_by ON quotes(created_by);

-- ============================================================================
-- QUOTE ITEMS
-- ============================================================================
CREATE TABLE IF NOT EXISTS quote_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id UUID NOT NULL REFERENCES quotes(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  quantity NUMERIC(14, 4) NOT NULL DEFAULT 1,
  unit_price NUMERIC(14, 2) NOT NULL DEFAULT 0,
  discount NUMERIC(14, 2) NOT NULL DEFAULT 0,
  total NUMERIC(14, 2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_quote_items_quote_id ON quote_items(quote_id);
CREATE INDEX IF NOT EXISTS idx_quote_items_organization_id ON quote_items(organization_id);

-- ============================================================================
-- ORDER STATUS HISTORY (auditoria de transições de status)
-- ============================================================================
CREATE TABLE IF NOT EXISTS order_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  from_status TEXT,
  to_status TEXT NOT NULL,
  reason TEXT,
  changed_by UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_order_status_history_order_id ON order_status_history(order_id);
CREATE INDEX IF NOT EXISTS idx_order_status_history_organization_id ON order_status_history(organization_id);
CREATE INDEX IF NOT EXISTS idx_order_status_history_created_at ON order_status_history(created_at DESC);

-- ============================================================================
-- ENABLE RLS
-- ============================================================================
ALTER TABLE sales_channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_sequences ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE quote_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_status_history ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- SALES CHANNELS policies
-- ============================================================================
CREATE POLICY "Members can view sales_channels of their organizations"
  ON sales_channels FOR SELECT
  USING (is_member_of(organization_id));

CREATE POLICY "Members can insert sales_channels into their organizations"
  ON sales_channels FOR INSERT
  WITH CHECK (is_member_of(organization_id));

CREATE POLICY "Members can update sales_channels of their organizations"
  ON sales_channels FOR UPDATE
  USING (is_member_of(organization_id))
  WITH CHECK (is_member_of(organization_id));

CREATE POLICY "Members can delete sales_channels of their organizations"
  ON sales_channels FOR DELETE
  USING (is_member_of(organization_id));

-- ============================================================================
-- DOCUMENT SEQUENCES policies
-- ============================================================================
CREATE POLICY "Members can view document_sequences of their organizations"
  ON document_sequences FOR SELECT
  USING (is_member_of(organization_id));

CREATE POLICY "Members can insert document_sequences into their organizations"
  ON document_sequences FOR INSERT
  WITH CHECK (is_member_of(organization_id));

CREATE POLICY "Members can update document_sequences of their organizations"
  ON document_sequences FOR UPDATE
  USING (is_member_of(organization_id))
  WITH CHECK (is_member_of(organization_id));

-- ============================================================================
-- ORDERS policies
-- ============================================================================
CREATE POLICY "Members can view orders of their organizations"
  ON orders FOR SELECT
  USING (is_member_of(organization_id));

CREATE POLICY "Members can insert orders into their organizations"
  ON orders FOR INSERT
  WITH CHECK (is_member_of(organization_id));

CREATE POLICY "Members can update orders of their organizations"
  ON orders FOR UPDATE
  USING (is_member_of(organization_id))
  WITH CHECK (is_member_of(organization_id));

-- ============================================================================
-- ORDER ITEMS policies
-- ============================================================================
CREATE POLICY "Members can view order_items of their organizations"
  ON order_items FOR SELECT
  USING (is_member_of(organization_id));

CREATE POLICY "Members can insert order_items into their organizations"
  ON order_items FOR INSERT
  WITH CHECK (is_member_of(organization_id));

CREATE POLICY "Members can update order_items of their organizations"
  ON order_items FOR UPDATE
  USING (is_member_of(organization_id))
  WITH CHECK (is_member_of(organization_id));

CREATE POLICY "Members can delete order_items of their organizations"
  ON order_items FOR DELETE
  USING (is_member_of(organization_id));

-- ============================================================================
-- QUOTES policies
-- ============================================================================
CREATE POLICY "Members can view quotes of their organizations"
  ON quotes FOR SELECT
  USING (is_member_of(organization_id));

CREATE POLICY "Members can insert quotes into their organizations"
  ON quotes FOR INSERT
  WITH CHECK (is_member_of(organization_id));

CREATE POLICY "Members can update quotes of their organizations"
  ON quotes FOR UPDATE
  USING (is_member_of(organization_id))
  WITH CHECK (is_member_of(organization_id));

-- ============================================================================
-- QUOTE ITEMS policies
-- ============================================================================
CREATE POLICY "Members can view quote_items of their organizations"
  ON quote_items FOR SELECT
  USING (is_member_of(organization_id));

CREATE POLICY "Members can insert quote_items into their organizations"
  ON quote_items FOR INSERT
  WITH CHECK (is_member_of(organization_id));

CREATE POLICY "Members can update quote_items of their organizations"
  ON quote_items FOR UPDATE
  USING (is_member_of(organization_id))
  WITH CHECK (is_member_of(organization_id));

CREATE POLICY "Members can delete quote_items of their organizations"
  ON quote_items FOR DELETE
  USING (is_member_of(organization_id));

-- ============================================================================
-- ORDER STATUS HISTORY policies
-- ============================================================================
CREATE POLICY "Members can view order_status_history of their organizations"
  ON order_status_history FOR SELECT
  USING (is_member_of(organization_id));

CREATE POLICY "Members can insert order_status_history into their organizations"
  ON order_status_history FOR INSERT
  WITH CHECK (is_member_of(organization_id));

-- ============================================================================
-- FUNCTION: next_document_number (atomic, concurrency-safe)
-- Usage: SELECT next_document_number(p_org_id, 'order') → 'PED-2026-000001'
-- ============================================================================
CREATE OR REPLACE FUNCTION next_document_number(p_org_id UUID, p_type TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_year INTEGER;
  v_next INTEGER;
  v_prefix TEXT;
BEGIN
  IF p_type NOT IN ('order', 'quote') THEN
    RAISE EXCEPTION 'Invalid document type: %', p_type;
  END IF;

  v_year := EXTRACT(YEAR FROM now());
  v_prefix := CASE WHEN p_type = 'order' THEN 'PED' ELSE 'ORC' END;

  -- Atomically increment or create the sequence row
  INSERT INTO document_sequences (organization_id, document_type, year, current_number)
  VALUES (p_org_id, p_type, v_year, 1)
  ON CONFLICT (organization_id, document_type, year)
  DO UPDATE SET current_number = document_sequences.current_number + 1
  RETURNING current_number INTO v_next;

  RETURN format('%s-%s-%s', v_prefix, v_year, lpad(v_next::text, 6, '0'));
END;
$$;

-- ============================================================================
-- AUTO-SEED default sales channel when a new organization is created
-- ============================================================================
CREATE OR REPLACE FUNCTION seed_default_sales_channel()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO sales_channels (organization_id, name, description, is_active)
  VALUES (NEW.id, 'Geral', 'Canal de vendas padrão', true);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_seed_default_sales_channel ON organizations;
CREATE TRIGGER trigger_seed_default_sales_channel
  AFTER INSERT ON organizations
  FOR EACH ROW EXECUTE FUNCTION seed_default_sales_channel();

-- ============================================================================
-- UPDATED_AT triggers
-- ============================================================================
CREATE TRIGGER set_sales_channels_updated_at
  BEFORE UPDATE ON sales_channels
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_document_sequences_updated_at
  BEFORE UPDATE ON document_sequences
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_orders_updated_at
  BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_order_items_updated_at
  BEFORE UPDATE ON order_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_quotes_updated_at
  BEFORE UPDATE ON quotes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_quote_items_updated_at
  BEFORE UPDATE ON quote_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();