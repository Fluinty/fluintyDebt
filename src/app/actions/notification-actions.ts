'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { formatCurrency } from '@/lib/utils/format-currency';

/**
 * Generate notifications based on current state (Overdue, Due Soon)
 * This acts as a lazy cron job
 */
export async function generateDailyNotifications() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return { error: 'Unauthorized' };

    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    const threeDaysLater = new Date(today);
    threeDaysLater.setDate(today.getDate() + 3);
    const threeDaysStr = threeDaysLater.toISOString().split('T')[0];

    // 1. Check Overdue Invoices
    const { data: overdueInvoices } = await supabase
        .from('invoices')
        .select('id, invoice_number, amount, due_date, debtors(name)')
        .lt('due_date', todayStr)
        .neq('status', 'paid')
        .eq('user_id', user.id);

    if (overdueInvoices) {
        for (const inv of overdueInvoices) {
            // Check if notification already exists for this invoice as overdue
            // We use reference_id = invoice_id AND type = 'overdue'
            // To be smarter, maybe we want to notify AGAIN if it's been 7 days? 
            // For MVP, notify once per status.

            const { data: existing } = await supabase
                .from('notifications')
                .select('id')
                .eq('reference_id', inv.id)
                .eq('type', 'overdue')
                .eq('user_id', user.id)
                .single();

            if (!existing) {
                const daysOverdue = Math.floor((today.getTime() - new Date(inv.due_date).getTime()) / 86400000);
                await supabase.from('notifications').insert({
                    user_id: user.id,
                    type: 'overdue',
                    title: 'Faktura przeterminowana',
                    message: `${inv.invoice_number} - ${daysOverdue} dni po terminie (${formatCurrency(inv.amount)})`,
                    link: `/invoices/${inv.id}`,
                    reference_id: inv.id,
                    metadata: { days_overdue: daysOverdue, invoice_number: inv.invoice_number }
                });
            }
        }
    }

    // 2. Check Due Soon Invoices
    const { data: dueSoonInvoices } = await supabase
        .from('invoices')
        .select('id, invoice_number, amount, due_date, debtors(name)')
        .gte('due_date', todayStr)
        .lte('due_date', threeDaysStr)
        .neq('status', 'paid')
        .eq('user_id', user.id);

    if (dueSoonInvoices) {
        for (const inv of dueSoonInvoices) {
            const { data: existing } = await supabase
                .from('notifications')
                .select('id')
                .eq('reference_id', inv.id)
                .eq('type', 'due_soon')
                .eq('user_id', user.id)
                .single();

            if (!existing) {
                const dueDate = new Date(inv.due_date);
                const daysUntil = Math.floor((dueDate.getTime() - today.getTime()) / 86400000);
                await supabase.from('notifications').insert({
                    user_id: user.id,
                    type: 'due_soon',
                    title: 'Zbliża się termin',
                    message: `${inv.invoice_number} - za ${daysUntil} dni (${formatCurrency(inv.amount)})`,
                    link: `/invoices/${inv.id}`,
                    reference_id: inv.id,
                    metadata: { days_until: daysUntil, invoice_number: inv.invoice_number }
                });
            }
        }
    }

    // 3. Check Scheduled Steps for Today
    const { data: scheduledSteps } = await supabase
        .from('scheduled_steps')
        .select(`
            id,
            scheduled_for,
            invoices(id, invoice_number),
            sequence_steps(email_subject, channel)
        `)
        .eq('scheduled_for', todayStr)
        .eq('status', 'pending');
    // Note: scheduled_steps RLS might need checking, but usually user_id is on invoice via join.
    // But here we need to filter by user's invoices.
    // Best to filter on joined invoices using !inner if possible or just filter in JS for now.

    // Actually, `scheduled_steps` doesn't have user_id directly.
    // We should rely on `invoices` relation.

    // Safer query:
    const { data: scheduledUserSteps } = await supabase
        .from('scheduled_steps')
        .select(`
            id,
            scheduled_for,
            invoices!inner(id, invoice_number, user_id),
            sequence_steps(channel)
        `)
        .eq('scheduled_for', todayStr)
        .eq('status', 'pending')
        .eq('invoices.user_id', user.id);

    if (scheduledUserSteps) {
        for (const step of scheduledUserSteps) {
            const invoice = step.invoices as any; // Type assertion
            const channel = (step.sequence_steps as any)?.channel || 'unknown';

            const { data: existing } = await supabase
                .from('notifications')
                .select('id')
                .eq('reference_id', step.id)
                .eq('type', 'scheduled')
                .eq('user_id', user.id)
                .single();

            if (!existing) {
                await supabase.from('notifications').insert({
                    user_id: user.id,
                    type: 'scheduled',
                    title: 'Zaplanowane zadanie na dzisiaj',
                    message: `${channel === 'email' ? 'Wysyłka email' : channel === 'sms' ? 'Wysyłka SMS' : 'Połączenie'} dla ${invoice.invoice_number}`,
                    link: '/scheduler',
                    reference_id: step.id,
                    metadata: { step_id: step.id, channel }
                });
            }
        }
    }

    return { success: true };
}

export async function markNotificationAsRead(id: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: 'Unauthorized' };

    await supabase
        .from('notifications')
        .update({ read: true })
        .eq('id', id)
        .eq('user_id', user.id);

    revalidatePath('/');
    return { success: true };
}

export async function markAllNotificationsAsRead() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: 'Unauthorized' };

    await supabase
        .from('notifications')
        .update({ read: true })
        .eq('read', false)
        .eq('user_id', user.id);

    revalidatePath('/');
    return { success: true };
}
