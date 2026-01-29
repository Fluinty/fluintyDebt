'use server';

import { createClient } from '@/lib/supabase/server';
import { createKSeFClient } from '@/lib/ksef/client';
import { parseKSeFXml } from '@/lib/ksef/xml-parser';
import type { KSeFEnvironment } from '@/lib/ksef/types';

// Helper to decrypt token (same as in ksef-actions.ts)
function decryptToken(encryptedToken: string): string {
    if (encryptedToken.startsWith('v1:')) {
        const encoded = encryptedToken.slice(3);
        return Buffer.from(encoded, 'base64').toString('utf-8');
    }
    return encryptedToken;
}

/**
 * Sync cost invoices (purchase invoices) from KSeF
 * @param daysBack - number of days to look back
 * @param maxInvoices - optional limit
 */
export async function syncKSeFCostInvoices(daysBack: number = 7, maxInvoices?: number): Promise<{
    success: boolean;
    invoicesFound?: number;
    invoicesImported?: number;
    error?: string;
    warning?: string;
}> {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        return { success: false, error: 'Unauthorized' };
    }

    // Get settings
    const { data: settings } = await supabase
        .from('user_ksef_settings')
        .select('*')
        .eq('user_id', user.id)
        .single();

    if (!settings || !settings.ksef_token_encrypted) {
        return { success: false, error: 'Brak skonfigurowanego tokena KSeF' };
    }

    // Check if user has cost module enabled
    const { data: profile } = await supabase
        .from('profiles')
        .select('modules')
        .eq('id', user.id)
        .single();

    // Default to false if not set, but handle legacy profiles
    const hasCostModule = profile?.modules
        ? (profile.modules as any).costs === true
        : false;

    if (!hasCostModule) {
        return { success: true, invoicesImported: 0, warning: 'Moduł kosztowy nie jest aktywny' };
    }

    try {
        const decryptedToken = decryptToken(settings.ksef_token_encrypted);
        const client = createKSeFClient(decryptedToken, settings.ksef_environment as KSeFEnvironment);

        const dateTo = new Date();
        const dateFrom = new Date();
        dateFrom.setDate(dateFrom.getDate() - daysBack);

        // Fetch PURCHASE invoices (Subject2)
        const invoicesResponse = await client.fetchInvoices({
            dateFrom,
            dateTo,
            subjectType: 'Subject2', // Purchase invoices
        });

        if (!invoicesResponse) {
            throw new Error('Failed to fetch cost invoices from KSeF');
        }

        const hitRateLimit = invoicesResponse.processingCode === 429;
        const invoicesFound = invoicesResponse.numberOfElements;
        let invoicesImported = 0;

        // Sort by date descending
        const sortedInvoices = [...invoicesResponse.invoiceHeaderList].sort((a, b) => {
            const dateA = new Date(a.invoicingDate || a.acquisitionTimestamp || 0).getTime();
            const dateB = new Date(b.invoicingDate || b.acquisitionTimestamp || 0).getTime();
            return dateB - dateA;
        });

        console.log('[Costs] Processing', sortedInvoices.length, 'invoices');

        for (const invoiceHeader of sortedInvoices) {
            if (maxInvoices && invoicesImported >= maxInvoices) break;

            // Check if already imported
            const ksefRef = invoiceHeader.ksefReferenceNumber || invoiceHeader.ksefNumber || '';
            const { data: existing } = await supabase
                .from('cost_invoices')
                .select('id')
                .eq('invoice_number', invoiceHeader.invoiceNumber) // Can also check ksef_number if we add it to schema
                .eq('user_id', user.id)
                .single();

            if (existing) {
                console.log('[Costs] Skipping existing:', ksefRef);
                continue;
            }

            // Extract Seller Data (Subject1)
            const invData = invoiceHeader as unknown as Record<string, unknown>;
            const sellerNip = invoiceHeader.seller?.nip ||
                (invData.subjectBy as any)?.issuedByIdentifier?.identifier ||
                (invData.seller as any)?.nip;

            const sellerName = invoiceHeader.seller?.name ||
                (invData.subjectBy as any)?.issuedToName?.fullName ||
                'Nieznany dostawca';

            // Filter: Ensure we are the BUYER (Subject2)
            // Although we requested Subject2, double check
            // Actually, KSeF ensures this if we query by Subject2.

            // Amounts
            const grossAmount = Number(invData.grossAmount || invoiceHeader.gross || 0);

            // Calculate Due Date (default 14 days if not found)
            const invoiceDate = new Date(invoiceHeader.invoicingDate);
            const dueDate = new Date(invoiceDate);
            dueDate.setDate(dueDate.getDate() + 14);

            // Prepare insert data
            let bankAccountNumber: string | null = null;
            let bankName: string | null = null;
            let sellerAddressData: any = null;

            // Fetch XML to get bank account and address details
            try {
                const xmlContent = await client.getInvoiceXml(ksefRef);
                if (xmlContent) {
                    const parsed = parseKSeFXml(xmlContent);
                    sellerAddressData = parsed.seller; // Get full seller info

                    // Prefer seller specific bank account, fallback to global
                    if (parsed.seller?.bankAccountNumber) {
                        bankAccountNumber = parsed.seller.bankAccountNumber;
                        bankName = parsed.seller.bankName || parsed.bankName || null;
                    } else if (parsed.bankAccountNumber) {
                        bankAccountNumber = parsed.bankAccountNumber;
                        bankName = parsed.bankName || null;
                    }

                    if (bankAccountNumber) {
                        console.log('[Costs] Found bank account:', bankAccountNumber);
                    }
                }
            } catch (xmlError) {
                console.error('[Costs] Failed to fetch XML:', xmlError);
            }

            // AUTO-CREATE VENDOR OR UPDATE BANK ACCOUNT/ADDRESS
            if (sellerNip) {
                try {
                    // Check if vendor exists
                    const { data: existingVendor } = await supabase
                        .from('vendors')
                        .select('id, bank_account_number, address, city, postal_code')
                        .eq('user_id', user.id)
                        .eq('nip', sellerNip)
                        .single();

                    if (!existingVendor) {
                        // Create new vendor
                        const { error: vendorError } = await supabase
                            .from('vendors')
                            .insert({
                                user_id: user.id,
                                name: sellerName,
                                nip: sellerNip,
                                address: sellerAddressData?.address || null,
                                city: sellerAddressData?.city || null,
                                postal_code: sellerAddressData?.postalCode || null,
                                bank_account_number: bankAccountNumber,
                                bank_name: bankName,
                                notes: 'Automatycznie utworzony z KSeF',
                            });

                        if (vendorError) {
                            console.error('[Costs] Failed to auto-create vendor:', vendorError);
                        } else {
                            console.log('[Costs] Auto-created vendor:', sellerName);
                        }
                    } else {
                        // Update missing fields in existing vendor
                        const updates: Record<string, any> = {};

                        if (!existingVendor.bank_account_number && bankAccountNumber) {
                            updates.bank_account_number = bankAccountNumber;
                            if (bankName) updates.bank_name = bankName;
                        }

                        if (!existingVendor.address && sellerAddressData?.address) {
                            updates.address = sellerAddressData.address;
                        }

                        if (!existingVendor.city && sellerAddressData?.city) {
                            updates.city = sellerAddressData.city;
                        }

                        if (!existingVendor.postal_code && sellerAddressData?.postalCode) {
                            updates.postal_code = sellerAddressData.postalCode;
                        }

                        if (Object.keys(updates).length > 0) {
                            const { error: updateError } = await supabase
                                .from('vendors')
                                .update(updates)
                                .eq('id', existingVendor.id);

                            if (updateError) {
                                console.error('[Costs] Failed to update vendor details:', updateError);
                            } else {
                                console.log('[Costs] Updated vendor details:', sellerName, Object.keys(updates));
                            }
                        }
                    }
                } catch (vendorLogicError) {
                    console.error('[Costs] Vendor logic error:', vendorLogicError);
                }
            }

            const { error: insertError } = await supabase
                .from('cost_invoices')
                .insert({
                    user_id: user.id,
                    contractor_name: sellerName,
                    contractor_nip: sellerNip || null,
                    invoice_number: invoiceHeader.invoiceNumber,
                    issue_date: invoiceHeader.invoicingDate,
                    due_date: dueDate.toISOString().split('T')[0],
                    amount: grossAmount,
                    currency: 'PLN', // KSeF is mostly PLN
                    account_number: bankAccountNumber,
                    payment_status: 'to_pay',
                    category: 'other',
                });

            if (insertError) {
                console.error('[Costs] Failed to insert:', insertError);
            } else {
                invoicesImported++;
                console.log('[Costs] Imported:', invoiceHeader.invoiceNumber);
            }
        }

        return {
            success: !hitRateLimit || invoicesImported > 0,
            invoicesFound,
            invoicesImported,
            error: hitRateLimit && invoicesImported === 0
                ? 'Przekroczono limit zapytań do KSeF.'
                : undefined,
            warning: hitRateLimit && invoicesImported > 0
                ? `Osiągnięto limit zapytań KSeF. Zaimportowano ${invoicesImported} faktur.`
                : undefined,
        };

    } catch (error) {
        console.error('[Costs] Sync failed:', error);
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
}
