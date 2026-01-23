-- Migration: Add KSeF integration tables and columns
-- This migration adds support for KSeF (Krajowy System e-Faktur) integration

-- 1. Create table for user KSeF settings
CREATE TABLE IF NOT EXISTS user_ksef_settings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
    
    -- KSeF configuration
    ksef_environment VARCHAR(20) DEFAULT 'test' CHECK (ksef_environment IN ('test', 'production')),
    is_enabled BOOLEAN DEFAULT false,
    
    -- Token stored securely (will use Supabase Vault in production)
    -- For now, we store encrypted token here
    ksef_token_encrypted TEXT,
    ksef_nip VARCHAR(10), -- NIP associated with KSeF account
    
    -- Sync settings
    sync_frequency VARCHAR(20) DEFAULT 'daily' CHECK (sync_frequency IN ('daily', 'manual')),
    auto_confirm_invoices BOOLEAN DEFAULT false, -- If true, skip confirmation step
    
    -- Sync tracking
    last_sync_at TIMESTAMPTZ,
    last_sync_status VARCHAR(50),
    last_sync_error TEXT,
    invoices_synced_count INTEGER DEFAULT 0,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Add KSeF columns to invoices table
ALTER TABLE invoices 
    ADD COLUMN IF NOT EXISTS ksef_number VARCHAR(100),
    ADD COLUMN IF NOT EXISTS ksef_status VARCHAR(50) DEFAULT NULL 
        CHECK (ksef_status IS NULL OR ksef_status IN ('pending_confirmation', 'confirmed', 'rejected')),
    ADD COLUMN IF NOT EXISTS imported_from_ksef BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS ksef_import_date TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS ksef_raw_data JSONB;

-- 3. Create index for faster KSeF queries
CREATE INDEX IF NOT EXISTS idx_invoices_ksef_status ON invoices(ksef_status) WHERE ksef_status IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_invoices_imported_ksef ON invoices(imported_from_ksef) WHERE imported_from_ksef = true;
CREATE INDEX IF NOT EXISTS idx_user_ksef_settings_user ON user_ksef_settings(user_id);

-- 4. Add trigger for updated_at
CREATE OR REPLACE FUNCTION update_ksef_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_user_ksef_settings_updated_at ON user_ksef_settings;
CREATE TRIGGER trigger_user_ksef_settings_updated_at
    BEFORE UPDATE ON user_ksef_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_ksef_settings_updated_at();

-- 5. Enable RLS for security
ALTER TABLE user_ksef_settings ENABLE ROW LEVEL SECURITY;

-- Users can only see/modify their own KSeF settings
CREATE POLICY "Users can view own ksef settings"
    ON user_ksef_settings FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own ksef settings"
    ON user_ksef_settings FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own ksef settings"
    ON user_ksef_settings FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own ksef settings"
    ON user_ksef_settings FOR DELETE
    USING (auth.uid() = user_id);

-- 6. Create audit log for KSeF token access (security)
CREATE TABLE IF NOT EXISTS ksef_audit_log (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    action VARCHAR(50) NOT NULL, -- 'token_created', 'token_updated', 'token_accessed', 'sync_started', 'sync_completed'
    ip_address VARCHAR(45),
    user_agent TEXT,
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ksef_audit_user ON ksef_audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_ksef_audit_created ON ksef_audit_log(created_at);

-- RLS for audit log
ALTER TABLE ksef_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own audit log"
    ON ksef_audit_log FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "System can insert audit log"
    ON ksef_audit_log FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- 7. Add onboarding_completed flag to profiles if not exists
ALTER TABLE profiles 
    ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS ksef_setup_skipped BOOLEAN DEFAULT false;
