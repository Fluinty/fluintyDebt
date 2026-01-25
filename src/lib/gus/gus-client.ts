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
 * Parse address into components
 */
function parseAddress(fullAddress: string): { address: string; city: string; postal_code: string } {
    // Address format from API: "ul. Nazwa 123, 00-000 Miasto"
    // or "Nazwa 123, 00-000 Miasto"

    const postalMatch = fullAddress.match(/(\d{2}-\d{3})\s+(.+?)$/);

    if (postalMatch) {
        const postal_code = postalMatch[1];
        const city = postalMatch[2].trim();
        const addressPart = fullAddress.replace(/,?\s*\d{2}-\d{3}\s+.+$/, '').trim();

        return {
            address: addressPart,
            city: city,
            postal_code: postal_code,
        };
    }

    return {
        address: fullAddress,
        city: '',
        postal_code: '',
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
