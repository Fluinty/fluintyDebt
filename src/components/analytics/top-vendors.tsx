'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';

interface TopVendorsProps {
    data: {
        name: string;
        amount: number;
        percentage: number;
    }[];
}

export function TopVendors({ data }: TopVendorsProps) {
    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('pl-PL', {
            style: 'currency',
            currency: 'PLN',
        }).format(amount);
    };

    return (
        <Card className="col-span-1">
            <CardHeader>
                <CardTitle>Ranking Dostawców (Top 5)</CardTitle>
                <CardDescription>
                    Komu płacisz najwięcej
                </CardDescription>
            </CardHeader>
            <CardContent>
                <div className="space-y-5">
                    {data.map((vendor, index) => (
                        <div key={index} className="space-y-2">
                            <div className="flex items-center justify-between text-sm">
                                <div className="flex items-center gap-2">
                                    <span className="font-medium w-4 text-muted-foreground">{index + 1}.</span>
                                    <span className="font-medium truncate max-w-[150px] sm:max-w-[200px]" title={vendor.name}>
                                        {vendor.name}
                                    </span>
                                </div>
                                <div className="text-right">
                                    <span className="font-bold">{formatCurrency(vendor.amount)}</span>
                                    <span className="text-muted-foreground ml-2 text-xs">({Math.round(vendor.percentage)}%)</span>
                                </div>
                            </div>
                            <Progress value={vendor.percentage} className="h-2" />
                        </div>
                    ))}
                    {data.length === 0 && (
                        <p className="text-center text-muted-foreground text-sm py-4">Brak danych o dostawcach</p>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
