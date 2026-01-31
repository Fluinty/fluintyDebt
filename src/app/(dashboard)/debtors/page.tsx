import Link from 'next/link';
import { Plus, Search, FileDown, Users, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Breadcrumbs } from '@/components/shared/breadcrumbs';
import { formatCurrency } from '@/lib/utils/format-currency';
import { createClient } from '@/lib/supabase/server';
import { calculateDebtorStats } from '@/lib/utils/invoice-calculations';
import { Mail, Phone, Clock } from 'lucide-react';

function getScoreBadge(score: number) {
    if (score >= 80) return { label: 'Doskonały', color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' };
    if (score >= 50) return { label: 'Średni', color: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200' };
    if (score >= 25) return { label: 'Ryzykowny', color: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200' };
    return { label: 'Problematyczny', color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' };
}

interface DebtorWithStats {
    id: string;
    name: string;
    nip: string | null;
    email: string | null;
    phone: string | null;
    paymentScore: number;
    totalInvoices: number;
    unpaidInvoices: number;
    totalDebt: number;
    totalDebtNet: number;
    overdueDebt: number;
    overdueDebtNet: number;
    oldestOverdueDays: number | null;
    preferredLanguage: 'pl' | 'en' | null;
}

export default async function DebtorsPage() {
    const supabase = await createClient();

    // Fetch debtors with their invoices
    const { data: debtors } = await supabase
        .from('debtors')
        .select(`
            id, name, nip, email, phone, preferred_language,
            invoices (id, amount, amount_net, vat_rate, vat_amount, amount_gross, amount_paid, status, due_date, paid_at)
        `)
        .order('created_at', { ascending: false });

    // Calculate stats for each debtor using the utility
    const debtorsWithStats: DebtorWithStats[] = (debtors || []).map((debtor) => {
        const invoices = (debtor.invoices || []) as Array<{
            id: string;
            amount: number;
            amount_net?: number;
            amount_gross?: number;
            amount_paid: number | null;
            status: string;
            due_date: string;
            paid_at?: string | null;
        }>;

        const stats = calculateDebtorStats(invoices);

        // Calculate oldest overdue invoice
        const now = new Date();
        const overdueInvoices = invoices.filter(inv => {
            const isPaid = inv.status === 'paid' || (inv.amount_paid && inv.amount_paid >= (inv.amount_gross || inv.amount));
            const isOverdue = new Date(inv.due_date) < now;
            return !isPaid && isOverdue;
        });
        let oldestOverdueDays: number | null = null;
        if (overdueInvoices.length > 0) {
            const oldestDueDate = overdueInvoices.reduce((oldest, inv) => {
                const dueDate = new Date(inv.due_date);
                return dueDate < oldest ? dueDate : oldest;
            }, new Date(overdueInvoices[0].due_date));
            oldestOverdueDays = Math.floor((now.getTime() - oldestDueDate.getTime()) / (1000 * 60 * 60 * 24));
        }

        return {
            id: debtor.id,
            name: debtor.name,
            nip: debtor.nip,
            email: (debtor as { email?: string }).email || null,
            phone: (debtor as { phone?: string }).phone || null,
            paymentScore: stats.paymentScore,
            totalInvoices: stats.totalInvoices,
            unpaidInvoices: stats.unpaidInvoices,
            totalDebt: stats.totalDebt,
            totalDebtNet: stats.totalDebtNet,
            overdueDebt: stats.overdueDebt,
            overdueDebtNet: stats.overdueDebtNet,
            oldestOverdueDays,
            preferredLanguage: (debtor as any).preferred_language || null,
        };
    });

    return (
        <div className="space-y-6">
            <Breadcrumbs />

            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold">Kontrahenci</h1>
                    <p className="text-muted-foreground mt-1">
                        Zarządzaj kontrahentami i śledź ich historię płatności
                    </p>
                </div>
                <div className="flex gap-2">

                    <Link href="/debtors/new">
                        <Button>
                            <Plus className="h-4 w-4 mr-2" />
                            Nowy kontrahent
                        </Button>
                    </Link>
                </div>
            </div>

            {/* Search */}
            <Card>
                <CardContent className="pt-6">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Szukaj po nazwie, NIP lub email..."
                            className="pl-10"
                        />
                    </div>
                </CardContent>
            </Card>

            {/* Empty state */}
            {debtorsWithStats.length === 0 && (
                <Card className="py-12">
                    <CardContent className="text-center">
                        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
                            <Users className="h-8 w-8 text-muted-foreground" />
                        </div>
                        <h3 className="text-lg font-medium mb-2">Brak kontrahentów</h3>
                        <p className="text-muted-foreground mb-4">
                            Dodaj pierwszego kontrahenta, żeby rozpocząć windykację
                        </p>
                        <Link href="/debtors/new">
                            <Button>
                                <Plus className="h-4 w-4 mr-2" />
                                Dodaj kontrahenta
                            </Button>
                        </Link>
                    </CardContent>
                </Card>
            )}

            {/* Debtors grid */}
            {debtorsWithStats.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {debtorsWithStats.map((debtor) => {
                        const scoreBadge = getScoreBadge(debtor.paymentScore);
                        return (
                            <Link key={debtor.id} href={`/debtors/${debtor.id}`}>
                                <Card className="hover:border-primary/50 transition-colors cursor-pointer h-full">
                                    <CardHeader className="pb-2">
                                        <div className="flex items-start justify-between">
                                            <CardTitle className="text-lg">{debtor.name}</CardTitle>
                                            <div className="flex items-center gap-2">
                                                {/* Language Badge */}
                                                {debtor.preferredLanguage === 'pl' && (
                                                    <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                                                        🇵🇱 PL
                                                    </Badge>
                                                )}
                                                {debtor.preferredLanguage === 'en' && (
                                                    <Badge variant="outline" className="bg-indigo-50 text-indigo-700 border-indigo-200">
                                                        🇬🇧 EN
                                                    </Badge>
                                                )}
                                                {!debtor.preferredLanguage && (
                                                    <Badge variant="destructive" className="flex items-center gap-1">
                                                        <AlertTriangle className="h-3 w-3" />
                                                        Brak języka
                                                    </Badge>
                                                )}
                                                <Badge className={`${scoreBadge.color} border-0`}>
                                                    {debtor.paymentScore}
                                                </Badge>
                                            </div>
                                        </div>
                                        {debtor.nip && <p className="text-sm text-muted-foreground">NIP: {debtor.nip}</p>}
                                    </CardHeader>
                                    <CardContent className="space-y-3">
                                        {/* Contact info */}
                                        {(debtor.email || debtor.phone) && (
                                            <div className="flex flex-wrap gap-3 text-xs text-muted-foreground pb-2 border-b">
                                                {debtor.email && (
                                                    <span className="flex items-center gap-1">
                                                        <Mail className="h-3 w-3" />
                                                        {debtor.email}
                                                    </span>
                                                )}
                                                {debtor.phone && (
                                                    <span className="flex items-center gap-1">
                                                        <Phone className="h-3 w-3" />
                                                        {debtor.phone}
                                                    </span>
                                                )}
                                            </div>
                                        )}
                                        <div className="flex justify-between text-sm">
                                            <span className="text-muted-foreground">Zadłużenie</span>
                                            <div className="text-right">
                                                <span className="font-medium">
                                                    {debtor.totalDebt > 0 ? formatCurrency(debtor.totalDebt) : '-'}
                                                </span>
                                                {debtor.totalDebtNet > 0 && (
                                                    <p className="text-xs text-muted-foreground">netto: {formatCurrency(debtor.totalDebtNet)}</p>
                                                )}
                                            </div>
                                        </div>
                                        {debtor.overdueDebt > 0 && (
                                            <div className="flex justify-between text-sm">
                                                <span className="text-muted-foreground">Przeterminowane</span>
                                                <div className="text-right">
                                                    <span className="font-medium text-red-600">
                                                        {formatCurrency(debtor.overdueDebt)}
                                                    </span>
                                                    {debtor.overdueDebtNet > 0 && (
                                                        <p className="text-xs text-muted-foreground">netto: {formatCurrency(debtor.overdueDebtNet)}</p>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                        {debtor.oldestOverdueDays !== null && debtor.oldestOverdueDays > 0 && (
                                            <div className="flex justify-between text-sm">
                                                <span className="text-muted-foreground flex items-center gap-1">
                                                    <Clock className="h-3 w-3" />
                                                    Najstarsza zaległość
                                                </span>
                                                <span className="font-medium text-orange-600">
                                                    {debtor.oldestOverdueDays} dni
                                                </span>
                                            </div>
                                        )}
                                        <div className="flex justify-between text-sm">
                                            <span className="text-muted-foreground">Faktur</span>
                                            <span className="font-medium">
                                                {debtor.totalInvoices} ({debtor.unpaidInvoices} nieopłaconych)
                                            </span>
                                        </div>
                                        <div className="pt-2">
                                            <Badge variant="outline" className={scoreBadge.color + ' border-0 text-xs'}>
                                                {scoreBadge.label} płatnik
                                            </Badge>
                                        </div>
                                    </CardContent>
                                </Card>
                            </Link>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
