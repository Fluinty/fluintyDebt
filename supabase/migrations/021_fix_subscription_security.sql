-- Migration: Fix Security Issue with Mutable Search Path
-- Function: handle_new_user_subscription
-- Security fix: Set explicit search_path

CREATE OR REPLACE FUNCTION public.handle_new_user_subscription()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
$$;
