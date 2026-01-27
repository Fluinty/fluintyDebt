import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { Profile } from '@/types';

type Module = 'sales' | 'costs';

export async function requireModule(moduleName: Module) {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        redirect('/login');
    }

    const { data: profile } = await supabase
        .from('profiles')
        .select('modules')
        .eq('id', user.id)
        .single();

    // Default: Sales=true, Costs=false (legacy behavior)
    const modules = (profile as Profile)?.modules || { sales: true, costs: false };

    if (!modules[moduleName]) {
        redirect(`/upsell?module=${moduleName}`);
    }
}
