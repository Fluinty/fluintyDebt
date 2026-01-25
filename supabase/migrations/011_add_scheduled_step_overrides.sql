-- Add override columns to scheduled_steps table
-- This allows editing individual scheduled steps without modifying the original sequence

ALTER TABLE scheduled_steps
ADD COLUMN IF NOT EXISTS override_email_subject TEXT,
ADD COLUMN IF NOT EXISTS override_email_body TEXT,
ADD COLUMN IF NOT EXISTS override_channel TEXT CHECK (override_channel IN ('email', 'sms')),
ADD COLUMN IF NOT EXISTS notes TEXT,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Add a trigger to auto-update updated_at
CREATE OR REPLACE FUNCTION update_scheduled_steps_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS scheduled_steps_updated_at ON scheduled_steps;
CREATE TRIGGER scheduled_steps_updated_at
    BEFORE UPDATE ON scheduled_steps
    FOR EACH ROW
    EXECUTE FUNCTION update_scheduled_steps_updated_at();
