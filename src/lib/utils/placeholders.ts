/**
 * Template placeholders for email/SMS messages
 */

export const PLACEHOLDERS = {
    '{{debtor_name}}': 'Nazwa kontrahenta',
    '{{invoice_number}}': 'Numer faktury',
    '{{amount}}': 'Kwota faktury',
    '{{due_date}}': 'Termin płatności',
    '{{days_overdue}}': 'Dni po terminie',
    '{{company_name}}': 'Nazwa Twojej firmy',
    '{{bank_account}}': 'Numer konta bankowego',
    '{{payment_link}}': 'Link do płatności online',
    // Interest placeholders - Coming Soon:
    // '{{amount_with_interest}}': 'Kwota z odsetkami',
    // '{{interest_amount}}': 'Kwota odsetek',
} as const;

export type PlaceholderKey = keyof typeof PLACEHOLDERS;

/**
 * Replace placeholders in template string
 */
export function replacePlaceholders(
    template: string,
    values: Partial<Record<PlaceholderKey, string>>
): string {
    let result = template;

    for (const [placeholder, value] of Object.entries(values)) {
        result = result.replace(new RegExp(placeholder, 'g'), value || '');
    }

    return result;
}

/**
 * Get list of placeholders used in a template
 */
export function extractPlaceholders(template: string): PlaceholderKey[] {
    const regex = /\{\{[a-z_]+\}\}/g;
    const matches = template.match(regex) || [];
    return [...new Set(matches)] as PlaceholderKey[];
}
