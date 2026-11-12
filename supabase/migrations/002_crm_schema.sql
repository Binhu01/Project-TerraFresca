-- Nexora Fase 03 — CRM: customers, pipelines, pipeline_stages, leads, interactions
-- All tables are scoped by organization_id and protected by RLS.

-- ============================================================================
-- CUSTOMERS
-- ============================================================================
CREATE TABLE IF NOT EXISTS customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  customer_type TEXT NOT NULL CHECK (customer_type IN ('pf', 'pj')) DEFAULT 'pf',
  name TEXT NOT NULL,
  document TEXT,
  email TEXT,
  phone TEXT,
  whatsapp TEXT,
  primary_contact_name TEXT,
  source TEXT,
  category TEXT,
  notes TEXT,
  status TEXT NOT NULL CHECK (status IN ('active', 'inactive')) DEFAULT 'active',
  archived_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_customers_organization_id ON customers(organization_id);
CREATE INDEX IF NOT EXISTS idx_customers_status ON customers(status);
CREATE INDEX IF NOT EXISTS idx_customers_archived_at ON customers(archived_at);
CREATE INDEX IF NOT EXISTS idx_customers_email ON customers(LOWER(email)) WHERE email IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone) WHERE phone IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_customers_trgm_name ON customers USING gin (name gin_trgm_ops);

-- ============================================================================
-- PIPELINES (one default pipeline per org, extensible later)
-- ============================================================================
CREATE TABLE IF NOT EXISTS pipelines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pipelines_organization_id ON pipelines(organization_id);

-- ============================================================================
-- PIPELINE_STAGES
-- ============================================================================
CREATE TABLE IF NOT EXISTS pipeline_stages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  pipeline_id UUID NOT NULL REFERENCES pipelines(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  position INTEGER NOT NULL,
  is_won BOOLEAN NOT NULL DEFAULT false,
  is_lost BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT pipeline_stages_won_lost_exclusive CHECK (NOT (is_won AND is_lost))
);

CREATE INDEX IF NOT EXISTS idx_pipeline_stages_pipeline_id ON pipeline_stages(pipeline_id);
CREATE INDEX IF NOT EXISTS idx_pipeline_stages_organization_id ON pipeline_stages(organization_id);

-- ============================================================================
-- LEADS
-- ============================================================================
CREATE TABLE IF NOT EXISTS leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  pipeline_id UUID NOT NULL REFERENCES pipelines(id) ON DELETE RESTRICT,
  stage_id UUID NOT NULL REFERENCES pipeline_stages(id) ON DELETE RESTRICT,
  name TEXT NOT NULL,
  company_name TEXT,
  email TEXT,
  phone TEXT,
  whatsapp TEXT,
  source TEXT,
  interest TEXT,
  estimated_value NUMERIC(14, 2),
  assigned_to UUID REFERENCES profiles(id) ON DELETE SET NULL,
  expected_return_at TIMESTAMPTZ,
  status TEXT NOT NULL CHECK (status IN ('open', 'won', 'lost', 'archived')) DEFAULT 'open',
  notes TEXT,
  converted_customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  converted_at TIMESTAMPTZ,
  archived_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_leads_organization_id ON leads(organization_id);
CREATE INDEX IF NOT EXISTS idx_leads_stage_id ON leads(stage_id);
CREATE INDEX IF NOT EXISTS idx_leads_pipeline_id ON leads(pipeline_id);
CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_assigned_to ON leads(assigned_to);
CREATE INDEX IF NOT EXISTS idx_leads_archived_at ON leads(archived_at);
CREATE INDEX IF NOT EXISTS idx_leads_expected_return_at ON leads(expected_return_at) WHERE expected_return_at IS NOT NULL;

-- ============================================================================
-- INTERACTIONS (timeline entries attached to a customer or a lead)
-- ============================================================================
CREATE TABLE IF NOT EXISTS interactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
  lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('call', 'message', 'email', 'meeting', 'note', 'other')),
  description TEXT NOT NULL,
  created_by UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT interactions_target_check CHECK (
    (customer_id IS NOT NULL AND lead_id IS NULL) OR
    (customer_id IS NULL AND lead_id IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS idx_interactions_organization_id ON interactions(organization_id);
CREATE INDEX IF NOT EXISTS idx_interactions_customer_id ON interactions(customer_id) WHERE customer_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_interactions_lead_id ON interactions(lead_id) WHERE lead_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_interactions_occurred_at ON interactions(occurred_at DESC);

-- ============================================================================
-- ENABLE RLS
-- ============================================================================
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE pipelines ENABLE ROW LEVEL SECURITY;
ALTER TABLE pipeline_stages ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE interactions ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- HELPER: check that the caller is a member of the given organization
-- ============================================================================
CREATE OR REPLACE FUNCTION is_member_of(p_org_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER STABLE SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM memberships
    WHERE memberships.organization_id = p_org_id
      AND memberships.user_id = auth.uid()
  );
$$;

-- ============================================================================
-- CUSTOMERS policies
-- ============================================================================
CREATE POLICY "Members can view customers of their organizations"
  ON customers FOR SELECT
  USING (is_member_of(organization_id));

CREATE POLICY "Members can insert customers into their organizations"
  ON customers FOR INSERT
  WITH CHECK (is_member_of(organization_id));

CREATE POLICY "Members can update customers of their organizations"
  ON customers FOR UPDATE
  USING (is_member_of(organization_id))
  WITH CHECK (is_member_of(organization_id));

CREATE POLICY "Members can delete customers of their organizations"
  ON customers FOR DELETE
  USING (is_member_of(organization_id));

-- ============================================================================
-- PIPELINES policies
-- ============================================================================
CREATE POLICY "Members can view pipelines of their organizations"
  ON pipelines FOR SELECT
  USING (is_member_of(organization_id));

CREATE POLICY "Members can insert pipelines into their organizations"
  ON pipelines FOR INSERT
  WITH CHECK (is_member_of(organization_id));

CREATE POLICY "Members can update pipelines of their organizations"
  ON pipelines FOR UPDATE
  USING (is_member_of(organization_id))
  WITH CHECK (is_member_of(organization_id));

-- ============================================================================
-- PIPELINE_STAGES policies
-- ============================================================================
CREATE POLICY "Members can view pipeline_stages of their organizations"
  ON pipeline_stages FOR SELECT
  USING (is_member_of(organization_id));

CREATE POLICY "Members can insert pipeline_stages into their organizations"
  ON pipeline_stages FOR INSERT
  WITH CHECK (is_member_of(organization_id));

CREATE POLICY "Members can update pipeline_stages of their organizations"
  ON pipeline_stages FOR UPDATE
  USING (is_member_of(organization_id))
  WITH CHECK (is_member_of(organization_id));

-- ============================================================================
-- LEADS policies
-- ============================================================================
CREATE POLICY "Members can view leads of their organizations"
  ON leads FOR SELECT
  USING (is_member_of(organization_id));

CREATE POLICY "Members can insert leads into their organizations"
  ON leads FOR INSERT
  WITH CHECK (is_member_of(organization_id));

CREATE POLICY "Members can update leads of their organizations"
  ON leads FOR UPDATE
  USING (is_member_of(organization_id))
  WITH CHECK (is_member_of(organization_id));

CREATE POLICY "Members can delete leads of their organizations"
  ON leads FOR DELETE
  USING (is_member_of(organization_id));

-- ============================================================================
-- INTERACTIONS policies
-- ============================================================================
CREATE POLICY "Members can view interactions of their organizations"
  ON interactions FOR SELECT
  USING (is_member_of(organization_id));

CREATE POLICY "Members can insert interactions into their organizations"
  ON interactions FOR INSERT
  WITH CHECK (is_member_of(organization_id) AND created_by = auth.uid());

CREATE POLICY "Members can delete their own interactions"
  ON interactions FOR DELETE
  USING (is_member_of(organization_id) AND created_by = auth.uid());

-- ============================================================================
-- AUTO-SEED default pipeline when a new organization is created
-- ============================================================================
CREATE OR REPLACE FUNCTION seed_default_pipeline()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_pipeline_id UUID;
BEGIN
  INSERT INTO pipelines (organization_id, name, is_default)
  VALUES (NEW.id, 'Pipeline Comercial', true)
  RETURNING id INTO v_pipeline_id;

  INSERT INTO pipeline_stages (organization_id, pipeline_id, name, position, is_won, is_lost) VALUES
    (NEW.id, v_pipeline_id, 'Novo',             1, false, false),
    (NEW.id, v_pipeline_id, 'Primeiro contato', 2, false, false),
    (NEW.id, v_pipeline_id, 'Qualificado',      3, false, false),
    (NEW.id, v_pipeline_id, 'Proposta',         4, false, false),
    (NEW.id, v_pipeline_id, 'Negociação',       5, false, false),
    (NEW.id, v_pipeline_id, 'Ganho',            6, true,  false),
    (NEW.id, v_pipeline_id, 'Perdido',          7, false, true);

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_seed_default_pipeline ON organizations;
CREATE TRIGGER trigger_seed_default_pipeline
  AFTER INSERT ON organizations
  FOR EACH ROW EXECUTE FUNCTION seed_default_pipeline();

-- ============================================================================
-- UPDATED_AT triggers
-- ============================================================================
CREATE TRIGGER set_customers_updated_at
  BEFORE UPDATE ON customers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_pipelines_updated_at
  BEFORE UPDATE ON pipelines
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_pipeline_stages_updated_at
  BEFORE UPDATE ON pipeline_stages
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_leads_updated_at
  BEFORE UPDATE ON leads
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();