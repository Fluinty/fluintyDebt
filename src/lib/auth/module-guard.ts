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

    // Default: all modules enabled if profile has no modules set yet (race condition after signup)
    const modules = (profile as Profile)?.modules as Record<string, boolean> | null;
    const hasModule = modules ? modules[moduleName] !== false : true;

    if (!hasModule) {
        redirect(`/upsell?module=${moduleName}`);
    }
}
