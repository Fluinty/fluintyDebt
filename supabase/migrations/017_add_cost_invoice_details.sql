-- supabase/migrations/017_add_cost_invoice_details.sql
ALTER TABLE public.cost_invoices
ADD COLUMN vendor_id UUID REFERENCES public.vendors(id) ON DELETE SET NULL,
ADD COLUMN amount_net NUMERIC,
ADD COLUMN vat_rate TEXT,
ADD COLUMN vat_amount NUMERIC,
ADD COLUMN amount_gross NUMERIC,
ADD COLUMN bank_name TEXT;

-- Update existing rows (if safe)
UPDATE public.cost_invoices
SET amount_gross = amount;

-- For future, if needed, you might drop the 'amount' column or keep it as legacy gross
-- For now, we will maintain compatibility by setting 'amount' = 'amount_gross' in triggers or application logic.
