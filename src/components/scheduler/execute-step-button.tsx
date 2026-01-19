'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Send, Loader2, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { executeScheduledStep } from '@/app/actions/email-actions';

interface ExecuteStepButtonProps {
    stepId: string;
    status: string;
    channel: string;
}

export function ExecuteStepButton({ stepId, status, channel }: ExecuteStepButtonProps) {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);

    const handleExecute = async () => {
        setIsLoading(true);
        try {
            const result = await executeScheduledStep(stepId);

            if (result.success) {
                toast.success(`${channel === 'sms' ? 'SMS' : 'Email'} wysłany pomyślnie!`);
                router.refresh();
            } else {
                toast.error(result.error || 'Błąd wysyłki');
            }
        } catch (err) {
            console.error('Execute error:', err);
            toast.error('Wystąpił błąd');
        } finally {
            setIsLoading(false);
        }
    };

    if (status === 'sent') {
        return (
            <Button variant="ghost" size="sm" disabled className="text-green-600">
                <Check className="h-4 w-4 mr-1" />
                Wysłano
            </Button>
        );
    }

    if (status === 'failed') {
        return (
            <Button variant="ghost" size="sm" onClick={handleExecute} disabled={isLoading}>
                {isLoading ? (
                    <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                ) : (
                    <X className="h-4 w-4 mr-1 text-red-500" />
                )}
                Ponów
            </Button>
        );
    }

    if (status === 'cancelled') {
        return (
            <Button variant="ghost" size="sm" disabled className="text-muted-foreground">
                Anulowano
            </Button>
        );
    }

    // pending status
    return (
        <Button
            variant="outline"
            size="sm"
            onClick={handleExecute}
            disabled={isLoading}
        >
            {isLoading ? (
                <>
                    <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                    Wysyłam...
                </>
            ) : (
                <>
                    <Send className="h-4 w-4 mr-1" />
                    Wyślij teraz
                </>
            )}
        </Button>
    );
}
