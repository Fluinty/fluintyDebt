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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { markInvoiceAsPaid, recordPartialPayment } from '@/app/actions/invoice-actions';
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
    const [paymentType, setPaymentType] = useState<'full' | 'partial'>('full');
    const [partialAmount, setPartialAmount] = useState('');

    const remaining = amount - amountPaid;

    const handleMarkAsPaid = async () => {
        setIsLoading(true);
        try {
            let result;

            if (paymentType === 'full') {
                result = await markInvoiceAsPaid(invoiceId);
            } else {
                const parsedAmount = parseFloat(partialAmount);
                if (isNaN(parsedAmount) || parsedAmount <= 0) {
                    toast.error('Wprowadź poprawną kwotę');
                    return;
                }
                result = await recordPartialPayment(invoiceId, parsedAmount);
            }

            if (result.error) {
                toast.error('Błąd: ' + result.error);
                return;
            }

            toast.success(
                result.status === 'paid'
                    ? 'Faktura została oznaczona jako opłacona!'
                    : 'Płatność częściowa została zarejestrowana!'
            );
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
                    <DialogTitle>Zarejestruj płatność</DialogTitle>
                    <DialogDescription>
                        Pozostało do zapłaty: <strong>{formatCurrency(remaining)}</strong>
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    <div className="flex gap-2">
                        <Button
                            variant={paymentType === 'full' ? 'default' : 'outline'}
                            onClick={() => setPaymentType('full')}
                            className="flex-1"
                        >
                            Pełna kwota
                        </Button>
                        <Button
                            variant={paymentType === 'partial' ? 'default' : 'outline'}
                            onClick={() => setPaymentType('partial')}
                            className="flex-1"
                        >
                            Częściowa
                        </Button>
                    </div>

                    {paymentType === 'partial' && (
                        <div className="space-y-2">
                            <Label htmlFor="amount">Kwota wpłaty (PLN)</Label>
                            <Input
                                id="amount"
                                type="number"
                                step="0.01"
                                min="0.01"
                                max={remaining}
                                value={partialAmount}
                                onChange={(e) => setPartialAmount(e.target.value)}
                                placeholder={`Max: ${remaining.toFixed(2)}`}
                            />
                        </div>
                    )}

                    {paymentType === 'full' && (
                        <p className="text-sm text-muted-foreground">
                            Zarejestrowałeś otrzymanie pełnej kwoty <strong>{formatCurrency(remaining)}</strong>.
                            Faktura zostanie oznaczona jako opłacona i sekwencja windykacyjna zostanie zatrzymana.
                        </p>
                    )}
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
