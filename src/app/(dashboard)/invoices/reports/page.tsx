import { BarChart3, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Breadcrumbs } from '@/components/shared/breadcrumbs';
import { formatCurrency } from '@/lib/utils/format-currency';
import { createClient } from '@/lib/supabase/server';
import { getActualInvoiceStatus, calculateDebtorStats } from '@/lib/utils/invoice-calculations';
import { ReceivablesChart, StatusPieChart, ActivityChart } from '@/components/dashboard/charts';
import { DSOChart } from '@/components/analytics/dso-chart';
import { RevenueConcentrationChart } from '@/components/analytics/revenue-concentration';

export default async function SalesReportsPage() {
    const supabase = await createClient();

    // Fetch invoices for calculations
    const { data: invoices } = await supabase
        .from('invoices')
        .select('amount, amount_paid, status, due_date, issue_date, paid_at, debtor_id, debtors(name)');

    // Fetch debtors with their invoices for stats
    const { data: debtors } = await supabase
        .from('debtors')
        .select(`
            id, name,
            invoices (amount, amount_paid, status, due_date)
        `)
        .order('created_at', { ascending: false });

    const { data: actions } = await supabase
        .from('collection_actions')
        .select('action_type, status, created_at, sent_at')
        .order('created_at', { ascending: false });

    const invoicesList = (invoices || []).map(inv => ({
        ...inv,
        calculatedStatus: getActualInvoiceStatus(inv),
    }));
    const actionsList = actions || [];

    // Calculate stats using dynamic status
    const totalPending = invoicesList
        .filter(i => i.calculatedStatus !== 'paid')
        .reduce((sum, i) => sum + Number(i.amount) - Number(i.amount_paid || 0), 0);

    const overdueAmount = invoicesList
        .filter(i => i.calculatedStatus === 'overdue')
        .reduce((sum, i) => sum + Number(i.amount) - Number(i.amount_paid || 0), 0);

    const emailsSent = actionsList.filter(a => a.action_type === 'email' && a.status === 'sent').length;
    const smsSent = actionsList.filter(a => a.action_type === 'sms' && a.status === 'sent').length;
    const totalMessagesSent = emailsSent + smsSent;

    const paidInvoices = invoicesList.filter(i => i.calculatedStatus === 'paid').length;
    const totalInvoices = invoicesList.length;
    const successRate = totalInvoices > 0 ? Math.round((paidInvoices / totalInvoices) * 100) : 0;

    // Calculate top debtors with dynamic stats
    const debtorsWithStats = (debtors || []).map(debtor => {
        const debtorInvoices = (debtor.invoices || []) as Array<{
            amount: number;
            amount_paid: number | null;
            status: string;
            due_date: string;
        }>;
        const stats = calculateDebtorStats(debtorInvoices);
        return {
            id: debtor.id,
            name: debtor.name,
            ...stats,
        };
    }).filter(d => d.totalDebt > 0)
        .sort((a, b) => b.totalDebt - a.totalDebt)
        .slice(0, 5);

    const hasInvoicesData = invoicesList.length > 0;

    // Prepare chart data for reports
    const pendingCount = invoicesList.filter(i => i.calculatedStatus === 'pending' || i.calculatedStatus === 'due_soon').length;
    const overdueCount = invoicesList.filter(i => i.calculatedStatus === 'overdue').length;
    const partialCount = invoicesList.filter(i => i.calculatedStatus === 'partial').length;
    const paidCount = paidInvoices;

    const statusChartData = [
        { name: 'Oczekujące', value: pendingCount, color: '#3b82f6' },
        { name: 'Przeterminowane', value: overdueCount, color: '#ef4444' },
        { name: 'Częściowe', value: partialCount, color: '#f59e0b' },
        { name: 'Opłacone', value: paidCount, color: '#22c55e' },
    ].filter(s => s.value > 0);

    // Helper functions for date formatting
    const formatDay = (date: Date) => {
        const days = ['Nd', 'Pon', 'Wt', 'Śr', 'Czw', 'Pt', 'Sob'];
        return days[date.getDay()];
    };

    const formatWeek = (date: Date) => {
        const day = date.getDate();
        const month = date.toLocaleString('pl-PL', { month: 'short' });
        return `${day} ${month}`;
    };

    const formatMonth = (date: Date) => {
        return date.toLocaleString('pl-PL', { month: 'short' });
    };

    // Generate DAILY data: Issued, Paid, Pending, Debt (cumulative)
    const generateDailyData = () => {
        const data = [];
        const today = new Date();
        for (let i = -3; i <= 3; i++) {
            const date = new Date(today);
            date.setDate(date.getDate() + i);
            const dayStr = date.toISOString().split('T')[0];
            const periodEnd = new Date(date);
            periodEnd.setHours(23, 59, 59, 999);

            // Issued = invoices due on this specific day
            const dayInvoices = invoicesList.filter(inv => {
                const invDate = new Date(inv.due_date).toISOString().split('T')[0];
                return invDate === dayStr;
            });
            const issued = dayInvoices.reduce((sum, i) => sum + Number(i.amount), 0);

            // Paid = paid invoices due on this specific day
            const paid = dayInvoices
                .filter(inv => inv.calculatedStatus === 'paid')
                .reduce((sum, i) => sum + Number(i.amount), 0);

            // Pending = invoices that are pending (not paid, not overdue) due on this day
            const pending = dayInvoices
                .filter(inv => inv.calculatedStatus === 'pending')
                .reduce((sum, i) => sum + Number(i.amount), 0);

            // Debt (cumulative) = all overdue invoices up to this day
            const debt = invoicesList
                .filter(inv => new Date(inv.due_date) <= periodEnd && inv.calculatedStatus === 'overdue')
                .reduce((sum, i) => sum + Number(i.amount) - Number(i.amount_paid || 0), 0);

            data.push({ day: formatDay(date), issued, paid, pending, debt });
        }
        return data;
    };

    // Generate WEEKLY data
    const generateWeeklyData = () => {
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
            const issued = weekInvoices.reduce((sum, inv) => sum + Number(inv.amount), 0);

            const paid = weekInvoices
                .filter(inv => inv.calculatedStatus === 'paid')
                .reduce((sum, inv) => sum + Number(inv.amount), 0);

            const pending = weekInvoices
                .filter(inv => inv.calculatedStatus === 'pending')
                .reduce((sum, inv) => sum + Number(inv.amount), 0);

            const debt = invoicesList
                .filter(inv => new Date(inv.due_date) <= weekEnd && inv.calculatedStatus === 'overdue')
                .reduce((sum, inv) => sum + Number(inv.amount) - Number(inv.amount_paid || 0), 0);

            data.push({ week: formatWeek(weekStart), issued, paid, pending, debt });
        }
        return data;
    };

    // Generate MONTHLY data
    const generateMonthlyData = () => {
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
            const issued = monthInvoices.reduce((sum, inv) => sum + Number(inv.amount), 0);

            const paid = monthInvoices
                .filter(inv => inv.calculatedStatus === 'paid')
                .reduce((sum, inv) => sum + Number(inv.amount), 0);

            const pending = monthInvoices
                .filter(inv => inv.calculatedStatus === 'pending')
                .reduce((sum, inv) => sum + Number(inv.amount), 0);

            const debt = invoicesList
                .filter(inv => new Date(inv.due_date) <= monthEnd && inv.calculatedStatus === 'overdue')
                .reduce((sum, inv) => sum + Number(inv.amount) - Number(inv.amount_paid || 0), 0);

            data.push({ month: formatMonth(monthDate), issued, paid, pending, debt });
        }
        return data;
    };

    const dailyReceivablesData = generateDailyData();
    const weeklyReceivablesData = generateWeeklyData();
    const monthlyReceivablesData = generateMonthlyData();

    // ADVANCED ANALYTICS: DSO & REVENUE CONCENTRATION

    // 1. DSO Calculation (Days Sales Outstanding Trend) - Monthly
    const generateDSOData = () => {
        const data: Map<string, { totalDays: number, count: number }> = new Map();
        const today = new Date();

        // Initialize last 6 months
        for (let i = -5; i <= 0; i++) {
            const d = new Date(today.getFullYear(), today.getMonth() + i, 1);
            const key = formatMonth(d);
            data.set(key, { totalDays: 0, count: 0 });
        }

        invoicesList.forEach(inv => {
            if (inv.paid_at && inv.issue_date) {
                const paidDate = new Date(inv.paid_at);
                const issueDate = new Date(inv.issue_date);
                const daysToPay = Math.ceil((paidDate.getTime() - issueDate.getTime()) / (1000 * 60 * 60 * 24));

                // Group by PAID month (when the money came in)
                const key = formatMonth(paidDate);

                if (data.has(key)) {
                    const entry = data.get(key)!;
                    entry.totalDays += daysToPay;
                    entry.count += 1;
                }
            }
        });

        return Array.from(data.entries()).map(([month, val]) => ({
            month,
            days: val.count > 0 ? Math.round(val.totalDays / val.count) : 0
        }));
    };

    const dsoData = generateDSOData();

    // 2. Revenue Concentration (Top 5 Clients)
    const generateRevenueConcentrationData = () => {
        const debtorRevenue: Map<string, number> = new Map();

        invoicesList.forEach(inv => {
            const debtorName = (inv.debtors as any)?.name || 'Nieznany';
            const amount = Number(inv.amount);
            const current = debtorRevenue.get(debtorName) || 0;
            debtorRevenue.set(debtorName, current + amount);
        });

        const totalRevenue = Array.from(debtorRevenue.values()).reduce((a, b) => a + b, 0);

        return Array.from(debtorRevenue.entries())
            .map(([name, amount]) => ({
                name,
                amount,
                percentage: totalRevenue > 0 ? (amount / totalRevenue) * 100 : 0
            }))
            .sort((a, b) => b.amount - a.amount)
            .slice(0, 5);
    };

    const revenueConcentrationData = generateRevenueConcentrationData();


    // Activity Chart Logic
    const allSentActions = actionsList.filter(a => a.status === 'sent') || [];

    const dailyActivityData = Array.from({ length: 24 }, (_, hour) => ({
        hour: `${hour}:00`,
        emails: allSentActions.filter(a => {
            const d = new Date(a.sent_at || a.created_at);
            const today = new Date();
            return d.getHours() === hour && d.toDateString() === today.toDateString() && a.action_type === 'email';
        }).length,
        sms: allSentActions.filter(a => {
            const d = new Date(a.sent_at || a.created_at);
            const today = new Date();
            return d.getHours() === hour && d.toDateString() === today.toDateString() && a.action_type === 'sms';
        }).length,
    })).filter((_, i) => i >= 8 && i <= 18);

    const dayNames = ['Nd', 'Pon', 'Wt', 'Śr', 'Czw', 'Pt', 'Sob'];
    const activityByDay: Record<string, { emails: number; sms: number }> = {};
    dayNames.forEach(day => { activityByDay[day] = { emails: 0, sms: 0 }; });

    allSentActions.forEach(action => {
        const date = new Date(action.sent_at || action.created_at);
        const dayName = dayNames[date.getDay()];
        if (action.action_type === 'email') activityByDay[dayName].emails++;
        if (action.action_type === 'sms') activityByDay[dayName].sms++;
    });

    const weeklyActivityData = ['Pon', 'Wt', 'Śr', 'Czw', 'Pt'].map(day => ({
        day,
        emails: activityByDay[day].emails,
        sms: activityByDay[day].sms
    }));

    const monthlyActivityData = (() => {
        const data = [];
        const today = new Date();
        for (let i = 3; i >= 0; i--) {
            const weekStart = new Date(today);
            weekStart.setDate(weekStart.getDate() - (i * 7));
            const weekEnd = new Date(weekStart);
            weekEnd.setDate(weekEnd.getDate() + 6);
            const weekActions = allSentActions.filter(a => {
                const d = new Date(a.sent_at || a.created_at);
                return d >= weekStart && d <= weekEnd;
            });
            const emailCount = weekActions.filter(a => a.action_type === 'email').length;
            const smsCount = weekActions.filter(a => a.action_type === 'sms').length;
            data.push({ week: `Tydz. ${4 - i}`, emails: emailCount, sms: smsCount });
        }
        return data;
    })();

    return (
        <div className="space-y-6">
            <Breadcrumbs />

            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold">Raporty Sprzedaży</h1>
                    <p className="text-muted-foreground mt-1">
                        Analiza skuteczności windykacji i przychodów
                    </p>
                </div>
                <div className="flex gap-2">
                    <Select defaultValue="month">
                        <SelectTrigger className="w-[180px]">
                            <SelectValue placeholder="Okres" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="week">Ostatni tydzień</SelectItem>
                            <SelectItem value="month">Ostatni miesiąc</SelectItem>
                            <SelectItem value="quarter">Ostatni kwartał</SelectItem>
                            <SelectItem value="year">Ostatni rok</SelectItem>
                        </SelectContent>
                    </Select>

                </div>
            </div>

            {/* Empty state */}
            {!hasInvoicesData && (
                <Card className="py-12">
                    <CardContent className="text-center">
                        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
                            <BarChart3 className="h-8 w-8 text-muted-foreground" />
                        </div>
                        <h3 className="text-lg font-medium mb-2">Brak danych przychodowych</h3>
                        <p className="text-muted-foreground">
                            Dodaj faktury sprzedaży, aby zobaczyć statystyki windykacji
                        </p>
                    </CardContent>
                </Card>
            )}

            {hasInvoicesData && (
                <>
                    {/* Summary stats */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <Card>
                            <CardContent className="pt-6 text-center">
                                <p className="text-2xl font-bold text-amber-600">
                                    {formatCurrency(totalPending)}
                                </p>
                                <p className="text-xs text-muted-foreground">Do odzyskania</p>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardContent className="pt-6 text-center">
                                <p className="text-2xl font-bold text-red-600">
                                    {formatCurrency(overdueAmount)}
                                </p>
                                <p className="text-xs text-muted-foreground">Przeterminowane</p>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardContent className="pt-6 text-center">
                                <CardContent className="pt-6 text-center">
                                    <p className="text-2xl font-bold text-blue-600">{totalMessagesSent}</p>
                                    <p className="text-xs text-muted-foreground">Wysłanych wiadomości</p>
                                </CardContent>
                            </CardContent>
                        </Card>
                    </div>

                    {/* NEW: Advanced Analytics Charts */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <DSOChart data={dsoData} />
                        <RevenueConcentrationChart data={revenueConcentrationData} />
                    </div>

                    {/* Charts Grid 1: Revenue & Activity */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <ReceivablesChart
                            data={monthlyReceivablesData}
                            dailyData={dailyReceivablesData}
                            weeklyData={weeklyReceivablesData}
                        />
                        <ActivityChart
                            data={weeklyActivityData}
                            dailyData={dailyActivityData}
                            monthlyData={monthlyActivityData}
                        />
                    </div>

                    {/* Charts Grid 2: Status & Top Debtors */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <StatusPieChart data={statusChartData} />

                        {debtorsWithStats.length > 0 && (
                            <Card className="h-full">
                                <CardHeader>
                                    <CardTitle>Najwięksi dłużnicy (Wg. zadłużenia)</CardTitle>
                                    <CardDescription>Kontrahenci z największym zadłużeniem</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-4">
                                        {debtorsWithStats.map((debtor, i) => (
                                            <div key={debtor.id} className="flex items-center justify-between">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-sm font-medium">
                                                        {i + 1}
                                                    </div>
                                                    <div>
                                                        <p className="font-medium">{debtor.name}</p>
                                                        <p className="text-xs text-muted-foreground">
                                                            {debtor.overdueInvoices > 0 && (
                                                                <span className="text-red-600">{debtor.overdueInvoices} przeterminowanych • </span>
                                                            )}
                                                            {debtor.totalInvoices} faktur
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <p className="font-semibold">{formatCurrency(debtor.totalDebt)}</p>
                                                    <p className={`text-xs ${debtor.paymentScore >= 50 ? 'text-green-600' : 'text-red-600'}`}>
                                                        Score: {debtor.paymentScore}
                                                    </p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>
                        )}
                    </div>

                    {/* Success rate */}
                    <Card>
                        <CardContent className="pt-6">
                            <div className="flex items-center justify-between mb-4">
                                <div>
                                    <p className="text-sm text-muted-foreground">Skuteczność windykacji</p>
                                    <p className="text-3xl font-bold text-green-600">{successRate}%</p>
                                </div>
                                <div className="text-right text-sm text-muted-foreground">
                                    <p>{paidInvoices} opłaconych</p>
                                    <p>z {totalInvoices} faktur</p>
                                </div>
                            </div>
                            <div className="w-full bg-muted rounded-full h-3">
                                <div
                                    className="h-3 rounded-full bg-green-500 transition-all"
                                    style={{ width: `${successRate}%` }}
                                />
                            </div>
                        </CardContent>
                    </Card>


                </>
            )}
        </div>
    );
}
