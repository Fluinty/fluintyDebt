-- Update existing sequences with English translations

-- ==========================================
-- 1. Standardowa (STANDARD_SEQUENCE)
-- ==========================================

-- Step 1 (email)
UPDATE sequence_steps ss
SET 
  email_subject_en = 'Payment reminder - Due in one week',
  email_body_en = 'Dear Customer,

This is a friendly reminder that payment for invoice {{invoice_number}} in the amount of {{amount}} is due on {{due_date}}.

If you have already made the payment, please disregard this message.

Best regards,
{{company_name}}'
FROM sequences s
WHERE s.id = ss.sequence_id AND s.name = 'Standardowa' AND ss.step_order = 1;

-- Step 2 (email)
UPDATE sequence_steps ss
SET 
  email_subject_en = 'Payment due tomorrow - {{invoice_number}}',
  email_body_en = 'Dear Customer,

This is a reminder that invoice {{invoice_number}} for {{amount}} is due tomorrow ({{due_date}}).

To avoid interest charges, please make your payment on time.

{{payment_link}}

Best regards,
{{company_name}}'
FROM sequences s
WHERE s.id = ss.sequence_id AND s.name = 'Standardowa' AND ss.step_order = 2;

-- Step 3 (email)
UPDATE sequence_steps ss
SET 
  email_subject_en = 'Payment overdue - {{invoice_number}}',
  email_body_en = 'Dear Customer,

Please be advised that invoice {{invoice_number}} for {{amount}} was due yesterday.

We kindly ask you to settle this payment promptly.

{{payment_link}}

Best regards,
{{company_name}}'
FROM sequences s
WHERE s.id = ss.sequence_id AND s.name = 'Standardowa' AND ss.step_order = 3;

-- Step 4 (both)
UPDATE sequence_steps ss
SET 
  email_subject_en = 'Payment Request - Invoice Overdue',
  email_body_en = 'Dear Customer,

Invoice {{invoice_number}} is now {{days_overdue}} days overdue.

Amount due: {{amount}}

Please settle this payment immediately. If you are experiencing payment difficulties, please contact us to arrange a payment plan.

{{payment_link}}

Best regards,
{{company_name}}',
  sms_body_en = 'Invoice {{invoice_number}} is {{days_overdue}} days overdue. Amount: {{amount}}. Please pay urgently. {{company_name}}'
FROM sequences s
WHERE s.id = ss.sequence_id AND s.name = 'Standardowa' AND ss.step_order = 4;

-- Step 5 (email)
UPDATE sequence_steps ss
SET 
  email_subject_en = 'PAYMENT DEMAND with interest - {{invoice_number}}',
  email_body_en = 'Dear Customer,

Despite previous requests, invoice {{invoice_number}} remains unpaid.

Principal amount: {{amount}}
Accrued interest: {{interest_amount}}
TOTAL DUE: {{amount_with_interest}}

Please settle the full amount within 7 days.

{{payment_link}}

Best regards,
{{company_name}}'
FROM sequences s
WHERE s.id = ss.sequence_id AND s.name = 'Standardowa' AND ss.step_order = 5;

-- Step 6 (email)
UPDATE sequence_steps ss
SET 
  email_subject_en = 'FINAL PAYMENT DEMAND - {{invoice_number}}',
  email_body_en = 'Dear Customer,

We hereby demand IMMEDIATE payment of the outstanding amount for invoice {{invoice_number}}.

Principal amount: {{amount}}
Accrued interest: {{interest_amount}}
TOTAL DUE: {{amount_with_interest}}

Failure to pay within 7 days of receiving this notice will result in the matter being referred for further collection action, which will incur additional costs.

{{payment_link}}

{{company_name}}'
FROM sequences s
WHERE s.id = ss.sequence_id AND s.name = 'Standardowa' AND ss.step_order = 6;


-- ==========================================
-- 2. Łagodna (GENTLE_SEQUENCE)
-- ==========================================

-- Step 1 (email)
UPDATE sequence_steps ss
SET 
  email_subject_en = 'Reminder - Payment due soon',
  email_body_en = 'Dear Customer,

This is a friendly reminder that payment for invoice {{invoice_number}} in the amount of {{amount}} is due in 3 days.

If you have already made the payment, please disregard this message.

Best regards,
{{company_name}}'
FROM sequences s
WHERE s.id = ss.sequence_id AND s.name = 'Łagodna' AND ss.step_order = 1;

-- Step 2 (email)
UPDATE sequence_steps ss
SET 
  email_subject_en = 'Payment overdue notification',
  email_body_en = 'Dear Customer,

Please be advised that invoice {{invoice_number}} for {{amount}} is now {{days_overdue}} days past due.

We kindly ask you to settle this payment at your earliest convenience.

{{payment_link}}

Best regards,
{{company_name}}'
FROM sequences s
WHERE s.id = ss.sequence_id AND s.name = 'Łagodna' AND ss.step_order = 2;

-- Step 3 (email)
UPDATE sequence_steps ss
SET 
  email_subject_en = 'Payment Request - {{invoice_number}}',
  email_body_en = 'Dear Customer,

Invoice {{invoice_number}} remains unpaid for {{days_overdue}} days.

Principal amount: {{amount}}
Accrued interest: {{interest_amount}}
TOTAL: {{amount_with_interest}}

Please settle this amount urgently.

{{payment_link}}

Best regards,
{{company_name}}'
FROM sequences s
WHERE s.id = ss.sequence_id AND s.name = 'Łagodna' AND ss.step_order = 3;

-- Step 4 (email)
UPDATE sequence_steps ss
SET 
  email_subject_en = 'Final Payment Notice - {{invoice_number}}',
  email_body_en = 'Dear Customer,

Despite previous reminders, invoice {{invoice_number}} remains unpaid.

Principal amount: {{amount}}
Accrued interest: {{interest_amount}}
TOTAL DUE: {{amount_with_interest}}

This is a final notice before further collection action is taken.

{{payment_link}}

{{company_name}}'
FROM sequences s
WHERE s.id = ss.sequence_id AND s.name = 'Łagodna' AND ss.step_order = 4;


-- ==========================================
-- 3. Szybka Eskalacja (QUICK_ESCALATION_SEQUENCE)
-- ==========================================

-- Step 1 (email)
UPDATE sequence_steps ss
SET 
  email_subject_en = 'Payment reminder - Due date approaching',
  email_body_en = 'Dear Customer,

This is a reminder that invoice {{invoice_number}} for {{amount}} is due on {{due_date}}.

Best regards,
{{company_name}}'
FROM sequences s
WHERE s.id = ss.sequence_id AND s.name = 'Szybka Eskalacja' AND ss.step_order = 1;

-- Step 2 (both)
UPDATE sequence_steps ss
SET 
  email_subject_en = 'URGENT: Payment due tomorrow - {{invoice_number}}',
  email_body_en = 'Dear Customer,

URGENT: Invoice {{invoice_number}} for {{amount}} is due tomorrow.

{{payment_link}}

{{company_name}}',
  sms_body_en = 'URGENT: Invoice {{invoice_number}} for {{amount}} is due tomorrow {{due_date}}. {{company_name}}'
FROM sequences s
WHERE s.id = ss.sequence_id AND s.name = 'Szybka Eskalacja' AND ss.step_order = 2;

-- Step 3 (email)
UPDATE sequence_steps ss
SET 
  email_subject_en = 'Payment overdue - {{invoice_number}}',
  email_body_en = 'Dear Customer,

Invoice {{invoice_number}} is now overdue. Please make an immediate payment of {{amount}}.

{{payment_link}}

{{company_name}}'
FROM sequences s
WHERE s.id = ss.sequence_id AND s.name = 'Szybka Eskalacja' AND ss.step_order = 3;

-- Step 4 (both)
UPDATE sequence_steps ss
SET 
  email_subject_en = 'SECOND NOTICE - Invoice {{invoice_number}}',
  email_body_en = 'Dear Customer,

This is our second notice regarding invoice {{invoice_number}}, which is now {{days_overdue}} days overdue.

Amount: {{amount}}

Please contact us or make payment immediately.

{{payment_link}}

{{company_name}}',
  sms_body_en = 'SECOND NOTICE: Invoice {{invoice_number}} is {{days_overdue}} days overdue. {{amount}}. Please contact us. {{company_name}}'
FROM sequences s
WHERE s.id = ss.sequence_id AND s.name = 'Szybka Eskalacja' AND ss.step_order = 4;

-- Step 5 (email)
UPDATE sequence_steps ss
SET 
  email_subject_en = 'THIRD NOTICE with interest - {{invoice_number}}',
  email_body_en = 'Dear Customer,

This is our third notice regarding invoice {{invoice_number}}.

Principal amount: {{amount}}
Interest: {{interest_amount}}
TOTAL: {{amount_with_interest}}

{{payment_link}}

{{company_name}}'
FROM sequences s
WHERE s.id = ss.sequence_id AND s.name = 'Szybka Eskalacja' AND ss.step_order = 5;

-- Step 6 (both)
UPDATE sequence_steps ss
SET 
  email_subject_en = 'PENULTIMATE NOTICE - {{invoice_number}}',
  email_body_en = 'Dear Customer,

This is our penultimate notice before the matter is referred for collection.

Invoice: {{invoice_number}}
Amount with interest: {{amount_with_interest}}

{{payment_link}}

{{company_name}}',
  sms_body_en = 'PENULTIMATE NOTICE: Invoice {{invoice_number}} - {{amount_with_interest}}. Next step: collection. {{company_name}}'
FROM sequences s
WHERE s.id = ss.sequence_id AND s.name = 'Szybka Eskalacja' AND ss.step_order = 6;

-- Step 7 (email)
UPDATE sequence_steps ss
SET 
  email_subject_en = 'FINAL DEMAND - {{invoice_number}}',
  email_body_en = 'Dear Customer,

FINAL PAYMENT DEMAND

Invoice: {{invoice_number}}
Principal amount: {{amount}}
Interest: {{interest_amount}}
TOTAL DUE: {{amount_with_interest}}

Failure to pay within 3 business days will result in collection proceedings.

{{payment_link}}

{{company_name}}'
FROM sequences s
WHERE s.id = ss.sequence_id AND s.name = 'Szybka Eskalacja' AND ss.step_order = 7;

-- Step 8 (both)
UPDATE sequence_steps ss
SET 
  email_subject_en = 'FINAL WARNING - Referral to collection agency',
  email_body_en = 'Dear Customer,

Please be advised that the matter regarding invoice {{invoice_number}} for {{amount_with_interest}} will be referred to an external collection agency within the coming days.

This will result in additional costs that will be charged to you.

This is your last opportunity to resolve this matter amicably.

{{payment_link}}

{{company_name}}',
  sms_body_en = 'FINAL WARNING: Invoice {{invoice_number}} being referred to collection. Please contact us urgently. {{company_name}}'
FROM sequences s
WHERE s.id = ss.sequence_id AND s.name = 'Szybka Eskalacja' AND ss.step_order = 8;
