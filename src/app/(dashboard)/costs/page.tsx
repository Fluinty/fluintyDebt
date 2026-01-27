import Link from 'next/link';
import { Plus, Receipt, TrendingDown, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Breadcrumbs } from '@/components/shared/breadcrumbs';
import { CostInvoicesTable } from '@/components/costs/cost-invoices-table';
import { createClient } from '@/lib/supabase/server';
import { formatCurrency } from '@/lib/utils/format-currency';
import { requireModule } from '@/lib/auth/module-guard';

export default async function CostsPage() {
    // Check permissions
    await requireModule('costs');

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return null;

    // Fetch cost invoices
    const { data: invoices } = await supabase
        .from('cost_invoices')
        .select('*')
        .eq('user_id', user.id)
        .order('due_date', { ascending: true });

    // Fetch vendors to populate bank accounts if missing
    const { data: vendors } = await supabase
        .from('vendors')
        .select('nip, bank_account_number')
        .eq('user_id', user.id)
        .not('nip', 'is', null);

    const vendorBankMap = new Map<string, string>();
    if (vendors) {
        vendors.forEach(v => {
            if (v.nip && v.bank_account_number) {
                vendorBankMap.set(v.nip, v.bank_account_number);
            }
        });
    }

    const invoicesData = invoices || [];

    // Enrich invoices with bank account from vendor if missing
    const invoicesList = invoicesData.map(inv => {
        if (!inv.account_number && inv.contractor_nip) {
            const vendorAccount = vendorBankMap.get(inv.contractor_nip);
            if (vendorAccount) {
                return { ...inv, account_number: vendorAccount };
            }
        }
        return inv;
    });

    // Calculate stats
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const toPayInvoices = invoicesList.filter(inv => inv.payment_status !== 'paid');
    const totalToPay = toPayInvoices.reduce((sum, inv) => sum + Number(inv.amount), 0);

    const overdueInvoices = toPayInvoices.filter(inv => {
        const dueDate = new Date(inv.due_date);
        dueDate.setHours(0, 0, 0, 0);
        return dueDate < today;
    });
    const totalOverdue = overdueInvoices.reduce((sum, inv) => sum + Number(inv.amount), 0);

    const paidInvoices = invoicesList.filter(inv => inv.payment_status === 'paid');
    const totalPaid = paidInvoices.reduce((sum, inv) => sum + Number(inv.amount), 0);

    return (
        <div className="space-y-6">
            <Breadcrumbs />

            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold">Wydatki (Koszty)</h1>
                    <p className="text-muted-foreground mt-1">
                        Zarządzaj zobowiązaniami i płatnościami
                    </p>
                </div>
                <div className="flex gap-2">
                    {/* Placeholder for import - to be implemented */}
                    <Link href="/settings">
                        <Button variant="outline">
                            <Receipt className="h-4 w-4 mr-2" />
                            Import KSeF
                        </Button>
                    </Link>
                    <Link href="/costs/new">
                        <Button>
                            <Plus className="h-4 w-4 mr-2" />
                            Dodaj koszt
                        </Button>
                    </Link>
                </div>
            </div>

            {/* Summary cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                    <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                            Do zapłaty (Razem)
                        </CardTitle>
                        <TrendingDown className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{formatCurrency(totalToPay)}</div>
                        <p className="text-xs text-muted-foreground">{toPayInvoices.length} faktury do opłacenia</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                            Przeterminowane
                        </CardTitle>
                        <AlertCircle className="h-4 w-4 text-red-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-red-600">{formatCurrency(totalOverdue)}</div>
                        <p className="text-xs text-muted-foreground">{overdueInvoices.length} po terminie</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                            Opłacone (Historie)
                        </CardTitle>
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-green-600">{formatCurrency(totalPaid)}</div>
                        <p className="text-xs text-muted-foreground">{paidInvoices.length} opłaconych faktur</p>
                    </CardContent>
                </Card>
            </div>

            {/* Invoices table */}
            <CostInvoicesTable invoices={invoicesList} />
        </div>
    );
}
