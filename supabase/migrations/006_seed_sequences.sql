-- Migration: Seed 3 Standard Sequences
-- 1. Łagodna (Gentle) - 7 steps (including SMS) extended over 45 days
-- 2. Standardowa (Standard) - 6 steps over 35 days
-- 3. Szybka Eskalacja (Rapid) - 4 steps over 14 days

CREATE OR REPLACE FUNCTION create_default_sequences(target_user_id UUID)
RETURNS void 
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
    gentle_id UUID;
    standard_id UUID;
    rapid_id UUID;
BEGIN
    -- 1. Łagodna (Gentle)
    INSERT INTO sequences (user_id, name, description, is_default)
    VALUES (target_user_id, 'Windykacja Łagodna', 'Długofalowa strategia (45 dni) nastawiona na utrzymanie relacji.', false)
    RETURNING id INTO gentle_id;

    -- Step 1: Day 0 (Email)
    INSERT INTO sequence_steps (sequence_id, step_order, days_offset, channel, email_subject, email_body, sms_body)
    VALUES (gentle_id, 1, 0, 'email', 'Przypomnienie o dzisiejszym terminie płatności - {{invoice_number}}', 
    'Dzień dobry {{debtor_name}},

Przypominamy, że dzisiaj mija termin płatności faktury {{invoice_number}} na kwotę {{amount}}.

Będziemy wdzięczni za terminową wpłatę.

Nr konta: {{bank_account}}
Link do płatności: {{payment_link}}

Pozdrawiamy,
{{company_name}}', NULL);

    -- Step 2: Day 2 (Email)
    INSERT INTO sequence_steps (sequence_id, step_order, days_offset, channel, email_subject, email_body, sms_body)
    VALUES (gentle_id, 2, 2, 'email', 'Pytanie o fakturę {{invoice_number}}', 
    'Cześć {{debtor_name}},

Nie odnotowaliśmy jeszcze wpłaty za fakturę {{invoice_number}}. Czy dokument dotarł poprawnie?

Jeśli to tylko przeoczenie, prosimy o realizację przelewu.

Link: {{payment_link}}

Z poważaniem,
{{company_name}}', NULL);

    -- Step 3: Day 7 (Email)
    INSERT INTO sequence_steps (sequence_id, step_order, days_offset, channel, email_subject, email_body, sms_body)
    VALUES (gentle_id, 3, 7, 'email', 'Przypomnienie o płatności {{invoice_number}}', 
    'Dzień dobry,

Minął tydzień od terminu płatności faktury {{invoice_number}}. Prosimy o uregulowanie zaległości w wysokości {{amount}}.

Konto: {{bank_account}}

Dziękujemy,
{{company_name}}', NULL);

    -- Step 4: Day 15 (Email)
    INSERT INTO sequence_steps (sequence_id, step_order, days_offset, channel, email_subject, email_body, sms_body)
    VALUES (gentle_id, 4, 15, 'email', 'Ponowne przypomnienie - {{invoice_number}}', 
    'Szanowni Państwo,

Nadal nie otrzymaliśmy wpłaty za fakturę {{invoice_number}}, która jest już 15 dni po terminie. Prosimy o pilną płatność.

Link: {{payment_link}}

Z poważaniem,
Zespół Finansowy {{company_name}}', NULL);

    -- Step 5: Day 30 (Email)
    INSERT INTO sequence_steps (sequence_id, step_order, days_offset, channel, email_subject, email_body, sms_body)
    VALUES (gentle_id, 5, 30, 'email', 'OSTRZEŻENIE: Brak wpłaty za {{invoice_number}}', 
    'Dzień dobry,

Faktura {{invoice_number}} jest przeterminowana o 30 dni. Jest to ostatni moment na uregulowanie należności przed podjęciem dalszych kroków.

Prosimy o wpłatę: {{payment_link}}

Pozdrawiamy,
{{company_name}}', NULL);

    -- Step 6: Day 30 (SMS)
    -- Using empty string for email_body to satisfy potential NOT NULL constraints
    INSERT INTO sequence_steps (sequence_id, step_order, days_offset, channel, email_subject, email_body, sms_body)
    VALUES (gentle_id, 6, 30, 'sms', NULL, '', 
    'Cześć {{debtor_name}}, przypominamy o FV {{invoice_number}} na kwotę {{amount}}. Prosimy o wpłatę: {{payment_link}}. Pozdrawiamy, {{company_name}}');

    -- Step 7: Day 45 (Email)
    INSERT INTO sequence_steps (sequence_id, step_order, days_offset, channel, email_subject, email_body, sms_body)
    VALUES (gentle_id, 7, 45, 'email', 'Informacja o windykacji - {{invoice_number}}', 
    'Szanowni Państwo,

Z powodu braku wpłaty za fakturę {{invoice_number}} mimo wielu przypomnień, jesteśmy zmuszeni przekazać sprawę do zewnętrznej firmy windykacyjnej.

Ostateczny termin wpłaty to 3 dni.

Z poważaniem,
{{company_name}}', NULL);


    -- 2. Standardowa (Standard)
    INSERT INTO sequences (user_id, name, description, is_default)
    VALUES (target_user_id, 'Windykacja Standardowa', 'Zbalansowane podejście (35 dni), najczęściej wybierane.', true)
    RETURNING id INTO standard_id;

    -- Step 1: Day 1
    INSERT INTO sequence_steps (sequence_id, step_order, days_offset, channel, email_subject, email_body, sms_body)
    VALUES (standard_id, 1, 1, 'email', 'Przypomnienie: Termin faktury {{invoice_number}} minął', 
    'Dzień dobry,

Informujemy, że wczoraj minął termin płatności faktury {{invoice_number}}. Prosimy o dokonanie przelewu.

Kwota: {{amount}}
Link: {{payment_link}}

Pozdrawiamy,
{{company_name}}', NULL);

    -- Step 2: Day 5
    INSERT INTO sequence_steps (sequence_id, step_order, days_offset, channel, email_subject, email_body, sms_body)
    VALUES (standard_id, 2, 5, 'email', 'Ponowne przypomnienie o wpłacie', 
    'Dzień dobry,

Wciąż nie odnotowaliśmy wpłaty za fakturę {{invoice_number}}. Prosimy o pilne uregulowanie należności.

Konto: {{bank_account}}

Z poważaniem,
{{company_name}}', NULL);

    -- Step 3: Day 12
    INSERT INTO sequence_steps (sequence_id, step_order, days_offset, channel, email_subject, email_body, sms_body)
    VALUES (standard_id, 3, 12, 'email', 'WEZWANIE DO ZAPŁATY - {{invoice_number}}', 
    'Szanowni Państwo,

Wzywamy do natychmiastowej zapłaty kwoty {{amount}} wynikającej z faktury {{invoice_number}}.

Brak wpłaty spowoduje naliczenie odsetek.

Link: {{payment_link}}

Z poważaniem,
Dział Rozliczeń {{company_name}}', NULL);

    -- Step 4: Day 22 (Email)
    INSERT INTO sequence_steps (sequence_id, step_order, days_offset, channel, email_subject, email_body, sms_body)
    VALUES (standard_id, 4, 22, 'email', 'OSTATECZNE WEZWANIE PRZEDSĄDOWE', 
    'PILNE.

To ostateczne wezwanie do zapłaty faktury {{invoice_number}}. Sprawa zostanie skierowana do windykacji i rejestru długów, jeśli wpłata nie wpłynie w ciągu 3 dni.

Prosimy o natychmiastowy przelew.

{{company_name}}', NULL);

    -- Step 5: Day 22 (SMS)
    INSERT INTO sequence_steps (sequence_id, step_order, days_offset, channel, email_subject, email_body, sms_body)
    VALUES (standard_id, 5, 22, 'sms', NULL, '',
    'PILNE: Brak wplaty za FV {{invoice_number}} ({{amount}}). Ostatnie wezwanie przed windykacja. Zaplac teraz: {{payment_link}}');

    -- Step 6: Day 35
    INSERT INTO sequence_steps (sequence_id, step_order, days_offset, channel, email_subject, email_body, sms_body)
    VALUES (standard_id, 6, 35, 'email', 'Przekazanie sprawy do windykacji', 
    'Informujemy o rozpoczęciu procedury windykacyjnej w sprawie faktury {{invoice_number}}.

Prosimy o kontakt w celu ustalenia polubownego rozwiązania.

{{company_name}}', NULL);


    -- 3. Szybka Eskalacja (Rapid)
    INSERT INTO sequences (user_id, name, description, is_default)
    VALUES (target_user_id, 'Szybka Eskalacja', 'Agresywna windykacja w 14 dni. Dla ryzykownych klientów.', false)
    RETURNING id INTO rapid_id;

    -- Step 1: Day 1
    INSERT INTO sequence_steps (sequence_id, step_order, days_offset, channel, email_subject, email_body, sms_body)
    VALUES (rapid_id, 1, 1, 'email', 'WEZWANIE DO ZAPŁATY - {{invoice_number}}', 
    'Dzień dobry,

Brak wpłaty dla faktury {{invoice_number}} (termin minął wczoraj). Oczekujemy natychmiastowego przelewu.

Kwota: {{amount}}
Link: {{payment_link}}

{{company_name}}', NULL);

    -- Step 2: Day 7 (Email)
    INSERT INTO sequence_steps (sequence_id, step_order, days_offset, channel, email_subject, email_body, sms_body)
    VALUES (rapid_id, 2, 7, 'email', 'OSTATECZNE WEZWANIE - Groźba wpisu do BIG', 
    'PILNE.

Termin minął tydzień temu. Jeśli wpłata nie wpłynie jutro, kierujemy sprawę do sądu i rejestru dłużników.

Kwota: {{amount_with_interest}}

Opłać teraz: {{payment_link}}

{{company_name}}', NULL);

    -- Step 3: Day 7 (SMS)
    INSERT INTO sequence_steps (sequence_id, step_order, days_offset, channel, email_subject, email_body, sms_body)
    VALUES (rapid_id, 3, 7, 'sms', NULL, '',
    'OSTATNIA SZANSA: FV {{invoice_number}} trafi jutro do sadu. Kwota: {{amount_with_interest}}. Link: {{payment_link}}');

    -- Step 4: Day 14
    INSERT INTO sequence_steps (sequence_id, step_order, days_offset, channel, email_subject, email_body, sms_body)
    VALUES (rapid_id, 4, 14, 'email', 'Skierowanie do windykacji zewnętrznej', 
    'Szanowni Państwo,

Z powodu braku reakcji sprawa długu {{invoice_number}} została przekazana do obsługi zewnętrznej.

Koszty windykacji zostaną doliczone do długu.

{{company_name}}', NULL);

END;
$$;

-- Trigger to create sequences for new users
CREATE OR REPLACE FUNCTION trigger_create_sequences_for_new_user()
RETURNS TRIGGER 
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
    PERFORM create_default_sequences(NEW.id);
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created_sequences ON auth.users;
CREATE TRIGGER on_auth_user_created_sequences
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION trigger_create_sequences_for_new_user();

-- Seed for existing users who don't have sequences yet
DO $$
DECLARE
    user_record RECORD;
BEGIN
    FOR user_record IN SELECT id FROM auth.users LOOP
        -- Check if user already has sequences to avoid duplication if migration runs multiple times
        IF NOT EXISTS (SELECT 1 FROM sequences WHERE user_id = user_record.id AND name = 'Windykacja Standardowa') THEN
             PERFORM create_default_sequences(user_record.id);
        END IF;
    END LOOP;
END $$;
