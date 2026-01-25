/**
 * Types for PDF generation
 */

export interface CreditorData {
    name: string;
    nip: string;
    address: string;
    city: string;
    postal_code: string;
    phone?: string;
    email?: string;
    bank_account: string;
    bank_name?: string;
    logo_url?: string;
}

export interface DebtorData {
    name: string;
    nip?: string;
    address?: string;
    city?: string;
    postal_code?: string;
}

export interface InvoiceData {
    id: string;
    invoice_number: string;
    amount: number;
    amount_gross: number;
    issue_date: string;
    due_date: string;
    days_overdue: number;
    imported_from_ksef?: boolean;
}


export interface InterestData {
    principal: number;
    interest_rate: number;
    days_overdue: number;
    interest_amount: number;
    total_amount: number;
}

export interface PaymentReminderData {
    creditor: CreditorData;
    debtor: DebtorData;
    invoice: InvoiceData;
    interest: InterestData;
    deadline_days: number;
    generated_date: string;
    reminder_type: 'soft' | 'standard' | 'firm' | 'final';
    items?: {
        description: string;
        quantity: number;
        unit: string;
        unitPriceNet: number;
        unitPriceGross: number;
        totalNet: number;
        totalGross: number;
        vatRate: number;
    }[];
}
