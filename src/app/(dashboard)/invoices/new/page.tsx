'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, useWatch } from 'react-hook-form';
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
import { VAT_RATES, calculateVat } from '@/constants/vat-rates';
import { formatCurrency } from '@/lib/utils/format-currency';

const invoiceSchema = z.object({
    invoice_number: z.string().min(1, 'Numer faktury jest wymagany'),
    debtor_id: z.string().min(1, 'Wybierz kontrahenta'),
    amount_net: z.string().min(1, 'Kwota netto jest wymagana'),
    vat_rate: z.string().min(1, 'Wybierz stawkę VAT'),
    issue_date: z.string().min(1, 'Data wystawienia jest wymagana'),
    due_date: z.string().min(1, 'Termin płatności jest wymagany'),
    description: z.string().optional(),
    sequence_id: z.string().optional(),
    auto_send_enabled: z.boolean().optional(),
    send_time: z.string().optional(),
});

type InvoiceFormData = z.infer<typeof invoiceSchema>;

interface Debtor {
    id: string;
    name: string;
    default_sequence_id: string | null;
    auto_send_enabled: boolean;
    preferred_send_time: string;
    preferred_channel: string;
}

interface Sequence {
    id: string;
    name: string;
    description: string | null;
    is_default?: boolean;
}

// Component for live VAT calculation display
function VatSummary({ control }: { control: any }) {
    const amountNet = useWatch({ control, name: 'amount_net' });
    const vatRate = useWatch({ control, name: 'vat_rate' });

    const { vatAmount, grossAmount } = useMemo(() => {
        const net = parseFloat(amountNet) || 0;
        return calculateVat(net, vatRate || '23');
    }, [amountNet, vatRate]);

    return (
        <div className="space-y-1 pt-2">
            <p className="text-2xl font-bold text-primary">{formatCurrency(grossAmount)}</p>
            <p className="text-xs text-muted-foreground">
                VAT: {formatCurrency(vatAmount)}
            </p>
        </div>
    );
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
        watch,
        control,
        formState: { errors },
    } = useForm<InvoiceFormData>({
        resolver: zodResolver(invoiceSchema),
        defaultValues: {
            vat_rate: '23',
            auto_send_enabled: false,
            send_time: '10:00',
        },
    });

    // Load debtors and sequences from database
    useEffect(() => {
        async function loadData() {
            const supabase = createClient();

            const { data: debtorsData } = await supabase
                .from('debtors')
                .select('id, name, default_sequence_id, auto_send_enabled, preferred_send_time, preferred_channel')
                .order('name');

            const { data: sequencesData } = await supabase
                .from('sequences')
                .select('id, name, description, is_default')
                .order('is_default', { ascending: false })
                .order('name');

            if (debtorsData) setDebtors(debtorsData);
            if (sequencesData) setSequences(sequencesData);
        }
        loadData();
    }, []);

    const onSubmit = async (data: InvoiceFormData) => {
        setIsLoading(true);

        try {
            const netAmount = parseFloat(data.amount_net);
            const { vatAmount, grossAmount } = calculateVat(netAmount, data.vat_rate);

            const result = await createInvoiceWithSchedule({
                debtor_id: data.debtor_id,
                invoice_number: data.invoice_number,
                amount: grossAmount, // For backwards compatibility
                amount_net: netAmount,
                vat_rate: data.vat_rate,
                vat_amount: vatAmount,
                amount_gross: grossAmount,
                issue_date: data.issue_date,
                due_date: data.due_date,
                description: data.description,
                sequence_id: data.sequence_id,
                auto_send_enabled: data.auto_send_enabled ?? true,
                send_time: data.send_time || '10:00',
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
                                </div>

                                {/* VAT Section */}
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-muted/50 rounded-lg">
                                    <div className="space-y-2">
                                        <Label htmlFor="amount_net">Kwota netto (PLN) *</Label>
                                        <Input
                                            id="amount_net"
                                            type="number"
                                            step="0.01"
                                            placeholder="0.00"
                                            {...register('amount_net')}
                                        />
                                        {errors.amount_net && (
                                            <p className="text-sm text-red-600">{errors.amount_net.message}</p>
                                        )}
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="vat_rate">Stawka VAT *</Label>
                                        <Select onValueChange={(value) => setValue('vat_rate', value)} defaultValue="23">
                                            <SelectTrigger>
                                                <SelectValue placeholder="Wybierz stawkę VAT" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {VAT_RATES.map((rate) => (
                                                    <SelectItem key={rate.value} value={rate.value}>
                                                        {rate.label}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        {errors.vat_rate && (
                                            <p className="text-sm text-red-600">{errors.vat_rate.message}</p>
                                        )}
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Kwota brutto</Label>
                                        <VatSummary control={control} />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="debtor_id">Kontrahent *</Label>
                                    <Select onValueChange={(value) => {
                                        setValue('debtor_id', value);
                                        // Inherit default settings from debtor
                                        const selectedDebtor = debtors.find(d => d.id === value);
                                        if (selectedDebtor) {
                                            // Use debtor's sequence, or fall back to system default
                                            if (selectedDebtor.default_sequence_id) {
                                                setValue('sequence_id', selectedDebtor.default_sequence_id);
                                            } else {
                                                // Fallback to system default sequence
                                                const systemDefault = sequences.find(s => s.is_default);
                                                if (systemDefault) {
                                                    setValue('sequence_id', systemDefault.id);
                                                }
                                            }
                                            setValue('auto_send_enabled', selectedDebtor.auto_send_enabled ?? true);
                                            setValue('send_time', selectedDebtor.preferred_send_time || '10:00');
                                        }
                                    }}>
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
                                <Select
                                    value={watch('sequence_id') || ''}
                                    onValueChange={(value) => setValue('sequence_id', value)}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Wybierz sekwencję (opcjonalnie)" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {sequences.map((seq) => (
                                            <SelectItem key={seq.id} value={seq.id}>
                                                {seq.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <p className="text-xs text-muted-foreground">
                                    Sekwencja określa kiedy i jak często będą wysyłane przypomnienia o płatności.
                                </p>
                            </CardContent>
                        </Card>

                        {/* Auto-send settings */}
                        <Card>
                            <CardHeader>
                                <CardTitle>Automatyczne wysyłanie</CardTitle>
                                <CardDescription>
                                    Ustaw automatyczne wysyłanie wiadomości
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <div className="space-y-0.5">
                                        <Label htmlFor="auto_send_enabled">Wysyłaj automatycznie</Label>
                                        <p className="text-xs text-muted-foreground">
                                            Wiadomości będą wysyłane automatycznie wg harmonogramu
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
                                    <div className="flex items-center gap-2">
                                        <span className="text-sm font-medium">10:00</span>
                                        <span className="text-xs bg-muted px-2 py-0.5 rounded text-muted-foreground">Coming soon</span>
                                    </div>
                                    <p className="text-xs text-muted-foreground">
                                        Wiadomości będą wysyłane o 10:00. Zmiana godziny - wkrótce.
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
