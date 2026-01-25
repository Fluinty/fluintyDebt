'use server';

import { lookupCompanyByNip, validateNip } from '@/lib/gus/gus-client';
import type { GusLookupResult } from '@/lib/gus/types';

/**
 * Server action to fetch company data by NIP
 */
export async function fetchCompanyByNip(nip: string): Promise<GusLookupResult> {
    if (!nip || nip.trim().length === 0) {
        return {
            success: false,
            error: 'Wprowadź numer NIP',
        };
    }

    // Validate NIP format
    if (!validateNip(nip)) {
        return {
            success: false,
            error: 'Nieprawidłowy format NIP',
        };
    }

    // Call the API
    return lookupCompanyByNip(nip);
}
