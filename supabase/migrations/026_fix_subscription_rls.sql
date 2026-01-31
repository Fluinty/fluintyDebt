-- Migration: Fix RLS for Subscriptions
-- Issue: "Service role can manage subscriptions" was permitting ALL access to everyone.
-- Fix: Restrict management (INSERT, UPDATE, DELETE) to service_role only.

-- 1. Drop the insecure policy
DROP POLICY IF EXISTS "Service role can manage subscriptions" ON subscriptions;

-- 2. Recreate it with restriction (allow only service_role)
CREATE POLICY "Service role can manage subscriptions"
    ON subscriptions
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- Note: Authenticated users can still VIEW their subscription via the existing "Users can view own subscription" policy.
-- They cannot modify it directly (must go through server actions/Stripe webhooks).
