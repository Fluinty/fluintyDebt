'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2, Mail, Lock, Eye, EyeOff, Building2, User } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { createClient } from '@/lib/supabase/client';

const registerSchema = z.object({
    fullName: z.string().min(2, 'Imię i nazwisko jest wymagane'),
    companyName: z.string().min(2, 'Nazwa firmy jest wymagana'),
    email: z.string().email('Wprowadź poprawny adres email'),
    password: z.string().min(8, 'Hasło musi mieć minimum 8 znaków'),
    confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
    message: 'Hasła muszą być identyczne',
    path: ['confirmPassword'],
});

type RegisterFormData = z.infer<typeof registerSchema>;

export default function RegisterPage() {
    const router = useRouter();
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm<RegisterFormData>({
        resolver: zodResolver(registerSchema),
    });

    const onSubmit = async (data: RegisterFormData) => {
        setIsLoading(true);
        setError(null);

        try {
            const supabase = createClient();

            // Sign up the user
            const { data: authData, error: signUpError } = await supabase.auth.signUp({
                email: data.email,
                password: data.password,
                options: {
                    data: {
                        full_name: data.fullName,
                        company_name: data.companyName,
                    },
                },
            });

            if (signUpError) {
                if (signUpError.message.includes('already registered')) {
                    setError('Ten email jest już zarejestrowany');
                } else {
                    setError(signUpError.message);
                }
                return;
            }

            // Create profile record
            if (authData.user) {
                const { error: profileError } = await supabase.from('profiles').insert({
                    id: authData.user.id,
                    email: data.email,
                    full_name: data.fullName,
                    company_name: data.companyName,
                });

                if (profileError) {
                    console.error('Profile creation error:', profileError);
                    // Don't block registration if profile creation fails
                    // Profile can be completed later
                }
            }

            // Redirect to dashboard (or email confirmation page if enabled)
            router.push('/dashboard');
            router.refresh();
        } catch {
            setError('Wystąpił błąd podczas rejestracji');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Card className="border-0 shadow-none lg:border lg:shadow-sm">
            <CardHeader className="space-y-1 text-center lg:text-left">
                <div className="lg:hidden mb-6">
                    <h1 className="text-2xl font-bold text-primary">VindycAItion</h1>
                    <p className="text-muted-foreground text-sm">AI-powered debt collection</p>
                </div>
                <CardTitle className="text-2xl">Utwórz konto</CardTitle>
                <CardDescription>
                    Rozpocznij bezpłatny okres próbny już dziś
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
                        <Label htmlFor="fullName">Imię i nazwisko</Label>
                        <div className="relative">
                            <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                id="fullName"
                                type="text"
                                placeholder="Jan Kowalski"
                                className="pl-10"
                                disabled={isLoading}
                                {...register('fullName')}
                            />
                        </div>
                        {errors.fullName && (
                            <p className="text-sm text-red-600">{errors.fullName.message}</p>
                        )}
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="companyName">Nazwa firmy</Label>
                        <div className="relative">
                            <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                id="companyName"
                                type="text"
                                placeholder="Moja Firma Sp. z o.o."
                                className="pl-10"
                                disabled={isLoading}
                                {...register('companyName')}
                            />
                        </div>
                        {errors.companyName && (
                            <p className="text-sm text-red-600">{errors.companyName.message}</p>
                        )}
                    </div>

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

                    <div className="space-y-2">
                        <Label htmlFor="password">Hasło</Label>
                        <div className="relative">
                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                id="password"
                                type={showPassword ? 'text' : 'password'}
                                placeholder="Minimum 8 znaków"
                                className="pl-10 pr-10"
                                disabled={isLoading}
                                {...register('password')}
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                            >
                                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </button>
                        </div>
                        {errors.password && (
                            <p className="text-sm text-red-600">{errors.password.message}</p>
                        )}
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="confirmPassword">Potwierdź hasło</Label>
                        <div className="relative">
                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                id="confirmPassword"
                                type={showPassword ? 'text' : 'password'}
                                placeholder="Powtórz hasło"
                                className="pl-10"
                                disabled={isLoading}
                                {...register('confirmPassword')}
                            />
                        </div>
                        {errors.confirmPassword && (
                            <p className="text-sm text-red-600">{errors.confirmPassword.message}</p>
                        )}
                    </div>

                    <Button type="submit" className="w-full" disabled={isLoading}>
                        {isLoading ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Tworzenie konta...
                            </>
                        ) : (
                            'Utwórz konto'
                        )}
                    </Button>

                    <p className="text-xs text-center text-muted-foreground">
                        Rejestrując się, akceptujesz{' '}
                        <Link href="/terms" className="text-primary hover:underline">
                            regulamin
                        </Link>{' '}
                        i{' '}
                        <Link href="/privacy" className="text-primary hover:underline">
                            politykę prywatności
                        </Link>
                    </p>
                </form>

                <div className="mt-6 text-center">
                    <p className="text-sm text-muted-foreground">
                        Masz już konto?{' '}
                        <Link href="/login" className="text-primary font-medium hover:underline">
                            Zaloguj się
                        </Link>
                    </p>
                </div>
            </CardContent>
        </Card>
    );
}
