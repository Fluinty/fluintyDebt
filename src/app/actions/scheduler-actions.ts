'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export interface ScheduledStepUpdateData {
    scheduled_for?: string;
    override_email_subject?: string;
    override_email_body?: string;
    override_channel?: 'email';
    notes?: string;
    status?: 'pending' | 'executed' | 'skipped' | 'cancelled' | 'failed';
}

/**
 * Get a single scheduled step with all related data
 */
export async function getScheduledStep(stepId: string) {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        return { data: null, error: 'Unauthorized' };
    }

    const { data, error } = await supabase
        .from('scheduled_steps')
        .select(`
            *,
            invoices (id, invoice_number, user_id, debtors (id, name, email)),
            sequence_steps (
                email_subject,
                email_body,
                channel,
                days_offset,
                step_order,
                sequences (id, name)
            )
        `)
        .eq('id', stepId)
        .single();

    if (error) {
        return { data: null, error: error.message };
    }

    // Verify ownership
    if ((data.invoices as any)?.user_id !== user.id) {
        return { data: null, error: 'Unauthorized' };
    }

    return { data, error: null };
}

/**
 * Update a scheduled step (without affecting the sequence)
 */
export async function updateScheduledStep(stepId: string, updateData: ScheduledStepUpdateData) {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        return { success: false, error: 'Unauthorized' };
    }

    // First verify the step belongs to the user
    const { data: step, error: fetchError } = await supabase
        .from('scheduled_steps')
        .select('id, invoice_id, invoices!inner(user_id)')
        .eq('id', stepId)
        .single();

    if (fetchError || !step) {
        return { success: false, error: 'Nie znaleziono kroku' };
    }

    if ((step.invoices as any)?.user_id !== user.id) {
        return { success: false, error: 'Brak uprawnień' };
    }

    // Update the step
    const { error: updateError } = await supabase
        .from('scheduled_steps')
        .update(updateData)
        .eq('id', stepId);

    if (updateError) {
        console.error('[Scheduler] Update error:', updateError);
        return { success: false, error: updateError.message };
    }

    revalidatePath('/scheduler');
    revalidatePath(`/invoices/${step.invoice_id}`);

    return { success: true };
}

/**
 * Delete a scheduled step
 */
export async function deleteScheduledStep(stepId: string) {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        return { success: false, error: 'Unauthorized' };
    }

    // First verify the step belongs to the user
    const { data: step, error: fetchError } = await supabase
        .from('scheduled_steps')
        .select('id, invoice_id, invoices!inner(user_id)')
        .eq('id', stepId)
        .single();

    if (fetchError || !step) {
        return { success: false, error: 'Nie znaleziono kroku' };
    }

    if ((step.invoices as any)?.user_id !== user.id) {
        return { success: false, error: 'Brak uprawnień' };
    }

    // Delete the step
    const { error: deleteError } = await supabase
        .from('scheduled_steps')
        .delete()
        .eq('id', stepId);

    if (deleteError) {
        console.error('[Scheduler] Delete error:', deleteError);
        return { success: false, error: deleteError.message };
    }

    revalidatePath('/scheduler');
    revalidatePath(`/invoices/${step.invoice_id}`);

    return { success: true };
}
