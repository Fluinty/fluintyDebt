/**
 * Simple KSeF XML Parser (FA-2)
 * Extracts invoice items and party data from the XML structure
 */

export interface InvoiceItem {
    description: string;
    quantity: number;
    unitPriceNet: number;
    unitPriceGross: number;
    vatRate: number;
    totalNet: number;
    totalGross: number;
    unit: string;
}

export interface InvoiceParty {
    nip?: string;
    name?: string;
    address?: string; // Combined address
    city?: string;
    postalCode?: string;
    street?: string;
    houseNumber?: string;
    flatNumber?: string;
    bankAccountNumber?: string;
    bankName?: string;
}

export interface InvoiceData {
    items: InvoiceItem[];
    seller?: InvoiceParty;
    buyer?: InvoiceParty;
    bankAccountNumber?: string; // Main account (usually seller's)
    bankName?: string;
}

function extractTagValue(xml: string, tagName: string): string | undefined {
    // Match <TagName>Value</TagName> case insensitive, ignoring namespaces
    const regex = new RegExp(`<([a-zA-Z0-9_]+:)?${tagName}>(.*?)<\\/([a-zA-Z0-9_]+:)?${tagName}>`, 'i');
    const match = xml.match(regex);
    if (match) {
        // Group 2 is the content
        return match[match.length - 1] || match[2] || match[1];
    }
    // Try simple match on stripped XML just in case
    const simpleRegex = new RegExp(`<${tagName}>(.*?)<\\/${tagName}>`, 'i');
    const simpleMatch = xml.match(simpleRegex);
    return simpleMatch ? simpleMatch[1] : undefined;
}

function parseAddress(blockXml: string): InvoiceParty {
    const city = extractTagValue(blockXml, 'Miejscowosc');
    const postalCode = extractTagValue(blockXml, 'KodPocztowy');
    const street = extractTagValue(blockXml, 'Ulica');
    const houseNumber = extractTagValue(blockXml, 'NrDomu');
    const flatNumber = extractTagValue(blockXml, 'NrLokalu');
    const nip = extractTagValue(blockXml, 'NIP');
    const name = extractTagValue(blockXml, 'PelnaNazwa') || extractTagValue(blockXml, 'Nazwa');

    let address = '';
    if (street) address += street;
    if (houseNumber) address += ` ${houseNumber}`;
    if (flatNumber) address += `/${flatNumber}`;

    // Fallback if no street (some rural addresses)
    if (!street && city && houseNumber) {
        address = `${city} ${houseNumber}`;
    }

    return {
        nip,
        name,
        city,
        postalCode,
        street,
        houseNumber,
        flatNumber,
        address: address.trim() || undefined
    };
}

export function parseKSeFXml(xmlContent: string): InvoiceData {
    const items: InvoiceItem[] = [];
    let bankAccountNumber: string | undefined;
    let bankName: string | undefined;
    let seller: InvoiceParty | undefined;
    let buyer: InvoiceParty | undefined;

    try {
        // Remove namespaces to simplify parsing
        const cleanXml = xmlContent.replace(/<([a-zA-Z0-9]+):/g, '<').replace(/<\/([a-zA-Z0-9]+):/g, '</');

        // Extract global bank info first (legacy support)
        bankAccountNumber = extractTagValue(cleanXml, 'NrRachunku');
        if (bankAccountNumber) bankAccountNumber = bankAccountNumber.replace(/\s/g, '');

        if (!bankAccountNumber) {
            bankAccountNumber = extractTagValue(cleanXml, 'IBAN');
            if (bankAccountNumber) bankAccountNumber = bankAccountNumber.replace(/\s/g, '');
        }

        bankName = extractTagValue(cleanXml, 'NazwaBanku');

        // Extract Seller (Podmiot1 or Sprzedawca)
        const sellerBlockMatch = cleanXml.match(/(<Podmiot1[\s\S]*?<\/Podmiot1>)|(<Sprzedawca[\s\S]*?<\/Sprzedawca>)/i);
        if (sellerBlockMatch) {
            const sellerBlock = sellerBlockMatch[0];
            seller = parseAddress(sellerBlock);

            // Look for bank account in seller block specifically if not found globally or to be precise
            const sellerAccount = extractTagValue(sellerBlock, 'NrRachunku') || extractTagValue(sellerBlock, 'IBAN');
            if (sellerAccount) seller.bankAccountNumber = sellerAccount.replace(/\s/g, '');
            else seller.bankAccountNumber = bankAccountNumber; // Fallback to global

            const sellerBank = extractTagValue(sellerBlock, 'NazwaBanku');
            if (sellerBank) seller.bankName = sellerBank;
            else seller.bankName = bankName;
        }

        // Extract Buyer (Podmiot2 or Nabywca)
        const buyerBlockMatch = cleanXml.match(/(<Podmiot2[\s\S]*?<\/Podmiot2>)|(<Nabywca[\s\S]*?<\/Nabywca>)/i);
        if (buyerBlockMatch) {
            const buyerBlock = buyerBlockMatch[0];
            buyer = parseAddress(buyerBlock);
        }

        // Find all invoice lines (Wiersz)
        const lineRegex = /<Wiersz[\s\S]*?<\/Wiersz>/g;
        const lines = cleanXml.match(lineRegex);

        if (lines) {
            for (const line of lines) {
                const description = extractTagValue(line, 'P_7') || 'Towar/Usługa';
                const quantity = parseFloat(extractTagValue(line, 'P_8B') || '1');
                const unit = extractTagValue(line, 'P_8A') || 'szt';
                const unitPriceNet = parseFloat(extractTagValue(line, 'P_9A') || '0');

                // P_11 is net total
                let totalNet = parseFloat(extractTagValue(line, 'P_11') || '0');
                if (totalNet === 0 && unitPriceNet > 0) totalNet = quantity * unitPriceNet;

                // VAT Rate P_12
                let vatRate = 23;
                const vatStr = extractTagValue(line, 'P_12');
                if (vatStr && !isNaN(parseInt(vatStr))) {
                    vatRate = parseInt(vatStr);
                }

                const totalGross = totalNet * (1 + vatRate / 100);
                const unitPriceGross = unitPriceNet * (1 + vatRate / 100);

                items.push({
                    description,
                    quantity,
                    unit,
                    unitPriceNet,
                    unitPriceGross: Math.round(unitPriceGross * 100) / 100,
                    totalNet,
                    totalGross: Math.round(totalGross * 100) / 100,
                    vatRate
                });
            }
        }

        return { items, bankAccountNumber, bankName, seller, buyer };

    } catch (error) {
        console.error('Error parsing KSeF XML:', error);
        return { items: [], bankAccountNumber: undefined, bankName: undefined }; // Return empty data on error
    }
}
