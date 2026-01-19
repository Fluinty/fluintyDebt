/**
 * Format Polish currency
 */
export function formatCurrency(amount: number, currency = 'PLN'): string {
    return new Intl.NumberFormat('pl-PL', {
        style: 'currency',
        currency,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(amount);
}

/**
 * Format amount without currency symbol
 */
export function formatAmount(amount: number): string {
    return new Intl.NumberFormat('pl-PL', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(amount);
}

/**
 * Parse currency string to number
 */
export function parseCurrency(value: string): number {
    // Remove spaces, replace comma with dot
    const cleaned = value.replace(/\s/g, '').replace(',', '.');
    return parseFloat(cleaned) || 0;
}
