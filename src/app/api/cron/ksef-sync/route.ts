'use server';

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createKSeFClient } from '@/lib/ksef/client';
import type { KSeFEnvironment } from '@/lib/ksef/types';
import { generateScheduledSteps } from '@/lib/sequences/generate-schedule';

// Decrypt token (same as in ksef-actions)
function decryptToken(encryptedToken: string): string {
    if (encryptedToken.startsWith('v1:')) {
        const encoded = encryptedToken.slice(3);
        return Buffer.from(encoded, 'base64').toString('utf-8');
    }
    return encryptedToken;
}

// This endpoint syncs KSeF invoices for users with automatic sync enabled
// Should be called by a cron job every 15 minutes
export async function GET(request: NextRequest) {
    // Verify cron secret for security
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Use service role for cron jobs
    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const today = new Date().toISOString().split('T')[0];
    const currentTime = new Date().toLocaleTimeString('pl-PL', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
    });

    console.log(`[KSeF Cron] Running at ${currentTime}, date: ${today}`);

    // Get users needing sync
    const { data: usersToSync, error: fetchError } = await supabase
        .from('user_ksef_settings')
        .select('*')
        .eq('is_enabled', true)
        .eq('sync_frequency', 'daily')
        .not('ksef_token_encrypted', 'is', null)
        .lte('sync_time', currentTime);

    if (fetchError) {
        console.error('[KSeF Cron] Error fetching users:', fetchError);
        return NextResponse.json({ error: fetchError.message }, { status: 500 });
    }

    // Filter users who haven't synced today
    const usersNeedingSync = (usersToSync || []).filter(user => {
        if (!user.last_sync_at) return true;
        const lastSyncDate = user.last_sync_at.split('T')[0];
        return lastSyncDate !== today;
    });

    console.log(`[KSeF Cron] Found ${usersNeedingSync.length} users needing sync`);

    const results = {
        usersChecked: (usersToSync || []).length,
        usersSynced: 0,
        invoicesTotal: 0,
        failed: 0,
        errors: [] as string[]
    };

    for (const settings of usersNeedingSync) {
        try {
            console.log(`[KSeF Cron] Syncing user ${settings.user_id} (NIP: ${settings.ksef_nip})`);

            // Decrypt token and create KSeF client
            const decryptedToken = decryptToken(settings.ksef_token_encrypted);
            const client = createKSeFClient(decryptedToken, settings.ksef_environment as KSeFEnvironment);

            // Fetch from last 24 hours
            const dateTo = new Date();
            const dateFrom = new Date();
            dateFrom.setDate(dateFrom.getDate() - 1);

            const invoicesResponse = await client.fetchInvoices({ dateFrom, dateTo });

            if (!invoicesResponse) {
                throw new Error('Failed to fetch invoices from KSeF');
            }

            let invoicesImported = 0;
            let debtorsCreated = 0;

            // Get default sequence for this user
            let defaultSequence = null;
            const { data: userDefaultSeq } = await supabase
                .from('sequences')
                .select('id, name')
                .eq('user_id', settings.user_id)
                .eq('is_default', true)
                .single();

            if (userDefaultSeq) {
                defaultSequence = userDefaultSeq;
            } else {
                const { data: sysDefaultSeq } = await supabase
                    .from('sequences')
                    .select('id, name')
                    .is('user_id', null)
                    .eq('is_default', true)
                    .single();
                defaultSequence = sysDefaultSeq;
            }

            // Process each invoice
            for (const invoiceHeader of invoicesResponse.invoiceHeaderList) {
                const ksefRef = invoiceHeader.ksefReferenceNumber || invoiceHeader.ksefNumber || '';

                // Check if already exists
                const { data: existing } = await supabase
                    .from('invoices')
                    .select('id')
                    .eq('ksef_number', ksefRef)
                    .single();

                if (existing) {
                    continue;
                }

                // Check if we are the seller (only import sales invoices)
                const inv = invoiceHeader as unknown as Record<string, unknown>;
                const sellerNip = invoiceHeader.seller?.nip ||
                    (inv.seller as Record<string, unknown>)?.nip as string;

                if (sellerNip && sellerNip !== settings.ksef_nip) {
                    continue; // Skip purchase invoices
                }

                // Get buyer info
                const buyerData = inv.buyer as Record<string, unknown> | undefined;
                const buyerIdentifier = buyerData?.identifier as Record<string, unknown> | undefined;
                const buyerNip = invoiceHeader.buyer?.nip || (buyerIdentifier?.value as string);
                const buyerName = invoiceHeader.buyer?.name || (buyerData?.name as string) || 'Nieznany kontrahent';

                // Find or create debtor
                let debtorId: string | null = null;
                let sequenceId = defaultSequence?.id || null;

                if (buyerNip) {
                    const { data: existingDebtor } = await supabase
                        .from('debtors')
                        .select('id, sequence_id')
                        .eq('nip', buyerNip)
                        .eq('user_id', settings.user_id)
                        .single();

                    if (existingDebtor) {
                        debtorId = existingDebtor.id;
                        sequenceId = existingDebtor.sequence_id || sequenceId;
                    } else {
                        const { data: newDebtor } = await supabase
                            .from('debtors')
                            .insert({
                                user_id: settings.user_id,
                                name: buyerName,
                                nip: buyerNip,
                                sequence_id: sequenceId,
                            })
                            .select('id')
                            .single();
                        debtorId = newDebtor?.id || null;
                        if (newDebtor) {
                            debtorsCreated++;
                        }
                    }
                }

                // Get amounts
                const grossAmount = Number(inv.grossAmount || 0);
                const netAmount = Number(inv.netAmount || 0);
                const vatAmount = Number(inv.vatAmount || 0);

                // Calculate dates
                const invoiceDate = new Date(invoiceHeader.invoicingDate);
                const dueDate = new Date(invoiceDate);
                dueDate.setDate(dueDate.getDate() + 14);

                // Calculate status based on due date
                const todayDate = new Date();
                todayDate.setHours(0, 0, 0, 0);
                const dueDateClean = new Date(dueDate);
                dueDateClean.setHours(0, 0, 0, 0);
                const daysUntilDue = Math.ceil((dueDateClean.getTime() - todayDate.getTime()) / (1000 * 60 * 60 * 24));

                let invoiceStatus: string;
                if (daysUntilDue < 0) {
                    invoiceStatus = 'overdue';
                } else if (daysUntilDue <= 7) {
                    invoiceStatus = 'due_soon';
                } else {
                    invoiceStatus = 'pending';
                }

                // Insert invoice
                const { data: newInvoice, error: invoiceError } = await supabase
                    .from('invoices')
                    .insert({
                        user_id: settings.user_id,
                        debtor_id: debtorId,
                        sequence_id: sequenceId,
                        invoice_number: invoiceHeader.invoiceNumber,
                        amount: grossAmount,
                        amount_net: netAmount,
                        amount_gross: grossAmount,
                        vat_amount: vatAmount,
                        issue_date: invoiceHeader.invoicingDate,
                        due_date: dueDate.toISOString().split('T')[0],
                        status: invoiceStatus,
                        ksef_number: ksefRef,
                        ksef_status: settings.auto_confirm_invoices ? 'confirmed' : 'pending_confirmation',
                        imported_from_ksef: true,
                        ksef_import_date: new Date().toISOString(),
                        ksef_raw_data: invoiceHeader,
                    })
                    .select('id')
                    .single();

                if (invoiceError) {
                    console.error('[KSeF Cron] Failed to insert invoice:', ksefRef, invoiceError.message);
                } else if (newInvoice) {
                    console.log('[KSeF Cron] Inserted invoice:', ksefRef);
                    invoicesImported++;

                    // Generate scheduled steps if sequence assigned
                    if (sequenceId) {
                        const dueDateStr = dueDate.toISOString().split('T')[0];
                        await generateScheduledSteps(newInvoice.id, sequenceId, dueDateStr);
                    }
                }
            }

            // Update sync status
            await supabase
                .from('user_ksef_settings')
                .update({
                    last_sync_at: new Date().toISOString(),
                    last_sync_status: 'success',
                    last_sync_error: null,
                    invoices_synced_count: (settings.invoices_synced_count || 0) + invoicesImported
                })
                .eq('user_id', settings.user_id);

            // Create notification for user
            if (invoicesImported > 0 || debtorsCreated > 0) {
                const invoiceText = invoicesImported === 1 ? 'fakturę' :
                    invoicesImported > 1 && invoicesImported < 5 ? 'faktury' : 'faktur';
                const debtorText = debtorsCreated === 1 ? 'kontrahenta' :
                    debtorsCreated > 1 && debtorsCreated < 5 ? 'kontrahentów' : 'kontrahentów';

                let message = `Zaimportowano ${invoicesImported} ${invoiceText}`;
                if (debtorsCreated > 0) {
                    message += `, utworzono ${debtorsCreated} nowych ${debtorText}`;
                }

                await supabase.from('notifications').insert({
                    user_id: settings.user_id,
                    type: 'ksef_sync',
                    title: 'Synchronizacja KSeF zakończona',
                    message,
                    link: '/invoices'
                });
            }

            results.usersSynced++;
            results.invoicesTotal += invoicesImported;
            console.log(`[KSeF Cron] User ${settings.user_id}: imported ${invoicesImported} invoices, ${debtorsCreated} new debtors`);

        } catch (err) {
            console.error(`[KSeF Cron] Error for user ${settings.user_id}:`, err);
            results.failed++;
            results.errors.push(`User ${settings.user_id}: ${err instanceof Error ? err.message : 'Unknown error'}`);

            // Update with error
            await supabase
                .from('user_ksef_settings')
                .update({
                    last_sync_at: new Date().toISOString(),
                    last_sync_status: 'error',
                    last_sync_error: err instanceof Error ? err.message : 'Unknown error'
                })
                .eq('user_id', settings.user_id);
        }
    }

    console.log(`[KSeF Cron] Complete: synced ${results.usersSynced}, invoices ${results.invoicesTotal}`);

    return NextResponse.json({
        success: true,
        currentTime,
        ...results
    });
}
