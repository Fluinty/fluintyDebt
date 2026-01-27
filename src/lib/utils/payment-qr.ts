/**
 * Generates a QR code content string for Polish banking apps.
 * Format based on common "2D code" standards used in Poland (e.g., used by some major banks).
 * Structure: |PL|IBAN|Amount(gr)|Name|Title|...
 */
export function generatePolishPaymentQr(
    iban: string,
    amount: number, // Amount in PLN
    name: string,
    title: string
): string {
    // Clean IBAN (remove spaces)
    const cleanIban = iban.replace(/\s/g, '').toUpperCase();
    const formattedIban = cleanIban.startsWith('PL') ? cleanIban : `PL${cleanIban}`;

    // Amount in grosze (integers)
    const amountGr = Math.round(amount * 100).toString();

    // Sanitize strings (remove pipes)
    const cleanName = name.replace('|', '').substring(0, 140); // Max length safety
    const cleanTitle = title.replace('|', '').substring(0, 140);

    // Reserved fields (empty)
    const reserved1 = '';
    const reserved2 = '';
    const reserved3 = '';

    // Construct format:
    // |PL|IBAN|Amount|Name|Title|Reserved|Reserved|Reserved|
    return `|PL|${formattedIban}|${amountGr}|${cleanName}|${cleanTitle}|${reserved1}|${reserved2}|${reserved3}|`;
}
