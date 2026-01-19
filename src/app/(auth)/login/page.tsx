'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2, Mail, Lock, Eye, EyeOff } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { createClient } from '@/lib/supabase/client';

const loginSchema = z.object({
    email: z.string().email('Wprowadź poprawny adres email'),
    password: z.string().min(6, 'Hasło musi mieć minimum 6 znaków'),
});

type LoginFormData = z.infer<typeof loginSchema>;

export default function LoginPage() {
    const router = useRouter();
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm<LoginFormData>({
        resolver: zodResolver(loginSchema),
    });

    const onSubmit = async (data: LoginFormData) => {
        setIsLoading(true);
        setError(null);

        try {
            const supabase = createClient();
            const { error: signInError } = await supabase.auth.signInWithPassword({
                email: data.email,
                password: data.password,
            });

            if (signInError) {
                if (signInError.message === 'Invalid login credentials') {
                    setError('Nieprawidłowy email lub hasło');
                } else {
                    setError(signInError.message);
                }
                return;
            }

            router.push('/dashboard');
            router.refresh();
        } catch {
            setError('Wystąpił błąd podczas logowania');
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
                <CardTitle className="text-2xl">Zaloguj się</CardTitle>
                <CardDescription>
                    Wprowadź swoje dane, aby uzyskać dostęp do konta
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

                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <Label htmlFor="password">Hasło</Label>
                            <Link
                                href="/forgot-password"
                                className="text-sm text-primary hover:underline"
                            >
                                Zapomniałeś hasła?
                            </Link>
                        </div>
                        <div className="relative">
                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                id="password"
                                type={showPassword ? 'text' : 'password'}
                                placeholder="••••••••"
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

                    <Button type="submit" className="w-full" disabled={isLoading}>
                        {isLoading ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Logowanie...
                            </>
                        ) : (
                            'Zaloguj się'
                        )}
                    </Button>
                </form>

                <div className="mt-6 text-center">
                    <p className="text-sm text-muted-foreground">
                        Nie masz konta?{' '}
                        <Link href="/register" className="text-primary font-medium hover:underline">
                            Zarejestruj się
                        </Link>
                    </p>
                </div>
            </CardContent>
        </Card>
    );
}
