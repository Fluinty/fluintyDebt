'use server';

import { createClient } from '@/lib/supabase/server';
import { sendCollectionEmail } from '@/lib/email/resend-client';
import { revalidatePath } from 'next/cache';

/**
 * Execute a single scheduled step - send the email and update status
 */
export async function executeScheduledStep(stepId: string) {
    const supabase = await createClient();

    // Get the scheduled step with all related data
    const { data: step, error: stepError } = await supabase
        .from('scheduled_steps')
        .select(`
            id,
            status,
            invoice_id,
            invoices (
                id,
                invoice_number,
                amount,
                due_date,
                debtors (
                    id,
                    name,
                    email
                )
            ),
            sequence_steps (
                id,
                channel,
                email_subject,
                email_body
            )
        `)
        .eq('id', stepId)
        .single();

    if (stepError || !step) {
        return { error: 'Nie znaleziono kroku' };
    }

    if (step.status !== 'pending') {
        return { error: `Krok ma status "${step.status}" - można wykonać tylko oczekujące` };
    }

    const invoice = step.invoices as any;
    const sequenceStep = step.sequence_steps as any;
    const debtor = invoice?.debtors;

    if (!debtor?.email) {
        // Update status to failed
        await supabase
            .from('scheduled_steps')
            .update({ status: 'failed' })
            .eq('id', stepId);

        // Log to collection_actions
        await supabase.from('collection_actions').insert({
            invoice_id: invoice?.id,
            action_type: sequenceStep?.channel || 'email',
            status: 'failed',
            error_message: 'Brak adresu email kontrahenta',
        });

        return { error: 'Kontrahent nie ma adresu email' };
    }

    if (!sequenceStep?.email_subject || !sequenceStep?.email_body) {
        return { error: 'Brak szablonu email w kroku sekwencji' };
    }

    // Calculate days overdue
    const today = new Date();
    const dueDate = new Date(invoice.due_date);
    const daysOverdue = Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));

    // Get company name from profile
    const { data: { user } } = await supabase.auth.getUser();
    const { data: profile } = await supabase
        .from('profiles')
        .select('company_name')
        .eq('id', user?.id)
        .single();

    const companyName = profile?.company_name || 'Wierzyciel';

    // Calculate interest if overdue
    let interestAmount = 0;
    let totalWithInterest = Number(invoice.amount);
    if (daysOverdue > 0) {
        // Simple interest calculation: 11.5% annual rate (ustawowe)
        const annualRate = 0.115;
        interestAmount = Number(invoice.amount) * (annualRate / 365) * daysOverdue;
        totalWithInterest = Number(invoice.amount) + interestAmount;
    }

    // Send the email
    const result = await sendCollectionEmail({
        to: debtor.email,
        subject: sequenceStep.email_subject,
        body: sequenceStep.email_body,
        invoiceData: {
            invoice_number: invoice.invoice_number,
            amount: invoice.amount,
            due_date: invoice.due_date,
            days_overdue: daysOverdue > 0 ? daysOverdue : 0,
            debtor_name: debtor.name,
            company_name: companyName,
            interest_amount: interestAmount,
            total_with_interest: totalWithInterest,
        },
    });

    if (result.success) {
        // Update scheduled step status
        await supabase
            .from('scheduled_steps')
            .update({
                status: 'sent',
                executed_at: new Date().toISOString(),
            })
            .eq('id', stepId);

        // Log success to collection_actions
        await supabase.from('collection_actions').insert({
            invoice_id: invoice.id,
            action_type: sequenceStep.channel || 'email',
            status: 'sent',
            details: { message_id: result.messageId, recipient: debtor.email },
        });

        // Revalidate pages to show updated status
        revalidatePath('/scheduler');
        revalidatePath('/invoices');
        revalidatePath(`/invoices/${step.invoice_id}`);

        return { success: true, messageId: result.messageId };
    } else {
        // Update status to failed
        await supabase
            .from('scheduled_steps')
            .update({ status: 'failed' })
            .eq('id', stepId);

        // Log failure
        await supabase.from('collection_actions').insert({
            invoice_id: invoice.id,
            action_type: sequenceStep.channel || 'email',
            status: 'failed',
            error_message: result.error,
        });

        return { error: result.error };
    }
}

/**
 * Process all pending scheduled steps that are due
 */
export async function processAllPendingSteps() {
    const supabase = await createClient();
    const today = new Date().toISOString().split('T')[0];

    // Get all pending steps that are due today or earlier
    const { data: steps } = await supabase
        .from('scheduled_steps')
        .select('id')
        .eq('status', 'pending')
        .lte('scheduled_for', today);

    if (!steps || steps.length === 0) {
        return { processed: 0, success: 0, failed: 0 };
    }

    let success = 0;
    let failed = 0;

    for (const step of steps) {
        const result = await executeScheduledStep(step.id);
        if (result.success) {
            success++;
        } else {
            failed++;
        }
    }

    return { processed: steps.length, success, failed };
}

/**
 * Skip (cancel) earlier pending steps when user sends a later step
 */
export async function skipEarlierSteps(stepIds: string[]) {
    const supabase = await createClient();

    if (stepIds.length === 0) return { success: true };

    const { error } = await supabase
        .from('scheduled_steps')
        .update({ status: 'cancelled' })
        .in('id', stepIds);

    if (error) {
        console.error('Error skipping steps:', error);
        return { error: error.message };
    }

    // Revalidate pages
    revalidatePath('/scheduler');
    revalidatePath('/invoices');

    return { success: true, skipped: stepIds.length };
}
