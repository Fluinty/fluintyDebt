import Link from 'next/link';
import { CreditCard, Calendar, CheckCircle, Clock, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Breadcrumbs } from '@/components/shared/breadcrumbs';
import { formatCurrency } from '@/lib/utils/format-currency';
import { formatDate } from '@/lib/utils/format-date';
import { createClient } from '@/lib/supabase/server';

export default async function InstallmentsPage() {
    const supabase = await createClient();

    // Fetch installment plans with installments
    const { data: plans } = await supabase
        .from('installment_plans')
        .select(`
            *,
            invoices (invoice_number, amount, debtors (name)),
            installments (*)
        `)
        .order('created_at', { ascending: false });

    const plansList = plans || [];

    const getStatusBadge = (status: string) => {
        if (status === 'completed') return <Badge className="bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300">Spłacony</Badge>;
        if (status === 'active') return <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300">Aktywny</Badge>;
        if (status === 'overdue') return <Badge className="bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300">Zaległy</Badge>;
        return <Badge variant="outline">{status}</Badge>;
    };

    return (
        <div className="space-y-6">
            <Breadcrumbs />

            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold">Plany ratalne</h1>
                    <p className="text-muted-foreground mt-1">
                        Aktywne układy ratalne z kontrahentami
                    </p>
                </div>
            </div>

            {/* Empty state */}
            {plansList.length === 0 && (
                <Card className="py-12">
                    <CardContent className="text-center">
                        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
                            <CreditCard className="h-8 w-8 text-muted-foreground" />
                        </div>
                        <h3 className="text-lg font-medium mb-2">Brak planów ratalnych</h3>
                        <p className="text-muted-foreground mb-4">
                            Możesz utworzyć plan ratalny z poziomu szczegółów faktury
                        </p>
                    </CardContent>
                </Card>
            )}

            {/* Installment plans */}
            {plansList.length > 0 && (
                <div className="grid gap-6">
                    {plansList.map((plan) => {
                        const installments = plan.installments || [];
                        const paidInstallments = installments.filter((i: any) => i.status === 'paid');
                        const progress = installments.length > 0
                            ? (paidInstallments.length / installments.length) * 100
                            : 0;

                        return (
                            <Card key={plan.id}>
                                <CardHeader>
                                    <div className="flex items-start justify-between">
                                        <div>
                                            <CardTitle className="flex items-center gap-2">
                                                {plan.invoices?.invoice_number || 'Faktura'}
                                                {getStatusBadge(plan.status)}
                                            </CardTitle>
                                            <CardDescription>
                                                {plan.invoices?.debtors?.name || 'Nieznany kontrahent'}
                                            </CardDescription>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-2xl font-bold">{formatCurrency(plan.total_amount)}</p>
                                            <p className="text-sm text-muted-foreground">
                                                {installments.length} rat
                                            </p>
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    {/* Progress */}
                                    <div className="space-y-2">
                                        <div className="flex justify-between text-sm">
                                            <span>Postęp spłaty</span>
                                            <span>{paidInstallments.length} z {installments.length} rat</span>
                                        </div>
                                        <Progress value={progress} />
                                    </div>

                                    {/* Installments */}
                                    {installments.length > 0 && (
                                        <div className="space-y-2">
                                            {installments.map((inst: any, idx: number) => (
                                                <div key={inst.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                                                    <div className="flex items-center gap-3">
                                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${inst.status === 'paid'
                                                                ? 'bg-green-100 text-green-600 dark:bg-green-900'
                                                                : inst.status === 'overdue'
                                                                    ? 'bg-red-100 text-red-600 dark:bg-red-900'
                                                                    : 'bg-muted'
                                                            }`}>
                                                            {inst.status === 'paid' ? (
                                                                <CheckCircle className="h-4 w-4" />
                                                            ) : inst.status === 'overdue' ? (
                                                                <AlertTriangle className="h-4 w-4" />
                                                            ) : (
                                                                <Clock className="h-4 w-4 text-muted-foreground" />
                                                            )}
                                                        </div>
                                                        <div>
                                                            <p className="font-medium">Rata {idx + 1}</p>
                                                            <p className="text-xs text-muted-foreground">
                                                                Termin: {formatDate(inst.due_date)}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className="font-semibold">{formatCurrency(inst.amount)}</p>
                                                        <Badge variant={inst.status === 'paid' ? 'default' : 'outline'} className="text-xs">
                                                            {inst.status === 'paid' ? 'Opłacona' :
                                                                inst.status === 'overdue' ? 'Zaległa' : 'Oczekuje'}
                                                        </Badge>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {/* Link to invoice */}
                                    {plan.invoice_id && (
                                        <Link href={`/invoices/${plan.invoice_id}`}>
                                            <Button variant="outline" size="sm">
                                                Zobacz fakturę
                                            </Button>
                                        </Link>
                                    )}
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
