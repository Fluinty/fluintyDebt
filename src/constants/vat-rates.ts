/**
 * Polish VAT rates
 */
export const VAT_RATES = [
    { value: '23', label: '23%', rate: 0.23 },
    { value: '8', label: '8%', rate: 0.08 },
    { value: '5', label: '5%', rate: 0.05 },
    { value: '0', label: '0%', rate: 0 },
    { value: 'zw', label: 'zw. (zwolniony)', rate: 0 },
    { value: 'np', label: 'np. (nie podlega)', rate: 0 },
] as const;

export type VatRateValue = typeof VAT_RATES[number]['value'];

/**
 * Get VAT rate multiplier from value
 */
export function getVatRate(value: string): number {
    const found = VAT_RATES.find(r => r.value === value);
    return found?.rate ?? 0.23; // Default to 23%
}

/**
 * Calculate VAT amount and gross from net amount
 */
export function calculateVat(netAmount: number, vatRateValue: string): {
    vatAmount: number;
    grossAmount: number;
} {
    const rate = getVatRate(vatRateValue);
    const vatAmount = netAmount * rate;
    const grossAmount = netAmount + vatAmount;

    return {
        vatAmount: Math.round(vatAmount * 100) / 100,
        grossAmount: Math.round(grossAmount * 100) / 100,
    };
}

/**
 * Calculate net amount from gross (reverse calculation)
 */
export function calculateNetFromGross(grossAmount: number, vatRateValue: string): {
    netAmount: number;
    vatAmount: number;
} {
    const rate = getVatRate(vatRateValue);
    const netAmount = grossAmount / (1 + rate);
    const vatAmount = grossAmount - netAmount;

    return {
        netAmount: Math.round(netAmount * 100) / 100,
        vatAmount: Math.round(vatAmount * 100) / 100,
    };
}
