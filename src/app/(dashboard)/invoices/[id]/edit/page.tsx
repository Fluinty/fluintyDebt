'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
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
import { createClient } from '@/lib/supabase/client';

const invoiceSchema = z.object({
    invoice_number: z.string().min(1, 'Numer faktury jest wymagany'),
    amount: z.number().min(0.01, 'Kwota musi być większa niż 0'),
    issue_date: z.string().min(1, 'Data wystawienia jest wymagana'),
    due_date: z.string().min(1, 'Termin płatności jest wymagany'),
    description: z.string().optional(),
    auto_send_enabled: z.boolean().optional(),
    send_time: z.string().optional(),
});

type InvoiceFormData = z.infer<typeof invoiceSchema>;

interface Sequence {
    id: string;
    name: string;
}

export default function EditInvoicePage() {
    const router = useRouter();
    const params = useParams();
    const invoiceId = params.id as string;

    const [isLoading, setIsLoading] = useState(false);
    const [isDataLoading, setIsDataLoading] = useState(true);
    const [selectedSequence, setSelectedSequence] = useState<string | null>(null);
    const [sequences, setSequences] = useState<Sequence[]>([]);
    const [invoice, setInvoice] = useState<any>(null);

    const {
        register,
        handleSubmit,
        setValue,
        reset,
        formState: { errors },
    } = useForm<InvoiceFormData>({
        resolver: zodResolver(invoiceSchema),
    });

    // Load invoice and sequences
    useEffect(() => {
        async function loadData() {
            const supabase = createClient();

            const [invoiceResult, sequencesResult] = await Promise.all([
                supabase
                    .from('invoices')
                    .select('*, debtors(name)')
                    .eq('id', invoiceId)
                    .single(),
                supabase
                    .from('sequences')
                    .select('id, name')
                    .order('name'),
            ]);

            if (invoiceResult.data) {
                const inv = invoiceResult.data;
                setInvoice(inv);
                setSelectedSequence(inv.sequence_id);
                reset({
                    invoice_number: inv.invoice_number,
                    amount: Number(inv.amount_gross || inv.amount),
                    issue_date: inv.issue_date,
                    due_date: inv.due_date,
                    description: inv.description || '',
                    auto_send_enabled: inv.auto_send_enabled ?? true,
                    send_time: inv.send_time || '10:00',
                });
            }

            if (sequencesResult.data) {
                setSequences(sequencesResult.data);
            }

            setIsDataLoading(false);
        }
        loadData();
    }, [invoiceId, reset]);

    const onSubmit = async (data: InvoiceFormData) => {
        setIsLoading(true);

        try {
            const supabase = createClient();

            const { error } = await supabase
                .from('invoices')
                .update({
                    invoice_number: data.invoice_number,
                    amount: data.amount,
                    amount_gross: data.amount,
                    issue_date: data.issue_date,
                    due_date: data.due_date,
                    description: data.description || null,
                    sequence_id: selectedSequence,
                    auto_send_enabled: data.auto_send_enabled ?? true,
                    send_time: data.send_time || '10:00',
                })
                .eq('id', invoiceId);

            if (error) {
                toast.error('Błąd: ' + error.message);
                return;
            }

            toast.success('Faktura została zaktualizowana!');
            router.push(`/invoices/${invoiceId}`);
            router.refresh();
        } catch (err) {
            console.error('Error:', err);
            toast.error('Wystąpił nieoczekiwany błąd');
        } finally {
            setIsLoading(false);
        }
    };

    if (isDataLoading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    if (!invoice) {
        return (
            <div className="text-center py-12">
                <p className="text-muted-foreground">Nie znaleziono faktury</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <Breadcrumbs />

            <div className="flex items-center gap-4">
                <Link href={`/invoices/${invoiceId}`}>
                    <Button variant="ghost" size="icon">
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                </Link>
                <div>
                    <h1 className="text-3xl font-bold">Edytuj fakturę</h1>
                    <p className="text-muted-foreground mt-1">{invoice.invoice_number}</p>
                </div>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2 space-y-6">
                        <Card>
                            <CardHeader>
                                <CardTitle>Dane faktury</CardTitle>
                                <CardDescription>Kontrahent: {invoice.debtors?.name || 'Nieznany'}</CardDescription>
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
                                    <Select value={selectedSequence || undefined} onValueChange={setSelectedSequence}>
                                        <SelectTrigger id="sequence">
                                            <SelectValue placeholder="Wybierz sekwencję" />
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

                                <div className="space-y-2">
                                    <Label htmlFor="description">Opis</Label>
                                    <Textarea id="description" rows={3} {...register('description')} />
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Sidebar with auto-send settings */}
                    <div className="space-y-6">
                        <Card>
                            <CardHeader>
                                <CardTitle>Automatyczne wysyłanie</CardTitle>
                                <CardDescription>
                                    Ustawienia automatycznego wysyłania wiadomości
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <div className="space-y-0.5">
                                        <Label htmlFor="auto_send_enabled">Wysyłaj automatycznie</Label>
                                        <p className="text-xs text-muted-foreground">
                                            Wiadomości będą wysyłane wg harmonogramu
                                        </p>
                                    </div>
                                    <input
                                        type="checkbox"
                                        id="auto_send_enabled"
                                        className="h-5 w-5 rounded border-gray-300 text-primary focus:ring-primary"
                                        {...register('auto_send_enabled')}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="send_time">Godzina wysyłki</Label>
                                    <Input
                                        id="send_time"
                                        type="time"
                                        {...register('send_time')}
                                    />
                                    <p className="text-xs text-muted-foreground">
                                        O tej godzinie będą wysyłane wiadomości.
                                    </p>
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardContent className="pt-6">
                                <div className="flex flex-col gap-3">
                                    <Button type="submit" className="w-full" disabled={isLoading}>
                                        {isLoading ? (
                                            <>
                                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                                Zapisywanie...
                                            </>
                                        ) : (
                                            'Zapisz zmiany'
                                        )}
                                    </Button>
                                    <Link href={`/invoices/${invoiceId}`} className="w-full">
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
