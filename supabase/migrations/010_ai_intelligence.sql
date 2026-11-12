-- Nexora Fase 11 — Nexora Intelligence (AI Assistant)
-- Migration: ai_conversations, ai_messages, ai_usage_records, ai_settings, ai_insights

-- ============================================================================
-- 1. AI_CONVERSATIONS
-- ============================================================================
CREATE TABLE IF NOT EXISTS ai_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'Nova conversa',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  archived_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_ai_conversations_user_org ON ai_conversations(user_id, organization_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_conversations_org ON ai_conversations(organization_id);

ALTER TABLE ai_conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own conversations"
  ON ai_conversations FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own conversations"
  ON ai_conversations FOR INSERT WITH CHECK (auth.uid() = user_id AND is_member_of(organization_id));

CREATE POLICY "Users can update own conversations"
  ON ai_conversations FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own conversations"
  ON ai_conversations FOR DELETE USING (auth.uid() = user_id);

-- ============================================================================
-- 2. AI_MESSAGES
-- ============================================================================
CREATE TABLE IF NOT EXISTS ai_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  conversation_id UUID NOT NULL REFERENCES ai_conversations(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system', 'tool')),
  content TEXT NOT NULL,
  message_metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ai_messages_conversation ON ai_messages(conversation_id, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_ai_messages_org ON ai_messages(organization_id);

ALTER TABLE ai_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view messages in own conversations"
  ON ai_messages FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM ai_conversations ac
      WHERE ac.id = ai_messages.conversation_id
        AND ac.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert messages in own conversations"
  ON ai_messages FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM ai_conversations ac
      WHERE ac.id = ai_messages.conversation_id
        AND ac.user_id = auth.uid()
        AND is_member_of(ai_messages.organization_id)
    )
  );

-- ============================================================================
-- 3. AI_USAGE_RECORDS
-- ============================================================================
CREATE TABLE IF NOT EXISTS ai_usage_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  model TEXT NOT NULL,
  operation_type TEXT NOT NULL CHECK (operation_type IN ('chat', 'insight', 'summary', 'tool_call')),
  input_tokens INT,
  output_tokens INT,
  estimated_cost NUMERIC(10, 6),
  status TEXT NOT NULL DEFAULT 'success' CHECK (status IN ('success', 'error', 'timeout', 'rate_limited')),
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ai_usage_org_date ON ai_usage_records(organization_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_usage_user ON ai_usage_records(user_id, created_at DESC);

ALTER TABLE ai_usage_records ENABLE ROW LEVEL SECURITY;

-- Only admins/owners can view usage records for the org
CREATE POLICY "Admins can view usage records"
  ON ai_usage_records FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM memberships m
      WHERE m.organization_id = ai_usage_records.organization_id
        AND m.user_id = auth.uid()
        AND m.role IN ('OWNER', 'ADMIN')
        AND m.status = 'active'
    )
  );

-- System inserts via server actions (SECURITY DEFINER function below)
CREATE POLICY "System can insert usage records"
  ON ai_usage_records FOR INSERT WITH CHECK (is_member_of(organization_id));

-- ============================================================================
-- 4. AI_SETTINGS
-- ============================================================================
CREATE TABLE IF NOT EXISTS ai_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL UNIQUE REFERENCES organizations(id) ON DELETE CASCADE,
  is_enabled BOOLEAN NOT NULL DEFAULT false,
  usage_limit_monthly INT NOT NULL DEFAULT 1000,
  daily_limit INT NOT NULL DEFAULT 100,
  max_tokens_per_request INT NOT NULL DEFAULT 4096,
  updated_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE ai_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view AI settings"
  ON ai_settings FOR SELECT USING (is_member_of(organization_id));

CREATE POLICY "Owners and admins can manage AI settings"
  ON ai_settings FOR ALL USING (
    EXISTS (
      SELECT 1 FROM memberships m
      WHERE m.organization_id = ai_settings.organization_id
        AND m.user_id = auth.uid()
        AND m.role IN ('OWNER', 'ADMIN')
        AND m.status = 'active'
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM memberships m
      WHERE m.organization_id = ai_settings.organization_id
        AND m.user_id = auth.uid()
        AND m.role IN ('OWNER', 'ADMIN')
        AND m.status = 'active'
    )
  );

-- ============================================================================
-- 5. AI_INSIGHTS
-- ============================================================================
CREATE TABLE IF NOT EXISTS ai_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  insight_type TEXT NOT NULL CHECK (insight_type IN (
    'sales_trend', 'expense_alert', 'stock_critical', 'overdue_receivable',
    'lead_stale', 'order_delayed', 'performance_change', 'custom'
  )),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  evidence_metadata JSONB DEFAULT '{}',
  reference_type TEXT,
  reference_id UUID,
  period_start DATE,
  period_end DATE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'acknowledged', 'dismissed')),
  generated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ai_insights_org_status ON ai_insights(organization_id, status, generated_at DESC);

ALTER TABLE ai_insights ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view insights"
  ON ai_insights FOR SELECT USING (is_member_of(organization_id));

CREATE POLICY "Members can update insight status"
  ON ai_insights FOR UPDATE USING (is_member_of(organization_id)) WITH CHECK (is_member_of(organization_id));

-- System inserts via SECURITY DEFINER function
CREATE POLICY "System can insert insights"
  ON ai_insights FOR INSERT WITH CHECK (is_member_of(organization_id));

-- ============================================================================
-- UPDATED_AT TRIGGERS
-- ============================================================================
CREATE OR REPLACE TRIGGER set_ai_conversations_updated_at
  BEFORE UPDATE ON ai_conversations
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE OR REPLACE TRIGGER set_ai_settings_updated_at
  BEFORE UPDATE ON ai_settings
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================================================
-- SECURITY DEFINER FUNCTIONS
-- ============================================================================

-- Record AI usage atomically
CREATE OR REPLACE FUNCTION record_ai_usage(
  p_org_id UUID,
  p_user_id UUID,
  p_provider TEXT,
  p_model TEXT,
  p_operation_type TEXT,
  p_input_tokens INT DEFAULT NULL,
  p_output_tokens INT DEFAULT NULL,
  p_estimated_cost NUMERIC DEFAULT NULL,
  p_status TEXT DEFAULT 'success',
  p_error_message TEXT DEFAULT NULL
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id UUID;
BEGIN
  INSERT INTO ai_usage_records (
    organization_id, user_id, provider, model, operation_type,
    input_tokens, output_tokens, estimated_cost, status, error_message
  ) VALUES (
    p_org_id, p_user_id, p_provider, p_model, p_operation_type,
    p_input_tokens, p_output_tokens, p_estimated_cost, p_status, p_error_message
  ) RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

-- Check if user has remaining AI quota for today
CREATE OR REPLACE FUNCTION check_ai_quota(
  p_org_id UUID,
  p_user_id UUID
) RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
  v_settings RECORD;
  v_today_count INT;
BEGIN
  SELECT * INTO v_settings FROM ai_settings WHERE organization_id = p_org_id;

  -- If no settings or disabled, deny
  IF v_settings IS NULL OR NOT v_settings.is_enabled THEN
    RETURN false;
  END IF;

  -- Check daily limit
  SELECT COUNT(*)::INT INTO v_today_count
  FROM ai_usage_records
  WHERE organization_id = p_org_id
    AND user_id = p_user_id
    AND status = 'success'
    AND created_at >= CURRENT_DATE;

  IF v_today_count >= v_settings.daily_limit THEN
    RETURN false;
  END IF;

  RETURN true;
END;
$$;

-- Get current AI usage stats for an org
CREATE OR REPLACE FUNCTION get_ai_usage_stats(
  p_org_id UUID
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
  v_result JSONB;
BEGIN
  SELECT jsonb_build_object(
    'today_requests', (
      SELECT COUNT(*) FROM ai_usage_records
      WHERE organization_id = p_org_id AND status = 'success' AND created_at >= CURRENT_DATE
    ),
    'month_requests', (
      SELECT COUNT(*) FROM ai_usage_records
      WHERE organization_id = p_org_id AND status = 'success'
        AND created_at >= date_trunc('month', CURRENT_DATE)
    ),
    'total_cost_month', (
      SELECT COALESCE(SUM(estimated_cost), 0) FROM ai_usage_records
      WHERE organization_id = p_org_id AND status = 'success'
        AND created_at >= date_trunc('month', CURRENT_DATE)
    ),
    'errors_today', (
      SELECT COUNT(*) FROM ai_usage_records
      WHERE organization_id = p_org_id AND status != 'success' AND created_at >= CURRENT_DATE
    )
  ) INTO v_result;

  RETURN v_result;
END;
$$;

-- ============================================================================
-- SEED PERMISSIONS FOR AI MODULE
-- ============================================================================
INSERT INTO permissions (permission_key, module, action, description) VALUES
  ('ai.chat', 'ai', 'chat', 'Usar o assistente Nexora Intelligence'),
  ('ai.view_history', 'ai', 'view_history', 'Visualizar histórico de conversas'),
  ('ai.view_insights', 'ai', 'view_insights', 'Visualizar insights da IA'),
  ('ai.manage_settings', 'ai', 'manage_settings', 'Gerenciar configurações da IA'),
  ('ai.view_usage', 'ai', 'view_usage', 'Visualizar uso e custos da IA')
ON CONFLICT (permission_key) DO NOTHING;

-- Grant AI permissions to existing system roles
DO $$
DECLARE
  v_org RECORD;
  v_owner_role UUID;
  v_admin_role UUID;
  v_manager_role UUID;
  v_employee_role UUID;
BEGIN
  FOR v_org IN SELECT id FROM organizations
  LOOP
    SELECT id INTO v_owner_role FROM organization_roles WHERE organization_id = v_org.id AND name = 'OWNER';
    SELECT id INTO v_admin_role FROM organization_roles WHERE organization_id = v_org.id AND name = 'ADMIN';
    SELECT id INTO v_manager_role FROM organization_roles WHERE organization_id = v_org.id AND name = 'MANAGER';
    SELECT id INTO v_employee_role FROM organization_roles WHERE organization_id = v_org.id AND name = 'EMPLOYEE';

    -- OWNER & ADMIN: all AI permissions
    IF v_owner_role IS NOT NULL THEN
      INSERT INTO role_permissions (organization_id, role_id, permission_id, granted)
      SELECT v_org.id, v_owner_role, p.id, true
      FROM permissions p WHERE p.module = 'ai'
      ON CONFLICT (organization_id, role_id, permission_id) DO NOTHING;
    END IF;

    IF v_admin_role IS NOT NULL THEN
      INSERT INTO role_permissions (organization_id, role_id, permission_id, granted)
      SELECT v_org.id, v_admin_role, p.id, true
      FROM permissions p WHERE p.module = 'ai'
      ON CONFLICT (organization_id, role_id, permission_id) DO NOTHING;
    END IF;

    -- MANAGER: chat + history + insights (no settings/usage)
    IF v_manager_role IS NOT NULL THEN
      INSERT INTO role_permissions (organization_id, role_id, permission_id, granted)
      SELECT v_org.id, v_manager_role, p.id, true
      FROM permissions p
      WHERE p.permission_key IN ('ai.chat', 'ai.view_history', 'ai.view_insights')
      ON CONFLICT (organization_id, role_id, permission_id) DO NOTHING;
    END IF;

    -- EMPLOYEE: chat + history only
    IF v_employee_role IS NOT NULL THEN
      INSERT INTO role_permissions (organization_id, role_id, permission_id, granted)
      SELECT v_org.id, v_employee_role, p.id, true
      FROM permissions p
      WHERE p.permission_key IN ('ai.chat', 'ai.view_history')
      ON CONFLICT (organization_id, role_id, permission_id) DO NOTHING;
    END IF;
  END LOOP;
END $$;