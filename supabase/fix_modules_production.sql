-- SQL SCRIPT: FIX MODULES DEFAULT (PRODUCTION)
-- Problem: New users have "Costs" (Wydatki) module locked by default.
-- Cause: Default value was '{"sales": true, "costs": false}'.
-- Fix: Change default to '{"sales": true, "costs": true}' and update existing profiles.

-- 1. Update existing profiles (unlock Costs for you)
UPDATE public.profiles
SET modules = '{"sales": true, "costs": true}'::jsonb
WHERE modules->>'costs' = 'false' OR modules IS NULL;

-- 2. Change the default for FUTURE users
ALTER TABLE public.profiles 
ALTER COLUMN modules SET DEFAULT '{"sales": true, "costs": true}'::jsonb;
