'use client';

import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    ReferenceLine
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Lock } from 'lucide-react';
import { formatCurrency } from '@/lib/utils/format-currency';
import { formatDate } from '@/lib/utils/format-date';
import Link from 'next/link';

interface CashFlowDataPoint {
    date: string;
    balance: number;
    incoming: number;
    outgoing: number;
}

interface CashFlowChartProps {
    data: CashFlowDataPoint[];
    isLocked?: boolean;
}

export function CashFlowChart({ data, isLocked = false }: CashFlowChartProps) {
    // Determine min/max for YAxis domain to look good
    const minBalance = Math.min(...data.map(d => d.balance));
    const maxBalance = Math.max(...data.map(d => d.balance));
    const padding = (maxBalance - minBalance) * 0.1;

    return (
        <Card className="col-span-1 md:col-span-2 relative overflow-hidden">
            {isLocked && (
                <div className="absolute inset-0 z-50 bg-background/50 backdrop-blur-sm flex flex-col items-center justify-center text-center p-6 animate-in fade-in duration-500">
                    <div className="bg-primary/10 p-4 rounded-full mb-4">
                        <Lock className="h-8 w-8 text-primary" />
                    </div>
                    <h3 className="text-xl font-bold mb-2">Prognoza Cash Flow</h3>
                    <p className="text-muted-foreground max-w-md mb-6">
                        Odblokuj moduł Wydatki, aby zobaczyć 30-dniową prognozę stanu konta uwzględniającą Twoje zobowiązania.
                    </p>
                    <Link href="/costs">
                        <Button size="lg">Odblokuj Moduł Koszty</Button>
                    </Link>
                </div>
            )}

            <CardHeader>
                <CardTitle>Prognoza Cash Flow (30 dni)</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={data} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                            <XAxis
                                dataKey="date"
                                tickFormatter={(val) => new Date(val).getDate().toString()}
                                tick={{ fontSize: 12 }}
                                tickLine={false}
                                axisLine={false}
                            />
                            <YAxis
                                tickFormatter={(val) => `${val / 1000}k`}
                                domain={[minBalance - padding, maxBalance + padding]}
                                tick={{ fontSize: 12 }}
                                tickLine={false}
                                axisLine={false}
                            />
                            <Tooltip
                                labelFormatter={(val) => formatDate(val)}
                                formatter={(value: any, name: any) => {
                                    if (name === 'balance' && typeof value === 'number') return [formatCurrency(value), 'Saldo'];
                                    return [value, name];
                                }}
                                contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0' }}
                            />
                            <ReferenceLine y={0} stroke="#ef4444" strokeDasharray="3 3" />
                            <Line
                                type="monotone"
                                dataKey="balance"
                                stroke="#2563eb"
                                strokeWidth={2}
                                dot={false}
                                activeDot={{ r: 6 }}
                                name="balance"
                            />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            </CardContent>
        </Card>
    );
}
