/**
 * Simple KSeF XML Parser (FA-2)
 * Extracts invoice items from the XML structure
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

export function parseKSeFXml(xmlContent: string): InvoiceItem[] {
    const items: InvoiceItem[] = [];

    try {
        // Remove namespaces to simplify parsing
        const cleanXml = xmlContent.replace(/<([a-zA-Z0-9]+):/g, '<').replace(/<\/([a-zA-Z0-9]+):/g, '</');

        // Find all invoice lines (Wiersz)
        const lineRegex = /<Wiersz[\s\S]*?<\/Wiersz>/g;
        const lines = cleanXml.match(lineRegex);

        if (!lines) {
            console.log('No invoice lines found in XML');
            return [];
        }

        for (const line of lines) {
            // Extract description (P_7)
            const descMatch = line.match(/<P_7>(.*?)<\/P_7>/);
            const description = descMatch ? descMatch[1] : 'Towar/Usługa';

            // Extract quantity (P_8B)
            const qtyMatch = line.match(/<P_8B>(.*?)<\/P_8B>/);
            const quantity = qtyMatch ? parseFloat(qtyMatch[1]) : 1;

            // Extract unit (P_8A) - optional
            const unitMatch = line.match(/<P_8A>(.*?)<\/P_8A>/);
            const unit = unitMatch ? unitMatch[1] : 'szt';

            // Extract net price (P_9A)
            const netPriceMatch = line.match(/<P_9A>(.*?)<\/P_9A>/);
            const unitPriceNet = netPriceMatch ? parseFloat(netPriceMatch[1]) : 0;

            // Extract net total (P_11)
            const netTotalMatch = line.match(/<P_11>(.*?)<\/P_11>/);
            const totalNet = netTotalMatch ? parseFloat(netTotalMatch[1]) : (quantity * unitPriceNet);

            // Extract VAT rate (P_12)
            const vatRateMatch = line.match(/<P_12>(.*?)<\/P_12>/);
            // Default 23% if not found or invalid
            let vatRate = 23;
            if (vatRateMatch) {
                const val = vatRateMatch[1];
                if (!isNaN(parseInt(val))) {
                    vatRate = parseInt(val);
                }
            }

            // Calculate gross
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

        return items;

    } catch (error) {
        console.error('Error parsing KSeF XML:', error);
        return [];
    }
}
