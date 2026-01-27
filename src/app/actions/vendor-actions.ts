'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { VendorInsert, VendorUpdate } from '@/types/database';

export async function getVendors() {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        return { error: 'Unauthorized' };
    }

    try {
        const { data, error } = await supabase
            .from('vendors')
            .select('*')
            .eq('user_id', user.id)
            .order('name');

        if (error) throw error;
        return { data };
    } catch (error) {
        console.error('Get vendors error:', error);
        return { error: 'Failed to fetch vendors' };
    }
}

export async function getVendor(id: string) {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        return { error: 'Unauthorized' };
    }

    try {
        const { data, error } = await supabase
            .from('vendors')
            .select('*')
            .eq('id', id)
            .eq('user_id', user.id)
            .single();

        if (error) throw error;
        return { data };
    } catch (error) {
        console.error('Get vendor error:', error);
        return { error: 'Failed to fetch vendor' };
    }
}

export async function createVendor(data: Omit<VendorInsert, 'user_id'>) {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        return { error: 'Unauthorized' };
    }

    try {
        const { data: vendor, error } = await supabase
            .from('vendors')
            .insert({
                ...data,
                user_id: user.id
            })
            .select()
            .single();

        if (error) throw error;

        revalidatePath('/vendors');
        return { data: vendor };
    } catch (error) {
        console.error('Create vendor error:', error);
        return { error: 'Failed to create vendor' };
    }
}

export async function updateVendor(id: string, data: VendorUpdate) {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        return { error: 'Unauthorized' };
    }

    try {
        const { error } = await supabase
            .from('vendors')
            .update(data)
            .eq('id', id)
            .eq('user_id', user.id);

        if (error) throw error;

        revalidatePath('/vendors');
        revalidatePath(`/vendors/${id}`);
        return { success: true };
    } catch (error) {
        console.error('Update vendor error:', error);
        return { error: 'Failed to update vendor' };
    }
}

export async function deleteVendor(id: string) {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        return { error: 'Unauthorized' };
    }

    try {
        const { error } = await supabase
            .from('vendors')
            .delete()
            .eq('id', id)
            .eq('user_id', user.id);

        if (error) throw error;

        revalidatePath('/vendors');
        return { success: true };
    } catch (error) {
        console.error('Delete vendor error:', error);
        return { error: 'Failed to delete vendor' };
    }
}
