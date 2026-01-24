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
    Mail,
    Phone,
    Edit,
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
        .select('id, invoice_number, amount, amount_net, vat_rate, vat_amount, amount_gross, amount_paid, status, due_date, debtor_id, debtors(name)')
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

    // Fetch sent messages for ActivityChart (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const { data: sentActions } = await supabase
        .from('collection_actions')
        .select('action_type, sent_at, created_at')
        .eq('status', 'sent')
        .gte('created_at', sevenDaysAgo.toISOString());

    const invoicesList = (invoices || []).map(inv => ({
        ...inv,
        calculatedStatus: getActualInvoiceStatus(inv),
        daysOverdue: getDaysOverdue(inv.due_date),
    }));
    const debtorsList = debtors || [];

    // Calculate debtors with unpaid invoices
    const debtorIdsWithUnpaidInvoices = new Set(
        invoicesList
            .filter(inv => inv.calculatedStatus !== 'paid')
            .map(inv => inv.debtor_id)
    );
    const debtorsWithUnpaidInvoices = debtorIdsWithUnpaidInvoices.size;

    // Calculate action items - things that need user attention
    const debtorsWithoutEmail = debtorsList.filter(d => !d.email);
    const debtorsWithoutPhone = debtorsList.filter(d => !d.phone);
    const invoicesWithoutSequence = invoicesList.filter(inv => !(inv as any).sequence_id && inv.calculatedStatus !== 'paid');
    const isKSeFConfigured = !!ksefSettings?.ksef_token_encrypted;

    const actionItems: Array<{
        id: string;
        type: 'missing_email' | 'missing_phone' | 'ksef_not_configured';
        title: string;
        description: string;
        link: string;
        icon: typeof Mail;
        color: string;
    }> = [
            ...debtorsWithoutEmail.slice(0, 3).map(d => ({
                id: `email-${d.id}`,
                type: 'missing_email' as const,
                title: 'Brak adresu email',
                description: d.name,
                link: `/debtors/${d.id}`,
                icon: Mail,
                color: 'text-amber-500',
            })),
            ...debtorsWithoutPhone.slice(0, 2).map(d => ({
                id: `phone-${d.id}`,
                type: 'missing_phone' as const,
                title: 'Brak numeru telefonu',
                description: d.name,
                link: `/debtors/${d.id}`,
                icon: Phone,
                color: 'text-blue-500',
            })),
        ];

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
    const totalReceivablesNet = unpaidInvoices.reduce((sum, inv) => sum + Number(inv.amount_net || (inv.amount / 1.23)), 0);
    const overdueReceivables = overdueInvoices.reduce((sum, inv) => sum + Number(inv.amount_gross || inv.amount) - Number(inv.amount_paid || 0), 0);
    const overdueReceivablesNet = overdueInvoices.reduce((sum, inv) => sum + Number(inv.amount_net || (inv.amount / 1.23)), 0);

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

            // Count executed + skipped as completed (processed) steps
            const completedSteps = sortedSteps.filter(s => s.status === 'executed' || s.status === 'skipped').length;
            const pendingSteps = sortedSteps.filter(s => s.status === 'pending');
            const executedSteps = sortedSteps.filter(s => s.status === 'executed');

            const lastExecuted = executedSteps.length > 0 ? executedSteps[executedSteps.length - 1] : null;
            const nextPending = pendingSteps.length > 0 ? pendingSteps[0] : null;

            sequenceInfoMap.set(invoiceId, {
                sequenceName,
                totalSteps: sortedSteps.length,
                completedSteps,
                lastStepDate: lastExecuted?.scheduled_for || null,
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

    // Helper functions for date formatting
    const formatDayLabel = (date: Date) => {
        const days = ['Nd', 'Pon', 'Wt', 'Śr', 'Czw', 'Pt', 'Sob'];
        return days[date.getDay()];
    };

    const formatWeekLabel = (date: Date) => {
        const day = date.getDate();
        const month = date.toLocaleString('pl-PL', { month: 'short' });
        return `${day} ${month}`;
    };

    const formatMonthLabel = (date: Date) => {
        return date.toLocaleString('pl-PL', { month: 'short' });
    };

    // Generate DAILY receivables data: Issued, Paid, Pending, Debt (cumulative)
    const generateDailyReceivables = () => {
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
            const issued = dayInvoices.reduce((sum, inv) => sum + Number(inv.amount_gross || inv.amount), 0);

            // Paid = paid invoices due on this specific day
            const paid = dayInvoices
                .filter(inv => inv.calculatedStatus === 'paid')
                .reduce((sum, inv) => sum + Number(inv.amount_gross || inv.amount), 0);

            // Pending = invoices that are pending (not paid, not overdue) due on this day
            const pending = dayInvoices
                .filter(inv => inv.calculatedStatus === 'pending')
                .reduce((sum, inv) => sum + Number(inv.amount_gross || inv.amount), 0);

            // Debt (cumulative) = all overdue invoices up to this day
            const debt = invoicesList
                .filter(inv => new Date(inv.due_date) <= periodEnd && inv.calculatedStatus === 'overdue')
                .reduce((sum, inv) => sum + Number(inv.amount_gross || inv.amount) - Number(inv.amount_paid || 0), 0);

            data.push({ day: formatDayLabel(date), issued, paid, pending, debt });
        }
        return data;
    };

    // Generate WEEKLY receivables data: Issued, Paid, Pending, Debt (cumulative)
    const generateWeeklyReceivables = () => {
        const data = [];
        const today = new Date();
        for (let i = -4; i <= 4; i++) {
            const weekStart = new Date(today);
            weekStart.setDate(weekStart.getDate() + (i * 7));
            const weekEnd = new Date(weekStart);
            weekEnd.setDate(weekEnd.getDate() + 6);
            weekEnd.setHours(23, 59, 59, 999);

            // Issued = invoices due in this specific week
            const weekInvoices = invoicesList.filter(inv => {
                const invDate = new Date(inv.due_date);
                return invDate >= weekStart && invDate <= weekEnd;
            });
            const issued = weekInvoices.reduce((sum, inv) => sum + Number(inv.amount_gross || inv.amount), 0);

            // Paid = paid invoices due in this specific week
            const paid = weekInvoices
                .filter(inv => inv.calculatedStatus === 'paid')
                .reduce((sum, inv) => sum + Number(inv.amount_gross || inv.amount), 0);

            // Pending = invoices that are pending (not paid, not overdue) due in this week
            const pending = weekInvoices
                .filter(inv => inv.calculatedStatus === 'pending')
                .reduce((sum, inv) => sum + Number(inv.amount_gross || inv.amount), 0);

            // Debt (cumulative) = all overdue invoices up to end of this week
            const debt = invoicesList
                .filter(inv => new Date(inv.due_date) <= weekEnd && inv.calculatedStatus === 'overdue')
                .reduce((sum, inv) => sum + Number(inv.amount_gross || inv.amount) - Number(inv.amount_paid || 0), 0);

            data.push({ week: formatWeekLabel(weekStart), issued, paid, pending, debt });
        }
        return data;
    };

    // Generate MONTHLY receivables data: Issued, Paid, Pending, Debt (cumulative)
    const generateMonthlyReceivables = () => {
        const data = [];
        const today = new Date();
        for (let i = -6; i <= 5; i++) {
            const monthDate = new Date(today.getFullYear(), today.getMonth() + i, 1);
            const monthEnd = new Date(today.getFullYear(), today.getMonth() + i + 1, 0);
            monthEnd.setHours(23, 59, 59, 999);

            // Issued = invoices due in this specific month
            const monthInvoices = invoicesList.filter(inv => {
                const invDate = new Date(inv.due_date);
                return invDate >= monthDate && invDate <= monthEnd;
            });
            const issued = monthInvoices.reduce((sum, inv) => sum + Number(inv.amount_gross || inv.amount), 0);

            // Paid = paid invoices due in this specific month
            const paid = monthInvoices
                .filter(inv => inv.calculatedStatus === 'paid')
                .reduce((sum, inv) => sum + Number(inv.amount_gross || inv.amount), 0);

            // Pending = invoices that are pending (not paid, not overdue) due in this month
            const pending = monthInvoices
                .filter(inv => inv.calculatedStatus === 'pending')
                .reduce((sum, inv) => sum + Number(inv.amount_gross || inv.amount), 0);

            // Debt (cumulative) = all overdue invoices up to end of this month
            const debt = invoicesList
                .filter(inv => new Date(inv.due_date) <= monthEnd && inv.calculatedStatus === 'overdue')
                .reduce((sum, inv) => sum + Number(inv.amount_gross || inv.amount) - Number(inv.amount_paid || 0), 0);

            data.push({ month: formatMonthLabel(monthDate), issued, paid, pending, debt });
        }
        return data;
    };

    const dailyReceivablesData = generateDailyReceivables();
    const weeklyReceivablesData = generateWeeklyReceivables();
    const monthlyReceivablesData = generateMonthlyReceivables();

    // Activity chart data - prepare for all periods
    const allSentActions = sentActions || [];

    // DAILY activity (by hour for today)
    const dailyActivityData = Array.from({ length: 24 }, (_, hour) => ({
        hour: `${hour}:00`,
        emails: allSentActions.filter(a => {
            const d = new Date(a.sent_at || a.created_at);
            const today = new Date();
            return d.getHours() === hour &&
                d.toDateString() === today.toDateString() &&
                a.action_type === 'email';
        }).length,
        sms: allSentActions.filter(a => {
            const d = new Date(a.sent_at || a.created_at);
            const today = new Date();
            return d.getHours() === hour &&
                d.toDateString() === today.toDateString() &&
                a.action_type === 'sms';
        }).length,
    })).filter((_, i) => i >= 8 && i <= 18); // Show only business hours

    // WEEKLY activity (by day of week)
    const dayNames = ['Nd', 'Pon', 'Wt', 'Śr', 'Czw', 'Pt', 'Sob'];
    const activityByDay: Record<string, { emails: number; sms: number }> = {};
    dayNames.forEach(day => { activityByDay[day] = { emails: 0, sms: 0 }; });

    allSentActions.forEach(action => {
        const date = new Date(action.sent_at || action.created_at);
        const dayName = dayNames[date.getDay()];
        if (action.action_type === 'email') {
            activityByDay[dayName].emails++;
        } else if (action.action_type === 'sms') {
            activityByDay[dayName].sms++;
        }
    });

    const weeklyActivityData = ['Pon', 'Wt', 'Śr', 'Czw', 'Pt'].map(day => ({
        day,
        emails: activityByDay[day].emails,
        sms: activityByDay[day].sms,
    }));

    // MONTHLY activity (by week)
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

            data.push({
                week: `Tydz. ${4 - i}`,
                emails: weekActions.filter(a => a.action_type === 'email').length,
                sms: weekActions.filter(a => a.action_type === 'sms').length,
            });
        }
        return data;
    })();

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
                        <h2 className="text-2xl font-bold mb-2">Witaj w FluintyDebt!</h2>
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
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between pb-2">
                                <CardTitle className="text-sm font-medium text-muted-foreground">
                                    Do odzyskania
                                </CardTitle>
                                <Clock className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{formatCurrency(totalReceivables)}</div>
                                <p className="text-xs text-muted-foreground">netto: {formatCurrency(totalReceivablesNet)}</p>
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
                                <p className="text-xs text-muted-foreground">netto: {formatCurrency(overdueReceivablesNet)}</p>
                                <p className="text-xs text-muted-foreground">{overdueInvoices.length} przeterminowanych</p>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between pb-2">
                                <CardTitle className="text-sm font-medium text-muted-foreground">
                                    Dłużnicy
                                </CardTitle>
                                <Users className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{debtorsWithUnpaidInvoices}</div>
                                <p className="text-xs text-muted-foreground">z nieopłaconymi fakturami</p>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Action items - things that need attention */}
                    {actionItems.length > 0 && (
                        <Card className="border-amber-200 dark:border-amber-900 bg-amber-50/50 dark:bg-amber-950/20">
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
                                {(debtorsWithoutEmail.length > 3 || debtorsWithoutPhone.length > 2) && (
                                    <div className="mt-3 text-center">
                                        <Link href="/debtors">
                                            <Button variant="ghost" size="sm">
                                                Zobacz wszystkich kontrahentów
                                                <ArrowRight className="h-4 w-4 ml-2" />
                                            </Button>
                                        </Link>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    )}

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
                                                        <div>
                                                            <p className="font-semibold">{formatCurrency(invoice.amount_gross || invoice.amount)}</p>
                                                            {invoice.amount_net && (
                                                                <p className="text-xs text-muted-foreground">netto: {formatCurrency(invoice.amount_net)}</p>
                                                            )}
                                                        </div>
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
                        <ReceivablesChart
                            data={monthlyReceivablesData}
                            dailyData={dailyReceivablesData}
                            weeklyData={weeklyReceivablesData}
                        />
                        <StatusPieChart data={statusChartData} />
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <ActivityChart
                            data={weeklyActivityData}
                            dailyData={dailyActivityData}
                            monthlyData={monthlyActivityData}
                        />
                        <CashFlowPrediction predictions={[
                            { period: 'Ten tydzień', expected: Math.round(totalReceivables * 0.2), probability: 75 },
                            { period: 'Przyszły tydzień', expected: Math.round(totalReceivables * 0.15), probability: 60 },
                            { period: 'Za 2 tygodnie', expected: Math.round(totalReceivables * 0.1), probability: 45 },
                            { period: 'Za miesiąc', expected: Math.round(totalReceivables * 0.3), probability: 30 },
                        ].filter(p => p.expected > 0)} />
                    </div>
                </>
            )}
        </div>
    );
}
