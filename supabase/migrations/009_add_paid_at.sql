-- Add paid_at column to track when invoices were actually paid
-- This enables historical payment behavior tracking for scoring

ALTER TABLE invoices ADD COLUMN IF NOT EXISTS paid_at TIMESTAMP WITH TIME ZONE;

-- Create index for paid_at queries
CREATE INDEX IF NOT EXISTS idx_invoices_paid_at ON invoices(paid_at);

-- Add comment for documentation
COMMENT ON COLUMN invoices.paid_at IS 'Timestamp when the invoice was marked as fully paid. Used for payment history scoring.';
