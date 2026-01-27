'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Wallet, Pencil, Check, X, Loader2, Lock } from 'lucide-react';
import { formatCurrency } from '@/lib/utils/format-currency';
import { updateBankBalance } from '@/app/actions/profile-actions';
import { toast } from 'sonner';
import Link from 'next/link';

interface BankAccountWidgetProps {
    initialBalance: number;
    isLocked?: boolean;
}

export function BankAccountWidget({ initialBalance, isLocked = false }: BankAccountWidgetProps) {
    const [isEditing, setIsEditing] = useState(false);
    const [balance, setBalance] = useState(initialBalance);
    const [inputValue, setInputValue] = useState(initialBalance.toString());
    const [isLoading, setIsLoading] = useState(false);

    const handleSave = async () => {
        setIsLoading(true);
        const newBalance = parseFloat(inputValue);

        if (isNaN(newBalance)) {
            toast.error('Nieprawidłowa kwota');
            setIsLoading(false);
            return;
        }

        const result = await updateBankBalance(newBalance);

        if (result.error) {
            toast.error(result.error);
        } else {
            setBalance(newBalance);
            setIsEditing(false);
            toast.success('Saldo zaktualizowane');
        }
        setIsLoading(false);
    };

    const handleCancel = () => {
        setInputValue(balance.toString());
        setIsEditing(false);
    };

    return (
        <Card className="h-full relative overflow-hidden">
            {isLocked && (
                <div className="absolute inset-0 z-50 bg-background/50 backdrop-blur-sm flex flex-col items-center justify-center text-center p-4 animate-in fade-in duration-500">
                    <div className="bg-background/80 p-3 rounded-full shadow-sm mb-3">
                        <Lock className="h-5 w-5 text-muted-foreground" />
                    </div>
                </div>
            )}

            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                    Stan Konta (Ręczny)
                </CardTitle>
                <Wallet className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
                {isEditing ? (
                    <div className="flex items-center gap-2 mt-2">
                        <Input
                            type="number"
                            step="0.01"
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                            className="h-9"
                            autoFocus
                        />
                        <Button
                            size="sm"
                            onClick={handleSave}
                            disabled={isLoading}
                            className="h-9 w-9 p-0"
                        >
                            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                        </Button>
                        <Button
                            size="sm"
                            variant="ghost"
                            onClick={handleCancel}
                            disabled={isLoading}
                            className="h-9 w-9 p-0"
                        >
                            <X className="h-4 w-4" />
                        </Button>
                    </div>
                ) : (
                    <div className="flex items-end justify-between">
                        <div className="text-2xl font-bold">{formatCurrency(balance)}</div>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 -mb-1"
                            onClick={() => {
                                setInputValue(balance.toString());
                                setIsEditing(true);
                            }}
                            disabled={isLocked}
                            title="Edytuj saldo"
                        >
                            <Pencil className="h-3 w-3 text-muted-foreground" />
                        </Button>
                    </div>
                )}
                <p className="text-xs text-muted-foreground mt-2">
                    Punkt startowy dla prognozy Cash Flow
                </p>
            </CardContent>
        </Card>
    );
}
