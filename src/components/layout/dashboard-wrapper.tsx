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

            // 2. Get sequence_id from the wizard selection first (we need it for debtor)
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
                }
            }

            // 3. Create debtor if provided (with sequence from wizard)
            let createdDebtorId: string | null = null;
            if (data?.debtor && data.debtor.name) {
                const { data: newDebtor, error: debtorError } = await supabase
                    .from('debtors')
                    .insert({
                        user_id: user.id,
                        name: data.debtor.name,
                        nip: data.debtor.nip || null,
                        email: data.debtor.email || null,
                        phone: data.debtor.phone || null,
                        address: data.debtor.address || null,
                        city: data.debtor.city || null,
                        postal_code: data.debtor.postal_code || null,
                        default_sequence_id: selectedSequenceId,
                    })
                    .select('id')
                    .single();

                if (debtorError) {
                    console.error('Debtor save error:', debtorError);
                    // Don't block - debtor is optional
                } else {
                    createdDebtorId = newDebtor?.id;
                }
            }

            // 4. Create invoice if provided AND debtor was created
            if (data?.invoice && data.invoice.invoice_number && createdDebtorId) {
                // Use the selectedSequenceId we already fetched above

                const dueDate = data.invoice.due_date || new Date().toISOString().split('T')[0];

                const { data: newInvoice, error: invoiceError } = await supabase
                    .from('invoices')
                    .insert({
                        user_id: user.id,
                        debtor_id: createdDebtorId,
                        invoice_number: data.invoice.invoice_number,
                        amount: parseFloat(data.invoice.amount_gross) || 0,
                        amount_net: parseFloat(data.invoice.amount_net) || 0,
                        vat_rate: data.invoice.vat_rate || '23',
                        amount_gross: parseFloat(data.invoice.amount_gross) || 0,
                        issue_date: data.invoice.issue_date || new Date().toISOString().split('T')[0],
                        due_date: dueDate,
                        description: data.invoice.description || null,
                        status: 'pending',
                        sequence_id: selectedSequenceId,
                        auto_send_enabled: true,
                    })
                    .select('id')
                    .single();

                if (invoiceError) {
                    console.error('Invoice save error:', invoiceError);
                    // Don't block - invoice is optional
                } else if (newInvoice && selectedSequenceId) {
                    // Generate scheduled steps for the invoice
                    const { data: steps } = await supabase
                        .from('sequence_steps')
                        .select('*')
                        .eq('sequence_id', selectedSequenceId)
                        .order('step_order');

                    if (steps && steps.length > 0) {
                        const dueDateObj = new Date(dueDate);
                        const today = new Date();
                        today.setHours(0, 0, 0, 0);

                        const scheduledSteps = steps
                            .map((step: any) => {
                                const scheduledDate = new Date(dueDateObj);
                                scheduledDate.setDate(scheduledDate.getDate() + step.days_offset);
                                return {
                                    invoice_id: newInvoice.id,
                                    sequence_step_id: step.id,
                                    scheduled_date: scheduledDate.toISOString().split('T')[0],
                                    scheduled_time: '10:00',
                                    status: scheduledDate < today ? 'skipped' : 'pending',
                                };
                            })
                            .filter((s: any) => s.status === 'pending');

                        if (scheduledSteps.length > 0) {
                            await supabase.from('scheduled_steps').insert(scheduledSteps);
                        }
                    }
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

            // 5. Set default sequence (find matching sequence and update profile)
            if (data?.sequence) {
                // Map wizard sequence choice to actual sequence names
                const sequenceNameMap: Record<string, string> = {
                    'gentle': 'Windykacja Łagodna',
                    'standard': 'Windykacja Standardowa',
                    'quick': 'Szybka Eskalacja',
                };

                const sequenceName = sequenceNameMap[data.sequence] || 'Windykacja Standardowa';

                // Find matching system sequence
                const { data: sequences } = await supabase
                    .from('sequences')
                    .select('id')
                    .eq('name', sequenceName)
                    .eq('is_system', true)
                    .limit(1);

                if (sequences && sequences.length > 0) {
                    await supabase
                        .from('profiles')
                        .update({ default_sequence_id: sequences[0].id })
                        .eq('id', user.id);
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
