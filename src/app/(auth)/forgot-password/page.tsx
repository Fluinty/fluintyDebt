'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2, Mail, ArrowLeft, CheckCircle } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { createClient } from '@/lib/supabase/client';

const forgotPasswordSchema = z.object({
    email: z.string().email('Wprowadź poprawny adres email'),
});

type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;

export default function ForgotPasswordPage() {
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);

    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm<ForgotPasswordFormData>({
        resolver: zodResolver(forgotPasswordSchema),
    });

    const onSubmit = async (data: ForgotPasswordFormData) => {
        setIsLoading(true);
        setError(null);

        try {
            const supabase = createClient();
            const { error: resetError } = await supabase.auth.resetPasswordForEmail(
                data.email,
                {
                    redirectTo: `${window.location.origin}/reset-password`,
                }
            );

            if (resetError) {
                setError(resetError.message);
                return;
            }

            setIsSuccess(true);
        } catch {
            setError('Wystąpił błąd. Spróbuj ponownie później.');
        } finally {
            setIsLoading(false);
        }
    };

    if (isSuccess) {
        return (
            <Card className="border-0 shadow-none lg:border lg:shadow-sm">
                <CardHeader className="space-y-1 text-center">
                    <div className="mx-auto mb-4 w-12 h-12 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center">
                        <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400" />
                    </div>
                    <CardTitle className="text-2xl">Sprawdź swoją skrzynkę</CardTitle>
                    <CardDescription className="text-base">
                        Wysłaliśmy link do resetowania hasła na podany adres email.
                        Link wygaśnie za 24 godziny.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Link href="/login">
                        <Button variant="outline" className="w-full">
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            Wróć do logowania
                        </Button>
                    </Link>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="border-0 shadow-none lg:border lg:shadow-sm">
            <CardHeader className="space-y-1 text-center lg:text-left">
                <div className="lg:hidden mb-6">
                    <h1 className="text-2xl font-bold text-primary">FluintyDebt</h1>
                    <p className="text-muted-foreground text-sm">AI-powered debt collection</p>
                </div>
                <CardTitle className="text-2xl">Resetuj hasło</CardTitle>
                <CardDescription>
                    Wprowadź swój email, a wyślemy Ci link do resetowania hasła
                </CardDescription>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                    {error && (
                        <div className="p-3 text-sm text-red-600 bg-red-50 dark:bg-red-950 dark:text-red-400 rounded-md">
                            {error}
                        </div>
                    )}

                    <div className="space-y-2">
                        <Label htmlFor="email">Email</Label>
                        <div className="relative">
                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                id="email"
                                type="email"
                                placeholder="twoj@email.pl"
                                className="pl-10"
                                disabled={isLoading}
                                {...register('email')}
                            />
                        </div>
                        {errors.email && (
                            <p className="text-sm text-red-600">{errors.email.message}</p>
                        )}
                    </div>

                    <Button type="submit" className="w-full" disabled={isLoading}>
                        {isLoading ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Wysyłanie...
                            </>
                        ) : (
                            'Wyślij link resetujący'
                        )}
                    </Button>
                </form>

                <div className="mt-6 text-center">
                    <Link
                        href="/login"
                        className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center"
                    >
                        <ArrowLeft className="mr-1 h-4 w-4" />
                        Wróć do logowania
                    </Link>
                </div>
            </CardContent>
        </Card>
    );
}
