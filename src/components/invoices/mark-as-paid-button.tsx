'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { CreditCard, Loader2, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { markInvoiceAsPaid } from '@/app/actions/invoice-actions';
import { formatCurrency } from '@/lib/utils/format-currency';

interface MarkAsPaidButtonProps {
    invoiceId: string;
    amount: number;
    amountPaid: number;
    isPaid: boolean;
}

export function MarkAsPaidButton({ invoiceId, amount, amountPaid, isPaid }: MarkAsPaidButtonProps) {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);
    const [isOpen, setIsOpen] = useState(false);

    const remaining = amount - amountPaid;

    const handleMarkAsPaid = async () => {
        setIsLoading(true);
        try {
            const result = await markInvoiceAsPaid(invoiceId);

            if (result.error) {
                toast.error('Błąd: ' + result.error);
                return;
            }

            toast.success('Faktura została oznaczona jako opłacona!');
            setIsOpen(false);
            router.refresh();
        } catch (err) {
            console.error('Error:', err);
            toast.error('Wystąpił błąd');
        } finally {
            setIsLoading(false);
        }
    };

    if (isPaid) {
        return (
            <Button disabled variant="outline" className="bg-green-50 text-green-700 border-green-200">
                <Check className="h-4 w-4 mr-2" />
                Opłacona
            </Button>
        );
    }

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button>
                    <CreditCard className="h-4 w-4 mr-2" />
                    Oznacz jako opłaconą
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Potwierdź płatność</DialogTitle>
                    <DialogDescription>
                        Czy potwierdzasz otrzymanie pełnej kwoty <strong>{formatCurrency(remaining)}</strong>?
                    </DialogDescription>
                </DialogHeader>

                <div className="py-4">
                    <p className="text-sm text-muted-foreground">
                        Faktura zostanie oznaczona jako opłacona i sekwencja windykacyjna zostanie zatrzymana.
                    </p>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => setIsOpen(false)}>
                        Anuluj
                    </Button>
                    <Button onClick={handleMarkAsPaid} disabled={isLoading}>
                        {isLoading ? (
                            <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                Zapisuję...
                            </>
                        ) : (
                            <>
                                <Check className="h-4 w-4 mr-2" />
                                Potwierdź płatność
                            </>
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
