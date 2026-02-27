import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getKSeFClientForUser } from '@/app/actions/ksef-actions';

export async function GET() {
    try {
        const supabase = await createClient();
        const { data: settings } = await supabase.from('user_ksef_settings')
            .select('user_id')
            .limit(1)
            .single();

        if (!settings) return NextResponse.json({ error: 'No user with KSeF cert found' }, { status: 404 });

        const userId = settings.user_id;
        console.log('[DEBUG-KSEF] Starting debug for user:', userId);

        const client = await getKSeFClientForUser(userId);
        console.log('[DEBUG-KSEF] Client created, initiating session...');

        // First init session explicitly
        const session = await client.initSession();
        console.log('[DEBUG-KSEF] Session result:', session ? 'OK' : 'FAILED');

        if (!session) {
            return NextResponse.json({ error: 'Session init failed' });
        }

        // Try fetch with 90 days back to ensure we catch invoices
        const dateTo = new Date();
        const dateFrom = new Date();
        dateFrom.setDate(dateFrom.getDate() - 90);

        console.log(`[DEBUG-KSEF] Fetching Subject2 (costs) from ${dateFrom.toISOString()} to ${dateTo.toISOString()}`);

        // Raw API call to see exact response
        const rawResponse = await (client as any).fetchRawInvoices?.({
            dateFrom, dateTo, subjectType: 'Subject2'
        }) ?? await client.fetchInvoices({ dateFrom, dateTo, subjectType: 'Subject2' });

        console.log('[DEBUG-KSEF] Invoice response:', JSON.stringify({
            numberOfElements: rawResponse?.numberOfElements,
            invoiceCount: rawResponse?.invoiceHeaderList?.length,
            processingCode: rawResponse?.processingCode,
            processingDesc: rawResponse?.processingDescription,
            firstInvoice: rawResponse?.invoiceHeaderList?.[0],
        }, null, 2));

        return NextResponse.json({
            success: true,
            session_ref: session.referenceNumber,
            numberOfElements: rawResponse?.numberOfElements,
            invoiceCount: rawResponse?.invoiceHeaderList?.length,
            processingCode: rawResponse?.processingCode,
            processingDescription: rawResponse?.processingDescription,
            firstInvoice: rawResponse?.invoiceHeaderList?.[0] ?? null,
            allInvoiceNumbers: rawResponse?.invoiceHeaderList?.map((i: any) => ({
                ref: i.ksefReferenceNumber || i.ksefNumber,
                num: i.invoiceNumber,
                date: i.invoicingDate,
                sellerNip: i.seller?.nip || i.sellerNip,
                keys: Object.keys(i),
            })) ?? [],
        });

    } catch (err: any) {
        console.error('[DEBUG-KSEF] Error:', err);
        return NextResponse.json({ error: err.message, stack: err.stack?.substring(0, 500) });
    }
}
