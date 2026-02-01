-- ============================================
-- VindycAItion - Initial Database Schema
-- ============================================

-- !!! UWAGA: TO USUNIE WSZYSTKIE DANE ZE STAREJ WERSJI !!!
-- Czyścimy bazę, żeby postawić ją na czysto
DROP SCHEMA IF EXISTS public CASCADE;
CREATE SCHEMA public;
GRANT ALL ON SCHEMA public TO postgres;
GRANT ALL ON SCHEMA public TO public;
GRANT USAGE ON SCHEMA public TO anon;
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT USAGE ON SCHEMA public TO service_role;

-- USERS AND PROFILES
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  -- Company data (NULL = triggers onboarding wizard)
  company_name TEXT,
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
  -- Onboarding & Feature Flags
  onboarding_completed BOOLEAN DEFAULT FALSE,
  ksef_setup_skipped BOOLEAN DEFAULT FALSE,
  modules jsonb DEFAULT '{"sales": true, "costs": true}'::jsonb,
  current_balance NUMERIC DEFAULT 0,
  sms_enabled BOOLEAN DEFAULT FALSE,
  voice_enabled BOOLEAN DEFAULT FALSE,
  thank_you_email_subject TEXT,
  thank_you_email_body TEXT,
  country TEXT DEFAULT 'PL',
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
  days_overdue INT DEFAULT 0,
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

-- POLICIES (profiles needs INSERT + UPDATE + SELECT + DELETE separately)
CREATE POLICY "Users can view own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can delete own profile" ON profiles FOR DELETE USING (auth.uid() = id);
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

-- TABLE GRANTS for anon and authenticated roles
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;

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

-- ============================================
-- Missing Function: handle_new_user (Auto-create Profile)
-- ============================================
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS TRIGGER 
LANGUAGE plpgsql 
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  -- Create profile with NULL company_name to trigger onboarding wizard
  -- Modules default to BOTH enabled (sales + costs)
  INSERT INTO public.profiles (id, email, company_name, modules)
  VALUES (new.id, new.email, NULL, '{"sales": true, "costs": true}'::jsonb)
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
-- ============================================
-- VindycAItion - Add System Sequences Support
-- ============================================
-- This migration allows system-wide sequences (user_id = NULL)
-- that are visible to all users but cannot be edited

-- Make user_id nullable for system sequences (ignore if already done)
DO $$ 
BEGIN
    ALTER TABLE sequences ALTER COLUMN user_id DROP NOT NULL;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'user_id already nullable, skipping';
END $$;

-- Drop ALL existing policies for sequences (clean slate)
DROP POLICY IF EXISTS "Users can view their own sequences" ON sequences;
DROP POLICY IF EXISTS "Users can view own and system sequences" ON sequences;
DROP POLICY IF EXISTS "Users can insert their own sequences" ON sequences;
DROP POLICY IF EXISTS "Users can update their own sequences" ON sequences;
DROP POLICY IF EXISTS "Users can update their own non-system sequences" ON sequences;
DROP POLICY IF EXISTS "Users can delete their own sequences" ON sequences;
DROP POLICY IF EXISTS "Users can delete their own non-system sequences" ON sequences;

-- Create new policies
CREATE POLICY "Users can view own and system sequences" ON sequences
  FOR SELECT USING (user_id = auth.uid() OR user_id IS NULL);

CREATE POLICY "Users can insert their own sequences" ON sequences
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own non-system sequences" ON sequences
  FOR UPDATE USING (user_id = auth.uid() AND is_system = FALSE);

CREATE POLICY "Users can delete their own non-system sequences" ON sequences
  FOR DELETE USING (user_id = auth.uid() AND is_system = FALSE);

-- Drop ALL existing policies for sequence_steps (clean slate)
DROP POLICY IF EXISTS "Users can view steps of their sequences" ON sequence_steps;
DROP POLICY IF EXISTS "Users can view steps of own and system sequences" ON sequence_steps;
DROP POLICY IF EXISTS "Users can insert steps in their sequences" ON sequence_steps;
DROP POLICY IF EXISTS "Users can insert steps in their own sequences" ON sequence_steps;
DROP POLICY IF EXISTS "Users can update steps in their sequences" ON sequence_steps;
DROP POLICY IF EXISTS "Users can update steps in their own sequences" ON sequence_steps;
DROP POLICY IF EXISTS "Users can update steps in their own non-system sequences" ON sequence_steps;
DROP POLICY IF EXISTS "Users can delete steps in their sequences" ON sequence_steps;
DROP POLICY IF EXISTS "Users can delete steps in their own sequences" ON sequence_steps;
DROP POLICY IF EXISTS "Users can delete steps in their own non-system sequences" ON sequence_steps;

-- Create new policies for sequence_steps
CREATE POLICY "Users can view steps of own and system sequences" ON sequence_steps
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM sequences s 
      WHERE s.id = sequence_steps.sequence_id 
      AND (s.user_id = auth.uid() OR s.user_id IS NULL)
    )
  );

CREATE POLICY "Users can insert steps in their own sequences" ON sequence_steps
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM sequences s 
      WHERE s.id = sequence_steps.sequence_id 
      AND s.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update steps in their own non-system sequences" ON sequence_steps
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM sequences s 
      WHERE s.id = sequence_steps.sequence_id 
      AND s.user_id = auth.uid()
      AND s.is_system = FALSE
    )
  );

CREATE POLICY "Users can delete steps in their own non-system sequences" ON sequence_steps
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM sequences s 
      WHERE s.id = sequence_steps.sequence_id 
      AND s.user_id = auth.uid()
      AND s.is_system = FALSE
    )
  );
-- Add attach_invoice column to sequence_steps
ALTER TABLE sequence_steps 
ADD COLUMN IF NOT EXISTS attach_invoice BOOLEAN DEFAULT FALSE;

-- Update existing records to false (already handle by DEFAULT but good to be explicit for safety if needed, though default handles new ones)
-- No need to update old ones as default applies to new inserts, for existing rows standard SQL behaviour depends but usually null unless we specify NOT NULL.
-- Let's make it NOT NULL DEFAULT FALSE to be clean.

UPDATE sequence_steps SET attach_invoice = FALSE WHERE attach_invoice IS NULL;
ALTER TABLE sequence_steps ALTER COLUMN attach_invoice SET DEFAULT FALSE;
ALTER TABLE sequence_steps ALTER COLUMN attach_invoice SET NOT NULL;
-- Add VAT support to invoices table
-- Run this in Supabase SQL Editor

-- Add VAT columns to invoices
ALTER TABLE invoices 
ADD COLUMN IF NOT EXISTS amount_net numeric(12,2),
ADD COLUMN IF NOT EXISTS vat_rate varchar(10) DEFAULT '23',
ADD COLUMN IF NOT EXISTS vat_amount numeric(12,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS amount_gross numeric(12,2);

-- Migrate existing data: treat current 'amount' as gross amount
UPDATE invoices 
SET 
    amount_gross = amount,
    amount_net = ROUND(amount / 1.23, 2),  -- Assuming 23% VAT for existing
    vat_amount = ROUND(amount - (amount / 1.23), 2),
    vat_rate = '23'
WHERE amount_gross IS NULL;

-- Add onboarding_completed to profiles if not exists
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS onboarding_completed boolean DEFAULT false;

-- Comment for clarity
COMMENT ON COLUMN invoices.amount_net IS 'Kwota netto (przed VAT)';
COMMENT ON COLUMN invoices.vat_rate IS 'Stawka VAT: 23, 8, 5, 0, zw, np';
COMMENT ON COLUMN invoices.vat_amount IS 'Kwota podatku VAT';
COMMENT ON COLUMN invoices.amount_gross IS 'Kwota brutto (z VAT)';
-- Add thank you email template fields to profiles
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS thank_you_email_subject TEXT,
ADD COLUMN IF NOT EXISTS thank_you_email_body TEXT;

-- Optional: Set some default values?
-- Let's leave them null and handle defaults in UI/Code or set a migration default.
-- Actually, user probably wants a default to start with.
UPDATE profiles 
SET 
  thank_you_email_subject = 'Dziękujemy za wpłatę - {{invoice_number}}',
  thank_you_email_body = 'Cześć {{debtor_name}},\n\nDziękujemy za opłacenie faktury {{invoice_number}}.\n\nPozdrawiamy,\n{{company_name}}'
WHERE thank_you_email_subject IS NULL;
-- ================================================
-- NAPRAW POLITYKI RLS DLA SCHEDULED_STEPS
-- Uruchom to w Supabase SQL Editor
-- ================================================

-- Najpierw usuń istniejącą politykę
DROP POLICY IF EXISTS "Users can manage own scheduled_steps" ON scheduled_steps;

-- Dodaj nową politykę dla SELECT
CREATE POLICY "Users can view own scheduled_steps" ON scheduled_steps
FOR SELECT USING (
  invoice_id IN (SELECT id FROM invoices WHERE user_id = auth.uid())
);

-- Dodaj nową politykę dla INSERT
CREATE POLICY "Users can insert own scheduled_steps" ON scheduled_steps
FOR INSERT WITH CHECK (
  invoice_id IN (SELECT id FROM invoices WHERE user_id = auth.uid())
);

-- Dodaj nową politykę dla UPDATE - kluczowa!
CREATE POLICY "Users can update own scheduled_steps" ON scheduled_steps
FOR UPDATE USING (
  invoice_id IN (SELECT id FROM invoices WHERE user_id = auth.uid())
);

-- Dodaj nową politykę dla DELETE
CREATE POLICY "Users can delete own scheduled_steps" ON scheduled_steps
FOR DELETE USING (
  invoice_id IN (SELECT id FROM invoices WHERE user_id = auth.uid())
);

-- Sprawdź polityki
SELECT policyname, cmd FROM pg_policies WHERE tablename = 'scheduled_steps';

-- DODATKOWO: Oznacz historyczne kroki jako skipped
UPDATE scheduled_steps
SET status = 'skipped'
WHERE status = 'pending' 
  AND scheduled_for < CURRENT_DATE;
-- ============================================
-- VindycAItion - Add Auto-Send Settings
-- ============================================
-- Adds columns for automatic message sending and per-debtor preferences

-- Add auto-send settings to debtors table
ALTER TABLE debtors ADD COLUMN IF NOT EXISTS auto_send_enabled BOOLEAN DEFAULT TRUE;
ALTER TABLE debtors ADD COLUMN IF NOT EXISTS preferred_send_time TIME DEFAULT '10:00';
ALTER TABLE debtors ADD COLUMN IF NOT EXISTS preferred_channel TEXT DEFAULT 'email' 
    CHECK (preferred_channel IN ('email', 'sms', 'both'));

-- Add auto-send settings to invoices table
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS auto_send_enabled BOOLEAN DEFAULT TRUE;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS send_time TIME DEFAULT '10:00';

-- Add index for efficient querying of auto-send enabled invoices
CREATE INDEX IF NOT EXISTS idx_invoices_auto_send ON invoices(auto_send_enabled, send_time) 
    WHERE auto_send_enabled = TRUE;

-- Comment for documentation
COMMENT ON COLUMN debtors.auto_send_enabled IS 'Default: whether invoices for this debtor should auto-send messages';
COMMENT ON COLUMN debtors.preferred_send_time IS 'Default time to send messages for this debtor';
COMMENT ON COLUMN debtors.preferred_channel IS 'Preferred communication channel: email, sms, or both';
COMMENT ON COLUMN invoices.auto_send_enabled IS 'Whether this invoice should auto-send scheduled messages';
COMMENT ON COLUMN invoices.send_time IS 'Time of day to send scheduled messages for this invoice';
-- Migration: Seed 3 Standard Sequences
-- 1. Łagodna (Gentle) - 7 steps (including SMS) extended over 45 days
-- 2. Standardowa (Standard) - 6 steps over 35 days
-- 3. Szybka Eskalacja (Rapid) - 4 steps over 14 days

CREATE OR REPLACE FUNCTION create_default_sequences(target_user_id UUID)
RETURNS void 
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
    gentle_id UUID;
    standard_id UUID;
    rapid_id UUID;
BEGIN
    -- 1. Łagodna (Gentle)
    INSERT INTO sequences (user_id, name, description, is_default)
    VALUES (target_user_id, 'Windykacja Łagodna', 'Długofalowa strategia (45 dni) nastawiona na utrzymanie relacji.', false)
    RETURNING id INTO gentle_id;

    -- Step 1: Day 0 (Email)
    INSERT INTO sequence_steps (sequence_id, step_order, days_offset, channel, email_subject, email_body, sms_body)
    VALUES (gentle_id, 1, 0, 'email', 'Przypomnienie o dzisiejszym terminie płatności - {{invoice_number}}', 
    'Dzień dobry {{debtor_name}},

Przypominamy, że dzisiaj mija termin płatności faktury {{invoice_number}} na kwotę {{amount}}.

Będziemy wdzięczni za terminową wpłatę.

Nr konta: {{bank_account}}
Link do płatności: {{payment_link}}

Pozdrawiamy,
{{company_name}}', NULL);

    -- Step 2: Day 2 (Email)
    INSERT INTO sequence_steps (sequence_id, step_order, days_offset, channel, email_subject, email_body, sms_body)
    VALUES (gentle_id, 2, 2, 'email', 'Pytanie o fakturę {{invoice_number}}', 
    'Cześć {{debtor_name}},

Nie odnotowaliśmy jeszcze wpłaty za fakturę {{invoice_number}}. Czy dokument dotarł poprawnie?

Jeśli to tylko przeoczenie, prosimy o realizację przelewu.

Link: {{payment_link}}

Z poważaniem,
{{company_name}}', NULL);

    -- Step 3: Day 7 (Email)
    INSERT INTO sequence_steps (sequence_id, step_order, days_offset, channel, email_subject, email_body, sms_body)
    VALUES (gentle_id, 3, 7, 'email', 'Przypomnienie o płatności {{invoice_number}}', 
    'Dzień dobry,

Minął tydzień od terminu płatności faktury {{invoice_number}}. Prosimy o uregulowanie zaległości w wysokości {{amount}}.

Konto: {{bank_account}}

Dziękujemy,
{{company_name}}', NULL);

    -- Step 4: Day 15 (Email)
    INSERT INTO sequence_steps (sequence_id, step_order, days_offset, channel, email_subject, email_body, sms_body)
    VALUES (gentle_id, 4, 15, 'email', 'Ponowne przypomnienie - {{invoice_number}}', 
    'Szanowni Państwo,

Nadal nie otrzymaliśmy wpłaty za fakturę {{invoice_number}}, która jest już 15 dni po terminie. Prosimy o pilną płatność.

Link: {{payment_link}}

Z poważaniem,
Zespół Finansowy {{company_name}}', NULL);

    -- Step 5: Day 30 (Email)
    INSERT INTO sequence_steps (sequence_id, step_order, days_offset, channel, email_subject, email_body, sms_body)
    VALUES (gentle_id, 5, 30, 'email', 'OSTRZEŻENIE: Brak wpłaty za {{invoice_number}}', 
    'Dzień dobry,

Faktura {{invoice_number}} jest przeterminowana o 30 dni. Jest to ostatni moment na uregulowanie należności przed podjęciem dalszych kroków.

Prosimy o wpłatę: {{payment_link}}

Pozdrawiamy,
{{company_name}}', NULL);

    -- Step 6: Day 30 (SMS)
    -- Using empty string for email_body to satisfy potential NOT NULL constraints
    INSERT INTO sequence_steps (sequence_id, step_order, days_offset, channel, email_subject, email_body, sms_body)
    VALUES (gentle_id, 6, 30, 'sms', NULL, '', 
    'Cześć {{debtor_name}}, przypominamy o FV {{invoice_number}} na kwotę {{amount}}. Prosimy o wpłatę: {{payment_link}}. Pozdrawiamy, {{company_name}}');

    -- Step 7: Day 45 (Email)
    INSERT INTO sequence_steps (sequence_id, step_order, days_offset, channel, email_subject, email_body, sms_body)
    VALUES (gentle_id, 7, 45, 'email', 'Informacja o windykacji - {{invoice_number}}', 
    'Szanowni Państwo,

Z powodu braku wpłaty za fakturę {{invoice_number}} mimo wielu przypomnień, jesteśmy zmuszeni przekazać sprawę do zewnętrznej firmy windykacyjnej.

Ostateczny termin wpłaty to 3 dni.

Z poważaniem,
{{company_name}}', NULL);


    -- 2. Standardowa (Standard)
    INSERT INTO sequences (user_id, name, description, is_default)
    VALUES (target_user_id, 'Windykacja Standardowa', 'Zbalansowane podejście (35 dni), najczęściej wybierane.', true)
    RETURNING id INTO standard_id;

    -- Step 1: Day 1
    INSERT INTO sequence_steps (sequence_id, step_order, days_offset, channel, email_subject, email_body, sms_body)
    VALUES (standard_id, 1, 1, 'email', 'Przypomnienie: Termin faktury {{invoice_number}} minął', 
    'Dzień dobry,

Informujemy, że wczoraj minął termin płatności faktury {{invoice_number}}. Prosimy o dokonanie przelewu.

Kwota: {{amount}}
Link: {{payment_link}}

Pozdrawiamy,
{{company_name}}', NULL);

    -- Step 2: Day 5
    INSERT INTO sequence_steps (sequence_id, step_order, days_offset, channel, email_subject, email_body, sms_body)
    VALUES (standard_id, 2, 5, 'email', 'Ponowne przypomnienie o wpłacie', 
    'Dzień dobry,

Wciąż nie odnotowaliśmy wpłaty za fakturę {{invoice_number}}. Prosimy o pilne uregulowanie należności.

Konto: {{bank_account}}

Z poważaniem,
{{company_name}}', NULL);

    -- Step 3: Day 12
    INSERT INTO sequence_steps (sequence_id, step_order, days_offset, channel, email_subject, email_body, sms_body)
    VALUES (standard_id, 3, 12, 'email', 'WEZWANIE DO ZAPŁATY - {{invoice_number}}', 
    'Szanowni Państwo,

Wzywamy do natychmiastowej zapłaty kwoty {{amount}} wynikającej z faktury {{invoice_number}}.

Brak wpłaty spowoduje naliczenie odsetek.

Link: {{payment_link}}

Z poważaniem,
Dział Rozliczeń {{company_name}}', NULL);

    -- Step 4: Day 22 (Email)
    INSERT INTO sequence_steps (sequence_id, step_order, days_offset, channel, email_subject, email_body, sms_body)
    VALUES (standard_id, 4, 22, 'email', 'OSTATECZNE WEZWANIE PRZEDSĄDOWE', 
    'PILNE.

To ostateczne wezwanie do zapłaty faktury {{invoice_number}}. Sprawa zostanie skierowana do windykacji i rejestru długów, jeśli wpłata nie wpłynie w ciągu 3 dni.

Prosimy o natychmiastowy przelew.

{{company_name}}', NULL);

    -- Step 5: Day 22 (SMS)
    INSERT INTO sequence_steps (sequence_id, step_order, days_offset, channel, email_subject, email_body, sms_body)
    VALUES (standard_id, 5, 22, 'sms', NULL, '',
    'PILNE: Brak wplaty za FV {{invoice_number}} ({{amount}}). Ostatnie wezwanie przed windykacja. Zaplac teraz: {{payment_link}}');

    -- Step 6: Day 35
    INSERT INTO sequence_steps (sequence_id, step_order, days_offset, channel, email_subject, email_body, sms_body)
    VALUES (standard_id, 6, 35, 'email', 'Przekazanie sprawy do windykacji', 
    'Informujemy o rozpoczęciu procedury windykacyjnej w sprawie faktury {{invoice_number}}.

Prosimy o kontakt w celu ustalenia polubownego rozwiązania.

{{company_name}}', NULL);


    -- 3. Szybka Eskalacja (Rapid)
    INSERT INTO sequences (user_id, name, description, is_default)
    VALUES (target_user_id, 'Szybka Eskalacja', 'Agresywna windykacja w 14 dni. Dla ryzykownych klientów.', false)
    RETURNING id INTO rapid_id;

    -- Step 1: Day 1
    INSERT INTO sequence_steps (sequence_id, step_order, days_offset, channel, email_subject, email_body, sms_body)
    VALUES (rapid_id, 1, 1, 'email', 'WEZWANIE DO ZAPŁATY - {{invoice_number}}', 
    'Dzień dobry,

Brak wpłaty dla faktury {{invoice_number}} (termin minął wczoraj). Oczekujemy natychmiastowego przelewu.

Kwota: {{amount}}
Link: {{payment_link}}

{{company_name}}', NULL);

    -- Step 2: Day 7 (Email)
    INSERT INTO sequence_steps (sequence_id, step_order, days_offset, channel, email_subject, email_body, sms_body)
    VALUES (rapid_id, 2, 7, 'email', 'OSTATECZNE WEZWANIE - Groźba wpisu do BIG', 
    'PILNE.

Termin minął tydzień temu. Jeśli wpłata nie wpłynie jutro, kierujemy sprawę do sądu i rejestru dłużników.

Kwota: {{amount_with_interest}}

Opłać teraz: {{payment_link}}

{{company_name}}', NULL);

    -- Step 3: Day 7 (SMS)
    INSERT INTO sequence_steps (sequence_id, step_order, days_offset, channel, email_subject, email_body, sms_body)
    VALUES (rapid_id, 3, 7, 'sms', NULL, '',
    'OSTATNIA SZANSA: FV {{invoice_number}} trafi jutro do sadu. Kwota: {{amount_with_interest}}. Link: {{payment_link}}');

    -- Step 4: Day 14
    INSERT INTO sequence_steps (sequence_id, step_order, days_offset, channel, email_subject, email_body, sms_body)
    VALUES (rapid_id, 4, 14, 'email', 'Skierowanie do windykacji zewnętrznej', 
    'Szanowni Państwo,

Z powodu braku reakcji sprawa długu {{invoice_number}} została przekazana do obsługi zewnętrznej.

Koszty windykacji zostaną doliczone do długu.

{{company_name}}', NULL);

END;
$$;

-- =========================================================
-- FIXED TRIGGER: Create sequences only AFTER profile exists
-- =========================================================

-- 1. Drop old triggers on auth.users that were causing the crash
DROP TRIGGER IF EXISTS on_auth_user_created_sequences ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- 2. Create function to be called on profile creation
CREATE OR REPLACE FUNCTION trigger_create_sequences_for_new_profile()
RETURNS TRIGGER 
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
    PERFORM create_default_sequences(NEW.id);
    RETURN NEW;
END;
$$;

-- 3. Create trigger on PROFILES table instead
DROP TRIGGER IF EXISTS on_profile_created_sequences ON public.profiles;
CREATE TRIGGER on_profile_created_sequences
    AFTER INSERT ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION trigger_create_sequences_for_new_profile();

-- ============================================
-- CRITICAL FIX: Backfill profiles for existing users
-- Since we dropped the public schema, profiles are gone but auth.users remain.
-- We must recreate profiles BEFORE creating sequences for them.
-- ============================================
INSERT INTO public.profiles (id, email, company_name)
SELECT 
    id, 
    email, 
    'Firma ' || split_part(email, '@', 1)
FROM auth.users
ON CONFLICT (id) DO NOTHING;


-- Seed for existing users who don't have sequences yet
DO $$
DECLARE
    user_record RECORD;
BEGIN
    FOR user_record IN SELECT id FROM auth.users LOOP
        -- Check if user already has sequences to avoid duplication if migration runs multiple times
        IF NOT EXISTS (SELECT 1 FROM sequences WHERE user_id = user_record.id AND name = 'Windykacja Standardowa') THEN
             PERFORM create_default_sequences(user_record.id);
        END IF;
    END LOOP;
END $$;
-- Migration: Add KSeF integration tables and columns
-- This migration adds support for KSeF (Krajowy System e-Faktur) integration

-- 1. Create table for user KSeF settings
CREATE TABLE IF NOT EXISTS user_ksef_settings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
    
    -- KSeF configuration
    ksef_environment VARCHAR(20) DEFAULT 'test' CHECK (ksef_environment IN ('test', 'production')),
    is_enabled BOOLEAN DEFAULT false,
    
    -- Token stored securely (will use Supabase Vault in production)
    -- For now, we store encrypted token here
    ksef_token_encrypted TEXT,
    ksef_nip VARCHAR(10), -- NIP associated with KSeF account
    
    -- Sync settings
    sync_frequency VARCHAR(20) DEFAULT 'daily' CHECK (sync_frequency IN ('daily', 'manual')),
    auto_confirm_invoices BOOLEAN DEFAULT false, -- If true, skip confirmation step
    
    -- Sync tracking
    last_sync_at TIMESTAMPTZ,
    last_sync_status VARCHAR(50),
    last_sync_error TEXT,
    invoices_synced_count INTEGER DEFAULT 0,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Add KSeF columns to invoices table
ALTER TABLE invoices 
    ADD COLUMN IF NOT EXISTS ksef_number VARCHAR(100),
    ADD COLUMN IF NOT EXISTS ksef_status VARCHAR(50) DEFAULT NULL 
        CHECK (ksef_status IS NULL OR ksef_status IN ('pending_confirmation', 'confirmed', 'rejected')),
    ADD COLUMN IF NOT EXISTS imported_from_ksef BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS ksef_import_date TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS ksef_raw_data JSONB;

-- 3. Create index for faster KSeF queries
CREATE INDEX IF NOT EXISTS idx_invoices_ksef_status ON invoices(ksef_status) WHERE ksef_status IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_invoices_imported_ksef ON invoices(imported_from_ksef) WHERE imported_from_ksef = true;
CREATE INDEX IF NOT EXISTS idx_user_ksef_settings_user ON user_ksef_settings(user_id);

-- 4. Add trigger for updated_at
CREATE OR REPLACE FUNCTION update_ksef_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_user_ksef_settings_updated_at ON user_ksef_settings;
CREATE TRIGGER trigger_user_ksef_settings_updated_at
    BEFORE UPDATE ON user_ksef_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_ksef_settings_updated_at();

-- 5. Enable RLS for security
ALTER TABLE user_ksef_settings ENABLE ROW LEVEL SECURITY;

-- Users can only see/modify their own KSeF settings
CREATE POLICY "Users can view own ksef settings"
    ON user_ksef_settings FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own ksef settings"
    ON user_ksef_settings FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own ksef settings"
    ON user_ksef_settings FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own ksef settings"
    ON user_ksef_settings FOR DELETE
    USING (auth.uid() = user_id);

-- 6. Create audit log for KSeF token access (security)
CREATE TABLE IF NOT EXISTS ksef_audit_log (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    action VARCHAR(50) NOT NULL, -- 'token_created', 'token_updated', 'token_accessed', 'sync_started', 'sync_completed'
    ip_address VARCHAR(45),
    user_agent TEXT,
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ksef_audit_user ON ksef_audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_ksef_audit_created ON ksef_audit_log(created_at);

-- RLS for audit log
ALTER TABLE ksef_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own audit log"
    ON ksef_audit_log FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "System can insert audit log"
    ON ksef_audit_log FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- 7. Add onboarding_completed flag to profiles if not exists
ALTER TABLE profiles 
    ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS ksef_setup_skipped BOOLEAN DEFAULT false;
-- Migration: Add notifications table for persistent user notifications
-- This table stores notifications like KSeF sync results

CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    type TEXT NOT NULL DEFAULT 'info',
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    link TEXT,
    read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own notifications
CREATE POLICY "Users can read own notifications"
    ON notifications FOR SELECT
    USING (auth.uid() = user_id);

-- Policy: Users can update their own notifications (mark as read)
CREATE POLICY "Users can update own notifications"
    ON notifications FOR UPDATE
    USING (auth.uid() = user_id);

-- Policy: Allow service role to insert notifications (for cron jobs)
CREATE POLICY "Service role can insert notifications"
    ON notifications FOR INSERT
    WITH CHECK (true);

-- Index for performance when fetching unread notifications
CREATE INDEX idx_notifications_user_unread ON notifications(user_id, read, created_at DESC);

-- Auto-delete old notifications after 30 days (optional cleanup)
-- This can be handled by a scheduled job later
-- Migration: Enhance notifications table
-- Add reference_id and metadata for better tracking and deduplication

ALTER TABLE notifications 
ADD COLUMN IF NOT EXISTS reference_id TEXT, -- e.g. invoice_id, collection_action_id
ADD COLUMN IF NOT EXISTS metadata JSONB;    -- e.g. { "days_overdue": 5, "invoice_number": "FV/1/2026" }

-- Create index for deduplication checks
CREATE INDEX IF NOT EXISTS idx_notifications_user_type_ref ON notifications(user_id, type, reference_id);
-- Add paid_at column to track when invoices were actually paid
-- This enables historical payment behavior tracking for scoring

ALTER TABLE invoices ADD COLUMN IF NOT EXISTS paid_at TIMESTAMP WITH TIME ZONE;

-- Create index for paid_at queries
CREATE INDEX IF NOT EXISTS idx_invoices_paid_at ON invoices(paid_at);

-- Add comment for documentation
COMMENT ON COLUMN invoices.paid_at IS 'Timestamp when the invoice was marked as fully paid. Used for payment history scoring.';
-- Add table for invoice line items (from KSeF)
CREATE TABLE invoice_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    description TEXT NOT NULL,
    quantity DECIMAL(12,3) NOT NULL DEFAULT 1,
    unit_price_net DECIMAL(12,2) NOT NULL,
    unit_price_gross DECIMAL(12,2) NOT NULL,
    vat_rate INT, -- e.g. 23, 8, 0
    total_net DECIMAL(12,2) NOT NULL,
    total_gross DECIMAL(12,2) NOT NULL,
    unit TEXT, -- e.g. 'szt', 'usł'
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for faster queries
CREATE INDEX idx_invoice_items_invoice_id ON invoice_items(invoice_id);

-- RLS
ALTER TABLE invoice_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own invoice items" ON invoice_items FOR ALL 
USING (invoice_id IN (SELECT id FROM invoices WHERE user_id = auth.uid()));
-- Add override columns to scheduled_steps table
-- This allows editing individual scheduled steps without modifying the original sequence

ALTER TABLE scheduled_steps
ADD COLUMN IF NOT EXISTS override_email_subject TEXT,
ADD COLUMN IF NOT EXISTS override_email_body TEXT,
ADD COLUMN IF NOT EXISTS override_channel TEXT CHECK (override_channel IN ('email', 'sms')),
ADD COLUMN IF NOT EXISTS notes TEXT,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Add a trigger to auto-update updated_at
CREATE OR REPLACE FUNCTION update_scheduled_steps_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS scheduled_steps_updated_at ON scheduled_steps;
CREATE TRIGGER scheduled_steps_updated_at
    BEFORE UPDATE ON scheduled_steps
    FOR EACH ROW
    EXECUTE FUNCTION update_scheduled_steps_updated_at();
-- Migration: Add language support
-- Add language preference to debtors (default: Polish)
ALTER TABLE debtors ADD COLUMN IF NOT EXISTS preferred_language TEXT DEFAULT 'pl' CHECK (preferred_language IN ('pl', 'en'));

-- Add English content fields to sequence_steps
ALTER TABLE sequence_steps ADD COLUMN IF NOT EXISTS email_subject_en TEXT;
ALTER TABLE sequence_steps ADD COLUMN IF NOT EXISTS email_body_en TEXT;
ALTER TABLE sequence_steps ADD COLUMN IF NOT EXISTS sms_body_en TEXT;

-- Update existing debtors to have Polish as default
UPDATE debtors SET preferred_language = 'pl' WHERE preferred_language IS NULL;
-- Update existing sequences with English translations

-- ==========================================
-- 1. Standardowa (STANDARD_SEQUENCE)
-- ==========================================

-- Step 1 (email)
UPDATE sequence_steps ss
SET 
  email_subject_en = 'Payment reminder - Due in one week',
  email_body_en = 'Dear Customer,

This is a friendly reminder that payment for invoice {{invoice_number}} in the amount of {{amount}} is due on {{due_date}}.

If you have already made the payment, please disregard this message.

Best regards,
{{company_name}}'
FROM sequences s
WHERE s.id = ss.sequence_id AND s.name = 'Standardowa' AND ss.step_order = 1;

-- Step 2 (email)
UPDATE sequence_steps ss
SET 
  email_subject_en = 'Payment due tomorrow - {{invoice_number}}',
  email_body_en = 'Dear Customer,

This is a reminder that invoice {{invoice_number}} for {{amount}} is due tomorrow ({{due_date}}).

To avoid interest charges, please make your payment on time.

{{payment_link}}

Best regards,
{{company_name}}'
FROM sequences s
WHERE s.id = ss.sequence_id AND s.name = 'Standardowa' AND ss.step_order = 2;

-- Step 3 (email)
UPDATE sequence_steps ss
SET 
  email_subject_en = 'Payment overdue - {{invoice_number}}',
  email_body_en = 'Dear Customer,

Please be advised that invoice {{invoice_number}} for {{amount}} was due yesterday.

We kindly ask you to settle this payment promptly.

{{payment_link}}

Best regards,
{{company_name}}'
FROM sequences s
WHERE s.id = ss.sequence_id AND s.name = 'Standardowa' AND ss.step_order = 3;

-- Step 4 (both)
UPDATE sequence_steps ss
SET 
  email_subject_en = 'Payment Request - Invoice Overdue',
  email_body_en = 'Dear Customer,

Invoice {{invoice_number}} is now {{days_overdue}} days overdue.

Amount due: {{amount}}

Please settle this payment immediately. If you are experiencing payment difficulties, please contact us to arrange a payment plan.

{{payment_link}}

Best regards,
{{company_name}}',
  sms_body_en = 'Invoice {{invoice_number}} is {{days_overdue}} days overdue. Amount: {{amount}}. Please pay urgently. {{company_name}}'
FROM sequences s
WHERE s.id = ss.sequence_id AND s.name = 'Standardowa' AND ss.step_order = 4;

-- Step 5 (email)
UPDATE sequence_steps ss
SET 
  email_subject_en = 'PAYMENT DEMAND with interest - {{invoice_number}}',
  email_body_en = 'Dear Customer,

Despite previous requests, invoice {{invoice_number}} remains unpaid.

Principal amount: {{amount}}
Accrued interest: {{interest_amount}}
TOTAL DUE: {{amount_with_interest}}

Please settle the full amount within 7 days.

{{payment_link}}

Best regards,
{{company_name}}'
FROM sequences s
WHERE s.id = ss.sequence_id AND s.name = 'Standardowa' AND ss.step_order = 5;

-- Step 6 (email)
UPDATE sequence_steps ss
SET 
  email_subject_en = 'FINAL PAYMENT DEMAND - {{invoice_number}}',
  email_body_en = 'Dear Customer,

We hereby demand IMMEDIATE payment of the outstanding amount for invoice {{invoice_number}}.

Principal amount: {{amount}}
Accrued interest: {{interest_amount}}
TOTAL DUE: {{amount_with_interest}}

Failure to pay within 7 days of receiving this notice will result in the matter being referred for further collection action, which will incur additional costs.

{{payment_link}}

{{company_name}}'
FROM sequences s
WHERE s.id = ss.sequence_id AND s.name = 'Standardowa' AND ss.step_order = 6;


-- ==========================================
-- 2. Łagodna (GENTLE_SEQUENCE)
-- ==========================================

-- Step 1 (email)
UPDATE sequence_steps ss
SET 
  email_subject_en = 'Reminder - Payment due soon',
  email_body_en = 'Dear Customer,

This is a friendly reminder that payment for invoice {{invoice_number}} in the amount of {{amount}} is due in 3 days.

If you have already made the payment, please disregard this message.

Best regards,
{{company_name}}'
FROM sequences s
WHERE s.id = ss.sequence_id AND s.name = 'Łagodna' AND ss.step_order = 1;

-- Step 2 (email)
UPDATE sequence_steps ss
SET 
  email_subject_en = 'Payment overdue notification',
  email_body_en = 'Dear Customer,

Please be advised that invoice {{invoice_number}} for {{amount}} is now {{days_overdue}} days past due.

We kindly ask you to settle this payment at your earliest convenience.

{{payment_link}}

Best regards,
{{company_name}}'
FROM sequences s
WHERE s.id = ss.sequence_id AND s.name = 'Łagodna' AND ss.step_order = 2;

-- Step 3 (email)
UPDATE sequence_steps ss
SET 
  email_subject_en = 'Payment Request - {{invoice_number}}',
  email_body_en = 'Dear Customer,

Invoice {{invoice_number}} remains unpaid for {{days_overdue}} days.

Principal amount: {{amount}}
Accrued interest: {{interest_amount}}
TOTAL: {{amount_with_interest}}

Please settle this amount urgently.

{{payment_link}}

Best regards,
{{company_name}}'
FROM sequences s
WHERE s.id = ss.sequence_id AND s.name = 'Łagodna' AND ss.step_order = 3;

-- Step 4 (email)
UPDATE sequence_steps ss
SET 
  email_subject_en = 'Final Payment Notice - {{invoice_number}}',
  email_body_en = 'Dear Customer,

Despite previous reminders, invoice {{invoice_number}} remains unpaid.

Principal amount: {{amount}}
Accrued interest: {{interest_amount}}
TOTAL DUE: {{amount_with_interest}}

This is a final notice before further collection action is taken.

{{payment_link}}

{{company_name}}'
FROM sequences s
WHERE s.id = ss.sequence_id AND s.name = 'Łagodna' AND ss.step_order = 4;


-- ==========================================
-- 3. Szybka Eskalacja (QUICK_ESCALATION_SEQUENCE)
-- ==========================================

-- Step 1 (email)
UPDATE sequence_steps ss
SET 
  email_subject_en = 'Payment reminder - Due date approaching',
  email_body_en = 'Dear Customer,

This is a reminder that invoice {{invoice_number}} for {{amount}} is due on {{due_date}}.

Best regards,
{{company_name}}'
FROM sequences s
WHERE s.id = ss.sequence_id AND s.name = 'Szybka Eskalacja' AND ss.step_order = 1;

-- Step 2 (both)
UPDATE sequence_steps ss
SET 
  email_subject_en = 'URGENT: Payment due tomorrow - {{invoice_number}}',
  email_body_en = 'Dear Customer,

URGENT: Invoice {{invoice_number}} for {{amount}} is due tomorrow.

{{payment_link}}

{{company_name}}',
  sms_body_en = 'URGENT: Invoice {{invoice_number}} for {{amount}} is due tomorrow {{due_date}}. {{company_name}}'
FROM sequences s
WHERE s.id = ss.sequence_id AND s.name = 'Szybka Eskalacja' AND ss.step_order = 2;

-- Step 3 (email)
UPDATE sequence_steps ss
SET 
  email_subject_en = 'Payment overdue - {{invoice_number}}',
  email_body_en = 'Dear Customer,

Invoice {{invoice_number}} is now overdue. Please make an immediate payment of {{amount}}.

{{payment_link}}

{{company_name}}'
FROM sequences s
WHERE s.id = ss.sequence_id AND s.name = 'Szybka Eskalacja' AND ss.step_order = 3;

-- Step 4 (both)
UPDATE sequence_steps ss
SET 
  email_subject_en = 'SECOND NOTICE - Invoice {{invoice_number}}',
  email_body_en = 'Dear Customer,

This is our second notice regarding invoice {{invoice_number}}, which is now {{days_overdue}} days overdue.

Amount: {{amount}}

Please contact us or make payment immediately.

{{payment_link}}

{{company_name}}',
  sms_body_en = 'SECOND NOTICE: Invoice {{invoice_number}} is {{days_overdue}} days overdue. {{amount}}. Please contact us. {{company_name}}'
FROM sequences s
WHERE s.id = ss.sequence_id AND s.name = 'Szybka Eskalacja' AND ss.step_order = 4;

-- Step 5 (email)
UPDATE sequence_steps ss
SET 
  email_subject_en = 'THIRD NOTICE with interest - {{invoice_number}}',
  email_body_en = 'Dear Customer,

This is our third notice regarding invoice {{invoice_number}}.

Principal amount: {{amount}}
Interest: {{interest_amount}}
TOTAL: {{amount_with_interest}}

{{payment_link}}

{{company_name}}'
FROM sequences s
WHERE s.id = ss.sequence_id AND s.name = 'Szybka Eskalacja' AND ss.step_order = 5;

-- Step 6 (both)
UPDATE sequence_steps ss
SET 
  email_subject_en = 'PENULTIMATE NOTICE - {{invoice_number}}',
  email_body_en = 'Dear Customer,

This is our penultimate notice before the matter is referred for collection.

Invoice: {{invoice_number}}
Amount with interest: {{amount_with_interest}}

{{payment_link}}

{{company_name}}',
  sms_body_en = 'PENULTIMATE NOTICE: Invoice {{invoice_number}} - {{amount_with_interest}}. Next step: collection. {{company_name}}'
FROM sequences s
WHERE s.id = ss.sequence_id AND s.name = 'Szybka Eskalacja' AND ss.step_order = 6;

-- Step 7 (email)
UPDATE sequence_steps ss
SET 
  email_subject_en = 'FINAL DEMAND - {{invoice_number}}',
  email_body_en = 'Dear Customer,

FINAL PAYMENT DEMAND

Invoice: {{invoice_number}}
Principal amount: {{amount}}
Interest: {{interest_amount}}
TOTAL DUE: {{amount_with_interest}}

Failure to pay within 3 business days will result in collection proceedings.

{{payment_link}}

{{company_name}}'
FROM sequences s
WHERE s.id = ss.sequence_id AND s.name = 'Szybka Eskalacja' AND ss.step_order = 7;

-- Step 8 (both)
UPDATE sequence_steps ss
SET 
  email_subject_en = 'FINAL WARNING - Referral to collection agency',
  email_body_en = 'Dear Customer,

Please be advised that the matter regarding invoice {{invoice_number}} for {{amount_with_interest}} will be referred to an external collection agency within the coming days.

This will result in additional costs that will be charged to you.

This is your last opportunity to resolve this matter amicably.

{{payment_link}}

{{company_name}}',
  sms_body_en = 'FINAL WARNING: Invoice {{invoice_number}} being referred to collection. Please contact us urgently. {{company_name}}'
FROM sequences s
WHERE s.id = ss.sequence_id AND s.name = 'Szybka Eskalacja' AND ss.step_order = 8;

-- (Modules column already defined in CREATE TABLE above)

-- Create cost_invoices table
CREATE TABLE IF NOT EXISTS public.cost_invoices (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    contractor_name TEXT NOT NULL,
    contractor_nip TEXT,
    invoice_number TEXT NOT NULL,
    
    issue_date DATE NOT NULL DEFAULT CURRENT_DATE,
    due_date DATE NOT NULL,
    
    amount DECIMAL(10, 2) NOT NULL,
    currency TEXT NOT NULL DEFAULT 'PLN',
    
    account_number TEXT,
    payment_status TEXT NOT NULL DEFAULT 'to_pay' CHECK (payment_status IN ('to_pay', 'paid')),
    paid_at TIMESTAMP WITH TIME ZONE,
    
    category TEXT NOT NULL DEFAULT 'other',
    description TEXT,
    
    file_url TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.cost_invoices ENABLE ROW LEVEL SECURITY;

-- Create policies for cost_invoices
CREATE POLICY "Users can view their own cost invoices" 
    ON public.cost_invoices FOR SELECT 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own cost invoices" 
    ON public.cost_invoices FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own cost invoices" 
    ON public.cost_invoices FOR UPDATE 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own cost invoices" 
    ON public.cost_invoices FOR DELETE 
    USING (auth.uid() = user_id);

-- Create updated_at trigger for cost_invoices if function exists (from initial schema)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'handle_updated_at') THEN
        CREATE TRIGGER handle_updated_at
        BEFORE UPDATE ON public.cost_invoices
        FOR EACH ROW
        EXECUTE FUNCTION handle_updated_at();
    END IF;
END
$$;
-- Add current_balance to profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS current_balance NUMERIC DEFAULT 0;

-- Comment on column
COMMENT ON COLUMN profiles.current_balance IS 'Manually input current bank balance for cash flow calculation';
-- Create vendors table
CREATE TABLE IF NOT EXISTS public.vendors (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    name TEXT NOT NULL,
    nip TEXT,
    
    -- Contact info
    email TEXT,
    phone TEXT,
    website TEXT,
    
    -- Address
    address TEXT,
    city TEXT,
    postal_code TEXT,
    
    -- Banking info (Crucial for costs)
    bank_account_number TEXT,
    bank_name TEXT,
    
    -- Metadata
    notes TEXT,
    category TEXT DEFAULT 'other',
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.vendors ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own vendors" 
    ON public.vendors FOR SELECT 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own vendors" 
    ON public.vendors FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own vendors" 
    ON public.vendors FOR UPDATE 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own vendors" 
    ON public.vendors FOR DELETE 
    USING (auth.uid() = user_id);

-- Create updated_at trigger
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'handle_updated_at') THEN
        CREATE TRIGGER handle_updated_at
        BEFORE UPDATE ON public.vendors
        FOR EACH ROW
        EXECUTE FUNCTION handle_updated_at();
    END IF;
END
$$;
-- supabase/migrations/017_add_cost_invoice_details.sql
ALTER TABLE public.cost_invoices
ADD COLUMN vendor_id UUID REFERENCES public.vendors(id) ON DELETE SET NULL,
ADD COLUMN amount_net NUMERIC,
ADD COLUMN vat_rate TEXT,
ADD COLUMN vat_amount NUMERIC,
ADD COLUMN amount_gross NUMERIC,
ADD COLUMN bank_name TEXT;

-- Update existing rows (if safe)
UPDATE public.cost_invoices
SET amount_gross = amount;

-- For future, if needed, you might drop the 'amount' column or keep it as legacy gross
-- For now, we will maintain compatibility by setting 'amount' = 'amount_gross' in triggers or application logic.
-- Create subscriptions table
CREATE TABLE IF NOT EXISTS subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE UNIQUE,
    stripe_customer_id TEXT,
    stripe_subscription_id TEXT,
    status TEXT CHECK (status IN ('trialing', 'active', 'past_due', 'canceled', 'incomplete', 'active_non_renewing')),
    plan_interval TEXT CHECK (plan_interval IN ('month', 'year')),
    tier TEXT CHECK (tier IN ('starter', 'growth', 'unlimited')) DEFAULT 'unlimited',
    monthly_invoice_limit INTEGER DEFAULT 200, -- Default for unlimited during trial or growth
    current_period_end TIMESTAMPTZ,
    trial_ends_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

-- Setup RLS Policies
CREATE POLICY "Users can view own subscription"
    ON subscriptions FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage subscriptions"
    ON subscriptions FOR ALL
    USING (true)
    WITH CHECK (true);

-- Function to handle updated_at
-- Function to handle updated_at
CREATE TRIGGER handle_updated_at BEFORE UPDATE ON subscriptions
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- Trigger to create subscription on profile creation (User Signup)
-- Requires that profiles are created first.
-- Alternatively, we can handle this in the backend code (auth callback) for more control.
-- But a trigger is safer to ensure every user has a row.

CREATE OR REPLACE FUNCTION public.handle_new_user_subscription()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.subscriptions (
        user_id,
        status,
        tier,
        monthly_invoice_limit,
        trial_ends_at
    )
    VALUES (
        NEW.id,
        'trialing',
        'unlimited', -- Give them best tier for trial
        999999,     -- Effectively unlimited
        NOW() + INTERVAL '14 days'
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger after profile insert
CREATE TRIGGER on_profile_created_create_subscription
    AFTER INSERT ON public.profiles
    FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user_subscription();

-- Backfill for existing users who don't have a subscription row
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN SELECT id FROM profiles
    LOOP
        INSERT INTO subscriptions (user_id, status, tier, monthly_invoice_limit, trial_ends_at)
        VALUES (
            r.id,
            'trialing',
            'unlimited',
            999999,
            NOW() + INTERVAL '14 days' -- Give existing users 14 days from migration
        )
        ON CONFLICT (user_id) DO NOTHING;
    END LOOP;
END;
$$;
-- ============================================
-- VindycAItion - SMS & Voice Support
-- ============================================
-- Adds support for multi-channel communication (Email, SMS, Voice)

-- 1. Update sequence_steps channel constraint to support voice
-- First, migrate any legacy 'both' channels to 'email' to avoid constraint violation
UPDATE sequence_steps SET channel = 'email' WHERE channel = 'both';

ALTER TABLE sequence_steps DROP CONSTRAINT IF EXISTS sequence_steps_channel_check;
ALTER TABLE sequence_steps ADD CONSTRAINT sequence_steps_channel_check 
  CHECK (channel IN ('email', 'sms', 'voice'));

-- 2. Add voice script fields to sequence_steps
ALTER TABLE sequence_steps ADD COLUMN IF NOT EXISTS voice_script TEXT;
ALTER TABLE sequence_steps ADD COLUMN IF NOT EXISTS voice_script_en TEXT;

-- 3. Add SMS/Voice toggles and usage tracking to subscriptions
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS sms_limit INT DEFAULT 0;
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS calls_limit INT DEFAULT 0;
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS sms_used INT DEFAULT 0;
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS calls_used INT DEFAULT 0;
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS usage_reset_at TIMESTAMPTZ DEFAULT NOW();

-- 4. Add communication preferences to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS sms_enabled BOOLEAN DEFAULT FALSE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS voice_enabled BOOLEAN DEFAULT FALSE;

-- 5. Add call duration tracking to collection_actions
ALTER TABLE collection_actions ADD COLUMN IF NOT EXISTS call_duration_seconds INT;

-- 6. Add retry tracking to scheduled_steps
ALTER TABLE scheduled_steps ADD COLUMN IF NOT EXISTS retry_count INT DEFAULT 0;

-- 7. Add consent tracking to debtors
ALTER TABLE debtors ADD COLUMN IF NOT EXISTS sms_voice_consent_at TIMESTAMPTZ;

-- 8. Set default limits based on subscription tier
-- This will be enforced in application logic, but we set sensible defaults
UPDATE subscriptions SET 
  sms_limit = CASE 
    WHEN tier = 'starter' THEN 50
    WHEN tier = 'growth' THEN 200
    WHEN tier = 'unlimited' THEN 999999
    ELSE 0 
  END,
  calls_limit = CASE 
    WHEN tier = 'starter' THEN 10
    WHEN tier = 'growth' THEN 50
    WHEN tier = 'unlimited' THEN 999999
    ELSE 0 
  END
WHERE sms_limit IS NULL OR sms_limit = 0;

-- 9. Function to increment SMS usage
CREATE OR REPLACE FUNCTION increment_sms_usage(p_user_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE subscriptions 
  SET sms_used = COALESCE(sms_used, 0) + 1
  WHERE user_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 10. Function to increment calls usage
CREATE OR REPLACE FUNCTION increment_calls_usage(p_user_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE subscriptions 
  SET calls_used = COALESCE(calls_used, 0) + 1
  WHERE user_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 11. Function to reset monthly usage (call via cron)
CREATE OR REPLACE FUNCTION reset_monthly_usage()
RETURNS VOID AS $$
BEGIN
  UPDATE subscriptions 
  SET 
    sms_used = 0,
    calls_used = 0,
    usage_reset_at = NOW()
  WHERE usage_reset_at < DATE_TRUNC('month', NOW());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
-- Migration: Fix Security Issue with Mutable Search Path
-- Function: update_ksef_settings_updated_at
-- Security fix: Set explicit search_path

CREATE OR REPLACE FUNCTION update_ksef_settings_updated_at()
RETURNS TRIGGER 
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;
-- Migration: Fix Security Issue with Mutable Search Path
-- Function: handle_new_user_subscription
-- Security fix: Set explicit search_path

CREATE OR REPLACE FUNCTION public.handle_new_user_subscription()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO public.subscriptions (
        user_id,
        status,
        tier,
        monthly_invoice_limit,
        trial_ends_at
    )
    VALUES (
        NEW.id,
        'trialing',
        'unlimited', -- Give them best tier for trial
        999999,     -- Effectively unlimited
        NOW() + INTERVAL '14 days'
    );
    RETURN NEW;
END;
$$;
-- Migration: Fix Remaining Security Issues via ALTER FUNCTION
-- This approach preserves the function body while setting the secure search_path.

-- 1. handle_new_user (Trigger function, usually takes no arguments)
ALTER FUNCTION public.handle_new_user() SET search_path = public;

-- 2. increment_calls_usage (Takes UUID)
ALTER FUNCTION public.increment_calls_usage(UUID) SET search_path = public;

-- 3. increment_sms_usage (Takes UUID)
ALTER FUNCTION public.increment_sms_usage(UUID) SET search_path = public;

-- 4. reset_monthly_usage (No arguments)
ALTER FUNCTION public.reset_monthly_usage() SET search_path = public;
-- Migration: Fix Updated_At Security Issues
-- Functions: update_scheduled_steps_updated_at, update_updated_at_column

-- 1. update_scheduled_steps_updated_at (Trigger function)
ALTER FUNCTION public.update_scheduled_steps_updated_at() SET search_path = public;

-- 2. update_updated_at_column (Generic Trigger function used by many tables)
ALTER FUNCTION public.update_updated_at_column() SET search_path = public;
-- Migration: Fix RLS for Notifications
-- Issue: "Service role can insert notifications" policy was too permissive (WITH CHECK (true))
-- Fix: Restrict policy to service_role only or system usage

-- 1. Drop the insecure policy
DROP POLICY IF EXISTS "Service role can insert notifications" ON notifications;

-- 2. Recreate it with restriction (allow only service_role to insert)
-- Note: Supabase/PostgREST auth.uid() is null for service_role, but we can check role directly
-- Or simpler: "Service role" bypasses RLS automatically if configured so in Supabase,
-- BUT if we want an explicit INSERT policy for it, it suggests RLS is enabled.
-- Standard Service Role bypasses RLS, so this policy might have been redundant for service role
-- but accidentally open for 'anon' or 'authenticated' if they have INSERT grant on table.

-- To be safe, we allow INSERT only if user has service_role or is a system function (which bypasses RLS anyway).
-- If this policy was intended to allow backend inserts via API, we should restrict it.

CREATE POLICY "System can insert notifications"
ON notifications
FOR INSERT
TO service_role
WITH CHECK (true);

-- The 'TO service_role' clause ensures only the service role applies this policy.
-- Other roles (anon, authenticated) effectively have NO INSERT policy now, so they denied by default (Standard RLS).
-- Migration: Allow Users to Insert Own Notifications
-- Fixes regression where limiting INSERT to service_role broke application logic.

-- 1. Drop the policy if it exists (Idempotency fix)
DROP POLICY IF EXISTS "Users can insert own notifications" ON notifications;

-- 2. Create the policy
CREATE POLICY "Users can insert own notifications"
    ON notifications
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);
-- Migration: Fix RLS for Subscriptions
-- Issue: "Service role can manage subscriptions" was permitting ALL access to everyone.
-- Fix: Restrict management (INSERT, UPDATE, DELETE) to service_role only.

-- 1. Drop the insecure policy
DROP POLICY IF EXISTS "Service role can manage subscriptions" ON subscriptions;

-- 2. Recreate it with restriction (allow only service_role)
CREATE POLICY "Service role can manage subscriptions"
    ON subscriptions
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- Note: Authenticated users can still VIEW their subscription via the existing "Users can view own subscription" policy.
-- They cannot modify it directly (must go through server actions/Stripe webhooks).
