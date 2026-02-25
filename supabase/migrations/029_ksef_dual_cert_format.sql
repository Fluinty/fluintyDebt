-- Add columns for dual cert format support (PEM .crt+.key alongside existing P12)
ALTER TABLE user_ksef_settings 
    ADD COLUMN IF NOT EXISTS ksef_key_storage_path TEXT,
    ADD COLUMN IF NOT EXISTS ksef_cert_format TEXT DEFAULT 'p12' CHECK (ksef_cert_format IN ('p12', 'pem'));
