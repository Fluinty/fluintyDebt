'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Pause, Play, SkipForward, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { toggleInvoiceAutoSend, skipNextScheduledStep } from '@/app/actions/invoice-actions';

interface SequenceControlsProps {
    invoiceId: string;
    isPaused: boolean;
}

export function SequenceControls({ invoiceId, isPaused: initialPaused }: SequenceControlsProps) {
    const router = useRouter();
    const [isLoadingPause, setIsLoadingPause] = useState(false);
    const [isLoadingSkip, setIsLoadingSkip] = useState(false);

    // Optimistic state
    const [isPaused, setIsPaused] = useState(initialPaused);

    const handleTogglePause = async () => {
        setIsLoadingPause(true);
        // Optimistic update
        const newState = !isPaused;
        setIsPaused(newState);

        try {
            const result = await toggleInvoiceAutoSend(invoiceId, !newState); // passing 'enabled' which is !isPaused

            if (result.success) {
                toast.success(newState ? 'Wstrzymano automatyczne wysyłanie' : 'Wznowiono automatyczne wysyłanie');
                router.refresh();
            } else {
                // Revert state if failed
                setIsPaused(!newState);
                toast.error(result.error || 'Wystąpił błąd');
            }
        } catch (error) {
            setIsPaused(!newState);
            toast.error('Wystąpił błąd komunikacji');
        } finally {
            setIsLoadingPause(false);
        }
    };

    const handleSkipStep = async () => {
        setIsLoadingSkip(true);
        try {
            const result = await skipNextScheduledStep(invoiceId);
            if (result.success) {
                toast.success('Pominięto najbliższy krok');
                router.refresh();
            } else if (result.error === 'No pending steps to skip') {
                toast.info('Brak oczekujących kroków do pominięcia');
            } else {
                toast.error(result.error || 'Wystąpił błąd');
            }
        } catch (error) {
            toast.error('Wystąpił błąd komunikacji');
        } finally {
            setIsLoadingSkip(false);
        }
    };

    return (
        <div className="flex gap-2">
            <Button
                variant="outline"
                size="sm"
                onClick={handleTogglePause}
                disabled={isLoadingPause}
                className={isPaused ? "text-green-600 border-green-200 hover:bg-green-50" : "text-amber-600 border-amber-200 hover:bg-amber-50"}
            >
                {isLoadingPause ? (
                    <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                ) : isPaused ? (
                    <Play className="h-4 w-4 mr-1" />
                ) : (
                    <Pause className="h-4 w-4 mr-1" />
                )}
                {isPaused ? 'Wznów' : 'Wstrzymaj'}
            </Button>
            <Button
                variant="outline"
                size="sm"
                onClick={handleSkipStep}
                disabled={isLoadingSkip}
            >
                {isLoadingSkip ? (
                    <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                ) : (
                    <SkipForward className="h-4 w-4 mr-1" />
                )}
                Pomiń krok
            </Button>
        </div>
    );
}
