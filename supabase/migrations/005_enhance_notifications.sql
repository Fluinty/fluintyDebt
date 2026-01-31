-- Migration: Enhance notifications table
-- Add reference_id and metadata for better tracking and deduplication

ALTER TABLE notifications 
ADD COLUMN IF NOT EXISTS reference_id TEXT, -- e.g. invoice_id, collection_action_id
ADD COLUMN IF NOT EXISTS metadata JSONB;    -- e.g. { "days_overdue": 5, "invoice_number": "FV/1/2026" }

-- Create index for deduplication checks
CREATE INDEX IF NOT EXISTS idx_notifications_user_type_ref ON notifications(user_id, type, reference_id);
