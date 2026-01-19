import { createClient } from '@/lib/supabase/server';

/**
 * Generate scheduled steps for an invoice based on its assigned sequence
 * This creates entries in scheduled_steps table based on sequence_steps
 */
export async function generateScheduledSteps(invoiceId: string, sequenceId: string, dueDate: string) {
    const supabase = await createClient();

    // Fetch sequence steps
    const { data: steps, error: stepsError } = await supabase
        .from('sequence_steps')
        .select('*')
        .eq('sequence_id', sequenceId)
        .order('step_order');

    if (stepsError || !steps || steps.length === 0) {
        console.error('Error fetching sequence steps:', stepsError);
        return { error: stepsError || new Error('No steps found') };
    }

    const dueDateObj = new Date(dueDate);

    // Create scheduled steps based on days_offset from due_date
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

    // Insert scheduled steps
    const { error: insertError } = await supabase
        .from('scheduled_steps')
        .insert(scheduledSteps);

    if (insertError) {
        console.error('Error creating scheduled steps:', insertError);
        return { error: insertError };
    }

    return { success: true, count: scheduledSteps.length };
}

/**
 * Delete scheduled steps for an invoice
 * Used when changing or removing sequence
 */
export async function deleteScheduledSteps(invoiceId: string) {
    const supabase = await createClient();

    const { error } = await supabase
        .from('scheduled_steps')
        .delete()
        .eq('invoice_id', invoiceId)
        .eq('status', 'pending'); // Only delete pending, not executed

    return { error };
}

/**
 * Update scheduled steps when sequence changes
 */
export async function updateInvoiceSequence(invoiceId: string, newSequenceId: string | null, dueDate: string) {
    // Delete existing pending steps
    await deleteScheduledSteps(invoiceId);

    // If new sequence assigned, generate new steps
    if (newSequenceId) {
        return await generateScheduledSteps(invoiceId, newSequenceId, dueDate);
    }

    return { success: true };
}
