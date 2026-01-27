
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency } from '@/lib/utils/format-currency';
import { ArrowDown, ArrowUp, CalendarDays } from 'lucide-react';

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
    // 1. Get next 7 days
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const nextWeek = new Date(today);
    nextWeek.setDate(nextWeek.getDate() + 7);
    nextWeek.setHours(23, 59, 59, 999);

    // 2. Filter invoices
    const upcomingSales = salesInvoices.filter(inv => {
        const d = new Date(inv.due_date);
        return d >= today && d <= nextWeek;
    });

    const upcomingCosts = costInvoices.filter(inv => {
        const d = new Date(inv.due_date);
        return d >= today && d <= nextWeek;
    });

    // 3. Group by date
    const groupedData: Record<string, { sales: Invoice[], costs: Invoice[] }> = {};

    // Initialize next 7 days
    for (let i = 0; i < 7; i++) {
        const d = new Date(today);
        d.setDate(d.getDate() + i);
        const dateStr = d.toISOString().split('T')[0];
        groupedData[dateStr] = { sales: [], costs: [] };
    }

    // Fill data
    [...upcomingSales].forEach(inv => {
        const dateStr = new Date(inv.due_date).toISOString().split('T')[0];
        if (groupedData[dateStr]) groupedData[dateStr].sales.push(inv);
    });

    [...upcomingCosts].forEach(inv => {
        const dateStr = new Date(inv.due_date).toISOString().split('T')[0];
        if (groupedData[dateStr]) groupedData[dateStr].costs.push(inv);
    });

    const sortedDates = Object.keys(groupedData).sort();
    const hasAnyData = upcomingSales.length > 0 || upcomingCosts.length > 0;

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
                        Brak nadchodzących płatności w tym tygodniu
                    </div>
                ) : (
                    <div className="space-y-6">
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
                                            <div key={`sale-${inv.id}`} className="flex justify-between items-center text-sm p-2 rounded bg-emerald-50 dark:bg-emerald-950/20 border-l-2 border-emerald-500">
                                                <div className="truncate flex-1 mr-2">
                                                    <div className="font-medium truncate">{inv.clientName}</div>
                                                    <div className="text-xs text-muted-foreground">FV: {inv.invoice_number}</div>
                                                </div>
                                                <div className="text-right whitespace-nowrap">
                                                    <div className="font-semibold text-emerald-600 flex items-center justify-end gap-1">
                                                        <ArrowDown className="h-3 w-3" />
                                                        {formatCurrency(inv.amount_gross || inv.amount)}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                        {costs.map(inv => (
                                            <div key={`cost-${inv.id}`} className="flex justify-between items-center text-sm p-2 rounded bg-red-50 dark:bg-red-950/20 border-l-2 border-red-500">
                                                <div className="truncate flex-1 mr-2">
                                                    <div className="font-medium truncate">{inv.clientName}</div>
                                                    <div className="text-xs text-muted-foreground">FV: {inv.invoice_number}</div>
                                                </div>
                                                <div className="text-right whitespace-nowrap">
                                                    <div className="font-semibold text-red-600 flex items-center justify-end gap-1">
                                                        <ArrowUp className="h-3 w-3" />
                                                        {formatCurrency(inv.amount_gross || inv.amount)}
                                                    </div>
                                                </div>
                                            </div>
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
