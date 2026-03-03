
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency } from '@/lib/utils/format-currency';
import { ArrowDown, ArrowUp, CalendarDays, AlertTriangle } from 'lucide-react';
import Link from 'next/link';

interface Invoice {
    id: string;
    invoice_number: string;
    amount: number;
    amount_gross?: number;
    due_date: string;
    clientName: string; // pre-processed name
}

interface UpcomingWeekProps {
    salesInvoices: Invoice[];
    costInvoices: Invoice[];
}

export function UpcomingWeek({ salesInvoices, costInvoices }: UpcomingWeekProps) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const nextWeek = new Date(today);
    nextWeek.setDate(nextWeek.getDate() + 7);
    nextWeek.setHours(23, 59, 59, 999);

    // ── Overdue (past due) ────────────────────────────────────────────────────
    const overdueSales = salesInvoices.filter(inv => new Date(inv.due_date) < today);
    const overdueCosts = costInvoices.filter(inv => new Date(inv.due_date) < today);

    // ── Upcoming 7 days ───────────────────────────────────────────────────────
    const upcomingSales = salesInvoices.filter(inv => {
        const d = new Date(inv.due_date);
        return d >= today && d <= nextWeek;
    });

    const upcomingCosts = costInvoices.filter(inv => {
        const d = new Date(inv.due_date);
        return d >= today && d <= nextWeek;
    });

    // Group by date
    const groupedData: Record<string, { sales: Invoice[], costs: Invoice[] }> = {};
    for (let i = 0; i < 7; i++) {
        const d = new Date(today);
        d.setDate(d.getDate() + i);
        const dateStr = d.toISOString().split('T')[0];
        groupedData[dateStr] = { sales: [], costs: [] };
    }
    [...upcomingSales].forEach(inv => {
        const dateStr = new Date(inv.due_date).toISOString().split('T')[0];
        if (groupedData[dateStr]) groupedData[dateStr].sales.push(inv);
    });
    [...upcomingCosts].forEach(inv => {
        const dateStr = new Date(inv.due_date).toISOString().split('T')[0];
        if (groupedData[dateStr]) groupedData[dateStr].costs.push(inv);
    });

    const sortedDates = Object.keys(groupedData).sort();
    const hasAnyOverdue = overdueSales.length > 0 || overdueCosts.length > 0;
    const hasAnyUpcoming = upcomingSales.length > 0 || upcomingCosts.length > 0;
    const hasAnyData = hasAnyOverdue || hasAnyUpcoming;

    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        const todayStr = new Date().toISOString().split('T')[0];
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const tomorrowStr = tomorrow.toISOString().split('T')[0];
        if (dateStr === todayStr) return 'Dzisiaj';
        if (dateStr === tomorrowStr) return 'Jutro';
        return date.toLocaleDateString('pl-PL', { weekday: 'long', day: 'numeric', month: 'numeric' });
    };

    const daysOverdue = (dateStr: string) => {
        const due = new Date(dateStr);
        due.setHours(0, 0, 0, 0);
        const diff = Math.floor((today.getTime() - due.getTime()) / 86400000);
        return diff;
    };

    return (
        <Card className="h-full">
            <CardHeader>
                <div className="flex items-center gap-2">
                    <CalendarDays className="h-5 w-5 text-primary" />
                    <CardTitle>Najbliższy tydzień</CardTitle>
                </div>
                <CardDescription>Nadchodzące płatności i przychody</CardDescription>
            </CardHeader>
            <CardContent>
                {!hasAnyData ? (
                    <div className="text-center py-8 text-muted-foreground">
                        Brak nadchodzących płatności w tym tygodniu 🎉
                    </div>
                ) : (
                    <div className="space-y-6">
                        {/* ─── OVERDUE SECTION ─────────────────────────────── */}
                        {hasAnyOverdue && (
                            <div className="space-y-2">
                                <h4 className="text-sm font-semibold text-red-600 dark:text-red-400 border-b border-red-200 dark:border-red-900 pb-1 flex items-center gap-1">
                                    <AlertTriangle className="h-3.5 w-3.5" />
                                    Przeterminowane
                                </h4>
                                <div className="space-y-2">
                                    {overdueSales.map(inv => (
                                        <Link key={`od-sale-${inv.id}`} href={`/invoices/${inv.id}`}>
                                            <div className="flex justify-between items-center text-sm p-2 rounded bg-red-50 dark:bg-red-950/30 border-l-2 border-red-600 hover:bg-red-100 dark:hover:bg-red-950/50 transition-colors">
                                                <div className="truncate flex-1 mr-2">
                                                    <div className="font-medium truncate">{inv.clientName}</div>
                                                    <div className="text-xs text-red-500">
                                                        <strong className="text-red-700 dark:text-red-400 mr-2">PRZYCHÓD</strong>
                                                        FV: {inv.invoice_number} · {daysOverdue(inv.due_date)} dni po terminie
                                                    </div>
                                                </div>
                                                <div className="text-right whitespace-nowrap">
                                                    <div className="font-semibold text-red-600 flex items-center justify-end gap-1">
                                                        <ArrowDown className="h-3 w-3" />
                                                        {formatCurrency(inv.amount_gross || inv.amount)}
                                                    </div>
                                                </div>
                                            </div>
                                        </Link>
                                    ))}
                                    {overdueCosts.map(inv => (
                                        <Link key={`od-cost-${inv.id}`} href={`/costs/${inv.id}`}>
                                            <div className="flex justify-between items-center text-sm p-2 rounded bg-orange-50 dark:bg-orange-950/30 border-l-2 border-orange-500 hover:bg-orange-100 dark:hover:bg-orange-950/50 transition-colors">
                                                <div className="truncate flex-1 mr-2">
                                                    <div className="font-medium truncate">{inv.clientName}</div>
                                                    <div className="text-xs text-orange-600">
                                                        <strong className="text-orange-800 dark:text-orange-400 mr-2">KOSZT</strong>
                                                        FV: {inv.invoice_number} · {daysOverdue(inv.due_date)} dni po terminie
                                                    </div>
                                                </div>
                                                <div className="text-right whitespace-nowrap">
                                                    <div className="font-semibold text-orange-600 flex items-center justify-end gap-1">
                                                        <ArrowUp className="h-3 w-3" />
                                                        {formatCurrency(inv.amount_gross || inv.amount)}
                                                    </div>
                                                </div>
                                            </div>
                                        </Link>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* ─── UPCOMING 7 DAYS ─────────────────────────────── */}
                        {sortedDates.map(dateStr => {
                            const { sales, costs } = groupedData[dateStr];
                            if (sales.length === 0 && costs.length === 0) return null;

                            return (
                                <div key={dateStr} className="space-y-2">
                                    <h4 className="text-sm font-medium text-muted-foreground border-b pb-1">
                                        {formatDate(dateStr)}
                                    </h4>
                                    <div className="space-y-2">
                                        {sales.map(inv => (
                                            <Link key={`sale-${inv.id}`} href={`/invoices/${inv.id}`}>
                                                <div className="flex justify-between items-center text-sm p-2 rounded bg-emerald-50 dark:bg-emerald-950/20 border-l-2 border-emerald-500 hover:bg-emerald-100 dark:hover:bg-emerald-950/40 transition-colors">
                                                    <div className="truncate flex-1 mr-2">
                                                        <div className="font-medium truncate">{inv.clientName}</div>
                                                        <div className="text-xs text-muted-foreground">
                                                            <strong className="text-emerald-600 dark:text-emerald-400 mr-2">PRZYCHÓD</strong>
                                                            FV: {inv.invoice_number}
                                                        </div>
                                                    </div>
                                                    <div className="text-right whitespace-nowrap">
                                                        <div className="font-semibold text-emerald-600 flex items-center justify-end gap-1">
                                                            <ArrowDown className="h-3 w-3" />
                                                            {formatCurrency(inv.amount_gross || inv.amount)}
                                                        </div>
                                                    </div>
                                                </div>
                                            </Link>
                                        ))}
                                        {costs.map(inv => (
                                            <Link key={`cost-${inv.id}`} href={`/costs/${inv.id}`}>
                                                <div className="flex justify-between items-center text-sm p-2 rounded bg-red-50 dark:bg-red-950/20 border-l-2 border-red-500 hover:bg-red-100 dark:hover:bg-red-950/40 transition-colors">
                                                    <div className="truncate flex-1 mr-2">
                                                        <div className="font-medium truncate">{inv.clientName}</div>
                                                        <div className="text-xs text-muted-foreground">
                                                            <strong className="text-red-500 dark:text-red-400 mr-2">KOSZT</strong>
                                                            FV: {inv.invoice_number}
                                                        </div>
                                                    </div>
                                                    <div className="text-right whitespace-nowrap">
                                                        <div className="font-semibold text-red-600 flex items-center justify-end gap-1">
                                                            <ArrowUp className="h-3 w-3" />
                                                            {formatCurrency(inv.amount_gross || inv.amount)}
                                                        </div>
                                                    </div>
                                                </div>
                                            </Link>
                                        ))}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
