'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

/**
 * Server action to create invoice with optional sequence scheduling
 */
export async function createInvoiceWithSchedule(data: {
    debtor_id: string;
    invoice_number: string;
    amount: number; // Keep for backwards compatibility (gross amount)
    amount_net?: number;
    vat_rate?: string;
    vat_amount?: number;
    amount_gross?: number;
    issue_date: string;
    due_date: string;
    description?: string;
    sequence_id?: string;
    auto_send_enabled?: boolean;
    send_time?: string;
}) {
    const supabase = await createClient();

    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        return { error: 'Unauthorized' };
    }

    // Determine sequence_id: use provided, or fallback to user's default
    let effectiveSequenceId = data.sequence_id || null;
    if (!effectiveSequenceId) {
        const { data: profile } = await supabase
            .from('profiles')
            .select('default_sequence_id')
            .eq('id', user.id)
            .single();
        effectiveSequenceId = profile?.default_sequence_id || null;
    }

    // Insert invoice
    const { data: invoice, error: invoiceError } = await supabase
        .from('invoices')
        .insert({
            user_id: user.id,
            debtor_id: data.debtor_id,
            invoice_number: data.invoice_number,
            amount: data.amount_gross || data.amount, // Use gross if available
            amount_net: data.amount_net,
            vat_rate: data.vat_rate || '23',
            vat_amount: data.vat_amount || 0,
            amount_gross: data.amount_gross || data.amount,
            issue_date: data.issue_date,
            due_date: data.due_date,
            description: data.description || null,
            sequence_id: effectiveSequenceId,
            status: 'pending',
            auto_send_enabled: data.auto_send_enabled ?? true,
            send_time: data.send_time || '10:00',
        })
        .select('id')
        .single();

    if (invoiceError || !invoice) {
        console.error('Error creating invoice:', invoiceError);
        return { error: invoiceError?.message || 'Failed to create invoice' };
    }

    // If sequence is assigned, generate scheduled steps
    if (effectiveSequenceId) {
        const { data: steps } = await supabase
            .from('sequence_steps')
            .select('*')
            .eq('sequence_id', effectiveSequenceId)
            .order('step_order');

        if (steps && steps.length > 0) {
            const dueDate = new Date(data.due_date);
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const todayStr = today.toISOString().split('T')[0];

            const scheduledSteps = steps
                .map(step => {
                    const scheduledDate = new Date(dueDate);
                    scheduledDate.setDate(scheduledDate.getDate() + step.days_offset);
                    const scheduledStr = scheduledDate.toISOString().split('T')[0];

                    // Skip steps that are in the past - mark as 'skipped'
                    const isPast = scheduledStr < todayStr;

                    return {
                        invoice_id: invoice.id,
                        sequence_step_id: step.id,
                        scheduled_for: scheduledStr,
                        status: isPast ? 'skipped' : 'pending',
                    };
                });

            const { error: stepsError } = await supabase
                .from('scheduled_steps')
                .insert(scheduledSteps);

            if (stepsError) {
                console.error('Error creating scheduled steps:', stepsError);
                // Don't fail the whole operation, invoice was created
            }
        }
    }

    return { success: true, invoiceId: invoice.id };
}

/**
 * Server action to assign/change sequence for existing invoice
 */
export async function assignSequenceToInvoice(invoiceId: string, sequenceId: string | null) {
    const supabase = await createClient();

    // Get invoice details
    const { data: invoice } = await supabase
        .from('invoices')
        .select('due_date')
        .eq('id', invoiceId)
        .single();

    if (!invoice) {
        return { error: 'Invoice not found' };
    }

    // Delete existing pending scheduled steps
    await supabase
        .from('scheduled_steps')
        .delete()
        .eq('invoice_id', invoiceId)
        .eq('status', 'pending');

    // Update invoice sequence_id
    await supabase
        .from('invoices')
        .update({ sequence_id: sequenceId })
        .eq('id', invoiceId);

    // If new sequence assigned, create new scheduled steps
    if (sequenceId) {
        const { data: steps } = await supabase
            .from('sequence_steps')
            .select('*')
            .eq('sequence_id', sequenceId)
            .order('step_order');

        if (steps && steps.length > 0) {
            const dueDate = new Date(invoice.due_date);

            const scheduledSteps = steps.map(step => {
                const scheduledDate = new Date(dueDate);
                scheduledDate.setDate(scheduledDate.getDate() + step.days_offset);

                return {
                    invoice_id: invoiceId,
                    sequence_step_id: step.id,
                    scheduled_for: scheduledDate.toISOString().split('T')[0],
                    status: 'pending',
                };
            });

            await supabase.from('scheduled_steps').insert(scheduledSteps);
        }
    }

    return { success: true };
}

/**
 * Server action to mark an invoice as paid
 */
export async function markInvoiceAsPaid(invoiceId: string, amountPaid?: number) {
    const supabase = await createClient();

    // Get invoice details
    const { data: invoice } = await supabase
        .from('invoices')
        .select('amount, amount_paid')
        .eq('id', invoiceId)
        .single();

    if (!invoice) {
        return { error: 'Invoice not found' };
    }

    const totalAmount = Number(invoice.amount);
    const newAmountPaid = amountPaid ?? totalAmount; // Default to full amount

    // Update invoice
    const { error } = await supabase
        .from('invoices')
        .update({
            amount_paid: newAmountPaid,
            status: newAmountPaid >= totalAmount ? 'paid' : 'partial',
            paid_at: newAmountPaid >= totalAmount ? new Date().toISOString() : null,
        })
        .eq('id', invoiceId);

    if (error) {
        console.error('Error marking invoice as paid:', error);
        return { error: error.message };
    }

    // If fully paid, handle post-payment actions
    if (newAmountPaid >= totalAmount) {
        // 1. Cancel pending steps
        await supabase
            .from('scheduled_steps')
            .update({ status: 'cancelled' })
            .eq('invoice_id', invoiceId)
            .eq('status', 'pending');

        // 2. Update Cash Flow (Balance)
        const currentPaid = Number(invoice.amount_paid || 0);
        const addedAmount = newAmountPaid - currentPaid;

        const { data: { user } } = await supabase.auth.getUser();

        if (user && addedAmount > 0) {
            const { data: profile } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', user.id)
                .single();

            if (profile) {
                // Update balance
                const newBalance = (Number(profile.current_balance) || 0) + addedAmount;
                await supabase
                    .from('profiles')
                    .update({ current_balance: newBalance })
                    .eq('id', user.id);

                // 3. Send Thank You Email (if enabled)
                if (profile.send_thank_you_on_payment) {
                    // Fetch invoice details for email (need debtor email and invoice number)
                    const { data: fullInvoice } = await supabase
                        .from('invoices')
                        .select(`
                            *,
                            debtors (name, email)
                        `)
                        .eq('id', invoiceId)
                        .single();

                    if (fullInvoice && fullInvoice.debtors?.email) {
                        const subjectTemplate = profile.thank_you_email_subject || 'Dziękujemy za wpłatę - {{invoice_number}}';
                        const bodyTemplate = profile.thank_you_email_body || 'Cześć {{debtor_name}},\n\nDziękujemy za opłacenie faktury {{invoice_number}}.\n\nPozdrawiamy,\n{{company_name}}';

                        const variables: Record<string, string> = {
                            '{{debtor_name}}': fullInvoice.debtors.name,
                            '{{invoice_number}}': fullInvoice.invoice_number,
                            '{{amount}}': fullInvoice.amount.toFixed(2),
                            '{{company_name}}': profile.company_name || profile.full_name || 'FluintyDebt'
                        };

                        let subject = subjectTemplate;
                        let body = bodyTemplate;

                        Object.entries(variables).forEach(([key, value]) => {
                            subject = subject.replace(new RegExp(key, 'g'), value);
                            body = body.replace(new RegExp(key, 'g'), value);
                        });

                        // Log email sending (Mock)
                        console.log('Sending Thank You Email:', {
                            to: fullInvoice.debtors.email,
                            subject,
                            body
                        });

                        // Record action
                        await supabase
                            .from('collection_actions')
                            .insert({
                                user_id: user.id,
                                invoice_id: invoiceId,
                                action_type: 'email',
                                status: 'sent',
                                channel: 'email',
                                recipient_email: fullInvoice.debtors.email,
                                sent_at: new Date().toISOString(),
                                metadata: {
                                    type: 'thank_you_email',
                                    subject,
                                    body_preview: body.substring(0, 100) + '...'
                                },
                            });

                        // Create Notification for Payment
                        await supabase.from('notifications').insert({
                            user_id: user.id,
                            type: 'payment',
                            title: 'Otrzymano płatność',
                            message: `${fullInvoice.debtors.name || 'Klient'} opłacił fakturę ${fullInvoice.invoice_number}`,
                            link: `/invoices/${invoiceId}`,
                            reference_id: invoiceId,
                            metadata: { amount: addedAmount, invoice_number: fullInvoice.invoice_number }
                        });
                    }
                } else {
                    // Even if no email sent, notify user about payment
                    const { data: inv } = await supabase.from('invoices').select('invoice_number, debtors(name)').eq('id', invoiceId).single();
                    if (inv) {
                        await supabase.from('notifications').insert({
                            user_id: user.id,
                            type: 'payment',
                            title: 'Otrzymano płatność',
                            message: `${(inv.debtors as any)?.name || 'Klient'} opłacił fakturę ${inv.invoice_number}`,
                            link: `/invoices/${invoiceId}`,
                            reference_id: invoiceId,
                            metadata: { amount: addedAmount, invoice_number: inv.invoice_number }
                        });
                    }
                }
            }
        }
    }

    return { success: true, status: newAmountPaid >= totalAmount ? 'paid' : 'partial' };
}

/**
 * Server action to record partial payment
 */
export async function recordPartialPayment(invoiceId: string, amount: number) {
    const supabase = await createClient();

    // Get invoice details
    const { data: invoice } = await supabase
        .from('invoices')
        .select('amount, amount_paid')
        .eq('id', invoiceId)
        .single();

    if (!invoice) {
        return { error: 'Invoice not found' };
    }

    const currentPaid = Number(invoice.amount_paid) || 0;
    const newAmountPaid = currentPaid + amount;
    const totalAmount = Number(invoice.amount);

    return markInvoiceAsPaid(invoiceId, newAmountPaid);
}

/**
 * Server action to send manual payment reminder email
 */
export async function sendManualReminder(invoiceId: string) {
    const supabase = await createClient();

    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        return { error: 'Unauthorized' };
    }

    // Get invoice with debtor details
    const { data: invoice } = await supabase
        .from('invoices')
        .select(`
            *,
            debtors (name, email)
        `)
        .eq('id', invoiceId)
        .single();

    if (!invoice) {
        return { error: 'Invoice not found' };
    }

    if (!invoice.debtors?.email) {
        return { error: 'Debtor has no email address' };
    }

    // Get user profile for sender name
    const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, company_name')
        .eq('id', user.id)
        .single();

    const senderName = profile?.company_name || profile?.full_name || 'FluintyDebt';
    const debtorName = invoice.debtors.name;
    const invoiceNumber = invoice.invoice_number;
    const amount = Number(invoice.amount);
    const dueDate = new Date(invoice.due_date).toLocaleDateString('pl-PL');

    // TODO: Integrate with actual email service (Resend, SendGrid, etc.)
    // For now, log the action and save to collection_actions
    console.log('Manual reminder sent:', {
        to: invoice.debtors.email,
        invoice: invoiceNumber,
        amount,
    });

    // Log the action to collection_actions
    const { data: action, error: actionError } = await supabase
        .from('collection_actions')
        .insert({
            user_id: user.id,
            invoice_id: invoiceId,
            action_type: 'email',
            status: 'sent',
            channel: 'email',
            recipient_email: invoice.debtors.email,
            sent_at: new Date().toISOString(),
            metadata: {
                type: 'manual_reminder',
                subject: `Przypomnienie o płatności - faktura ${invoiceNumber}`,
                debtor_name: debtorName,
                amount: amount,
                due_date: dueDate,
                sender: senderName,
            },
        })
        .select()
        .single();

    if (actionError) {
        console.error('Error logging action:', actionError);
        // Don't fail - email was "sent"
    } else {
        // Create Notification for Sent Email
        await supabase.from('notifications').insert({
            user_id: user.id,
            type: 'info',
            title: 'Wysłano przypomnienie',
            message: `Manualne przypomnienie email do ${debtorName} (${invoiceNumber})`,
            link: `/invoices/${invoiceId}`,
            reference_id: action.id,
            metadata: { type: 'manual_reminder', debtor: debtorName }
        });
    }

    return { success: true, message: 'Wezwanie zostało wysłane' };
}

/**
 * Get all available sequences for the current user (including system sequences)
 */
export async function getAvailableSequences() {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        return { error: 'Unauthorized' };
    }

    // Get user sequences and system sequences
    const { data: sequences, error } = await supabase
        .from('sequences')
        .select('id, name')
        .or(`user_id.eq.${user.id},user_id.is.null`)
        .order('name');

    if (error) {
        return { error: error.message };
    }

    return { sequences: sequences || [] };
}

/**
 * Change invoice sequence and regenerate scheduled steps
 */
export async function changeInvoiceSequence(
    invoiceId: string,
    sequenceId: string,
    dueDate: string
) {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        return { error: 'Unauthorized' };
    }

    // Update invoice sequence_id
    const { error: updateError } = await supabase
        .from('invoices')
        .update({ sequence_id: sequenceId })
        .eq('id', invoiceId)
        .eq('user_id', user.id);

    if (updateError) {
        return { error: updateError.message };
    }

    // Delete existing pending scheduled steps
    await supabase
        .from('scheduled_steps')
        .delete()
        .eq('invoice_id', invoiceId)
        .eq('status', 'pending');

    // Get sequence steps
    const { data: steps } = await supabase
        .from('sequence_steps')
        .select('*')
        .eq('sequence_id', sequenceId)
        .order('step_order');

    if (steps && steps.length > 0) {
        const dueDateObj = new Date(dueDate);
        const scheduledSteps = steps.map(step => {
            const scheduledDate = new Date(dueDateObj);
            scheduledDate.setDate(scheduledDate.getDate() + step.days_offset);
            return {
                invoice_id: invoiceId,
                sequence_step_id: step.id,
                scheduled_for: scheduledDate.toISOString().split('T')[0],
                status: 'pending' as const,
            };
        });

        await supabase.from('scheduled_steps').insert(scheduledSteps);
    }

    revalidatePath(`/invoices/${invoiceId}`);
    return { success: true };
}

/**
 * Server action to toggle auto-send for an invoice
 */
export async function toggleInvoiceAutoSend(invoiceId: string, enabled: boolean) {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        return { error: 'Unauthorized' };
    }

    const { error } = await supabase
        .from('invoices')
        .update({ auto_send_enabled: enabled })
        .eq('id', invoiceId)
        .eq('user_id', user.id);

    if (error) {
        return { error: error.message };
    }

    revalidatePath(`/invoices/${invoiceId}`);
    return { success: true };
}

/**
 * Server action to skip the next pending scheduled step
 */
export async function skipNextScheduledStep(invoiceId: string) {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        return { error: 'Unauthorized' };
    }

    // Find the next pending step
    const { data: steps, error: fetchError } = await supabase
        .from('scheduled_steps')
        .select('id')
        .eq('invoice_id', invoiceId)
        .eq('status', 'pending')
        .order('scheduled_for', { ascending: true })
        .limit(1);

    if (fetchError) {
        return { error: fetchError.message };
    }

    if (!steps || steps.length === 0) {
        return { error: 'No pending steps to skip' };
    }

    const stepId = steps[0].id;

    // Update status to skipped
    const { error: updateError } = await supabase
        .from('scheduled_steps')
        .update({ status: 'skipped' })
        .eq('id', stepId);

    if (updateError) {
        return { error: updateError.message };
    }

    revalidatePath(`/invoices/${invoiceId}`);
    return { success: true };
}
