'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowLeft, Loader2, Search } from 'lucide-react';

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
import { fetchCompanyByNip } from '@/app/actions/gus-actions';

const debtorSchema = z.object({
    name: z.string().min(2, 'Nazwa firmy jest wymagana'),
    nip: z.string().optional(),
    email: z.string().email('Wprowadź poprawny adres email').optional().or(z.literal('')),
    phone: z.string().optional(),
    address: z.string().optional(),
    city: z.string().optional(),
    postal_code: z.string().optional(),
    contact_person: z.string().optional(),
    notes: z.string().optional(),
    default_sequence_id: z.string().optional(),
    auto_send_enabled: z.boolean().optional(),
    preferred_send_time: z.string().optional(),
    preferred_channel: z.string().optional(),
    preferred_language: z.enum(['pl', 'en']).optional(),
});

type DebtorFormData = z.infer<typeof debtorSchema>;

interface Sequence {
    id: string;
    name: string;
    description: string | null;
}

export default function NewDebtorPage() {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);
    const [isLoadingGus, setIsLoadingGus] = useState(false);
    const [sequences, setSequences] = useState<Sequence[]>([]);

    // Load sequences
    useEffect(() => {
        async function loadSequences() {
            const supabase = createClient();
            const { data } = await supabase
                .from('sequences')
                .select('id, name, description')
                .order('name');
            if (data) setSequences(data);
        }
        loadSequences();
    }, []);

    const {
        register,
        handleSubmit,
        setValue,
        watch,
        formState: { errors },
    } = useForm<DebtorFormData>({
        resolver: zodResolver(debtorSchema),
        defaultValues: {
            auto_send_enabled: true,
            preferred_send_time: '10:00',
            preferred_channel: 'email',
            preferred_language: 'pl',
        },
    });

    const nipValue = watch('nip');

    const handleGusLookup = async () => {
        if (!nipValue || nipValue.trim().length === 0) {
            toast.error('Wprowadź numer NIP');
            return;
        }

        setIsLoadingGus(true);
        try {
            const result = await fetchCompanyByNip(nipValue);

            if (result.success && result.data) {
                setValue('name', result.data.name);
                setValue('address', result.data.address);
                setValue('city', result.data.city);
                setValue('postal_code', result.data.postal_code);
                toast.success('Dane pobrane z GUS');
            } else {
                toast.error(result.error || 'Nie znaleziono danych');
            }
        } catch (error) {
            toast.error('Błąd połączenia z GUS');
        } finally {
            setIsLoadingGus(false);
        }
    };

    const onSubmit = async (data: DebtorFormData) => {
        setIsLoading(true);

        try {
            const supabase = createClient();

            // Get current user
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                toast.error('Musisz być zalogowany');
                return;
            }

            // Insert debtor into database
            const { error } = await supabase.from('debtors').insert({
                user_id: user.id,
                name: data.name,
                nip: data.nip || null,
                email: data.email || null,
                phone: data.phone || null,
                address: data.address || null,
                city: data.city || null,
                postal_code: data.postal_code || null,
                contact_person: data.contact_person || null,
                notes: data.notes || null,
                default_sequence_id: data.default_sequence_id || null,
                auto_send_enabled: data.auto_send_enabled ?? true,
                preferred_send_time: data.preferred_send_time || '10:00',
                preferred_channel: data.preferred_channel || 'email',
                preferred_language: data.preferred_language || 'pl',
            });

            if (error) {
                console.error('Error inserting debtor:', error);
                toast.error('Błąd: ' + error.message);
                return;
            }

            toast.success('Kontrahent został dodany!');
            router.push('/debtors');
            router.refresh();
        } catch (err) {
            console.error('Error:', err);
            toast.error('Wystąpił nieoczekiwany błąd');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            <Breadcrumbs />

            {/* Header */}
            <div className="flex items-center gap-4">
                <Link href="/debtors">
                    <Button variant="ghost" size="icon">
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                </Link>
                <div>
                    <h1 className="text-3xl font-bold">Nowy kontrahent</h1>
                    <p className="text-muted-foreground mt-1">
                        Dodaj nowego kontrahenta do systemu
                    </p>
                </div>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Main form */}
                    <div className="lg:col-span-2 space-y-6">
                        <Card>
                            <CardHeader>
                                <CardTitle>Dane podstawowe</CardTitle>
                                <CardDescription>Informacje o firmie</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="name">Nazwa firmy *</Label>
                                        <Input
                                            id="name"
                                            placeholder="np. ABC Sp. z o.o."
                                            {...register('name')}
                                        />
                                        {errors.name && (
                                            <p className="text-sm text-red-600">{errors.name.message}</p>
                                        )}
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="nip">NIP</Label>
                                        <div className="flex gap-2">
                                            <Input
                                                id="nip"
                                                placeholder="np. 1234567890"
                                                {...register('nip')}
                                            />
                                            <Button
                                                type="button"
                                                variant="outline"
                                                onClick={handleGusLookup}
                                                disabled={isLoadingGus}
                                                className="shrink-0"
                                            >
                                                {isLoadingGus ? (
                                                    <Loader2 className="h-4 w-4 animate-spin" />
                                                ) : (
                                                    <Search className="h-4 w-4" />
                                                )}
                                                <span className="ml-2 hidden sm:inline">Pobierz z GUS</span>
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle>Dane kontaktowe</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="email">Email</Label>
                                        <Input
                                            id="email"
                                            type="email"
                                            placeholder="kontakt@firma.pl"
                                            {...register('email')}
                                        />
                                        {errors.email && (
                                            <p className="text-sm text-red-600">{errors.email.message}</p>
                                        )}
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="phone">Telefon</Label>
                                        <Input
                                            id="phone"
                                            placeholder="+48 123 456 789"
                                            {...register('phone')}
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="contact_person">Osoba kontaktowa</Label>
                                    <Input
                                        id="contact_person"
                                        placeholder="np. Jan Kowalski"
                                        {...register('contact_person')}
                                    />
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle>Adres</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="address">Ulica i numer</Label>
                                    <Input
                                        id="address"
                                        placeholder="ul. Przykładowa 123"
                                        {...register('address')}
                                    />
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="postal_code">Kod pocztowy</Label>
                                        <Input
                                            id="postal_code"
                                            placeholder="00-000"
                                            {...register('postal_code')}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="city">Miasto</Label>
                                        <Input
                                            id="city"
                                            placeholder="Warszawa"
                                            {...register('city')}
                                        />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle>Notatki</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <Textarea
                                    placeholder="Dodatkowe informacje o kontrahencie..."
                                    rows={4}
                                    {...register('notes')}
                                />
                            </CardContent>
                        </Card>
                    </div>

                    {/* Sidebar */}
                    <div className="space-y-6">
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
                                            'Dodaj kontrahenta'
                                        )}
                                    </Button>
                                    <Link href="/debtors" className="w-full">
                                        <Button type="button" variant="outline" className="w-full">
                                            Anuluj
                                        </Button>
                                    </Link>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Auto-send defaults */}
                        <Card>
                            <CardHeader>
                                <CardTitle>Ustawienia domyślne</CardTitle>
                                <CardDescription>
                                    Domyślne ustawienia dla nowych faktur
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <div className="space-y-0.5">
                                        <Label htmlFor="auto_send_enabled">Automatyczne wysyłanie</Label>
                                        <p className="text-xs text-muted-foreground">
                                            Domyślnie włącz auto-wysyłanie dla faktur
                                        </p>
                                    </div>
                                    <input
                                        type="checkbox"
                                        id="auto_send_enabled"
                                        defaultChecked
                                        className="h-5 w-5 rounded border-gray-300 text-primary focus:ring-primary"
                                        {...register('auto_send_enabled')}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="preferred_send_time">Preferowana godzina wysyłki</Label>
                                    <Input
                                        id="preferred_send_time"
                                        type="time"
                                        {...register('preferred_send_time')}
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="preferred_language">Język komunikacji</Label>
                                    <select
                                        id="preferred_language"
                                        className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                                        {...register('preferred_language')}
                                    >
                                        <option value="pl">🇵🇱 Polski</option>
                                        <option value="en">🇬🇧 English</option>
                                    </select>
                                    <p className="text-xs text-muted-foreground">
                                        Wiadomości będą wysyłane w wybranym języku
                                    </p>
                                </div>

                                {/* Default sequence selection */}
                                <div className="space-y-2 pt-4 border-t">
                                    <Label>Domyślna sekwencja windykacyjna</Label>
                                    <Select onValueChange={(value) => setValue('default_sequence_id', value)}>
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
                                        Ta sekwencja będzie automatycznie przypisywana do nowych faktur.
                                    </p>
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="bg-muted/50">
                            <CardContent className="pt-6">
                                <p className="text-sm text-muted-foreground">
                                    💡 Po dodaniu kontrahenta będziesz mógł przypisywać do niego faktury
                                    i śledzić historię płatności.
                                </p>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </form>
        </div>
    );
}
