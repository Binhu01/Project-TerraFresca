-- Nexora Fase 07 — Equipe, Funcionários e Gestão de Permissões
-- Migration: departments, employee_profiles, organization_roles, permissions,
--            role_permissions, membership_permissions, invitations,
--            audit_logs, approval_requests, approval_votes

-- ============================================================
-- 0. Fix is_member_of to add SET search_path and exclude suspended
-- ============================================================
CREATE OR REPLACE FUNCTION is_member_of(p_org_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM memberships
    WHERE memberships.organization_id = p_org_id
      AND memberships.user_id = auth.uid()
      AND memberships.status = 'active'
  );
$$;

-- ============================================================
-- 1. ALTER memberships: add status column
-- ============================================================
ALTER TABLE memberships ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended'));

-- ============================================================
-- 2. departments
-- ============================================================
CREATE TABLE IF NOT EXISTS departments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(organization_id, name)
);

CREATE INDEX IF NOT EXISTS idx_departments_org ON departments(organization_id);

ALTER TABLE departments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view departments"
  ON departments FOR SELECT USING (is_member_of(organization_id));

CREATE POLICY "Owners and admins can manage departments"
  ON departments FOR ALL
  USING (EXISTS (
    SELECT 1 FROM memberships m
    WHERE m.organization_id = departments.organization_id
      AND m.user_id = auth.uid()
      AND m.role IN ('OWNER', 'ADMIN')
      AND m.status = 'active'
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM memberships m
    WHERE m.organization_id = departments.organization_id
      AND m.user_id = auth.uid()
      AND m.role IN ('OWNER', 'ADMIN')
      AND m.status = 'active'
  ));

-- ============================================================
-- 3. employee_profiles
-- ============================================================
CREATE TABLE IF NOT EXISTS employee_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  membership_id UUID NOT NULL UNIQUE REFERENCES memberships(id) ON DELETE CASCADE,
  department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
  job_title TEXT,
  professional_phone TEXT,
  start_date DATE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_employee_profiles_membership ON employee_profiles(membership_id);
CREATE INDEX IF NOT EXISTS idx_employee_profiles_department ON employee_profiles(department_id);

ALTER TABLE employee_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view employee profiles"
  ON employee_profiles FOR SELECT USING (is_member_of(organization_id));

CREATE POLICY "Owners and admins can manage employee profiles"
  ON employee_profiles FOR ALL
  USING (EXISTS (
    SELECT 1 FROM memberships m
    WHERE m.organization_id = employee_profiles.organization_id
      AND m.user_id = auth.uid()
      AND m.role IN ('OWNER', 'ADMIN')
      AND m.status = 'active'
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM memberships m
    WHERE m.organization_id = employee_profiles.organization_id
      AND m.user_id = auth.uid()
      AND m.role IN ('OWNER', 'ADMIN')
      AND m.status = 'active'
  ));

-- ============================================================
-- 4. organization_roles
-- ============================================================
CREATE TABLE IF NOT EXISTS organization_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  is_system_role BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(organization_id, name)
);

CREATE INDEX IF NOT EXISTS idx_organization_roles_org ON organization_roles(organization_id);

ALTER TABLE organization_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view roles"
  ON organization_roles FOR SELECT USING (is_member_of(organization_id));

CREATE POLICY "Owners and admins can manage custom roles"
  ON organization_roles FOR ALL
  USING (EXISTS (
    SELECT 1 FROM memberships m
    WHERE m.organization_id = organization_roles.organization_id
      AND m.user_id = auth.uid()
      AND m.role IN ('OWNER', 'ADMIN')
      AND m.status = 'active'
  ) AND organization_roles.is_system_role = false)
  WITH CHECK (EXISTS (
    SELECT 1 FROM memberships m
    WHERE m.organization_id = organization_roles.organization_id
      AND m.user_id = auth.uid()
      AND m.role IN ('OWNER', 'ADMIN')
      AND m.status = 'active'
  ));

-- ============================================================
-- 5. permissions (global catalog, not tenant-scoped)
-- ============================================================
CREATE TABLE IF NOT EXISTS permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  permission_key TEXT NOT NULL UNIQUE,
  module TEXT NOT NULL,
  action TEXT NOT NULL,
  description TEXT NOT NULL
);

ALTER TABLE permissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view permissions catalog"
  ON permissions FOR SELECT USING (auth.uid() IS NOT NULL);

-- ============================================================
-- 6. role_permissions
-- ============================================================
CREATE TABLE IF NOT EXISTS role_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  role_id UUID NOT NULL REFERENCES organization_roles(id) ON DELETE CASCADE,
  permission_id UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
  granted BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(organization_id, role_id, permission_id)
);

CREATE INDEX IF NOT EXISTS idx_role_permissions_org_role ON role_permissions(organization_id, role_id);

ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view role permissions"
  ON role_permissions FOR SELECT USING (is_member_of(organization_id));

CREATE POLICY "Owners and admins can manage role permissions"
  ON role_permissions FOR ALL
  USING (EXISTS (
    SELECT 1 FROM memberships m
    WHERE m.organization_id = role_permissions.organization_id
      AND m.user_id = auth.uid()
      AND m.role IN ('OWNER', 'ADMIN')
      AND m.status = 'active'
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM memberships m
    WHERE m.organization_id = role_permissions.organization_id
      AND m.user_id = auth.uid()
      AND m.role IN ('OWNER', 'ADMIN')
      AND m.status = 'active'
  ));

-- ============================================================
-- 7. membership_permissions (individual overrides)
-- ============================================================
CREATE TABLE IF NOT EXISTS membership_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  membership_id UUID NOT NULL REFERENCES memberships(id) ON DELETE CASCADE,
  permission_id UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
  effect TEXT NOT NULL CHECK (effect IN ('grant', 'deny')),
  created_by UUID NOT NULL REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(organization_id, membership_id, permission_id)
);

CREATE INDEX IF NOT EXISTS idx_membership_permissions_membership ON membership_permissions(membership_id);

ALTER TABLE membership_permissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view membership permissions"
  ON membership_permissions FOR SELECT USING (is_member_of(organization_id));

CREATE POLICY "Owners and admins can manage membership permissions"
  ON membership_permissions FOR ALL
  USING (EXISTS (
    SELECT 1 FROM memberships m
    WHERE m.organization_id = membership_permissions.organization_id
      AND m.user_id = auth.uid()
      AND m.role IN ('OWNER', 'ADMIN')
      AND m.status = 'active'
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM memberships m
    WHERE m.organization_id = membership_permissions.organization_id
      AND m.user_id = auth.uid()
      AND m.role IN ('OWNER', 'ADMIN')
      AND m.status = 'active'
  ));

-- ============================================================
-- 8. invitations
-- ============================================================
CREATE TABLE IF NOT EXISTS invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role_id UUID NOT NULL REFERENCES organization_roles(id),
  department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
  job_title TEXT,
  token_hash TEXT NOT NULL UNIQUE,
  invited_by UUID NOT NULL REFERENCES profiles(id),
  expires_at TIMESTAMPTZ NOT NULL,
  accepted_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_invitations_token ON invitations(token_hash);
CREATE INDEX IF NOT EXISTS idx_invitations_org_email ON invitations(organization_id, email);

ALTER TABLE invitations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view invitations"
  ON invitations FOR SELECT USING (is_member_of(organization_id));

CREATE POLICY "Owners and admins can create invitations"
  ON invitations FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM memberships m
    WHERE m.organization_id = invitations.organization_id
      AND m.user_id = auth.uid()
      AND m.role IN ('OWNER', 'ADMIN')
      AND m.status = 'active'
  ));

CREATE POLICY "Owners and admins can update invitations"
  ON invitations FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM memberships m
    WHERE m.organization_id = invitations.organization_id
      AND m.user_id = auth.uid()
      AND m.role IN ('OWNER', 'ADMIN')
      AND m.status = 'active'
  ));

-- ============================================================
-- 9. audit_logs (append-only)
-- ============================================================
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  actor_user_id UUID NOT NULL REFERENCES profiles(id),
  action TEXT NOT NULL,
  module TEXT NOT NULL,
  resource_type TEXT,
  resource_id UUID,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_org_date ON audit_logs(organization_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor ON audit_logs(actor_user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_module ON audit_logs(module);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);

ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view audit logs"
  ON audit_logs FOR SELECT USING (is_member_of(organization_id));

CREATE POLICY "System can insert audit logs"
  ON audit_logs FOR INSERT
  WITH CHECK (is_member_of(organization_id));

-- ============================================================
-- 10. approval_requests
-- ============================================================
CREATE TABLE IF NOT EXISTS approval_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  request_type TEXT NOT NULL CHECK (request_type IN ('promote_to_owner', 'demote_owner', 'remove_owner', 'transfer_ownership')),
  requested_by UUID NOT NULL REFERENCES profiles(id),
  target_membership_id UUID NOT NULL REFERENCES memberships(id),
  description TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled', 'expired')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_approval_requests_org_status ON approval_requests(organization_id, status);

ALTER TABLE approval_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners can view approval requests"
  ON approval_requests FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM memberships m
    WHERE m.organization_id = approval_requests.organization_id
      AND m.user_id = auth.uid()
      AND m.role = 'OWNER'
      AND m.status = 'active'
  ));

CREATE POLICY "Owners can create approval requests"
  ON approval_requests FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM memberships m
    WHERE m.organization_id = approval_requests.organization_id
      AND m.user_id = auth.uid()
      AND m.role = 'OWNER'
      AND m.status = 'active'
  ));

-- ============================================================
-- 11. approval_votes
-- ============================================================
CREATE TABLE IF NOT EXISTS approval_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  approval_request_id UUID NOT NULL REFERENCES approval_requests(id) ON DELETE CASCADE,
  voter_user_id UUID NOT NULL REFERENCES profiles(id),
  decision TEXT NOT NULL CHECK (decision IN ('approve', 'reject')),
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(approval_request_id, voter_user_id)
);

CREATE INDEX IF NOT EXISTS idx_approval_votes_request ON approval_votes(approval_request_id);

ALTER TABLE approval_votes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners can view approval votes"
  ON approval_votes FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM memberships m
    WHERE m.organization_id = approval_votes.organization_id
      AND m.user_id = auth.uid()
      AND m.role = 'OWNER'
      AND m.status = 'active'
  ));

CREATE POLICY "Owners can cast approval votes"
  ON approval_votes FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM memberships m
    WHERE m.organization_id = approval_votes.organization_id
      AND m.user_id = auth.uid()
      AND m.role = 'OWNER'
      AND m.status = 'active'
  ));

-- ============================================================
-- Updated_at triggers
-- ============================================================
CREATE OR REPLACE TRIGGER set_departments_updated_at
  BEFORE UPDATE ON departments
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE OR REPLACE TRIGGER set_employee_profiles_updated_at
  BEFORE UPDATE ON employee_profiles
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE OR REPLACE TRIGGER set_organization_roles_updated_at
  BEFORE UPDATE ON organization_roles
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================================
-- SECURITY DEFINER Functions
-- ============================================================

-- has_permission: resolve effective permission for a user in an org
CREATE OR REPLACE FUNCTION has_permission(p_org_id UUID, p_user_id UUID, p_permission_key TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
  v_membership_id UUID;
  v_effect TEXT;
  v_role_granted BOOLEAN;
BEGIN
  -- Get membership
  SELECT id INTO v_membership_id FROM memberships
  WHERE organization_id = p_org_id AND user_id = p_user_id AND status = 'active';

  IF v_membership_id IS NULL THEN
    RETURN false;
  END IF;

  -- Check individual override first (deny wins)
  SELECT mp.effect INTO v_effect
  FROM membership_permissions mp
  JOIN permissions p ON p.id = mp.permission_id
  WHERE mp.membership_id = v_membership_id
    AND mp.organization_id = p_org_id
    AND p.permission_key = p_permission_key
  LIMIT 1;

  IF v_effect = 'deny' THEN
    RETURN false;
  ELSIF v_effect = 'grant' THEN
    RETURN true;
  END IF;

  -- Fall back to role permissions
  SELECT rp.granted INTO v_role_granted
  FROM role_permissions rp
  JOIN organization_roles r ON r.id = rp.role_id
  JOIN memberships mem ON mem.organization_id = rp.organization_id
  JOIN permissions p ON p.id = rp.permission_id
  WHERE rp.organization_id = p_org_id
    AND mem.id = v_membership_id
    AND (r.name = mem.role OR r.id IN (
      SELECT orole.id FROM organization_roles orole
      WHERE orole.organization_id = p_org_id AND orole.name = mem.role
    ))
    AND p.permission_key = p_permission_key
  LIMIT 1;

  RETURN COALESCE(v_role_granted, false);
END;
$$;

-- require_permission: raise exception if permission denied
CREATE OR REPLACE FUNCTION require_permission(p_org_id UUID, p_user_id UUID, p_permission_key TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
BEGIN
  IF NOT has_permission(p_org_id, p_user_id, p_permission_key) THEN
    RAISE EXCEPTION 'Permissão negada: %', p_permission_key;
  END IF;
END;
$$;

-- log_audit: insert audit log entry
CREATE OR REPLACE FUNCTION log_audit(
  p_org_id UUID,
  p_actor UUID,
  p_action TEXT,
  p_module TEXT,
  p_resource_type TEXT DEFAULT NULL,
  p_resource_id UUID DEFAULT NULL,
  p_metadata JSONB DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO audit_logs (organization_id, actor_user_id, action, module, resource_type, resource_id, metadata)
  VALUES (p_org_id, p_actor, p_action, p_module, p_resource_type, p_resource_id, p_metadata);
END;
$$;

-- accept_invitation: validate token and create membership
CREATE OR REPLACE FUNCTION accept_invitation(p_token TEXT, p_user_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_inv RECORD;
  v_membership_id UUID;
  v_user_email TEXT;
BEGIN
  -- Get user email
  SELECT email INTO v_user_email FROM profiles WHERE id = p_user_id;
  IF v_user_email IS NULL THEN
    RAISE EXCEPTION 'Usuário não encontrado';
  END IF;

  -- Find valid invitation by token hash
  SELECT i.*, r.name AS role_name
  INTO v_inv
  FROM invitations i
  JOIN organization_roles r ON r.id = i.role_id
  WHERE i.token_hash = encode(sha256(p_token::bytea), 'hex')
    AND i.accepted_at IS NULL
    AND i.revoked_at IS NULL
    AND i.expires_at > now();

  IF v_inv IS NULL THEN
    RAISE EXCEPTION 'Convite inválido, expirado ou revogado';
  END IF;

  -- Validate email matches
  IF lower(v_inv.email) != lower(v_user_email) THEN
    RAISE EXCEPTION 'Este convite foi enviado para outro e-mail';
  END IF;

  -- Check if already a member
  IF EXISTS (SELECT 1 FROM memberships WHERE organization_id = v_inv.organization_id AND user_id = p_user_id) THEN
    RAISE EXCEPTION 'Você já é membro desta organização';
  END IF;

  -- Create membership with the system role name from the invited role
  INSERT INTO memberships (organization_id, user_id, role, status)
  VALUES (v_inv.organization_id, p_user_id, v_inv.role_name, 'active')
  RETURNING id INTO v_membership_id;

  -- Create employee profile
  INSERT INTO employee_profiles (organization_id, membership_id, department_id, job_title)
  VALUES (v_inv.organization_id, v_membership_id, v_inv.department_id, v_inv.job_title);

  -- Mark invitation as accepted
  UPDATE invitations SET accepted_at = now() WHERE id = v_inv.id;

  -- Log audit
  PERFORM log_audit(v_inv.organization_id, p_user_id, 'invitation_accepted', 'team', 'invitation', v_inv.id);

  RETURN v_membership_id;
END;
$$;

-- resolve_approval: check votes and execute if all owners approved
CREATE OR REPLACE FUNCTION resolve_approval(p_request_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_req RECORD;
  v_total_owners INT;
  v_approve_count INT;
  v_reject_count INT;
  v_target_user_id UUID;
BEGIN
  -- Lock the request row to prevent concurrent resolution (race condition)
  SELECT ar.* INTO v_req FROM approval_requests ar WHERE ar.id = p_request_id FOR UPDATE;
  IF v_req IS NULL OR v_req.status != 'pending' THEN
    RETURN;
  END IF;

  -- Count active owners
  SELECT COUNT(*) INTO v_total_owners FROM memberships
  WHERE organization_id = v_req.organization_id AND role = 'OWNER' AND status = 'active';

  -- Count votes
  SELECT COUNT(*) FILTER (WHERE decision = 'approve') INTO v_approve_count,
         COUNT(*) FILTER (WHERE decision = 'reject') INTO v_reject_count
  FROM approval_votes WHERE approval_request_id = p_request_id;

  -- If any rejection, mark rejected
  IF v_reject_count > 0 THEN
    UPDATE approval_requests SET status = 'rejected', resolved_at = now() WHERE id = p_request_id;
    PERFORM log_audit(v_req.organization_id, v_req.requested_by, 'approval_rejected', 'team', 'approval_request', p_request_id);
    RETURN;
  END IF;

  -- If all owners approved
  IF v_approve_count >= v_total_owners THEN
    -- Get target user
    SELECT user_id INTO v_target_user_id FROM memberships WHERE id = v_req.target_membership_id;

    -- Execute the operation
    IF v_req.request_type = 'promote_to_owner' THEN
      UPDATE memberships SET role = 'OWNER' WHERE id = v_req.target_membership_id;
    ELSIF v_req.request_type = 'demote_owner' THEN
      UPDATE memberships SET role = 'ADMIN' WHERE id = v_req.target_membership_id;
    ELSIF v_req.request_type = 'remove_owner' THEN
      DELETE FROM memberships WHERE id = v_req.target_membership_id;
    ELSIF v_req.request_type = 'transfer_ownership' THEN
      -- Demote current owner (requested_by) and promote target
      UPDATE memberships SET role = 'ADMIN'
      WHERE organization_id = v_req.organization_id AND user_id = v_req.requested_by AND role = 'OWNER';
      UPDATE memberships SET role = 'OWNER' WHERE id = v_req.target_membership_id;
    END IF;

    UPDATE approval_requests SET status = 'approved', resolved_at = now() WHERE id = p_request_id;
    PERFORM log_audit(v_req.organization_id, v_req.requested_by, 'approval_executed', 'team', 'approval_request', p_request_id,
      jsonb_build_object('type', v_req.request_type, 'target_user', v_target_user_id));
  END IF;
END;
$$;

-- ============================================================
-- Seed: permissions catalog + default team data trigger
-- ============================================================

-- Seed permissions catalog (idempotent)
INSERT INTO permissions (permission_key, module, action, description) VALUES
  ('dashboard.view', 'dashboard', 'view', 'Visualizar dashboard'),
  ('customers.view', 'customers', 'view', 'Visualizar clientes'),
  ('customers.create', 'customers', 'create', 'Criar clientes'),
  ('customers.edit', 'customers', 'edit', 'Editar clientes'),
  ('customers.delete', 'customers', 'delete', 'Arquivar clientes'),
  ('leads.view', 'leads', 'view', 'Visualizar leads'),
  ('leads.create', 'leads', 'create', 'Criar leads'),
  ('leads.edit', 'leads', 'edit', 'Editar leads'),
  ('leads.delete', 'leads', 'delete', 'Arquivar leads'),
  ('orders.view', 'orders', 'view', 'Visualizar pedidos'),
  ('orders.create', 'orders', 'create', 'Criar pedidos'),
  ('orders.edit', 'orders', 'edit', 'Editar pedidos'),
  ('orders.delete', 'orders', 'delete', 'Cancelar pedidos'),
  ('quotes.view', 'quotes', 'view', 'Visualizar orçamentos'),
  ('quotes.create', 'quotes', 'create', 'Criar orçamentos'),
  ('quotes.edit', 'quotes', 'edit', 'Editar orçamentos'),
  ('channels.view', 'channels', 'view', 'Visualizar canais'),
  ('channels.manage', 'channels', 'manage', 'Gerenciar canais'),
  ('products.view', 'products', 'view', 'Visualizar produtos'),
  ('products.create', 'products', 'create', 'Criar produtos'),
  ('products.edit', 'products', 'edit', 'Editar produtos'),
  ('products.delete', 'products', 'delete', 'Arquivar produtos'),
  ('products.change_price', 'products', 'change_price', 'Alterar preços'),
  ('inventory.view', 'inventory', 'view', 'Visualizar estoque'),
  ('inventory.adjust', 'inventory', 'adjust', 'Ajustar estoque'),
  ('inventory.transfer', 'inventory', 'transfer', 'Transferir estoque'),
  ('warehouses.view', 'warehouses', 'view', 'Visualizar depósitos'),
  ('warehouses.manage', 'warehouses', 'manage', 'Gerenciar depósitos'),
  ('receivables.view', 'receivables', 'view', 'Visualizar contas a receber'),
  ('receivables.create', 'receivables', 'create', 'Criar contas a receber'),
  ('receivables.edit', 'receivables', 'edit', 'Editar contas a receber'),
  ('payables.view', 'payables', 'view', 'Visualizar contas a pagar'),
  ('payables.create', 'payables', 'create', 'Criar contas a pagar'),
  ('payables.edit', 'payables', 'edit', 'Editar contas a pagar'),
  ('payments.register_inbound', 'payments', 'register_inbound', 'Registrar recebimentos'),
  ('payments.register_outbound', 'payments', 'register_outbound', 'Registrar pagamentos'),
  ('payments.reverse', 'payments', 'reverse', 'Efetuar estornos'),
  ('accounts.view', 'accounts', 'view', 'Visualizar contas financeiras'),
  ('accounts.manage', 'accounts', 'manage', 'Gerenciar contas financeiras'),
  ('transfers.execute', 'transfers', 'execute', 'Transferir entre contas'),
  ('cashflow.view', 'cashflow', 'view', 'Visualizar fluxo de caixa'),
  ('transactions.view', 'transactions', 'view', 'Visualizar transações'),
  ('categories.view', 'categories', 'view', 'Visualizar categorias financeiras'),
  ('categories.manage', 'categories', 'manage', 'Gerenciar categorias financeiras'),
  ('team.view', 'team', 'view', 'Visualizar equipe'),
  ('team.invite', 'team', 'invite', 'Convidar membros'),
  ('team.edit_profile', 'team', 'edit_profile', 'Editar dados profissionais'),
  ('team.edit_role', 'team', 'edit_role', 'Alterar papéis'),
  ('team.suspend', 'team', 'suspend', 'Suspender membros'),
  ('team.remove', 'team', 'remove', 'Remover membros'),
  ('departments.view', 'departments', 'view', 'Visualizar departamentos'),
  ('departments.manage', 'departments', 'manage', 'Gerenciar departamentos'),
  ('roles.view', 'roles', 'view', 'Visualizar papéis e permissões'),
  ('roles.manage', 'roles', 'manage', 'Gerenciar papéis e permissões'),
  ('audit.view', 'audit', 'view', 'Visualizar auditoria'),
  ('approvals.view', 'approvals', 'view', 'Visualizar aprovações'),
  ('approvals.vote', 'approvals', 'vote', 'Votar em aprovações'),
  ('settings.org', 'settings', 'org', 'Editar dados da organização'),
  ('reports.view', 'reports', 'view', 'Visualizar relatórios'),
  ('reports.export', 'reports', 'export', 'Exportar relatórios')
ON CONFLICT (permission_key) DO NOTHING;

-- Seed trigger function for new organizations
CREATE OR REPLACE FUNCTION seed_default_team_data()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_owner_role_id UUID;
  v_admin_role_id UUID;
  v_manager_role_id UUID;
  v_employee_role_id UUID;
  v_perm RECORD;
BEGIN
  -- Create system roles
  INSERT INTO organization_roles (organization_id, name, description, is_system_role)
  VALUES (NEW.id, 'OWNER', 'Proprietário com acesso integral', true)
  RETURNING id INTO v_owner_role_id;

  INSERT INTO organization_roles (organization_id, name, description, is_system_role)
  VALUES (NEW.id, 'ADMIN', 'Administrador com acesso amplo', true)
  RETURNING id INTO v_admin_role_id;

  INSERT INTO organization_roles (organization_id, name, description, is_system_role)
  VALUES (NEW.id, 'MANAGER', 'Gerente com acesso operacional', true)
  RETURNING id INTO v_manager_role_id;

  INSERT INTO organization_roles (organization_id, name, description, is_system_role)
  VALUES (NEW.id, 'EMPLOYEE', 'Funcionário com acesso básico', true)
  RETURNING id INTO v_employee_role_id;

  -- OWNER gets all permissions
  INSERT INTO role_permissions (organization_id, role_id, permission_id, granted)
  SELECT NEW.id, v_owner_role_id, p.id, true FROM permissions p;

  -- ADMIN gets all except team.remove and approvals.vote restricted
  INSERT INTO role_permissions (organization_id, role_id, permission_id, granted)
  SELECT NEW.id, v_admin_role_id, p.id, true
  FROM permissions p
  WHERE p.permission_key NOT IN ('team.remove');

  -- MANAGER gets operational permissions
  INSERT INTO role_permissions (organization_id, role_id, permission_id, granted)
  SELECT NEW.id, v_manager_role_id, p.id, true
  FROM permissions p
  WHERE p.module IN ('dashboard', 'customers', 'leads', 'orders', 'quotes', 'channels', 'products', 'inventory', 'warehouses', 'receivables', 'payables', 'cashflow', 'transactions', 'categories', 'departments')
    AND p.permission_key NOT IN ('products.change_price', 'warehouses.manage', 'categories.manage');

  -- Add payment register permissions for MANAGER
  INSERT INTO role_permissions (organization_id, role_id, permission_id, granted)
  SELECT NEW.id, v_manager_role_id, p.id, true
  FROM permissions p
  WHERE p.permission_key IN ('payments.register_inbound', 'payments.register_outbound', 'accounts.view');

  -- EMPLOYEE gets basic view + create/edit in operational modules
  INSERT INTO role_permissions (organization_id, role_id, permission_id, granted)
  SELECT NEW.id, v_employee_role_id, p.id, true
  FROM permissions p
  WHERE p.permission_key IN (
    'dashboard.view',
    'customers.view', 'customers.create', 'customers.edit',
    'leads.view', 'leads.create', 'leads.edit',
    'orders.view', 'orders.create', 'orders.edit',
    'quotes.view', 'quotes.create', 'quotes.edit',
    'channels.view',
    'products.view',
    'inventory.view',
    'warehouses.view',
    'receivables.view',
    'payables.view',
    'cashflow.view',
    'transactions.view',
    'categories.view',
    'departments.view'
  );

  -- Create default departments
  INSERT INTO departments (organization_id, name, description) VALUES
    (NEW.id, 'Administração', 'Gestão administrativa geral'),
    (NEW.id, 'Comercial', 'Área comercial e negócios'),
    (NEW.id, 'Vendas', 'Equipe de vendas'),
    (NEW.id, 'Financeiro', 'Gestão financeira e contábil'),
    (NEW.id, 'Atendimento', 'Suporte e atendimento ao cliente'),
    (NEW.id, 'Operações', 'Operações e logística'),
    (NEW.id, 'Estoque', 'Gestão de estoque e armazenagem'),
    (NEW.id, 'Marketing', 'Marketing e comunicação'),
    (NEW.id, 'Tecnologia', 'TI e desenvolvimento');

  RETURN NEW;
END;
$$;

-- Attach trigger to organizations
DROP TRIGGER IF EXISTS on_organization_created_team ON organizations;
CREATE TRIGGER on_organization_created_team
  AFTER INSERT ON organizations
  FOR EACH ROW EXECUTE FUNCTION seed_default_team_data();

-- Seed existing organizations that don't have roles yet
DO $$
DECLARE
  v_org RECORD;
BEGIN
  FOR v_org IN SELECT id FROM organizations WHERE id NOT IN (SELECT DISTINCT organization_id FROM organization_roles)
  LOOP
    INSERT INTO organization_roles (organization_id, name, description, is_system_role) VALUES
      (v_org.id, 'OWNER', 'Proprietário com acesso integral', true),
      (v_org.id, 'ADMIN', 'Administrador com acesso amplo', true),
      (v_org.id, 'MANAGER', 'Gerente com acesso operacional', true),
      (v_org.id, 'EMPLOYEE', 'Funcionário com acesso básico', true);

    -- Seed role_permissions for each role (same logic as trigger)
    INSERT INTO role_permissions (organization_id, role_id, permission_id, granted)
    SELECT v_org.id, r.id, p.id, true
    FROM organization_roles r, permissions p
    WHERE r.organization_id = v_org.id AND r.name = 'OWNER';

    INSERT INTO role_permissions (organization_id, role_id, permission_id, granted)
    SELECT v_org.id, r.id, p.id, true
    FROM organization_roles r, permissions p
    WHERE r.organization_id = v_org.id AND r.name = 'ADMIN'
      AND p.permission_key NOT IN ('team.remove');

    INSERT INTO role_permissions (organization_id, role_id, permission_id, granted)
    SELECT v_org.id, r.id, p.id, true
    FROM organization_roles r, permissions p
    WHERE r.organization_id = v_org.id AND r.name = 'MANAGER'
      AND p.module IN ('dashboard', 'customers', 'leads', 'orders', 'quotes', 'channels', 'products', 'inventory', 'warehouses', 'receivables', 'payables', 'cashflow', 'transactions', 'categories', 'departments')
      AND p.permission_key NOT IN ('products.change_price', 'warehouses.manage', 'categories.manage');

    INSERT INTO role_permissions (organization_id, role_id, permission_id, granted)
    SELECT v_org.id, r.id, p.id, true
    FROM organization_roles r, permissions p
    WHERE r.organization_id = v_org.id AND r.name = 'MANAGER'
      AND p.permission_key IN ('payments.register_inbound', 'payments.register_outbound', 'accounts.view');

    INSERT INTO role_permissions (organization_id, role_id, permission_id, granted)
    SELECT v_org.id, r.id, p.id, true
    FROM organization_roles r, permissions p
    WHERE r.organization_id = v_org.id AND r.name = 'EMPLOYEE'
      AND p.permission_key IN (
        'dashboard.view', 'customers.view', 'customers.create', 'customers.edit',
        'leads.view', 'leads.create', 'leads.edit',
        'orders.view', 'orders.create', 'orders.edit',
        'quotes.view', 'quotes.create', 'quotes.edit',
        'channels.view', 'products.view', 'inventory.view', 'warehouses.view',
        'receivables.view', 'payables.view', 'cashflow.view', 'transactions.view',
        'categories.view', 'departments.view'
      );

    -- Create default departments for existing orgs
    INSERT INTO departments (organization_id, name, description) VALUES
      (v_org.id, 'Administração', 'Gestão administrativa geral'),
      (v_org.id, 'Comercial', 'Área comercial e negócios'),
      (v_org.id, 'Vendas', 'Equipe de vendas'),
      (v_org.id, 'Financeiro', 'Gestão financeira e contábil'),
      (v_org.id, 'Atendimento', 'Suporte e atendimento ao cliente'),
      (v_org.id, 'Operações', 'Operações e logística'),
      (v_org.id, 'Estoque', 'Gestão de estoque e armazenagem'),
      (v_org.id, 'Marketing', 'Marketing e comunicação'),
      (v_org.id, 'Tecnologia', 'TI e desenvolvimento')
    ON CONFLICT (organization_id, name) DO NOTHING;
  END LOOP;
END $$;