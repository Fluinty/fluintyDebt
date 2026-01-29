'use server';

import { createClient } from '@/lib/supabase/server';
import { createKSeFClient } from '@/lib/ksef/client';
import { generateScheduledSteps } from '@/lib/sequences/generate-schedule';
import { lookupCompanyByNip } from '@/lib/gus/gus-client';
import { parseKSeFXml } from '@/lib/ksef/xml-parser'; // Import parser
import { syncKSeFCostInvoices } from '@/app/actions/ksef-costs-actions'; // Import cost sync
import type { KSeFEnvironment, KSeFSettingsFormData, UserKSeFSettings } from '@/lib/ksef/types';

/**
 * Simple encryption for token storage
 * In production, use Supabase Vault or proper encryption service
 */
function encryptToken(token: string): string {
    // Base64 encode with simple obfuscation
    // TODO: Replace with proper encryption (Supabase Vault)
    const encoded = Buffer.from(token).toString('base64');
    return `v1:${encoded}`;
}

function decryptToken(encryptedToken: string): string {
    // Reverse the simple obfuscation
    if (encryptedToken.startsWith('v1:')) {
        const encoded = encryptedToken.slice(3);
        return Buffer.from(encoded, 'base64').toString('utf-8');
    }
    return encryptedToken;
}

/**
 * Get user's KSeF settings
 */
export async function getKSeFSettings(): Promise<{
    settings: UserKSeFSettings | null;
    error?: string;
}> {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        return { settings: null, error: 'Unauthorized' };
    }

    const { data, error } = await supabase
        .from('user_ksef_settings')
        .select('*')
        .eq('user_id', user.id)
        .single();

    if (error && error.code !== 'PGRST116') {
        // PGRST116 = no rows returned (not an error for us)
        console.error('Error fetching KSeF settings:', error);
        return { settings: null, error: error.message };
    }

    // Don't return the encrypted token to client
    if (data) {
        return {
            settings: {
                ...data,
                ksef_token_encrypted: data.ksef_token_encrypted ? '••••••••' : null,
            } as UserKSeFSettings,
        };
    }

    return { settings: null };
}

/**
 * Save or update KSeF settings
 */
export async function saveKSeFSettings(formData: KSeFSettingsFormData): Promise<{
    success: boolean;
    error?: string;
}> {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        return { success: false, error: 'Unauthorized' };
    }

    // Encrypt the token before storage
    const encryptedToken = formData.ksef_token ? encryptToken(formData.ksef_token) : null;

    // Check if settings already exist
    const { data: existing } = await supabase
        .from('user_ksef_settings')
        .select('id, ksef_token_encrypted')
        .eq('user_id', user.id)
        .single();

    // Only update token if new one provided, otherwise keep existing
    const tokenToSave = encryptedToken || (existing?.ksef_token_encrypted ?? null);

    // Auto-enable when first connecting
    const isEnabled = existing ? formData.is_enabled : true;

    const settingsData = {
        user_id: user.id,
        ksef_environment: formData.ksef_environment,
        ksef_token_encrypted: tokenToSave,
        ksef_nip: formData.ksef_nip,
        is_enabled: isEnabled,
        sync_frequency: formData.sync_frequency,
        sync_time: (formData as any).sync_time || '21:00',
        auto_confirm_invoices: formData.auto_confirm_invoices,
    };

    let error;
    if (existing) {
        // Update existing
        const result = await supabase
            .from('user_ksef_settings')
            .update(settingsData)
            .eq('user_id', user.id);
        error = result.error;
    } else {
        // Insert new
        const result = await supabase
            .from('user_ksef_settings')
            .insert(settingsData);
        error = result.error;
    }

    if (error) {
        console.error('Error saving KSeF settings:', error);
        return { success: false, error: error.message };
    }

    // Log audit entry
    await supabase.from('ksef_audit_log').insert({
        user_id: user.id,
        action: existing ? 'token_updated' : 'token_created',
        metadata: {
            environment: formData.ksef_environment,
            nip: formData.ksef_nip,
        },
    });

    return { success: true };
}

/**
 * Test KSeF connection
 */
export async function testKSeFConnection(): Promise<{
    success: boolean;
    message: string;
    error?: string;
}> {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        return { success: false, message: 'Unauthorized', error: 'Unauthorized' };
    }

    // Get settings with actual token
    const { data: settings } = await supabase
        .from('user_ksef_settings')
        .select('*')
        .eq('user_id', user.id)
        .single();

    if (!settings || !settings.ksef_token_encrypted) {
        return {
            success: false,
            message: 'Brak skonfigurowanego tokena KSeF',
            error: 'No token configured',
        };
    }

    // Decrypt token and test connection
    const decryptedToken = decryptToken(settings.ksef_token_encrypted);
    const client = createKSeFClient(decryptedToken, settings.ksef_environment as KSeFEnvironment);

    const result = await client.testConnection();

    // Log audit entry
    await supabase.from('ksef_audit_log').insert({
        user_id: user.id,
        action: result.success ? 'token_accessed' : 'sync_failed',
        metadata: {
            environment: settings.ksef_environment,
            result: result.success ? 'success' : 'failed',
        },
    });

    return {
        success: result.success,
        message: result.message,
        error: result.error,
    };
}

/**
 * Delete KSeF settings (disconnect)
 */
export async function deleteKSeFSettings(): Promise<{
    success: boolean;
    error?: string;
}> {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        return { success: false, error: 'Unauthorized' };
    }

    const { error } = await supabase
        .from('user_ksef_settings')
        .delete()
        .eq('user_id', user.id);

    if (error) {
        console.error('Error deleting KSeF settings:', error);
        return { success: false, error: error.message };
    }

    // Log audit entry
    await supabase.from('ksef_audit_log').insert({
        user_id: user.id,
        action: 'token_deleted',
        metadata: {},
    });

    return { success: true };
}

/**
 * Delete all invoices for current user (for fresh re-sync)
 */
export async function deleteAllUserInvoices(): Promise<{
    success: boolean;
    deletedCount?: number;
    error?: string;
}> {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        return { success: false, error: 'Unauthorized' };
    }

    // Delete all invoices for this user
    const { data: deleted, error } = await supabase
        .from('invoices')
        .delete()
        .eq('user_id', user.id)
        .select('id');

    if (error) {
        console.error('Error deleting invoices:', error);
        return { success: false, error: error.message };
    }

    console.log('[KSeF] Deleted', deleted?.length || 0, 'invoices for user');
    return { success: true, deletedCount: deleted?.length || 0 };
}

/**
 * Skip KSeF setup during onboarding
 */
export async function skipKSeFSetup(): Promise<{
    success: boolean;
    error?: string;
}> {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        return { success: false, error: 'Unauthorized' };
    }

    const { error } = await supabase
        .from('profiles')
        .update({ ksef_setup_skipped: true })
        .eq('id', user.id);

    if (error) {
        console.error('Error updating profile:', error);
        return { success: false, error: error.message };
    }

    return { success: true };
}

/**
 * Check if user has KSeF configured
 */
export async function hasKSeFConfigured(): Promise<boolean> {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        return false;
    }

    const { data } = await supabase
        .from('user_ksef_settings')
        .select('is_enabled')
        .eq('user_id', user.id)
        .single();

    return data?.is_enabled === true;
}

/**
 * Sync invoices from KSeF
 * @param daysBack - number of days to look back (default 7)
 * @param maxInvoices - optional limit on number of invoices to import
 * @param syncMode - 'all' (default), 'sales', or 'costs'
 */
export async function syncKSeFInvoices(
    daysBack: number = 7,
    maxInvoices?: number,
    syncMode: 'all' | 'sales' | 'costs' = 'all'
): Promise<{
    success: boolean;
    invoicesFound?: number;
    invoicesImported?: number;
    salesImported?: number;
    costsImported?: number;
    error?: string;
    warning?: string;
}> {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        return { success: false, error: 'Unauthorized' };
    }

    // Get user profile to check enabled modules
    const { data: profile } = await supabase
        .from('profiles')
        .select('modules')
        .eq('id', user.id)
        .single();

    const modules = (profile?.modules as { sales?: boolean; costs?: boolean }) || { sales: true, costs: true };
    const hasSalesModule = modules.sales !== false;
    const hasCostsModule = modules.costs !== false;

    // Determine what to sync based on syncMode and module access
    const shouldSyncSales = (syncMode === 'all' || syncMode === 'sales') && hasSalesModule;
    const shouldSyncCosts = (syncMode === 'all' || syncMode === 'costs') && hasCostsModule;

    if (!shouldSyncSales && !shouldSyncCosts) {
        return {
            success: true,
            invoicesImported: 0,
            warning: 'Brak aktywnych modułów do synchronizacji.',
        };
    }

    // Get settings with actual token
    const { data: settings } = await supabase
        .from('user_ksef_settings')
        .select('*')
        .eq('user_id', user.id)
        .single();

    if (!settings || !settings.ksef_token_encrypted) {
        return {
            success: false,
            error: 'Brak skonfigurowanego tokena KSeF',
        };
    }

    // Log sync start
    await supabase.from('ksef_audit_log').insert({
        user_id: user.id,
        action: 'sync_started',
        metadata: { days_back: daysBack },
    });

    try {
        // Decrypt token and create client
        const decryptedToken = decryptToken(settings.ksef_token_encrypted);
        const client = createKSeFClient(decryptedToken, settings.ksef_environment as KSeFEnvironment);

        // Variables for Sales Sync results
        let invoicesImported = 0;
        let invoicesFound = 0;
        let hitRateLimit = false;

        // --- SALES INVOICES SYNC ---
        if (shouldSyncSales) {
            // Calculate date range
            const dateTo = new Date();
            const dateFrom = new Date();
            dateFrom.setDate(dateFrom.getDate() - daysBack);

            // Fetch invoices from KSeF
            const invoicesResponse = await client.fetchInvoices({
                dateFrom,
                dateTo,
            });

            if (!invoicesResponse) {
                throw new Error('Failed to fetch invoices from KSeF');
            }

            // Check for rate limit but still process any invoices we got
            hitRateLimit = invoicesResponse.processingCode === 429;
            invoicesFound = invoicesResponse.numberOfElements;
            let invoicesSkipped = 0;

            // Sort invoices by date descending (newest first)
            const sortedInvoices = [...invoicesResponse.invoiceHeaderList].sort((a, b) => {
                const dateA = new Date(a.invoicingDate || a.acquisitionTimestamp || 0).getTime();
                const dateB = new Date(b.invoicingDate || b.acquisitionTimestamp || 0).getTime();
                return dateB - dateA;
            });

            console.log('[Sync] Processing', sortedInvoices.length, 'sales invoices (rate limit:', hitRateLimit, ')');


            for (const invoiceHeader of sortedInvoices) {
                // Check if we've reached the max invoice limit
                if (maxInvoices && invoicesImported >= maxInvoices) {
                    console.log('[Sync] Reached max invoice limit:', maxInvoices);
                    break;
                }

                // Log full invoice structure for first invoice to understand format
                if (invoicesImported + invoicesSkipped === 0) {
                    console.log('[Sync] FIRST INVOICE FULL STRUCTURE:');
                    console.log('[Sync]', JSON.stringify(invoiceHeader, null, 2));
                }

                // KSeF 2.0 API uses 'seller' and 'buyer' structure
                // Old format: subjectBy.issuedByIdentifier.identifier
                // New format: seller.nip
                // Also check for nested structures
                const inv = invoiceHeader as unknown as Record<string, unknown>;
                const sellerNip = invoiceHeader.seller?.nip ||
                    invoiceHeader.subjectBy?.issuedByIdentifier?.identifier ||
                    invoiceHeader.sellerNip ||
                    (inv.seller as Record<string, unknown>)?.nip as string ||
                    (inv.subjectBy as Record<string, unknown>)?.issuedByIdentifier as string;

                console.log('[Sync] Processing invoice:', invoiceHeader.ksefReferenceNumber || invoiceHeader.ksefNumber, 'seller:', sellerNip);

                // Filter: Only import invoices where OUR NIP is the seller (sales invoices)
                if (sellerNip && sellerNip !== settings.ksef_nip) {
                    // This is a purchase invoice (we are the buyer), skip it
                    console.log('[Sync] Skipping - seller NIP mismatch:', sellerNip, 'vs', settings.ksef_nip);
                    invoicesSkipped++;
                    continue;
                }

                // KSeF 2.0 uses ksefNumber, 1.0 uses ksefReferenceNumber
                const ksefRef = invoiceHeader.ksefReferenceNumber || invoiceHeader.ksefNumber || '';

                // Check if invoice already exists
                const { data: existingInvoice } = await supabase
                    .from('invoices')
                    .select('id')
                    .eq('ksef_number', ksefRef)
                    .single();

                if (existingInvoice) {
                    // Skip already imported invoices
                    console.log('[Sync] Skipping - already exists:', ksefRef);
                    continue;
                }

                // Find or create debtor based on buyer NIP
                // KSeF 2.0: buyer.identifier.value or buyer.nip
                // KSeF 1.0: subjectTo.issuedToIdentifier.identifier
                const buyerInvData = invoiceHeader as unknown as Record<string, unknown>;
                const buyerData = buyerInvData.buyer as Record<string, unknown> | undefined;
                const buyerIdentifier = buyerData?.identifier as Record<string, unknown> | undefined;

                const buyerNip =
                    invoiceHeader.buyer?.nip ||
                    (buyerIdentifier?.value as string) ||
                    invoiceHeader.buyer?.identifier?.value ||
                    invoiceHeader.subjectTo?.issuedToIdentifier?.identifier;

                const buyerName = invoiceHeader.buyer?.name ||
                    (buyerData?.name as string) ||
                    invoiceHeader.subjectTo?.issuedToName?.fullName ||
                    invoiceHeader.subjectTo?.issuedToName?.tradeName ||
                    'Nieznany kontrahent';

                console.log('[Sync] Buyer NIP:', buyerNip, 'Name:', buyerName);

                let debtorId: string | null = null;
                let sequenceId: string | null = null;

                // Get default sequence for new debtors - check user's sequences first, then system sequences
                let defaultSequence = null;

                // 1. Try user's default sequence
                const { data: userDefaultSeq } = await supabase
                    .from('sequences')
                    .select('id, name')
                    .eq('user_id', user.id)
                    .eq('is_default', true)
                    .single();

                if (userDefaultSeq) {
                    defaultSequence = userDefaultSeq;
                    console.log('[Sync] Using user default sequence:', userDefaultSeq.name);
                } else {
                    // 2. Try any user sequence
                    const { data: anyUserSeq } = await supabase
                        .from('sequences')
                        .select('id, name')
                        .eq('user_id', user.id)
                        .limit(1)
                        .single();

                    if (anyUserSeq) {
                        defaultSequence = anyUserSeq;
                        console.log('[Sync] Using user sequence:', anyUserSeq.name);
                    } else {
                        // 3. Try system default sequence (user_id is null, is_default = true)
                        const { data: sysDefaultSeq } = await supabase
                            .from('sequences')
                            .select('id, name')
                            .is('user_id', null)
                            .eq('is_default', true)
                            .single();

                        if (sysDefaultSeq) {
                            defaultSequence = sysDefaultSeq;
                            console.log('[Sync] Using system default sequence:', sysDefaultSeq.name);
                        } else {
                            // 4. Try any system sequence
                            const { data: anySysSeq } = await supabase
                                .from('sequences')
                                .select('id, name')
                                .is('user_id', null)
                                .limit(1)
                                .single();

                            if (anySysSeq) {
                                defaultSequence = anySysSeq;
                                console.log('[Sync] Using system sequence:', anySysSeq.name);
                            } else {
                                console.log('[Sync] WARNING: No sequences found at all!');
                            }
                        }
                    }
                }

                if (buyerNip) {
                    const { data: existingDebtor } = await supabase
                        .from('debtors')
                        .select('id, sequence_id')
                        .eq('nip', buyerNip)
                        .eq('user_id', user.id)
                        .single();

                    if (existingDebtor) {
                        debtorId = existingDebtor.id;
                        // Use debtor's sequence if set, otherwise use default
                        sequenceId = existingDebtor.sequence_id || defaultSequence?.id || null;
                        console.log('[Sync] Found existing debtor:', debtorId);
                    } else {
                        // Create new debtor with default sequence
                        // Try to get additional data from GUS API
                        let gusData: { address?: string; city?: string; postal_code?: string; name?: string } = {};
                        try {
                            const gusResult = await lookupCompanyByNip(buyerNip);
                            if (gusResult.success && gusResult.data) {
                                gusData = {
                                    address: gusResult.data.address,
                                    city: gusResult.data.city,
                                    postal_code: gusResult.data.postal_code,
                                    name: gusResult.data.name,
                                };
                                console.log('[Sync] Got GUS data for debtor:', gusData.name);
                            }
                        } catch (gusError) {
                            console.log('[Sync] Could not fetch GUS data:', gusError);
                        }

                        const { data: newDebtor, error: debtorError } = await supabase
                            .from('debtors')
                            .insert({
                                user_id: user.id,
                                name: gusData.name || buyerName,
                                nip: buyerNip,
                                address: gusData.address || null,
                                city: gusData.city || null,
                                postal_code: gusData.postal_code || null,
                                sequence_id: defaultSequence?.id || null,
                            })
                            .select('id')
                            .single();

                        if (debtorError) {
                            console.error('[Sync] Failed to create debtor:', buyerNip, debtorError.message);
                        } else {
                            debtorId = newDebtor?.id || null;
                            console.log('[Sync] Created new debtor with GUS data:', debtorId);
                        }
                        sequenceId = defaultSequence?.id || null;
                    }
                } else {
                    // No NIP - use default sequence
                    sequenceId = defaultSequence?.id || null;
                }

                // Create invoice
                // KSeF 2.0 API uses grossAmount, netAmount, vatAmount (camelCase numbers)
                // Old format used gross, net, vat (strings)
                const invData = invoiceHeader as unknown as Record<string, unknown>;
                const grossAmount = Number(invData.grossAmount || invoiceHeader.gross || 0);
                const netAmount = Number(invData.netAmount || invoiceHeader.net || 0);
                const vatAmount = Number(invData.vatAmount || invoiceHeader.vat || 0);

                console.log('[Sync] Invoice amounts:', { grossAmount, netAmount, vatAmount });

                // Default due date is 14 days from invoice date
                const invoiceDate = new Date(invoiceHeader.invoicingDate);
                const dueDate = new Date(invoiceDate);
                dueDate.setDate(dueDate.getDate() + 14);

                // Use ksefNumber (2.0) or ksefReferenceNumber (1.0)
                const ksefNumber = invoiceHeader.ksefNumber || invoiceHeader.ksefReferenceNumber || ksefRef;

                // Calculate status based on due date
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                const dueDateClean = new Date(dueDate);
                dueDateClean.setHours(0, 0, 0, 0);

                const daysUntilDue = Math.ceil((dueDateClean.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

                // Check for payment info in KSeF invoice data
                // Look for "Informacja o płatności: Zapłacono" or similar
                const paymentInfo = invData.paymentInfo || invData.paymentTerms || invData.payment || '';
                const paymentDescription = String(invData.paymentDescription || invData.description || '');
                const additionalInfo = String(invData.additionalInfo || invData.notes || '');
                const rawDataString = JSON.stringify(invData).toLowerCase();

                const isPaid =
                    rawDataString.includes('zapłacono') ||
                    rawDataString.includes('zaplacono') ||
                    rawDataString.includes('paid') ||
                    String(paymentInfo).toLowerCase().includes('zapłacono') ||
                    paymentDescription.toLowerCase().includes('zapłacono') ||
                    additionalInfo.toLowerCase().includes('zapłacono');

                let invoiceStatus: string;
                if (isPaid) {
                    invoiceStatus = 'paid';  // Zapłacona (wykryte z KSeF)
                    console.log('[Sync] Invoice marked as PAID based on KSeF payment info');
                } else if (daysUntilDue < 0) {
                    invoiceStatus = 'overdue';  // Przeterminowana
                } else if (daysUntilDue <= 7) {
                    invoiceStatus = 'due_soon';  // Bliski termin
                } else {
                    invoiceStatus = 'pending';  // Oczekująca
                }

                console.log('[Sync] Invoice status:', invoiceStatus, 'days until due:', daysUntilDue);
                console.log('[Sync] Assigning sequence_id:', sequenceId, 'to invoice for debtor:', debtorId);

                const { data: newInvoice, error: invoiceError } = await supabase
                    .from('invoices')
                    .insert({
                        user_id: user.id,
                        debtor_id: debtorId,
                        sequence_id: sequenceId,  // Assigned sequence from debtor or default
                        invoice_number: invoiceHeader.invoiceNumber,
                        amount: grossAmount,
                        amount_net: netAmount,
                        amount_gross: grossAmount,
                        vat_amount: vatAmount,
                        issue_date: invoiceHeader.invoicingDate,
                        due_date: dueDate.toISOString().split('T')[0],
                        status: invoiceStatus,  // Dynamic based on due date
                        ksef_number: ksefNumber,
                        ksef_status: settings.auto_confirm_invoices ? 'confirmed' : 'pending_confirmation',
                        imported_from_ksef: true,
                        ksef_import_date: new Date().toISOString(),
                        ksef_raw_data: invoiceHeader,
                    })
                    .select('id')
                    .single();

                if (invoiceError) {
                    console.error('[Sync] Failed to insert invoice:', ksefNumber, invoiceError.message);
                } else if (newInvoice) {
                    console.log('[Sync] Inserted invoice:', ksefNumber);
                    invoicesImported++;

                    // NEW: Fetch and parse XML to get invoice items
                    try {
                        const xmlContent = await client.getInvoiceXml(ksefNumber);
                        if (xmlContent) {
                            const { items } = parseKSeFXml(xmlContent);
                            if (items.length > 0) {
                                console.log(`[Sync] Found ${items.length} items for invoice ${ksefNumber}`);
                                const itemsToInsert = items.map(item => ({
                                    invoice_id: newInvoice.id,
                                    description: item.description,
                                    quantity: item.quantity,
                                    unit_price_net: item.unitPriceNet,
                                    unit_price_gross: item.unitPriceGross,
                                    vat_rate: item.vatRate,
                                    total_net: item.totalNet,
                                    total_gross: item.totalGross,
                                    unit: item.unit
                                }));

                                await supabase.from('invoice_items').insert(itemsToInsert);
                            }
                        }
                    } catch (xmlError) {
                        console.error(`[Sync] Failed to fetch/parse XML for ${ksefNumber}:`, xmlError);
                    }

                    // Generate scheduled steps if invoice has a sequence assigned
                    if (sequenceId) {
                        const dueDateStr = dueDate.toISOString().split('T')[0];
                        const scheduleResult = await generateScheduledSteps(newInvoice.id, sequenceId, dueDateStr);
                        if (scheduleResult.error) {
                            console.error('[Sync] Failed to generate scheduled steps:', scheduleResult.error);
                        } else {
                            console.log('[Sync] Generated', scheduleResult.count, 'scheduled steps for invoice');
                        }
                    }
                }
            }

        } else {
            console.log('[Sync] Sales sync skipped.');
        }

        // Update sync status
        await supabase
            .from('user_ksef_settings')
            .update({
                last_sync_at: new Date().toISOString(),
                last_sync_status: 'success',
                last_sync_error: null,
                invoices_synced_count: (settings.invoices_synced_count || 0) + invoicesImported,
            })
            .eq('user_id', user.id);

        // Log sync complete
        await supabase.from('ksef_audit_log').insert({
            user_id: user.id,
            action: 'sync_completed',
            metadata: {
                invoices_found: invoicesFound,
                invoices_imported: invoicesImported,
            },
        });

        // Sync Cost Invoices (Purchase invoices)
        // We do this AFTER sales invoices
        let costInvoicesImported = 0;
        let costInvoicesError = '';

        if (shouldSyncCosts) {
            try {
                console.log('[Sync] Starting Cost Invoices sync...');
                // Note: syncKSeFCostInvoices handles its own implementation details, 
                // but we might want to pass syncMode logic down if it becomes complex.
                // For now, simple call is enough as we guarded it with shouldSyncCosts.
                const costResult = await syncKSeFCostInvoices(daysBack, maxInvoices);
                if (costResult.success) {
                    costInvoicesImported = costResult.invoicesImported || 0;
                    console.log('[Sync] Cost Invoices synced:', costInvoicesImported);
                } else {
                    console.error('[Sync] Cost Invoices sync failed:', costResult.error);
                    costInvoicesError = costResult.error || 'Unknown cost sync error';
                }
            } catch (costErr) {
                console.error('[Sync] Cost Invoices sync exception:', costErr);
                costInvoicesError = 'Exception during cost sync';
            }
        } else {
            console.log('[Sync] Costs sync skipped.');
        }

        const totalImported = invoicesImported + costInvoicesImported;

        return {
            success: (!hitRateLimit || invoicesImported > 0) || costInvoicesImported > 0,
            invoicesFound,
            invoicesImported: totalImported,
            salesImported: invoicesImported,
            costsImported: costInvoicesImported,
            error: hitRateLimit && invoicesImported === 0 && costInvoicesImported === 0
                ? 'Przekroczono limit zapytań do KSeF (max 20/godz.). Spróbuj ponownie za ok. godzinę.'
                : (costInvoicesError ? `Sprzedaż OK, ale błąd kosztów: ${costInvoicesError}` : undefined),
            warning: hitRateLimit && invoicesImported > 0
                ? `Osiągnięto limit zapytań KSeF. Zaimportowano ${invoicesImported} faktur sprzedaży. Pozostałe będą dostępne za ok. godzinę.`
                : undefined,
        };
    } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';

        // Update sync status with error
        await supabase
            .from('user_ksef_settings')
            .update({
                last_sync_at: new Date().toISOString(),
                last_sync_status: 'failed',
                last_sync_error: errorMessage,
            })
            .eq('user_id', user.id);

        // Log sync failed
        await supabase.from('ksef_audit_log').insert({
            user_id: user.id,
            action: 'sync_failed',
            metadata: { error: errorMessage },
        });

        return {
            success: false,
            error: errorMessage,
        };
    }
}
