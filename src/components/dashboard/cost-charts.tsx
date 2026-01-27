'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { formatCurrency } from '@/lib/utils/format-currency';
import {
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
    AreaChart,
    Area,
} from 'recharts';

interface CostTrendProps {
    data: Array<{ date: string; gross: number; paid: number }>;
}

interface VatStackProps {
    data: Array<{ month: string; net: number; vat: number }>;
}

interface CategoryPieProps {
    data: Array<{ name: string; value: number; color: string }>;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

export function CostTrendChart({ data }: CostTrendProps) {
    const hasData = data && data.some(d => d.gross > 0);

    return (
        <Card className="col-span-2">
            <CardHeader>
                <CardTitle>Trend Wydatków</CardTitle>
                <CardDescription>Koszty poniesione vs opłacone</CardDescription>
            </CardHeader>
            <CardContent>
                {!hasData ? (
                    <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                        Brak danych kosztowych
                    </div>
                ) : (
                    <ResponsiveContainer width="100%" height={300}>
                        <AreaChart data={data}>
                            <defs>
                                <linearGradient id="colorGross" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.8} />
                                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                                </linearGradient>
                                <linearGradient id="colorPaid" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.8} />
                                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                            <XAxis dataKey="date" stroke="#6b7280" fontSize={12} tickLine={false} axisLine={false} />
                            <YAxis
                                stroke="#6b7280"
                                fontSize={12}
                                tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
                                tickLine={false}
                                axisLine={false}
                            />
                            <Tooltip
                                formatter={(value: number | undefined) => value !== undefined ? formatCurrency(value) : '0 zł'}
                                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                            />
                            <Legend iconType="circle" />
                            <Area
                                type="monotone"
                                dataKey="gross"
                                stroke="#f59e0b"
                                fillOpacity={1}
                                fill="url(#colorGross)"
                                name="Naliczone (Brutto)"
                            />
                            <Area
                                type="monotone"
                                dataKey="paid"
                                stroke="#10b981"
                                fillOpacity={1}
                                fill="url(#colorPaid)"
                                name="Opłacone"
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                )}
            </CardContent>
        </Card>
    );
}

export function VatStackChart({ data }: VatStackProps) {
    const hasData = data && data.some(d => d.net > 0);

    return (
        <Card>
            <CardHeader>
                <CardTitle>Struktura VAT</CardTitle>
                <CardDescription>Netto vs VAT w ujęciu miesięcznym</CardDescription>
            </CardHeader>
            <CardContent>
                {!hasData ? (
                    <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                        Brak danych VAT
                    </div>
                ) : (
                    <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={data} layout="vertical">
                            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e5e7eb" />
                            <XAxis type="number" hide />
                            <YAxis
                                dataKey="month"
                                type="category"
                                stroke="#6b7280"
                                fontSize={12}
                                width={50}
                                tickLine={false}
                                axisLine={false}
                            />
                            <Tooltip
                                cursor={{ fill: 'transparent' }}
                                formatter={(value: number | undefined) => value !== undefined ? formatCurrency(value) : '0 zł'}
                            />
                            <Legend />
                            <Bar dataKey="net" name="Netto" stackId="a" fill="#3b82f6" radius={[0, 4, 4, 0]} />
                            <Bar dataKey="vat" name="VAT" stackId="a" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                )}
            </CardContent>
        </Card>
    );
}

export function CostCategoryChart({ data }: CategoryPieProps) {
    const hasData = data && data.some(d => d.value > 0);

    return (
        <Card>
            <CardHeader>
                <CardTitle>Kategorie Kosztów</CardTitle>
                <CardDescription>Podział wydatków wg kategorii</CardDescription>
            </CardHeader>
            <CardContent>
                {!hasData ? (
                    <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                        Brak kategorii
                    </div>
                ) : (
                    <ResponsiveContainer width="100%" height={300}>
                        <PieChart>
                            <Pie
                                data={data}
                                cx="50%"
                                cy="50%"
                                innerRadius={60}
                                outerRadius={80}
                                paddingAngle={5}
                                dataKey="value"
                            >
                                {data.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                            </Pie>
                            <Tooltip formatter={(value: number | undefined) => value !== undefined ? formatCurrency(value) : '0 zł'} />
                            <Legend />
                        </PieChart>
                    </ResponsiveContainer>
                )}
            </CardContent>
        </Card>
    );
}
