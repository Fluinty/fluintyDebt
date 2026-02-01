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

            if (!user) {
                setShowOnboarding(false);
                return;
            }

            // 1. Save company data to profile
            if (data?.company) {
                const { error: profileError } = await supabase
                    .from('profiles')
                    .upsert({
                        id: user.id,
                        email: user.email,
                        company_name: data.company.name,
                        company_nip: data.company.nip,
                        company_address: data.company.address,
                        company_city: data.company.city,
                        company_postal_code: data.company.postal_code,
                        bank_account_number: data.company.bank_account,
                        country: 'PL',
                        onboarding_completed: true,
                        modules: { sales: true, costs: true }
                    });

                if (profileError) {
                    console.error('Profile save error:', profileError);
                    alert(`Błąd zapisu profilu: ${profileError.message}`);
                    return;
                }
            } else {
                // Just mark as complete if skipped
                await supabase.from('profiles').upsert({
                    id: user.id,
                    email: user.email,
                    onboarding_completed: true
                });
            }

            // 2. Get sequence_id from the wizard selection
            let selectedSequenceId: string | null = null;
            if (data?.sequence) {
                const sequenceNameMap: Record<string, string> = {
                    'gentle': 'Windykacja Łagodna',
                    'standard': 'Windykacja Standardowa',
                    'quick': 'Szybka Eskalacja',
                };
                const sequenceName = sequenceNameMap[data.sequence] || 'Windykacja Standardowa';

                const { data: sequences } = await supabase
                    .from('sequences')
                    .select('id')
                    .eq('name', sequenceName)
                    .eq('is_system', true)
                    .limit(1);

                if (sequences && sequences.length > 0) {
                    selectedSequenceId = sequences[0].id;

                    // Save default_sequence_id to profile
                    await supabase
                        .from('profiles')
                        .update({ default_sequence_id: selectedSequenceId })
                        .eq('id', user.id);
                }
            }

            // 4. Save KSeF settings if provided
            if (data?.ksef && data.ksef.token && !data.ksef.skipSetup) {
                const { error: ksefError } = await supabase
                    .from('user_ksef_settings')
                    .upsert({
                        user_id: user.id,
                        ksef_nip: data.ksef.nip || data.company?.nip,
                        ksef_token_encrypted: data.ksef.token, // In production, encrypt this
                        is_enabled: true,
                        ksef_environment: 'test', // Default to test
                    });

                if (ksefError) {
                    console.error('KSeF save error:', ksefError);
                    // Don't block
                }
            }

            setShowOnboarding(false);
            // Refresh page to show new data
            window.location.reload();
        } catch (error) {
            console.error('Error updating onboarding status:', error);
            alert(`Nieoczekiwany błąd: ${error}`);
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
