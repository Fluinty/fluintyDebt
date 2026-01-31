-- Create subscriptions table
CREATE TABLE IF NOT EXISTS subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE UNIQUE,
    stripe_customer_id TEXT,
    stripe_subscription_id TEXT,
    status TEXT CHECK (status IN ('trialing', 'active', 'past_due', 'canceled', 'incomplete', 'active_non_renewing')),
    plan_interval TEXT CHECK (plan_interval IN ('month', 'year')),
    tier TEXT CHECK (tier IN ('starter', 'growth', 'unlimited')) DEFAULT 'unlimited',
    monthly_invoice_limit INTEGER DEFAULT 200, -- Default for unlimited during trial or growth
    current_period_end TIMESTAMPTZ,
    trial_ends_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

-- Setup RLS Policies
CREATE POLICY "Users can view own subscription"
    ON subscriptions FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage subscriptions"
    ON subscriptions FOR ALL
    USING (true)
    WITH CHECK (true);

-- Function to handle updated_at
-- Function to handle updated_at
CREATE TRIGGER handle_updated_at BEFORE UPDATE ON subscriptions
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- Trigger to create subscription on profile creation (User Signup)
-- Requires that profiles are created first.
-- Alternatively, we can handle this in the backend code (auth callback) for more control.
-- But a trigger is safer to ensure every user has a row.

CREATE OR REPLACE FUNCTION public.handle_new_user_subscription()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.subscriptions (
        user_id,
        status,
        tier,
        monthly_invoice_limit,
        trial_ends_at
    )
    VALUES (
        NEW.id,
        'trialing',
        'unlimited', -- Give them best tier for trial
        999999,     -- Effectively unlimited
        NOW() + INTERVAL '14 days'
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger after profile insert
CREATE TRIGGER on_profile_created_create_subscription
    AFTER INSERT ON public.profiles
    FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user_subscription();

-- Backfill for existing users who don't have a subscription row
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN SELECT id FROM profiles
    LOOP
        INSERT INTO subscriptions (user_id, status, tier, monthly_invoice_limit, trial_ends_at)
        VALUES (
            r.id,
            'trialing',
            'unlimited',
            999999,
            NOW() + INTERVAL '14 days' -- Give existing users 14 days from migration
        )
        ON CONFLICT (user_id) DO NOTHING;
    END LOOP;
END;
$$;
