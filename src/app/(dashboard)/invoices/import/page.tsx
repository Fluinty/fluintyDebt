'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Upload, FileSpreadsheet, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Breadcrumbs } from '@/components/shared/breadcrumbs';
import { toast } from 'sonner';

type ImportStep = 'upload' | 'mapping' | 'preview' | 'complete';

// Mock parsed data
const mockParsedData = [
    { invoice_number: 'FV/2026/100', debtor: 'Nowa Firma Sp. z o.o.', amount: 5000, due_date: '2026-02-15', error: null },
    { invoice_number: 'FV/2026/101', debtor: 'Kolejny Klient S.A.', amount: 12500, due_date: '2026-02-20', error: null },
    { invoice_number: 'FV/2026/102', debtor: '', amount: 3200, due_date: '2026-02-25', error: 'Brak nazwy kontrahenta' },
    { invoice_number: 'FV/2026/103', debtor: 'Testowa Hurtownia', amount: 8900, due_date: '2026-03-01', error: null },
    { invoice_number: '', debtor: 'Bez Numeru', amount: 1500, due_date: '2026-03-05', error: 'Brak numeru faktury' },
];

export default function InvoiceImportPage() {
    const router = useRouter();
    const [step, setStep] = useState<ImportStep>('upload');
    const [isProcessing, setIsProcessing] = useState(false);
    const [progress, setProgress] = useState(0);

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsProcessing(true);
        setProgress(0);

        // Simulate processing
        for (let i = 0; i <= 100; i += 20) {
            await new Promise((r) => setTimeout(r, 300));
            setProgress(i);
        }

        setIsProcessing(false);
        setStep('preview');
        toast.success('Plik został wczytany');
    };

    const handleImport = async () => {
        setIsProcessing(true);
        await new Promise((r) => setTimeout(r, 2000));
        setIsProcessing(false);
        setStep('complete');
        toast.success('Import zakończony!');
    };

    const validCount = mockParsedData.filter((d) => !d.error).length;
    const errorCount = mockParsedData.filter((d) => d.error).length;

    return (
        <div className="space-y-6">
            <Breadcrumbs />

            {/* Header */}
            <div className="flex items-center gap-4">
                <Link href="/invoices">
                    <Button variant="ghost" size="icon">
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                </Link>
                <div>
                    <h1 className="text-3xl font-bold">Import faktur</h1>
                    <p className="text-muted-foreground mt-1">
                        Zaimportuj faktury z pliku CSV lub Excel
                    </p>
                </div>
            </div>

            {/* Steps indicator */}
            <div className="flex items-center gap-4">
                {['upload', 'preview', 'complete'].map((s, i) => (
                    <div key={s} className="flex items-center">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${step === s ? 'bg-primary text-primary-foreground' :
                                ['upload', 'preview', 'complete'].indexOf(step) > i ? 'bg-green-500 text-white' : 'bg-muted text-muted-foreground'
                            }`}>
                            {['upload', 'preview', 'complete'].indexOf(step) > i ? '✓' : i + 1}
                        </div>
                        {i < 2 && <div className="w-12 h-0.5 bg-muted mx-2" />}
                    </div>
                ))}
            </div>

            {/* Upload step */}
            {step === 'upload' && (
                <Card>
                    <CardHeader>
                        <CardTitle>Wgraj plik</CardTitle>
                        <CardDescription>
                            Obsługiwane formaty: CSV, XLSX
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="border-2 border-dashed rounded-lg p-12 text-center hover:border-primary/50 transition-colors">
                            <input
                                type="file"
                                accept=".csv,.xlsx,.xls"
                                onChange={handleFileUpload}
                                className="hidden"
                                id="file-upload"
                            />
                            <label htmlFor="file-upload" className="cursor-pointer">
                                <FileSpreadsheet className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                                <p className="text-lg font-medium">Przeciągnij plik lub kliknij, aby wybrać</p>
                                <p className="text-sm text-muted-foreground mt-1">CSV, Excel (max 10MB)</p>
                            </label>
                        </div>

                        {isProcessing && (
                            <div className="space-y-2">
                                <div className="flex items-center gap-2">
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    <span>Przetwarzanie pliku...</span>
                                </div>
                                <Progress value={progress} />
                            </div>
                        )}

                        <div className="bg-muted/50 p-4 rounded-lg">
                            <p className="font-medium mb-2">Wymagane kolumny:</p>
                            <ul className="text-sm text-muted-foreground space-y-1">
                                <li>• <code>numer_faktury</code> - numer faktury</li>
                                <li>• <code>kontrahent</code> - nazwa kontrahenta</li>
                                <li>• <code>kwota</code> - kwota brutto</li>
                                <li>• <code>termin_platnosci</code> - data YYYY-MM-DD</li>
                            </ul>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Preview step */}
            {step === 'preview' && (
                <div className="space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                        <Card>
                            <CardContent className="pt-6 flex items-center gap-4">
                                <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
                                    <CheckCircle className="h-6 w-6 text-green-600" />
                                </div>
                                <div>
                                    <p className="text-2xl font-bold">{validCount}</p>
                                    <p className="text-sm text-muted-foreground">Poprawnych wierszy</p>
                                </div>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardContent className="pt-6 flex items-center gap-4">
                                <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                                    <AlertCircle className="h-6 w-6 text-red-600" />
                                </div>
                                <div>
                                    <p className="text-2xl font-bold">{errorCount}</p>
                                    <p className="text-sm text-muted-foreground">Błędów (zostaną pominięte)</p>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    <Card>
                        <CardHeader>
                            <CardTitle>Podgląd danych</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b bg-muted/50">
                                            <th className="text-left p-3">Nr faktury</th>
                                            <th className="text-left p-3">Kontrahent</th>
                                            <th className="text-left p-3">Kwota</th>
                                            <th className="text-left p-3">Termin</th>
                                            <th className="text-left p-3">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {mockParsedData.map((row, i) => (
                                            <tr key={i} className={`border-b ${row.error ? 'bg-red-50' : ''}`}>
                                                <td className="p-3">{row.invoice_number || '-'}</td>
                                                <td className="p-3">{row.debtor || '-'}</td>
                                                <td className="p-3">{row.amount.toLocaleString('pl-PL')} PLN</td>
                                                <td className="p-3">{row.due_date}</td>
                                                <td className="p-3">
                                                    {row.error ? (
                                                        <Badge variant="destructive">{row.error}</Badge>
                                                    ) : (
                                                        <Badge className="bg-green-100 text-green-800 border-0">OK</Badge>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </CardContent>
                    </Card>

                    <div className="flex gap-4">
                        <Button variant="outline" onClick={() => setStep('upload')}>
                            Wróć
                        </Button>
                        <Button onClick={handleImport} disabled={isProcessing}>
                            {isProcessing ? (
                                <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Importowanie...</>
                            ) : (
                                <><Upload className="h-4 w-4 mr-2" />Importuj {validCount} faktur</>
                            )}
                        </Button>
                    </div>
                </div>
            )}

            {/* Complete step */}
            {step === 'complete' && (
                <Card>
                    <CardContent className="pt-12 pb-12 text-center">
                        <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
                            <CheckCircle className="h-8 w-8 text-green-600" />
                        </div>
                        <h2 className="text-2xl font-bold mb-2">Import zakończony!</h2>
                        <p className="text-muted-foreground mb-6">
                            Zaimportowano {validCount} faktur. {errorCount > 0 && `${errorCount} wierszy zostało pominiętych z powodu błędów.`}
                        </p>
                        <div className="flex justify-center gap-4">
                            <Button variant="outline" onClick={() => setStep('upload')}>
                                Importuj kolejny plik
                            </Button>
                            <Link href="/invoices">
                                <Button>Przejdź do faktur</Button>
                            </Link>
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
