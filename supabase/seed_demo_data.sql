
-- SQL SEED SCRIPT FOR DEMO DATA (FIXED)
-- Run this in Supabase SQL Editor to populate data for user: adam.nelip@gmail.com
-- ID: 41082330-312a-4b49-96d6-aaf84572eff4

DO $$
DECLARE
    -- The Target User ID
    u_id UUID := '41082330-312a-4b49-96d6-aaf84572eff4'; 
    
    -- Variables for IDs
    d_translog UUID;
    d_budex UUID;
    d_sklep UUID;
    d_marketing UUID;
    d_kowalski UUID;
    
    inv_translog UUID;
    inv_budex1 UUID;
    inv_budex2 UUID;
    
    inv_sklep UUID;
    inv_kowalski1 UUID;
    
    inv_marketing UUID;
    inv_kowalski2 UUID;
BEGIN
    -- 0. Update Profile (Correct column names)
    UPDATE profiles 
    SET 
        company_name = 'Software House Pro Sp. z o.o.',
        company_nip = '5252528734',
        company_address = 'Złota 44',
        company_city = 'Warszawa',
        company_postal_code = '00-120',
        bank_account_number = '12 1020 1234 0000 0002 0304 0506',
        modules = '{"sales": true, "costs": true}'::jsonb
    WHERE id = u_id;

    -- 0b. Update Subscription (In separate table)
    INSERT INTO subscriptions (user_id, status, tier, monthly_invoice_limit, trial_ends_at)
    VALUES (u_id, 'active', 'growth', 9999, NOW() + INTERVAL '30 days')
    ON CONFLICT (user_id) 
    DO UPDATE SET status = 'active', tier = 'growth';

    -- 1. Create Debtors
    
    -- Transport Logistyka
    INSERT INTO debtors (user_id, name, nip, email, phone, city, payment_score)
    VALUES (u_id, 'Transport Logistyka S.A.', '5215215212', 'faktury@translog.com', '+48700800900', 'Gdynia', 15)
    RETURNING id INTO d_translog;

    -- Budex
    INSERT INTO debtors (user_id, name, nip, email, phone, city, payment_score)
    VALUES (u_id, 'Budex Sp. z o.o.', '1234563218', 'ksiegowosc@budex.pl', '+48600100200', 'Kraków', 45)
    RETURNING id INTO d_budex;

    -- Sklep U Ani
    INSERT INTO debtors (user_id, name, nip, email, phone, city, payment_score)
    VALUES (u_id, 'Sklep Wielobranżowy U Ani', '8989891234', 'ania.sklep@gmail.com', '+48500200300', 'Gdańsk', 90)
    RETURNING id INTO d_sklep;

    -- Marketing Studio
    INSERT INTO debtors (user_id, name, nip, email, phone, city, payment_score)
    VALUES (u_id, 'Marketing Studio', '7776665544', 'hello@marketingstudio.pl', '+48690123123', 'Wrocław', 75)
    RETURNING id INTO d_marketing;

    -- Jan Kowalski
    INSERT INTO debtors (user_id, name, nip, email, phone, city, payment_score)
    VALUES (u_id, 'Jan Kowalski IT Services', '9998887766', 'jan.kowalski@it.pl', '+48666555444', 'Poznań', 98)
    RETURNING id INTO d_kowalski;


    -- 2. Create Invoices
    
    -- OVERDUE (Transport Logistyka) - 45 days overdue
    INSERT INTO invoices (user_id, debtor_id, invoice_number, amount, issue_date, due_date, status, amount_paid)
    VALUES (u_id, d_translog, 'FV/2025/11/05', 12500.00, CURRENT_DATE - 60, CURRENT_DATE - 45, 'overdue', 0)
    RETURNING id INTO inv_translog;

    -- Collection Actions for Translog
    INSERT INTO collection_actions (user_id, invoice_id, action_type, status, sent_at, channel)
    VALUES 
    (u_id, inv_translog, 'email', 'sent', CURRENT_DATE - 40, 'email'),
    (u_id, inv_translog, 'sms', 'sent', CURRENT_DATE - 30, 'sms'),
    (u_id, inv_translog, 'email', 'sent', CURRENT_DATE - 15, 'email'),
    (u_id, inv_translog, 'call', 'sent', CURRENT_DATE - 5, 'voice');


    -- OVERDUE (Budex) - 10 days overdue
    INSERT INTO invoices (user_id, debtor_id, invoice_number, amount, issue_date, due_date, status, amount_paid)
    VALUES (u_id, d_budex, 'FV/2025/12/10', 3450.50, CURRENT_DATE - 24, CURRENT_DATE - 10, 'overdue', 0)
    RETURNING id INTO inv_budex1;

    -- Actions for Budex 
    INSERT INTO collection_actions (user_id, invoice_id, action_type, status, sent_at, channel)
    VALUES (u_id, inv_budex1, 'email', 'sent', CURRENT_DATE - 8, 'email');


    -- FRESH OVERDUE (Budex)
    INSERT INTO invoices (user_id, debtor_id, invoice_number, amount, issue_date, due_date, status, amount_paid)
    VALUES (u_id, d_budex, 'FV/2026/01/02', 1200.00, CURRENT_DATE - 16, CURRENT_DATE - 2, 'overdue', 0)
    RETURNING id INTO inv_budex2;


    -- PAID (Sklep U Ani)
    INSERT INTO invoices (user_id, debtor_id, invoice_number, amount, issue_date, due_date, status, amount_paid, paid_at)
    VALUES (u_id, d_sklep, 'FV/2025/10/01', 500.00, CURRENT_DATE - 100, CURRENT_DATE - 90, 'paid', 500.00, CURRENT_DATE - 92)
    RETURNING id INTO inv_sklep;


    -- PAID (Kowalski)
    INSERT INTO invoices (user_id, debtor_id, invoice_number, amount, issue_date, due_date, status, amount_paid, paid_at)
    VALUES (u_id, d_kowalski, 'FV/2025/12/15', 8000.00, CURRENT_DATE - 16, CURRENT_DATE - 2, 'paid', 8000.00, CURRENT_DATE - 5)
    RETURNING id INTO inv_kowalski1;


    -- PENDING (Marketing Studio)
    INSERT INTO invoices (user_id, debtor_id, invoice_number, amount, issue_date, due_date, status, amount_paid)
    VALUES (u_id, d_marketing, 'FV/2026/01/20', 4500.00, CURRENT_DATE - 9, CURRENT_DATE + 5, 'pending', 0)
    RETURNING id INTO inv_marketing;
    
    -- PENDING (Kowalski)
    INSERT INTO invoices (user_id, debtor_id, invoice_number, amount, issue_date, due_date, status, amount_paid)
    VALUES (u_id, d_kowalski, 'FV/2026/01/25', 25000.00, CURRENT_DATE - 1, CURRENT_DATE + 14, 'pending', 0)
    RETURNING id INTO inv_kowalski2;


    -- 3. Create Cost Invoices (Expenses)
    INSERT INTO cost_invoices (user_id, contractor_name, contractor_nip, invoice_number, amount, currency, issue_date, due_date, payment_status, category)
    VALUES 
    (u_id, 'Google Ireland Ltd', 'IE6388047V', 'G/2025/12412', 150.00, 'PLN', CURRENT_DATE - 20, CURRENT_DATE - 5, 'paid', 'Software'),
    (u_id, 'Amazon Web Services', 'US12345678', 'AWS-EU-12345', 456.78, 'PLN', CURRENT_DATE - 15, CURRENT_DATE - 1, 'to_pay', 'Hosting'),
    (u_id, 'Accounting Pro', '1112223344', 'F/12/2025', 1200.00, 'PLN', CURRENT_DATE - 10, CURRENT_DATE + 4, 'to_pay', 'Accounting'),
    (u_id, 'Office Rent Sp. z o.o.', '5556667788', 'NC/01/2026', 3500.00, 'PLN', CURRENT_DATE - 5, CURRENT_DATE + 10, 'to_pay', 'Rent');
    
    RAISE NOTICE 'Seed data inserted successfully for user %', u_id;
END $$;
