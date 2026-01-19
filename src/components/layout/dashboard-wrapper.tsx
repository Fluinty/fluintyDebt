'use client';

import { useState, useEffect } from 'react';
import { OnboardingWizard } from '@/components/onboarding/onboarding-wizard';

interface DashboardWrapperProps {
    children: React.ReactNode;
}

export function DashboardWrapper({ children }: DashboardWrapperProps) {
    const [showOnboarding, setShowOnboarding] = useState(false);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        // Check if onboarding has been completed
        const onboardingComplete = localStorage.getItem('vindycaition-onboarding-complete');
        if (!onboardingComplete) {
            setShowOnboarding(true);
        }
    }, []);

    const handleOnboardingComplete = () => {
        localStorage.setItem('vindycaition-onboarding-complete', 'true');
        setShowOnboarding(false);
    };

    // Prevent hydration mismatch
    if (!mounted) {
        return <>{children}</>;
    }

    return (
        <>
            {children}
            {showOnboarding && <OnboardingWizard onComplete={handleOnboardingComplete} />}
        </>
    );
}
