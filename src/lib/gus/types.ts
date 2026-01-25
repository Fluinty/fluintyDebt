/**
 * Types for GUS/Ministry of Finance API
 */

export interface CompanyData {
    name: string;
    nip: string;
    regon?: string;
    krs?: string;
    address: string;
    city: string;
    postal_code: string;
    working_address?: string;
    bank_accounts?: string[];
}

export interface GusLookupResult {
    success: boolean;
    data?: CompanyData;
    error?: string;
}
