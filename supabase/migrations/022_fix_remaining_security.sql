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
