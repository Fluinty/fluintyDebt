-- ================================================
-- NAPRAW POLITYKI RLS DLA SCHEDULED_STEPS
-- Uruchom to w Supabase SQL Editor
-- ================================================

-- Najpierw usuń istniejącą politykę
DROP POLICY IF EXISTS "Users can manage own scheduled_steps" ON scheduled_steps;

-- Dodaj nową politykę dla SELECT
CREATE POLICY "Users can view own scheduled_steps" ON scheduled_steps
FOR SELECT USING (
  invoice_id IN (SELECT id FROM invoices WHERE user_id = auth.uid())
);

-- Dodaj nową politykę dla INSERT
CREATE POLICY "Users can insert own scheduled_steps" ON scheduled_steps
FOR INSERT WITH CHECK (
  invoice_id IN (SELECT id FROM invoices WHERE user_id = auth.uid())
);

-- Dodaj nową politykę dla UPDATE - kluczowa!
CREATE POLICY "Users can update own scheduled_steps" ON scheduled_steps
FOR UPDATE USING (
  invoice_id IN (SELECT id FROM invoices WHERE user_id = auth.uid())
);

-- Dodaj nową politykę dla DELETE
CREATE POLICY "Users can delete own scheduled_steps" ON scheduled_steps
FOR DELETE USING (
  invoice_id IN (SELECT id FROM invoices WHERE user_id = auth.uid())
);

-- Sprawdź polityki
SELECT policyname, cmd FROM pg_policies WHERE tablename = 'scheduled_steps';

-- DODATKOWO: Oznacz historyczne kroki jako skipped
UPDATE scheduled_steps
SET status = 'skipped'
WHERE status = 'pending' 
  AND scheduled_for < CURRENT_DATE;
