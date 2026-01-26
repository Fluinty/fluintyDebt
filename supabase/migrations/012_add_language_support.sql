-- Migration: Add language support
-- Add language preference to debtors (default: Polish)
ALTER TABLE debtors ADD COLUMN IF NOT EXISTS preferred_language TEXT DEFAULT 'pl' CHECK (preferred_language IN ('pl', 'en'));

-- Add English content fields to sequence_steps
ALTER TABLE sequence_steps ADD COLUMN IF NOT EXISTS email_subject_en TEXT;
ALTER TABLE sequence_steps ADD COLUMN IF NOT EXISTS email_body_en TEXT;
ALTER TABLE sequence_steps ADD COLUMN IF NOT EXISTS sms_body_en TEXT;

-- Update existing debtors to have Polish as default
UPDATE debtors SET preferred_language = 'pl' WHERE preferred_language IS NULL;
