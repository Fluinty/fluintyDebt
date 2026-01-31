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
