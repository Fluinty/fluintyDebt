-- ============================================
-- VindycAItion - Add Auto-Send Settings
-- ============================================
-- Adds columns for automatic message sending and per-debtor preferences

-- Add auto-send settings to debtors table
ALTER TABLE debtors ADD COLUMN IF NOT EXISTS auto_send_enabled BOOLEAN DEFAULT TRUE;
ALTER TABLE debtors ADD COLUMN IF NOT EXISTS preferred_send_time TIME DEFAULT '10:00';
ALTER TABLE debtors ADD COLUMN IF NOT EXISTS preferred_channel TEXT DEFAULT 'email' 
    CHECK (preferred_channel IN ('email', 'sms', 'both'));

-- Add auto-send settings to invoices table
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS auto_send_enabled BOOLEAN DEFAULT TRUE;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS send_time TIME DEFAULT '10:00';

-- Add index for efficient querying of auto-send enabled invoices
CREATE INDEX IF NOT EXISTS idx_invoices_auto_send ON invoices(auto_send_enabled, send_time) 
    WHERE auto_send_enabled = TRUE;

-- Comment for documentation
COMMENT ON COLUMN debtors.auto_send_enabled IS 'Default: whether invoices for this debtor should auto-send messages';
COMMENT ON COLUMN debtors.preferred_send_time IS 'Default time to send messages for this debtor';
COMMENT ON COLUMN debtors.preferred_channel IS 'Preferred communication channel: email, sms, or both';
COMMENT ON COLUMN invoices.auto_send_enabled IS 'Whether this invoice should auto-send scheduled messages';
COMMENT ON COLUMN invoices.send_time IS 'Time of day to send scheduled messages for this invoice';
