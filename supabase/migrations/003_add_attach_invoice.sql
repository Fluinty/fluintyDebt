-- Add attach_invoice column to sequence_steps
ALTER TABLE sequence_steps 
ADD COLUMN IF NOT EXISTS attach_invoice BOOLEAN DEFAULT FALSE;

-- Update existing records to false (already handle by DEFAULT but good to be explicit for safety if needed, though default handles new ones)
-- No need to update old ones as default applies to new inserts, for existing rows standard SQL behaviour depends but usually null unless we specify NOT NULL.
-- Let's make it NOT NULL DEFAULT FALSE to be clean.

UPDATE sequence_steps SET attach_invoice = FALSE WHERE attach_invoice IS NULL;
ALTER TABLE sequence_steps ALTER COLUMN attach_invoice SET DEFAULT FALSE;
ALTER TABLE sequence_steps ALTER COLUMN attach_invoice SET NOT NULL;
