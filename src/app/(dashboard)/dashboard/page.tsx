import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
    TrendingUp,
    Clock,
    CheckCircle,
    AlertTriangle,
    Plus,
    ArrowRight,
    History,
    Sparkles,
    FileText,
    Users,
} from 'lucide-react';
import Link from 'next/link';
import { formatCurrency } from '@/lib/utils/format-currency';
import { createClient } from '@/lib/supabase/server';
import { getActualInvoiceStatus, getDaysOverdue } from '@/lib/utils/invoice-calculations';
import { formatDate } from '@/lib/utils/format-date';
import { StatusBadge } from '@/components/invoices/status-badge';
import { ReceivablesChart, StatusPieChart, ActivityChart, CashFlowPrediction } from '@/components/dashboard/charts';

export default async function DashboardPage() {
    const supabase = await createClient();

    // Fetch user profile
    const { data: { user } } = await supabase.auth.getUser();
    const { data: profile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', user?.id)
        .single();

    // Fetch real stats from database
    const { data: invoices } = await supabase
        .from('invoices')
        .select('id, invoice_number, amount, amount_paid, status, due_date, debtor_id, debtors(name)')
        .order('due_date', { ascending: true });

    const { data: debtors } = await supabase
        .from('debtors')
        .select('id');

    const invoicesList = (invoices || []).map(inv => ({
        ...inv,
        calculatedStatus: getActualInvoiceStatus(inv),
        daysOverdue: getDaysOverdue(inv.due_date),
    }));
    const debtorsList = debtors || [];

    // Calculate stats with dynamic statuses
    const unpaidInvoices = invoicesList.filter(inv => inv.calculatedStatus !== 'paid');
    const overdueInvoices = invoicesList.filter(inv => inv.calculatedStatus === 'overdue');
    const paidInvoices = invoicesList.filter(inv => inv.calculatedStatus === 'paid');

    const totalReceivables = unpaidInvoices.reduce((sum, inv) => sum + Number(inv.amount) - Number(inv.amount_paid || 0), 0);
    const overdueReceivables = overdueInvoices.reduce((sum, inv) => sum + Number(inv.amount) - Number(inv.amount_paid || 0), 0);
    const recoveredThisMonth = paidInvoices.reduce((sum, inv) => sum + Number(inv.amount), 0);

    // Get urgent invoices (overdue or due soon)
    const urgentInvoices = invoicesList
        .filter(inv => inv.calculatedStatus === 'overdue' || inv.calculatedStatus === 'due_soon')
        .slice(0, 5);

    // Fetch scheduled steps for urgent invoices to show sequence progress
    const urgentInvoiceIds = urgentInvoices.map(inv => inv.id);
    const { data: scheduledStepsData } = await supabase
        .from('scheduled_steps')
        .select(`
            id,
            invoice_id,
            scheduled_for,
            status,
            sequence_steps (
                step_order,
                sequences (name)
            )
        `)
        .in('invoice_id', urgentInvoiceIds.length > 0 ? urgentInvoiceIds : ['none']);

    // Build sequence info map per invoice
    const sequenceInfoMap = new Map<string, {
        sequenceName: string;
        totalSteps: number;
        completedSteps: number;
        lastStepDate: string | null;
        nextStepDate: string | null;
    }>();

    if (scheduledStepsData) {
        // Group by invoice_id
        const stepsByInvoice = scheduledStepsData.reduce((acc, step) => {
            if (!acc[step.invoice_id]) acc[step.invoice_id] = [];
            acc[step.invoice_id].push(step);
            return acc;
        }, {} as Record<string, typeof scheduledStepsData>);

        for (const [invoiceId, steps] of Object.entries(stepsByInvoice)) {
            const sortedSteps = steps.sort((a, b) =>
                new Date(a.scheduled_for).getTime() - new Date(b.scheduled_for).getTime()
            );

            const seqStep = steps[0]?.sequence_steps as any;
            const sequenceName = seqStep?.sequences?.name || 'Sekwencja';

            const completedSteps = sortedSteps.filter(s => s.status === 'sent').length;
            const pendingSteps = sortedSteps.filter(s => s.status === 'pending');
            const sentSteps = sortedSteps.filter(s => s.status === 'sent');

            const lastSent = sentSteps.length > 0 ? sentSteps[sentSteps.length - 1] : null;
            const nextPending = pendingSteps.length > 0 ? pendingSteps[0] : null;

            sequenceInfoMap.set(invoiceId, {
                sequenceName,
                totalSteps: sortedSteps.length,
                completedSteps,
                lastStepDate: lastSent?.scheduled_for || null,
                nextStepDate: nextPending?.scheduled_for || null,
            });
        }
    }

    const hasData = invoicesList.length > 0 || debtorsList.length > 0;

    // Prepare chart data
    const pendingCount = invoicesList.filter(i => i.calculatedStatus === 'pending' || i.calculatedStatus === 'due_soon').length;
    const overdueCount = overdueInvoices.length;
    const partialCount = invoicesList.filter(i => i.calculatedStatus === 'partial').length;
    const paidCount = paidInvoices.length;

    const statusChartData = [
        { name: 'Oczekujące', value: pendingCount, color: '#3b82f6' },
        { name: 'Przeterminowane', value: overdueCount, color: '#ef4444' },
        { name: 'Częściowe', value: partialCount, color: '#f59e0b' },
        { name: 'Opłacone', value: paidCount, color: '#22c55e' },
    ].filter(s => s.value > 0);

    // Monthly receivables data (simplified - current month snapshot)
    const currentMonth = new Date().toLocaleString('pl-PL', { month: 'short' });
    const receivablesData = [
        {
            month: currentMonth,
            total: totalReceivables + recoveredThisMonth,
            overdue: overdueReceivables,
            recovered: recoveredThisMonth
        },
    ];

    // Cash flow predictions based on pending invoices
    const predictions = [
        { period: 'Ten tydzień', expected: Math.round(totalReceivables * 0.2), probability: 75 },
        { period: 'Przyszły tydzień', expected: Math.round(totalReceivables * 0.15), probability: 60 },
        { period: 'Za 2 tygodnie', expected: Math.round(totalReceivables * 0.1), probability: 45 },
        { period: 'Za miesiąc', expected: Math.round(totalReceivables * 0.3), probability: 30 },
    ].filter(p => p.expected > 0);

    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold">
                        Witaj{profile?.full_name ? `, ${profile.full_name.split(' ')[0]}` : ''}! 👋
                    </h1>
                    <p className="text-muted-foreground mt-1">
                        Oto podsumowanie Twoich należności
                    </p>
                </div>
                <div className="flex gap-2">
                    <Link href="/history">
                        <Button variant="outline">
                            <History className="h-4 w-4 mr-2" />
                            Historia
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

            {/* Empty state for new users */}
            {!hasData && (
                <Card className="py-12 bg-gradient-to-br from-primary/5 to-primary/10">
                    <CardContent className="text-center">
                        <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-primary/10 flex items-center justify-center">
                            <Sparkles className="h-10 w-10 text-primary" />
                        </div>
                        <h2 className="text-2xl font-bold mb-2">Witaj w VindycAItion!</h2>
                        <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                            Zacznij od dodania kontrahentów i faktur, a system automatycznie pomoże Ci odzyskać należności.
                        </p>
                        <div className="flex flex-wrap justify-center gap-4">
                            <Link href="/debtors/new">
                                <Button variant="outline">
                                    <Users className="h-4 w-4 mr-2" />
                                    Dodaj kontrahenta
                                </Button>
                            </Link>
                            <Link href="/invoices/new">
                                <Button>
                                    <FileText className="h-4 w-4 mr-2" />
                                    Dodaj fakturę
                                </Button>
                            </Link>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* KPI Cards */}
            {hasData && (
                <>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between pb-2">
                                <CardTitle className="text-sm font-medium text-muted-foreground">
                                    Do odzyskania
                                </CardTitle>
                                <Clock className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{formatCurrency(totalReceivables)}</div>
                                <p className="text-xs text-muted-foreground">{unpaidInvoices.length} nieopłaconych faktur</p>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between pb-2">
                                <CardTitle className="text-sm font-medium text-muted-foreground">
                                    Przeterminowane
                                </CardTitle>
                                <AlertTriangle className="h-4 w-4 text-red-500" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold text-red-600">{formatCurrency(overdueReceivables)}</div>
                                <p className="text-xs text-muted-foreground">{overdueInvoices.length} przeterminowanych</p>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between pb-2">
                                <CardTitle className="text-sm font-medium text-muted-foreground">
                                    Odzyskano
                                </CardTitle>
                                <CheckCircle className="h-4 w-4 text-green-500" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold text-green-600">{formatCurrency(recoveredThisMonth)}</div>
                                <p className="text-xs text-muted-foreground">{paidInvoices.length} opłaconych faktur</p>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between pb-2">
                                <CardTitle className="text-sm font-medium text-muted-foreground">
                                    Kontrahenci
                                </CardTitle>
                                <Users className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{debtorsList.length}</div>
                                <p className="text-xs text-muted-foreground">aktywnych kontrahentów</p>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Urgent invoices */}
                    {urgentInvoices.length > 0 && (
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between">
                                <div>
                                    <CardTitle>Pilne faktury</CardTitle>
                                    <CardDescription>Wymagają uwagi</CardDescription>
                                </div>
                                <Link href="/invoices">
                                    <Button variant="ghost" size="sm">
                                        Zobacz wszystkie
                                        <ArrowRight className="h-4 w-4 ml-2" />
                                    </Button>
                                </Link>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-3">
                                    {urgentInvoices.map((invoice) => {
                                        const seqInfo = sequenceInfoMap.get(invoice.id);

                                        return (
                                            <Link key={invoice.id} href={`/invoices/${invoice.id}`}>
                                                <div className="flex items-start justify-between p-4 bg-muted/50 rounded-lg hover:bg-muted transition-colors">
                                                    <div className="flex-1">
                                                        <div className="flex items-center gap-2">
                                                            <p className="font-medium">{invoice.invoice_number}</p>
                                                            {seqInfo && (
                                                                <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">
                                                                    {seqInfo.sequenceName}
                                                                </span>
                                                            )}
                                                        </div>
                                                        <p className="text-sm text-muted-foreground">
                                                            {(invoice.debtors as any)?.name || 'Nieznany'} • {formatDate(invoice.due_date)}
                                                        </p>
                                                        {invoice.daysOverdue > 0 && (
                                                            <p className="text-xs text-red-600">
                                                                {invoice.daysOverdue} dni po terminie
                                                            </p>
                                                        )}
                                                        {seqInfo && (
                                                            <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                                                                <span className="font-medium text-foreground">
                                                                    Krok {seqInfo.completedSteps}/{seqInfo.totalSteps}
                                                                </span>
                                                                {seqInfo.lastStepDate && (
                                                                    <span>Ostatni: {formatDate(seqInfo.lastStepDate)}</span>
                                                                )}
                                                                {seqInfo.nextStepDate && (
                                                                    <span className="text-primary">Następny: {formatDate(seqInfo.nextStepDate)}</span>
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div className="text-right flex items-center gap-4">
                                                        <p className="font-semibold">{formatCurrency(invoice.amount)}</p>
                                                        <StatusBadge status={invoice.calculatedStatus} />
                                                    </div>
                                                </div>
                                            </Link>
                                        );
                                    })}
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* Quick actions */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <Link href="/invoices/new">
                            <Card className="hover:border-primary/50 transition-colors cursor-pointer h-full">
                                <CardContent className="pt-6 text-center">
                                    <FileText className="h-8 w-8 mx-auto mb-2 text-primary" />
                                    <p className="font-medium">Dodaj fakturę</p>
                                    <p className="text-sm text-muted-foreground">Wprowadź nową należność</p>
                                </CardContent>
                            </Card>
                        </Link>
                        <Link href="/ai-generator">
                            <Card className="hover:border-primary/50 transition-colors cursor-pointer h-full">
                                <CardContent className="pt-6 text-center">
                                    <Sparkles className="h-8 w-8 mx-auto mb-2 text-primary" />
                                    <p className="font-medium">Generator AI</p>
                                    <p className="text-sm text-muted-foreground">Wygeneruj wezwanie</p>
                                </CardContent>
                            </Card>
                        </Link>
                        <Link href="/reports">
                            <Card className="hover:border-primary/50 transition-colors cursor-pointer h-full">
                                <CardContent className="pt-6 text-center">
                                    <TrendingUp className="h-8 w-8 mx-auto mb-2 text-primary" />
                                    <p className="font-medium">Raporty</p>
                                    <p className="text-sm text-muted-foreground">Analiza skuteczności</p>
                                </CardContent>
                            </Card>
                        </Link>
                    </div>

                    {/* Charts */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <ReceivablesChart data={receivablesData} />
                        <StatusPieChart data={statusChartData} />
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <ActivityChart />
                        <CashFlowPrediction predictions={predictions} />
                    </div>
                </>
            )}
        </div>
    );
}
