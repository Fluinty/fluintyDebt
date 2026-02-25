-- Migration: Add certificate authentication support to KSeF settings
-- Adds columns for storing encrypted certificate path and password
-- Updates environment check constraint to allow 'production-cert'
-- Creates private storage bucket for certificate files

-- 1. Add certificate columns to user_ksef_settings
ALTER TABLE user_ksef_settings
ADD COLUMN IF NOT EXISTS ksef_cert_format VARCHAR(10) DEFAULT 'token',
ADD COLUMN IF NOT EXISTS ksef_cert_storage_path TEXT,
ADD COLUMN IF NOT EXISTS ksef_key_storage_path TEXT,
ADD COLUMN IF NOT EXISTS ksef_p12_storage_path TEXT,
ADD COLUMN IF NOT EXISTS ksef_cert_password_encrypted TEXT;

-- 2. Migrate existing test environments to production (BEFORE constraint change)
UPDATE user_ksef_settings
SET ksef_environment = 'production'
WHERE ksef_environment = 'test';

-- 3. Update environment check constraint to include 'production-cert'
DO $$
BEGIN
    ALTER TABLE user_ksef_settings DROP CONSTRAINT IF EXISTS user_ksef_settings_ksef_environment_check;
    ALTER TABLE user_ksef_settings DROP CONSTRAINT IF EXISTS ksef_environment_check;
EXCEPTION WHEN OTHERS THEN
    NULL;
END $$;

ALTER TABLE user_ksef_settings
ADD CONSTRAINT user_ksef_settings_ksef_environment_check
CHECK (ksef_environment IN ('production', 'production-cert'));

-- 4. Create private storage bucket for KSeF certificates
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'ksef-certificates',
    'ksef-certificates',
    false,
    2097152, -- 2MB limit
    ARRAY['application/x-pkcs12', 'application/pkcs12']
)
ON CONFLICT (id) DO NOTHING;

-- 4. Storage RLS policies for certificates
-- Users can upload/manage their own certificates
CREATE POLICY "Users can upload their own certificates"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'ksef-certificates'
    AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can view their own certificates"
ON storage.objects
FOR SELECT
TO authenticated
USING (
    bucket_id = 'ksef-certificates'
    AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can update their own certificates"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
    bucket_id = 'ksef-certificates'
    AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can delete their own certificates"
ON storage.objects
FOR DELETE
TO authenticated
USING (
    bucket_id = 'ksef-certificates'
    AND (storage.foldername(name))[1] = auth.uid()::text
);

-- 5. Update existing test environments to production
UPDATE user_ksef_settings
SET ksef_environment = 'production'
WHERE ksef_environment = 'test';
