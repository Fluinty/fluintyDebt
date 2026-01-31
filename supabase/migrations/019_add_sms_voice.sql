-- ============================================
-- VindycAItion - SMS & Voice Support
-- ============================================
-- Adds support for multi-channel communication (Email, SMS, Voice)

-- 1. Update sequence_steps channel constraint to support voice
-- First, migrate any legacy 'both' channels to 'email' to avoid constraint violation
UPDATE sequence_steps SET channel = 'email' WHERE channel = 'both';

ALTER TABLE sequence_steps DROP CONSTRAINT IF EXISTS sequence_steps_channel_check;
ALTER TABLE sequence_steps ADD CONSTRAINT sequence_steps_channel_check 
  CHECK (channel IN ('email', 'sms', 'voice'));

-- 2. Add voice script fields to sequence_steps
ALTER TABLE sequence_steps ADD COLUMN IF NOT EXISTS voice_script TEXT;
ALTER TABLE sequence_steps ADD COLUMN IF NOT EXISTS voice_script_en TEXT;

-- 3. Add SMS/Voice toggles and usage tracking to subscriptions
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS sms_limit INT DEFAULT 0;
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS calls_limit INT DEFAULT 0;
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS sms_used INT DEFAULT 0;
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS calls_used INT DEFAULT 0;
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS usage_reset_at TIMESTAMPTZ DEFAULT NOW();

-- 4. Add communication preferences to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS sms_enabled BOOLEAN DEFAULT FALSE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS voice_enabled BOOLEAN DEFAULT FALSE;

-- 5. Add call duration tracking to collection_actions
ALTER TABLE collection_actions ADD COLUMN IF NOT EXISTS call_duration_seconds INT;

-- 6. Add retry tracking to scheduled_steps
ALTER TABLE scheduled_steps ADD COLUMN IF NOT EXISTS retry_count INT DEFAULT 0;

-- 7. Add consent tracking to debtors
ALTER TABLE debtors ADD COLUMN IF NOT EXISTS sms_voice_consent_at TIMESTAMPTZ;

-- 8. Set default limits based on subscription tier
-- This will be enforced in application logic, but we set sensible defaults
UPDATE subscriptions SET 
  sms_limit = CASE 
    WHEN tier = 'starter' THEN 50
    WHEN tier = 'growth' THEN 200
    WHEN tier = 'unlimited' THEN 999999
    ELSE 0 
  END,
  calls_limit = CASE 
    WHEN tier = 'starter' THEN 10
    WHEN tier = 'growth' THEN 50
    WHEN tier = 'unlimited' THEN 999999
    ELSE 0 
  END
WHERE sms_limit IS NULL OR sms_limit = 0;

-- 9. Function to increment SMS usage
CREATE OR REPLACE FUNCTION increment_sms_usage(p_user_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE subscriptions 
  SET sms_used = COALESCE(sms_used, 0) + 1
  WHERE user_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 10. Function to increment calls usage
CREATE OR REPLACE FUNCTION increment_calls_usage(p_user_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE subscriptions 
  SET calls_used = COALESCE(calls_used, 0) + 1
  WHERE user_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 11. Function to reset monthly usage (call via cron)
CREATE OR REPLACE FUNCTION reset_monthly_usage()
RETURNS VOID AS $$
BEGIN
  UPDATE subscriptions 
  SET 
    sms_used = 0,
    calls_used = 0,
    usage_reset_at = NOW()
  WHERE usage_reset_at < DATE_TRUNC('month', NOW());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
