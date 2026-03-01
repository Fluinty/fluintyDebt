/**
 * KSeF Type Definitions
 */

// ============================================================================
// Environment & Config
// ============================================================================

export type KSeFEnvironment = 'test' | 'production';

export interface KSeFConfig {
    environment: KSeFEnvironment;
    certificate?: string;
    privateKey?: string;
    privateKeyPassword?: string;
    nip?: string;
    token?: string;
}

// ============================================================================
// User Settings (matches Supabase table: user_ksef_settings)
// ============================================================================

// ============================================================================
// User Settings (matches Supabase table: user_ksef_settings)
// ============================================================================

export interface UserKSeFSettings {
    id: string;
    user_id: string;
    ksef_environment: string;
    ksef_nip: string;
    ksef_cert_storage_path: string | null;
    ksef_key_storage_path: string | null;
    ksef_cert_format: 'pem' | 'p12' | null;
    ksef_cert_password_encrypted: string | null;
    ksef_token_encrypted: string | null;
    is_enabled: boolean;
    auto_confirm_invoices: boolean;
    sync_frequency: 'daily' | 'weekly' | 'manual';
    sync_time: string | null;
    last_sync_at: string | null;
    last_sync_status: string | null;
    invoices_synced_count: number;
    created_at: string;
    updated_at: string;
}

// ============================================================================
// Session
// ============================================================================

export interface KSeFSession {
    referenceNumber: string;
    sessionToken: string;
    expiresAt: Date;
}

// ============================================================================
// Connection Test
// ============================================================================

export interface KSeFConnectionTestResult {
    success: boolean;
    environment: KSeFEnvironment;
    message: string;
    error?: string;
    sessionInfo?: {
        referenceNumber: string;
        nip: string;
    };
}

// ============================================================================
// Invoice Query & Response
// ============================================================================

export interface KSeFInvoiceQuery {
    startDate: Date;
    endDate: Date;
    queryCriteria?: Record<string, any>;
}

export interface KSeFInvoiceHeader {
    ksefReferenceNumber?: string;
    ksefNumber?: string;
    invoiceNumber: string;
    invoicingDate: string;
    seller?: {
        nip?: string;
        name?: string;
    };
    sellerNip?: string;
    buyer?: {
        nip?: string;
        name?: string;
        identifier?: {
            value?: string;
        };
    };
    grossAmount?: number;
    netAmount?: number;
    vatAmount?: number;
}

export interface KSeFInvoiceListResponse {
    timestamp: string;
    referenceNumber: string;
    processingCode: number;
    processingDescription: string;
    numberOfElements: number;
    invoiceHeaderList: KSeFInvoiceHeader[];
    pageSize?: number;
    pageOffset?: number;
}

// ============================================================================
// Parsed Invoice (from XML)
// ============================================================================

export interface KSeFInvoiceItem {
    description: string;
    quantity: number;
    unit: string;
    unitPriceNet: number;
    unitPriceGross: number;
    vatRate: string;
    totalNet: number;
    totalGross: number;
}

export interface KSeFParsedInvoice {
    items: KSeFInvoiceItem[];
    seller?: {
        nip?: string;
        name?: string;
    };
    buyer?: {
        nip?: string;
        name?: string;
    };
    invoiceNumber?: string;
    issueDate?: string;
    grossTotal?: number;
    netTotal?: number;
    vatTotal?: number;
    isPaid?: boolean;
}

// Helper types for UI
export interface KSeFSettingsFormData {
    ksef_environment: KSeFEnvironment;
    ksef_nip: string;
    ksef_token?: string;
    is_enabled: boolean;
    sync_frequency: 'daily' | 'weekly' | 'manual';
    sync_time?: string;
    auto_confirm_invoices: boolean;
}

export type SyncFrequency = 'daily' | 'weekly' | 'manual';
