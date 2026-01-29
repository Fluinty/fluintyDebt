/**
 * Generates a QR code content string for Polish banking apps.
 * Format based on common "2D code" standards used in Poland (e.g., used by some major banks).
 * Structure: |PL|IBAN|Amount(gr)|Name|Title|...
 */
const removeDiacritics = (str: string) => {
    // Map of Polish characters to ASCII replacements
    const map: { [key: string]: string } = {
        'ą': 'a', 'ć': 'c', 'ę': 'e', 'ł': 'l', 'ń': 'n', 'ó': 'o', 'ś': 's', 'ź': 'z', 'ż': 'z',
        'Ą': 'A', 'Ć': 'C', 'Ę': 'E', 'Ł': 'L', 'Ń': 'N', 'Ó': 'O', 'Ś': 'S', 'Ź': 'Z', 'Ż': 'Z'
    };
    return str.replace(/[ąćęłńóśźżĄĆĘŁŃÓŚŹŻ]/g, match => map[match] || match);
};

export function generatePolishPaymentQr(
    iban: string,
    amount: number, // Amount in PLN
    name: string,
    title: string
): string {
    // Clean IBAN (remove spaces and PL prefix if present)
    const nrb = iban.replace(/\s/g, '').toUpperCase().replace(/^PL/, '');

    // Amount in grosze (integers)
    const amountGr = Math.round(amount * 100).toString();

    // Sanitize strings:
    // 1. Remove pipes (structure delimiter)
    // 2. Remove Polish diacritics (banking systems often prefer ASCII)
    // 3. Limit length to 35 chars (safe limit for ELIXIR/ZBP)
    const cleanName = removeDiacritics(name).replace('|', '').substring(0, 35);
    const cleanTitle = removeDiacritics(title).replace('|', '').substring(0, 35);

    // Reserved fields (empty)
    const reserved1 = '';
    const reserved2 = '';
    const reserved3 = '';

    // Construct format:
    // |PL|NRB (26 digits)|Amount(gr)|Name|Title|Reserved|Reserved|Reserved|
    return `|PL|${nrb}|${amountGr}|${cleanName}|${cleanTitle}|${reserved1}|${reserved2}|${reserved3}|`;
}
