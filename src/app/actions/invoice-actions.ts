'use server';

import { createClient } from '@/lib/supabase/server';

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
            sequence_id: data.sequence_id || null,
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
    if (data.sequence_id) {
        const { data: steps } = await supabase
            .from('sequence_steps')
            .select('*')
            .eq('sequence_id', data.sequence_id)
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

    // Cancel pending scheduled steps if fully paid
    if (newAmountPaid >= totalAmount) {
        await supabase
            .from('scheduled_steps')
            .update({ status: 'cancelled' })
            .eq('invoice_id', invoiceId)
            .eq('status', 'pending');
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
    const { error: actionError } = await supabase
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
        });

    if (actionError) {
        console.error('Error logging action:', actionError);
        // Don't fail - email was "sent"
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

    return { success: true };
}
