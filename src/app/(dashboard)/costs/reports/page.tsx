import { TrendingUp, Users, PieChart as PieIcon, Calculator } from 'lucide-react';
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
import { CostTrendChart, CostCategoryChart } from '@/components/dashboard/cost-charts';
import { TopVendors } from '@/components/analytics/top-vendors';

export default async function CostReportsPage() {
    const supabase = await createClient();

    // Fetch cost invoices
    const { data: costInvoices } = await supabase
        .from('cost_invoices')
        .select('*')
        .order('issue_date', { ascending: true }); // chronological for trend

    const costsList = costInvoices || [];
    const hasCostsData = costsList.length > 0;

    // Helper functions for date formatting
    const formatMonth = (date: Date) => {
        return date.toLocaleString('pl-PL', { month: 'short' });
    };

    // --- COST REPORT CALCULATIONS (CURRENT MONTH) ---
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const currentMonthCosts = costsList.filter(c => {
        const d = new Date(c.issue_date);
        return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    });

    const totalCostGross = currentMonthCosts.reduce((sum, c) => sum + Number(c.amount_gross || c.amount), 0);
    const totalCostNet = currentMonthCosts.reduce((sum, c) => sum + Number(c.amount_net || 0), 0);
    const totalCostVat = currentMonthCosts.reduce((sum, c) => sum + Number(c.vat_amount || 0), 0);
    const totalPaidCosts = currentMonthCosts
        .filter(c => c.payment_status === 'paid')
        .reduce((sum, c) => sum + Number(c.amount_gross || c.amount), 0);

    const generateCostTrendData = () => {
        const data: Map<string, { date: string, gross: number, paid: number }> = new Map();

        // Populate last 6 months
        const today = new Date();
        for (let i = -5; i <= 0; i++) {
            const d = new Date(today.getFullYear(), today.getMonth() + i, 1);
            const key = formatMonth(d);
            data.set(key, { date: key, gross: 0, paid: 0 });
        }

        costsList.forEach(cost => {
            const d = new Date(cost.issue_date);
            const key = formatMonth(d);
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



    const generateCategoryData = () => {
        const categories: Map<string, number> = new Map();
        costsList.forEach(cost => {
            const cat = cost.category || 'Inne';
            const current = categories.get(cat) || 0;
            categories.set(cat, current + Number(cost.amount_gross || cost.amount));
        });

        return Array.from(categories.entries()).map(([name, value]) => ({
            name: name === 'other' ? 'Inne' : name,
            value,
            color: '#3b82f6' // Colors will be handled by chart
        })).sort((a, b) => b.value - a.value);
    }

    // --- ADVANCED ANALYTICS CALCULATIONS ---

    // 1. Top Vendors (Ranking)
    const generateTopVendorsData = () => {
        const vendorMap: Map<string, number> = new Map();
        costsList.forEach(cost => {
            const name = cost.contractor_name || 'Nieznany';
            const amount = Number(cost.amount_gross || cost.amount);
            vendorMap.set(name, (vendorMap.get(name) || 0) + amount);
        });

        const total = Array.from(vendorMap.values()).reduce((a, b) => a + b, 0);

        return Array.from(vendorMap.entries())
            .map(([name, amount]) => ({
                name,
                amount,
                percentage: total > 0 ? (amount / total) * 100 : 0
            }))
            .sort((a, b) => b.amount - a.amount)
            .slice(0, 5);
    };

    const topVendorsData = generateTopVendorsData();

    const costTrendData = generateCostTrendData();
    const categoryData = generateCategoryData();

    return (
        <div className="space-y-6">
            <Breadcrumbs />

            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold">Raporty Kosztowe</h1>
                    <p className="text-muted-foreground mt-1">
                        Analiza wydatków Twojej firmy
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

            {!hasCostsData && (
                <Card className="py-12">
                    <CardContent className="text-center">
                        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
                            <PieIcon className="h-8 w-8 text-muted-foreground" />
                        </div>
                        <h3 className="text-lg font-medium mb-2">Brak danych kosztowych</h3>
                        <p className="text-muted-foreground">
                            Dodaj faktury zakupowe, aby zobaczyć analizę wydatków
                        </p>
                    </CardContent>
                </Card>
            )}

            {hasCostsData && (
                <>
                    {/* Summary Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <Card>
                            <CardContent className="pt-6">
                                <div className="flex items-center justify-between mb-2">
                                    <p className="text-sm font-medium text-muted-foreground">Wydatki (Ten m-c)</p>
                                    <TrendingUp className="h-4 w-4 text-orange-500" />
                                </div>
                                <div className="text-2xl font-bold">{formatCurrency(totalCostGross)}</div>
                                <p className="text-xs text-muted-foreground mt-1">Brutto w tym miesiącu</p>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardContent className="pt-6">
                                <div className="flex items-center justify-between mb-2">
                                    <p className="text-sm font-medium text-muted-foreground">Netto (Ten m-c)</p>
                                    <Calculator className="h-4 w-4 text-blue-500" />
                                </div>
                                <div className="text-2xl font-bold">{formatCurrency(totalCostNet)}</div>
                                <p className="text-xs text-muted-foreground mt-1">Suma netto</p>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardContent className="pt-6">
                                <div className="flex items-center justify-between mb-2">
                                    <p className="text-sm font-medium text-muted-foreground">VAT (Ten m-c)</p>
                                    <PieIcon className="h-4 w-4 text-purple-500" />
                                </div>
                                <div className="text-2xl font-bold">{formatCurrency(totalCostVat)}</div>
                                <p className="text-xs text-muted-foreground mt-1">Suma VAT</p>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardContent className="pt-6">
                                <div className="flex items-center justify-between mb-2">
                                    <p className="text-sm font-medium text-muted-foreground">Opłacone (Ten m-c)</p>
                                    <Users className="h-4 w-4 text-green-500" />
                                </div>
                                <div className="text-2xl font-bold text-green-600">{formatCurrency(totalPaidCosts)}</div>
                                <p className="text-xs text-muted-foreground mt-1">
                                    {totalCostGross > 0 ? Math.round((totalPaidCosts / totalCostGross) * 100) : 0}% wydatków m-ca
                                </p>
                            </CardContent>
                        </Card>
                    </div>

                    {/* NEW: Advanced Analytics Charts */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <TopVendors data={topVendorsData} />
                    </div>

                    {/* Charts Grid */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <CostTrendChart data={costTrendData} />
                        <CostCategoryChart data={categoryData} />
                    </div>
                </>
            )}
        </div>
    );
}
