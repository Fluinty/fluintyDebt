import { Download, TrendingUp, Users, PieChart as PieIcon, Calculator } from 'lucide-react';
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
import { CostTrendChart, VatStackChart, CostCategoryChart } from '@/components/dashboard/cost-charts';
import { TopVendors } from '@/components/analytics/top-vendors';
import { CostDynamics } from '@/components/analytics/cost-dynamics';

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

    // --- COST REPORT CALCULATIONS ---

    const totalCostGross = costsList.reduce((sum, c) => sum + Number(c.amount_gross || c.amount), 0);
    const totalCostNet = costsList.reduce((sum, c) => sum + Number(c.amount_net || 0), 0);
    const totalCostVat = costsList.reduce((sum, c) => sum + Number(c.vat_amount || 0), 0);
    const totalPaidCosts = costsList
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

    const generateVatStackData = () => {
        const data: Map<string, { month: string, net: number, vat: number }> = new Map();

        // Populate last 6 months
        const today = new Date();
        for (let i = -5; i <= 0; i++) {
            const d = new Date(today.getFullYear(), today.getMonth() + i, 1);
            const key = formatMonth(d);
            data.set(key, { month: key, net: 0, vat: 0 });
        }

        costsList.forEach(cost => {
            const d = new Date(cost.issue_date);
            const key = formatMonth(d);
            if (data.has(key)) {
                const entry = data.get(key)!;
                entry.net += Number(cost.amount_net || 0);
                entry.vat += Number(cost.vat_amount || 0);
            }
        });

        return Array.from(data.values());
    }

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

    // 2. Cost Dynamics (Month over Month)
    const generateCostDynamicsData = () => {
        const today = new Date();
        const currentMonth = today.getMonth();
        const currentYear = today.getFullYear();

        // Handle "last month" correctly (e.g. if current is Jan, last is Dec of prev year)
        const lastMonthDate = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        const lastMonth = lastMonthDate.getMonth();
        const lastYear = lastMonthDate.getFullYear();

        const currentMonthCosts: Map<string, number> = new Map();
        const lastMonthCosts: Map<string, number> = new Map();
        const allCategories = new Set<string>();

        costsList.forEach(cost => {
            const d = new Date(cost.issue_date);
            const cat = cost.category || 'Inne';
            const amount = Number(cost.amount_gross || cost.amount);

            if (d.getMonth() === currentMonth && d.getFullYear() === currentYear) {
                currentMonthCosts.set(cat, (currentMonthCosts.get(cat) || 0) + amount);
                allCategories.add(cat);
            } else if (d.getMonth() === lastMonth && d.getFullYear() === lastYear) {
                lastMonthCosts.set(cat, (lastMonthCosts.get(cat) || 0) + amount);
                allCategories.add(cat);
            }
        });

        return Array.from(allCategories).map(cat => {
            const current = currentMonthCosts.get(cat) || 0;
            const last = lastMonthCosts.get(cat) || 0;

            let changePercent = 0;
            if (last === 0) {
                changePercent = current > 0 ? 100 : 0; // If new cost appears, treat as 100% increase (or handle as "new")
            } else {
                changePercent = ((current - last) / last) * 100;
            }

            return {
                category: cat === 'other' ? 'Inne' : cat,
                currentAmount: current,
                lastAmount: last,
                changePercent
            };
        })
            .filter(item => item.currentAmount > 0 || item.lastAmount > 0) // Hide categories with 0 costs in both months
            .sort((a, b) => b.changePercent - a.changePercent); // Sort by biggest increase first
    };

    const costDynamicsData = generateCostDynamicsData();

    const costTrendData = generateCostTrendData();
    const vatStackData = generateVatStackData();
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
                    <Button variant="outline">
                        <Download className="h-4 w-4 mr-2" />
                        Eksportuj
                    </Button>
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
                                    <p className="text-sm font-medium text-muted-foreground">Łącznie wydatki (Brutto)</p>
                                    <TrendingUp className="h-4 w-4 text-orange-500" />
                                </div>
                                <div className="text-2xl font-bold">{formatCurrency(totalCostGross)}</div>
                                <p className="text-xs text-muted-foreground mt-1">Wszystkie faktury</p>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardContent className="pt-6">
                                <div className="flex items-center justify-between mb-2">
                                    <p className="text-sm font-medium text-muted-foreground">Łącznie Netto</p>
                                    <Calculator className="h-4 w-4 text-blue-500" />
                                </div>
                                <div className="text-2xl font-bold">{formatCurrency(totalCostNet)}</div>
                                <p className="text-xs text-muted-foreground mt-1">Podstawa podatkowa</p>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardContent className="pt-6">
                                <div className="flex items-center justify-between mb-2">
                                    <p className="text-sm font-medium text-muted-foreground">Łącznie VAT</p>
                                    <PieIcon className="h-4 w-4 text-purple-500" />
                                </div>
                                <div className="text-2xl font-bold">{formatCurrency(totalCostVat)}</div>
                                <p className="text-xs text-muted-foreground mt-1">Podatek VAT</p>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardContent className="pt-6">
                                <div className="flex items-center justify-between mb-2">
                                    <p className="text-sm font-medium text-muted-foreground">Opłacone</p>
                                    <Users className="h-4 w-4 text-green-500" />
                                </div>
                                <div className="text-2xl font-bold text-green-600">{formatCurrency(totalPaidCosts)}</div>
                                <p className="text-xs text-muted-foreground mt-1">
                                    {totalCostGross > 0 ? Math.round((totalPaidCosts / totalCostGross) * 100) : 0}% całości
                                </p>
                            </CardContent>
                        </Card>
                    </div>

                    {/* NEW: Advanced Analytics Charts */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <TopVendors data={topVendorsData} />
                        <CostDynamics data={costDynamicsData} />
                    </div>

                    {/* Charts Grid */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <CostTrendChart data={costTrendData} />
                        <CostCategoryChart data={categoryData} />
                    </div>

                    {/* Detailed VAT Analysis */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <VatStackChart data={vatStackData} />
                        <Card>
                            <CardHeader>
                                <CardTitle>Struktura miesięczna</CardTitle>
                                <CardDescription>Szczegółowe dane z ostatnich 6 miesięcy</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-4">
                                    {costTrendData.slice().reverse().map((d, i) => (
                                        <div key={i} className="flex items-center justify-between border-b pb-2 last:border-0 last:pb-0">
                                            <div>
                                                <p className="font-medium">{d.date}</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="font-semibold">{formatCurrency(d.gross)}</p>
                                                <p className="text-xs text-muted-foreground">
                                                    Opłacono: {formatCurrency(d.paid)}
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </>
            )}
        </div>
    );
}
