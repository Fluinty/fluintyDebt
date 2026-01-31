DO $$
DECLARE
    -- SQL SCRIPT: FIX SCHEDULER & "SKIPPED" STATUS LOGIC
    -- Target User (Adam)
    u_id UUID := '41082330-312a-4b49-96d6-aaf84572eff4';
    
    -- Variables
    new_seq_id UUID;
    old_seq_id UUID;
    
BEGIN
    -- 1. UPDATE LIMITS
    UPDATE subscriptions
    SET 
        sms_limit = 200,
        monthly_invoice_limit = 9999
    WHERE user_id = u_id;

    -- 2. GET/CREATE "Windykacja Standardowa"
    SELECT id INTO new_seq_id FROM sequences WHERE user_id = u_id AND name = 'Windykacja Standardowa' LIMIT 1;
    
    IF new_seq_id IS NULL THEN
        RAISE NOTICE 'Creating Windykacja Standardowa...';
        INSERT INTO sequences (user_id, name, description, is_default)
        VALUES (u_id, 'Windykacja Standardowa', 'Domyślna sekwencja demo (Poprawiona)', true)
        RETURNING id INTO new_seq_id;
        
        INSERT INTO sequence_steps (sequence_id, step_order, days_offset, channel, email_subject, email_body)
        VALUES (new_seq_id, 1, -2, 'email', 'Przypomnienie o płatności', 'Przypominamy o terminie.');
        
        INSERT INTO sequence_steps (sequence_id, step_order, days_offset, channel, email_subject, email_body, sms_body)
        VALUES (new_seq_id, 2, 0, 'sms', 'SMS', 'Placeholder', 'Termin mija dziś. {{invoice_number}}');
        
        INSERT INTO sequence_steps (sequence_id, step_order, days_offset, channel, email_subject, email_body)
        VALUES (new_seq_id, 3, 5, 'email', 'Wezwanie do zapłaty', 'Prosimy o wpłatę.');
        
        INSERT INTO sequence_steps (sequence_id, step_order, days_offset, channel, email_subject, email_body)
        VALUES (new_seq_id, 4, 14, 'email', 'Ostateczne wezwanie', 'Sprawa trafi do windykacji.');
    END IF;

    -- 3. FIND OLD "Standardowa"
    SELECT id INTO old_seq_id FROM sequences WHERE user_id = u_id AND name = 'Standardowa' LIMIT 1;

    -- 4. REASSIGN ALL INVOICES TO NEW SEQUENCE
    UPDATE invoices 
    SET sequence_id = new_seq_id 
    WHERE user_id = u_id 
      AND (sequence_id IS NULL OR sequence_id = old_seq_id);

    -- 5. DELETE OLD SEQUENCE
    IF old_seq_id IS NOT NULL AND old_seq_id != new_seq_id THEN
        DELETE FROM sequences WHERE id = old_seq_id;
    END IF;

    -- 6. REGENERATE SCHEDULE WITH "SKIPPED" LOGIC
    -- Clear current pending/skipped steps to rebuild consistently
    DELETE FROM scheduled_steps 
    WHERE status IN ('pending', 'skipped')
      AND invoice_id IN (SELECT id FROM invoices WHERE user_id = u_id);

    -- Bulk Insert steps
    -- LOGIC: 
    -- If Scheduled Date < Invoice Created At -> Status = 'skipped'
    -- If Scheduled Date >= Invoice Created At -> Status = 'pending'
    INSERT INTO scheduled_steps (invoice_id, sequence_step_id, scheduled_for, status)
    SELECT 
        i.id,
        ss.id,
        (i.due_date + (ss.days_offset || ' days')::INTERVAL)::DATE as sched_date,
        CASE 
            WHEN (i.due_date + (ss.days_offset || ' days')::INTERVAL) < i.created_at THEN 'skipped'
            ELSE 'pending'
        END as status
    FROM invoices i
    JOIN sequence_steps ss ON i.sequence_id = ss.sequence_id
    WHERE i.user_id = u_id
      AND i.status IN ('pending', 'overdue');

    RAISE NOTICE 'Done. Steps pre-dating invoice creation marked as skipped.';
END $$;
