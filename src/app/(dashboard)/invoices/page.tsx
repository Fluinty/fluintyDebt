import Link from 'next/link';
import { Plus, FileDown, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Breadcrumbs } from '@/components/shared/breadcrumbs';
import { InvoicesTable } from '@/components/invoices/invoices-table';
import { KSeFImportButton } from '@/components/ksef/ksef-import-button';
import { formatCurrency } from '@/lib/utils/format-currency';
import { createClient } from '@/lib/supabase/server';
import { getActualInvoiceStatus, getDaysOverdue } from '@/lib/utils/invoice-calculations';

export default async function InvoicesPage({
    searchParams,
}: {
    searchParams: Promise<{ status?: string }>;
}) {
    const params = await searchParams;
    const initialStatus = params?.status || 'unpaid';
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    // Fetch KSeF settings
    const { data: ksefSettings } = await supabase
        .from('user_ksef_settings')
        .select('is_enabled, ksef_token_encrypted')
        .eq('user_id', user.id)
        .single();

    const isKSeFConfigured = !!ksefSettings?.ksef_token_encrypted;

    // Fetch real invoices with debtor names
    const { data: invoices } = await supabase
        .from('invoices')
        .select(`
            *,
            debtors (name)
        `)
        .order('due_date', { ascending: true });

    // Process invoices with dynamic status using utility
    const invoicesList = (invoices || []).map((inv) => ({
        ...inv,
        calculatedStatus: getActualInvoiceStatus(inv),
        daysOverdue: getDaysOverdue(inv.due_date),
    }));

    const totalAmount = invoicesList.reduce((sum, inv) => sum + Number(inv.amount_gross || inv.amount), 0);
    const totalAmountNet = invoicesList.reduce((sum, inv) => sum + Number(inv.amount_net || (inv.amount / 1.23)), 0);
    const overdueInvoices = invoicesList.filter((inv) => inv.calculatedStatus === 'overdue');
    const overdueAmount = overdueInvoices.reduce((sum, inv) => sum + Number(inv.amount_gross || inv.amount) - Number(inv.amount_paid || 0), 0);
    const overdueAmountNet = overdueInvoices.reduce((sum, inv) => sum + Number(inv.amount_net || (inv.amount / 1.23)), 0);
    const overdueCount = overdueInvoices.length;
    const paidInvoices = invoicesList.filter((inv) => inv.calculatedStatus === 'paid');
    const paidAmount = paidInvoices.reduce((sum, inv) => sum + Number(inv.amount_gross || inv.amount), 0);
    const paidAmountNet = paidInvoices.reduce((sum, inv) => sum + Number(inv.amount_net || (inv.amount / 1.23)), 0);

    return (
        <div className="space-y-6">
            <Breadcrumbs />

            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold">Należności</h1>
                    <p className="text-muted-foreground mt-1">
                        Zarządzaj fakturami i śledź płatności
                    </p>
                </div>
                <div className="flex gap-2">
                    <KSeFImportButton
                        isConfigured={isKSeFConfigured}
                        syncMode="sales"
                        variant="outline"
                    />
                    <Link href="/invoices/import">
                        <Button variant="ghost" size="icon" title="Import z pliku">
                            <FileDown className="h-4 w-4" />
                        </Button>
                    </Link>
                    <Link href="/invoices/new">
                        <Button>
                            <Plus className="h-4 w-4 mr-2" />
                            Nowa faktura
                        </Button>
                    </Link>
                </div>
            </div>

            {/* Summary cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                            Wszystkie należności
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{formatCurrency(totalAmount)}</div>
                        <p className="text-xs text-muted-foreground">netto: {formatCurrency(totalAmountNet)}</p>
                        <p className="text-xs text-muted-foreground">{invoicesList.length} faktur</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                            Przeterminowane
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-red-600">{formatCurrency(overdueAmount)}</div>
                        <p className="text-xs text-muted-foreground">netto: {formatCurrency(overdueAmountNet)}</p>
                        <p className="text-xs text-muted-foreground">{overdueCount} faktur</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                            Skuteczność
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-green-600">
                            {invoicesList.length > 0
                                ? Math.round((paidInvoices.length / invoicesList.length) * 100)
                                : 0}%
                        </div>
                        <p className="text-xs text-muted-foreground">opłaconych faktur</p>
                    </CardContent>
                </Card>
            </div>

            {/* Empty state */}
            {invoicesList.length === 0 && (
                <Card className="py-12">
                    <CardContent className="text-center">
                        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
                            <FileText className="h-8 w-8 text-muted-foreground" />
                        </div>
                        <h3 className="text-lg font-medium mb-2">Brak faktur</h3>
                        <p className="text-muted-foreground mb-4">
                            Dodaj pierwszą fakturę, żeby rozpocząć windykację
                        </p>
                        <Link href="/invoices/new">
                            <Button>
                                <Plus className="h-4 w-4 mr-2" />
                                Dodaj fakturę
                            </Button>
                        </Link>
                    </CardContent>
                </Card>
            )}

            {/* Invoices table with filters */}
            {invoicesList.length > 0 && (
                <InvoicesTable invoices={invoicesList} initialStatusFilter={initialStatus} />
            )}
        </div>
    );
}
