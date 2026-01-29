
import { createClient } from '@/lib/supabase/server';
import { redirect, notFound } from 'next/navigation';
import { CostDetailsCard } from '@/components/costs/cost-details-card';
import { MarkAsPaidButton } from '@/components/costs/mark-paid-button';
import { PayWithQR } from '@/components/costs/pay-with-qr';
import { CostStatusBadge } from '@/components/costs/cost-status-badge'; // Import status badge
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'; // Import standard cards
import { ArrowLeft, Building2, Calendar, FileText, Wallet } from 'lucide-react'; // More icons
import Link from 'next/link';
import { formatCurrency } from '@/lib/utils/format-currency'; // Helper
import { formatDate } from '@/lib/utils/format-date'; // Helper

export default async function CostDetailsPage(props: { params: Promise<{ id: string }> }) {
    const params = await props.params;
    const { id } = params;

    const supabase = await createClient();

    // Auth check
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect('/login');

    // Fetch invoice details
    const { data: invoice, error } = await supabase
        .from('cost_invoices')
        .select('*')
        .eq('id', id)
        .eq('user_id', user.id)
        .single();

    if (error || !invoice) {
        return notFound();
    }

    // Determine status for badge (map DB status to badge status if needed)
    // The CostInvoicesTable uses logic to determine 'overdue'/'due_soon'. 
    // Ideally we should replicate that or extract it. For now, we use payment_status + simple date check.
    let displayStatus = invoice.payment_status;
    if (displayStatus !== 'paid') {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const due = new Date(invoice.due_date);
        due.setHours(0, 0, 0, 0);
        if (due < today) displayStatus = 'overdue';
        else {
            const diffTime = Math.abs(due.getTime() - today.getTime());
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            if (diffDays <= 3) displayStatus = 'due_soon';
        }
    }

    const isPaid = invoice.payment_status === 'paid';
    const amountToPay = invoice.amount_gross || invoice.amount;
    const accountAvailable = !!invoice.account_number;

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Header Section */}
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                <div className="flex items-start gap-4">
                    <Link href="/costs">
                        <Button variant="ghost" size="icon">
                            <ArrowLeft className="h-5 w-5" />
                        </Button>
                    </Link>
                    <div>
                        <div className="flex items-center gap-3">
                            <h1 className="text-3xl font-bold tracking-tight">{invoice.invoice_number}</h1>
                            <CostStatusBadge status={displayStatus} className="text-base px-3 py-1" />
                        </div>
                        <div className="flex items-center gap-2 text-muted-foreground mt-1">
                            <Building2 className="h-4 w-4" />
                            <span className="font-medium">{invoice.contractor_name}</span>
                            {invoice.contractor_nip && <span>• NIP: {invoice.contractor_nip}</span>}
                        </div>
                    </div>
                </div>

                {/* Primary Action (Top Right) */}
                <div className="flex gap-2">
                    <MarkAsPaidButton
                        invoiceId={invoice.id}
                        isPaid={isPaid}
                    />
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Main Content (Left Column) */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Reusing the fancy card for transfer details */}
                    <CostDetailsCard invoice={{ ...invoice, payment_status: displayStatus }} />

                    {/* Additional Details (Description, Category) */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-lg">
                                <FileText className="h-5 w-5 text-muted-foreground" />
                                Dodatkowe informacje
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="grid md:grid-cols-2 gap-6">
                            <div>
                                <p className="text-sm text-muted-foreground mb-1">Kategoria</p>
                                <div className="font-medium capitalize">{invoice.category || 'Inne'}</div>
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground mb-1">Data wystawienia</p>
                                <div className="font-medium flex items-center gap-2">
                                    <Calendar className="h-4 w-4 opacity-50" />
                                    {formatDate(invoice.issue_date)}
                                </div>
                            </div>
                            {invoice.description && (
                                <div className="md:col-span-2">
                                    <p className="text-sm text-muted-foreground mb-1">Opis / Notatki</p>
                                    <p className="text-sm whitespace-pre-wrap">{invoice.description}</p>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>

                {/* Sidebar (Right Column) */}
                <div className="space-y-6">
                    {/* Payment Summary */}
                    <Card className={isPaid ? "bg-emerald-50/50 dark:bg-emerald-900/10 border-emerald-200" : "bg-amber-50/50 dark:bg-amber-900/10 border-amber-200"}>
                        <CardHeader>
                            <CardTitle className="text-sm uppercase tracking-wider text-muted-foreground">Podsumowanie</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="mb-4">
                                <p className="text-3xl font-bold tracking-tight">
                                    {formatCurrency(amountToPay)}
                                </p>
                                <p className="text-sm text-muted-foreground">Kwota brutto</p>
                            </div>

                            <div className="space-y-4 pt-4 border-t border-border/50">
                                <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">Kwota netto:</span>
                                    <span className="font-medium">{invoice.amount_net ? formatCurrency(invoice.amount_net) : '---'}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">VAT:</span>
                                    <span className="font-medium">
                                        {invoice.vat_amount ? formatCurrency(invoice.vat_amount) : '---'}
                                        {invoice.vat_rate && <span className="text-xs text-muted-foreground ml-1">({invoice.vat_rate}%)</span>}
                                    </span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Quick Payment Actions */}
                    {accountAvailable && !isPaid && (
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Wallet className="h-5 w-5" />
                                    Szybka płatność
                                </CardTitle>
                                <CardDescription>Zapłać wygodnie telefonem</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="w-full">
                                    <PayWithQR
                                        invoiceNumber={invoice.invoice_number}
                                        accountNumber={invoice.account_number}
                                        amount={amountToPay}
                                        contractorName={invoice.contractor_name}
                                        title={`Faktura ${invoice.invoice_number}`}
                                    />
                                </div>
                            </CardContent>
                        </Card>
                    )}
                </div>
            </div>

            {/* Footer metadata */}
            <div className="flex justify-between text-xs text-muted-foreground pt-8 border-t">
                <span>ID: {invoice.id}</span>
                <span>Utworzono: {new Date(invoice.created_at).toLocaleString()}</span>
            </div>
        </div>
    );
}
