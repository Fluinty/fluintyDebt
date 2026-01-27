'use client';

import { QRCodeCanvas } from 'qrcode.react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { QrCode, Copy } from 'lucide-react';
import { generatePolishPaymentQr } from '@/lib/utils/payment-qr';
import { toast } from 'sonner';
import { formatCurrency } from '@/lib/utils/format-currency';

interface PayWithQRProps {
    invoiceNumber: string;
    accountNumber: string;
    amount: number;
    contractorName: string;
    title?: string;
}

export function PayWithQR({
    invoiceNumber,
    accountNumber,
    amount,
    contractorName,
    title
}: PayWithQRProps) {
    if (!accountNumber) return null;

    const paymentTitle = title || `Faktura ${invoiceNumber}`;
    const qrValue = generatePolishPaymentQr(accountNumber, amount, contractorName, paymentTitle);

    const copyToClipboard = (text: string, label: string) => {
        navigator.clipboard.writeText(text);
        toast.success(`Skopiowano ${label}`);
    };

    return (
        <Dialog>
            <DialogTrigger asChild>
                <Button size="sm" variant="outline" className="gap-2">
                    <QrCode className="h-4 w-4" />
                    Zapłać
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Zeskanuj i zapłać</DialogTitle>
                    <DialogDescription>
                        Użyj aplikacji bankowej, aby zeskanować kod i opłacić fakturę (Standard Polski).
                    </DialogDescription>
                </DialogHeader>
                <div className="flex flex-col items-center justify-center p-6 space-y-6">
                    <div className="p-4 bg-white rounded-xl shadow-sm border">
                        <QRCodeCanvas
                            value={qrValue}
                            size={200}
                            level="M"
                            bgColor="#ffffff"
                            fgColor="#000000"
                        />
                    </div>

                    <div className="w-full space-y-3 text-sm">
                        <div className="flex justify-between items-center p-2 bg-muted/50 rounded-lg">
                            <span className="text-muted-foreground mr-2">Odbiorca:</span>
                            <span className="font-medium truncate max-w-[200px]">{contractorName}</span>
                        </div>
                        <div className="flex justify-between items-center p-2 bg-muted/50 rounded-lg">
                            <span className="text-muted-foreground mr-2">Konto:</span>
                            <div className="flex items-center gap-2">
                                <span className="font-mono text-xs">{accountNumber}</span>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6"
                                    onClick={() => copyToClipboard(accountNumber, 'numer konta')}
                                >
                                    <Copy className="h-3 w-3" />
                                </Button>
                            </div>
                        </div>
                        <div className="flex justify-between items-center p-2 bg-muted/50 rounded-lg">
                            <span className="text-muted-foreground mr-2">Kwota:</span>
                            <span className="font-bold text-lg">{formatCurrency(amount)}</span>
                        </div>
                        <div className="flex justify-between items-center p-2 bg-muted/50 rounded-lg">
                            <span className="text-muted-foreground mr-2">Tytuł:</span>
                            <div className="flex items-center gap-2">
                                <span className="truncate max-w-[200px]">{paymentTitle}</span>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6"
                                    onClick={() => copyToClipboard(paymentTitle, 'tytuł przelewu')}
                                >
                                    <Copy className="h-3 w-3" />
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
