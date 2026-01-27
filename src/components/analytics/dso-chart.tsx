'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';

interface DSOChartProps {
    data: {
        month: string;
        days: number;
    }[];
}

export function DSOChart({ data }: DSOChartProps) {
    return (
        <Card className="col-span-1">
            <CardHeader>
                <CardTitle>Średni czas płatności (DSO)</CardTitle>
                <CardDescription>
                    Ile średnio dni zajmuje klientom opłacenie faktury
                </CardDescription>
            </CardHeader>
            <CardContent>
                <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                            <XAxis
                                dataKey="month"
                                tickLine={false}
                                axisLine={false}
                                tick={{ fontSize: 12, fill: '#888' }}
                                dy={10}
                            />
                            <YAxis
                                tickLine={false}
                                axisLine={false}
                                tick={{ fontSize: 12, fill: '#888' }}
                                unit=" dni"
                            />
                            <Tooltip
                                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                                cursor={{ stroke: '#888', strokeWidth: 1 }}
                            />
                            <Legend />
                            <Line
                                type="monotone"
                                dataKey="days"
                                name="Śr. liczba dni"
                                stroke="#8b5cf6"
                                strokeWidth={2}
                                activeDot={{ r: 6 }}
                                dot={{ r: 4, strokeWidth: 2 }}
                            />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            </CardContent>
        </Card>
    );
}
