'use server';

import { createClient } from '@/lib/supabase/server';

/**
 * Server action to create invoice with optional sequence scheduling
 */
export async function createInvoiceWithSchedule(data: {
    debtor_id: string;
    invoice_number: string;
    amount: number;
    issue_date: string;
    due_date: string;
    description?: string;
    sequence_id?: string;
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
            amount: data.amount,
            issue_date: data.issue_date,
            due_date: data.due_date,
            description: data.description || null,
            sequence_id: data.sequence_id || null,
            status: 'pending',
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

            const scheduledSteps = steps.map(step => {
                const scheduledDate = new Date(dueDate);
                scheduledDate.setDate(scheduledDate.getDate() + step.days_offset);

                return {
                    invoice_id: invoice.id,
                    sequence_step_id: step.id,
                    scheduled_for: scheduledDate.toISOString().split('T')[0],
                    status: 'pending',
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
