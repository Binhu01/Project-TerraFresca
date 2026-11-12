-- ============================================================================
-- Nexora Fase 08 — BI Views & Report Permissions
-- ============================================================================

-- Seed report permissions into the global permissions catalog
INSERT INTO permissions (permission_key, module, action, description) VALUES
  ('reports.executive.view', 'reports', 'view', 'Visualizar dashboard executivo'),
  ('reports.sales.view',     'reports', 'view', 'Visualizar relatórios comerciais'),
  ('reports.crm.view',       'reports', 'view', 'Visualizar relatórios de CRM'),
  ('reports.financial.view', 'reports', 'view', 'Visualizar relatórios financeiros'),
  ('reports.inventory.view', 'reports', 'view', 'Visualizar relatórios de estoque'),
  ('reports.team.view',      'reports', 'view', 'Visualizar relatórios de equipe'),
  ('reports.export',         'reports', 'export', 'Exportar relatórios')
ON CONFLICT (permission_key) DO NOTHING;

-- Grant all report permissions to OWNER and ADMIN system roles for every org
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
        SELECT id FROM permissions WHERE module = 'reports'
      LOOP
        INSERT INTO role_permissions (organization_id, role_id, permission_id, granted)
        VALUES (v_org.id, v_role.id, v_perm.id, true)
        ON CONFLICT (organization_id, role_id, permission_id) DO NOTHING;
      END LOOP;
    END LOOP;
  END LOOP;
END $$;

-- ============================================================================
-- VIEW: v_sales_summary
-- Aggregates orders by period/channel/customer with totals
-- Uses cost_price_snapshot from order_items for margin calculation
-- ============================================================================
CREATE OR REPLACE VIEW v_sales_summary AS
SELECT
  o.organization_id,
  o.id AS order_id,
  o.document_number,
  o.status,
  o.channel_id,
  sc.name AS channel_name,
  o.customer_id,
  c.name AS customer_name,
  o.subtotal,
  o.discount,
  o.tax,
  o.total,
  o.issued_at,
  o.completed_at,
  o.created_at,
  COALESCE(SUM(oi.cost_price_snapshot * oi.quantity), 0) AS total_cost,
  o.total - COALESCE(SUM(oi.cost_price_snapshot * oi.quantity), 0) AS gross_margin
FROM orders o
LEFT JOIN sales_channels sc ON sc.id = o.channel_id
LEFT JOIN customers c ON c.id = o.customer_id
LEFT JOIN order_items oi ON oi.order_id = o.id AND oi.organization_id = o.organization_id
GROUP BY o.organization_id, o.id, o.document_number, o.status, o.channel_id, sc.name,
         o.customer_id, c.name, o.subtotal, o.discount, o.tax, o.total,
         o.issued_at, o.completed_at, o.created_at;

-- ============================================================================
-- VIEW: v_pipeline_funnel
-- Counts and sums leads per stage with won/lost classification
-- ============================================================================
CREATE OR REPLACE VIEW v_pipeline_funnel AS
SELECT
  l.organization_id,
  ps.id AS stage_id,
  ps.name AS stage_name,
  ps.position,
  ps.is_won,
  ps.is_lost,
  COUNT(l.id) AS lead_count,
  COALESCE(SUM(l.estimated_value), 0) AS total_value,
  COUNT(l.id) FILTER (WHERE l.converted_at IS NOT NULL) AS converted_count
FROM leads l
JOIN pipeline_stages ps ON ps.id = l.stage_id AND ps.organization_id = l.organization_id
WHERE l.archived_at IS NULL
GROUP BY l.organization_id, ps.id, ps.name, ps.position, ps.is_won, ps.is_lost;

-- ============================================================================
-- VIEW: v_cashflow_monthly
-- Monthly income/expense/balance from financial_transactions
-- Excludes transfers (transfer_group_id IS NOT NULL) from income/expense totals
-- ============================================================================
CREATE OR REPLACE VIEW v_cashflow_monthly AS
SELECT
  ft.organization_id,
  DATE_TRUNC('month', ft.occurred_at)::DATE AS month_start,
  COALESCE(SUM(ft.amount) FILTER (WHERE ft.transaction_type IN ('income', 'receivable_payment', 'opening_balance')), 0) AS total_income,
  COALESCE(SUM(ft.amount) FILTER (WHERE ft.transaction_type IN ('expense', 'payable_payment')), 0) AS total_expense,
  SUM(ft.amount) AS net_flow
FROM financial_transactions ft
WHERE ft.reversal_of_transaction_id IS NULL
GROUP BY ft.organization_id, DATE_TRUNC('month', ft.occurred_at);

-- ============================================================================
-- VIEW: v_inventory_valuation
-- Current stock value per product/warehouse using cost_price and quantity_on_hand
-- Includes variant-level granularity when applicable
-- ============================================================================
CREATE OR REPLACE VIEW v_inventory_valuation AS
SELECT
  ib.organization_id,
  ib.warehouse_id,
  w.name AS warehouse_name,
  ib.product_id,
  p.name AS product_name,
  p.sku AS product_sku,
  ib.variant_id,
  pv.name AS variant_name,
  pv.sku AS variant_sku,
  ib.quantity_on_hand,
  ib.quantity_reserved,
  ib.quantity_on_hand - ib.quantity_reserved AS quantity_available,
  COALESCE(pv.cost_price_override, p.cost_price, 0) AS unit_cost,
  (ib.quantity_on_hand - ib.quantity_reserved) * COALESCE(pv.cost_price_override, p.cost_price, 0) AS available_value,
  ib.quantity_on_hand * COALESCE(pv.cost_price_override, p.cost_price, 0) AS total_value
FROM inventory_balances ib
JOIN warehouses w ON w.id = ib.warehouse_id AND w.organization_id = ib.organization_id
JOIN products p ON p.id = ib.product_id AND p.organization_id = ib.organization_id
LEFT JOIN product_variants pv ON pv.id = ib.variant_id AND pv.organization_id = ib.organization_id;

-- ============================================================================
-- VIEW: v_receivables_aging
-- Open receivables bucketed into aging brackets based on due_date vs now()
-- Uses remaining balance (original_amount - amount_received)
-- ============================================================================
CREATE OR REPLACE VIEW v_receivables_aging AS
SELECT
  r.organization_id,
  r.id AS receivable_id,
  r.customer_id,
  c.name AS customer_name,
  r.description,
  r.original_amount,
  r.amount_received,
  r.original_amount - r.amount_received AS outstanding_amount,
  r.due_date,
  r.status,
  CASE
    WHEN r.due_date >= CURRENT_DATE THEN 'current'
    WHEN CURRENT_DATE - r.due_date <= 30 THEN '1_30'
    WHEN CURRENT_DATE - r.due_date <= 60 THEN '31_60'
    WHEN CURRENT_DATE - r.due_date <= 90 THEN '61_90'
    ELSE '90_plus'
  END AS aging_bucket,
  GREATEST(0, CURRENT_DATE - r.due_date) AS days_overdue
FROM receivables r
LEFT JOIN customers c ON c.id = r.customer_id AND c.organization_id = r.organization_id
WHERE r.status NOT IN ('cancelled', 'fully_paid')
  AND r.original_amount - r.amount_received > 0.01;

-- ============================================================================
-- VIEW: v_payables_aging
-- Open payables bucketed into aging brackets based on due_date vs now()
-- Uses remaining balance (original_amount - amount_paid)
-- ============================================================================
CREATE OR REPLACE VIEW v_payables_aging AS
SELECT
  p.organization_id,
  p.id AS payable_id,
  p.counterparty_name,
  p.description,
  p.original_amount,
  p.amount_paid,
  p.original_amount - p.amount_paid AS outstanding_amount,
  p.due_date,
  p.status,
  CASE
    WHEN p.due_date >= CURRENT_DATE THEN 'current'
    WHEN CURRENT_DATE - p.due_date <= 30 THEN '1_30'
    WHEN CURRENT_DATE - p.due_date <= 60 THEN '31_60'
    WHEN CURRENT_DATE - p.due_date <= 90 THEN '61_90'
    ELSE '90_plus'
  END AS aging_bucket,
  GREATEST(0, CURRENT_DATE - p.due_date) AS days_overdue
FROM payables p
WHERE p.status NOT IN ('cancelled', 'fully_paid')
  AND p.original_amount - p.amount_paid > 0.01;

-- ============================================================================
-- VIEW: v_team_performance
-- Orders count and revenue per employee per period
-- Joins orders.created_by with memberships + profiles
-- ============================================================================
CREATE OR REPLACE VIEW v_team_performance AS
SELECT
  o.organization_id,
  o.created_by AS user_id,
  pr.full_name,
  pr.email,
  m.role,
  ep.department_id,
  d.name AS department_name,
  COUNT(o.id) AS order_count,
  COALESCE(SUM(o.total), 0) AS total_revenue,
  COALESCE(AVG(o.total), 0) AS avg_ticket,
  MIN(o.created_at) AS first_order_at,
  MAX(o.created_at) AS last_order_at
FROM orders o
JOIN memberships m ON m.user_id = o.created_by AND m.organization_id = o.organization_id
JOIN profiles pr ON pr.id = o.created_by
LEFT JOIN employee_profiles ep ON ep.membership_id = m.id AND ep.organization_id = o.organization_id
LEFT JOIN departments d ON d.id = ep.department_id AND d.organization_id = o.organization_id
GROUP BY o.organization_id, o.created_by, pr.full_name, pr.email, m.role,
         ep.department_id, d.name;

-- ============================================================================
-- Indexes for report query performance
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_orders_org_created ON orders(organization_id, created_at);
CREATE INDEX IF NOT EXISTS idx_orders_org_completed ON orders(organization_id, completed_at);
CREATE INDEX IF NOT EXISTS idx_orders_org_channel ON orders(organization_id, channel_id);
CREATE INDEX IF NOT EXISTS idx_leads_org_stage ON leads(organization_id, stage_id);
CREATE INDEX IF NOT EXISTS idx_leads_org_created ON leads(organization_id, created_at);
CREATE INDEX IF NOT EXISTS idx_ft_org_occurred ON financial_transactions(organization_id, occurred_at);
CREATE INDEX IF NOT EXISTS idx_receivables_org_due ON receivables(organization_id, due_date);
CREATE INDEX IF NOT EXISTS idx_payables_org_due ON payables(organization_id, due_date);
CREATE INDEX IF NOT EXISTS idx_inv_balances_org_product ON inventory_balances(organization_id, product_id);

-- ============================================================================
-- RLS: Views inherit RLS from underlying tables automatically
-- No additional policies needed since views use SECURITY INVOKER (default)
-- and all base tables already have organization_id-scoped RLS via is_member_of()
-- ============================================================================