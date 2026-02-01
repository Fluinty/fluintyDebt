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

                // Check if profile has onboarding_completed or company_name filled
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('onboarding_completed, company_name')
                    .eq('id', user.id)
                    .single();

                // Show onboarding only if:
                // - onboarding_completed is false/null AND
                // - company_name is not set (means user never completed setup)
                const needsOnboarding = !profile?.onboarding_completed && !profile?.company_name;

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
                // Update profile with company data
                await supabase
                    .from('profiles')
                    .update({
                        company_name: data.company.name,
                        company_nip: data.company.nip,
                        company_address: data.company.address,
                        bank_account_number: data.company.bank_account,
                        onboarding_completed: true
                    })
                    .eq('id', user.id);
            } else if (user) {
                // Just mark as complete if skipped or no data
                await supabase
                    .from('profiles')
                    .update({ onboarding_completed: true })
                    .eq('id', user.id);
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
