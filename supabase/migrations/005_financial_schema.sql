-- ============================================================================
-- NEXORA FASE 06 — GESTÃO FINANCEIRA
-- Tabelas: financial_accounts, financial_categories, receivables, payables,
--          financial_payments, payment_allocations, financial_transactions
-- Funções: register_payment, allocate_payment, reverse_payment,
--          transfer_between_accounts, generate_receivables_from_order,
--          seed_default_financial_data
-- ============================================================================

-- ============================================================================
-- 1. FINANCIAL ACCOUNTS
-- ============================================================================
CREATE TABLE IF NOT EXISTS financial_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  account_type TEXT NOT NULL CHECK (account_type IN ('bank_account', 'cash', 'digital_wallet', 'payment_account', 'other')),
  institution_name TEXT,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (organization_id, name)
);

CREATE INDEX idx_financial_accounts_org ON financial_accounts(organization_id);

-- ============================================================================
-- 2. FINANCIAL CATEGORIES
-- ============================================================================
CREATE TABLE IF NOT EXISTS financial_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category_type TEXT NOT NULL CHECK (category_type IN ('income', 'expense')),
  parent_id UUID REFERENCES financial_categories(id) ON DELETE SET NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (organization_id, parent_id, name)
);

CREATE INDEX IF NOT EXISTS idx_financial_categories_org ON financial_categories(organization_id);
CREATE INDEX IF NOT EXISTS idx_financial_categories_parent ON financial_categories(parent_id);

-- ============================================================================
-- 3. RECEIVABLES (Contas a Receber)
-- ============================================================================
CREATE TABLE IF NOT EXISTS receivables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
  order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
  description TEXT NOT NULL,
  original_amount NUMERIC(14,2) NOT NULL CHECK (original_amount > 0),
  amount_received NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (amount_received >= 0),
  issue_date DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date DATE NOT NULL,
  category_id UUID REFERENCES financial_categories(id) ON DELETE SET NULL,
  installment_group_id UUID,
  installment_number INT CHECK (installment_number > 0),
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'partially_received', 'received', 'overdue', 'cancelled')),
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT chk_receivable_amount CHECK (amount_received <= original_amount)
);

CREATE INDEX idx_receivables_org_status ON receivables(organization_id, status);
CREATE INDEX idx_receivables_org_due_date ON receivables(organization_id, due_date);
CREATE INDEX idx_receivables_order ON receivables(order_id);
CREATE INDEX idx_receivables_customer ON receivables(customer_id);
CREATE INDEX idx_receivables_installment_group ON receivables(installment_group_id);

-- ============================================================================
-- 4. PAYABLES (Contas a Pagar)
-- ============================================================================
CREATE TABLE IF NOT EXISTS payables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  counterparty_name TEXT NOT NULL,
  description TEXT NOT NULL,
  original_amount NUMERIC(14,2) NOT NULL CHECK (original_amount > 0),
  amount_paid NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (amount_paid >= 0),
  issue_date DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date DATE NOT NULL,
  category_id UUID REFERENCES financial_categories(id) ON DELETE SET NULL,
  installment_group_id UUID,
  installment_number INT CHECK (installment_number > 0),
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'partially_paid', 'paid', 'overdue', 'cancelled')),
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT chk_payable_amount CHECK (amount_paid <= original_amount)
);

CREATE INDEX idx_payables_org_status ON payables(organization_id, status);
CREATE INDEX idx_payables_org_due_date ON payables(organization_id, due_date);
CREATE INDEX idx_payables_installment_group ON payables(installment_group_id);

-- ============================================================================
-- 5. FINANCIAL PAYMENTS (Append-only)
-- ============================================================================
CREATE TABLE IF NOT EXISTS financial_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  financial_account_id UUID NOT NULL REFERENCES financial_accounts(id) ON DELETE RESTRICT,
  payment_direction TEXT NOT NULL CHECK (payment_direction IN ('inbound', 'outbound')),
  payment_method TEXT NOT NULL CHECK (payment_method IN ('pix', 'cash', 'bank_transfer', 'boleto', 'debit_card', 'credit_card', 'other')),
  gross_amount NUMERIC(14,2) NOT NULL CHECK (gross_amount > 0),
  fee_amount NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (fee_amount >= 0),
  net_amount NUMERIC(14,2) NOT NULL CHECK (net_amount > 0),
  paid_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  description TEXT,
  reversal_of UUID REFERENCES financial_payments(id) ON DELETE SET NULL,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  idempotency_key TEXT UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT chk_payment_net CHECK (net_amount = gross_amount - fee_amount)
);

CREATE INDEX IF NOT EXISTS idx_financial_payments_org ON financial_payments(organization_id);
CREATE INDEX IF NOT EXISTS idx_financial_payments_account ON financial_payments(financial_account_id);
CREATE INDEX IF NOT EXISTS idx_financial_payments_paid_at ON financial_payments(paid_at);
CREATE INDEX IF NOT EXISTS idx_financial_payments_reversal ON financial_payments(reversal_of);

-- ============================================================================
-- 6. PAYMENT ALLOCATIONS (Append-only)
-- ============================================================================
CREATE TABLE IF NOT EXISTS payment_allocations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  payment_id UUID NOT NULL REFERENCES financial_payments(id) ON DELETE CASCADE,
  receivable_id UUID REFERENCES receivables(id) ON DELETE CASCADE,
  payable_id UUID REFERENCES payables(id) ON DELETE CASCADE,
  allocated_amount NUMERIC(14,2) NOT NULL CHECK (allocated_amount > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT chk_allocation_target CHECK (
    (receivable_id IS NOT NULL AND payable_id IS NULL) OR
    (receivable_id IS NULL AND payable_id IS NOT NULL)
  )
);

CREATE INDEX idx_payment_allocations_payment ON payment_allocations(payment_id);
CREATE INDEX idx_payment_allocations_receivable ON payment_allocations(receivable_id);
CREATE INDEX idx_payment_allocations_payable ON payment_allocations(payable_id);

-- ============================================================================
-- 7. FINANCIAL TRANSACTIONS (Livro-caixa imutável, append-only)
-- ============================================================================
CREATE TABLE IF NOT EXISTS financial_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  financial_account_id UUID NOT NULL REFERENCES financial_accounts(id) ON DELETE RESTRICT,
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('opening_balance', 'income', 'expense', 'transfer_in', 'transfer_out', 'fee', 'reversal')),
  amount NUMERIC(14,2) NOT NULL,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  category_id UUID REFERENCES financial_categories(id) ON DELETE SET NULL,
  payment_id UUID REFERENCES financial_payments(id) ON DELETE SET NULL,
  transfer_group_id UUID,
  description TEXT,
  reference_type TEXT,
  reference_id UUID,
  reversal_of_transaction_id UUID REFERENCES financial_transactions(id) ON DELETE SET NULL,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_financial_transactions_org_date ON financial_transactions(organization_id, occurred_at);
CREATE INDEX IF NOT EXISTS idx_financial_transactions_account_date ON financial_transactions(financial_account_id, occurred_at);
CREATE INDEX IF NOT EXISTS idx_financial_transactions_transfer_group ON financial_transactions(transfer_group_id);
CREATE INDEX IF NOT EXISTS idx_financial_transactions_payment ON financial_transactions(payment_id);
CREATE INDEX IF NOT EXISTS idx_financial_transactions_category ON financial_transactions(category_id);

-- ============================================================================
-- ALTER EXISTING TABLES
-- ============================================================================

-- Estender document_sequences para suportar tipos financeiros
ALTER TABLE document_sequences DROP CONSTRAINT IF EXISTS chk_document_type;
ALTER TABLE document_sequences ADD CONSTRAINT chk_document_type CHECK (document_type IN ('order', 'quote', 'receivable', 'payable', 'payment'));

-- Adicionar cost_price_snapshot em order_items para cálculo de margem histórico
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'order_items' AND column_name = 'cost_price_snapshot'
  ) THEN
    ALTER TABLE order_items ADD COLUMN cost_price_snapshot NUMERIC(14,2);
  END IF;
END $$;

-- ============================================================================
-- UPDATED_AT TRIGGERS
-- ============================================================================
CREATE OR REPLACE TRIGGER set_financial_accounts_updated_at
  BEFORE UPDATE ON financial_accounts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE TRIGGER set_financial_categories_updated_at
  BEFORE UPDATE ON financial_categories
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE TRIGGER set_receivables_updated_at
  BEFORE UPDATE ON receivables
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE TRIGGER set_payables_updated_at
  BEFORE UPDATE ON payables
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- FUNCTIONS (SECURITY DEFINER + SET search_path = public)
-- ============================================================================

-- 1. register_payment: cria pagamento + transactions de saldo e taxa
CREATE OR REPLACE FUNCTION register_payment(
  p_org_id UUID,
  p_account_id UUID,
  p_direction TEXT,
  p_method TEXT,
  p_gross_amount NUMERIC,
  p_fee_amount NUMERIC DEFAULT 0,
  p_paid_at TIMESTAMPTZ DEFAULT now(),
  p_description TEXT DEFAULT NULL,
  p_user_id UUID DEFAULT NULL,
  p_idempotency_key TEXT DEFAULT NULL
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_payment_id UUID;
  v_net_amount NUMERIC;
  v_tx_type TEXT;
BEGIN
  -- Idempotency check
  IF p_idempotency_key IS NOT NULL THEN
    SELECT id INTO v_payment_id FROM financial_payments
    WHERE idempotency_key = p_idempotency_key AND organization_id = p_org_id;
    IF FOUND THEN
      RETURN v_payment_id;
    END IF;
  END IF;

  v_net_amount := p_gross_amount - p_fee_amount;
  IF v_net_amount <= 0 THEN
    RAISE EXCEPTION 'Valor líquido deve ser maior que zero';
  END IF;

  -- Insert payment record
  INSERT INTO financial_payments (
    organization_id, financial_account_id, payment_direction, payment_method,
    gross_amount, fee_amount, net_amount, paid_at, description,
    created_by, idempotency_key
  ) VALUES (
    p_org_id, p_account_id, p_direction, p_method,
    p_gross_amount, p_fee_amount, v_net_amount, p_paid_at, p_description,
    p_user_id, p_idempotency_key
  ) RETURNING id INTO v_payment_id;

  -- Determine transaction type based on direction
  v_tx_type := CASE WHEN p_direction = 'inbound' THEN 'income' ELSE 'expense' END;

  -- Create main transaction for the net amount
  INSERT INTO financial_transactions (
    organization_id, financial_account_id, transaction_type, amount,
    occurred_at, payment_id, description, created_by
  ) VALUES (
    p_org_id, p_account_id, v_tx_type,
    CASE WHEN p_direction = 'inbound' THEN v_net_amount ELSE -v_net_amount END,
    p_paid_at, v_payment_id, p_description, p_user_id
  );

  -- Create separate fee transaction if fee > 0
  IF p_fee_amount > 0 THEN
    INSERT INTO financial_transactions (
      organization_id, financial_account_id, transaction_type, amount,
      occurred_at, payment_id, description, created_by
    ) VALUES (
      p_org_id, p_account_id, 'fee',
      -p_fee_amount,
      p_paid_at, v_payment_id, COALESCE(p_description, '') || ' (taxa)', p_user_id
    );
  END IF;

  RETURN v_payment_id;
END;
$$;

-- 2. allocate_payment: vincula pagamento a recebível ou pagável
CREATE OR REPLACE FUNCTION allocate_payment(
  p_org_id UUID,
  p_payment_id UUID,
  p_receivable_id UUID,
  p_payable_id UUID,
  p_amount NUMERIC
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_allocation_id UUID;
  v_remaining_payment NUMERIC;
  v_remaining_target NUMERIC;
  v_current_received NUMERIC;
  v_current_paid NUMERIC;
  v_original_amount NUMERIC;
BEGIN
  -- Validate exactly one target
  IF (p_receivable_id IS NULL AND p_payable_id IS NULL) OR
     (p_receivable_id IS NOT NULL AND p_payable_id IS NOT NULL) THEN
    RAISE EXCEPTION 'Deve informar exatamente um destino: receivable_id ou payable_id';
  END IF;

  -- Check remaining unallocated amount on payment
  SELECT COALESCE(p.gross_amount, 0) - COALESCE(SUM(pa.allocated_amount), 0)
  INTO v_remaining_payment
  FROM financial_payments p
  LEFT JOIN payment_allocations pa ON pa.payment_id = p.id
  WHERE p.id = p_payment_id AND p.organization_id = p_org_id
  GROUP BY p.gross_amount;

  IF v_remaining_payment IS NULL THEN
    RAISE EXCEPTION 'Pagamento não encontrado';
  END IF;

  IF p_amount > v_remaining_payment THEN
    RAISE EXCEPTION 'Valor de alocação (%) excede saldo disponível do pagamento (%)', p_amount, v_remaining_payment;
  END IF;

  -- Check and update receivable or payable
  IF p_receivable_id IS NOT NULL THEN
    SELECT original_amount, amount_received INTO v_original_amount, v_current_received
    FROM receivables WHERE id = p_receivable_id AND organization_id = p_org_id;

    IF v_original_amount IS NULL THEN
      RAISE EXCEPTION 'Recebível não encontrado';
    END IF;

    v_remaining_target := v_original_amount - v_current_received;
    IF p_amount > v_remaining_target THEN
      RAISE EXCEPTION 'Valor de alocação (%) excede saldo pendente do recebível (%)', p_amount, v_remaining_target;
    END IF;

    -- Insert allocation
    INSERT INTO payment_allocations (organization_id, payment_id, receivable_id, allocated_amount)
    VALUES (p_org_id, p_payment_id, p_receivable_id, p_amount)
    RETURNING id INTO v_allocation_id;

    -- Update receivable
    UPDATE receivables SET
      amount_received = amount_received + p_amount,
      status = CASE
        WHEN amount_received + p_amount >= original_amount THEN 'received'
        ELSE 'partially_received'
      END
    WHERE id = p_receivable_id AND organization_id = p_org_id;

  ELSE
    SELECT original_amount, amount_paid INTO v_original_amount, v_current_paid
    FROM payables WHERE id = p_payable_id AND organization_id = p_org_id;

    IF v_original_amount IS NULL THEN
      RAISE EXCEPTION 'Pagável não encontrado';
    END IF;

    v_remaining_target := v_original_amount - v_current_paid;
    IF p_amount > v_remaining_target THEN
      RAISE EXCEPTION 'Valor de alocação (%) excede saldo pendente do pagável (%)', p_amount, v_remaining_target;
    END IF;

    -- Insert allocation
    INSERT INTO payment_allocations (organization_id, payment_id, payable_id, allocated_amount)
    VALUES (p_org_id, p_payment_id, p_payable_id, p_amount)
    RETURNING id INTO v_allocation_id;

    -- Update payable
    UPDATE payables SET
      amount_paid = amount_paid + p_amount,
      status = CASE
        WHEN amount_paid + p_amount >= original_amount THEN 'paid'
        ELSE 'partially_paid'
      END
    WHERE id = p_payable_id AND organization_id = p_org_id;
  END IF;

  RETURN v_allocation_id;
END;
$$;

-- 3. reverse_payment: estorna pagamento e reverte allocations
CREATE OR REPLACE FUNCTION reverse_payment(
  p_org_id UUID,
  p_payment_id UUID,
  p_reason TEXT,
  p_user_id UUID
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_payment RECORD;
  v_reversal_id UUID;
  v_alloc RECORD;
BEGIN
  -- Get original payment
  SELECT * INTO v_payment FROM financial_payments
  WHERE id = p_payment_id AND organization_id = p_org_id AND reversal_of IS NULL;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Pagamento não encontrado ou já estornado';
  END IF;

  -- Create reversal payment (opposite direction)
  INSERT INTO financial_payments (
    organization_id, financial_account_id, payment_direction, payment_method,
    gross_amount, fee_amount, net_amount, paid_at, description,
    reversal_of, created_by
  ) VALUES (
    p_org_id, v_payment.financial_account_id,
    CASE WHEN v_payment.payment_direction = 'inbound' THEN 'outbound' ELSE 'inbound' END,
    v_payment.payment_method,
    v_payment.gross_amount, v_payment.fee_amount, v_payment.net_amount,
    now(), COALESCE(p_reason, 'Estorno'),
    p_payment_id, p_user_id
  ) RETURNING id INTO v_reversal_id;

  -- Create reversal transactions
  INSERT INTO financial_transactions (
    organization_id, financial_account_id, transaction_type, amount,
    occurred_at, payment_id, description, created_by
  ) VALUES (
    p_org_id, v_payment.financial_account_id, 'reversal',
    CASE WHEN v_payment.payment_direction = 'inbound' THEN -v_payment.net_amount ELSE v_payment.net_amount END,
    now(), v_reversal_id, COALESCE(p_reason, 'Estorno'), p_user_id
  );

  -- Reverse fee transaction if applicable
  IF v_payment.fee_amount > 0 THEN
    INSERT INTO financial_transactions (
      organization_id, financial_account_id, transaction_type, amount,
      occurred_at, payment_id, description, created_by
    ) VALUES (
      p_org_id, v_payment.financial_account_id, 'reversal',
      v_payment.fee_amount,
      now(), v_reversal_id, COALESCE(p_reason, 'Estorno') || ' (taxa)', p_user_id
    );
  END IF;

  -- Reverse allocations: revert receivable/payable amounts
  FOR v_alloc IN
    SELECT * FROM payment_allocations WHERE payment_id = p_payment_id AND organization_id = p_org_id
  LOOP
    IF v_alloc.receivable_id IS NOT NULL THEN
      UPDATE receivables SET
        amount_received = GREATEST(0, amount_received - v_alloc.allocated_amount),
        status = CASE
          WHEN GREATEST(0, amount_received - v_alloc.allocated_amount) = 0 THEN 'open'
          WHEN GREATEST(0, amount_received - v_alloc.allocated_amount) < original_amount THEN 'partially_received'
          ELSE status
        END
      WHERE id = v_alloc.receivable_id AND organization_id = p_org_id;
    ELSIF v_alloc.payable_id IS NOT NULL THEN
      UPDATE payables SET
        amount_paid = GREATEST(0, amount_paid - v_alloc.allocated_amount),
        status = CASE
          WHEN GREATEST(0, amount_paid - v_alloc.allocated_amount) = 0 THEN 'open'
          WHEN GREATEST(0, amount_paid - v_alloc.allocated_amount) < original_amount THEN 'partially_paid'
          ELSE status
        END
      WHERE id = v_alloc.payable_id AND organization_id = p_org_id;
    END IF;
  END LOOP;

  RETURN v_reversal_id;
END;
$$;

-- 4. transfer_between_accounts: transfere entre contas financeiras
CREATE OR REPLACE FUNCTION transfer_between_accounts(
  p_org_id UUID,
  p_from_account_id UUID,
  p_to_account_id UUID,
  p_amount NUMERIC,
  p_description TEXT DEFAULT NULL,
  p_user_id UUID DEFAULT NULL
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_transfer_group_id UUID;
  v_from_balance NUMERIC;
BEGIN
  IF p_from_account_id = p_to_account_id THEN
    RAISE EXCEPTION 'Conta de origem e destino devem ser diferentes';
  END IF;

  IF p_amount <= 0 THEN
    RAISE EXCEPTION 'Valor da transferência deve ser maior que zero';
  END IF;

  -- Calculate current balance of source account
  SELECT COALESCE(SUM(amount), 0) INTO v_from_balance
  FROM financial_transactions
  WHERE financial_account_id = p_from_account_id AND organization_id = p_org_id;

  IF v_from_balance < p_amount THEN
    RAISE EXCEPTION 'Saldo insuficiente na conta de origem. Saldo: %, Transferência: %', v_from_balance, p_amount;
  END IF;

  v_transfer_group_id := gen_random_uuid();

  -- Debit from source
  INSERT INTO financial_transactions (
    organization_id, financial_account_id, transaction_type, amount,
    occurred_at, transfer_group_id, description, created_by
  ) VALUES (
    p_org_id, p_from_account_id, 'transfer_out', -p_amount,
    now(), v_transfer_group_id, p_description, p_user_id
  );

  -- Credit to destination
  INSERT INTO financial_transactions (
    organization_id, financial_account_id, transaction_type, amount,
    occurred_at, transfer_group_id, description, created_by
  ) VALUES (
    p_org_id, p_to_account_id, 'transfer_in', p_amount,
    now(), v_transfer_group_id, p_description, p_user_id
  );

  RETURN v_transfer_group_id;
END;
$$;

-- 5. generate_receivables_from_order: gera recebíveis parcelados a partir de pedido
CREATE OR REPLACE FUNCTION generate_receivables_from_order(
  p_org_id UUID,
  p_order_id UUID,
  p_installments INT DEFAULT 1,
  p_first_due_date DATE DEFAULT (CURRENT_DATE + INTERVAL '30 days')::DATE,
  p_interval_days INT DEFAULT 30,
  p_category_id UUID DEFAULT NULL,
  p_user_id UUID DEFAULT NULL
) RETURNS UUID[]
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order RECORD;
  v_group_id UUID;
  v_base_amount NUMERIC;
  v_remainder NUMERIC;
  v_result_ids UUID[] := '{}';
  v_due_date DATE;
  v_new_id UUID;
BEGIN
  -- Validate order exists and is confirmed
  SELECT id, customer_id, total, status INTO v_order
  FROM orders WHERE id = p_order_id AND organization_id = p_org_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Pedido não encontrado';
  END IF;

  IF v_order.status != 'confirmed' THEN
    RAISE EXCEPTION 'Apenas pedidos confirmados podem gerar recebíveis. Status atual: %', v_order.status;
  END IF;

  -- Idempotency: check if receivables already exist for this order
  IF EXISTS (SELECT 1 FROM receivables WHERE order_id = p_order_id AND organization_id = p_org_id) THEN
    RAISE EXCEPTION 'Recebíveis já foram gerados para este pedido';
  END IF;

  v_group_id := gen_random_uuid();
  v_base_amount := TRUNC(v_order.total / p_installments, 2);
  v_remainder := v_order.total - (v_base_amount * p_installments);

  FOR i IN 1..p_installments LOOP
    v_due_date := p_first_due_date + ((i - 1) * p_interval_days || ' days')::INTERVAL;

    INSERT INTO receivables (
      organization_id, customer_id, order_id, description,
      original_amount, issue_date, due_date, category_id,
      installment_group_id, installment_number, status, created_by
    ) VALUES (
      p_org_id, v_order.customer_id, p_order_id,
      'Pedido ' || COALESCE((SELECT document_number FROM orders WHERE id = p_order_id), ''),
      CASE WHEN i = p_installments THEN v_base_amount + v_remainder ELSE v_base_amount END,
      CURRENT_DATE, v_due_date, p_category_id,
      v_group_id, i, 'open', p_user_id
    ) RETURNING id INTO v_new_id;

    v_result_ids := array_append(v_result_ids, v_new_id);
  END LOOP;

  RETURN v_result_ids;
END;
$$;

-- ============================================================================
-- SEED DEFAULT FINANCIAL DATA (trigger on new organizations)
-- ============================================================================
CREATE OR REPLACE FUNCTION seed_default_financial_data()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cash_account_id UUID;
BEGIN
  -- Create default cash account
  INSERT INTO financial_accounts (organization_id, name, account_type, description)
  VALUES (NEW.id, 'Caixa Principal', 'cash', 'Conta caixa padrão')
  RETURNING id INTO v_cash_account_id;

  -- Income categories
  INSERT INTO financial_categories (organization_id, name, category_type) VALUES
    (NEW.id, 'Vendas de Produtos', 'income'),
    (NEW.id, 'Prestação de Serviços', 'income'),
    (NEW.id, 'Assinaturas e Recorrências', 'income'),
    (NEW.id, 'Outras Receitas', 'income');

  -- Expense categories
  INSERT INTO financial_categories (organization_id, name, category_type) VALUES
    (NEW.id, 'Aluguel e Condomínio', 'expense'),
    (NEW.id, 'Salários e Encargos', 'expense'),
    (NEW.id, 'Fornecedores e Materiais', 'expense'),
    (NEW.id, 'Marketing e Publicidade', 'expense'),
    (NEW.id, 'Tecnologia e Software', 'expense'),
    (NEW.id, 'Impostos e Taxas', 'expense'),
    (NEW.id, 'Transporte e Logística', 'expense'),
    (NEW.id, 'Serviços de Terceiros', 'expense'),
    (NEW.id, 'Despesas Bancárias', 'expense'),
    (NEW.id, 'Outras Despesas', 'expense');

  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER trg_seed_financial_data
  AFTER INSERT ON organizations
  FOR EACH ROW EXECUTE FUNCTION seed_default_financial_data();

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

-- financial_accounts
ALTER TABLE financial_accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "financial_accounts_select" ON financial_accounts FOR SELECT USING (is_member_of(organization_id));
CREATE POLICY "financial_accounts_insert" ON financial_accounts FOR INSERT WITH CHECK (is_member_of(organization_id));
CREATE POLICY "financial_accounts_update" ON financial_accounts FOR UPDATE USING (is_member_of(organization_id)) WITH CHECK (is_member_of(organization_id));
CREATE POLICY "financial_accounts_delete" ON financial_accounts FOR DELETE USING (is_member_of(organization_id));

-- financial_categories
ALTER TABLE financial_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "financial_categories_select" ON financial_categories FOR SELECT USING (is_member_of(organization_id));
CREATE POLICY "financial_categories_insert" ON financial_categories FOR INSERT WITH CHECK (is_member_of(organization_id));
CREATE POLICY "financial_categories_update" ON financial_categories FOR UPDATE USING (is_member_of(organization_id)) WITH CHECK (is_member_of(organization_id));
CREATE POLICY "financial_categories_delete" ON financial_categories FOR DELETE USING (is_member_of(organization_id));

-- receivables
ALTER TABLE receivables ENABLE ROW LEVEL SECURITY;
CREATE POLICY "receivables_select" ON receivables FOR SELECT USING (is_member_of(organization_id));
CREATE POLICY "receivables_insert" ON receivables FOR INSERT WITH CHECK (is_member_of(organization_id));
CREATE POLICY "receivables_update" ON receivables FOR UPDATE USING (is_member_of(organization_id)) WITH CHECK (is_member_of(organization_id));
CREATE POLICY "receivables_delete" ON receivables FOR DELETE USING (is_member_of(organization_id));

-- payables
ALTER TABLE payables ENABLE ROW LEVEL SECURITY;
CREATE POLICY "payables_select" ON payables FOR SELECT USING (is_member_of(organization_id));
CREATE POLICY "payables_insert" ON payables FOR INSERT WITH CHECK (is_member_of(organization_id));
CREATE POLICY "payables_update" ON payables FOR UPDATE USING (is_member_of(organization_id)) WITH CHECK (is_member_of(organization_id));
CREATE POLICY "payables_delete" ON payables FOR DELETE USING (is_member_of(organization_id));

-- financial_payments (append-only: SELECT + INSERT only)
ALTER TABLE financial_payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "financial_payments_select" ON financial_payments FOR SELECT USING (is_member_of(organization_id));
CREATE POLICY "financial_payments_insert" ON financial_payments FOR INSERT WITH CHECK (is_member_of(organization_id));

-- payment_allocations (append-only: SELECT + INSERT only)
ALTER TABLE payment_allocations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "payment_allocations_select" ON payment_allocations FOR SELECT USING (is_member_of(organization_id));
CREATE POLICY "payment_allocations_insert" ON payment_allocations FOR INSERT WITH CHECK (is_member_of(organization_id));

-- financial_transactions (append-only: SELECT + INSERT only)
ALTER TABLE financial_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "financial_transactions_select" ON financial_transactions FOR SELECT USING (is_member_of(organization_id));
CREATE POLICY "financial_transactions_insert" ON financial_transactions FOR INSERT WITH CHECK (is_member_of(organization_id));