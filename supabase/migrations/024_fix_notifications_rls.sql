-- Migration: Fix RLS for Notifications
-- Issue: "Service role can insert notifications" policy was too permissive (WITH CHECK (true))
-- Fix: Restrict policy to service_role only or system usage

-- 1. Drop the insecure policy
DROP POLICY IF EXISTS "Service role can insert notifications" ON notifications;

-- 2. Recreate it with restriction (allow only service_role to insert)
-- Note: Supabase/PostgREST auth.uid() is null for service_role, but we can check role directly
-- Or simpler: "Service role" bypasses RLS automatically if configured so in Supabase,
-- BUT if we want an explicit INSERT policy for it, it suggests RLS is enabled.
-- Standard Service Role bypasses RLS, so this policy might have been redundant for service role
-- but accidentally open for 'anon' or 'authenticated' if they have INSERT grant on table.

-- To be safe, we allow INSERT only if user has service_role or is a system function (which bypasses RLS anyway).
-- If this policy was intended to allow backend inserts via API, we should restrict it.

CREATE POLICY "System can insert notifications"
ON notifications
FOR INSERT
TO service_role
WITH CHECK (true);

-- The 'TO service_role' clause ensures only the service role applies this policy.
-- Other roles (anon, authenticated) effectively have NO INSERT policy now, so they denied by default (Standard RLS).
