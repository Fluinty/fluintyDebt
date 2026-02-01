-- ============================================
-- VINDYCAITION - PRODUKCJA FINAL
-- ============================================
-- INSTRUKCJA: Skopiuj CAŁY ten plik i wklej w Supabase SQL Editor (Production)
-- Uruchom. Potem zarejestruj nowe konto.

-- KROK 1: Wyczyść użytkowników
DELETE FROM auth.users;

-- KROK 2: Zresetuj schema public
DROP SCHEMA IF EXISTS public CASCADE;
CREATE SCHEMA public;
GRANT ALL ON SCHEMA public TO postgres;
GRANT ALL ON SCHEMA public TO public;

-- ============================================
-- PROFILES (z WSZYSTKIMI kolumnami)
-- ============================================
CREATE TABLE profiles (
  id uuid NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  full_name text,
  company_name text,  -- NULLABLE dla wizard flow
  company_nip text,
  company_address text,
  company_city text,
  company_postal_code text,
  company_phone text,
  company_email text,
  bank_account_number text,
  bank_name text,
  default_sequence_id uuid,
  send_thank_you_on_payment boolean DEFAULT true,
  interest_rate numeric DEFAULT 0.155,
  onboarding_completed boolean DEFAULT false,
  ksef_setup_skipped boolean DEFAULT false,
  modules jsonb DEFAULT '{"costs": true, "sales": true}'::jsonb,
  current_balance numeric DEFAULT 0,
  sms_enabled boolean DEFAULT false,
  voice_enabled boolean DEFAULT false,
  thank_you_email_subject text,
  thank_you_email_body text,
  country text DEFAULT 'PL',
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- ============================================
-- SEQUENCES
-- ============================================
CREATE TABLE sequences (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  is_default boolean DEFAULT false,
  is_system boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

CREATE TABLE sequence_steps (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sequence_id uuid NOT NULL REFERENCES sequences(id) ON DELETE CASCADE,
  step_order integer NOT NULL,
  days_offset integer NOT NULL,
  channel text NOT NULL CHECK (channel IN ('email', 'sms', 'voice', 'both')),
  email_subject text,
  email_body text NOT NULL,
  sms_body text,
  include_payment_link boolean DEFAULT true,
  include_interest boolean DEFAULT false,
  is_ai_generated boolean DEFAULT false,
  email_subject_en text,
  email_body_en text,
  sms_body_en text,
  voice_script text,
  voice_script_en text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  UNIQUE(sequence_id, step_order)
);

-- ============================================
-- DEBTORS
-- ============================================
CREATE TABLE debtors (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name text NOT NULL,
  nip text,
  email text,
  phone text,
  address text,
  city text,
  postal_code text,
  contact_person text,
  default_sequence_id uuid REFERENCES sequences(id) ON DELETE SET NULL,
  sequence_id uuid REFERENCES sequences(id) ON DELETE SET NULL,
  payment_score integer DEFAULT 100,
  total_invoices integer DEFAULT 0,
  paid_on_time integer DEFAULT 0,
  paid_late integer DEFAULT 0,
  unpaid integer DEFAULT 0,
  total_debt numeric DEFAULT 0,
  overdue_debt numeric DEFAULT 0,
  notes text,
  auto_send_enabled boolean DEFAULT true,
  preferred_send_time time without time zone DEFAULT '10:00:00',
  preferred_channel text DEFAULT 'email',
  preferred_language text DEFAULT 'pl',
  sms_voice_consent_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- ============================================
-- INVOICES
-- ============================================
CREATE TABLE invoices (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  debtor_id uuid NOT NULL REFERENCES debtors(id) ON DELETE CASCADE,
  invoice_number text NOT NULL,
  issue_date date NOT NULL,
  due_date date NOT NULL,
  amount numeric NOT NULL,
  amount_net numeric,
  vat_rate varchar(10) DEFAULT '23',
  vat_amount numeric DEFAULT 0,
  amount_gross numeric,
  currency text DEFAULT 'PLN',
  description text,
  amount_paid numeric DEFAULT 0,
  paid_at timestamp with time zone,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'partial', 'paid', 'overdue', 'paused', 'written_off')),
  sequence_id uuid REFERENCES sequences(id) ON DELETE SET NULL,
  sequence_status text DEFAULT 'active' CHECK (sequence_status IN ('active', 'paused', 'completed', 'stopped')),
  current_step_index integer DEFAULT 0,
  sequence_paused_at timestamp with time zone,
  sequence_paused_until timestamp with time zone,
  days_overdue integer DEFAULT 0,
  interest_amount numeric DEFAULT 0,
  payment_link text,
  payment_link_expires_at timestamp with time zone,
  auto_send_enabled boolean DEFAULT true,
  send_time time without time zone DEFAULT '10:00:00',
  ksef_number varchar(100),
  ksef_status varchar(50),
  imported_from_ksef boolean DEFAULT false,
  ksef_import_date timestamp with time zone,
  ksef_raw_data jsonb,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

CREATE TABLE invoice_items (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  invoice_id uuid NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  description text NOT NULL,
  quantity numeric NOT NULL DEFAULT 1,
  unit_price_net numeric NOT NULL,
  unit_price_gross numeric NOT NULL,
  vat_rate integer,
  total_net numeric NOT NULL,
  total_gross numeric NOT NULL,
  unit text,
  created_at timestamp with time zone DEFAULT now()
);

-- ============================================
-- INSTALLMENTS
-- ============================================
CREATE TABLE installment_plans (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  invoice_id uuid NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  total_installments integer NOT NULL,
  notes text,
  created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE installments (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  plan_id uuid NOT NULL REFERENCES installment_plans(id) ON DELETE CASCADE,
  installment_number integer NOT NULL,
  amount numeric NOT NULL,
  due_date date NOT NULL,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'overdue')),
  paid_at timestamp with time zone,
  sequence_id uuid REFERENCES sequences(id) ON DELETE SET NULL,
  sequence_status text DEFAULT 'active',
  current_step_index integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  UNIQUE(plan_id, installment_number)
);

-- ============================================
-- COLLECTION ACTIONS & SCHEDULED STEPS
-- ============================================
CREATE TABLE collection_actions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  invoice_id uuid REFERENCES invoices(id) ON DELETE CASCADE,
  installment_id uuid REFERENCES installments(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  action_type text NOT NULL,
  sequence_step_id uuid REFERENCES sequence_steps(id),
  channel text,
  email_subject text,
  content text,
  recipient_email text,
  recipient_phone text,
  status text DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'sent', 'delivered', 'failed', 'skipped')),
  sent_at timestamp with time zone,
  error_message text,
  metadata jsonb,
  call_duration_seconds integer,
  created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE scheduled_steps (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  invoice_id uuid REFERENCES invoices(id) ON DELETE CASCADE,
  installment_id uuid REFERENCES installments(id) ON DELETE CASCADE,
  sequence_step_id uuid NOT NULL REFERENCES sequence_steps(id) ON DELETE CASCADE,
  scheduled_for date NOT NULL,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'executed', 'skipped', 'cancelled')),
  executed_at timestamp with time zone,
  override_email_subject text,
  override_email_body text,
  override_channel text,
  notes text,
  retry_count integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- ============================================
-- COST INVOICES (Wydatki)
-- ============================================
CREATE TABLE vendors (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name text NOT NULL,
  nip text,
  email text,
  phone text,
  website text,
  address text,
  city text,
  postal_code text,
  bank_account_number text,
  bank_name text,
  notes text,
  category text DEFAULT 'other',
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

CREATE TABLE cost_invoices (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  vendor_id uuid REFERENCES vendors(id) ON DELETE SET NULL,
  contractor_name text NOT NULL,
  contractor_nip text,
  invoice_number text NOT NULL,
  issue_date date NOT NULL DEFAULT CURRENT_DATE,
  due_date date NOT NULL,
  amount numeric NOT NULL,
  amount_net numeric,
  vat_rate text,
  vat_amount numeric,
  amount_gross numeric,
  currency text NOT NULL DEFAULT 'PLN',
  account_number text,
  bank_name text,
  payment_status text NOT NULL DEFAULT 'to_pay' CHECK (payment_status IN ('to_pay', 'paid')),
  paid_at timestamp with time zone,
  category text NOT NULL DEFAULT 'other',
  description text,
  file_url text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- ============================================
-- KSEF & NOTIFICATIONS
-- ============================================
CREATE TABLE user_ksef_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  ksef_environment varchar(20) DEFAULT 'test',
  is_enabled boolean DEFAULT false,
  ksef_token_encrypted text,
  ksef_nip varchar(10),
  sync_frequency varchar(20) DEFAULT 'daily',
  auto_confirm_invoices boolean DEFAULT false,
  last_sync_at timestamp with time zone,
  last_sync_status varchar(50),
  last_sync_error text,
  invoices_synced_count integer DEFAULT 0,
  sync_time text DEFAULT '21:00',
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  UNIQUE(user_id)
);

CREATE TABLE ksef_audit_log (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  action varchar(50) NOT NULL,
  ip_address varchar(45),
  user_agent text,
  metadata jsonb,
  created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE notifications (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type text NOT NULL DEFAULT 'info',
  title text NOT NULL,
  message text NOT NULL,
  link text,
  read boolean DEFAULT false,
  reference_id text,
  metadata jsonb,
  created_at timestamp with time zone DEFAULT now()
);

-- ============================================
-- SUBSCRIPTIONS
-- ============================================
CREATE TABLE subscriptions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  stripe_customer_id text,
  stripe_subscription_id text,
  status text,
  plan_interval text,
  tier text DEFAULT 'unlimited',
  monthly_invoice_limit integer DEFAULT 200,
  current_period_end timestamp with time zone,
  trial_ends_at timestamp with time zone,
  sms_limit integer DEFAULT 0,
  calls_limit integer DEFAULT 0,
  sms_used integer DEFAULT 0,
  calls_used integer DEFAULT 0,
  usage_reset_at timestamp with time zone DEFAULT now(),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  UNIQUE(user_id)
);

-- ============================================
-- INDEXES
-- ============================================
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
CREATE INDEX idx_cost_invoices_user_id ON cost_invoices(user_id);
CREATE INDEX idx_cost_invoices_due_date ON cost_invoices(due_date);
CREATE INDEX idx_notifications_user_id ON notifications(user_id);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE sequences ENABLE ROW LEVEL SECURITY;
ALTER TABLE sequence_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE debtors ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE installment_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE installments ENABLE ROW LEVEL SECURITY;
ALTER TABLE collection_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE scheduled_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE cost_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_ksef_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE ksef_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

-- ============================================
-- RLS POLICIES
-- ============================================
CREATE POLICY "Users can view own profile" ON profiles FOR ALL USING (auth.uid() = id);
CREATE POLICY "Users can manage own sequences" ON sequences FOR ALL USING (auth.uid() = user_id OR is_system = true);
CREATE POLICY "Users can manage own sequence_steps" ON sequence_steps FOR ALL
  USING (sequence_id IN (SELECT id FROM sequences WHERE user_id = auth.uid() OR is_system = true));
CREATE POLICY "Users can manage own debtors" ON debtors FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own invoices" ON invoices FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own invoice_items" ON invoice_items FOR ALL
  USING (invoice_id IN (SELECT id FROM invoices WHERE user_id = auth.uid()));
CREATE POLICY "Users can manage own installment_plans" ON installment_plans FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own installments" ON installments FOR ALL
  USING (plan_id IN (SELECT id FROM installment_plans WHERE user_id = auth.uid()));
CREATE POLICY "Users can manage own actions" ON collection_actions FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own scheduled_steps" ON scheduled_steps FOR ALL
  USING (invoice_id IN (SELECT id FROM invoices WHERE user_id = auth.uid()));
CREATE POLICY "Users can manage own vendors" ON vendors FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own cost_invoices" ON cost_invoices FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own ksef_settings" ON user_ksef_settings FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can view own ksef_audit" ON ksef_audit_log FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own notifications" ON notifications FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own subscription" ON subscriptions FOR ALL USING (auth.uid() = user_id);

-- ============================================
-- TRIGGERS - updated_at
-- ============================================
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
CREATE TRIGGER update_cost_invoices_updated_at BEFORE UPDATE ON cost_invoices FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_vendors_updated_at BEFORE UPDATE ON vendors FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_scheduled_steps_updated_at BEFORE UPDATE ON scheduled_steps FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_subscriptions_updated_at BEFORE UPDATE ON subscriptions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- CRITICAL: Auto-create profile on registration
-- ============================================
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS TRIGGER 
LANGUAGE plpgsql 
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
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

-- ============================================
-- DEFAULT SEQUENCES (System)
-- ============================================
INSERT INTO sequences (id, user_id, name, description, is_default, is_system) VALUES
  ('00000000-0000-0000-0000-000000000001', NULL, 'Standardowa', '6 kroków, zalecana dla większości', true, true),
  ('00000000-0000-0000-0000-000000000002', NULL, 'Łagodna', '4 kroki, idealna dla VIP klientów', false, true),
  ('00000000-0000-0000-0000-000000000003', NULL, 'Szybka Eskalacja', '8 kroków, dla trudnych klientów', false, true);

-- Standardowa Steps
INSERT INTO sequence_steps (sequence_id, step_order, days_offset, channel, email_subject, email_body) VALUES
  ('00000000-0000-0000-0000-000000000001', 1, -7, 'email', 'Przypomnienie o płatności - {{invoice_number}}', 'Dzień dobry,

Uprzejmie przypominamy, że za 7 dni upływa termin płatności faktury {{invoice_number}} na kwotę {{amount}}.

Prosimy o terminowe uregulowanie należności.

{{payment_link}}

Z poważaniem,
{{company_name}}'),
  ('00000000-0000-0000-0000-000000000001', 2, -1, 'email', 'Termin płatności jutro - {{invoice_number}}', 'Dzień dobry,

Przypominamy, że jutro ({{due_date}}) upływa termin płatności faktury {{invoice_number}} na kwotę {{amount}}.

{{payment_link}}

Z poważaniem,
{{company_name}}'),
  ('00000000-0000-0000-0000-000000000001', 3, 1, 'email', 'Faktura po terminie - {{invoice_number}}', 'Dzień dobry,

Informujemy, że termin płatności faktury {{invoice_number}} minął.

Prosimy o pilne uregulowanie należności w kwocie {{amount_with_interest}}.

{{payment_link}}

Z poważaniem,
{{company_name}}'),
  ('00000000-0000-0000-0000-000000000001', 4, 7, 'email', 'Wezwanie do zapłaty - {{invoice_number}}', 'Dzień dobry,

Wzywamy do niezwłocznego uregulowania zaległości z tytułu faktury {{invoice_number}} w kwocie {{amount_with_interest}}.

Brak wpłaty w ciągu 7 dni może skutkować naliczeniem dodatkowych odsetek.

{{payment_link}}

Z poważaniem,
{{company_name}}'),
  ('00000000-0000-0000-0000-000000000001', 5, 14, 'email', 'Ostateczne wezwanie - {{invoice_number}}', 'Dzień dobry,

To ostateczne wezwanie do zapłaty faktury {{invoice_number}} na kwotę {{amount_with_interest}}.

Brak wpłaty w ciągu 3 dni roboczych spowoduje przekazanie sprawy do windykacji zewnętrznej.

{{payment_link}}

Z poważaniem,
{{company_name}}'),
  ('00000000-0000-0000-0000-000000000001', 6, 30, 'email', 'Przekazanie do windykacji - {{invoice_number}}', 'Szanowni Państwo,

Informujemy, że sprawa dotycząca faktury {{invoice_number}} na kwotę {{amount_with_interest}} zostanie w najbliższych dniach przekazana do zewnętrznej firmy windykacyjnej.

Wiąże się to z dodatkowymi kosztami, które zostaną doliczone do Państwa zadłużenia.

To ostatnia szansa na polubowne załatwienie sprawy.

{{payment_link}}

{{company_name}}');

-- Łagodna Steps
INSERT INTO sequence_steps (sequence_id, step_order, days_offset, channel, email_subject, email_body) VALUES
  ('00000000-0000-0000-0000-000000000002', 1, -3, 'email', 'Przypomnienie o płatności - {{invoice_number}}', 'Dzień dobry,

Uprzejmie przypominamy o zbliżającym się terminie płatności faktury {{invoice_number}}.

{{payment_link}}

Z poważaniem,
{{company_name}}'),
  ('00000000-0000-0000-0000-000000000002', 2, 3, 'email', 'Płatność przeterminowana - {{invoice_number}}', 'Dzień dobry,

Zauważyliśmy, że faktura {{invoice_number}} nie została jeszcze opłacona. Prosimy o uregulowanie należności.

{{payment_link}}

Z poważaniem,
{{company_name}}'),
  ('00000000-0000-0000-0000-000000000002', 3, 14, 'email', 'Przypomnienie - {{invoice_number}}', 'Dzień dobry,

Ponownie przypominamy o nieuregulowanej fakturze {{invoice_number}} na kwotę {{amount_with_interest}}.

{{payment_link}}

Z poważaniem,
{{company_name}}'),
  ('00000000-0000-0000-0000-000000000002', 4, 30, 'email', 'Prośba o kontakt - {{invoice_number}}', 'Dzień dobry,

Prosimy o kontakt w sprawie nieuregulowanej faktury {{invoice_number}}.

Jeśli mają Państwo problemy z płatnością, chętnie omówimy możliwe rozwiązania.

{{payment_link}}

Z poważaniem,
{{company_name}}');

-- ============================================
-- SETUP COMPLETE!
-- ============================================
-- Teraz możesz zarejestrować użytkownika.
-- Po rejestracji profil pojawi się w tabeli profiles.
-- Po zalogowaniu uruchomi się wizard (bo company_name jest NULL).
-- Po wypełnieniu wizarda dostaniesz pełny dostęp do aplikacji.
