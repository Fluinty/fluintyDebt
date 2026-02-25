/**
 * KSeF Invoice XML Parser
 * 
 * Parses FA(3) invoice XML from KSeF and extracts structured data.
 * KSeF invoices follow the schema: http://crd.gov.pl/wzor/2023/06/29/12648/
 */

import { DOMParser } from '@xmldom/xmldom';
import type { KSeFInvoiceItem, KSeFParsedInvoice } from './types';

/**
 * Get text content of first matching element.
 * Handles namespaced elements by trying both with and without namespace.
 */
function getText(parent: Element, tagName: string): string | undefined {
    // Try direct tag name first
    let els = parent.getElementsByTagName(tagName);
    if (els.length === 0) {
        // Try with common namespace prefixes
        els = parent.getElementsByTagName(`tns:${tagName}`);
    }
    if (els.length === 0) {
        // Try wildcard namespace
        els = parent.getElementsByTagNameNS('*', tagName);
    }
    if (els.length > 0 && els[0].textContent) {
        return els[0].textContent.trim();
    }
    return undefined;
}

/**
 * Get all elements matching tag name (namespace-aware).
 */
function getElements(parent: Element | Document, tagName: string): Element[] {
    let els = parent.getElementsByTagName(tagName);
    if (els.length === 0) {
        els = parent.getElementsByTagNameNS('*', tagName);
    }
    return Array.from(els) as Element[];
}

/**
 * Safe number parse with fallback to 0.
 */
function num(value: string | undefined): number {
    if (!value) return 0;
    const n = parseFloat(value.replace(',', '.'));
    return isNaN(n) ? 0 : n;
}

/**
 * Parse KSeF invoice XML and extract items + metadata.
 * 
 * Expected XML structure (FA schema v3):
 * <Faktura>
 *   <Naglowek>...</Naglowek>
 *   <Podmiot1> (seller) </Podmiot1>
 *   <Podmiot2> (buyer) </Podmiot2>
 *   <Fa>
 *     <FaWiersz> (line items) </FaWiersz>
 *     ...
 *   </Fa>
 * </Faktura>
 */
export function parseKSeFXml(xmlContent: string): KSeFParsedInvoice {
    const result: KSeFParsedInvoice = {
        items: [],
    };

    try {
        const doc = new DOMParser().parseFromString(xmlContent, 'text/xml');
        const root = doc.documentElement;

        if (!root) {
            console.warn('[KSeF XML Parser] No root element found');
            return result;
        }

        // ── Seller (Podmiot1) ──
        const podmiot1List = getElements(root, 'Podmiot1');
        if (podmiot1List.length > 0) {
            const podmiot1 = podmiot1List[0];
            result.seller = {
                nip: getText(podmiot1, 'NIP'),
                name: getText(podmiot1, 'Nazwa')
                    || getText(podmiot1, 'NazwaHandlowa')
                    || getText(podmiot1, 'ImieNazwisko'),
            };
        }

        // ── Buyer (Podmiot2) ──
        const podmiot2List = getElements(root, 'Podmiot2');
        if (podmiot2List.length > 0) {
            const podmiot2 = podmiot2List[0];
            result.buyer = {
                nip: getText(podmiot2, 'NIP'),
                name: getText(podmiot2, 'Nazwa')
                    || getText(podmiot2, 'NazwaHandlowa')
                    || getText(podmiot2, 'ImieNazwisko'),
            };
        }

        // ── Invoice metadata ──
        result.invoiceNumber = getText(root, 'P_2')  // Numer faktury
            || getText(root, 'NrFaktury');
        result.issueDate = getText(root, 'P_1')       // Data wystawienia
            || getText(root, 'DataWystawienia');

        // ── Totals ──
        result.grossTotal = num(getText(root, 'P_15'));   // Kwota brutto
        result.netTotal = num(getText(root, 'P_13_1'))    // Netto (stawka podstawowa)
            + num(getText(root, 'P_13_2'))                 // Netto (stawka obniżona)
            + num(getText(root, 'P_13_3'))                 // Netto (kolejna stawka)
            + num(getText(root, 'P_13_6'))                 // Netto (0%)
            + num(getText(root, 'P_13_7'));                // Netto (zw.)

        // ── Line items (FaWiersz) ──
        const wiersze = getElements(root, 'FaWiersz');
        for (const wiersz of wiersze) {
            const item: KSeFInvoiceItem = {
                description: getText(wiersz, 'P_7')       // Nazwa towaru/usługi
                    || getText(wiersz, 'NazwaTowaru')
                    || 'Brak opisu',
                quantity: num(getText(wiersz, 'P_8B')      // Ilość
                    || getText(wiersz, 'Ilosc')),
                unit: getText(wiersz, 'P_8A')              // Jednostka miary
                    || getText(wiersz, 'JednostkaMiary')
                    || 'szt.',
                unitPriceNet: num(getText(wiersz, 'P_9A')  // Cena jednostkowa netto
                    || getText(wiersz, 'CenaJednostkowa')),
                unitPriceGross: num(getText(wiersz, 'P_9B') // Cena jedn. brutto
                    || getText(wiersz, 'CenaJednostkowaBrutto')),
                vatRate: getText(wiersz, 'P_12')           // Stawka VAT
                    || getText(wiersz, 'StawkaVAT')
                    || '23',
                totalNet: num(getText(wiersz, 'P_11')      // Wartość netto
                    || getText(wiersz, 'WartoscNetto')),
                totalGross: num(getText(wiersz, 'P_11A')   // Wartość brutto
                    || getText(wiersz, 'WartoscBrutto')),
            };

            // If gross not available, calculate from net + VAT
            if (item.totalGross === 0 && item.totalNet > 0) {
                const vatPercent = parseFloat(item.vatRate) || 0;
                item.totalGross = Math.round(item.totalNet * (1 + vatPercent / 100) * 100) / 100;
            }

            // If unit price gross not available, calculate
            if (item.unitPriceGross === 0 && item.unitPriceNet > 0) {
                const vatPercent = parseFloat(item.vatRate) || 0;
                item.unitPriceGross = Math.round(item.unitPriceNet * (1 + vatPercent / 100) * 100) / 100;
            }

            result.items.push(item);
        }

        console.log(`[KSeF XML Parser] Parsed: ${result.items.length} items, seller=${result.seller?.nip}, buyer=${result.buyer?.nip}`);
    } catch (error) {
        console.error('[KSeF XML Parser] Parse error:', error);
    }

    return result;
}
