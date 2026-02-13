'use server';

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { executeScheduledStep } from '@/app/actions/email-actions';

// This endpoint processes scheduled steps that are due today
// It should be called by a cron job (e.g., every 15 minutes)
// Only processes invoices where auto_send_enabled = true and current time >= send_time

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
        timeZone: 'Europe/Warsaw',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
    });

    console.log(`[Cron] Processing sequences for date <= ${today}, time >= ${currentTime} (PL)`);

    // Get all pending scheduled steps for today
    // Join with invoices to check auto_send_enabled and send_time
    const { data: pendingSteps, error } = await supabase
        .from('scheduled_steps')
        .select(`
            id,
            invoice_id,
            sequence_step_id,
            scheduled_for,
            invoices!inner (
                id,
                auto_send_enabled,
                send_time,
                status,
                user_id
            )
        `)
        .eq('status', 'pending')
        .lte('scheduled_for', today)
        .eq('invoices.auto_send_enabled', true)
        .lte('invoices.send_time', currentTime)
        .not('invoices.status', 'in', '(paid,written_off)');

    if (error) {
        console.error('Error fetching pending steps:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!pendingSteps || pendingSteps.length === 0) {
        return NextResponse.json({
            success: true,
            message: 'No pending steps to process',
            processed: 0
        });
    }

    const results = {
        processed: 0,
        successCount: 0,
        failed: 0,
        errors: [] as string[],
    };

    // Process each pending step
    for (const step of pendingSteps) {
        try {
            const result = await executeScheduledStep(step.id);

            if (result.success) {
                results.successCount++;
            } else {
                results.failed++;
                results.errors.push(`Step ${step.id}: ${result.error}`);
            }
            results.processed++;
        } catch (err) {
            results.failed++;
            results.errors.push(`Step ${step.id}: ${err instanceof Error ? err.message : 'Unknown error'}`);
        }
    }

    console.log(`Cron job completed: processed ${results.processed}, success ${results.successCount}, failed ${results.failed}`);

    return NextResponse.json({
        success: true,
        message: `Processed ${results.processed} scheduled steps`,
        ...results,
    });
}
