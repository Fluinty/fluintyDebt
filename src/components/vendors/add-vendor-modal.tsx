'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { toast } from 'sonner';
import { Loader2, Search, Plus } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { createVendor } from '@/app/actions/vendor-actions';
import { fetchCompanyByNip } from '@/app/actions/gus-actions';
import type { Vendor } from '@/types/database';

const vendorSchema = z.object({
    name: z.string().min(1, 'Nazwa jest wymagana'),
    nip: z.string().optional().or(z.literal('')),
    email: z.string().email('Nieprawidłowy adres email').optional().or(z.literal('')),
    phone: z.string().optional().or(z.literal('')),
    bank_account_number: z.string().optional().or(z.literal('')),
    bank_name: z.string().optional().or(z.literal('')),
});

type VendorFormValues = z.infer<typeof vendorSchema>;

interface AddVendorModalProps {
    onVendorCreated: (vendor: Vendor) => void;
    trigger?: React.ReactNode;
}

export function AddVendorModal({ onVendorCreated, trigger }: AddVendorModalProps) {
    const [open, setOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [isLoadingGus, setIsLoadingGus] = useState(false);

    const {
        register,
        handleSubmit,
        setValue,
        watch,
        reset,
        formState: { errors },
    } = useForm<VendorFormValues>({
        resolver: zodResolver(vendorSchema),
        defaultValues: {
            name: '',
            nip: '',
            email: '',
            phone: '',
            bank_account_number: '',
            bank_name: '',
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

    const onSubmit = async (data: VendorFormValues) => {
        setIsLoading(true);

        try {
            const result = await createVendor({
                name: data.name,
                nip: data.nip || null,
                email: data.email || null,
                phone: data.phone || null,
                bank_account_number: data.bank_account_number || null,
                bank_name: data.bank_name || null,
            });

            if (result.error) {
                toast.error(result.error);
                return;
            }

            if (result.data) {
                toast.success('Dostawca został dodany!');
                onVendorCreated(result.data);
                reset();
                setOpen(false);
            }
        } catch (err) {
            console.error('Error:', err);
            toast.error('Wystąpił nieoczekiwany błąd');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {trigger || (
                    <Button variant="outline" size="sm" className="gap-2">
                        <Plus className="h-4 w-4" />
                        Dodaj dostawcę
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>Nowy dostawca</DialogTitle>
                    <DialogDescription>
                        Dodaj nowego dostawcę do bazy. Zostanie automatycznie wybrany.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-4">
                    <div className="space-y-2">
                        <Label htmlFor="nip">NIP</Label>
                        <div className="flex gap-2">
                            <Input
                                id="nip"
                                placeholder="1234567890"
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
                                <span className="ml-2">GUS</span>
                            </Button>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="name">Nazwa firmy *</Label>
                        <Input
                            id="name"
                            placeholder="np. Dostawca Sp. z o.o."
                            {...register('name')}
                        />
                        {errors.name && (
                            <p className="text-sm text-red-600">{errors.name.message}</p>
                        )}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="email">Email</Label>
                            <Input
                                id="email"
                                type="email"
                                placeholder="kontakt@firma.pl"
                                {...register('email')}
                            />
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
                        <Label htmlFor="bank_account_number">Numer konta</Label>
                        <Input
                            id="bank_account_number"
                            placeholder="XX XXXX XXXX XXXX XXXX XXXX XXXX"
                            {...register('bank_account_number')}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="bank_name">Nazwa banku</Label>
                        <Input
                            id="bank_name"
                            placeholder="np. PKO BP"
                            {...register('bank_name')}
                        />
                    </div>

                    <div className="flex justify-end gap-3 pt-4">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => setOpen(false)}
                        >
                            Anuluj
                        </Button>
                        <Button type="submit" disabled={isLoading}>
                            {isLoading ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Zapisywanie...
                                </>
                            ) : (
                                'Dodaj dostawcę'
                            )}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}
