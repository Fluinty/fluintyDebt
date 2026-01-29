'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { RefreshCw, DownloadCloud } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip';
import { syncKSeFInvoices } from '@/app/actions/ksef-actions';
import { toast } from 'sonner';

interface KSeFImportButtonProps {
    syncMode?: 'all' | 'sales' | 'costs';
    isConfigured: boolean;
    className?: string;
    variant?: 'default' | 'outline' | 'secondary' | 'ghost' | 'link' | 'destructive';
    size?: 'default' | 'sm' | 'lg' | 'icon';
}

export function KSeFImportButton({
    syncMode = 'all',
    isConfigured,
    className,
    variant = "outline",
    size = "sm"
}: KSeFImportButtonProps) {
    const [isLoading, setIsLoading] = useState(false);
    const router = useRouter();

    const handleSync = async () => {
        if (!isConfigured) return;

        setIsLoading(true);
        try {
            const result = await syncKSeFInvoices(7, undefined, syncMode); // Sync last 7 days

            if (result.success) {
                let message = '';
                const total = result.invoicesImported || 0;

                if (total > 0) {
                    message = `Zaimportowano ${total} faktur.`;
                } else {
                    message = 'Nie znaleziono nowych faktur.';
                }

                if (result.warning) {
                    toast.warning('Ostrzeżenie KSeF', { description: result.warning });
                } else {
                    toast.success('Synchronizacja zakończona', { description: message });
                }

                router.refresh();
            } else {
                toast.error('Błąd synchronizacji', {
                    description: result.error || 'Wystąpił nieznany błąd.'
                });
            }
        } catch (error) {
            console.error('KSeF sync error:', error);
            toast.error('Błąd', { description: 'Wystąpił błąd podczas komunikacji z serwerem.' });
        } finally {
            setIsLoading(false);
        }
    };

    if (!isConfigured) {
        return (
            <TooltipProvider>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <span tabIndex={0} className="cursor-not-allowed inline-block">
                            <Button
                                variant={variant}
                                size={size}
                                disabled
                                className={`opacity-50 ${className}`}
                            >
                                <DownloadCloud className="w-4 h-4 mr-2" />
                                Import z KSeF
                            </Button>
                        </span>
                    </TooltipTrigger>
                    <TooltipContent>
                        <p>Skonfiguruj integrację KSeF w ustawieniach, aby importować faktury.</p>
                    </TooltipContent>
                </Tooltip>
            </TooltipProvider>
        );
    }

    return (
        <Button
            variant={variant}
            size={size}
            onClick={handleSync}
            disabled={isLoading}
            className={className}
        >
            {isLoading ? (
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
            ) : (
                <DownloadCloud className="w-4 h-4 mr-2" />
            )}
            Import z KSeF
        </Button>
    );
}
