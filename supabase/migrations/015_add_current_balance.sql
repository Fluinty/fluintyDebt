-- Add current_balance to profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS current_balance NUMERIC DEFAULT 0;

-- Comment on column
COMMENT ON COLUMN profiles.current_balance IS 'Manually input current bank balance for cash flow calculation';
