'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export interface ProfileData {
    full_name?: string;
    email?: string;
    company_name: string;
    company_nip?: string;
    company_address?: string;
    company_city?: string;
    company_postal_code?: string;
    company_phone?: string;
    company_email?: string;
    bank_account_number?: string;
    bank_name?: string;
    send_thank_you_on_payment?: boolean;
    interest_rate?: number;
}

/**
 * Get current user's profile
 */
export async function getProfile(): Promise<{ data: ProfileData | null; error?: string }> {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        return { data: null, error: 'Unauthorized' };
    }

    const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

    if (error && error.code !== 'PGRST116') {
        console.error('[Profile] Error fetching:', error);
        return { data: null, error: error.message };
    }

    return { data: data || null };
}

/**
 * Update current user's profile
 */
export async function updateProfile(profileData: Partial<ProfileData>): Promise<{ success: boolean; error?: string }> {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        return { success: false, error: 'Unauthorized' };
    }

    // Check if profile exists
    const { data: existing } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', user.id)
        .single();

    let error;
    if (existing) {
        // Update existing
        const result = await supabase
            .from('profiles')
            .update({
                ...profileData,
                updated_at: new Date().toISOString(),
            })
            .eq('id', user.id);
        error = result.error;
    } else {
        // Insert new
        const result = await supabase
            .from('profiles')
            .insert({
                id: user.id,
                email: user.email || '',
                ...profileData,
            });
        error = result.error;
    }

    if (error) {
        console.error('[Profile] Error saving:', error);
        return { success: false, error: error.message };
    }

    revalidatePath('/settings');
    return { success: true };
}
