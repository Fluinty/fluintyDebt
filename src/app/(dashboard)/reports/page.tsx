import { Download, FileText, TrendingUp, Users, BarChart3 } from 'lucide-react';
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

export default async function ReportsPage() {
    const supabase = await createClient();

    // Fetch invoices for calculations
    const { data: invoices } = await supabase
        .from('invoices')
        .select('amount, amount_paid, status, due_date');

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
        .select('action_type, status');

    const invoicesList = (invoices || []).map(inv => ({
        ...inv,
        calculatedStatus: getActualInvoiceStatus(inv),
    }));
    const actionsList = actions || [];

    // Calculate stats using dynamic status
    const totalRecovered = invoicesList
        .filter(i => i.calculatedStatus === 'paid')
        .reduce((sum, i) => sum + Number(i.amount), 0);

    const totalPending = invoicesList
        .filter(i => i.calculatedStatus !== 'paid')
        .reduce((sum, i) => sum + Number(i.amount) - Number(i.amount_paid || 0), 0);

    const overdueAmount = invoicesList
        .filter(i => i.calculatedStatus === 'overdue')
        .reduce((sum, i) => sum + Number(i.amount) - Number(i.amount_paid || 0), 0);

    const emailsSent = actionsList.filter(a => a.action_type === 'email' && a.status === 'sent').length;
    const smsSent = actionsList.filter(a => a.action_type === 'sms' && a.status === 'sent').length;

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

    const hasData = invoicesList.length > 0;

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

    // Generate DAILY data (7 days - full week)
    const generateDailyData = () => {
        const data = [];
        const today = new Date();
        for (let i = 6; i >= 0; i--) {
            const date = new Date(today);
            date.setDate(date.getDate() - i);
            const dayStr = date.toISOString().split('T')[0];

            // Filter invoices for this day (by due_date or created_at approximation)
            const dayInvoices = invoicesList.filter(inv => {
                const invDate = new Date(inv.due_date).toISOString().split('T')[0];
                return invDate === dayStr;
            });

            const total = dayInvoices.reduce((sum, i) => sum + Number(i.amount), 0);
            const overdue = dayInvoices.filter(i => i.calculatedStatus === 'overdue')
                .reduce((sum, i) => sum + Number(i.amount) - Number(i.amount_paid || 0), 0);
            const recovered = dayInvoices.filter(i => i.calculatedStatus === 'paid')
                .reduce((sum, i) => sum + Number(i.amount), 0);

            data.push({ day: formatDay(date), total, overdue, recovered });
        }
        return data;
    };

    // Generate WEEKLY data (9 weeks - 8 past + current)
    const generateWeeklyData = () => {
        const data = [];
        const today = new Date();
        for (let i = 8; i >= 0; i--) {
            const weekStart = new Date(today);
            weekStart.setDate(weekStart.getDate() - (i * 7));
            const weekEnd = new Date(weekStart);
            weekEnd.setDate(weekEnd.getDate() + 6);

            // Filter invoices for this week
            const weekInvoices = invoicesList.filter(inv => {
                const invDate = new Date(inv.due_date);
                return invDate >= weekStart && invDate <= weekEnd;
            });

            const total = weekInvoices.reduce((sum, inv) => sum + Number(inv.amount), 0);
            const overdue = weekInvoices.filter(inv => inv.calculatedStatus === 'overdue')
                .reduce((sum, inv) => sum + Number(inv.amount) - Number(inv.amount_paid || 0), 0);
            const recovered = weekInvoices.filter(inv => inv.calculatedStatus === 'paid')
                .reduce((sum, inv) => sum + Number(inv.amount), 0);

            data.push({ week: formatWeek(weekStart), total, overdue, recovered });
        }
        return data;
    };

    // Generate MONTHLY data (12 months - 11 past + current)
    const generateMonthlyData = () => {
        const data = [];
        const today = new Date();
        for (let i = 11; i >= 0; i--) {
            const monthDate = new Date(today.getFullYear(), today.getMonth() - i, 1);
            const monthEnd = new Date(today.getFullYear(), today.getMonth() - i + 1, 0);

            // Filter invoices for this month
            const monthInvoices = invoicesList.filter(inv => {
                const invDate = new Date(inv.due_date);
                return invDate >= monthDate && invDate <= monthEnd;
            });

            const total = monthInvoices.reduce((sum, inv) => sum + Number(inv.amount), 0);
            const overdue = monthInvoices.filter(inv => inv.calculatedStatus === 'overdue')
                .reduce((sum, inv) => sum + Number(inv.amount) - Number(inv.amount_paid || 0), 0);
            const recovered = monthInvoices.filter(inv => inv.calculatedStatus === 'paid')
                .reduce((sum, inv) => sum + Number(inv.amount), 0);

            data.push({ month: formatMonth(monthDate), total, overdue, recovered });
        }
        return data;
    };

    const dailyReceivablesData = generateDailyData();
    const weeklyReceivablesData = generateWeeklyData();
    const monthlyReceivablesData = generateMonthlyData();

    return (
        <div className="space-y-6">
            <Breadcrumbs />

            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold">Raporty</h1>
                    <p className="text-muted-foreground mt-1">
                        Analiza skuteczności windykacji
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
                    <Button variant="outline">
                        <Download className="h-4 w-4 mr-2" />
                        Eksportuj
                    </Button>
                </div>
            </div>

            {/* Empty state */}
            {!hasData && (
                <Card className="py-12">
                    <CardContent className="text-center">
                        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
                            <BarChart3 className="h-8 w-8 text-muted-foreground" />
                        </div>
                        <h3 className="text-lg font-medium mb-2">Brak danych do raportów</h3>
                        <p className="text-muted-foreground">
                            Dodaj faktury i kontrahentów, a tutaj pojawią się statystyki
                        </p>
                    </CardContent>
                </Card>
            )}

            {hasData && (
                <>
                    {/* Summary stats */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <Card>
                            <CardContent className="pt-6 text-center">
                                <p className="text-2xl font-bold text-green-600">
                                    {formatCurrency(totalRecovered)}
                                </p>
                                <p className="text-xs text-muted-foreground">Odzyskano łącznie</p>
                            </CardContent>
                        </Card>
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
                                <p className="text-2xl font-bold text-blue-600">{emailsSent + smsSent}</p>
                                <p className="text-xs text-muted-foreground">Wysłanych wiadomości</p>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Charts */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <ReceivablesChart
                            data={monthlyReceivablesData}
                            dailyData={dailyReceivablesData}
                            weeklyData={weeklyReceivablesData}
                        />
                        <StatusPieChart data={statusChartData} />
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

                    {/* Top debtors */}
                    {debtorsWithStats.length > 0 && (
                        <Card>
                            <CardHeader>
                                <CardTitle>Najwięksi dłużnicy</CardTitle>
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

                    {/* Quick reports */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Szybkie raporty</CardTitle>
                            <CardDescription>Pobierz gotowe raporty</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <Button variant="outline" className="h-auto py-4 flex-col gap-2">
                                    <FileText className="h-6 w-6" />
                                    <span>Raport należności</span>
                                    <span className="text-xs text-muted-foreground">PDF</span>
                                </Button>
                                <Button variant="outline" className="h-auto py-4 flex-col gap-2">
                                    <Users className="h-6 w-6" />
                                    <span>Lista dłużników</span>
                                    <span className="text-xs text-muted-foreground">Excel</span>
                                </Button>
                                <Button variant="outline" className="h-auto py-4 flex-col gap-2">
                                    <TrendingUp className="h-6 w-6" />
                                    <span>Analiza skuteczności</span>
                                    <span className="text-xs text-muted-foreground">PDF</span>
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </>
            )}
        </div>
    );
}
