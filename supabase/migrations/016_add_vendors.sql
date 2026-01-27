-- Create vendors table
CREATE TABLE IF NOT EXISTS public.vendors (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    name TEXT NOT NULL,
    nip TEXT,
    
    -- Contact info
    email TEXT,
    phone TEXT,
    website TEXT,
    
    -- Address
    address TEXT,
    city TEXT,
    postal_code TEXT,
    
    -- Banking info (Crucial for costs)
    bank_account_number TEXT,
    bank_name TEXT,
    
    -- Metadata
    notes TEXT,
    category TEXT DEFAULT 'other',
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.vendors ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own vendors" 
    ON public.vendors FOR SELECT 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own vendors" 
    ON public.vendors FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own vendors" 
    ON public.vendors FOR UPDATE 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own vendors" 
    ON public.vendors FOR DELETE 
    USING (auth.uid() = user_id);

-- Create updated_at trigger
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'handle_updated_at') THEN
        CREATE TRIGGER handle_updated_at
        BEFORE UPDATE ON public.vendors
        FOR EACH ROW
        EXECUTE FUNCTION handle_updated_at();
    END IF;
END
$$;
