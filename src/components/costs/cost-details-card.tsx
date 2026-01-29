'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Copy, CreditCard, Landmark, Building2, Calendar } from 'lucide-react';
import { formatCurrency } from '@/lib/utils/format-currency';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface CostDetailsCardProps {
    invoice: {
        id: string;
        invoice_number: string;
        contractor_name: string;
        account_number?: string | null; // Allow null
        amount: number;
        amount_gross?: number;
        currency: string;
        payment_status: string; // 'to_pay' | 'paid'
        issue_date: string;
        due_date: string;
    }
}

export function CostDetailsCard({ invoice }: CostDetailsCardProps) {
    const copyToClipboard = (text: string, label: string) => {
        navigator.clipboard.writeText(text);
        toast.success(`Skopiowano ${label}`);
    };

    const isPaid = invoice.payment_status === 'paid';
    const amountToPay = invoice.amount_gross || invoice.amount;
    const accountNumber = invoice.account_number || 'Brak numeru konta w systemie';

    return (
        <Card className="w-full shadow-sm border-muted">
            <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                    <Landmark className="h-5 w-5 text-primary" />
                    Dane do przelewu
                </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-6 pt-4">

                {/* Account Number Section - PRIMARY FOCUS */}
                <div className="space-y-3">
                    <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                        <Landmark className="h-4 w-4" />
                        Numer Konta Odbiorcy
                    </label>
                    <div className="flex items-center gap-3 p-4 bg-muted/30 border rounded-xl group hover:border-primary/30 transition-colors">
                        <span className="font-mono text-2xl md:text-3xl font-semibold tracking-wider flex-1 truncate text-foreground/90">
                            {formatAccountForDisplay(accountNumber)}
                        </span>
                        <Button
                            size="icon"
                            variant="secondary"
                            className="h-12 w-12 shrink-0 shadow-sm hover:bg-primary hover:text-white transition-all"
                            onClick={() => copyToClipboard(accountNumber.replace(/\s/g, ''), 'numer konta')}
                            disabled={!invoice.account_number}
                        >
                            <Copy className="h-5 w-5" />
                        </Button>
                    </div>
                </div>

                {/* Transfer Title & Dates */}
                <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-3">
                        <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                            <CreditCard className="h-4 w-4" />
                            Tytuł Przelewu
                        </label>
                        <div className="flex items-center gap-2 p-3 bg-muted/30 border rounded-lg">
                            <span className="font-medium flex-1 truncate">
                                Faktura {invoice.invoice_number}
                            </span>
                            <Button
                                size="sm"
                                variant="ghost"
                                className="h-8 w-8"
                                onClick={() => copyToClipboard(`Faktura ${invoice.invoice_number}`, 'tytuł przelewu')}
                            >
                                <Copy className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>

                    <div className="space-y-3">
                        <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                            <Calendar className="h-4 w-4" />
                            Status i Termin
                        </label>
                        <div className="flex items-center gap-4 h-[50px]">
                            {isPaid ? (
                                <Badge variant="default" className="bg-emerald-100 text-emerald-700 border-emerald-200 px-3 py-1 font-semibold text-sm hover:bg-emerald-100">
                                    Opłacona
                                </Badge>
                            ) : (
                                <Badge variant="outline" className="border-amber-200 bg-amber-50 text-amber-700 px-3 py-1 font-semibold text-sm">
                                    Do zapłaty
                                </Badge>
                            )}
                            <span className="text-sm text-muted-foreground">
                                Termin: <span className="font-medium text-foreground">{invoice.due_date}</span>
                            </span>
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}

// Helper to format account number with spaces (PL XX XXXX ...)
function formatAccountForDisplay(account: string) {
    if (!account) return '---';
    // Remove existing spaces, assume it's just digits or with PL
    const clean = account.replace(/\s/g, '');
    // Regex matches groups of 4 digits (and 2 at start)
    return clean.match(/.{1,4}/g)?.join(' ') || account;
}
