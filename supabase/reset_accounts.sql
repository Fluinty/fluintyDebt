-- ==================================================
-- HARD RESET: USUWA WSZYSTKIE KONTA I DANE
-- ==================================================

-- 1. Usuń wszystkich użytkowników (Kaskadowo usunie profile, faktury, dłużników itd.)
DELETE FROM auth.users;

-- 2. ZABEZPIECZENIE NA PRZYSZŁOŚĆ
-- Upewnij się, że tabela profiles ma dobre ustawienia domyślne, 
-- żeby nowe konto od razu dostało dostęp do wszystkiego.
ALTER TABLE public.profiles 
ALTER COLUMN modules SET DEFAULT '{"sales": true, "costs": true}'::jsonb;

-- 3. Jeśli kolumny modules nie ma (bo stara baza), to ją dodaj
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS modules jsonb DEFAULT '{"sales": true, "costs": true}'::jsonb;
