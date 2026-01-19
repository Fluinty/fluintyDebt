-- ============================================
-- VindycAItion - Seed System Default Sequences
-- ============================================
-- Run this AFTER running 002_system_sequences.sql
-- These sequences are visible to ALL users (user_id = NULL)

-- Check if system sequences already exist
DO $$
DECLARE
    v_seq_id UUID;
BEGIN
    -- Skip if system sequences already exist
    IF EXISTS (SELECT 1 FROM sequences WHERE user_id IS NULL AND is_system = TRUE) THEN
        RAISE NOTICE 'System sequences already exist. Skipping.';
        RETURN;
    END IF;

    -- ========================================
    -- Sequence 1: Łagodna (Gentle) - SYSTEM
    -- ========================================
    INSERT INTO sequences (user_id, name, description, is_default, is_system)
    VALUES (NULL, 'Łagodna', 'Delikatna sekwencja dla klientów VIP i dobrych płatników', false, true)
    RETURNING id INTO v_seq_id;

    INSERT INTO sequence_steps (sequence_id, step_order, days_offset, channel, email_subject, email_body, include_payment_link, include_interest) VALUES
    (v_seq_id, 1, -3, 'email', 'Przypomnienie - zbliżający się termin płatności', 
     E'Dzień dobry,\n\nUprzejmie przypominamy, że za 3 dni mija termin płatności faktury nr {{invoice_number}} na kwotę {{amount}}.\n\nJeśli płatność została już zrealizowana, prosimy zignorować tę wiadomość.\n\nZ poważaniem,\n{{company_name}}',
     false, false),
    (v_seq_id, 2, 3, 'email', 'Informacja o przekroczeniu terminu płatności',
     E'Dzień dobry,\n\nInformujemy, że faktura nr {{invoice_number}} na kwotę {{amount}} przekroczyła termin płatności o {{days_overdue}} dni.\n\nProsimy o uregulowanie należności w najbliższym możliwym terminie.\n\n{{payment_link}}\n\nZ poważaniem,\n{{company_name}}',
     true, false),
    (v_seq_id, 3, 14, 'email', 'Wezwanie do zapłaty - {{invoice_number}}',
     E'Szanowni Państwo,\n\nFaktura nr {{invoice_number}} pozostaje nieopłacona od {{days_overdue}} dni.\n\nNależność główna: {{amount}}\nNaliczone odsetki: {{interest_amount}}\nRAZEM: {{amount_with_interest}}\n\nProsimy o pilne uregulowanie należności.\n\n{{payment_link}}\n\nZ poważaniem,\n{{company_name}}',
     true, true),
    (v_seq_id, 4, 30, 'email', 'Ostateczne wezwanie do zapłaty - {{invoice_number}}',
     E'Szanowni Państwo,\n\nPomimo wcześniejszych monitów, faktura nr {{invoice_number}} pozostaje nieopłacona.\n\nNależność główna: {{amount}}\nNaliczone odsetki: {{interest_amount}}\nRAZEM DO ZAPŁATY: {{amount_with_interest}}\n\nJest to ostateczne wezwanie przed przekazaniem sprawy do dalszego postępowania.\n\n{{payment_link}}\n\n{{company_name}}',
     true, true);

    RAISE NOTICE 'Created SYSTEM sequence: Łagodna with 4 steps';

    -- ========================================
    -- Sequence 2: Standardowa (Standard) - SYSTEM DEFAULT
    -- ========================================
    INSERT INTO sequences (user_id, name, description, is_default, is_system)
    VALUES (NULL, 'Standardowa', 'Domyślna sekwencja dla większości kontrahentów', true, true)
    RETURNING id INTO v_seq_id;

    INSERT INTO sequence_steps (sequence_id, step_order, days_offset, channel, email_subject, email_body, sms_body, include_payment_link, include_interest) VALUES
    (v_seq_id, 1, -7, 'email', 'Przypomnienie o zbliżającym się terminie płatności',
     E'Dzień dobry,\n\nUprzejmie przypominamy, że za tydzień, tj. {{due_date}}, mija termin płatności faktury nr {{invoice_number}} na kwotę {{amount}}.\n\nJeśli płatność została już zrealizowana, prosimy zignorować tę wiadomość.\n\nZ poważaniem,\n{{company_name}}',
     NULL, false, false),
    (v_seq_id, 2, -1, 'email', 'Jutro mija termin płatności - {{invoice_number}}',
     E'Dzień dobry,\n\nPrzypominamy, że jutro ({{due_date}}) mija termin płatności faktury nr {{invoice_number}} na kwotę {{amount}}.\n\nAby uniknąć naliczania odsetek, prosimy o terminową wpłatę.\n\n{{payment_link}}\n\nZ poważaniem,\n{{company_name}}',
     NULL, true, false),
    (v_seq_id, 3, 1, 'email', 'Termin płatności minął - {{invoice_number}}',
     E'Dzień dobry,\n\nInformujemy, że wczoraj minął termin płatności faktury nr {{invoice_number}} na kwotę {{amount}}.\n\nProsimy o pilne uregulowanie należności.\n\n{{payment_link}}\n\nZ poważaniem,\n{{company_name}}',
     NULL, true, false),
    (v_seq_id, 4, 7, 'both', 'Wezwanie do zapłaty - faktura przeterminowana',
     E'Szanowni Państwo,\n\nFaktura nr {{invoice_number}} jest przeterminowana o {{days_overdue}} dni.\n\nKwota do zapłaty: {{amount}}\n\nProsimy o niezwłoczne uregulowanie należności.\n\n{{payment_link}}\n\nZ poważaniem,\n{{company_name}}',
     'Faktura {{invoice_number}} przeterminowana o {{days_overdue}} dni. Kwota: {{amount}}. Prosimy o pilną wpłatę. {{company_name}}',
     true, false),
    (v_seq_id, 5, 14, 'email', 'WEZWANIE DO ZAPŁATY z odsetkami - {{invoice_number}}',
     E'Szanowni Państwo,\n\nPomimo wcześniejszych wezwań, faktura nr {{invoice_number}} pozostaje nieopłacona.\n\nNależność główna: {{amount}}\nNaliczone odsetki: {{interest_amount}}\nRAZEM DO ZAPŁATY: {{amount_with_interest}}\n\nProsimy o uregulowanie pełnej kwoty w ciągu 7 dni.\n\n{{payment_link}}\n\nZ poważaniem,\n{{company_name}}',
     NULL, true, true),
    (v_seq_id, 6, 30, 'email', 'OSTATECZNE WEZWANIE DO ZAPŁATY - {{invoice_number}}',
     E'Szanowni Państwo,\n\nNiniejszym wzywamy do NATYCHMIASTOWEJ zapłaty należności wynikającej z faktury nr {{invoice_number}}.\n\nNależność główna: {{amount}}\nNaliczone odsetki: {{interest_amount}}\nRAZEM DO ZAPŁATY: {{amount_with_interest}}\n\nW przypadku braku wpłaty w terminie 7 dni, sprawa zostanie przekazana do dalszego postępowania windykacyjnego.\n\n{{payment_link}}\n\n{{company_name}}',
     NULL, true, true);

    RAISE NOTICE 'Created SYSTEM sequence: Standardowa with 6 steps (DEFAULT)';

    -- ========================================
    -- Sequence 3: Szybka Eskalacja - SYSTEM
    -- ========================================
    INSERT INTO sequences (user_id, name, description, is_default, is_system)
    VALUES (NULL, 'Szybka Eskalacja', 'Intensywna sekwencja dla trudnych kontrahentów lub dużych kwot', false, true)
    RETURNING id INTO v_seq_id;

    INSERT INTO sequence_steps (sequence_id, step_order, days_offset, channel, email_subject, email_body, sms_body, include_payment_link, include_interest) VALUES
    (v_seq_id, 1, -7, 'email', 'Przypomnienie o zbliżającym się terminie płatności',
     E'Dzień dobry,\n\nPrzypominamy o zbliżającym się terminie płatności faktury nr {{invoice_number}} na kwotę {{amount}}. Termin płatności: {{due_date}}.\n\nZ poważaniem,\n{{company_name}}',
     NULL, true, false),
    (v_seq_id, 2, -1, 'both', 'PILNE: Jutro termin płatności - {{invoice_number}}',
     E'Dzień dobry,\n\nPILNE: Jutro mija termin płatności faktury nr {{invoice_number}} na kwotę {{amount}}.\n\n{{payment_link}}\n\n{{company_name}}',
     'PILNE: Jutro {{due_date}} mija termin płatności FV {{invoice_number}} - {{amount}}. {{company_name}}',
     true, false),
    (v_seq_id, 3, 1, 'email', 'Termin płatności przekroczony - {{invoice_number}}',
     E'Szanowni Państwo,\n\nTermin płatności faktury nr {{invoice_number}} został przekroczony. Prosimy o natychmiastową wpłatę kwoty {{amount}}.\n\n{{payment_link}}\n\n{{company_name}}',
     NULL, true, false),
    (v_seq_id, 4, 3, 'both', 'DRUGIE WEZWANIE - faktura {{invoice_number}}',
     E'Szanowni Państwo,\n\nTo drugie wezwanie dotyczące faktury nr {{invoice_number}}, która jest już przeterminowana o {{days_overdue}} dni.\n\nKwota: {{amount}}\n\nProsimy o pilny kontakt lub wpłatę.\n\n{{payment_link}}\n\n{{company_name}}',
     'DRUGIE WEZWANIE: FV {{invoice_number}} przeterminowana {{days_overdue}} dni. {{amount}}. Prosimy o kontakt. {{company_name}}',
     true, false),
    (v_seq_id, 5, 7, 'email', 'TRZECIE WEZWANIE z odsetkami - {{invoice_number}}',
     E'Szanowni Państwo,\n\nTo trzecie wezwanie do zapłaty faktury nr {{invoice_number}}.\n\nNależność główna: {{amount}}\nOdsetki: {{interest_amount}}\nRAZEM: {{amount_with_interest}}\n\n{{payment_link}}\n\n{{company_name}}',
     NULL, true, true),
    (v_seq_id, 6, 14, 'both', 'PRZEDOSTATNIE WEZWANIE - {{invoice_number}}',
     E'Szanowni Państwo,\n\nTo przedostatnie wezwanie przed przekazaniem sprawy do postępowania windykacyjnego.\n\nFaktura: {{invoice_number}}\nNależność z odsetkami: {{amount_with_interest}}\n\n{{payment_link}}\n\n{{company_name}}',
     'PRZEDOSTATNIE WEZWANIE: FV {{invoice_number}} - {{amount_with_interest}}. Następny krok: windykacja. {{company_name}}',
     true, true),
    (v_seq_id, 7, 21, 'email', 'OSTATECZNE WEZWANIE - {{invoice_number}}',
     E'Szanowni Państwo,\n\nOSTATECZNE WEZWANIE DO ZAPŁATY\n\nFaktura nr {{invoice_number}}\nNależność główna: {{amount}}\nOdsetki: {{interest_amount}}\nRAZEM DO ZAPŁATY: {{amount_with_interest}}\n\nBrak wpłaty w ciągu 3 dni roboczych skutkować będzie wszczęciem postępowania windykacyjnego.\n\n{{payment_link}}\n\n{{company_name}}',
     NULL, true, true),
    (v_seq_id, 8, 30, 'both', 'OSTATNIE OSTRZEŻENIE - przekazanie do windykacji',
     E'Szanowni Państwo,\n\nInformujemy, że sprawa dotycząca faktury nr {{invoice_number}} na kwotę {{amount_with_interest}} zostanie w najbliższych dniach przekazana do zewnętrznej firmy windykacyjnej.\n\nWiąże się to z dodatkowymi kosztami.\n\nJest to ostatnia szansa na polubowne rozwiązanie sprawy.\n\n{{payment_link}}\n\n{{company_name}}',
     'OSTATNIE OSTRZEŻENIE: FV {{invoice_number}} przekazujemy do windykacji. Prosimy o pilny kontakt. {{company_name}}',
     true, true);

    RAISE NOTICE 'Created SYSTEM sequence: Szybka Eskalacja with 8 steps';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'All 3 SYSTEM sequences created successfully!';
    RAISE NOTICE 'These are visible to ALL users.';
    RAISE NOTICE '========================================';

END $$;

-- Verify the created sequences
SELECT 
    s.name, 
    s.description, 
    s.is_default,
    s.is_system,
    CASE WHEN s.user_id IS NULL THEN 'GLOBAL' ELSE 'USER' END as scope,
    COUNT(st.id) as steps_count
FROM sequences s
LEFT JOIN sequence_steps st ON st.sequence_id = s.id
GROUP BY s.id, s.name, s.description, s.is_default, s.is_system, s.user_id
ORDER BY s.is_system DESC, s.created_at;
