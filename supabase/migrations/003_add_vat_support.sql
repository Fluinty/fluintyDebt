-- Add VAT support to invoices table
-- Run this in Supabase SQL Editor

-- Add VAT columns to invoices
ALTER TABLE invoices 
ADD COLUMN IF NOT EXISTS amount_net numeric(12,2),
ADD COLUMN IF NOT EXISTS vat_rate varchar(10) DEFAULT '23',
ADD COLUMN IF NOT EXISTS vat_amount numeric(12,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS amount_gross numeric(12,2);

-- Migrate existing data: treat current 'amount' as gross amount
UPDATE invoices 
SET 
    amount_gross = amount,
    amount_net = ROUND(amount / 1.23, 2),  -- Assuming 23% VAT for existing
    vat_amount = ROUND(amount - (amount / 1.23), 2),
    vat_rate = '23'
WHERE amount_gross IS NULL;

-- Add onboarding_completed to profiles if not exists
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS onboarding_completed boolean DEFAULT false;

-- Comment for clarity
COMMENT ON COLUMN invoices.amount_net IS 'Kwota netto (przed VAT)';
COMMENT ON COLUMN invoices.vat_rate IS 'Stawka VAT: 23, 8, 5, 0, zw, np';
COMMENT ON COLUMN invoices.vat_amount IS 'Kwota podatku VAT';
COMMENT ON COLUMN invoices.amount_gross IS 'Kwota brutto (z VAT)';
