'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react';

interface CostDynamicsProps {
    data: {
        category: string;
        currentAmount: number;
        lastAmount: number;
        changePercent: number;
    }[];
}

export function CostDynamics({ data }: CostDynamicsProps) {
    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('pl-PL', {
            style: 'currency',
            currency: 'PLN',
            maximumFractionDigits: 0,
        }).format(amount);
    };

    return (
        <Card className="col-span-1">
            <CardHeader>
                <CardTitle>Dynamika Kosztów (M/M)</CardTitle>
                <CardDescription>
                    Zmiany w wydatkach względem poprzedniego miesiąca
                </CardDescription>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    {data.slice(0, 6).map((item, index) => { // Show top 6 movers
                        const isIncrease = item.changePercent > 0;
                        const isDecrease = item.changePercent < 0;
                        const isNeutral = item.changePercent === 0;

                        return (
                            <div key={index} className="flex items-center justify-between border-b pb-2 last:border-0 last:pb-0">
                                <div>
                                    <p className="font-medium text-sm">{item.category}</p>
                                    <p className="text-xs text-muted-foreground">
                                        {formatCurrency(item.currentAmount)} vs {formatCurrency(item.lastAmount)}
                                    </p>
                                </div>
                                <div className={`flex items-center font-bold text-sm ${isIncrease ? 'text-red-500' :
                                        isDecrease ? 'text-green-500' : 'text-gray-500'
                                    }`}>
                                    {isIncrease && <ArrowUpRight className="h-4 w-4 mr-1" />}
                                    {isDecrease && <ArrowDownRight className="h-4 w-4 mr-1" />}
                                    {isNeutral && <Minus className="h-3 w-3 mr-1" />}
                                    {isIncrease ? '+' : ''}{Math.round(item.changePercent)}%
                                </div>
                            </div>
                        );
                    })}
                    {data.length === 0 && (
                        <p className="text-center text-muted-foreground text-sm py-4">Brak wystarczających danych do porównania</p>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
