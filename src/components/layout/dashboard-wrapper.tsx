'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { OnboardingWizard } from '@/components/onboarding/onboarding-wizard';

interface DashboardWrapperProps {
    children: React.ReactNode;
}

export function DashboardWrapper({ children }: DashboardWrapperProps) {
    const [showOnboarding, setShowOnboarding] = useState(false);
    const [mounted, setMounted] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        setMounted(true);

        const checkOnboardingStatus = async () => {
            try {
                const supabase = createClient();
                const { data: { user } } = await supabase.auth.getUser();

                if (!user) {
                    setLoading(false);
                    return;
                }

                // Check if profile has company data filled
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('onboarding_completed, company_name, company_nip')
                    .eq('id', user.id)
                    .single();

                // Show onboarding if company_name OR company_nip is missing
                // This ensures users complete the wizard before using the app
                const needsOnboarding = !profile?.company_name || !profile?.company_nip;

                setShowOnboarding(needsOnboarding);
            } catch (error) {
                console.error('Error checking onboarding status:', error);
            } finally {
                setLoading(false);
            }
        };

        checkOnboardingStatus();
    }, []);

    const handleOnboardingComplete = async (data?: any) => {
        try {
            const supabase = createClient();
            const { data: { user } } = await supabase.auth.getUser();

            if (user && data?.company) {
                // Update profile with company data (use UPSERT to create if missing)
                await supabase
                    .from('profiles')
                    .upsert({
                        id: user.id,
                        email: user.email, // Ensure email is present for new row
                        company_name: data.company.name,
                        company_nip: data.company.nip,
                        company_address: data.company.address,
                        bank_account_number: data.company.bank_account,
                        country: 'PL', // Default
                        onboarding_completed: true,
                        modules: { sales: true, costs: true } // Force enable modules
                    });
            } else if (user) {
                // Just mark as complete if skipped or no data
                await supabase
                    .from('profiles')
                    .upsert({
                        id: user.id,
                        email: user.email,
                        onboarding_completed: true
                    });
            }

            setShowOnboarding(false);
        } catch (error) {
            console.error('Error updating onboarding status:', error);
            setShowOnboarding(false);
        }
    };

    // Prevent hydration mismatch
    if (!mounted || loading) {
        return <>{children}</>;
    }

    return (
        <>
            {children}
            {showOnboarding && <OnboardingWizard onComplete={handleOnboardingComplete} />}
        </>
    );
}
