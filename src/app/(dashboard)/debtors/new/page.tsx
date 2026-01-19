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
import { Breadcrumbs } from '@/components/shared/breadcrumbs';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';

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
});

type DebtorFormData = z.infer<typeof debtorSchema>;

export default function NewDebtorPage() {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);

    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm<DebtorFormData>({
        resolver: zodResolver(debtorSchema),
    });

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
                                        <Input
                                            id="nip"
                                            placeholder="np. 1234567890"
                                            {...register('nip')}
                                        />
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
