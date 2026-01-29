'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { CheckCircle2, Loader2 } from 'lucide-react';
import { markCostAsPaid } from '@/app/actions/cost-actions';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface MarkAsPaidButtonProps {
    invoiceId: string;
    isPaid: boolean;
}

export function MarkAsPaidButton({ invoiceId, isPaid }: MarkAsPaidButtonProps) {
    const [isLoading, setIsLoading] = useState(false);

    const handleMarkAsPaid = async () => {
        if (isPaid) return;

        setIsLoading(true);
        try {
            await markCostAsPaid(invoiceId);
            toast.success('Pomyślnie oznaczono jako opłaconą');
        } catch (error) {
            console.error('Error marking as paid:', error);
            toast.error('Wystąpił błąd podczas aktualizacji statusu');
        } finally {
            setIsLoading(false);
        }
    };

    if (isPaid) {
        return (
            <Button variant="ghost" disabled className="gap-2 text-emerald-600 font-medium">
                <CheckCircle2 className="h-5 w-5" />
                Opłacona
            </Button>
        );
    }

    return (
        <Button
            onClick={handleMarkAsPaid}
            disabled={isLoading}
            variant="default"
            className={cn(
                "gap-2 bg-emerald-600 hover:bg-emerald-700 text-white min-w-[200px]",
                isLoading && "opacity-80"
            )}
        >
            {isLoading ? (
                <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Aktualizacja...
                </>
            ) : (
                <>
                    <CheckCircle2 className="h-4 w-4" />
                    Oznacz jako opłaconą
                </>
            )}
        </Button>
    );
}
