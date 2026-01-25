-- Add table for invoice line items (from KSeF)
CREATE TABLE invoice_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    description TEXT NOT NULL,
    quantity DECIMAL(12,3) NOT NULL DEFAULT 1,
    unit_price_net DECIMAL(12,2) NOT NULL,
    unit_price_gross DECIMAL(12,2) NOT NULL,
    vat_rate INT, -- e.g. 23, 8, 0
    total_net DECIMAL(12,2) NOT NULL,
    total_gross DECIMAL(12,2) NOT NULL,
    unit TEXT, -- e.g. 'szt', 'usł'
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for faster queries
CREATE INDEX idx_invoice_items_invoice_id ON invoice_items(invoice_id);

-- RLS
ALTER TABLE invoice_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own invoice items" ON invoice_items FOR ALL 
USING (invoice_id IN (SELECT id FROM invoices WHERE user_id = auth.uid()));
