-- Add thank you email template fields to profiles
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS thank_you_email_subject TEXT,
ADD COLUMN IF NOT EXISTS thank_you_email_body TEXT;

-- Optional: Set some default values?
-- Let's leave them null and handle defaults in UI/Code or set a migration default.
-- Actually, user probably wants a default to start with.
UPDATE profiles 
SET 
  thank_you_email_subject = 'Dziękujemy za wpłatę - {{invoice_number}}',
  thank_you_email_body = 'Cześć {{debtor_name}},\n\nDziękujemy za opłacenie faktury {{invoice_number}}.\n\nPozdrawiamy,\n{{company_name}}'
WHERE thank_you_email_subject IS NULL;
