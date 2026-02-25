/**
 * GUS/Ministry of Finance API Client
 * 
 * Uses the "Biała Lista" (White List) API from Ministry of Finance
 * to lookup company data by NIP number.
 * 
 * API Documentation: https://wl-api.mf.gov.pl/
 */

import type { CompanyData, GusLookupResult } from './types';

// Re-export types for convenience
export type { CompanyData, GusLookupResult };


/**
 * Clean NIP by removing dashes and spaces
 */
function cleanNip(nip: string): string {
    return nip.replace(/[-\s]/g, '');
}

/**
 * Validate NIP format and checksum
 */
export function validateNip(nip: string): boolean {
    const cleanedNip = cleanNip(nip);

    if (!/^\d{10}$/.test(cleanedNip)) {
        return false;
    }

    // NIP checksum validation
    const weights = [6, 5, 7, 2, 3, 4, 5, 6, 7];
    let sum = 0;

    for (let i = 0; i < 9; i++) {
        sum += parseInt(cleanedNip[i]) * weights[i];
    }

    const checkDigit = sum % 11;
    return checkDigit === parseInt(cleanedNip[9]);
}

/**
 * Parse address into components, splitting street from building number.
 * GUS format: "ul. Nazwa Ulicy 12A/3, 00-000 Miasto"
 */
function parseAddress(fullAddress: string): { address: string; street: string; street_number: string; city: string; postal_code: string } {
    const postalMatch = fullAddress.match(/(\d{2}-\d{3})\s+(.+?)$/);

    let postal_code = '';
    let city = '';
    let addressPart = fullAddress;

    if (postalMatch) {
        postal_code = postalMatch[1];
        city = postalMatch[2].trim();
        addressPart = fullAddress.replace(/,?\s*\d{2}-\d{3}\s+.+$/, '').trim();
    }

    // Remove "ul.", "al.", "pl." prefix
    const cleanedStreet = addressPart.replace(/^(ul\.|al\.|pl\.|Os\.|os\.)\s*/i, '').trim();

    // Split "Nazwa Ulicy 12A/3" → street "Nazwa Ulicy" + number "12A/3"
    // Building number pattern: ends with digits, optionally followed by letters and /apartment
    const numberMatch = cleanedStreet.match(/^(.*?)\s+(\d+[a-zA-Z]?(?:\/\d+[a-zA-Z]?)?)$/);
    const street = numberMatch ? numberMatch[1].trim() : cleanedStreet;
    const street_number = numberMatch ? numberMatch[2].trim() : '';

    return {
        address: addressPart,   // full (legacy compat)
        street,
        street_number,
        city,
        postal_code,
    };
}

/**
 * Lookup company data by NIP using Ministry of Finance API
 */
export async function lookupCompanyByNip(nip: string): Promise<GusLookupResult> {
    const cleanedNip = cleanNip(nip);

    if (!validateNip(cleanedNip)) {
        return {
            success: false,
            error: 'Nieprawidłowy numer NIP',
        };
    }

    try {
        // Ministry of Finance "Biała Lista" API
        const today = new Date().toISOString().split('T')[0];
        const apiUrl = `https://wl-api.mf.gov.pl/api/search/nip/${cleanedNip}?date=${today}`;

        const response = await fetch(apiUrl, {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
            },
        });

        if (!response.ok) {
            if (response.status === 404) {
                return {
                    success: false,
                    error: 'Nie znaleziono firmy o podanym NIP',
                };
            }
            throw new Error(`API error: ${response.status}`);
        }

        const data = await response.json();

        if (!data.result?.subject) {
            return {
                success: false,
                error: 'Nie znaleziono danych dla podanego NIP',
            };
        }

        const subject = data.result.subject;

        // Parse address components
        const workingAddress = subject.workingAddress || subject.residenceAddress || '';
        const parsedAddress = parseAddress(workingAddress);

        const companyData: CompanyData = {
            name: subject.name || '',
            nip: subject.nip || cleanedNip,
            regon: subject.regon || undefined,
            krs: subject.krs || undefined,
            address: parsedAddress.address,
            street: parsedAddress.street,
            street_number: parsedAddress.street_number,
            city: parsedAddress.city,
            postal_code: parsedAddress.postal_code,
            working_address: workingAddress,
            bank_accounts: subject.accountNumbers || [],
        };

        return {
            success: true,
            data: companyData,
        };
    } catch (error) {
        console.error('GUS API error:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Błąd połączenia z API',
        };
    }
}
