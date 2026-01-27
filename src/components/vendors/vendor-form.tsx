'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { toast } from 'sonner';
import { Loader2, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
    FormDescription,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Vendor } from '@/types/database';
import { createVendor, updateVendor } from '@/app/actions/vendor-actions';
import { fetchCompanyByNip } from '@/app/actions/gus-actions';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

const vendorSchema = z.object({
    name: z.string().min(1, 'Nazwa jest wymagana'),
    nip: z.string().optional().or(z.literal('')),
    email: z.string().email('Nieprawidłowy adres email').optional().or(z.literal('')),
    phone: z.string().optional().or(z.literal('')),
    website: z.string().url('Nieprawidłowy URL').optional().or(z.literal('')),

    address: z.string().optional().or(z.literal('')),
    city: z.string().optional().or(z.literal('')),
    postal_code: z.string().optional().or(z.literal('')),

    bank_account_number: z.string().optional().or(z.literal('')),
    bank_name: z.string().optional().or(z.literal('')),

    notes: z.string().optional().or(z.literal('')),
});

type VendorFormValues = z.infer<typeof vendorSchema>;

interface VendorFormProps {
    vendor?: Vendor;
}

export function VendorForm({ vendor }: VendorFormProps) {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);
    const [isLoadingGus, setIsLoadingGus] = useState(false);

    const form = useForm<VendorFormValues>({
        resolver: zodResolver(vendorSchema),
        defaultValues: {
            name: vendor?.name || '',
            nip: vendor?.nip || '',
            email: vendor?.email || '',
            phone: vendor?.phone || '',
            website: vendor?.website || '',
            address: vendor?.address || '',
            city: vendor?.city || '',
            postal_code: vendor?.postal_code || '',
            bank_account_number: vendor?.bank_account_number || '',
            bank_name: vendor?.bank_name || '',
            notes: vendor?.notes || '',
        },
    });

    const nipValue = form.watch('nip');

    async function handleGusLookup() {
        if (!nipValue || nipValue.trim().length === 0) {
            toast.error('Wprowadź numer NIP');
            return;
        }

        setIsLoadingGus(true);
        try {
            const result = await fetchCompanyByNip(nipValue);

            if (result.success && result.data) {
                form.setValue('name', result.data.name);
                form.setValue('address', result.data.address);
                form.setValue('city', result.data.city);
                form.setValue('postal_code', result.data.postal_code);
                toast.success('Dane pobrane z GUS');
            } else {
                toast.error(result.error || 'Nie znaleziono danych');
            }
        } catch (error) {
            toast.error('Błąd połączenia z GUS');
        } finally {
            setIsLoadingGus(false);
        }
    }

    async function onSubmit(data: VendorFormValues) {
        setIsLoading(true);
        try {
            if (vendor) {
                const result = await updateVendor(vendor.id, data);
                if (result.error) {
                    toast.error(result.error);
                } else {
                    toast.success('Dostawca zaktualizowany');
                    router.push('/vendors');
                }
            } else {
                const result = await createVendor(data);
                if (result.error) {
                    toast.error(result.error);
                } else {
                    toast.success('Dostawca dodany');
                    router.push('/vendors');
                }
            }
        } catch (error) {
            console.error(error);
            toast.error('Wystąpił błąd');
        } finally {
            setIsLoading(false);
        }
    }

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Main Content */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Basic Info */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Dane podstawowe</CardTitle>
                            <CardDescription>Informacje o firmie i dane rejestrowe</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <FormField
                                    control={form.control}
                                    name="name"
                                    render={({ field }) => (
                                        <FormItem className="col-span-2 md:col-span-1">
                                            <FormLabel>Nazwa (Wymagane)</FormLabel>
                                            <FormControl>
                                                <Input placeholder="Nazwa firmy lub Imię i Nazwisko" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <div className="space-y-2 col-span-2 md:col-span-1">
                                    <div className="flex gap-2 items-end">
                                        <FormField
                                            control={form.control}
                                            name="nip"
                                            render={({ field }) => (
                                                <FormItem className="flex-1">
                                                    <FormLabel>NIP</FormLabel>
                                                    <FormControl>
                                                        <Input placeholder="1234567890" {...field} />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                        <Button
                                            type="button"
                                            variant="outline"
                                            onClick={handleGusLookup}
                                            disabled={isLoadingGus}
                                            className="mb-0.5"
                                        >
                                            {isLoadingGus ? (
                                                <Loader2 className="h-4 w-4 animate-spin" />
                                            ) : (
                                                <Search className="h-4 w-4" />
                                            )}
                                            <span className="ml-2 hidden sm:inline">GUS</span>
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Contact Info */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Dane kontaktowe</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <FormField
                                    control={form.control}
                                    name="email"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Email</FormLabel>
                                            <FormControl>
                                                <Input type="email" placeholder="biuro@dostawca.pl" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="phone"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Telefon</FormLabel>
                                            <FormControl>
                                                <Input placeholder="+48 123 456 789" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="website"
                                    render={({ field }) => (
                                        <FormItem className="col-span-2">
                                            <FormLabel>Strona WWW</FormLabel>
                                            <FormControl>
                                                <Input placeholder="https://..." {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>
                        </CardContent>
                    </Card>

                    {/* Address & Bank */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Adres i Płatności</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <FormField
                                control={form.control}
                                name="address"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Ulica i numer</FormLabel>
                                        <FormControl>
                                            <Input placeholder="Ul. Przykładowa 1/2" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <div className="grid grid-cols-2 gap-4">
                                <FormField
                                    control={form.control}
                                    name="postal_code"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Kod pocztowy</FormLabel>
                                            <FormControl>
                                                <Input placeholder="00-000" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="city"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Miejscowość</FormLabel>
                                            <FormControl>
                                                <Input placeholder="Warszawa" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>

                            <div className="pt-4 mt-4 border-t space-y-4">
                                <FormField
                                    control={form.control}
                                    name="bank_account_number"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Numer konta bankowego</FormLabel>
                                            <FormControl>
                                                <Input placeholder="PL 00 0000 0000 0000 0000 0000 0000" className="font-mono" {...field} />
                                            </FormControl>
                                            <FormDescription>Kluczowe do generowania paczek przelewów</FormDescription>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="bank_name"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Nazwa banku</FormLabel>
                                            <FormControl>
                                                <Input placeholder="np. mBank" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>
                        </CardContent>
                    </Card>

                    {/* Notes */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Notatki</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <FormField
                                control={form.control}
                                name="notes"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormControl>
                                            <Textarea
                                                placeholder="Dodatkowe informacje o dostawcy..."
                                                className="min-h-[100px]"
                                                {...field}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
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
                                        vendor ? 'Zapisz zmiany' : 'Dodaj dostawcę'
                                    )}
                                </Button>
                                <Button
                                    type="button"
                                    variant="outline"
                                    className="w-full"
                                    onClick={() => router.back()}
                                    disabled={isLoading}
                                >
                                    Anuluj
                                </Button>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="bg-muted/50">
                        <CardContent className="pt-6">
                            <p className="text-sm text-muted-foreground">
                                💡 <strong>Wskazówka:</strong> Podaj poprawny NIP i numer konta, aby w przyszłości móc automatyzować płatności za faktury kosztowe.
                            </p>
                        </CardContent>
                    </Card>
                </div>
            </form>
        </Form>
    );
}
