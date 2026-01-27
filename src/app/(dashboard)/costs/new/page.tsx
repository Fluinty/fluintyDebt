'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowLeft, Loader2, CalendarIcon, Plus } from 'lucide-react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';

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
import { createCostInvoice } from '@/app/actions/cost-actions';
import type { Vendor } from '@/types/database';

const createCostSchema = z.object({
    invoice_number: z.string().min(1, 'Numer faktury jest wymagany'),
    vendor_id: z.string().optional().nullable(),
    contractor_name: z.string().min(1, 'Nazwa dostawcy jest wymagana'),
    contractor_nip: z.string().optional().nullable(),
    amount_net: z.string().min(1, 'Kwota netto jest wymagana'),
    vat_rate: z.string().default('23'),
    amount: z.string().min(1, 'Kwota brutto jest wymagana'), // acts as amount_gross
    currency: z.string().default('PLN'),
    issue_date: z.string().min(1, 'Data wystawienia jest wymagana'),
    due_date: z.string().min(1, 'Termin płatności jest wymagany'),
    account_number: z.string().optional().nullable(),
    bank_name: z.string().optional().nullable(),
    description: z.string().optional().nullable(),
    category: z.string().default('other'),
    payment_status: z.enum(['to_pay', 'paid']),
});

type CreateCostForm = z.infer<typeof createCostSchema>;

export default function NewCostPage() {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);
    const [vendors, setVendors] = useState<Vendor[]>([]);
    const [selectedVendorId, setSelectedVendorId] = useState<string | null>(null);

    const {
        register,
        handleSubmit,
        setValue,
        watch,
        formState: { errors },
    } = useForm({
        resolver: zodResolver(createCostSchema),
        defaultValues: {
            invoice_number: '',
            vendor_id: null,
            contractor_name: '',
            contractor_nip: '',
            amount_net: '',
            vat_rate: '23',
            amount: '',
            issue_date: new Date().toISOString().split('T')[0],
            due_date: '',
            account_number: '',
            bank_name: '',
            description: '',
            currency: 'PLN',
            category: 'other',
            payment_status: 'to_pay' as const,
        },
    });

    const amountNet = watch('amount_net');
    const vatRate = watch('vat_rate');

    // Calculate Gross automatically
    useEffect(() => {
        const net = parseFloat(amountNet || '0');
        const rate = parseFloat(vatRate || '0');
        if (!isNaN(net) && !isNaN(rate)) {
            const gross = net * (1 + rate / 100);
            setValue('amount', gross.toFixed(2));
        } else if (vatRate === 'zw') {
            setValue('amount', net.toFixed(2));
        } else {
            setValue('amount', '');
        }
    }, [amountNet, vatRate, setValue]);

    // Load vendors
    useEffect(() => {
        async function loadVendors() {
            const supabase = createClient();
            const { data } = await supabase
                .from('vendors')
                .select('*')
                .order('name');

            if (data) setVendors(data);
        }
        loadVendors();
    }, []);

    const onSubmit = async (data: CreateCostForm) => {
        setIsLoading(true);

        try {
            const net = parseFloat(data.amount_net);
            const rate = parseFloat(data.vat_rate);
            const gross = parseFloat(data.amount);
            const vatAmount = (data.vat_rate === 'zw' || isNaN(net) || isNaN(rate)) ? 0 : gross - net;

            const result = await createCostInvoice({
                ...data,
                amount: gross,
                vendor_id: data.vendor_id || null, // ensure generic string | null
                amount_net: net,
                vat_rate: data.vat_rate,
                vat_amount: parseFloat(vatAmount.toFixed(2)),
                amount_gross: gross,
                contractor_nip: data.contractor_nip || null,
                account_number: data.account_number || null,
                bank_name: data.bank_name || null,
                description: data.description || null,
            });

            if (result.error) {
                toast.error(result.error);
                return;
            }

            toast.success('Faktura kosztowa została dodana!');
            router.push('/costs');
            router.refresh();
        } catch (err) {
            console.error('Error:', err);
            toast.error('Wystąpił nieoczekiwany błąd');
        } finally {
            setIsLoading(false);
        }
    };

    // Handle vendor selection
    const handleVendorChange = (vendorId: string) => {
        if (vendorId === 'manual') {
            setSelectedVendorId(null);
            setValue('vendor_id', null);
            setValue('contractor_name', '', { shouldValidate: true });
            setValue('contractor_nip', '', { shouldValidate: true });
            setValue('account_number', '', { shouldValidate: false });
            setValue('bank_name', '', { shouldValidate: false });
            return;
        }

        setSelectedVendorId(vendorId);
        setValue('vendor_id', vendorId);
        const vendor = vendors.find(v => v.id === vendorId);
        if (vendor) {
            setValue('contractor_name', vendor.name, { shouldValidate: true });
            setValue('contractor_nip', vendor.nip || '', { shouldValidate: true });
            if (vendor.bank_account_number) {
                setValue('account_number', vendor.bank_account_number, { shouldValidate: true });
            }
            if (vendor.bank_name) {
                setValue('bank_name', vendor.bank_name);
            }
        }
    };

    // Get today's date in YYYY-MM-DD format
    const today = new Date().toISOString().split('T')[0];

    return (
        <div className="space-y-6">
            <Breadcrumbs />

            {/* Header */}
            <div className="flex items-center gap-4">
                <Link href="/costs">
                    <Button variant="ghost" size="icon">
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                </Link>
                <div>
                    <h1 className="text-3xl font-bold">Nowy wydatek</h1>
                    <p className="text-muted-foreground mt-1">
                        Dodaj ręcznie fakturę kosztową
                    </p>
                </div>
            </div>

            <form onSubmit={handleSubmit(onSubmit)}>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Main Content */}
                    <div className="lg:col-span-2 space-y-6">
                        <Card>
                            <CardHeader>
                                <CardTitle>Dane faktury</CardTitle>
                                <CardDescription>
                                    Wprowadź informacje o zobowiązaniu
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
                                    {/* Calculated Gross Amount (Read-only) */}
                                    <div className="space-y-2">
                                        <Label htmlFor="amount">Kwota Brutto (Suma)</Label>
                                        <div className="flex gap-2">
                                            <Input
                                                id="amount"
                                                readOnly
                                                className="bg-muted"
                                                {...register('amount')}
                                            />
                                            <div className="w-20 flex items-center justify-center border rounded-md bg-muted text-sm font-medium text-muted-foreground">
                                                PLN
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="amount_net">Kwota Netto *</Label>
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
                                        <Label htmlFor="vat_rate">Stawka VAT</Label>
                                        <Select
                                            defaultValue="23"
                                            onValueChange={(val) => setValue('vat_rate', val)}
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder="23%" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="23">23%</SelectItem>
                                                <SelectItem value="8">8%</SelectItem>
                                                <SelectItem value="5">5%</SelectItem>
                                                <SelectItem value="0">0%</SelectItem>
                                                <SelectItem value="zw">Zw</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <input type="hidden" {...register('vat_rate')} />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label>Dostawca</Label>
                                    <Select
                                        value={selectedVendorId || (selectedVendorId === null ? 'manual' : undefined)}
                                        onValueChange={handleVendorChange}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Wybierz dostawcę..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="manual">
                                                -- Wpisz ręcznie / Jednorazowy --
                                            </SelectItem>
                                            {vendors.map((vendor) => (
                                                <SelectItem key={vendor.id} value={vendor.id}>
                                                    {vendor.name} {vendor.nip ? `(NIP: ${vendor.nip})` : ''}
                                                </SelectItem>
                                            ))}
                                            <div className="p-2 border-t mt-2">
                                                <Link href="/vendors/new" target="_blank" className="flex items-center gap-2 text-sm text-primary hover:underline justify-center">
                                                    <Plus className="h-4 w-4" /> Dodaj nowego dostawcę
                                                </Link>
                                            </div>
                                        </SelectContent>
                                    </Select>

                                    {/* Hidden fields actually submitted */}
                                    <input type="hidden" {...register('contractor_name')} />
                                    <input type="hidden" {...register('contractor_nip')} />

                                    {/* Fallback/Manual inputs if no vendor selected or editing */}
                                    {!selectedVendorId && (
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2 p-4 bg-muted/30 rounded-lg">
                                            <div className="space-y-2">
                                                <Label htmlFor="contractor_name_manual">Nazwa dostawcy (ręcznie) *</Label>
                                                <Input
                                                    id="contractor_name_manual"
                                                    placeholder="Wpisz nazwę"
                                                    {...register('contractor_name')}
                                                />
                                                {errors.contractor_name && (
                                                    <p className="text-sm text-red-600">{errors.contractor_name.message}</p>
                                                )}
                                            </div>
                                            <div className="space-y-2">
                                                <Label htmlFor="contractor_nip_manual">NIP (ręcznie)</Label>
                                                <Input
                                                    id="contractor_nip_manual"
                                                    placeholder="1234567890"
                                                    {...register('contractor_nip')}
                                                />
                                            </div>
                                        </div>
                                    )}
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
                                    <Label htmlFor="account_number">Numer konta (do przelewu)</Label>
                                    <Input
                                        id="account_number"
                                        placeholder="XX XXXX XXXX XXXX XXXX XXXX XXXX"
                                        {...register('account_number')}
                                    />
                                    <p className="text-xs text-muted-foreground">
                                        Wymagany do generowania kodów QR
                                    </p>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="description">Opis (opcjonalnie)</Label>
                                    <Textarea
                                        id="description"
                                        placeholder="Dodatkowe informacje..."
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
                                <CardTitle>Status i Kategoria</CardTitle>
                                <CardDescription>
                                    Ustawienia dodatkowe
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="payment_status">Status płatności</Label>
                                    <Select onValueChange={(val) => setValue('payment_status', val as any)} defaultValue="to_pay">
                                        <SelectTrigger>
                                            <SelectValue placeholder="Wybierz status" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="to_pay">Do zapłaty</SelectItem>
                                            <SelectItem value="paid">Opłacona</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="category">Kategoria</Label>
                                    <Select onValueChange={(val) => setValue('category', val as any)} defaultValue="other">
                                        <SelectTrigger>
                                            <SelectValue placeholder="Wybierz kategorię" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="office">Biuro</SelectItem>
                                            <SelectItem value="services">Usługi</SelectItem>
                                            <SelectItem value="software">Oprogramowanie</SelectItem>
                                            <SelectItem value="transport">Transport</SelectItem>
                                            <SelectItem value="taxes">Podatki</SelectItem>
                                            <SelectItem value="other">Inne</SelectItem>
                                        </SelectContent>
                                    </Select>
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
                                            'Zapisz wydatek'
                                        )}
                                    </Button>
                                    <Link href="/costs" className="w-full">
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
