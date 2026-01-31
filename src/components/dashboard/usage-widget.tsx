'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { MessageSquare, Phone, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface UsageWidgetProps {
    smsUsed: number;
    smsLimit: number;
    callsUsed: number;
    callsLimit: number;
}

export function UsageWidget({ smsUsed, smsLimit, callsUsed, callsLimit }: UsageWidgetProps) {
    const smsPercentage = smsLimit > 0 ? Math.round((smsUsed / smsLimit) * 100) : 0;
    const callsPercentage = callsLimit > 0 ? Math.round((callsUsed / callsLimit) * 100) : 0;

    const getProgressColor = (percentage: number) => {
        if (percentage >= 100) return 'bg-red-500';
        if (percentage >= 80) return 'bg-yellow-500';
        return 'bg-primary';
    };

    const isLimitReached = (used: number, limit: number) => used >= limit && limit > 0;

    // Don't show if user has no limits (trial or not subscribed)
    if (smsLimit === 0 && callsLimit === 0) {
        return null;
    }

    return (
        <Card>
            <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                    Zużycie w tym miesiącu
                    {(smsPercentage >= 80 || callsPercentage >= 80) && (
                        <AlertTriangle className="h-4 w-4 text-yellow-500" />
                    )}
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
                {/* SMS Usage */}
                <div className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                            <MessageSquare className="h-4 w-4 text-blue-500" />
                            <span>SMS</span>
                        </div>
                        <span className={cn(
                            "font-medium",
                            isLimitReached(smsUsed, smsLimit) && "text-red-500"
                        )}>
                            {smsUsed}/{smsLimit}
                        </span>
                    </div>
                    <Progress
                        value={smsPercentage}
                        className={cn("h-2", getProgressColor(smsPercentage))}
                    />
                </div>

                {/* Calls Usage */}
                <div className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                            <Phone className="h-4 w-4 text-green-500" />
                            <span>Połączenia <span className="text-muted-foreground text-[10px] ml-1">(Wkrótce)</span></span>
                        </div>
                        <span className={cn(
                            "font-medium",
                            isLimitReached(callsUsed, callsLimit) && "text-red-500"
                        )}>
                            0/0
                        </span>
                    </div>
                    <Progress
                        value={callsPercentage}
                        className={cn("h-2", getProgressColor(callsPercentage))}
                    />
                </div>

                {/* Warning message */}
                {(isLimitReached(smsUsed, smsLimit) || isLimitReached(callsUsed, callsLimit)) && (
                    <p className="text-xs text-red-500 mt-2">
                        Limit wyczerpany. Ulepsz plan, aby kontynuować.
                    </p>
                )}
            </CardContent>
        </Card >
    );
}
