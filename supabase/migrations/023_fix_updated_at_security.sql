-- Migration: Fix Updated_At Security Issues
-- Functions: update_scheduled_steps_updated_at, update_updated_at_column

-- 1. update_scheduled_steps_updated_at (Trigger function)
ALTER FUNCTION public.update_scheduled_steps_updated_at() SET search_path = public;

-- 2. update_updated_at_column (Generic Trigger function used by many tables)
ALTER FUNCTION public.update_updated_at_column() SET search_path = public;
