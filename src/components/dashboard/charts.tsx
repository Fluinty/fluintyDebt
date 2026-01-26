'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { formatCurrency } from '@/lib/utils/format-currency';
import {
    LineChart,
    Line,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Legend,
    PieChart,
    Pie,
    Cell,
} from 'recharts';

interface ReceivablesChartProps {
    data?: Array<{ month: string; issued: number; paid: number; pending: number; debt: number }>;
    dailyData?: Array<{ day: string; issued: number; paid: number; pending: number; debt: number }>;
    weeklyData?: Array<{ week: string; issued: number; paid: number; pending: number; debt: number }>;
}

interface StatusChartProps {
    data?: Array<{ name: string; value: number; color: string }>;
}

interface ActivityChartProps {
    data?: Array<{ day: string; emails: number }>;
    dailyData?: Array<{ hour: string; emails: number }>;
    monthlyData?: Array<{ week: string; emails: number }>;
}

interface CashFlowProps {
    predictions?: Array<{ period: string; expected: number; probability: number }>;
}

// Default mock data (used when no real data provided)
const defaultReceivablesData = [
    { month: 'Gru', issued: 0, paid: 0, pending: 0, debt: 0 },
    { month: 'Sty', issued: 0, paid: 0, pending: 0, debt: 0 },
];

const defaultStatusData = [
    { name: 'Oczekujące', value: 0, color: '#3b82f6' },
    { name: 'Przeterminowane', value: 0, color: '#ef4444' },
    { name: 'Opłacone', value: 0, color: '#22c55e' },
];

const defaultActivityData = [
    { day: 'Pon', emails: 0 },
    { day: 'Wt', emails: 0 },
    { day: 'Śr', emails: 0 },
    { day: 'Czw', emails: 0 },
    { day: 'Pt', emails: 0 },
];

const defaultPredictions = [
    { period: 'Ten tydzień', expected: 0, probability: 0 },
    { period: 'Przyszły tydzień', expected: 0, probability: 0 },
];

type Period = 'daily' | 'weekly' | 'monthly';

export function ReceivablesChart({ data, dailyData, weeklyData }: ReceivablesChartProps) {
    const [period, setPeriod] = useState<Period>('monthly');

    const getChartData = () => {
        switch (period) {
            case 'daily':
                return dailyData && dailyData.length > 0 ? dailyData : data || defaultReceivablesData;
            case 'weekly':
                return weeklyData && weeklyData.length > 0 ? weeklyData : data || defaultReceivablesData;
            default:
                return data && data.length > 0 ? data : defaultReceivablesData;
        }
    };

    const chartData = getChartData();
    const hasData = chartData.some(d => d.issued > 0 || d.paid > 0 || d.pending > 0 || d.debt > 0);

    const getXAxisKey = () => {
        switch (period) {
            case 'daily': return 'day';
            case 'weekly': return 'week';
            default: return 'month';
        }
    };

    return (
        <Card className="col-span-2">
            <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Należności w czasie</CardTitle>
                <div className="flex gap-1">
                    <Button
                        variant={period === 'daily' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setPeriod('daily')}
                    >
                        Dzień
                    </Button>
                    <Button
                        variant={period === 'weekly' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setPeriod('weekly')}
                    >
                        Tydzień
                    </Button>
                    <Button
                        variant={period === 'monthly' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setPeriod('monthly')}
                    >
                        Miesiąc
                    </Button>
                </div>
            </CardHeader>
            <CardContent>
                {!hasData ? (
                    <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                        Brak danych do wyświetlenia wykresu
                    </div>
                ) : (
                    <ResponsiveContainer width="100%" height={300}>
                        <LineChart data={chartData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                            <XAxis dataKey={getXAxisKey()} stroke="#6b7280" fontSize={12} />
                            <YAxis
                                stroke="#6b7280"
                                fontSize={12}
                                tickFormatter={(value) => {
                                    if (value === 0) return '0 zł';
                                    if (Math.abs(value) >= 1000000) return `${(value / 1000000).toFixed(1)}M zł`;
                                    if (Math.abs(value) >= 1000) return `${(value / 1000).toFixed(0)}k zł`;
                                    return `${value.toFixed(0)} zł`;
                                }}
                                width={80}
                            />
                            <Tooltip
                                formatter={(value) => value !== undefined ? formatCurrency(value as number) : ''}
                                labelStyle={{ color: '#374151' }}
                            />
                            <Legend />
                            <Line
                                type="monotone"
                                dataKey="issued"
                                stroke="#3b82f6"
                                strokeWidth={2}
                                name="Wystawione"
                                dot={{ fill: '#3b82f6' }}
                            />
                            <Line
                                type="monotone"
                                dataKey="paid"
                                stroke="#22c55e"
                                strokeWidth={2}
                                name="Zapłacone"
                                dot={{ fill: '#22c55e' }}
                            />
                            <Line
                                type="monotone"
                                dataKey="pending"
                                stroke="#f59e0b"
                                strokeWidth={2}
                                name="Pozostało"
                                dot={{ fill: '#f59e0b' }}
                            />
                            <Line
                                type="monotone"
                                dataKey="debt"
                                stroke="#ef4444"
                                strokeWidth={2}
                                name="Dług"
                                dot={{ fill: '#ef4444' }}
                            />
                        </LineChart>
                    </ResponsiveContainer>
                )}
            </CardContent>
        </Card>
    );
}

export function StatusPieChart({ data }: StatusChartProps) {
    const chartData = data && data.length > 0 ? data : defaultStatusData;
    const hasData = data && data.some(d => d.value > 0);

    return (
        <Card>
            <CardHeader>
                <CardTitle>Status faktur</CardTitle>
            </CardHeader>
            <CardContent>
                {!hasData ? (
                    <div className="h-[250px] flex items-center justify-center text-muted-foreground">
                        Brak faktur
                    </div>
                ) : (
                    <ResponsiveContainer width="100%" height={250}>
                        <PieChart>
                            <Pie
                                data={chartData}
                                cx="50%"
                                cy="50%"
                                innerRadius={60}
                                outerRadius={80}
                                paddingAngle={5}
                                dataKey="value"
                                label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
                                labelLine={false}
                            >
                                {chartData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                ))}
                            </Pie>
                            <Tooltip formatter={(value) => value !== undefined ? `${value}` : ''} />
                        </PieChart>
                    </ResponsiveContainer>
                )}
            </CardContent>
        </Card>
    );
}

export function ActivityChart({ data, dailyData, monthlyData }: ActivityChartProps) {
    const [period, setPeriod] = useState<Period>('weekly');

    const getChartData = () => {
        switch (period) {
            case 'daily':
                return dailyData && dailyData.length > 0 ? dailyData : defaultActivityData;
            case 'monthly':
                return monthlyData && monthlyData.length > 0 ? monthlyData : defaultActivityData;
            default:
                return data && data.length > 0 ? data : defaultActivityData;
        }
    };

    const chartData = getChartData();
    const hasData = chartData.some(d => d.emails > 0);

    const getXAxisKey = () => {
        switch (period) {
            case 'daily': return 'hour';
            case 'monthly': return 'week';
            default: return 'day';
        }
    };

    const getTitle = () => {
        switch (period) {
            case 'daily': return 'Wysłane wiadomości (dziś)';
            case 'monthly': return 'Wysłane wiadomości (miesiąc)';
            default: return 'Wysłane wiadomości (tydzień)';
        }
    };

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>{getTitle()}</CardTitle>
                <div className="flex gap-1">
                    <Button
                        variant={period === 'daily' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setPeriod('daily')}
                    >
                        Dzień
                    </Button>
                    <Button
                        variant={period === 'weekly' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setPeriod('weekly')}
                    >
                        Tydzień
                    </Button>
                    <Button
                        variant={period === 'monthly' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setPeriod('monthly')}
                    >
                        Miesiąc
                    </Button>
                </div>
            </CardHeader>
            <CardContent>
                {!hasData ? (
                    <div className="h-[250px] flex items-center justify-center text-muted-foreground">
                        Brak wysłanych wiadomości
                    </div>
                ) : (
                    <ResponsiveContainer width="100%" height={250}>
                        <BarChart data={chartData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                            <XAxis dataKey={getXAxisKey()} stroke="#6b7280" fontSize={12} />
                            <YAxis stroke="#6b7280" fontSize={12} />
                            <Tooltip />
                            <Legend />
                            <Bar dataKey="emails" name="Email" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                )}
            </CardContent>
        </Card>
    );
}

export function CashFlowPrediction({ predictions }: CashFlowProps) {
    const data = predictions && predictions.length > 0 ? predictions : defaultPredictions;
    const hasData = predictions && predictions.some(p => p.expected > 0);

    return (
        <Card>
            <CardHeader>
                <CardTitle>Prognoza wpływów</CardTitle>
            </CardHeader>
            <CardContent>
                {!hasData ? (
                    <div className="h-[200px] flex items-center justify-center text-muted-foreground">
                        Brak danych do prognozy
                    </div>
                ) : (
                    <div className="space-y-4">
                        {data.map((p, i) => (
                            <div key={i} className="space-y-2">
                                <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">{p.period}</span>
                                    <span className="font-medium">{formatCurrency(p.expected)}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-primary rounded-full transition-all"
                                            style={{ width: `${p.probability}%` }}
                                        />
                                    </div>
                                    <span className="text-xs text-muted-foreground w-10">{p.probability}%</span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
                <p className="text-xs text-muted-foreground mt-4">
                    Prognoza bazuje na historii płatności kontrahentów i aktywnych sekwencjach.
                </p>
            </CardContent>
        </Card>
    );
}
