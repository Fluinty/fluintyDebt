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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
    sms_voice_consent: z.boolean().optional(),
});

type DebtorFormData = z.infer<typeof debtorSchema>;

interface Sequence {
    id: string;
    name: string;
}

interface Debtor {
    id: string;
    name: string;
    nip: string | null;
    email: string | null;
    phone: string | null;
    address: string | null;
    city: string | null;
    postal_code: string | null;
    contact_person: string | null;
    default_sequence_id: string | null;
    preferred_language: 'pl' | 'en' | null;
    notes: string | null;
    sms_voice_consent_at: string | null;
}

export default function EditDebtorPage({ params }: { params: Promise<{ id: string }> }) {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);
    const [isDataLoading, setIsDataLoading] = useState(true);
    const [debtor, setDebtor] = useState<Debtor | null>(null);
    const [sequences, setSequences] = useState<Sequence[]>([]);
    const [selectedSequence, setSelectedSequence] = useState<string>('');
    const [selectedLanguage, setSelectedLanguage] = useState<string>('pl');
    const [isLoadingGus, setIsLoadingGus] = useState(false);
    const [debtorId, setDebtorId] = useState<string>('');

    const {
        register,
        handleSubmit,
        reset,
        setValue,
        watch,
        formState: { errors },
    } = useForm<DebtorFormData>({
        resolver: zodResolver(debtorSchema),
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

    useEffect(() => {
        async function loadData() {
            const { id } = await params;
            setDebtorId(id);

            const supabase = createClient();

            const { data: debtorData } = await supabase
                .from('debtors')
                .select('*')
                .eq('id', id)
                .single();

            const { data: sequencesData } = await supabase
                .from('sequences')
                .select('id, name')
                .order('name');

            if (debtorData) {
                setDebtor(debtorData);
                setSelectedSequence(debtorData.default_sequence_id || '');
                setSelectedLanguage(debtorData.preferred_language || 'pl');
                reset({
                    name: debtorData.name,
                    nip: debtorData.nip || '',
                    email: debtorData.email || '',
                    phone: debtorData.phone || '',
                    address: debtorData.address || '',
                    city: debtorData.city || '',
                    postal_code: debtorData.postal_code || '',
                    contact_person: debtorData.contact_person || '',
                    notes: debtorData.notes || '',
                    sms_voice_consent: !!debtorData.sms_voice_consent_at,
                });
            }
            if (sequencesData) setSequences(sequencesData);
            setIsDataLoading(false);
        }
        loadData();
    }, [params, reset]);

    const onSubmit = async (data: DebtorFormData) => {
        setIsLoading(true);

        try {
            const supabase = createClient();

            const { error } = await supabase
                .from('debtors')
                .update({
                    name: data.name,
                    nip: data.nip || null,
                    email: data.email || null,
                    phone: data.phone || null,
                    address: data.address || null,
                    city: data.city || null,
                    postal_code: data.postal_code || null,
                    contact_person: data.contact_person || null,
                    notes: data.notes || null,
                    default_sequence_id: selectedSequence || null,
                    preferred_language: selectedLanguage as 'pl' | 'en',
                    sms_voice_consent_at: data.sms_voice_consent ? new Date().toISOString() : null,
                })
                .eq('id', debtorId);

            if (error) {
                toast.error('Błąd: ' + error.message);
                return;
            }

            toast.success('Kontrahent został zaktualizowany!');
            router.push(`/debtors/${debtorId}`);
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
            <div className="flex items-center justify-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    if (!debtor) {
        return (
            <div className="text-center py-12">
                <p className="text-muted-foreground">Kontrahent nie został znaleziony</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <Breadcrumbs />

            <div className="flex items-center gap-4">
                <Link href={`/debtors/${debtorId}`}>
                    <Button variant="ghost" size="icon">
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                </Link>
                <div>
                    <h1 className="text-3xl font-bold">Edytuj kontrahenta</h1>
                    <p className="text-muted-foreground mt-1">{debtor.name}</p>
                </div>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                <Card>
                    <CardHeader>
                        <CardTitle>Dane podstawowe</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="name">Nazwa firmy *</Label>
                                <Input id="name" {...register('name')} />
                                {errors.name && (
                                    <p className="text-sm text-red-600">{errors.name.message}</p>
                                )}
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="nip">NIP</Label>
                                <div className="flex gap-2">
                                    <Input id="nip" {...register('nip')} />
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
                                <Input id="email" type="email" {...register('email')} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="phone">Telefon</Label>
                                <Input id="phone" {...register('phone')} />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="contact_person">Osoba kontaktowa</Label>
                            <Input id="contact_person" {...register('contact_person')} />
                        </div>
                        <div className="space-y-2 pt-2 border-t">
                            <div className="flex items-start space-x-2">
                                <input
                                    type="checkbox"
                                    id="sms_voice_consent"
                                    className="mt-1 h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                                    {...register('sms_voice_consent')}
                                />
                                <div className="grid gap-1.5 leading-none">
                                    <Label
                                        htmlFor="sms_voice_consent"
                                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                                    >
                                        Zgoda na kontakt SMS i głosowy
                                    </Label>
                                    <p className="text-sm text-muted-foreground">
                                        Potwierdzam, że posiadam zgodę na kontakt telefoniczny i SMS w celach windykacyjnych (zgodnie z RODO/UOKiK).
                                    </p>
                                </div>
                            </div>
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
                            <Input id="address" {...register('address')} />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="postal_code">Kod pocztowy</Label>
                                <Input id="postal_code" {...register('postal_code')} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="city">Miasto</Label>
                                <Input id="city" {...register('city')} />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Ustawienia</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label>Domyślna sekwencja</Label>
                            <Select value={selectedSequence} onValueChange={setSelectedSequence}>
                                <SelectTrigger>
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
                            <p className="text-xs text-muted-foreground">
                                Ta sekwencja będzie domyślnie przypisywana do nowych faktur tego kontrahenta
                            </p>
                        </div>
                        <div className="space-y-2">
                            <Label>Język komunikacji</Label>
                            <Select value={selectedLanguage} onValueChange={setSelectedLanguage}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Wybierz język" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="pl">🇵🇱 Polski</SelectItem>
                                    <SelectItem value="en">🇬🇧 English</SelectItem>
                                </SelectContent>
                            </Select>
                            <p className="text-xs text-muted-foreground">
                                Wiadomości będą wysyłane w wybranym języku
                            </p>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="notes">Notatki</Label>
                            <Textarea id="notes" rows={3} {...register('notes')} />
                        </div>
                    </CardContent>
                </Card>

                <div className="flex gap-4">
                    <Link href={`/debtors/${debtorId}`}>
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
