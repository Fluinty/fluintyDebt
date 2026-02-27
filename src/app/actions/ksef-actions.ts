'use server';

import crypto from 'crypto';
import { createClient } from '@/lib/supabase/server';
import { createKSeFClient } from '@/lib/ksef/client';
import { generateScheduledSteps } from '@/lib/sequences/generate-schedule';
import { lookupCompanyByNip } from '@/lib/gus/gus-client';
import { parseKSeFXml } from '@/lib/ksef/xml-parser';
import { encrypt, decrypt } from '@/lib/ksef/encryption';
import type { KSeFEnvironment, UserKSeFSettings } from '@/lib/ksef/types';

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
        const errorMsg = error.message || 'Unknown error fetching KSeF settings';
        console.error('Error fetching KSeF settings:', error);
        return { settings: null, error: errorMsg };
    }

    if (data) {
        return {
            settings: {
                ...data,
                ksef_cert_password_encrypted: data.ksef_cert_password_encrypted ? '********' : null,
                ksef_token_encrypted: data.ksef_token_encrypted ? '********' : null,
            } as UserKSeFSettings,
        };
    }

    return { settings: null };
}

/**
 * Save or update KSeF settings (supporting File Uploads)
 */
export async function saveKSeFSettings(formData: FormData): Promise<{
    success: boolean;
    error?: string;
}> {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return { success: false, error: 'Unauthorized' };
    }

    const environment = formData.get('ksef_environment') as string;
    const nip = formData.get('ksef_nip') as string;
    const certFormat = formData.get('ksef_cert_format') as 'p12' | 'pem';
    const password = formData.get('ksef_cert_password') as string;

    const certFile = formData.get('ksef_cert_file') as File | null;
    const keyFile = formData.get('ksef_key_file') as File | null;
    const p12File = formData.get('ksef_p12_file') as File | null;

    console.log(`[KSeF Action] saveSettings called. Env: ${environment}, Format: ${certFormat}`);
    console.log(`[KSeF Action] Files: Cert=${!!certFile}, Key=${!!keyFile}, P12=${!!p12File}`);

    if (!process.env.ENCRYPTION_KEY) {
        return { success: false, error: 'Server configuration error: Missing ENCRYPTION_KEY' };
    }

    let certPath = null;
    let keyPath = null;
    let encryptedPassword = null;

    // Encrypt password if provided
    if (password) {
        try {
            encryptedPassword = encrypt(password);
        } catch (e) {
            return { success: false, error: 'Encryption failed' };
        }
    }

    // --- VALIDATION STEP (New) ---
    // We try to validte credentials BEFORE uploading to storage if possible, 
    // or at least before confirming "Saved".

    // We need the text content of files to validate
    let certTextForValidation: string | null = null;
    let keyTextForValidation: string | null = null;

    if (certFormat === 'pem' && certFile && keyFile) {
        certTextForValidation = await certFile.text();
        keyTextForValidation = await keyFile.text();
    }
    // (Skip P12 for now as simpler/harder to parse in browser/node without extraction)

    if (certTextForValidation && keyTextForValidation) {
        try {
            // Check if we can create a client and validate
            // We use a temporary instance just for validation
            const tempClient = createKSeFClient({
                environment: environment as KSeFEnvironment,
                certificate: certTextForValidation,
                privateKey: keyTextForValidation,
                privateKeyPassword: password, // Raw password
                nip: nip
            });

            const validation = tempClient.validateCredentials();
            if (!validation.success) {
                console.warn('[KSeF Validation] Failed during save:', validation.message);
                return { success: false, error: `Błąd weryfikacji certyfikatu/klucza: ${validation.message}` };
            }
            console.log('[KSeF Validation] Credentials valid.');
        } catch (e: any) {
            console.warn('[KSeF Validation] Exception:', e.message);
            return { success: false, error: `Nieprawidłowe pliki certyfikatu/klucza: ${e.message}` };
        }
    }


    try {
        if (certFormat === 'pem' && certFile && keyFile) {
            // Upload Certificate
            const certParams = {
                bucket: 'ksef-certificates',
                path: `${user.id}/certificate.crt`,
                file: certFile
            };
            const { error: certErr } = await supabase.storage
                .from(certParams.bucket)
                .upload(certParams.path, certParams.file, { upsert: true });

            if (certErr) throw new Error(`Cert upload failed: ${certErr.message}`);
            certPath = certParams.path;

            // Upload Private Key
            const keyParams = {
                bucket: 'ksef-certificates',
                path: `${user.id}/private.key`,
                file: keyFile
            };
            const { error: keyErr } = await supabase.storage
                .from(keyParams.bucket)
                .upload(keyParams.path, keyParams.file, { upsert: true });

            if (keyErr) throw new Error(`Key upload failed: ${keyErr.message}`);
            keyPath = keyParams.path;

        } else if (certFormat === 'p12' && p12File) {
            const p12Params = {
                bucket: 'ksef-certificates',
                path: `${user.id}/certificate.p12`,
                file: p12File
            };
            const { error: p12Err } = await supabase.storage
                .from(p12Params.bucket)
                .upload(p12Params.path, p12Params.file, { upsert: true });

            if (p12Err) throw new Error(`P12 upload failed: ${p12Err.message}`);

            // For P12, save same path for both
            certPath = p12Params.path;
            keyPath = p12Params.path;
        }
    } catch (e: any) {
        return { success: false, error: e.message };
    }

    // Update DB — is_enabled starts as false until connection test passes
    const updateData: any = {
        user_id: user.id,
        ksef_environment: environment,
        ksef_nip: nip,
        is_enabled: false,
        updated_at: new Date().toISOString()
    };

    if (certPath) updateData.ksef_cert_storage_path = certPath;
    if (keyPath) updateData.ksef_key_storage_path = keyPath;
    if (certFormat) updateData.ksef_cert_format = certFormat;
    if (encryptedPassword) updateData.ksef_cert_password_encrypted = encryptedPassword;

    const { error: upsertErr } = await supabase
        .from('user_ksef_settings')
        .upsert(updateData, { onConflict: 'user_id' });

    if (upsertErr) {
        console.error('Error saving KSeF settings:', upsertErr);
        return { success: false, error: upsertErr.message };
    }

    await supabase.from('ksef_audit_log').insert({
        user_id: user.id,
        action: 'token_updated',
        metadata: {
            environment,
            nip,
            cert_format: certFormat
        }
    });

    // Auto-test connection after saving. If it succeeds, mark as enabled.
    try {
        const client = await getKSeFClientForUser(user.id);
        const testResult = await client.testConnection();
        if (testResult.success) {
            await supabase
                .from('user_ksef_settings')
                .update({ is_enabled: true })
                .eq('user_id', user.id);
            console.log('[KSeF] Auto-connection test passed, is_enabled set to true');
        } else {
            console.warn('[KSeF] Auto-connection test failed:', testResult.error);
        }
    } catch (e) {
        console.warn('[KSeF] Auto-connection test threw:', e);
    }

    return { success: true };
}

/**
 * Helper to get initialized KSeF Client
 */
export async function getKSeFClientForUser(userId: string) {
    const supabase = await createClient();

    const { data: settings } = await supabase
        .from('user_ksef_settings')
        .select('*')
        .eq('user_id', userId)
        .single();

    if (!settings) throw new Error('KSeF settings not found');

    // Support legacy Token if no certificate
    if (settings.ksef_token_encrypted && !settings.ksef_cert_storage_path) {
        // We'd need to decrypt legacy token, BUT we removed decryptToken function to save space.
        // If we want to support legacy, we need decryptToken back.
        // Re-adding simple decrypt for legacy support if needed, but aim is Cert Auth.
        // Let's assume restoration means new way.
        throw new Error('Please re-configure KSeF using Certificate authentication.');
    }

    if (!settings.ksef_cert_storage_path) throw new Error('Certificate not uploaded');

    const bucket = 'ksef-certificates';

    // Download Cert
    const { data: certData, error: certErr } = await supabase.storage
        .from(bucket)
        .download(settings.ksef_cert_storage_path);
    if (certErr) throw new Error(`Failed to download certificate: ${certErr.message}`);
    const certText = await certData.text();

    // Download Key
    let keyText = certText;
    if (settings.ksef_key_storage_path && settings.ksef_key_storage_path !== settings.ksef_cert_storage_path) {
        const { data: keyData, error: keyErr } = await supabase.storage
            .from(bucket)
            .download(settings.ksef_key_storage_path);
        if (keyErr) throw new Error(`Failed to download private key: ${keyErr.message}`);
        keyText = await keyData.text();
    }

    // Decrypt Password
    let password = undefined;
    if (settings.ksef_cert_password_encrypted) {
        try {
            password = decrypt(settings.ksef_cert_password_encrypted);
        } catch (e) {
            console.error('Failed to decrypt password:', e);
            throw new Error('Failed to decrypt private key password');
        }
    }

    console.log(`[KSeF] Initializing Client. User: ${userId}, Env: "${settings.ksef_environment}", NIP: ${settings.ksef_nip}`);

    return createKSeFClient({
        environment: settings.ksef_environment as KSeFEnvironment,
        certificate: certText,
        privateKey: keyText,
        privateKeyPassword: password,
        nip: settings.ksef_nip
    });
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

    try {
        const client = await getKSeFClientForUser(user.id);

        // NEW: Validate credentials explicitly before trying connection
        // This catches key/cert/pass issues locally first.
        const validation = client.validateCredentials();
        if (!validation.success) {
            return {
                success: false,
                message: 'Błąd weryfikacji certyfikatu',
                error: validation.message
            };
        }

        const result = await client.testConnection();

        await supabase.from('ksef_audit_log').insert({
            user_id: user.id,
            action: result.success ? 'token_accessed' : 'sync_failed',
            metadata: { result: result.success ? 'success' : 'failed' }
        });

        return {
            success: result.success,
            message: result.message,
            error: result.error,
        };
    } catch (e: any) {
        console.error('Test Connection Error:', e);
        return {
            success: false,
            message: 'Błąd konfiguracji lub połączenia',
            error: e.message
        };
    }
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

    // First fetch settings to get file paths
    const { data: settings } = await supabase
        .from('user_ksef_settings')
        .select('ksef_cert_storage_path, ksef_key_storage_path')
        .eq('user_id', user.id)
        .single();

    if (settings) {
        const filesToRemove = [];
        if (settings.ksef_cert_storage_path) filesToRemove.push(settings.ksef_cert_storage_path);
        if (settings.ksef_key_storage_path) filesToRemove.push(settings.ksef_key_storage_path);

        if (filesToRemove.length > 0) {
            const { error: storageError } = await supabase.storage
                .from('ksef-certificates')
                .remove(filesToRemove);

            if (storageError) {
                console.error('Error removing KSeF files:', storageError);
                // We continue to delete the DB record even if storage/cleanup fails, 
                // or maybe we should warn? 
                // Prioritize disconnecting the user.
            }
        }
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
        action: 'token_deleted', // Action name kept as 'token_deleted' or maybe 'settings_deleted'
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

    // Get settings
    const { data: settings } = await supabase
        .from('user_ksef_settings')
        .select('*')
        .eq('user_id', user.id)
        .single();

    if (!settings || (!settings.ksef_token_encrypted && !settings.ksef_cert_storage_path)) {
        return { success: false, error: 'Brak konfiguracji KSeF' };
    }

    // Log sync start
    await supabase.from('ksef_audit_log').insert({
        user_id: user.id,
        action: 'sync_started',
        metadata: { days_back: daysBack },
    });

    try {
        const client = await getKSeFClientForUser(user.id);

        // Variables for Sales Sync results
        let invoicesImported = 0;
        let invoicesFound = 0;

        // --- SALES INVOICES SYNC ---
        if (shouldSyncSales) {
            // Calculate date range
            const dateTo = new Date();
            const dateFrom = new Date();
            dateFrom.setDate(dateFrom.getDate() - daysBack);

            // Fetch invoices from KSeF (throws on auth/API failure with real error message)
            const invoicesResponse = await client.fetchInvoices({
                dateFrom: dateFrom,
                dateTo: dateTo
            });

            if (!invoicesResponse) {
                throw new Error('KSeF nie zwrócił odpowiedzi na zapytanie o faktury');
            }

            invoicesFound = invoicesResponse.numberOfElements;
            let invoicesSkipped = 0;

            // Sort invoices by date descending (newest first)
            const sortedInvoices = [...invoicesResponse.invoiceHeaderList].sort((a, b) => {
                const dateA = new Date(a.invoicingDate || 0).getTime();
                const dateB = new Date(b.invoicingDate || 0).getTime();
                return dateB - dateA;
            });

            console.log('[Sync] Processing', sortedInvoices.length, 'sales invoices');


            for (const invoiceHeader of sortedInvoices) {
                // Check if we've reached the max invoice limit
                if (maxInvoices && invoicesImported >= maxInvoices) {
                    console.log('[Sync] Reached max invoice limit:', maxInvoices);
                    break;
                }

                // KSeF 2.0: Subject1 = my invoices as seller. No extra NIP filter needed.
                // Extract seller NIP just for logging
                const inv = invoiceHeader as unknown as Record<string, unknown>;
                const sellerNip = invoiceHeader.seller?.nip ||
                    invoiceHeader.sellerNip ||
                    (inv.seller as Record<string, unknown>)?.nip as string;
                console.log(`[Sync] Invoice seller NIP: ${sellerNip}, my NIP: ${settings.ksef_nip}`);

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
                    continue;
                }

                // Find or create debtor based on buyer NIP
                const buyerInvData = invoiceHeader as unknown as Record<string, unknown>;
                const buyerData = buyerInvData.buyer as Record<string, unknown> | undefined;
                const buyerIdentifier = buyerData?.identifier as Record<string, unknown> | undefined;

                const buyerNip =
                    invoiceHeader.buyer?.nip ||
                    (buyerIdentifier?.value as string);


                const buyerName = invoiceHeader.buyer?.name ||
                    (buyerData?.name as string) ||
                    'Nieznany kontrahent';

                let debtorId: string | null = null;
                let sequenceId: string | null = null;

                // Get default sequence for new debtors - check user's sequences first, then system sequences
                let defaultSequence = null;

                // 1. Try user's default sequence
                const { data: userDefaultSeq } = await supabase
                    .from('sequences')
                    .select('id')
                    .eq('user_id', user.id)
                    .eq('is_default', true)
                    .single();

                if (userDefaultSeq) {
                    defaultSequence = userDefaultSeq;
                } else {
                    // 2. Try system default sequence
                    const { data: systemDefaultSeq } = await supabase
                        .from('sequences')
                        .select('id')
                        .is('user_id', null)
                        .eq('is_default', true)
                        .single();
                    defaultSequence = systemDefaultSeq;
                }

                sequenceId = defaultSequence?.id || null;

                if (buyerNip) {
                    const { data: existingDebtor } = await supabase
                        .from('debtors')
                        .select('id, default_sequence_id')
                        .eq('nip', buyerNip)
                        .eq('user_id', user.id)
                        .single();

                    if (existingDebtor) {
                        debtorId = existingDebtor.id;
                        // Use debtor's sequence if set, otherwise use default
                        if (existingDebtor.default_sequence_id) {
                            sequenceId = existingDebtor.default_sequence_id;
                        }
                    } else {
                        // Create new debtor
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
                            }
                        } catch (gusError) {
                            console.log('[Sync] Could not fetch GUS data:', gusError);
                        }

                        const { data: newDebtor } = await supabase
                            .from('debtors')
                            .insert({
                                user_id: user.id,
                                name: gusData.name || buyerName,
                                nip: buyerNip,
                                address: gusData.address || null,
                                city: gusData.city || null,
                                postal_code: gusData.postal_code || null,
                                default_sequence_id: sequenceId,
                            })
                            .select('id')
                            .single();

                        debtorId = newDebtor?.id || null;
                    }
                }

                // Create invoice
                const invData = invoiceHeader as unknown as Record<string, unknown>;
                const grossAmount = Number(invData.grossAmount || invoiceHeader.grossAmount || 0);
                const netAmount = Number(invData.netAmount || invoiceHeader.netAmount || 0);
                const vatAmount = Number(invData.vatAmount || invoiceHeader.vatAmount || 0);

                // Default due date is 14 days from invoice date
                const invoiceDate = new Date(invoiceHeader.invoicingDate);
                const dueDate = new Date(invoiceDate);
                dueDate.setDate(dueDate.getDate() + 14);

                // Use ksefNumber (2.0) or ksefReferenceNumber (1.0)
                const ksefNumber = invoiceHeader.ksefNumber || invoiceHeader.ksefReferenceNumber || ksefRef;

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
                        status: 'pending',
                        ksef_number: ksefNumber,
                        ksef_status: settings.auto_confirm_invoices ? 'confirmed' : 'pending_confirmation',
                        imported_from_ksef: true,
                        ksef_import_date: new Date().toISOString()
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

        return {
            success: true,
            invoicesFound,
            invoicesImported,
            salesImported: invoicesImported,
            costsImported: 0,
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
