
-- Update profiles table with modules configuration
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS modules jsonb DEFAULT '{"sales": true, "costs": false}'::jsonb;

-- Create cost_invoices table
CREATE TABLE IF NOT EXISTS public.cost_invoices (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    contractor_name TEXT NOT NULL,
    contractor_nip TEXT,
    invoice_number TEXT NOT NULL,
    
    issue_date DATE NOT NULL DEFAULT CURRENT_DATE,
    due_date DATE NOT NULL,
    
    amount DECIMAL(10, 2) NOT NULL,
    currency TEXT NOT NULL DEFAULT 'PLN',
    
    account_number TEXT,
    payment_status TEXT NOT NULL DEFAULT 'to_pay' CHECK (payment_status IN ('to_pay', 'paid')),
    paid_at TIMESTAMP WITH TIME ZONE,
    
    category TEXT NOT NULL DEFAULT 'other',
    description TEXT,
    
    file_url TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.cost_invoices ENABLE ROW LEVEL SECURITY;

-- Create policies for cost_invoices
CREATE POLICY "Users can view their own cost invoices" 
    ON public.cost_invoices FOR SELECT 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own cost invoices" 
    ON public.cost_invoices FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own cost invoices" 
    ON public.cost_invoices FOR UPDATE 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own cost invoices" 
    ON public.cost_invoices FOR DELETE 
    USING (auth.uid() = user_id);

-- Create updated_at trigger for cost_invoices if function exists (from initial schema)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'handle_updated_at') THEN
        CREATE TRIGGER handle_updated_at
        BEFORE UPDATE ON public.cost_invoices
        FOR EACH ROW
        EXECUTE FUNCTION handle_updated_at();
    END IF;
END
$$;
