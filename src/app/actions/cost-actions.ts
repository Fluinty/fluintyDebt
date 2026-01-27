'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

const costInvoiceSchema = z.object({
    contractor_name: z.string().min(1, 'Nazwa dostawcy jest wymagana'),
    contractor_nip: z.string().optional().nullable(),
    vendor_id: z.string().uuid().optional().nullable(),
    invoice_number: z.string().min(1, 'Numer faktury jest wymagany'),
    amount: z.number().min(0.01, 'Kwota musi być większa od 0'),
    amount_net: z.number().optional().nullable(),
    vat_rate: z.string().optional().nullable(),
    vat_amount: z.number().optional().nullable(),
    amount_gross: z.number().optional().nullable(),
    currency: z.string().default('PLN'),
    issue_date: z.string().min(1, 'Data wystawienia jest wymagana'),
    due_date: z.string().min(1, 'Termin płatności jest wymagany'),
    account_number: z.string().optional().nullable(),
    bank_name: z.string().optional().nullable(),
    description: z.string().optional().nullable(),
    category: z.string().default('other'),
    payment_status: z.enum(['to_pay', 'paid']).default('to_pay'),
});

export type CreateCostInvoiceInput = z.infer<typeof costInvoiceSchema>;

export async function createCostInvoice(data: CreateCostInvoiceInput) {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        return { error: 'Unauthorized' };
    }

    try {
        const validated = costInvoiceSchema.parse(data);

        // Check for duplicates
        const { data: existing } = await supabase
            .from('cost_invoices')
            .select('id')
            .eq('invoice_number', validated.invoice_number)
            .eq('user_id', user.id)
            .single();

        if (existing) {
            return { error: 'Faktura o tym numerze już istnieje' };
        }

        const { error } = await supabase
            .from('cost_invoices')
            .insert({
                user_id: user.id,
                ...validated,
                paid_at: validated.payment_status === 'paid' ? new Date().toISOString() : null,
            });

        if (error) throw error;

        revalidatePath('/costs');
        return { success: true };

    } catch (error) {
        console.error('Create cost invoice error:', error);
        if (error instanceof z.ZodError) {
            return { error: error.issues[0]?.message || 'Validation error' };
        }
        return { error: 'Failed to create invoice' };
    }
}

export async function markCostInvoiceAsPaid(invoiceId: string) {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        return { error: 'Unauthorized' };
    }

    try {
        const { error } = await supabase
            .from('cost_invoices')
            .update({
                payment_status: 'paid',
                paid_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
            })
            .eq('id', invoiceId)
            .eq('user_id', user.id);

        if (error) throw error;

        revalidatePath('/costs');
        return { success: true };
    } catch (error) {
        console.error('Error marking invoice as paid:', error);
        return { error: 'Failed to update invoice status' };
    }
}
