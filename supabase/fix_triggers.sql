-- Naprawa triggerów (Fix Triggers) to allow user creation
-- Uruchom to w Supabase SQL Editor

-- 1. Fix handle_new_user (Ensure Public Schema & prevent NULL errors)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, company_name, full_name)
  VALUES (
    new.id,
    new.email,
    -- Domyślna nazwa firmy, jeśli brak w metadanych (by uniknąć błędu 500)
    COALESCE(new.raw_user_meta_data->>'company_name', 'Moja Firma'),
    COALESCE(new.raw_user_meta_data->>'full_name', 'Użytkownik')
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 2. Odśwież trigger na auth.users (tylko jeśli nie istnieje lub jest popsuty)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- 3. Fix handle_new_user_subscription (Update Search Path)
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
        'unlimited', 
        9999,
        NOW() + INTERVAL '14 days'
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
