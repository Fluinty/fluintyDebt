'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export type ProfileData = {
    full_name: string;
    company_name: string;
    company_nip: string;
    company_address: string;
    company_city: string;
    company_postal_code: string;
    company_phone: string;
    company_email: string;
    bank_account_number: string;
    bank_name: string;
    send_thank_you_on_payment: boolean;
    interest_rate: number;
    email?: string;
};

export async function getProfile() {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        return { error: 'Unauthorized' };
    }

    try {
        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single();

        if (error) throw error;
        return { data };
    } catch (error) {
        console.error('Get profile error:', error);
        return { error: 'Failed to fetch profile' };
    }
}

export async function updateProfile(data: ProfileData) {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        return { error: 'Unauthorized' };
    }

    try {
        const { error } = await supabase
            .from('profiles')
            .update({
                full_name: data.full_name,
                company_name: data.company_name,
                company_nip: data.company_nip,
                company_address: data.company_address,
                company_city: data.company_city,
                company_postal_code: data.company_postal_code,
                company_phone: data.company_phone,
                company_email: data.company_email,
                bank_account_number: data.bank_account_number,
                bank_name: data.bank_name,
                send_thank_you_on_payment: data.send_thank_you_on_payment,
                interest_rate: data.interest_rate,
                // Email cannot be updated here
            })
            .eq('id', user.id);

        if (error) throw error;

        revalidatePath('/settings');
        return { success: true };
    } catch (error) {
        console.error('Update profile error:', error);
        return { error: 'Failed to update profile' };
    }
}

export async function updateBankBalance(amount: number) {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        return { error: 'Unauthorized' };
    }

    try {
        const { error } = await supabase
            .from('profiles')
            .update({ current_balance: amount })
            .eq('id', user.id);

        if (error) throw error;

        revalidatePath('/');
        return { success: true };
    } catch (error) {
        console.error('Update balance error:', error);
        return { error: 'Failed to update balance' };
    }
}
