-- Oznacz wszystkie oczekujące kroki harmonogramu z przeszłości jako 'skipped'
-- Uruchom to w Supabase SQL Editor aby oczyścić historyczne kroki

UPDATE scheduled_steps
SET status = 'skipped'
WHERE status = 'pending' 
  AND scheduled_for < CURRENT_DATE;

-- Pokaż ile kroków zostało zaktualizowanych
SELECT 
  COUNT(*) as updated_steps,
  MIN(scheduled_for) as oldest_step,
  MAX(scheduled_for) as newest_step
FROM scheduled_steps 
WHERE status = 'skipped';
