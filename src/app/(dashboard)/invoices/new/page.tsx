'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowLeft, Loader2, CalendarIcon } from 'lucide-react';
import Link from 'next/link';

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
import { createClient } from '@/lib/supabase/client';
import { createInvoiceWithSchedule } from '@/app/actions/invoice-actions';

const invoiceSchema = z.object({
    invoice_number: z.string().min(1, 'Numer faktury jest wymagany'),
    debtor_id: z.string().min(1, 'Wybierz kontrahenta'),
    amount: z.string().min(1, 'Kwota jest wymagana'),
    issue_date: z.string().min(1, 'Data wystawienia jest wymagana'),
    due_date: z.string().min(1, 'Termin płatności jest wymagany'),
    description: z.string().optional(),
    sequence_id: z.string().optional(),
});

type InvoiceFormData = z.infer<typeof invoiceSchema>;

interface Debtor {
    id: string;
    name: string;
}

interface Sequence {
    id: string;
    name: string;
    description: string | null;
}

export default function NewInvoicePage() {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);
    const [debtors, setDebtors] = useState<Debtor[]>([]);
    const [sequences, setSequences] = useState<Sequence[]>([]);

    const {
        register,
        handleSubmit,
        setValue,
        formState: { errors },
    } = useForm<InvoiceFormData>({
        resolver: zodResolver(invoiceSchema),
    });

    // Load debtors and sequences from database
    useEffect(() => {
        async function loadData() {
            const supabase = createClient();

            const { data: debtorsData } = await supabase
                .from('debtors')
                .select('id, name')
                .order('name');

            const { data: sequencesData } = await supabase
                .from('sequences')
                .select('id, name, description')
                .order('name');

            if (debtorsData) setDebtors(debtorsData);
            if (sequencesData) setSequences(sequencesData);
        }
        loadData();
    }, []);

    const onSubmit = async (data: InvoiceFormData) => {
        setIsLoading(true);

        try {
            const result = await createInvoiceWithSchedule({
                debtor_id: data.debtor_id,
                invoice_number: data.invoice_number,
                amount: parseFloat(data.amount),
                issue_date: data.issue_date,
                due_date: data.due_date,
                description: data.description,
                sequence_id: data.sequence_id,
            });

            if (result.error) {
                toast.error('Błąd: ' + result.error);
                return;
            }

            toast.success('Faktura została dodana!' + (data.sequence_id ? ' Harmonogram został wygenerowany.' : ''));
            router.refresh();
            router.push('/invoices');
        } catch (err) {
            console.error('Error:', err);
            toast.error('Wystąpił nieoczekiwany błąd');
        } finally {
            setIsLoading(false);
        }
    };

    // Get today's date in YYYY-MM-DD format
    const today = new Date().toISOString().split('T')[0];

    return (
        <div className="space-y-6">
            <Breadcrumbs />

            {/* Header */}
            <div className="flex items-center gap-4">
                <Link href="/invoices">
                    <Button variant="ghost" size="icon">
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                </Link>
                <div>
                    <h1 className="text-3xl font-bold">Nowa faktura</h1>
                    <p className="text-muted-foreground mt-1">
                        Dodaj nową należność do systemu
                    </p>
                </div>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Main form */}
                    <div className="lg:col-span-2 space-y-6">
                        <Card>
                            <CardHeader>
                                <CardTitle>Dane faktury</CardTitle>
                                <CardDescription>
                                    Wprowadź podstawowe informacje o fakturze
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="invoice_number">Numer faktury *</Label>
                                        <Input
                                            id="invoice_number"
                                            placeholder="np. FV/2026/001"
                                            {...register('invoice_number')}
                                        />
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
                                            placeholder="0.00"
                                            {...register('amount')}
                                        />
                                        {errors.amount && (
                                            <p className="text-sm text-red-600">{errors.amount.message}</p>
                                        )}
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="debtor_id">Kontrahent *</Label>
                                    <Select onValueChange={(value) => setValue('debtor_id', value)}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Wybierz kontrahenta" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {debtors.length === 0 ? (
                                                <SelectItem value="none" disabled>
                                                    Brak kontrahentów - dodaj najpierw
                                                </SelectItem>
                                            ) : (
                                                debtors.map((debtor) => (
                                                    <SelectItem key={debtor.id} value={debtor.id}>
                                                        {debtor.name}
                                                    </SelectItem>
                                                ))
                                            )}
                                        </SelectContent>
                                    </Select>
                                    {errors.debtor_id && (
                                        <p className="text-sm text-red-600">{errors.debtor_id.message}</p>
                                    )}
                                    <p className="text-xs text-muted-foreground">
                                        Nie ma kontrahenta? <Link href="/debtors/new" className="text-primary hover:underline">Dodaj nowego</Link>
                                    </p>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="issue_date">Data wystawienia *</Label>
                                        <div className="relative">
                                            <Input
                                                id="issue_date"
                                                type="date"
                                                defaultValue={today}
                                                {...register('issue_date')}
                                            />
                                            <CalendarIcon className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                                        </div>
                                        {errors.issue_date && (
                                            <p className="text-sm text-red-600">{errors.issue_date.message}</p>
                                        )}
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="due_date">Termin płatności *</Label>
                                        <div className="relative">
                                            <Input
                                                id="due_date"
                                                type="date"
                                                {...register('due_date')}
                                            />
                                            <CalendarIcon className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                                        </div>
                                        {errors.due_date && (
                                            <p className="text-sm text-red-600">{errors.due_date.message}</p>
                                        )}
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="description">Opis (opcjonalnie)</Label>
                                    <Textarea
                                        id="description"
                                        placeholder="Dodatkowe informacje o fakturze..."
                                        rows={3}
                                        {...register('description')}
                                    />
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Sidebar */}
                    <div className="space-y-6">
                        <Card>
                            <CardHeader>
                                <CardTitle>Sekwencja windykacyjna</CardTitle>
                                <CardDescription>
                                    Wybierz sekwencję przypomnień
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <Select onValueChange={(value) => setValue('sequence_id', value)}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Wybierz sekwencję (opcjonalnie)" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {sequences.map((seq) => (
                                            <SelectItem key={seq.id} value={seq.id}>
                                                <div>
                                                    <span className="font-medium">{seq.name}</span>
                                                    {seq.description && (
                                                        <span className="text-muted-foreground ml-2 text-xs">
                                                            {seq.description}
                                                        </span>
                                                    )}
                                                </div>
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <p className="text-xs text-muted-foreground">
                                    Sekwencja określa kiedy i jak często będą wysyłane przypomnienia o płatności.
                                </p>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardContent className="pt-6">
                                <div className="flex flex-col gap-3">
                                    <Button type="submit" className="w-full" disabled={isLoading}>
                                        {isLoading ? (
                                            <>
                                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                Zapisywanie...
                                            </>
                                        ) : (
                                            'Dodaj fakturę'
                                        )}
                                    </Button>
                                    <Link href="/invoices" className="w-full">
                                        <Button type="button" variant="outline" className="w-full">
                                            Anuluj
                                        </Button>
                                    </Link>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </form>
        </div>
    );
}
