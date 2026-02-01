import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
    TrendingUp,
    Clock,
    AlertTriangle,
    Plus,
    ArrowRight,
    FileText,
    Mail,
    Edit,
    TrendingDown,
    Lock,
} from 'lucide-react';
import Link from 'next/link';
import { formatCurrency } from '@/lib/utils/format-currency';
import { createClient } from '@/lib/supabase/server';
import { getActualInvoiceStatus, getDaysOverdue } from '@/lib/utils/invoice-calculations';
import { StatusBadge } from '@/components/invoices/status-badge';
import { ReceivablesChart } from '@/components/dashboard/charts';
import { CostTrendChart } from '@/components/dashboard/cost-charts';

import { UpcomingWeek } from '@/components/dashboard/upcoming-week';
import { KSeFImportButton } from '@/components/ksef/ksef-import-button';
import { UsageWidget } from '@/components/dashboard/usage-widget';
import { MissingDataAlerts } from '@/components/dashboard/missing-data-alerts';

export default async function DashboardPage() {
    const supabase = await createClient();

    // Fetch user profile
    const { data: { user } } = await supabase.auth.getUser();

    // Fetch profile with current_balance
    const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user?.id)
        .single();

    // Fetch real stats from database (Sales)
    const { data: invoices } = await supabase
        .from('invoices')
        .select('id, invoice_number, amount, amount_net, vat_rate, vat_amount, amount_gross, amount_paid, status, due_date, issue_date, debtor_id, debtors(name)') // Added issue_date
        .order('due_date', { ascending: true });

    // Fetch cost invoices
    const { data: costInvoices } = await supabase
        .from('cost_invoices')
        .select('*')
        .order('due_date', { ascending: true });

    const { data: debtors } = await supabase
        .from('debtors')
        .select('id, name, email, phone, nip');

    // Fetch KSeF settings to check if configured
    const { data: ksefSettings } = await supabase
        .from('user_ksef_settings')
        .select('is_enabled, ksef_token_encrypted')
        .eq('user_id', user?.id)
        .single();

    // Fetch subscription for usage limits (safely handle missing table)
    const { data: subscription } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', user?.id)
        .single();

    const invoicesList = (invoices || []).map(inv => ({
        ...inv,
        calculatedStatus: getActualInvoiceStatus(inv),
        daysOverdue: getDaysOverdue(inv.due_date),
    }));
    const costInvoicesList = costInvoices || [];
    const debtorsList = debtors || [];

    // Check enabled modules
    const modules = (profile?.modules as { sales?: boolean; costs?: boolean }) || { sales: true, costs: true };
    const showSales = modules.sales !== false;
    const showCosts = modules.costs !== false;

    // Calculate debtors with unpaid invoices
    const debtorIdsWithUnpaidInvoices = new Set(
        invoicesList
            .filter(inv => inv.calculatedStatus !== 'paid')
            .map(inv => inv.debtor_id)
    );

    // Calculate action items - things that need user attention
    const debtorsWithoutEmail = debtorsList.filter(d => !d.email);
    const isKSeFConfigured = !!ksefSettings?.ksef_token_encrypted;

    const actionItems: Array<{
        id: string;
        type: 'missing_email' | 'ksef_not_configured';
        title: string;
        description: string;
        link: string;
        icon: typeof Mail;
        color: string;
    }> = [];

    // REMOVED legacy email checks here as they are now handled by MissingDataAlerts
    // which provides better visibility for both Email and Phone gaps

    // Add KSeF action if not configured
    if (!isKSeFConfigured && debtorsList.length > 0) {
        actionItems.unshift({
            id: 'ksef-config',
            type: 'ksef_not_configured' as const,
            title: 'Skonfiguruj KSeF',
            description: 'Automatycznie importuj faktury',
            link: '/settings',
            icon: FileText,
            color: 'text-emerald-500',
        });
    }

    // Calculate stats with dynamic statuses
    const unpaidInvoices = invoicesList.filter(inv => inv.calculatedStatus !== 'paid');
    const overdueInvoices = invoicesList.filter(inv => inv.calculatedStatus === 'overdue');
    const paidInvoices = invoicesList.filter(inv => inv.calculatedStatus === 'paid');

    const totalReceivables = unpaidInvoices.reduce((sum, inv) => sum + Number(inv.amount_gross || inv.amount) - Number(inv.amount_paid || 0), 0);
    const totalPayables = costInvoicesList
        .filter(inv => inv.payment_status !== 'paid')
        .reduce((sum, inv) => sum + Number(inv.amount), 0);

    // Get urgent invoices (overdue or due soon)
    const urgentInvoices = invoicesList
        .filter(inv => inv.calculatedStatus === 'overdue' || inv.calculatedStatus === 'due_soon')
        .slice(0, 5);

    // Prepare data for UpcomingWeek
    const upcomingSalesInvoices = showSales ? invoicesList
        .filter(inv => inv.calculatedStatus !== 'paid')
        .map(inv => ({
            id: inv.id,
            invoice_number: inv.invoice_number,
            amount: inv.amount,
            amount_gross: inv.amount_gross,
            due_date: inv.due_date,
            clientName: (inv.debtors as any)?.name || 'Nieznany klient',
        })) : [];

    const upcomingCostInvoices = showCosts ? costInvoicesList
        .filter(inv => inv.payment_status !== 'paid')
        .map(inv => ({
            id: inv.id,
            invoice_number: inv.invoice_number,
            amount: inv.amount,
            amount_gross: inv.amount_gross,
            due_date: inv.due_date,
            clientName: inv.contractor_name,
        })) : [];



    // Chart logic restoration
    // Helper functions for date formatting
    const formatDayLabel = (date: Date) => ['Nd', 'Pon', 'Wt', 'Śr', 'Czw', 'Pt', 'Sob'][date.getDay()];
    const formatWeekLabel = (date: Date) => `${date.getDate()} ${date.toLocaleString('pl-PL', { month: 'short' })}`;
    const formatMonthLabel = (date: Date) => date.toLocaleString('pl-PL', { month: 'short' });

    // Generate DAILY receivables data
    const generateDailyReceivables = () => {
        const data = [];
        const today = new Date();
        for (let i = -3; i <= 3; i++) {
            const date = new Date(today);
            date.setDate(date.getDate() + i);
            const dayStr = date.toISOString().split('T')[0];
            const periodEnd = new Date(date);
            periodEnd.setHours(23, 59, 59, 999);

            const dayInvoices = invoicesList.filter(inv => new Date(inv.due_date).toISOString().startsWith(dayStr));
            const issued = dayInvoices.reduce((sum, inv) => sum + Number(inv.amount_gross || inv.amount), 0);
            const paid = dayInvoices.filter(inv => inv.calculatedStatus === 'paid').reduce((sum, inv) => sum + Number(inv.amount_gross || inv.amount), 0);
            const pending = dayInvoices.filter(inv => inv.calculatedStatus === 'pending').reduce((sum, inv) => sum + Number(inv.amount_gross || inv.amount), 0);
            const debt = invoicesList.filter(inv => new Date(inv.due_date) <= periodEnd && inv.calculatedStatus === 'overdue').reduce((sum, inv) => sum + Number(inv.amount_gross || inv.amount) - Number(inv.amount_paid || 0), 0);

            data.push({ day: formatDayLabel(date), issued, paid, pending, debt });
        }
        return data;
    };

    // Generate WEEKLY receivables data
    const generateWeeklyReceivables = () => {
        const data = [];
        const today = new Date();
        for (let i = -4; i <= 4; i++) {
            const weekStart = new Date(today);
            weekStart.setDate(weekStart.getDate() + (i * 7));
            const weekEnd = new Date(weekStart);
            weekEnd.setDate(weekEnd.getDate() + 6);
            weekEnd.setHours(23, 59, 59, 999);

            const weekInvoices = invoicesList.filter(inv => {
                const invDate = new Date(inv.due_date);
                return invDate >= weekStart && invDate <= weekEnd;
            });
            const issued = weekInvoices.reduce((sum, inv) => sum + Number(inv.amount_gross || inv.amount), 0);
            const paid = weekInvoices.filter(inv => inv.calculatedStatus === 'paid').reduce((sum, inv) => sum + Number(inv.amount_gross || inv.amount), 0);
            const pending = weekInvoices.filter(inv => inv.calculatedStatus === 'pending').reduce((sum, inv) => sum + Number(inv.amount_gross || inv.amount), 0);
            const debt = invoicesList.filter(inv => new Date(inv.due_date) <= weekEnd && inv.calculatedStatus === 'overdue').reduce((sum, inv) => sum + Number(inv.amount_gross || inv.amount) - Number(inv.amount_paid || 0), 0);

            data.push({ week: formatWeekLabel(weekStart), issued, paid, pending, debt });
        }
        return data;
    };

    // Generate MONTHLY receivables data
    const generateMonthlyReceivables = () => {
        const data = [];
        const today = new Date();
        for (let i = -6; i <= 5; i++) {
            const monthDate = new Date(today.getFullYear(), today.getMonth() + i, 1);
            const monthEnd = new Date(today.getFullYear(), today.getMonth() + i + 1, 0);
            monthEnd.setHours(23, 59, 59, 999);

            const monthInvoices = invoicesList.filter(inv => {
                const invDate = new Date(inv.due_date);
                return invDate >= monthDate && invDate <= monthEnd;
            });
            const issued = monthInvoices.reduce((sum, inv) => sum + Number(inv.amount_gross || inv.amount), 0);
            const paid = monthInvoices.filter(inv => inv.calculatedStatus === 'paid').reduce((sum, inv) => sum + Number(inv.amount_gross || inv.amount), 0);
            const pending = monthInvoices.filter(inv => inv.calculatedStatus === 'pending').reduce((sum, inv) => sum + Number(inv.amount_gross || inv.amount), 0);
            const debt = invoicesList.filter(inv => new Date(inv.due_date) <= monthEnd && inv.calculatedStatus === 'overdue').reduce((sum, inv) => sum + Number(inv.amount_gross || inv.amount) - Number(inv.amount_paid || 0), 0);

            data.push({ month: formatMonthLabel(monthDate), issued, paid, pending, debt });
        }
        return data;
    };

    // Generate Cost Trend Data (Dashboard Version)
    const generateCostTrendData = () => {
        const data: Map<string, { date: string, gross: number, paid: number }> = new Map();

        // Populate last 6 months
        const today = new Date();
        for (let i = -5; i <= 0; i++) {
            const d = new Date(today.getFullYear(), today.getMonth() + i, 1);
            const key = formatMonthLabel(d);
            data.set(key, { date: key, gross: 0, paid: 0 });
        }

        costInvoicesList.forEach(cost => {
            const d = new Date(cost.issue_date);
            const key = formatMonthLabel(d);
            if (data.has(key)) {
                const entry = data.get(key)!;
                entry.gross += Number(cost.amount_gross || cost.amount);
                if (cost.payment_status === 'paid') {
                    entry.paid += Number(cost.amount_gross || cost.amount);
                }
            }
        });

        return Array.from(data.values());
    };

    const dailyReceivablesData = generateDailyReceivables();
    const weeklyReceivablesData = generateWeeklyReceivables();
    const monthlyReceivablesData = generateMonthlyReceivables();
    const costTrendData = generateCostTrendData();

    // Always show full dashboard (removed hasData check)

    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold">
                        Witaj{profile?.full_name ? `, ${profile.full_name.split(' ')[0]}` : ''}! 👋
                    </h1>
                    <p className="text-muted-foreground mt-1">
                        Twoje centrum dowodzenia finansami
                    </p>
                </div>
                <div className="flex gap-2">
                    <KSeFImportButton
                        isConfigured={isKSeFConfigured}
                        syncMode="all"
                        variant="outline"
                        className="hidden sm:flex"
                    />
                    {showCosts && (
                        <Link href="/costs/new">
                            <Button variant="outline" className="border-red-200 hover:bg-red-50 dark:border-red-900 dark:hover:bg-red-950/30">
                                <TrendingDown className="h-4 w-4 mr-2 text-red-500" />
                                Dodaj koszt
                            </Button>
                        </Link>
                    )}
                    {showSales && (
                        <Link href="/invoices/new">
                            <Button>
                                <Plus className="h-4 w-4 mr-2" />
                                Nowa faktura
                            </Button>
                        </Link>
                    )}
                </div>
            </div>

            <>
                {/* Financial Summary & Balance Widget */}
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
                    {/* KPI Cards & Usage Widget */}
                    <div className="lg:col-span-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        {/* Usage Widget (shows only if limits exist) */}
                        {subscription && (subscription.sms_limit > 0 || subscription.calls_limit > 0) && (
                            <div className="lg:col-span-1">
                                <UsageWidget
                                    smsUsed={subscription.sms_used || 0}
                                    smsLimit={subscription.sms_limit || 0}
                                    callsUsed={subscription.calls_used || 0}
                                    callsLimit={subscription.calls_limit || 0}
                                />
                            </div>
                        )}

                        <Link href="/invoices" className="block transition-transform hover:scale-[1.01]">
                            <Card className="relative overflow-hidden h-full">
                                {!showSales && (
                                    <div className="absolute inset-0 z-50 bg-background/50 backdrop-blur-sm flex items-center justify-center">
                                        <div className="bg-background/80 p-2 rounded-full shadow-sm">
                                            <Lock className="h-4 w-4 text-muted-foreground" />
                                        </div>
                                    </div>
                                )}
                                <CardHeader className="flex flex-row items-center justify-between pb-2">
                                    <CardTitle className="text-sm font-medium text-muted-foreground">Do odzyskania</CardTitle>
                                    <TrendingUp className="h-4 w-4 text-emerald-500" />
                                </CardHeader>
                                <CardContent>
                                    <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(totalReceivables)}</div>
                                    <p className="text-xs text-muted-foreground mt-1">{unpaidInvoices.length} faktur sprzedaży</p>
                                </CardContent>
                            </Card>
                        </Link>

                        <Link href="/costs" className="block transition-transform hover:scale-[1.01]">
                            <Card className="relative overflow-hidden h-full">
                                {!showCosts && (
                                    <div className="absolute inset-0 z-50 bg-background/50 backdrop-blur-sm flex items-center justify-center">
                                        <div className="bg-background/80 p-2 rounded-full shadow-sm">
                                            <Lock className="h-4 w-4 text-muted-foreground" />
                                        </div>
                                    </div>
                                )}
                                <CardHeader className="flex flex-row items-center justify-between pb-2">
                                    <CardTitle className="text-sm font-medium text-muted-foreground">Do zapłaty</CardTitle>
                                    <TrendingDown className="h-4 w-4 text-red-500" />
                                </CardHeader>
                                <CardContent>
                                    <div className="text-2xl font-bold text-red-600 dark:text-red-400">{formatCurrency(totalPayables)}</div>
                                    <p className="text-xs text-muted-foreground mt-1">{costInvoicesList.filter(c => c.payment_status !== 'paid').length} faktur kosztowych</p>
                                </CardContent>
                            </Card>
                        </Link>

                        <Card className="relative overflow-hidden">
                            {(!showSales || !showCosts) && (
                                <div className="absolute inset-0 z-50 bg-background/50 backdrop-blur-sm flex items-center justify-center">
                                    <div className="bg-background/80 p-2 rounded-full shadow-sm">
                                        <Lock className="h-4 w-4 text-muted-foreground" />
                                    </div>
                                </div>
                            )}
                            <CardHeader className="flex flex-row items-center justify-between pb-2">
                                <CardTitle className="text-sm font-medium text-muted-foreground">Bilans (Netto)</CardTitle>
                                <Clock className="h-4 w-4 text-blue-500" />
                            </CardHeader>
                            <CardContent>
                                <div className={`text-2xl font-bold ${totalReceivables - totalPayables >= 0 ? 'text-primary' : 'text-red-500'}`}>
                                    {formatCurrency(totalReceivables - totalPayables)}
                                </div>
                                <p className="text-xs text-muted-foreground mt-1">Należności - Zobowiązania</p>
                            </CardContent>
                        </Card>
                    </div>


                </div>


                {/* Missing Data Alerts (Email/Phone gaps) */}
                <MissingDataAlerts
                    debtors={debtorsList.map(d => ({
                        id: d.id,
                        name: d.name,
                        missingEmail: !d.email,
                        missingPhone: !d.phone // We check phones now too
                    }))}
                />

                {/* Action items */}
                {actionItems.length > 0 && (
                    <Card className="border-amber-200 dark:border-amber-900 bg-amber-50/50 dark:bg-amber-950/20 relative overflow-hidden">
                        {!showSales && (
                            <div className="absolute inset-0 z-50 bg-background/50 backdrop-blur-sm flex items-center justify-center">
                                <div className="bg-background/80 p-2 rounded-full shadow-sm">
                                    <Lock className="h-4 w-4 text-muted-foreground" />
                                </div>
                            </div>
                        )}
                        <CardHeader className="pb-3">
                            <div className="flex items-center gap-2">
                                <AlertTriangle className="h-5 w-5 text-amber-500" />
                                <CardTitle className="text-lg">Akcje do wykonania</CardTitle>
                            </div>
                            <CardDescription>
                                {actionItems.length} elementów wymaga Twojej uwagi
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                {actionItems.slice(0, 6).map((item) => (
                                    <Link key={item.id} href={item.link}>
                                        <div className="flex items-center gap-3 p-3 bg-background rounded-lg border hover:border-primary/50 transition-colors">
                                            <div className={`p-2 rounded-full bg-muted ${item.color}`}>
                                                <item.icon className="h-4 w-4" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium">{item.title}</p>
                                                <p className="text-xs text-muted-foreground truncate">{item.description}</p>
                                            </div>
                                            <Edit className="h-4 w-4 text-muted-foreground" />
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Charts Grid: Receivables & Cost Trend */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="relative rounded-xl">
                        {!showSales && (
                            <div className="absolute inset-0 z-50 bg-background/50 backdrop-blur-sm flex items-center justify-center rounded-xl">
                                <div className="bg-background/80 p-2 rounded-full shadow-sm">
                                    <Lock className="h-4 w-4 text-muted-foreground" />
                                </div>
                            </div>
                        )}
                        <ReceivablesChart
                            data={monthlyReceivablesData}
                            dailyData={dailyReceivablesData}
                            weeklyData={weeklyReceivablesData}
                        />
                    </div>

                    {/* Cost Trend (reused from Reports) */}
                    <div className="relative rounded-xl">
                        {!showCosts && (
                            <div className="absolute inset-0 z-50 bg-background/50 backdrop-blur-sm flex items-center justify-center rounded-xl">
                                <div className="bg-background/80 p-2 rounded-full shadow-sm">
                                    <Lock className="h-4 w-4 text-muted-foreground" />
                                </div>
                            </div>
                        )}
                        <CostTrendChart
                            data={costTrendData}
                        />
                    </div>
                </div>

                {/* Urgent Invoices & Upcoming Week */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Urgent Invoices */}
                    <Card className="h-full relative overflow-hidden">
                        {!showSales && (
                            <div className="absolute inset-0 z-50 bg-background/50 backdrop-blur-sm flex items-center justify-center">
                                <div className="bg-background/80 p-2 rounded-full shadow-sm">
                                    <Lock className="h-4 w-4 text-muted-foreground" />
                                </div>
                            </div>
                        )}
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-lg">Pilne faktury</CardTitle>
                            <Link href="/invoices">
                                <Button variant="ghost" size="sm">Wszystkie <ArrowRight className="ml-2 h-4 w-4" /></Button>
                            </Link>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {urgentInvoices.length > 0 ? (
                                urgentInvoices.map((invoice) => (
                                    <Link key={invoice.id} href={`/invoices/${invoice.id}`}>
                                        <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg hover:bg-muted transition-colors">
                                            <div>
                                                <p className="font-medium">{invoice.invoice_number}</p>
                                                <p className="text-sm text-muted-foreground">{(invoice.debtors as any)?.name}</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="font-bold">{formatCurrency(invoice.amount_gross || invoice.amount)}</p>
                                                <StatusBadge status={invoice.calculatedStatus} />
                                            </div>
                                        </div>
                                    </Link>
                                ))
                            ) : (
                                <p className="text-sm text-muted-foreground text-center py-4">Brak pilnych faktur</p>
                            )}
                        </CardContent>
                    </Card>

                    {/* Upcoming Week */}
                    <div>
                        <UpcomingWeek
                            salesInvoices={upcomingSalesInvoices}
                            costInvoices={upcomingCostInvoices}
                        />
                    </div>
                </div>
            </>
        </div >
    );
}
