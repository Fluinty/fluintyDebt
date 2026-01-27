'use client';

import { useSearchParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Check, Lock } from 'lucide-react';
import Link from 'next/link';

export default function UpsellPage() {
    const searchParams = useSearchParams();
    const module = searchParams.get('module');

    const isSales = module === 'sales';
    const isCosts = module === 'costs';

    const title = isSales ? 'Moduł Sprzedaż (Windykacja)' : 'Moduł Wydatki (Koszty)';
    const description = isSales
        ? 'Zautomatyzuj proces windykacji i odzyskaj swoje pieniądze.'
        : 'Zapanuj nad wydatkami i płatnościami w firmie.';

    const benefits = isSales ? [
        'Automatyczne sekwencje windykacyjne',
        'Zarządzanie dłużnikami',
        'Integracja z KSeF (sprzedaż)',
        'Harmonogram działań',
    ] : [
        'Ewidencja faktur kosztowych',
        'Płatności kodem QR (Sztos!)',
        'Integracja z KSeF (zakupy)',
        'Analiza Cash Flow',
    ];

    return (
        <div className="flex items-center justify-center min-h-[80vh] p-4">
            <Card className="w-full max-w-md border-2 border-primary/20 shadow-lg">
                <CardHeader className="text-center pb-2">
                    <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                        <Lock className="w-6 h-6 text-primary" />
                    </div>
                    <CardTitle className="text-2xl font-bold">{title}</CardTitle>
                    <CardDescription className="text-base mt-2">
                        {description}
                    </CardDescription>
                </CardHeader>
                <CardContent className="pt-6">
                    <div className="space-y-4">
                        <p className="font-medium text-sm text-muted-foreground uppercase tracking-wider text-center">
                            Co zyskujesz:
                        </p>
                        <ul className="space-y-3">
                            {benefits.map((benefit, index) => (
                                <li key={index} className="flex items-center gap-3">
                                    <div className="w-5 h-5 rounded-full bg-green-500/10 flex items-center justify-center shrink-0">
                                        <Check className="w-3 h-3 text-green-600" />
                                    </div>
                                    <span className="text-sm">{benefit}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                </CardContent>
                <CardFooter className="flex flex-col gap-3 pt-6">
                    <Button className="w-full" size="lg" asChild>
                        <Link href="mailto:kontakt@fluinty.com?subject=Upgrade%20Planu">
                            Skontaktuj się w sprawie dostępu
                        </Link>
                    </Button>
                    <p className="text-xs text-center text-muted-foreground">
                        Ten moduł nie jest aktywny w Twoim obecnym planie.
                    </p>
                    <Button variant="ghost" size="sm" asChild>
                        <Link href="/dashboard">
                            Wróć do Dashboardu
                        </Link>
                    </Button>
                </CardFooter>
            </Card>
        </div>
    );
}
