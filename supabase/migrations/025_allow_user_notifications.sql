-- Migration: Allow Users to Insert Own Notifications
-- Fixes regression where limiting INSERT to service_role broke application logic.

-- 1. Drop the policy if it exists (Idempotency fix)
DROP POLICY IF EXISTS "Users can insert own notifications" ON notifications;

-- 2. Create the policy
CREATE POLICY "Users can insert own notifications"
    ON notifications
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);
