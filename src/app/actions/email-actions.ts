'use server';

import { createClient } from '@/lib/supabase/server';
import { sendCollectionEmail } from '@/lib/email/resend-client';
import { generatePaymentReminderPDF } from '@/lib/pdf/generator';
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
                    email,
                    preferred_language
                )
            ),
            sequence_steps (
                id,
                channel,
                email_subject,
                email_body,
                email_subject_en,
                email_body_en
            )
        `)
        .eq('id', stepId)
        .single();

    // ... validation logic omitted for brevity ...
    // (unchanged validation logic)

    if (stepError || !step) {
        return { error: 'Nie znaleziono kroku' };
    }

    if (step.status !== 'pending') {
        return { error: `Krok ma status "${step.status}" - można wykonać tylko oczekujące` };
    }

    const invoice = step.invoices as any;
    const sequenceStep = step.sequence_steps as any;
    const debtor = invoice?.debtors;

    // Get current user for logging
    const { data: { user } } = await supabase.auth.getUser();

    if (!debtor?.email) {
        // ... (unchanged failure logic) ...
        // Update status to failed
        await supabase
            .from('scheduled_steps')
            .update({ status: 'failed' })
            .eq('id', stepId);

        // Log to collection_actions
        await supabase.from('collection_actions').insert({
            user_id: user?.id,
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

    // Select language-appropriate content (fallback to PL if EN not available)
    const debtorLanguage = debtor.preferred_language || 'pl';
    const emailSubject = (debtorLanguage === 'en' && sequenceStep.email_subject_en)
        ? sequenceStep.email_subject_en
        : sequenceStep.email_subject;
    const emailBody = (debtorLanguage === 'en' && sequenceStep.email_body_en)
        ? sequenceStep.email_body_en
        : sequenceStep.email_body;

    // Calculate days overdue
    const today = new Date();
    const dueDate = new Date(invoice.due_date);
    const daysOverdue = Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));

    // Get company name from profile
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

    // Generate PDF attachment
    let attachments = undefined;
    try {
        if (user?.id) {
            const { buffer, filename, error: pdfError } = await generatePaymentReminderPDF(invoice.id, user.id);
            if (buffer && filename) {
                attachments = [{
                    filename: filename,
                    content: buffer,
                }];
                console.log('[Email] PDF attachment generated:', filename);
            } else {
                console.error('[Email] Failed to generate PDF attachment:', pdfError);
            }
        }
    } catch (pdfErr) {
        console.error('[Email] Error generating PDF attachment:', pdfErr);
    }

    // Send email
    const result = await sendCollectionEmail({
        to: debtor.email,
        subject: emailSubject,
        body: emailBody,
        invoiceData: {
            invoice_number: invoice.invoice_number,
            amount: Number(invoice.amount),
            due_date: invoice.due_date,
            days_overdue: daysOverdue > 0 ? daysOverdue : 0,
            debtor_name: debtor.name,
            company_name: companyName,
            interest_amount: interestAmount,
            total_with_interest: totalWithInterest,
        },
        attachments: attachments,
    });

    // ... rest of the function (logging, updating status) ...


    if (result.success) {
        // Update scheduled step status using the original stepId parameter
        const { data: updateData, error: updateError, count } = await supabase
            .from('scheduled_steps')
            .update({
                status: 'executed',
                executed_at: new Date().toISOString(),
            })
            .eq('id', stepId)
            .select();

        if (updateError) {
            console.error('UPDATE ERROR:', updateError.message, updateError.details);
        } else if (!updateData || updateData.length === 0) {
            console.error('NO ROWS UPDATED for stepId:', stepId);
        } else {
            console.log('SUCCESS: Step updated to executed -', updateData[0]?.status);
        }

        // Log success to collection_actions
        await supabase.from('collection_actions').insert({
            user_id: user?.id,
            invoice_id: invoice.id,
            action_type: sequenceStep.channel || 'email',
            channel: sequenceStep.channel || 'email',
            recipient_email: debtor.email,
            status: 'sent',
            sent_at: new Date().toISOString(),
            metadata: { message_id: result.messageId },
        });

        // Revalidate pages to show updated status
        revalidatePath('/scheduler');
        revalidatePath('/invoices');
        revalidatePath(`/invoices/${step.invoice_id}`);
        revalidatePath('/dashboard');

        return { success: true, messageId: result.messageId };
    } else {
        // Update status to failed
        await supabase
            .from('scheduled_steps')
            .update({ status: 'failed' })
            .eq('id', stepId);

        // Log failure
        await supabase.from('collection_actions').insert({
            user_id: user?.id,
            invoice_id: invoice.id,
            action_type: sequenceStep.channel || 'email',
            channel: sequenceStep.channel || 'email',
            recipient_email: debtor.email,
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
