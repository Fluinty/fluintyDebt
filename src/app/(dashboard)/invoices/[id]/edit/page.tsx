'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowLeft, Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Breadcrumbs } from '@/components/shared/breadcrumbs';
import { toast } from 'sonner';

const invoiceSchema = z.object({
    invoice_number: z.string().min(1, 'Numer faktury jest wymagany'),
    amount: z.number().min(0.01, 'Kwota musi być większa niż 0'),
    issue_date: z.string().min(1, 'Data wystawienia jest wymagana'),
    due_date: z.string().min(1, 'Termin płatności jest wymagany'),
    description: z.string().optional(),
});

type InvoiceFormData = z.infer<typeof invoiceSchema>;

// Mock existing invoice
const mockInvoice = {
    id: '1',
    invoice_number: 'FV/2026/001',
    debtor_id: '1',
    debtor_name: 'ABC Sp. z o.o.',
    amount: 15000,
    issue_date: '2025-11-15',
    due_date: '2025-12-01',
    description: 'Usługi konsultingowe - listopad 2025',
    sequence_id: '2',
};

const mockSequences = [
    { id: '1', name: 'Łagodna' },
    { id: '2', name: 'Standardowa' },
    { id: '3', name: 'Szybka eskalacja' },
];

export default function EditInvoicePage() {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);
    const [selectedSequence, setSelectedSequence] = useState(mockInvoice.sequence_id);

    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm<InvoiceFormData>({
        resolver: zodResolver(invoiceSchema),
        defaultValues: {
            invoice_number: mockInvoice.invoice_number,
            amount: mockInvoice.amount,
            issue_date: mockInvoice.issue_date,
            due_date: mockInvoice.due_date,
            description: mockInvoice.description,
        },
    });

    const onSubmit = async (data: InvoiceFormData) => {
        setIsLoading(true);
        await new Promise((resolve) => setTimeout(resolve, 1000));
        console.log('Updated invoice:', { ...data, sequence_id: selectedSequence });
        toast.success('Faktura została zaktualizowana!');
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
                    <h1 className="text-3xl font-bold">Edytuj fakturę</h1>
                    <p className="text-muted-foreground mt-1">{mockInvoice.invoice_number}</p>
                </div>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                <Card>
                    <CardHeader>
                        <CardTitle>Dane faktury</CardTitle>
                        <CardDescription>Kontrahent: {mockInvoice.debtor_name}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="invoice_number">Numer faktury *</Label>
                                <Input id="invoice_number" {...register('invoice_number')} />
                                {errors.invoice_number && (
                                    <p className="text-sm text-red-600">{errors.invoice_number.message}</p>
                                )}
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="amount">Kwota brutto (PLN) *</Label>
                                <Input
                                    id="amount"
                                    type="number"
                                    step="0.01"
                                    {...register('amount', { valueAsNumber: true })}
                                />
                                {errors.amount && (
                                    <p className="text-sm text-red-600">{errors.amount.message}</p>
                                )}
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="issue_date">Data wystawienia *</Label>
                                <Input id="issue_date" type="date" {...register('issue_date')} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="due_date">Termin płatności *</Label>
                                <Input id="due_date" type="date" {...register('due_date')} />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="sequence">Sekwencja windykacyjna</Label>
                            <Select value={selectedSequence} onValueChange={setSelectedSequence}>
                                <SelectTrigger id="sequence">
                                    <SelectValue placeholder="Wybierz sekwencję" />
                                </SelectTrigger>
                                <SelectContent>
                                    {mockSequences.map((seq) => (
                                        <SelectItem key={seq.id} value={seq.id}>
                                            {seq.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="description">Opis</Label>
                            <Textarea id="description" rows={3} {...register('description')} />
                        </div>
                    </CardContent>
                </Card>

                <div className="flex gap-4">
                    <Link href={`/invoices/${mockInvoice.id}`}>
                        <Button type="button" variant="outline">Anuluj</Button>
                    </Link>
                    <Button type="submit" disabled={isLoading}>
                        {isLoading ? (
                            <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Zapisywanie...</>
                        ) : (
                            'Zapisz zmiany'
                        )}
                    </Button>
                </div>
            </form>
        </div>
    );
}
