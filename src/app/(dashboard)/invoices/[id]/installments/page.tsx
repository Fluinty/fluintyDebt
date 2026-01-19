'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Plus, Trash2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Breadcrumbs } from '@/components/shared/breadcrumbs';
import { formatCurrency } from '@/lib/utils/format-currency';
import { toast } from 'sonner';

// Mock invoice data
const mockInvoice = {
    id: '1',
    invoice_number: 'FV/2026/001',
    debtor_name: 'ABC Sp. z o.o.',
    amount: 15000,
};

interface Installment {
    id: string;
    number: number;
    amount: number;
    due_date: string;
}

export default function CreateInstallmentsPage() {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);
    const [installments, setInstallments] = useState<Installment[]>([
        { id: '1', number: 1, amount: 5000, due_date: '2026-02-15' },
        { id: '2', number: 2, amount: 5000, due_date: '2026-03-15' },
        { id: '3', number: 3, amount: 5000, due_date: '2026-04-15' },
    ]);

    const totalInstallmentAmount = installments.reduce((sum, i) => sum + i.amount, 0);
    const remaining = mockInvoice.amount - totalInstallmentAmount;

    const addInstallment = () => {
        const lastInstallment = installments[installments.length - 1];
        const nextDate = new Date(lastInstallment?.due_date || new Date());
        nextDate.setMonth(nextDate.getMonth() + 1);

        setInstallments([
            ...installments,
            {
                id: `${Date.now()}`,
                number: installments.length + 1,
                amount: remaining > 0 ? remaining : 0,
                due_date: nextDate.toISOString().split('T')[0],
            },
        ]);
    };

    const removeInstallment = (id: string) => {
        if (installments.length > 1) {
            const updated = installments
                .filter((i) => i.id !== id)
                .map((i, idx) => ({ ...i, number: idx + 1 }));
            setInstallments(updated);
        }
    };

    const updateInstallment = (id: string, updates: Partial<Installment>) => {
        setInstallments(
            installments.map((i) => (i.id === id ? { ...i, ...updates } : i))
        );
    };

    const handleSubmit = async () => {
        if (remaining !== 0) {
            toast.error('Suma rat musi być równa kwocie faktury');
            return;
        }

        setIsLoading(true);
        await new Promise((r) => setTimeout(r, 1000));
        console.log('Created installments:', installments);
        toast.success('Plan ratalny został utworzony!');
        setIsLoading(false);
        router.push(`/invoices/${mockInvoice.id}`);
    };

    return (
        <div className="space-y-6">
            <Breadcrumbs />

            <div className="flex items-center gap-4">
                <Link href={`/invoices/${mockInvoice.id}`}>
                    <Button variant="ghost" size="icon">
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                </Link>
                <div>
                    <h1 className="text-3xl font-bold">Rozłóż na raty</h1>
                    <p className="text-muted-foreground mt-1">
                        {mockInvoice.invoice_number} • {mockInvoice.debtor_name}
                    </p>
                </div>
            </div>

            {/* Summary */}
            <div className="grid grid-cols-3 gap-4">
                <Card>
                    <CardContent className="pt-6 text-center">
                        <p className="text-2xl font-bold">{formatCurrency(mockInvoice.amount)}</p>
                        <p className="text-xs text-muted-foreground">Kwota faktury</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6 text-center">
                        <p className="text-2xl font-bold">{formatCurrency(totalInstallmentAmount)}</p>
                        <p className="text-xs text-muted-foreground">Suma rat</p>
                    </CardContent>
                </Card>
                <Card className={remaining !== 0 ? 'border-red-200 bg-red-50' : 'border-green-200 bg-green-50'}>
                    <CardContent className="pt-6 text-center">
                        <p className={`text-2xl font-bold ${remaining !== 0 ? 'text-red-600' : 'text-green-600'}`}>
                            {formatCurrency(remaining)}
                        </p>
                        <p className="text-xs text-muted-foreground">Pozostało</p>
                    </CardContent>
                </Card>
            </div>

            {/* Installments */}
            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                        <CardTitle>Raty ({installments.length})</CardTitle>
                        <CardDescription>Określ kwoty i terminy płatności</CardDescription>
                    </div>
                    <Button variant="outline" onClick={addInstallment}>
                        <Plus className="h-4 w-4 mr-2" />
                        Dodaj ratę
                    </Button>
                </CardHeader>
                <CardContent className="space-y-4">
                    {installments.map((inst) => (
                        <div key={inst.id} className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg">
                            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary">
                                {inst.number}
                            </div>
                            <div className="flex-1 grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <Label className="text-xs">Kwota (PLN)</Label>
                                    <Input
                                        type="number"
                                        step="0.01"
                                        value={inst.amount}
                                        onChange={(e) => updateInstallment(inst.id, { amount: parseFloat(e.target.value) || 0 })}
                                    />
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-xs">Termin płatności</Label>
                                    <Input
                                        type="date"
                                        value={inst.due_date}
                                        onChange={(e) => updateInstallment(inst.id, { due_date: e.target.value })}
                                    />
                                </div>
                            </div>
                            {installments.length > 1 && (
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="text-red-600"
                                    onClick={() => removeInstallment(inst.id)}
                                >
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            )}
                        </div>
                    ))}
                </CardContent>
            </Card>

            {/* Info */}
            <Card className="bg-primary/5 border-primary/20">
                <CardContent className="pt-6">
                    <p className="text-sm">
                        💡 Po utworzeniu planu ratalnego każda rata będzie traktowana jak osobna należność
                        z własną sekwencją windykacyjną.
                    </p>
                </CardContent>
            </Card>

            {/* Actions */}
            <div className="flex gap-4">
                <Link href={`/invoices/${mockInvoice.id}`}>
                    <Button variant="outline">Anuluj</Button>
                </Link>
                <Button onClick={handleSubmit} disabled={isLoading || remaining !== 0}>
                    {isLoading ? (
                        <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Tworzenie...</>
                    ) : (
                        'Utwórz plan ratalny'
                    )}
                </Button>
            </div>
        </div>
    );
}
