import { createClient } from '@/lib/supabase/server';
import { calculateInterest } from '@/lib/interest/calculate-interest';
import type { PaymentReminderData, CreditorData, DebtorData, InvoiceData, InterestData } from '@/lib/pdf/types';

/**
 * Gather all necessary data for generating a payment reminder PDF
 */
export async function getPaymentReminderData(invoiceId: string, userId: string): Promise<{ data: PaymentReminderData | null; error?: string }> {
    const supabase = await createClient();

    // Get invoice with debtor
    const { data: invoice, error: invoiceError } = await supabase
        .from('invoices')
        .select(`
            *,
            debtor:debtors(*),
            items:invoice_items(*)
        `)
        .eq('id', invoiceId)
        .eq('user_id', userId)
        .single();

    if (invoiceError || !invoice) {
        return { data: null, error: 'Invoice not found' };
    }

    // Get user profile for creditor data
    const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

    console.log('[PDF Data] User ID:', userId);
    console.log('[PDF Data] Profile:', profile);
    console.log('[PDF Data] Profile Error:', profileError);

    // Default creditor data if no profile
    const creditorData: CreditorData = {
        name: profile?.company_name || 'Firma',
        nip: profile?.company_nip || '',
        address: profile?.company_address || '',
        city: profile?.company_city || '',
        postal_code: profile?.company_postal_code || '',
        phone: profile?.company_phone || undefined,
        email: profile?.company_email || undefined,
        bank_account: profile?.bank_account_number || 'XX XXXX XXXX XXXX XXXX XXXX XXXX',
        bank_name: profile?.bank_name || undefined,
        logo_url: profile?.logo_url || undefined,
    };

    // Debtor data
    const debtor = invoice.debtor;
    const debtorData: DebtorData = {
        name: debtor?.name || 'Nieznany kontrahent',
        nip: debtor?.nip || undefined,
        address: debtor?.address || undefined,
        city: debtor?.city || undefined,
        postal_code: debtor?.postal_code || undefined,
    };

    // Calculate days overdue
    const dueDate = new Date(invoice.due_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    dueDate.setHours(0, 0, 0, 0);
    const daysOverdue = Math.max(0, Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24)));

    // Invoice data
    const invoiceData: InvoiceData = {
        id: invoice.id,
        invoice_number: invoice.invoice_number,
        amount: invoice.amount || invoice.amount_gross || 0,
        amount_gross: invoice.amount_gross || invoice.amount || 0,
        issue_date: invoice.issue_date,
        due_date: invoice.due_date,
        days_overdue: daysOverdue,
        imported_from_ksef: invoice.imported_from_ksef,
    };

    // Map items if they exist
    const items = invoice.items?.map((item: any) => ({
        description: item.description,
        quantity: Number(item.quantity),
        unit: item.unit || 'szt',
        unitPriceNet: Number(item.unit_price_net),
        unitPriceGross: Number(item.unit_price_gross),
        totalNet: Number(item.total_net),
        totalGross: Number(item.total_gross),
        vatRate: item.vat_rate || 23,
    })) || [];

    // Calculate interest
    const interestRate = profile?.interest_rate || 11.5; // Default Polish statutory interest rate
    const interestResult = calculateInterest(
        invoiceData.amount_gross,
        new Date(invoice.due_date),
        today,
        interestRate
    );

    const interestData: InterestData = {
        principal: invoiceData.amount_gross,
        interest_rate: interestRate,
        days_overdue: daysOverdue,
        interest_amount: interestResult.interest || 0,
        total_amount: interestResult.total || invoiceData.amount_gross,
    };

    // Determine reminder type based on days overdue
    let reminderType: PaymentReminderData['reminder_type'] = 'standard';
    if (daysOverdue === 0) {
        reminderType = 'soft';
    } else if (daysOverdue <= 14) {
        reminderType = 'standard';
    } else if (daysOverdue <= 30) {
        reminderType = 'firm';
    } else {
        reminderType = 'final';
    }

    return {
        data: {
            creditor: creditorData,
            debtor: debtorData,
            invoice: invoiceData,
            interest: interestData,
            deadline_days: 7,
            generated_date: new Date().toISOString(),
            reminder_type: reminderType,
            items: items,
        }
    };
}
