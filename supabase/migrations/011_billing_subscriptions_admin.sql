-- ============================================================================
-- NEXORA FASE 14: Planos, Assinaturas e Administração SaaS
-- Migration 011 — Billing, Subscriptions, Entitlements, Platform Admin
-- ============================================================================

-- ============================================================================
-- 1. SUBSCRIPTION PLANS (catálogo global, não tenant-scoped)
-- ============================================================================

CREATE TABLE IF NOT EXISTS subscription_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_featured BOOLEAN NOT NULL DEFAULT false,
  display_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_subscription_plans_active ON subscription_plans(is_active, display_order);

-- ============================================================================
-- 2. SUBSCRIPTION PLAN VERSIONS (versionamento de preços/limites)
-- ============================================================================

CREATE TABLE IF NOT EXISTS subscription_plan_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID NOT NULL REFERENCES subscription_plans(id) ON DELETE CASCADE,
  version INT NOT NULL DEFAULT 1,
  monthly_price NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (monthly_price >= 0),
  annual_price NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (annual_price >= 0),
  currency TEXT NOT NULL DEFAULT 'BRL',
  trial_days INT NOT NULL DEFAULT 0 CHECK (trial_days >= 0),
  grace_period_days INT NOT NULL DEFAULT 7 CHECK (grace_period_days >= 0),
  published_at TIMESTAMPTZ,
  valid_until TIMESTAMPTZ,
  external_plan_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(plan_id, version)
);

CREATE INDEX idx_plan_versions_plan ON subscription_plan_versions(plan_id);
CREATE INDEX idx_plan_versions_published ON subscription_plan_versions(published_at) WHERE published_at IS NOT NULL;

-- ============================================================================
-- 3. PLAN ENTITLEMENTS (recursos e limites por versão de plano)
-- ============================================================================

CREATE TABLE IF NOT EXISTS plan_entitlements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_version_id UUID NOT NULL REFERENCES subscription_plan_versions(id) ON DELETE CASCADE,
  feature_key TEXT NOT NULL,
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  limit_value INT,
  limit_unit TEXT,
  configuration JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(plan_version_id, feature_key)
);

CREATE INDEX idx_entitlements_version ON plan_entitlements(plan_version_id);
CREATE INDEX idx_entitlements_feature ON plan_entitlements(feature_key);

-- ============================================================================
-- 4. BILLING CUSTOMERS (vínculo org ↔ provedor de pagamento)
-- ============================================================================

CREATE TABLE IF NOT EXISTS billing_customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  provider TEXT NOT NULL DEFAULT 'mercadopago',
  external_customer_id TEXT NOT NULL,
  billing_email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(organization_id, provider)
);

CREATE INDEX idx_billing_customers_org ON billing_customers(organization_id);
CREATE INDEX idx_billing_customers_external ON billing_customers(provider, external_customer_id);

-- ============================================================================
-- 5. SUBSCRIPTIONS (assinaturas das organizações)
-- ============================================================================

CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  plan_version_id UUID NOT NULL REFERENCES subscription_plan_versions(id) ON DELETE RESTRICT,
  billing_provider TEXT NOT NULL DEFAULT 'mercadopago',
  external_subscription_id TEXT,
  status TEXT NOT NULL DEFAULT 'incomplete' CHECK (status IN (
    'trialing', 'active', 'past_due', 'grace_period', 'paused', 'canceled', 'expired', 'incomplete'
  )),
  billing_interval TEXT NOT NULL DEFAULT 'monthly' CHECK (billing_interval IN ('monthly', 'annual')),
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  trial_start TIMESTAMPTZ,
  trial_end TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN NOT NULL DEFAULT false,
  canceled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(organization_id)
);

CREATE INDEX idx_subscriptions_org ON subscriptions(organization_id);
CREATE INDEX idx_subscriptions_status ON subscriptions(status);
CREATE INDEX idx_subscriptions_external ON subscriptions(billing_provider, external_subscription_id);
CREATE INDEX idx_subscriptions_trial_end ON subscriptions(trial_end) WHERE trial_end IS NOT NULL;
CREATE INDEX idx_subscriptions_period_end ON subscriptions(current_period_end) WHERE current_period_end IS NOT NULL;

-- ============================================================================
-- 6. SUBSCRIPTION EVENTS (histórico de mudanças de estado)
-- ============================================================================

CREATE TABLE IF NOT EXISTS subscription_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  subscription_id UUID NOT NULL REFERENCES subscriptions(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  previous_status TEXT,
  new_status TEXT NOT NULL,
  source TEXT NOT NULL DEFAULT 'system' CHECK (source IN ('system', 'webhook', 'admin', 'user')),
  metadata JSONB DEFAULT '{}',
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_sub_events_sub ON subscription_events(subscription_id);
CREATE INDEX idx_sub_events_org ON subscription_events(organization_id, occurred_at DESC);

-- ============================================================================
-- 7. SUBSCRIPTION INVOICES (cobranças/faturas)
-- ============================================================================

CREATE TABLE IF NOT EXISTS subscription_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  subscription_id UUID NOT NULL REFERENCES subscriptions(id) ON DELETE CASCADE,
  external_invoice_id TEXT,
  amount NUMERIC(14,2) NOT NULL CHECK (amount >= 0),
  currency TEXT NOT NULL DEFAULT 'BRL',
  due_at TIMESTAMPTZ NOT NULL,
  paid_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending', 'approved', 'refused', 'processing', 'refunded', 'cancelled'
  )),
  document_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_invoices_org ON subscription_invoices(organization_id);
CREATE INDEX idx_invoices_sub ON subscription_invoices(subscription_id);
CREATE INDEX idx_invoices_status ON subscription_invoices(status);
CREATE INDEX idx_invoices_due ON subscription_invoices(due_at);

-- ============================================================================
-- 8. SUBSCRIPTION PAYMENT EVENTS (eventos de pagamento idempotentes)
-- ============================================================================

CREATE TABLE IF NOT EXISTS subscription_payment_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  subscription_id UUID NOT NULL REFERENCES subscriptions(id) ON DELETE CASCADE,
  external_payment_id TEXT NOT NULL,
  event_id TEXT NOT NULL UNIQUE,
  amount NUMERIC(14,2),
  currency TEXT DEFAULT 'BRL',
  status TEXT NOT NULL,
  paid_at TIMESTAMPTZ,
  raw_payload JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_payment_events_sub ON subscription_payment_events(subscription_id);
CREATE INDEX idx_payment_events_org ON subscription_payment_events(organization_id);

-- ============================================================================
-- 9. PLAN CHANGES (upgrade/downgrade pendentes e históricos)
-- ============================================================================

CREATE TABLE IF NOT EXISTS plan_changes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  current_subscription_id UUID NOT NULL REFERENCES subscriptions(id) ON DELETE CASCADE,
  requested_plan_version_id UUID NOT NULL REFERENCES subscription_plan_versions(id) ON DELETE RESTRICT,
  change_type TEXT NOT NULL CHECK (change_type IN ('upgrade', 'downgrade')),
  effective_at TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'applied', 'cancelled')),
  requested_by UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_plan_changes_org ON plan_changes(organization_id);
CREATE INDEX idx_plan_changes_sub ON plan_changes(current_subscription_id);

-- ============================================================================
-- 10. ORGANIZATION USAGE RECORDS (utilização por período)
-- ============================================================================

CREATE TABLE IF NOT EXISTS organization_usage_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  feature_key TEXT NOT NULL,
  usage_value INT NOT NULL DEFAULT 0,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(organization_id, feature_key, period_start)
);

CREATE INDEX idx_usage_records_org ON organization_usage_records(organization_id, period_start);

-- ============================================================================
-- 11. PLATFORM ADMINS (administradores internos da Nexora)
-- ============================================================================

CREATE TABLE IF NOT EXISTS platform_admins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE UNIQUE,
  internal_role TEXT NOT NULL DEFAULT 'support' CHECK (internal_role IN ('super_admin', 'billing_admin', 'support')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_platform_admins_user ON platform_admins(user_id);

-- ============================================================================
-- 12. PLATFORM AUDIT LOGS (auditoria do painel admin)
-- ============================================================================

CREATE TABLE IF NOT EXISTS platform_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  action TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id UUID,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_platform_audit_actor ON platform_audit_logs(actor_user_id);
CREATE INDEX idx_platform_audit_resource ON platform_audit_logs(resource_type, resource_id);
CREATE INDEX idx_platform_audit_created ON platform_audit_logs(created_at DESC);

-- ============================================================================
-- 13. SUPPORT TICKETS (chamados de suporte)
-- ============================================================================

CREATE TABLE IF NOT EXISTS support_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  subject TEXT NOT NULL,
  description TEXT NOT NULL,
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'waiting_customer', 'resolved', 'closed')),
  assigned_admin_id UUID REFERENCES platform_admins(id) ON DELETE SET NULL,
  created_by UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_tickets_org ON support_tickets(organization_id);
CREATE INDEX idx_tickets_status ON support_tickets(status);
CREATE INDEX idx_tickets_assigned ON support_tickets(assigned_admin_id);

-- ============================================================================
-- TRIGGERS: updated_at automático
-- ============================================================================

CREATE TRIGGER set_subscription_plans_updated_at
  BEFORE UPDATE ON subscription_plans
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_billing_customers_updated_at
  BEFORE UPDATE ON billing_customers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_subscriptions_updated_at
  BEFORE UPDATE ON subscriptions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_platform_admins_updated_at
  BEFORE UPDATE ON platform_admins
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_support_tickets_updated_at
  BEFORE UPDATE ON support_tickets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- RLS: Habilitar em todas as tabelas novas
-- ============================================================================

ALTER TABLE subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscription_plan_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE plan_entitlements ENABLE ROW LEVEL SECURITY;
ALTER TABLE billing_customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscription_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscription_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscription_payment_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE plan_changes ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_usage_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- RLS POLICIES: Catálogo de planos (leitura pública para autenticados)
-- ============================================================================

CREATE POLICY "Authenticated users can view active plans"
  ON subscription_plans FOR SELECT
  TO authenticated
  USING (is_active = true OR EXISTS (
    SELECT 1 FROM platform_admins pa WHERE pa.user_id = auth.uid() AND pa.is_active = true
  ));

CREATE POLICY "Platform admins can manage plans"
  ON subscription_plans FOR ALL
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM platform_admins pa WHERE pa.user_id = auth.uid() AND pa.is_active = true
  ));

CREATE POLICY "Authenticated users can view published plan versions"
  ON subscription_plan_versions FOR SELECT
  TO authenticated
  USING (published_at IS NOT NULL OR EXISTS (
    SELECT 1 FROM platform_admins pa WHERE pa.user_id = auth.uid() AND pa.is_active = true
  ));

CREATE POLICY "Platform admins can manage plan versions"
  ON subscription_plan_versions FOR ALL
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM platform_admins pa WHERE pa.user_id = auth.uid() AND pa.is_active = true
  ));

CREATE POLICY "Authenticated users can view entitlements of published versions"
  ON plan_entitlements FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM subscription_plan_versions spv
    WHERE spv.id = plan_entitlements.plan_version_id AND spv.published_at IS NOT NULL
  ) OR EXISTS (
    SELECT 1 FROM platform_admins pa WHERE pa.user_id = auth.uid() AND pa.is_active = true
  ));

CREATE POLICY "Platform admins can manage entitlements"
  ON plan_entitlements FOR ALL
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM platform_admins pa WHERE pa.user_id = auth.uid() AND pa.is_active = true
  ));

-- ============================================================================
-- RLS POLICIES: Billing customers (org members + admins)
-- ============================================================================

CREATE POLICY "Org members can view own billing customer"
  ON billing_customers FOR SELECT
  TO authenticated
  USING (is_member_of(organization_id));

CREATE POLICY "Platform admins can view all billing customers"
  ON billing_customers FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM platform_admins pa WHERE pa.user_id = auth.uid() AND pa.is_active = true
  ));

CREATE POLICY "Platform admins can manage billing customers"
  ON billing_customers FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM platform_admins pa WHERE pa.user_id = auth.uid() AND pa.is_active = true
  ));

-- ============================================================================
-- RLS POLICIES: Subscriptions (org OWNER/ADMIN + platform admins)
-- ============================================================================

CREATE POLICY "Org owners/admins can view own subscription"
  ON subscriptions FOR SELECT
  TO authenticated
  USING (
    is_member_of(organization_id) AND EXISTS (
      SELECT 1 FROM memberships m
      WHERE m.organization_id = subscriptions.organization_id
      AND m.user_id = auth.uid()
      AND m.role IN ('OWNER', 'ADMIN')
      AND m.status = 'active'
    )
  );

CREATE POLICY "Platform admins can view all subscriptions"
  ON subscriptions FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM platform_admins pa WHERE pa.user_id = auth.uid() AND pa.is_active = true
  ));

CREATE POLICY "Platform admins can manage subscriptions"
  ON subscriptions FOR ALL
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM platform_admins pa WHERE pa.user_id = auth.uid() AND pa.is_active = true
  ));

-- ============================================================================
-- RLS POLICIES: Subscription events (org owners + platform admins)
-- ============================================================================

CREATE POLICY "Org owners can view own subscription events"
  ON subscription_events FOR SELECT
  TO authenticated
  USING (
    is_member_of(organization_id) AND EXISTS (
      SELECT 1 FROM memberships m
      WHERE m.organization_id = subscription_events.organization_id
      AND m.user_id = auth.uid()
      AND m.role IN ('OWNER', 'ADMIN')
      AND m.status = 'active'
    )
  );

CREATE POLICY "Platform admins can view all subscription events"
  ON subscription_events FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM platform_admins pa WHERE pa.user_id = auth.uid() AND pa.is_active = true
  ));

CREATE POLICY "System can insert subscription events"
  ON subscription_events FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- ============================================================================
-- RLS POLICIES: Invoices (org owners + platform admins)
-- ============================================================================

CREATE POLICY "Org owners can view own invoices"
  ON subscription_invoices FOR SELECT
  TO authenticated
  USING (
    is_member_of(organization_id) AND EXISTS (
      SELECT 1 FROM memberships m
      WHERE m.organization_id = subscription_invoices.organization_id
      AND m.user_id = auth.uid()
      AND m.role IN ('OWNER', 'ADMIN')
      AND m.status = 'active'
    )
  );

CREATE POLICY "Platform admins can view all invoices"
  ON subscription_invoices FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM platform_admins pa WHERE pa.user_id = auth.uid() AND pa.is_active = true
  ));

-- ============================================================================
-- RLS POLICIES: Payment events (platform admins only for security)
-- ============================================================================

CREATE POLICY "Platform admins can view payment events"
  ON subscription_payment_events FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM platform_admins pa WHERE pa.user_id = auth.uid() AND pa.is_active = true
  ));

CREATE POLICY "System can insert payment events"
  ON subscription_payment_events FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- ============================================================================
-- RLS POLICIES: Plan changes (org owners + platform admins)
-- ============================================================================

CREATE POLICY "Org owners can view own plan changes"
  ON plan_changes FOR SELECT
  TO authenticated
  USING (
    is_member_of(organization_id) AND EXISTS (
      SELECT 1 FROM memberships m
      WHERE m.organization_id = plan_changes.organization_id
      AND m.user_id = auth.uid()
      AND m.role IN ('OWNER', 'ADMIN')
      AND m.status = 'active'
    )
  );

CREATE POLICY "Platform admins can view all plan changes"
  ON plan_changes FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM platform_admins pa WHERE pa.user_id = auth.uid() AND pa.is_active = true
  ));

-- ============================================================================
-- RLS POLICIES: Usage records (org members + platform admins)
-- ============================================================================

CREATE POLICY "Org members can view own usage records"
  ON organization_usage_records FOR SELECT
  TO authenticated
  USING (is_member_of(organization_id));

CREATE POLICY "Platform admins can view all usage records"
  ON organization_usage_records FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM platform_admins pa WHERE pa.user_id = auth.uid() AND pa.is_active = true
  ));

-- ============================================================================
-- RLS POLICIES: Platform admins (self-view + super_admin management)
-- ============================================================================

CREATE POLICY "Platform admins can view own record"
  ON platform_admins FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() AND is_active = true);

CREATE POLICY "Super admins can manage platform admins"
  ON platform_admins FOR ALL
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM platform_admins pa
    WHERE pa.user_id = auth.uid() AND pa.internal_role = 'super_admin' AND pa.is_active = true
  ));

-- ============================================================================
-- RLS POLICIES: Platform audit logs (platform admins only)
-- ============================================================================

CREATE POLICY "Platform admins can view audit logs"
  ON platform_audit_logs FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM platform_admins pa WHERE pa.user_id = auth.uid() AND pa.is_active = true
  ));

CREATE POLICY "Platform admins can insert audit logs"
  ON platform_audit_logs FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM platform_admins pa WHERE pa.user_id = auth.uid() AND pa.is_active = true
  ));

-- ============================================================================
-- RLS POLICIES: Support tickets (org members + assigned admin + platform admins)
-- ============================================================================

CREATE POLICY "Org members can view own tickets"
  ON support_tickets FOR SELECT
  TO authenticated
  USING (is_member_of(organization_id));

CREATE POLICY "Platform admins can view all tickets"
  ON support_tickets FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM platform_admins pa WHERE pa.user_id = auth.uid() AND pa.is_active = true
  ));

CREATE POLICY "Org members can create tickets"
  ON support_tickets FOR INSERT
  TO authenticated
  WITH CHECK (is_member_of(organization_id));

CREATE POLICY "Platform admins can update tickets"
  ON support_tickets FOR UPDATE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM platform_admins pa WHERE pa.user_id = auth.uid() AND pa.is_active = true
  ));

-- ============================================================================
-- SECURITY DEFINER FUNCTIONS
-- ============================================================================

-- Check if user is a platform admin
CREATE OR REPLACE FUNCTION is_platform_admin(p_user_id UUID)
RETURNS BOOLEAN LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM platform_admins
    WHERE user_id = p_user_id AND is_active = true
  );
$$;

-- Check entitlement for an organization
CREATE OR REPLACE FUNCTION check_entitlement(p_org_id UUID, p_feature_key TEXT)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public AS $$
DECLARE
  v_plan_version_id UUID;
  v_is_enabled BOOLEAN;
BEGIN
  -- Get active subscription's plan version
  SELECT plan_version_id INTO v_plan_version_id
  FROM subscriptions
  WHERE organization_id = p_org_id
    AND status IN ('active', 'trialing', 'grace_period')
  LIMIT 1;

  IF v_plan_version_id IS NULL THEN
    RETURN false;
  END IF;

  -- Check entitlement
  SELECT is_enabled INTO v_is_enabled
  FROM plan_entitlements
  WHERE plan_version_id = v_plan_version_id
    AND feature_key = p_feature_key;

  RETURN COALESCE(v_is_enabled, false);
END;
$$;

-- Get entitlement limit for an organization
CREATE OR REPLACE FUNCTION get_entitlement_limit(p_org_id UUID, p_feature_key TEXT)
RETURNS INT LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public AS $$
DECLARE
  v_plan_version_id UUID;
  v_limit INT;
BEGIN
  SELECT plan_version_id INTO v_plan_version_id
  FROM subscriptions
  WHERE organization_id = p_org_id
    AND status IN ('active', 'trialing', 'grace_period')
  LIMIT 1;

  IF v_plan_version_id IS NULL THEN
    RETURN 0;
  END IF;

  SELECT limit_value INTO v_limit
  FROM plan_entitlements
  WHERE plan_version_id = v_plan_version_id
    AND feature_key = p_feature_key
    AND is_enabled = true;

  RETURN COALESCE(v_limit, 0);
END;
$$;

-- Log platform admin action
CREATE OR REPLACE FUNCTION log_platform_audit(
  p_actor UUID,
  p_action TEXT,
  p_resource_type TEXT,
  p_resource_id UUID DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'
) RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO platform_audit_logs (actor_user_id, action, resource_type, resource_id, metadata)
  VALUES (p_actor, p_action, p_resource_type, p_resource_id, p_metadata);
END;
$$;

-- Record subscription event
CREATE OR REPLACE FUNCTION record_subscription_event(
  p_org_id UUID,
  p_subscription_id UUID,
  p_event_type TEXT,
  p_previous_status TEXT,
  p_new_status TEXT,
  p_source TEXT DEFAULT 'system',
  p_metadata JSONB DEFAULT '{}'
) RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO subscription_events (organization_id, subscription_id, event_type, previous_status, new_status, source, metadata)
  VALUES (p_org_id, p_subscription_id, p_event_type, p_previous_status, p_new_status, p_source, p_metadata);
END;
$$;

-- ============================================================================
-- SEED: Initial plans (FREE, PRO, BUSINESS)
-- ============================================================================

INSERT INTO subscription_plans (slug, name, description, is_active, is_featured, display_order) VALUES
  ('free', 'Free', 'Plano gratuito para pequenas empresas conhecerem a Nexora.', true, false, 1),
  ('pro', 'Pro', 'Plano intermediário para empresas em crescimento.', true, true, 2),
  ('business', 'Business', 'Plano avançado para empresas que precisam de mais recursos.', true, false, 3)
ON CONFLICT (slug) DO NOTHING;

-- FREE plan version
INSERT INTO subscription_plan_versions (plan_id, version, monthly_price, annual_price, trial_days, grace_period_days, published_at)
SELECT id, 1, 0, 0, 0, 0, now()
FROM subscription_plans WHERE slug = 'free'
ON CONFLICT (plan_id, version) DO NOTHING;

-- PRO plan version
INSERT INTO subscription_plan_versions (plan_id, version, monthly_price, annual_price, trial_days, grace_period_days, published_at)
SELECT id, 1, 99.00, 990.00, 14, 7, now()
FROM subscription_plans WHERE slug = 'pro'
ON CONFLICT (plan_id, version) DO NOTHING;

-- BUSINESS plan version
INSERT INTO subscription_plan_versions (plan_id, version, monthly_price, annual_price, trial_days, grace_period_days, published_at)
SELECT id, 1, 249.00, 2490.00, 14, 14, now()
FROM subscription_plans WHERE slug = 'business'
ON CONFLICT (plan_id, version) DO NOTHING;

-- ============================================================================
-- SEED: Entitlements for each plan version
-- ============================================================================

-- Helper: get plan version ID by slug
DO $$
DECLARE
  v_free_id UUID;
  v_pro_id UUID;
  v_business_id UUID;
BEGIN
  SELECT spv.id INTO v_free_id FROM subscription_plan_versions spv
    JOIN subscription_plans sp ON sp.id = spv.plan_id WHERE sp.slug = 'free' AND spv.version = 1;
  SELECT spv.id INTO v_pro_id FROM subscription_plan_versions spv
    JOIN subscription_plans sp ON sp.id = spv.plan_id WHERE sp.slug = 'pro' AND spv.version = 1;
  SELECT spv.id INTO v_business_id FROM subscription_plan_versions spv
    JOIN subscription_plans sp ON sp.id = spv.plan_id WHERE sp.slug = 'business' AND spv.version = 1;

  -- FREE entitlements
  INSERT INTO plan_entitlements (plan_version_id, feature_key, is_enabled, limit_value, limit_unit) VALUES
    (v_free_id, 'team.users', true, 3, 'users'),
    (v_free_id, 'team.owners', true, 2, 'users'),
    (v_free_id, 'crm.customers', true, 50, 'records'),
    (v_free_id, 'crm.leads', true, 30, 'records'),
    (v_free_id, 'sales.orders', true, 20, 'records_month'),
    (v_free_id, 'inventory.products', true, 30, 'records'),
    (v_free_id, 'inventory.warehouses', true, 1, 'records'),
    (v_free_id, 'finance.receivables', true, 30, 'records'),
    (v_free_id, 'finance.payables', true, 30, 'records'),
    (v_free_id, 'reports.basic', true, NULL, NULL),
    (v_free_id, 'reports.advanced', false, NULL, NULL),
    (v_free_id, 'ai.assistant', false, NULL, NULL),
    (v_free_id, 'integrations.whatsapp', false, NULL, NULL),
    (v_free_id, 'integrations.instagram', false, NULL, NULL),
    (v_free_id, 'automations.rules', false, NULL, NULL)
  ON CONFLICT (plan_version_id, feature_key) DO NOTHING;

  -- PRO entitlements
  INSERT INTO plan_entitlements (plan_version_id, feature_key, is_enabled, limit_value, limit_unit) VALUES
    (v_pro_id, 'team.users', true, 15, 'users'),
    (v_pro_id, 'team.owners', true, 2, 'users'),
    (v_pro_id, 'crm.customers', true, 500, 'records'),
    (v_pro_id, 'crm.leads', true, 300, 'records'),
    (v_pro_id, 'sales.orders', true, 200, 'records_month'),
    (v_pro_id, 'inventory.products', true, 300, 'records'),
    (v_pro_id, 'inventory.warehouses', true, 3, 'records'),
    (v_pro_id, 'finance.receivables', true, 500, 'records'),
    (v_pro_id, 'finance.payables', true, 500, 'records'),
    (v_pro_id, 'reports.basic', true, NULL, NULL),
    (v_pro_id, 'reports.advanced', true, NULL, NULL),
    (v_pro_id, 'ai.assistant', true, 50, 'queries_day'),
    (v_pro_id, 'integrations.whatsapp', true, 1, 'connections'),
    (v_pro_id, 'integrations.instagram', true, 1, 'connections'),
    (v_pro_id, 'automations.rules', true, 10, 'rules')
  ON CONFLICT (plan_version_id, feature_key) DO NOTHING;

  -- BUSINESS entitlements
  INSERT INTO plan_entitlements (plan_version_id, feature_key, is_enabled, limit_value, limit_unit) VALUES
    (v_business_id, 'team.users', true, 100, 'users'),
    (v_business_id, 'team.owners', true, 2, 'users'),
    (v_business_id, 'crm.customers', true, 5000, 'records'),
    (v_business_id, 'crm.leads', true, 3000, 'records'),
    (v_business_id, 'sales.orders', true, 2000, 'records_month'),
    (v_business_id, 'inventory.products', true, 3000, 'records'),
    (v_business_id, 'inventory.warehouses', true, 10, 'records'),
    (v_business_id, 'finance.receivables', true, 5000, 'records'),
    (v_business_id, 'finance.payables', true, 5000, 'records'),
    (v_business_id, 'reports.basic', true, NULL, NULL),
    (v_business_id, 'reports.advanced', true, NULL, NULL),
    (v_business_id, 'ai.assistant', true, 200, 'queries_day'),
    (v_business_id, 'integrations.whatsapp', true, 3, 'connections'),
    (v_business_id, 'integrations.instagram', true, 3, 'connections'),
    (v_business_id, 'automations.rules', true, 50, 'rules')
  ON CONFLICT (plan_version_id, feature_key) DO NOTHING;
END $$;