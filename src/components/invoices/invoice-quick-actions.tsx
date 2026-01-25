'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Mail, CreditCard, Play, Loader2, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { sendManualReminder, changeInvoiceSequence, getAvailableSequences } from '@/app/actions/invoice-actions';

interface InvoiceQuickActionsProps {
    invoiceId: string;
    invoiceNumber: string;
    debtorEmail: string | null;
    debtorName: string;
    amount: number;
    dueDate: string;
    paymentLink: string | null;
    currentSequenceId?: string | null;
}

export function InvoiceQuickActions({
    invoiceId,
    invoiceNumber,
    debtorEmail,
    debtorName,
    amount,
    dueDate,
    paymentLink,
    currentSequenceId,
}: InvoiceQuickActionsProps) {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);
    const [showConfirmDialog, setShowConfirmDialog] = useState(false);
    const [showSequenceDialog, setShowSequenceDialog] = useState(false);
    const [sequences, setSequences] = useState<{ id: string; name: string }[]>([]);
    const [selectedSequence, setSelectedSequence] = useState<string>(currentSequenceId || '');
    const [isChangingSequence, setIsChangingSequence] = useState(false);

    useEffect(() => {
        if (showSequenceDialog) {
            loadSequences();
        }
    }, [showSequenceDialog]);

    const loadSequences = async () => {
        const result = await getAvailableSequences();
        if (result.sequences) {
            setSequences(result.sequences);
        }
    };

    const handleSendReminder = async () => {
        if (!debtorEmail) {
            toast.error('Kontrahent nie ma podanego adresu email');
            return;
        }

        setIsLoading(true);
        try {
            const result = await sendManualReminder(invoiceId);

            if (result.error) {
                toast.error('Błąd: ' + result.error);
            } else {
                toast.success('Wezwanie zostało wysłane!');
                setShowConfirmDialog(false);
                router.refresh();
            }
        } catch (err) {
            console.error('Error sending reminder:', err);
            toast.error('Wystąpił błąd podczas wysyłania');
        } finally {
            setIsLoading(false);
        }
    };

    const handleCopyPaymentLink = async () => {
        if (paymentLink) {
            await navigator.clipboard.writeText(paymentLink);
            toast.success('Link skopiowany do schowka!');
        } else {
            toast.error('Brak linku do płatności');
        }
    };

    const handleChangeSequence = async () => {
        if (!selectedSequence) {
            toast.error('Wybierz sekwencję');
            return;
        }

        setIsChangingSequence(true);
        try {
            const result = await changeInvoiceSequence(invoiceId, selectedSequence, dueDate);
            if (result.error) {
                toast.error('Błąd: ' + result.error);
            } else {
                toast.success('Sekwencja została zmieniona!');
                setShowSequenceDialog(false);
                router.refresh();
            }
        } catch (err) {
            console.error('Error changing sequence:', err);
            toast.error('Wystąpił błąd podczas zmiany sekwencji');
        } finally {
            setIsChangingSequence(false);
        }
    };

    return (
        <>
            <Card>
                <CardHeader>
                    <CardTitle>Akcje</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                    <Button
                        variant="outline"
                        className="w-full justify-start"
                        onClick={() => setShowConfirmDialog(true)}
                        disabled={!debtorEmail}
                    >
                        <Mail className="h-4 w-4 mr-2" />
                        Wyślij wezwanie ręcznie
                    </Button>
                    <Button
                        variant="outline"
                        className="w-full justify-start"
                        onClick={() => window.open(`/api/pdf/payment-reminder/${invoiceId}`, '_blank')}
                    >
                        <FileText className="h-4 w-4 mr-2" />
                        Pobierz fakturę PDF
                    </Button>
                </CardContent>
            </Card>

            {/* Send reminder dialog */}
            <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Potwierdź wysłanie wezwania</DialogTitle>
                        <DialogDescription>
                            Czy na pewno chcesz wysłać wezwanie do zapłaty na adres{' '}
                            <strong>{debtorEmail}</strong>?
                        </DialogDescription>
                    </DialogHeader>

                    <div className="py-4 space-y-2 text-sm">
                        <p><strong>Faktura:</strong> {invoiceNumber}</p>
                        <p><strong>Kontrahent:</strong> {debtorName}</p>
                        <p><strong>Kwota:</strong> {amount.toLocaleString('pl-PL', { style: 'currency', currency: 'PLN' })}</p>
                        <p><strong>Termin:</strong> {new Date(dueDate).toLocaleDateString('pl-PL')}</p>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowConfirmDialog(false)}>
                            Anuluj
                        </Button>
                        <Button onClick={handleSendReminder} disabled={isLoading}>
                            {isLoading ? (
                                <>
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    Wysyłam...
                                </>
                            ) : (
                                <>
                                    <Mail className="h-4 w-4 mr-2" />
                                    Wyślij wezwanie
                                </>
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Change sequence dialog */}
            <Dialog open={showSequenceDialog} onOpenChange={setShowSequenceDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Zmień sekwencję windykacyjną</DialogTitle>
                        <DialogDescription>
                            Wybierz nową sekwencję dla faktury {invoiceNumber}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="py-4">
                        <Label htmlFor="sequence">Sekwencja</Label>
                        <Select value={selectedSequence} onValueChange={setSelectedSequence}>
                            <SelectTrigger className="mt-2">
                                <SelectValue placeholder="Wybierz sekwencję..." />
                            </SelectTrigger>
                            <SelectContent>
                                {sequences.map((seq) => (
                                    <SelectItem key={seq.id} value={seq.id}>
                                        {seq.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowSequenceDialog(false)}>
                            Anuluj
                        </Button>
                        <Button onClick={handleChangeSequence} disabled={isChangingSequence || !selectedSequence}>
                            {isChangingSequence ? (
                                <>
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    Zapisuję...
                                </>
                            ) : (
                                'Zapisz'
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
