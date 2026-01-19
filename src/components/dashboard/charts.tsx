'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
    data?: Array<{ month: string; total: number; overdue: number; recovered: number }>;
}

interface StatusChartProps {
    data?: Array<{ name: string; value: number; color: string }>;
}

interface ActivityChartProps {
    data?: Array<{ day: string; emails: number; sms: number }>;
}

interface CashFlowProps {
    predictions?: Array<{ period: string; expected: number; probability: number }>;
}

// Default mock data (used when no real data provided)
const defaultReceivablesData = [
    { month: 'Gru', total: 0, overdue: 0, recovered: 0 },
    { month: 'Sty', total: 0, overdue: 0, recovered: 0 },
];

const defaultStatusData = [
    { name: 'Oczekujące', value: 0, color: '#3b82f6' },
    { name: 'Przeterminowane', value: 0, color: '#ef4444' },
    { name: 'Opłacone', value: 0, color: '#22c55e' },
];

const defaultActivityData = [
    { day: 'Pon', emails: 0, sms: 0 },
    { day: 'Wt', emails: 0, sms: 0 },
    { day: 'Śr', emails: 0, sms: 0 },
    { day: 'Czw', emails: 0, sms: 0 },
    { day: 'Pt', emails: 0, sms: 0 },
];

const defaultPredictions = [
    { period: 'Ten tydzień', expected: 0, probability: 0 },
    { period: 'Przyszły tydzień', expected: 0, probability: 0 },
];

export function ReceivablesChart({ data }: ReceivablesChartProps) {
    const chartData = data && data.length > 0 ? data : defaultReceivablesData;
    const hasData = data && data.some(d => d.total > 0 || d.overdue > 0 || d.recovered > 0);

    return (
        <Card className="col-span-2">
            <CardHeader>
                <CardTitle>Należności w czasie</CardTitle>
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
                            <XAxis dataKey="month" stroke="#6b7280" fontSize={12} />
                            <YAxis
                                stroke="#6b7280"
                                fontSize={12}
                                tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
                            />
                            <Tooltip
                                formatter={(value) => value !== undefined ? formatCurrency(value as number) : ''}
                                labelStyle={{ color: '#374151' }}
                            />
                            <Legend />
                            <Line
                                type="monotone"
                                dataKey="total"
                                stroke="#3b82f6"
                                strokeWidth={2}
                                name="Całkowite"
                                dot={{ fill: '#3b82f6' }}
                            />
                            <Line
                                type="monotone"
                                dataKey="overdue"
                                stroke="#ef4444"
                                strokeWidth={2}
                                name="Przeterminowane"
                                dot={{ fill: '#ef4444' }}
                            />
                            <Line
                                type="monotone"
                                dataKey="recovered"
                                stroke="#22c55e"
                                strokeWidth={2}
                                name="Odzyskane"
                                dot={{ fill: '#22c55e' }}
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

export function ActivityChart({ data }: ActivityChartProps) {
    const chartData = data && data.length > 0 ? data : defaultActivityData;
    const hasData = data && data.some(d => d.emails > 0 || d.sms > 0);

    return (
        <Card>
            <CardHeader>
                <CardTitle>Wysłane wiadomości (tydzień)</CardTitle>
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
                            <XAxis dataKey="day" stroke="#6b7280" fontSize={12} />
                            <YAxis stroke="#6b7280" fontSize={12} />
                            <Tooltip />
                            <Legend />
                            <Bar dataKey="emails" name="Email" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                            <Bar dataKey="sms" name="SMS" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
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
