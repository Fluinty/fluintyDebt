-- SQL SCRIPT: FIX SIGNUP ERROR (PRODUCTION)
-- Problem: "Database error saving new user"
-- Przyczyna: Konflikt. Aplikacja (Frontend) tworzy profil użytkownika, a mój Trigger (baza) próbuje zrobić to samo w tym samym czasie.
-- Rozwiązanie: Usuwamy trigger. Niech aplikacja zarządza tworzeniem profilu (bo wie lepiej, jaką nazwę firmy wpisał użytkownik).

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Upewnijmy się też, że trigger od sekwencji jest bezpieczny (tylko na profilach)
-- (To już powinno być ok, ale dla pewności)
DROP TRIGGER IF EXISTS on_auth_user_created_sequences ON auth.users;
