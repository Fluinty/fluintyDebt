-- Migration: Update default sequences to polite versions
-- Run this in Supabase Dashboard > SQL Editor

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
    -- 1. Łagodna (Gentle) - 3 steps
    INSERT INTO sequences (user_id, name, description, is_default)
    VALUES (target_user_id, 'Łagodna', 'Delikatna sekwencja dla klientów VIP i dobrych płatników.', false)
    RETURNING id INTO gentle_id;

    -- Step 1: +3 days (Email)
    INSERT INTO sequence_steps (sequence_id, step_order, days_offset, channel, email_subject, email_body, sms_body)
    VALUES (gentle_id, 1, 3, 'email', 'Informacja o zaległej płatności za fakturę {{invoice_number}}',
    'Dzień dobry,

Informujemy, że w naszym systemie wciąż figuruje brak wpłaty za fakturę nr {{invoice_number}} na kwotę {{amount}}. Będziemy wdzięczni za weryfikację Państwa przelewów i uregulowanie płatności w wolnej chwili. Jeśli przelew został już zlecony, prosimy o zignorowanie tej wiadomości.

Z pozdrowieniami,
{{company_name}}', NULL);

    -- Step 2: +14 days (Email)
    INSERT INTO sequence_steps (sequence_id, step_order, days_offset, channel, email_subject, email_body, sms_body)
    VALUES (gentle_id, 2, 14, 'email', 'Prośba o uregulowanie wpłaty - faktura {{invoice_number}}',
    'Szanowni Państwo,

Uprzejmie przypominamy o zaległej płatności za fakturę nr {{invoice_number}} na kwotę {{amount}}.

Prosimy o uregulowanie należności w dbałości o nasze dobre relacje biznesowe.

Z wyrazami szacunku,
{{company_name}}', NULL);

    -- Step 3: +30 days (Email)
    INSERT INTO sequence_steps (sequence_id, step_order, days_offset, channel, email_subject, email_body, sms_body)
    VALUES (gentle_id, 3, 30, 'email', 'Ostateczna prośba o kontakt faktura {{invoice_number}}',
    'Szanowni Państwo,

Mimo wcześniejszych próśb kontaktu nadal nie odnotowaliśmy wpłaty kwoty {{amount}} za dokument nr {{invoice_number}}. Bardzo prosimy o kontakt w celu wyjaśnienia sytuacji lub o opłacenie zadłużenia, abyśmy mogli zamknąć sprawę polubownie.

Z poważaniem,
{{company_name}}', NULL);


    -- 2. Standardowa (Standard) - 5 steps
    INSERT INTO sequences (user_id, name, description, is_default)
    VALUES (target_user_id, 'Standardowa', 'Domyślna sekwencja dla większości kontrahentów.', true)
    RETURNING id INTO standard_id;

    -- Step 1: +1 day (Email)
    INSERT INTO sequence_steps (sequence_id, step_order, days_offset, channel, email_subject, email_body, sms_body)
    VALUES (standard_id, 1, 1, 'email', 'Informacja o braku płatności, faktura {{invoice_number}}',
    'Dzień dobry,

Wczoraj minął termin płatności na kwotę {{amount}} z tytułu faktury {{invoice_number}}. Jeśli to tylko przeoczenie, bardzo prosimy o uregulowanie należności w najbliższym czasie. Dziękujemy za współpracę!

{{company_name}}', NULL);

    -- Step 2: +7 days (Email)
    INSERT INTO sequence_steps (sequence_id, step_order, days_offset, channel, email_subject, email_body, sms_body)
    VALUES (standard_id, 2, 7, 'email', 'Ponowna prośba o wpłatę - dokument {{invoice_number}}',
    'Szanowni Państwo,

Niestety wciąż nie odnotowaliśmy przelewu na kwotę {{amount}} za fakturę {{invoice_number}}. Jeśli natrafili Państwo na jakieś problemy z płatnością, prosimy o kontakt. W przeciwnym razie serdecznie prosimy o jej uregulowanie.

Z poważaniem,
{{company_name}}', NULL);

    -- Step 3: +14 days (Email)
    INSERT INTO sequence_steps (sequence_id, step_order, days_offset, channel, email_subject, email_body, sms_body)
    VALUES (standard_id, 3, 14, 'email', 'Wezwanie do zapłaty zaległości z faktury {{invoice_number}}',
    'Szanowni Państwo,

Z przykrością informujemy, że płatność na sumę {{amount}} z faktury nr {{invoice_number}} wciąż nie wpłynęła. Zależy nam na dobrej współpracy, dlatego prosimy o priorytetowe zrealizowanie przelewu na powyższą kwotę.

Z wyrazami szacunku,
{{company_name}}', NULL);

    -- Step 4: +14 days (SMS)
    INSERT INTO sequence_steps (sequence_id, step_order, days_offset, channel, email_subject, email_body, sms_body)
    VALUES (standard_id, 4, 14, 'sms', NULL, '',
    'Dzien dobry. Wciaz nie odnotowalismy wplaty {{amount}} za fv {{invoice_number}}. Bardzo prosimy o uregulowanie naleznosci. {{company_name}}');

    -- Step 5: +30 days (Email)
    INSERT INTO sequence_steps (sequence_id, step_order, days_offset, channel, email_subject, email_body, sms_body)
    VALUES (standard_id, 5, 30, 'email', 'Przedsądowe wezwanie do zapłaty (faktura {{invoice_number}})',
    'Szanowni Państwo,

Bardzo chcielibyśmy polubownie zamknąć kwestię zaległości na kwotę {{amount}} (dotyczy faktury nr {{invoice_number}}). To już nasze ostateczne wezwanie — prosimy o uregulowanie salda, by uniknąć ewentualnego zaangażowania zewnętrznej windykacji.

{{company_name}}', NULL);


    -- 3. Szybka Eskalacja (Quick) - 7 steps
    INSERT INTO sequences (user_id, name, description, is_default)
    VALUES (target_user_id, 'Szybka Eskalacja', 'Intensywna sekwencja dla trudnych kontrahentów lub dużych kwot.', false)
    RETURNING id INTO rapid_id;

    -- Step 1: +1 day (Email)
    INSERT INTO sequence_steps (sequence_id, step_order, days_offset, channel, email_subject, email_body, sms_body)
    VALUES (rapid_id, 1, 1, 'email', 'Informacja o braku płatności, faktura {{invoice_number}}',
    'Dzień dobry,

Wczoraj minął termin płatności na kwotę {{amount}} z tytułu faktury {{invoice_number}}. Jeśli to tylko przeoczenie, bardzo prosimy o uregulowanie należności w najbliższym czasie. Dziękujemy za współpracę!

{{company_name}}', NULL);

    -- Step 2: +3 days (Email)
    INSERT INTO sequence_steps (sequence_id, step_order, days_offset, channel, email_subject, email_body, sms_body)
    VALUES (rapid_id, 2, 3, 'email', 'Drugie przypomnienie o wpłacie {{invoice_number}}',
    'Szanowni Państwo,

To drugie przypomnienie o braku wpłaty {{amount}} za dokument {{invoice_number}}. Będziemy bardzo wdzięczni za pilne wykonanie przelewu.

{{company_name}}', NULL);

    -- Step 3: +7 days (Email)
    INSERT INTO sequence_steps (sequence_id, step_order, days_offset, channel, email_subject, email_body, sms_body)
    VALUES (rapid_id, 3, 7, 'email', 'Zawiadomienie o zadłużeniu {{invoice_number}}',
    'Szanowni Państwo,

Wciąż brakuje nam uregulowania kwoty {{amount}} za fakturę {{invoice_number}}. Prosimy o możliwie natychmiastową reakcję i dokonanie przelewu.

Z poważaniem,
{{company_name}}', NULL);

    -- Step 4: +14 days (Email)
    INSERT INTO sequence_steps (sequence_id, step_order, days_offset, channel, email_subject, email_body, sms_body)
    VALUES (rapid_id, 4, 14, 'email', 'Ostatnie przedsądowe wezwanie {{invoice_number}}',
    'Szanowni Państwo,

Przypominamy o zaległych {{amount}} (FV {{invoice_number}}). Zwracamy się z ogromną prośbą o zamknięcie tej sprawy w sposób polubowny i wysłanie środków.

{{company_name}}', NULL);

    -- Step 5: +14 days (SMS)
    INSERT INTO sequence_steps (sequence_id, step_order, days_offset, channel, email_subject, email_body, sms_body)
    VALUES (rapid_id, 5, 14, 'sms', NULL, '',
    'PILNE: Przypominamy o braku wplaty {{amount}} (fv {{invoice_number}}). Zalezy nam na polubownym zamknieciu sprawy. Prosimy o przelew. {{company_name}}');

    -- Step 6: +21 days (Email)
    INSERT INTO sequence_steps (sequence_id, step_order, days_offset, channel, email_subject, email_body, sms_body)
    VALUES (rapid_id, 6, 21, 'email', 'Ostateczne wezwanie - faktura {{invoice_number}}',
    'Szanowni Państwo,

Zwracamy się z wezwaniem o natychmiastowe uregulowanie opóźnionego zadłużenia za fakturę {{invoice_number}} na łączną kwotę {{amount}}. W przypadku braku wpłaty będziemy zmuszeni skierować sprawę na drogę prawną.

{{company_name}}', NULL);

    -- Step 7: +30 days (Email)
    INSERT INTO sequence_steps (sequence_id, step_order, days_offset, channel, email_subject, email_body, sms_body)
    VALUES (rapid_id, 7, 30, 'email', 'Informacja o przekazaniu sprawy {{invoice_number}}',
    'Szanowni Państwo,

Z uwagi na brak odpowiedzi i uregulowania faktury {{invoice_number}} na {{amount}}, informujemy o konieczności przekazania sprawy do zewnętrznej windykacji. Prosimy o pilną wpłatę.

{{company_name}}', NULL);

END;
$$;

-- ================================================================
-- UPDATE EXISTING USERS' SEQUENCES
-- Rename old sequences and update their descriptions
-- ================================================================

-- Rename "Windykacja Łagodna" → "Łagodna" and update description
UPDATE sequences
SET 
    name = 'Łagodna',
    description = 'Delikatna sekwencja dla klientów VIP i dobrych płatników.'
WHERE name IN ('Windykacja Łagodna', 'Łagodna windykacja');

-- Rename "Windykacja Standardowa" → "Standardowa" and update description
UPDATE sequences
SET 
    name = 'Standardowa',
    description = 'Domyślna sekwencja dla większości kontrahentów.'
WHERE name IN ('Windykacja Standardowa', 'Standardowa windykacja');

-- Update "Szybka Eskalacja" description (name stays the same)
UPDATE sequences
SET 
    description = 'Intensywna sekwencja dla trudnych kontrahentów lub dużych kwot.'
WHERE name = 'Szybka Eskalacja';
