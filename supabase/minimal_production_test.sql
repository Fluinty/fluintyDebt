-- ============================================
-- PRODUKCJA FINAL - Czysta Instalacja
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

-- KROK 3: Tabela profiles (z WSZYSTKIMI kolumnami od razu)
CREATE TABLE profiles (
  id uuid NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  full_name text,
  -- Company (NULL = wymusza wizard)
  company_name text,  -- NULLABLE!
  company_nip text,
  company_address text,
  company_city text,
  company_postal_code text,
  company_phone text,
  company_email text,
  bank_account_number text,
  bank_name text,
  -- Settings
  default_sequence_id uuid,
  send_thank_you_on_payment boolean DEFAULT true,
  interest_rate numeric DEFAULT 0.155,
  -- Onboarding & Modules
  onboarding_completed boolean DEFAULT false,
  ksef_setup_skipped boolean DEFAULT false,
  modules jsonb DEFAULT '{"costs": true, "sales": true}'::jsonb,
  current_balance numeric DEFAULT 0,
  sms_enabled boolean DEFAULT false,
  voice_enabled boolean DEFAULT false,
  thank_you_email_subject text,
  thank_you_email_body text,
  country text DEFAULT 'PL',
  -- Timestamps
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- KROK 4: Trigger - Auto-create profile on registration
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

-- KROK 5: RLS dla profiles
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own profile" ON profiles FOR ALL USING (auth.uid() = id);

-- KROK 6: Reszta tabel (sequences, debtors, invoices, etc.)
-- Te tabele możesz dodać z pełnego production_schema.sql
-- ALE najważniejsze jest to powyżej - profil musi się tworzyć!

-- ============================================
-- MINIMAL SETUP COMPLETE
-- Teraz możesz zarejestrować użytkownika.
-- Jak się zalogujesz, wizard powinien się uruchomić.
-- ============================================
