'use server';

import { createClient } from '@/lib/supabase/server';
import { sendSMS, sendVoiceCall, normalizePhoneNumber, isValidPhoneNumber, isWithinCallingHours } from '@/lib/sms/smsapi-client';
import { revalidatePath } from 'next/cache';

interface UsageStats {
    smsUsed: number;
    smsLimit: number;
    callsUsed: number;
    callsLimit: number;
    smsRemaining: number;
    callsRemaining: number;
    smsPercentage: number;
    callsPercentage: number;
}

interface PlaceholderData {
    debtor_name: string;
    company_name: string;
    invoice_number: string;
    amount: string;
    due_date: string;
    days_overdue: number;
    interest_amount: string;
    total_with_interest: string;
}

/**
 * Get usage stats for the current user
 */
export async function getUsageStats(): Promise<{ data: UsageStats | null; error?: string }> {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return { data: null, error: 'Unauthorized' };
    }

    const { data: subscription } = await supabase
        .from('subscriptions')
        .select('sms_limit, calls_limit, sms_used, calls_used')
        .eq('user_id', user.id)
        .single();

    if (!subscription) {
        return {
            data: {
                smsUsed: 0,
                smsLimit: 0,
                callsUsed: 0,
                callsLimit: 0,
                smsRemaining: 0,
                callsRemaining: 0,
                smsPercentage: 0,
                callsPercentage: 0,
            }
        };
    }

    const smsRemaining = Math.max(0, subscription.sms_limit - subscription.sms_used);
    const callsRemaining = Math.max(0, subscription.calls_limit - subscription.calls_used);

    return {
        data: {
            smsUsed: subscription.sms_used || 0,
            smsLimit: subscription.sms_limit || 0,
            callsUsed: subscription.calls_used || 0,
            callsLimit: subscription.calls_limit || 0,
            smsRemaining,
            callsRemaining,
            smsPercentage: subscription.sms_limit > 0
                ? Math.round((subscription.sms_used / subscription.sms_limit) * 100)
                : 0,
            callsPercentage: subscription.calls_limit > 0
                ? Math.round((subscription.calls_used / subscription.calls_limit) * 100)
                : 0,
        }
    };
}

/**
 * Check if user can send SMS (has remaining limit)
 */
export async function canSendSMS(): Promise<{ allowed: boolean; remaining: number; error?: string }> {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return { allowed: false, remaining: 0, error: 'Unauthorized' };
    }

    // Check if SMS is enabled for user
    const { data: profile } = await supabase
        .from('profiles')
        .select('sms_enabled')
        .eq('id', user.id)
        .single();

    if (!profile?.sms_enabled) {
        return { allowed: false, remaining: 0, error: 'SMS nie jest włączony. Aktywuj w Ustawieniach.' };
    }

    const { data: subscription } = await supabase
        .from('subscriptions')
        .select('sms_limit, sms_used')
        .eq('user_id', user.id)
        .single();

    if (!subscription) {
        return { allowed: false, remaining: 0, error: 'Brak aktywnej subskrypcji' };
    }

    const remaining = subscription.sms_limit - subscription.sms_used;

    if (remaining <= 0) {
        return { allowed: false, remaining: 0, error: 'Limit SMS wyczerpany. Ulepsz plan.' };
    }

    return { allowed: true, remaining };
}

/**
 * Check if user can make voice calls
 */
export async function canMakeCall(): Promise<{ allowed: boolean; remaining: number; error?: string }> {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return { allowed: false, remaining: 0, error: 'Unauthorized' };
    }

    // Check if Voice is enabled for user
    const { data: profile } = await supabase
        .from('profiles')
        .select('voice_enabled')
        .eq('id', user.id)
        .single();

    if (!profile?.voice_enabled) {
        return { allowed: false, remaining: 0, error: 'Połączenia głosowe nie są włączone. Aktywuj w Ustawieniach.' };
    }

    // Check calling hours
    if (!isWithinCallingHours()) {
        return { allowed: false, remaining: 0, error: 'Połączenia dozwolone tylko 8:00-20:00' };
    }

    const { data: subscription } = await supabase
        .from('subscriptions')
        .select('calls_limit, calls_used')
        .eq('user_id', user.id)
        .single();

    if (!subscription) {
        return { allowed: false, remaining: 0, error: 'Brak aktywnej subskrypcji' };
    }

    const remaining = subscription.calls_limit - subscription.calls_used;

    if (remaining <= 0) {
        return { allowed: false, remaining: 0, error: 'Limit połączeń wyczerpany. Ulepsz plan.' };
    }

    return { allowed: true, remaining };
}

/**
 * Increment SMS usage counter
 */
async function incrementSMSUsage(userId: string): Promise<void> {
    const supabase = await createClient();
    await supabase.rpc('increment_sms_usage', { p_user_id: userId });
}

/**
 * Increment calls usage counter
 */
async function incrementCallsUsage(userId: string): Promise<void> {
    const supabase = await createClient();
    await supabase.rpc('increment_calls_usage', { p_user_id: userId });
}

/**
 * Replace placeholders in template with actual values
 */
function replacePlaceholders(template: string, data: PlaceholderData): string {
    return template
        .replace(/\{\{debtor_name\}\}/g, data.debtor_name)
        .replace(/\{\{company_name\}\}/g, data.company_name)
        .replace(/\{\{invoice_number\}\}/g, data.invoice_number)
        .replace(/\{\{amount\}\}/g, data.amount)
        .replace(/\{\{due_date\}\}/g, data.due_date)
        .replace(/\{\{days_overdue\}\}/g, String(data.days_overdue))
        .replace(/\{\{interest_amount\}\}/g, data.interest_amount)
        .replace(/\{\{total_with_interest\}\}/g, data.total_with_interest);
}

/**
 * Execute a scheduled SMS step
 */
export async function executeSMSStep(stepId: string) {
    const supabase = await createClient();

    // Get step with all related data
    const { data: step, error: stepError } = await supabase
        .from('scheduled_steps')
        .select(`
            id, status, invoice_id, retry_count,
            invoices (
                id, invoice_number, amount, due_date, interest_amount,
                debtors (id, name, phone, sms_voice_consent_at)
            ),
            sequence_steps (id, sms_body)
        `)
        .eq('id', stepId)
        .single();

    if (stepError || !step) {
        return { error: 'Nie znaleziono kroku' };
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        return { error: 'Unauthorized' };
    }

    // Check SMS limit
    const canSend = await canSendSMS();
    if (!canSend.allowed) {
        await supabase
            .from('scheduled_steps')
            .update({ status: 'skipped' })
            .eq('id', stepId);

        await supabase.from('collection_actions').insert({
            user_id: user.id,
            invoice_id: step.invoice_id,
            action_type: 'sms',
            status: 'failed',
            error_message: canSend.error,
        });

        return { error: canSend.error };
    }

    const invoice = step.invoices as any;
    const sequenceStep = step.sequence_steps as any;
    const debtor = invoice?.debtors;

    if (!debtor?.phone) {
        await supabase
            .from('scheduled_steps')
            .update({ status: 'skipped' })
            .eq('id', stepId);

        await supabase.from('collection_actions').insert({
            user_id: user.id,
            invoice_id: step.invoice_id,
            action_type: 'sms',
            status: 'failed',
            error_message: 'Brak numeru telefonu kontrahenta',
        });

        return { error: 'Brak numeru telefonu' };
    }

    if (!isValidPhoneNumber(debtor.phone)) {
        return { error: 'Nieprawidłowy numer telefonu' };
    }

    // Get company name
    const { data: profile } = await supabase
        .from('profiles')
        .select('company_name')
        .eq('id', user.id)
        .single();

    // Calculate days overdue
    const dueDate = new Date(invoice.due_date);
    const today = new Date();
    const daysOverdue = Math.max(0, Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24)));

    // Prepare message with placeholders
    const message = replacePlaceholders(sequenceStep.sms_body || '', {
        debtor_name: debtor.name,
        company_name: profile?.company_name || 'Wierzyciel',
        invoice_number: invoice.invoice_number,
        amount: Number(invoice.amount).toFixed(2),
        due_date: new Date(invoice.due_date).toLocaleDateString('pl-PL'),
        days_overdue: daysOverdue,
        interest_amount: Number(invoice.interest_amount || 0).toFixed(2),
        total_with_interest: (Number(invoice.amount) + Number(invoice.interest_amount || 0)).toFixed(2),
    });

    // Send SMS
    const result = await sendSMS({
        to: debtor.phone,
        message,
    });

    if (result.success) {
        // Update step status
        await supabase
            .from('scheduled_steps')
            .update({ status: 'executed', executed_at: new Date().toISOString() })
            .eq('id', stepId);

        // Increment usage
        await incrementSMSUsage(user.id);

        // Log action
        await supabase.from('collection_actions').insert({
            user_id: user.id,
            invoice_id: step.invoice_id,
            action_type: 'sms',
            channel: 'sms',
            recipient_phone: normalizePhoneNumber(debtor.phone),
            content: message,
            status: 'sent',
            sent_at: new Date().toISOString(),
            metadata: { message_id: result.messageId },
        });

        revalidatePath('/scheduler');
        revalidatePath('/dashboard');

        return { success: true, messageId: result.messageId };
    } else {
        // Mark as failed
        await supabase
            .from('scheduled_steps')
            .update({ status: 'failed' })
            .eq('id', stepId);

        // Log failure
        await supabase.from('collection_actions').insert({
            user_id: user.id,
            invoice_id: step.invoice_id,
            action_type: 'sms',
            channel: 'sms',
            recipient_phone: normalizePhoneNumber(debtor.phone),
            status: 'failed',
            error_message: result.error,
        });

        return { error: result.error };
    }
}

/**
 * Execute a scheduled Voice (TTS) step
 */
export async function executeVoiceStep(stepId: string) {
    const supabase = await createClient();

    // Get step with all related data
    const { data: step, error: stepError } = await supabase
        .from('scheduled_steps')
        .select(`
            id, status, invoice_id, retry_count,
            invoices (
                id, invoice_number, amount, due_date, interest_amount,
                debtors (id, name, phone, sms_voice_consent_at)
            ),
            sequence_steps (id, voice_script)
        `)
        .eq('id', stepId)
        .single();

    if (stepError || !step) {
        return { error: 'Nie znaleziono kroku' };
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        return { error: 'Unauthorized' };
    }

    // Check call limit
    const canCall = await canMakeCall();
    if (!canCall.allowed) {
        await supabase
            .from('scheduled_steps')
            .update({ status: 'skipped' })
            .eq('id', stepId);

        await supabase.from('collection_actions').insert({
            user_id: user.id,
            invoice_id: step.invoice_id,
            action_type: 'voice',
            status: 'failed',
            error_message: canCall.error,
        });

        return { error: canCall.error };
    }

    const invoice = step.invoices as any;
    const sequenceStep = step.sequence_steps as any;
    const debtor = invoice?.debtors;

    if (!debtor?.phone) {
        await supabase
            .from('scheduled_steps')
            .update({ status: 'skipped' })
            .eq('id', stepId);

        await supabase.from('collection_actions').insert({
            user_id: user.id,
            invoice_id: step.invoice_id,
            action_type: 'voice',
            status: 'failed',
            error_message: 'Brak numeru telefonu kontrahenta',
        });

        return { error: 'Brak numeru telefonu' };
    }

    // Get company name
    const { data: profile } = await supabase
        .from('profiles')
        .select('company_name')
        .eq('id', user.id)
        .single();

    // Calculate days overdue
    const dueDate = new Date(invoice.due_date);
    const today = new Date();
    const daysOverdue = Math.max(0, Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24)));

    // Prepare script with placeholders
    const script = replacePlaceholders(sequenceStep.voice_script || '', {
        debtor_name: debtor.name,
        company_name: profile?.company_name || 'Wierzyciel',
        invoice_number: invoice.invoice_number,
        amount: Number(invoice.amount).toFixed(2),
        due_date: new Date(invoice.due_date).toLocaleDateString('pl-PL'),
        days_overdue: daysOverdue,
        interest_amount: Number(invoice.interest_amount || 0).toFixed(2),
        total_with_interest: (Number(invoice.amount) + Number(invoice.interest_amount || 0)).toFixed(2),
    });

    // Make call
    const result = await sendVoiceCall({
        to: debtor.phone,
        tts: script,
    });

    if (result.success) {
        // Update step status
        await supabase
            .from('scheduled_steps')
            .update({ status: 'executed', executed_at: new Date().toISOString() })
            .eq('id', stepId);

        // Increment usage
        await incrementCallsUsage(user.id);

        // Log action
        await supabase.from('collection_actions').insert({
            user_id: user.id,
            invoice_id: step.invoice_id,
            action_type: 'voice',
            channel: 'voice',
            recipient_phone: normalizePhoneNumber(debtor.phone),
            content: script,
            status: 'sent',
            sent_at: new Date().toISOString(),
            metadata: { message_id: result.messageId },
        });

        revalidatePath('/scheduler');
        revalidatePath('/dashboard');

        return { success: true, messageId: result.messageId };
    } else {
        // Check if should retry
        const retryCount = step.retry_count || 0;

        if (retryCount < 1) {
            // Schedule retry for next business day
            const nextDay = new Date();
            nextDay.setDate(nextDay.getDate() + 1);
            // Skip weekends
            if (nextDay.getDay() === 0) nextDay.setDate(nextDay.getDate() + 1);
            if (nextDay.getDay() === 6) nextDay.setDate(nextDay.getDate() + 2);

            await supabase
                .from('scheduled_steps')
                .update({
                    status: 'pending',
                    retry_count: retryCount + 1,
                    scheduled_for: nextDay.toISOString().split('T')[0],
                })
                .eq('id', stepId);

            return { error: result.error, retryScheduled: true };
        } else {
            // Max retries reached, mark as failed
            await supabase
                .from('scheduled_steps')
                .update({ status: 'failed' })
                .eq('id', stepId);
        }

        // Log failure
        await supabase.from('collection_actions').insert({
            user_id: user.id,
            invoice_id: step.invoice_id,
            action_type: 'voice',
            channel: 'voice',
            recipient_phone: normalizePhoneNumber(debtor.phone),
            status: 'failed',
            error_message: result.error,
        });

        return { error: result.error };
    }
}

/**
 * Toggle SMS enabled for user
 */
export async function toggleSMSEnabled(enabled: boolean) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return { error: 'Unauthorized' };
    }

    await supabase
        .from('profiles')
        .update({ sms_enabled: enabled })
        .eq('id', user.id);

    revalidatePath('/settings');
    return { success: true };
}

/**
 * Toggle Voice enabled for user
 */
export async function toggleVoiceEnabled(enabled: boolean) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return { error: 'Unauthorized' };
    }

    await supabase
        .from('profiles')
        .update({ voice_enabled: enabled })
        .eq('id', user.id);

    revalidatePath('/settings');
    return { success: true };
}

/**
 * Record consent for SMS/Voice for a debtor
 */
export async function recordSMSVoiceConsent(debtorId: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return { error: 'Unauthorized' };
    }

    await supabase
        .from('debtors')
        .update({ sms_voice_consent_at: new Date().toISOString() })
        .eq('id', debtorId)
        .eq('user_id', user.id);

    return { success: true };
}
