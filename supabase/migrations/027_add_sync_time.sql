-- Migration: Add sync_time column to user_ksef_settings
-- This column stores the time of day when automatic syncs should run

ALTER TABLE user_ksef_settings 
    ADD COLUMN IF NOT EXISTS sync_time TIME DEFAULT '21:00';

-- Comment
COMMENT ON COLUMN user_ksef_settings.sync_time IS 'Time of day for automatic KSeF sync (HH:MM format)';
