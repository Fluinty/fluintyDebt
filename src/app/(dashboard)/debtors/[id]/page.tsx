import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, Edit, FileText, TrendingUp, TrendingDown, AlertTriangle, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Breadcrumbs } from '@/components/shared/breadcrumbs';
import { StatusBadge } from '@/components/invoices/status-badge';
import { formatCurrency } from '@/lib/utils/format-currency';
import { formatDate } from '@/lib/utils/format-date';
import { createClient } from '@/lib/supabase/server';
import { calculateDebtorStats, getActualInvoiceStatus } from '@/lib/utils/invoice-calculations';

function getScoreInfo(score: number) {
    if (score >= 80) return { label: 'Doskonały płatnik', color: 'text-green-600', bg: 'bg-green-100 dark:bg-green-900' };
    if (score >= 50) return { label: 'Średni płatnik', color: 'text-amber-600', bg: 'bg-amber-100 dark:bg-amber-900' };
    if (score >= 25) return { label: 'Ryzykowny', color: 'text-orange-600', bg: 'bg-orange-100 dark:bg-orange-900' };
    return { label: 'Problematyczny', color: 'text-red-600', bg: 'bg-red-100 dark:bg-red-900' };
}

export default async function DebtorDetailsPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const supabase = await createClient();

    // Fetch debtor from database
    const { data: debtor } = await supabase
        .from('debtors')
        .select('*')
        .eq('id', id)
        .single();

    if (!debtor) {
        notFound();
    }

    // Fetch invoices for this debtor
    const { data: invoices } = await supabase
        .from('invoices')
        .select('*')
        .eq('debtor_id', id)
        .order('created_at', { ascending: false });

    // Process invoices with dynamic status and calculate stats
    const invoicesList = (invoices || []).map((inv) => ({
        ...inv,
        calculatedStatus: getActualInvoiceStatus(inv),
    }));

    const stats = calculateDebtorStats(invoices || []);
    const scoreInfo = getScoreInfo(stats.paymentScore);

    return (
        <div className="space-y-6">
            <Breadcrumbs />

            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                <div className="flex items-start gap-4">
                    <Link href="/debtors">
                        <Button variant="ghost" size="icon">
                            <ArrowLeft className="h-5 w-5" />
                        </Button>
                    </Link>
                    <div>
                        <div className="flex items-center gap-3">
                            <h1 className="text-3xl font-bold">{debtor.name}</h1>
                            <Badge className={`${scoreInfo.bg} ${scoreInfo.color} border-0`}>
                                {stats.paymentScore} pkt
                            </Badge>
                        </div>
                        {debtor.nip && <p className="text-muted-foreground mt-1">NIP: {debtor.nip}</p>}
                    </div>
                </div>
                <Link href={`/debtors/${debtor.id}/edit`}>
                    <Button variant="outline">
                        <Edit className="h-4 w-4 mr-2" />
                        Edytuj
                    </Button>
                </Link>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Main content */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Stats */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <Card>
                            <CardContent className="pt-6 text-center">
                                <p className="text-2xl font-bold">{stats.totalInvoices}</p>
                                <p className="text-xs text-muted-foreground">Wszystkich faktur</p>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardContent className="pt-6 text-center">
                                <p className="text-2xl font-bold text-green-600">{stats.paidInvoices}</p>
                                <p className="text-xs text-muted-foreground">Opłaconych</p>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardContent className="pt-6 text-center">
                                <p className="text-2xl font-bold text-amber-600">{stats.pendingInvoices}</p>
                                <p className="text-xs text-muted-foreground">Oczekujących</p>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardContent className="pt-6 text-center">
                                <p className="text-2xl font-bold text-red-600">{stats.overdueInvoices}</p>
                                <p className="text-xs text-muted-foreground">Przeterminowanych</p>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Invoices */}
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between">
                            <div>
                                <CardTitle>Historia faktur</CardTitle>
                                <CardDescription>Wszystkie faktury tego kontrahenta</CardDescription>
                            </div>
                            <Link href={`/invoices/new?debtor=${debtor.id}`}>
                                <Button size="sm">
                                    <Plus className="h-4 w-4 mr-2" />
                                    Nowa faktura
                                </Button>
                            </Link>
                        </CardHeader>
                        <CardContent>
                            {invoicesList.length === 0 ? (
                                <div className="text-center py-8 text-muted-foreground">
                                    <FileText className="h-10 w-10 mx-auto mb-2 opacity-50" />
                                    <p>Brak faktur dla tego kontrahenta</p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {invoicesList.map((invoice) => (
                                        <Link key={invoice.id} href={`/invoices/${invoice.id}`}>
                                            <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg hover:bg-muted transition-colors">
                                                <div>
                                                    <p className="font-medium">{invoice.invoice_number}</p>
                                                    <p className="text-sm text-muted-foreground">{formatDate(invoice.due_date)}</p>
                                                </div>
                                                <div className="text-right flex items-center gap-4">
                                                    <p className="font-semibold">{formatCurrency(invoice.amount)}</p>
                                                    <StatusBadge status={invoice.calculatedStatus} />
                                                </div>
                                            </div>
                                        </Link>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>

                {/* Sidebar */}
                <div className="space-y-6">
                    {/* Contact info */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Dane kontaktowe</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {debtor.email && (
                                <div>
                                    <p className="text-sm text-muted-foreground">Email</p>
                                    <p className="font-medium">{debtor.email}</p>
                                </div>
                            )}
                            {debtor.phone && (
                                <div>
                                    <p className="text-sm text-muted-foreground">Telefon</p>
                                    <p className="font-medium">{debtor.phone}</p>
                                </div>
                            )}
                            {debtor.contact_person && (
                                <div>
                                    <p className="text-sm text-muted-foreground">Osoba kontaktowa</p>
                                    <p className="font-medium">{debtor.contact_person}</p>
                                </div>
                            )}
                            {(debtor.address || debtor.city) && (
                                <>
                                    <Separator />
                                    <div>
                                        <p className="text-sm text-muted-foreground">Adres</p>
                                        {debtor.address && <p className="font-medium">{debtor.address}</p>}
                                        {(debtor.postal_code || debtor.city) && (
                                            <p className="font-medium">{debtor.postal_code} {debtor.city}</p>
                                        )}
                                    </div>
                                </>
                            )}
                        </CardContent>
                    </Card>

                    {/* Payment score */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                {stats.paymentScore >= 50 ? (
                                    <TrendingUp className="h-5 w-5 text-green-500" />
                                ) : (
                                    <TrendingDown className="h-5 w-5 text-red-500" />
                                )}
                                Ocena płatnika
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="text-center">
                                <p className={`text-4xl font-bold ${scoreInfo.color}`}>
                                    {stats.paymentScore}
                                </p>
                                <p className="text-sm text-muted-foreground mt-1">{scoreInfo.label}</p>
                            </div>
                            <div className="w-full bg-muted rounded-full h-2">
                                <div
                                    className={`h-2 rounded-full ${stats.paymentScore >= 50 ? 'bg-green-500' : 'bg-red-500'}`}
                                    style={{ width: `${stats.paymentScore}%` }}
                                />
                            </div>
                            <p className="text-xs text-muted-foreground text-center">
                                Ocena bazuje na historii płatności. 100 = zawsze na czas.
                            </p>
                        </CardContent>
                    </Card>

                    {/* Debt summary */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Podsumowanie</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Zadłużenie</span>
                                <span className="font-semibold">{formatCurrency(stats.totalDebt)}</span>
                            </div>
                            {stats.overdueDebt > 0 && (
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Przeterminowane</span>
                                    <span className="font-semibold text-red-600">{formatCurrency(stats.overdueDebt)}</span>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Notes */}
                    {debtor.notes && (
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <AlertTriangle className="h-4 w-4 text-amber-500" />
                                    Notatki
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm">{debtor.notes}</p>
                            </CardContent>
                        </Card>
                    )}
                </div>
            </div>
        </div>
    );
}
