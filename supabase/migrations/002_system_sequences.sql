-- ============================================
-- VindycAItion - Add System Sequences Support
-- ============================================
-- This migration allows system-wide sequences (user_id = NULL)
-- that are visible to all users but cannot be edited

-- Make user_id nullable for system sequences (ignore if already done)
DO $$ 
BEGIN
    ALTER TABLE sequences ALTER COLUMN user_id DROP NOT NULL;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'user_id already nullable, skipping';
END $$;

-- Drop ALL existing policies for sequences (clean slate)
DROP POLICY IF EXISTS "Users can view their own sequences" ON sequences;
DROP POLICY IF EXISTS "Users can view own and system sequences" ON sequences;
DROP POLICY IF EXISTS "Users can insert their own sequences" ON sequences;
DROP POLICY IF EXISTS "Users can update their own sequences" ON sequences;
DROP POLICY IF EXISTS "Users can update their own non-system sequences" ON sequences;
DROP POLICY IF EXISTS "Users can delete their own sequences" ON sequences;
DROP POLICY IF EXISTS "Users can delete their own non-system sequences" ON sequences;

-- Create new policies
CREATE POLICY "Users can view own and system sequences" ON sequences
  FOR SELECT USING (user_id = auth.uid() OR user_id IS NULL);

CREATE POLICY "Users can insert their own sequences" ON sequences
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own non-system sequences" ON sequences
  FOR UPDATE USING (user_id = auth.uid() AND is_system = FALSE);

CREATE POLICY "Users can delete their own non-system sequences" ON sequences
  FOR DELETE USING (user_id = auth.uid() AND is_system = FALSE);

-- Drop ALL existing policies for sequence_steps (clean slate)
DROP POLICY IF EXISTS "Users can view steps of their sequences" ON sequence_steps;
DROP POLICY IF EXISTS "Users can view steps of own and system sequences" ON sequence_steps;
DROP POLICY IF EXISTS "Users can insert steps in their sequences" ON sequence_steps;
DROP POLICY IF EXISTS "Users can insert steps in their own sequences" ON sequence_steps;
DROP POLICY IF EXISTS "Users can update steps in their sequences" ON sequence_steps;
DROP POLICY IF EXISTS "Users can update steps in their own sequences" ON sequence_steps;
DROP POLICY IF EXISTS "Users can update steps in their own non-system sequences" ON sequence_steps;
DROP POLICY IF EXISTS "Users can delete steps in their sequences" ON sequence_steps;
DROP POLICY IF EXISTS "Users can delete steps in their own sequences" ON sequence_steps;
DROP POLICY IF EXISTS "Users can delete steps in their own non-system sequences" ON sequence_steps;

-- Create new policies for sequence_steps
CREATE POLICY "Users can view steps of own and system sequences" ON sequence_steps
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM sequences s 
      WHERE s.id = sequence_steps.sequence_id 
      AND (s.user_id = auth.uid() OR s.user_id IS NULL)
    )
  );

CREATE POLICY "Users can insert steps in their own sequences" ON sequence_steps
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM sequences s 
      WHERE s.id = sequence_steps.sequence_id 
      AND s.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update steps in their own non-system sequences" ON sequence_steps
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM sequences s 
      WHERE s.id = sequence_steps.sequence_id 
      AND s.user_id = auth.uid()
      AND s.is_system = FALSE
    )
  );

CREATE POLICY "Users can delete steps in their own non-system sequences" ON sequence_steps
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM sequences s 
      WHERE s.id = sequence_steps.sequence_id 
      AND s.user_id = auth.uid()
      AND s.is_system = FALSE
    )
  );
