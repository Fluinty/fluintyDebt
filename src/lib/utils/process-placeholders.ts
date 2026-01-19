/**
 * Replace placeholders in email template with actual values
 * This is a shared utility that can be used on both client and server
 */
export function processPlaceholders(template: string, data: {
    invoice_number?: string;
    amount?: number | string;
    due_date?: string;
    days_overdue?: number;
    debtor_name?: string;
    company_name?: string;
    bank_account?: string;
    payment_link?: string;
    interest_amount?: number | string;
    total_with_interest?: number | string;
}): string {
    let result = template;

    // Format currency values
    const formatCurrency = (value: number | string | undefined) => {
        if (value === undefined) return '';
        const num = typeof value === 'string' ? parseFloat(value) : value;
        return new Intl.NumberFormat('pl-PL', { style: 'currency', currency: 'PLN' }).format(num);
    };

    // Format date
    const formatDate = (dateStr: string | undefined) => {
        if (!dateStr) return '';
        return new Date(dateStr).toLocaleDateString('pl-PL');
    };

    // Replace placeholders
    const replacements: Record<string, string> = {
        '{{invoice_number}}': data.invoice_number || '',
        '{{amount}}': formatCurrency(data.amount),
        '{{due_date}}': formatDate(data.due_date),
        '{{days_overdue}}': data.days_overdue?.toString() || '',
        '{{debtor_name}}': data.debtor_name || '',
        '{{company_name}}': data.company_name || 'Wierzyciel',
        '{{bank_account}}': data.bank_account || '',
        '{{payment_link}}': data.payment_link || '',
        '{{interest_amount}}': formatCurrency(data.interest_amount),
        '{{total_with_interest}}': formatCurrency(data.total_with_interest),
        '{{amount_with_interest}}': formatCurrency(data.total_with_interest), // Alias
    };

    for (const [placeholder, value] of Object.entries(replacements)) {
        result = result.replace(new RegExp(placeholder, 'g'), value);
    }

    return result;
}
