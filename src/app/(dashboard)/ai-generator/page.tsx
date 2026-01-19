'use client';

import { useState, useEffect } from 'react';
import { Sparkles, Send, Copy, RefreshCw, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Breadcrumbs } from '@/components/shared/breadcrumbs';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import { formatCurrency } from '@/lib/utils/format-currency';

interface Debtor {
    id: string;
    name: string;
}

interface Invoice {
    id: string;
    invoice_number: string;
    amount: number;
    debtor_id: string;
    due_date: string;
}

const tones = [
    { id: 'soft', name: 'Łagodny', description: 'Uprzejme przypomnienie' },
    { id: 'standard', name: 'Standardowy', description: 'Profesjonalne wezwanie' },
    { id: 'firm', name: 'Stanowczy', description: 'Zdecydowane wezwanie' },
    { id: 'final', name: 'Ostateczny', description: 'Przed windykacją' },
];

const generateMessage = (debtor: string, invoiceNumber: string, amount: number, tone: string) => {
    const greeting = tone === 'soft'
        ? 'Szanowni Państwo,'
        : tone === 'final'
            ? 'OSTATECZNE WEZWANIE DO ZAPŁATY'
            : 'Szanowni Państwo,';

    const body = tone === 'soft'
        ? `Uprzejmie przypominamy o niezapłaconej fakturze nr ${invoiceNumber} na kwotę ${formatCurrency(amount)}.`
        : tone === 'firm'
            ? `Informujemy, że faktura nr ${invoiceNumber} na kwotę ${formatCurrency(amount)} jest przeterminowana. Prosimy o natychmiastową wpłatę.`
            : tone === 'final'
                ? `Niniejszym wzywamy do natychmiastowej zapłaty faktury nr ${invoiceNumber} na kwotę ${formatCurrency(amount)}. W przypadku braku wpłaty w ciągu 7 dni sprawa zostanie przekazana do windykacji.`
                : `Informujemy, że faktura nr ${invoiceNumber} na kwotę ${formatCurrency(amount)} pozostaje nieopłacona. Prosimy o uregulowanie należności.`;

    return `${greeting}

${body}

W razie pytań prosimy o kontakt.

Z poważaniem,
Zespół Windykacji`;
};

export default function AIGeneratorPage() {
    const [debtors, setDebtors] = useState<Debtor[]>([]);
    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [selectedDebtor, setSelectedDebtor] = useState('');
    const [selectedInvoice, setSelectedInvoice] = useState('');
    const [selectedTone, setSelectedTone] = useState('standard');
    const [generatedMessage, setGeneratedMessage] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);

    // Load data from database
    useEffect(() => {
        async function loadData() {
            const supabase = createClient();

            const { data: debtorsData } = await supabase
                .from('debtors')
                .select('id, name')
                .order('name');

            const { data: invoicesData } = await supabase
                .from('invoices')
                .select('id, invoice_number, amount, debtor_id, due_date')
                .neq('status', 'paid')
                .order('due_date');

            if (debtorsData) setDebtors(debtorsData);
            if (invoicesData) setInvoices(invoicesData);
        }
        loadData();
    }, []);

    const handleGenerate = async () => {
        if (!selectedDebtor || !selectedInvoice) {
            toast.error('Wybierz kontrahenta i fakturę');
            return;
        }

        setIsGenerating(true);

        // Simulate AI generation delay
        await new Promise((resolve) => setTimeout(resolve, 1000));

        const debtor = debtors.find(d => d.id === selectedDebtor);
        const invoice = invoices.find(i => i.id === selectedInvoice);

        if (debtor && invoice) {
            const message = generateMessage(debtor.name, invoice.invoice_number, invoice.amount, selectedTone);
            setGeneratedMessage(message);
        }

        setIsGenerating(false);
        toast.success('Wiadomość wygenerowana!');
    };

    const handleCopy = () => {
        navigator.clipboard.writeText(generatedMessage);
        toast.success('Skopiowano do schowka');
    };

    const handleSend = () => {
        toast.success('Wiadomość zostałaby wysłana (funkcja w przygotowaniu)');
    };

    const filteredInvoices = selectedDebtor
        ? invoices.filter((inv) => inv.debtor_id === selectedDebtor)
        : invoices;

    const hasData = debtors.length > 0 && invoices.length > 0;

    return (
        <div className="space-y-6">
            <Breadcrumbs />

            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold flex items-center gap-2">
                    <Sparkles className="h-8 w-8 text-primary" />
                    Generator AI
                </h1>
                <p className="text-muted-foreground mt-1">
                    Generuj spersonalizowane wezwania do zapłaty z pomocą AI
                </p>
            </div>

            {/* No data warning */}
            {!hasData && (
                <Card className="border-amber-500/50 bg-amber-50 dark:bg-amber-950/20">
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-3">
                            <AlertCircle className="h-5 w-5 text-amber-600" />
                            <p className="text-sm">
                                Dodaj kontrahentów i faktury, żeby móc generować wiadomości windykacyjne.
                            </p>
                        </div>
                    </CardContent>
                </Card>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Configuration */}
                <Card>
                    <CardHeader>
                        <CardTitle>Konfiguracja</CardTitle>
                        <CardDescription>
                            Wybierz parametry wiadomości
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label>Kontrahent</Label>
                            <Select onValueChange={setSelectedDebtor}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Wybierz kontrahenta" />
                                </SelectTrigger>
                                <SelectContent>
                                    {debtors.length === 0 ? (
                                        <SelectItem value="none" disabled>Brak kontrahentów</SelectItem>
                                    ) : (
                                        debtors.map((debtor) => (
                                            <SelectItem key={debtor.id} value={debtor.id}>
                                                {debtor.name}
                                            </SelectItem>
                                        ))
                                    )}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label>Faktura</Label>
                            <Select onValueChange={setSelectedInvoice}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Wybierz fakturę" />
                                </SelectTrigger>
                                <SelectContent>
                                    {filteredInvoices.length === 0 ? (
                                        <SelectItem value="none" disabled>Brak faktur</SelectItem>
                                    ) : (
                                        filteredInvoices.map((invoice) => (
                                            <SelectItem key={invoice.id} value={invoice.id}>
                                                {invoice.invoice_number} ({formatCurrency(invoice.amount)})
                                            </SelectItem>
                                        ))
                                    )}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label>Ton wiadomości</Label>
                            <div className="grid grid-cols-2 gap-2">
                                {tones.map((tone) => (
                                    <Button
                                        key={tone.id}
                                        type="button"
                                        variant={selectedTone === tone.id ? 'default' : 'outline'}
                                        className="h-auto py-3 flex-col"
                                        onClick={() => setSelectedTone(tone.id)}
                                    >
                                        <span className="font-medium">{tone.name}</span>
                                        <span className="text-xs opacity-70">{tone.description}</span>
                                    </Button>
                                ))}
                            </div>
                        </div>

                        <Button
                            className="w-full"
                            onClick={handleGenerate}
                            disabled={isGenerating || !hasData}
                        >
                            {isGenerating ? (
                                <>
                                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                                    Generowanie...
                                </>
                            ) : (
                                <>
                                    <Sparkles className="h-4 w-4 mr-2" />
                                    Generuj wiadomość
                                </>
                            )}
                        </Button>
                    </CardContent>
                </Card>

                {/* Generated message */}
                <Card>
                    <CardHeader>
                        <CardTitle>Wygenerowana wiadomość</CardTitle>
                        <CardDescription>
                            Możesz edytować przed wysłaniem
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <Textarea
                            value={generatedMessage}
                            onChange={(e) => setGeneratedMessage(e.target.value)}
                            placeholder="Tutaj pojawi się wygenerowana wiadomość..."
                            rows={15}
                            className="font-mono text-sm"
                        />

                        {generatedMessage && (
                            <div className="flex gap-2">
                                <Button variant="outline" className="flex-1" onClick={handleCopy}>
                                    <Copy className="h-4 w-4 mr-2" />
                                    Kopiuj
                                </Button>
                                <Button className="flex-1" onClick={handleSend}>
                                    <Send className="h-4 w-4 mr-2" />
                                    Wyślij email
                                </Button>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Info */}
            <Card className="bg-muted/50">
                <CardContent className="pt-6">
                    <p className="text-sm text-muted-foreground">
                        🤖 <strong>Uwaga:</strong> W wersji MVP generator używa szablonów z placeholderami.
                        W wersji produkcyjnej zostanie zintegrowany z OpenAI GPT-4 lub Claude
                        dla pełnej personalizacji wiadomości.
                    </p>
                </CardContent>
            </Card>
        </div>
    );
}
