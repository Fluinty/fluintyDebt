-- ============================================
-- VindycAItion - Initial Database Schema
-- ============================================

-- USERS AND PROFILES
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  -- Company data
  company_name TEXT NOT NULL,
  company_nip TEXT,
  company_address TEXT,
  company_city TEXT,
  company_postal_code TEXT,
  company_phone TEXT,
  company_email TEXT,
  -- Payment data (for demands)
  bank_account_number TEXT,
  bank_name TEXT,
  -- Settings
  default_sequence_id UUID,
  send_thank_you_on_payment BOOLEAN DEFAULT TRUE,
  interest_rate DECIMAL(5,4) DEFAULT 0.155,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- COLLECTION SEQUENCES
CREATE TABLE sequences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  is_default BOOLEAN DEFAULT FALSE,
  is_system BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE sequence_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sequence_id UUID NOT NULL REFERENCES sequences(id) ON DELETE CASCADE,
  step_order INT NOT NULL,
  days_offset INT NOT NULL,
  channel TEXT NOT NULL CHECK (channel IN ('email', 'sms', 'both')),
  email_subject TEXT,
  email_body TEXT NOT NULL,
  sms_body TEXT,
  include_payment_link BOOLEAN DEFAULT TRUE,
  include_interest BOOLEAN DEFAULT FALSE,
  is_ai_generated BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(sequence_id, step_order)
);

-- CONTRACTORS (DEBTORS)
CREATE TABLE debtors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  nip TEXT,
  email TEXT,
  phone TEXT,
  address TEXT,
  city TEXT,
  postal_code TEXT,
  contact_person TEXT,
  default_sequence_id UUID REFERENCES sequences(id) ON DELETE SET NULL,
  -- Scoring
  payment_score INT DEFAULT 100,
  total_invoices INT DEFAULT 0,
  paid_on_time INT DEFAULT 0,
  paid_late INT DEFAULT 0,
  unpaid INT DEFAULT 0,
  -- Totals
  total_debt DECIMAL(12,2) DEFAULT 0,
  overdue_debt DECIMAL(12,2) DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- INVOICES / RECEIVABLES
CREATE TABLE invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  debtor_id UUID NOT NULL REFERENCES debtors(id) ON DELETE CASCADE,
  invoice_number TEXT NOT NULL,
  issue_date DATE NOT NULL,
  due_date DATE NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  currency TEXT DEFAULT 'PLN',
  description TEXT,
  -- Payments
  amount_paid DECIMAL(12,2) DEFAULT 0,
  paid_at TIMESTAMPTZ,
  -- Status
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'partial', 'paid', 'overdue', 'paused', 'written_off')),
  -- Sequence
  sequence_id UUID REFERENCES sequences(id) ON DELETE SET NULL,
  sequence_status TEXT DEFAULT 'active' CHECK (sequence_status IN ('active', 'paused', 'completed', 'stopped')),
  current_step_index INT DEFAULT 0,
  sequence_paused_at TIMESTAMPTZ,
  sequence_paused_until TIMESTAMPTZ,
  -- Calculated
  days_overdue INT GENERATED ALWAYS AS (
    CASE WHEN due_date < CURRENT_DATE AND status NOT IN ('paid', 'written_off')
    THEN CURRENT_DATE - due_date
    ELSE 0 END
  ) STORED,
  interest_amount DECIMAL(12,2) DEFAULT 0,
  -- Payment link
  payment_link TEXT,
  payment_link_expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- INSTALLMENT PLANS
CREATE TABLE installment_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  total_installments INT NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE installments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID NOT NULL REFERENCES installment_plans(id) ON DELETE CASCADE,
  installment_number INT NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  due_date DATE NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'overdue')),
  paid_at TIMESTAMPTZ,
  sequence_id UUID REFERENCES sequences(id) ON DELETE SET NULL,
  sequence_status TEXT DEFAULT 'active',
  current_step_index INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(plan_id, installment_number)
);

-- ACTION HISTORY
CREATE TABLE collection_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID REFERENCES invoices(id) ON DELETE CASCADE,
  installment_id UUID REFERENCES installments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL,
  sequence_step_id UUID REFERENCES sequence_steps(id),
  channel TEXT,
  email_subject TEXT,
  content TEXT,
  recipient_email TEXT,
  recipient_phone TEXT,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'sent', 'delivered', 'failed')),
  sent_at TIMESTAMPTZ,
  error_message TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- SCHEDULED JOBS
CREATE TABLE scheduled_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID REFERENCES invoices(id) ON DELETE CASCADE,
  installment_id UUID REFERENCES installments(id) ON DELETE CASCADE,
  sequence_step_id UUID NOT NULL REFERENCES sequence_steps(id) ON DELETE CASCADE,
  scheduled_for DATE NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'executed', 'skipped', 'cancelled')),
  executed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- INDEXES
CREATE INDEX idx_sequences_user_id ON sequences(user_id);
CREATE INDEX idx_sequence_steps_sequence_id ON sequence_steps(sequence_id);
CREATE INDEX idx_debtors_user_id ON debtors(user_id);
CREATE INDEX idx_debtors_nip ON debtors(nip);
CREATE INDEX idx_invoices_user_id ON invoices(user_id);
CREATE INDEX idx_invoices_debtor_id ON invoices(debtor_id);
CREATE INDEX idx_invoices_status ON invoices(status);
CREATE INDEX idx_invoices_due_date ON invoices(due_date);
CREATE INDEX idx_invoices_sequence_status ON invoices(sequence_status);
CREATE INDEX idx_installments_plan_id ON installments(plan_id);
CREATE INDEX idx_installments_due_date ON installments(due_date);
CREATE INDEX idx_collection_actions_invoice_id ON collection_actions(invoice_id);
CREATE INDEX idx_scheduled_steps_scheduled_for ON scheduled_steps(scheduled_for);
CREATE INDEX idx_scheduled_steps_status ON scheduled_steps(status);

-- ROW LEVEL SECURITY
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE sequences ENABLE ROW LEVEL SECURITY;
ALTER TABLE sequence_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE debtors ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE installment_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE installments ENABLE ROW LEVEL SECURITY;
ALTER TABLE collection_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE scheduled_steps ENABLE ROW LEVEL SECURITY;

-- POLICIES
CREATE POLICY "Users can view own profile" ON profiles FOR ALL USING (auth.uid() = id);
CREATE POLICY "Users can manage own sequences" ON sequences FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own sequence_steps" ON sequence_steps FOR ALL
  USING (sequence_id IN (SELECT id FROM sequences WHERE user_id = auth.uid()));
CREATE POLICY "Users can manage own debtors" ON debtors FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own invoices" ON invoices FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own installment_plans" ON installment_plans FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own installments" ON installments FOR ALL
  USING (plan_id IN (SELECT id FROM installment_plans WHERE user_id = auth.uid()));
CREATE POLICY "Users can manage own actions" ON collection_actions FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own scheduled_steps" ON scheduled_steps FOR ALL
  USING (invoice_id IN (SELECT id FROM invoices WHERE user_id = auth.uid()));

-- TRIGGERS for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_sequences_updated_at BEFORE UPDATE ON sequences FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_sequence_steps_updated_at BEFORE UPDATE ON sequence_steps FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_debtors_updated_at BEFORE UPDATE ON debtors FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_invoices_updated_at BEFORE UPDATE ON invoices FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
