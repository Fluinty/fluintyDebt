-- Migration: Create ksef-certificates Storage bucket
-- Each user can only access files in their own folder: {user_id}/filename

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'ksef-certificates',
    'ksef-certificates',
    false,           -- private bucket, no public URLs
    1048576,         -- 1MB limit per file
    ARRAY[
        'application/x-pem-file',
        'application/pkcs8',
        'application/x-pkcs12',
        'application/octet-stream',
        'text/plain'
    ]
)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to UPLOAD their own certs
CREATE POLICY IF NOT EXISTS "Users can upload own ksef certs"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'ksef-certificates' AND
    (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow authenticated users to UPDATE (upsert) their own certs
CREATE POLICY IF NOT EXISTS "Users can update own ksef certs"
ON storage.objects FOR UPDATE
TO authenticated
USING (
    bucket_id = 'ksef-certificates' AND
    (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow authenticated users to READ their own certs (server-side only)
CREATE POLICY IF NOT EXISTS "Users can read own ksef certs"
ON storage.objects FOR SELECT
TO authenticated
USING (
    bucket_id = 'ksef-certificates' AND
    (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow authenticated users to DELETE their own certs
CREATE POLICY IF NOT EXISTS "Users can delete own ksef certs"
ON storage.objects FOR DELETE
TO authenticated
USING (
    bucket_id = 'ksef-certificates' AND
    (storage.foldername(name))[1] = auth.uid()::text
);
