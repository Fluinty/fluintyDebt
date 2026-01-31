import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
    try {
        const searchParams = req.nextUrl.searchParams;
        const msgId = searchParams.get('msgId');
        const status = searchParams.get('status');
        const error = searchParams.get('error');

        // SMSAPI sends ID as 'MsgId' or 'msgId' depending on configuration
        // We log the incoming request for debugging
        console.log('SMSAPI Webhook:', {
            msgId,
            status,
            error,
            params: Object.fromEntries(searchParams.entries())
        });

        if (!msgId) {
            return NextResponse.json({ error: 'Missing msgId' }, { status: 400 });
        }

        const supabase = await createClient();

        // Map SMSAPI status to our system status
        // SMSAPI statuses: SENT, DELIVERED, EXPIRED, UNDELIVERED, FAILED, REJECTED, UNKNOWN
        let systemStatus = 'sent';
        if (status === 'DELIVERED') systemStatus = 'delivered'; // We don't have 'delivered' in enum technically, but effectively 'executed' covers it. 
        // Our scheduled_steps statuses: pending, executed, failed, skipped, cancelled
        // Our collection_actions statuses: sent, failed, (maybe delivered?)

        // We primarily update collection_actions history
        // Find the action by metadata->>message_id
        const { data: action } = await supabase
            .from('collection_actions')
            .select('id')
            .eq('metadata->>message_id', msgId)
            .single();

        if (action) {
            await supabase
                .from('collection_actions')
                .update({
                    status: status === 'DELIVERED' ? 'delivered' : (status === 'FAILED' ? 'failed' : 'sent'),
                    // Store full status in metadata
                    metadata: {
                        message_id: msgId,
                        smsapi_status: status,
                        smsapi_error: error
                    }
                })
                .eq('id', action.id);
        }

        return NextResponse.json({ success: true });
    } catch (err) {
        console.error('Webhook Error:', err);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function GET(req: NextRequest) {
    // SMSAPI sometimes uses GET
    return POST(req);
}
