import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { Sidebar } from '@/components/layout/sidebar';
import { Header } from '@/components/layout/header';
import { DashboardWrapper } from '@/components/layout/dashboard-wrapper';
import { createClient } from '@/lib/supabase/server';

export const metadata: Metadata = {
    title: 'VindycAItion - Dashboard',
    description: 'Zarządzaj swoimi należnościami',
};

export default async function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    // Get authenticated user from Supabase
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    // Redirect to login if not authenticated
    if (!user) {
        redirect('/login');
    }

    // Get user profile
    const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

    return (
        <DashboardWrapper>
            <div className="min-h-screen bg-background">
                <Sidebar user={user} profile={profile} />
                <div className="lg:pl-64">
                    <Header user={user} profile={profile} />
                    <main className="p-6">
                        {children}
                    </main>
                </div>
            </div>
        </DashboardWrapper>
    );
}
