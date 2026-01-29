'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export async function markCostAsPaid(id: string) {
    const supabase = await createClient();

    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        throw new Error('Unauthorized');
    }

    // Get the full amount to set as paid
    const { data: invoice, error: fetchError } = await supabase
        .from('cost_invoices')
        .select('amount_gross, amount')
        .eq('id', id)
        .eq('user_id', user.id)
        .single();

    if (fetchError || !invoice) {
        throw new Error('Invoice not found');
    }

    const fullAmount = invoice.amount_gross || invoice.amount;

    // Update status to paid
    const { error } = await supabase
        .from('cost_invoices')
        .update({
            payment_status: 'paid',
            paid_at: new Date().toISOString()
        })
        .eq('id', id)
        .eq('user_id', user.id);

    if (error) {
        console.error('Error marking cost as paid:', error);
        throw new Error('Failed to update cost invoice');
    }

    revalidatePath(`/costs/${id}`);
    revalidatePath('/costs');
    revalidatePath('/dashboard');
    return { success: true };
}

export async function createCostInvoice(data: any) {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        return { error: 'Unauthorized' };
    }

    // Prepare insert payload
    // Note: Schema uses 'amount' and 'amount_gross'. We set both for compatibility.
    const payload = {
        user_id: user.id,
        invoice_number: data.invoice_number,
        contractor_name: data.contractor_name,
        contractor_nip: data.contractor_nip || null,
        vendor_id: data.vendor_id || null, // Optional link to vendor

        amount: data.amount, // Gross amount
        amount_gross: data.amount_gross || data.amount,
        amount_net: data.amount_net,
        vat_rate: data.vat_rate,
        vat_amount: data.vat_amount || (data.amount - data.amount_net),
        currency: data.currency || 'PLN',

        issue_date: data.issue_date,
        due_date: data.due_date,

        payment_status: data.payment_status || 'to_pay',
        // status: 'pending', // Schema check: 014 uses payment_status ('to_pay', 'paid'). 
        // Some older components might look for 'status' ('pending', 'overdue'). 
        // But cost_invoices table in 014 doesn't have 'status' column, it has 'payment_status'.
        // Wait, standard 'invoices' table has 'status'. 'cost_invoices' has 'payment_status'.

        account_number: data.account_number || null,
        bank_name: data.bank_name || null,
        description: data.description || null,
        category: data.category || 'other',
    };

    const { error } = await supabase
        .from('cost_invoices')
        .insert(payload)
        .select()
        .single();

    if (error) {
        console.error('Error creating cost invoice:', error);
        return { error: 'Failed to create invoice: ' + error.message };
    }

    revalidatePath('/costs');
    revalidatePath('/dashboard');
    return { success: true };
}
