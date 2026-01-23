/**
 * KSeF (Krajowy System e-Faktur) Types
 */

// KSeF Environment
export type KSeFEnvironment = 'test' | 'production';

// KSeF API Endpoints
export const KSEF_API_URLS = {
    test: 'https://ksef-test.mf.gov.pl/api',
    production: 'https://ksef.mf.gov.pl/api',
} as const;

// Sync frequency options
export type SyncFrequency = 'daily' | 'manual';

// KSeF Invoice status in our system
export type KSeFInvoiceStatus = 'pending_confirmation' | 'confirmed' | 'rejected';

// User KSeF Settings
export interface UserKSeFSettings {
    id: string;
    user_id: string;
    ksef_environment: KSeFEnvironment;
    is_enabled: boolean;
    ksef_token_encrypted: string | null;
    ksef_nip: string | null;
    sync_frequency: SyncFrequency;
    sync_time: string | null;
    auto_confirm_invoices: boolean;
    last_sync_at: string | null;
    last_sync_status: string | null;
    last_sync_error: string | null;
    invoices_synced_count: number;
    created_at: string;
    updated_at: string;
}

// KSeF Invoice from API (simplified structure)
export interface KSeFInvoice {
    ksefReferenceNumber: string; // Unique KSeF ID
    invoiceNumber: string;
    invoiceType: 'VAT' | 'VAT-RR' | 'VAT-MP';
    issueDate: string;
    sellerNip: string;
    sellerName: string;
    buyerNip: string;
    buyerName: string;
    netAmount: number;
    vatAmount: number;
    grossAmount: number;
    currencyCode: string;
    acquisitionTimestamp: string;
}

// KSeF Session
export interface KSeFSession {
    sessionToken: string;
    referenceNumber: string;
    expiresAt: Date;
}

// KSeF Auth Response
export interface KSeFAuthResponse {
    timestamp: string;
    referenceNumber: string;
    processingCode: number;
    processingDescription: string;
    sessionToken?: {
        token: string;
        context: {
            contextIdentifier: {
                type: string;
                identifier: string;
            };
            credentialsRoleList: Array<{
                type: string;
                roleType: string;
            }>;
        };
    };
}

// KSeF Invoice Query Response
export interface KSeFInvoiceListResponse {
    timestamp: string;
    referenceNumber: string;
    processingCode: number;
    processingDescription: string;
    numberOfElements: number;
    pageSize: number;
    pageOffset: number;
    invoiceHeaderList: KSeFInvoiceHeader[];
}

export interface KSeFInvoiceHeader {
    invoiceReferenceNumber: string;
    ksefReferenceNumber: string;
    ksefNumber?: string;  // KSeF 2.0 format
    invoiceType: string;
    invoiceNumber: string;
    invoicingDate: string;
    acquisitionTimestamp: string;

    // KSeF 2.0 format
    seller?: {
        nip: string;
        name: string;
    };
    buyer?: {
        nip?: string;
        name?: string;
        identifier?: {
            type: string;
            value: string;
        };
    };
    sellerNip?: string;

    // Legacy format (KSeF 1.0)
    subjectBy?: {
        issuedByIdentifier: {
            type: string;
            identifier: string;
        };
        issuedByName: {
            tradeName?: string;
            fullName?: string;
        };
    };
    subjectTo?: {
        issuedToIdentifier: {
            type: string;
            identifier: string;
        };
        issuedToName: {
            tradeName?: string;
            fullName?: string;
        };
    };
    net?: string;
    vat?: string;
    gross?: string;
}

// Sync result
export interface KSeFSyncResult {
    success: boolean;
    invoicesFound: number;
    invoicesImported: number;
    invoicesSkipped: number;
    errors: string[];
    lastProcessedDate: string | null;
}

// Audit log action types
export type KSeFAuditAction =
    | 'token_created'
    | 'token_updated'
    | 'token_deleted'
    | 'token_accessed'
    | 'sync_started'
    | 'sync_completed'
    | 'sync_failed'
    | 'invoice_imported'
    | 'invoice_confirmed'
    | 'invoice_rejected';

// Audit log entry
export interface KSeFAuditLog {
    id: string;
    user_id: string;
    action: KSeFAuditAction;
    ip_address: string | null;
    user_agent: string | null;
    metadata: Record<string, unknown>;
    created_at: string;
}

// Connection test result
export interface KSeFConnectionTestResult {
    success: boolean;
    environment: KSeFEnvironment;
    message: string;
    sessionInfo?: {
        referenceNumber: string;
        nip: string;
    };
    error?: string;
}

// Form data for saving settings
export interface KSeFSettingsFormData {
    ksef_environment: KSeFEnvironment;
    ksef_token: string;
    ksef_nip: string;
    is_enabled: boolean;
    sync_frequency: SyncFrequency;
    auto_confirm_invoices: boolean;
}
