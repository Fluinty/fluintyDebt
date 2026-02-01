-- ==========================================
-- FINAL FIX: UNLOCK EVERYTHING & BREAK LOOP
-- ==========================================

-- 1. Odblokuj moduł WYDATKI dla wszystkich (obecnych i przyszłych)
ALTER TABLE profiles 
ALTER COLUMN modules SET DEFAULT '{"sales": true, "costs": true}'::jsonb;

UPDATE profiles 
SET modules = '{"sales": true, "costs": true}'::jsonb;

-- 2. Przerwij pętlę Onboardingu
-- Ustawiamy flagę na TRUE i uzupełniamy braki, żeby Wizard się nie odpalał
UPDATE profiles
SET 
    onboarding_completed = true,
    company_name = COALESCE(company_name, 'Twoja Firma'),
    company_nip = COALESCE(company_nip, '0000000000')
WHERE onboarding_completed IS NOT TRUE;

-- 3. Upewnij się, że RLS nie blokuje podglądu
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
