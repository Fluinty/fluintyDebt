'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
    Building2,
    Users,
    FileText,
    Zap,
    Check,
    ArrowRight,
    ArrowLeft,
    FileKey,
    ExternalLink,
    Search,
    Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';

interface OnboardingWizardProps {
    onComplete: (data?: any) => void;
}

const steps = [
    { id: 1, title: 'Dane firmy', icon: Building2 },
    { id: 2, title: 'KSeF (opcjonalne)', icon: FileKey },
    { id: 3, title: 'Pierwszy kontrahent', icon: Users },
    { id: 4, title: 'Pierwsza faktura', icon: FileText },
    { id: 5, title: 'Sekwencja', icon: Zap },
];

const VAT_RATES = [
    { value: '23', label: '23%' },
    { value: '8', label: '8%' },
    { value: '5', label: '5%' },
    { value: '0', label: '0%' },
    { value: 'zw', label: 'Zwolniony' },
    { value: 'np', label: 'Nie podlega' },
];

export function OnboardingWizard({ onComplete }: OnboardingWizardProps) {
    const router = useRouter();
    const [currentStep, setCurrentStep] = useState(1);
    const [loadingGus, setLoadingGus] = useState(false);

    // Company data
    const [companyData, setCompanyData] = useState({
        name: '',
        nip: '',
        street: '',
        street_number: '',
        city: '',
        postal_code: '',
        bank_account: '',
    });

    // Debtor data
    const [debtorData, setDebtorData] = useState({
        name: '',
        nip: '',
        email: '',
        phone: '',
        address: '',
        city: '',
        postal_code: '',
    });
    const [skipDebtor, setSkipDebtor] = useState(false);

    // Invoice data
    const [invoiceData, setInvoiceData] = useState({
        invoice_number: '',
        amount_net: '',
        vat_rate: '23',
        amount_gross: '',
        issue_date: new Date().toISOString().split('T')[0],
        due_date: '',
        description: '',
    });
    const [skipInvoice, setSkipInvoice] = useState(false);

    // Sequence choice
    const [selectedSequence, setSelectedSequence] = useState('standard');

    // KSeF data (optional)
    const [ksefData, setKsefData] = useState({
        token: '',
        nip: '',
        skipSetup: false,
    });

    const progress = (currentStep / steps.length) * 100;

    // Calculate gross from net
    const calculateGross = (net: string, vatRate: string) => {
        if (!net) return '';
        const netNum = parseFloat(net);
        if (isNaN(netNum)) return '';

        if (vatRate === 'zw' || vatRate === 'np') {
            return net;
        }
        const rate = parseFloat(vatRate) / 100;
        return (netNum * (1 + rate)).toFixed(2);
    };

    // Update gross when net or VAT changes
    const handleNetChange = (value: string) => {
        setInvoiceData({
            ...invoiceData,
            amount_net: value,
            amount_gross: calculateGross(value, invoiceData.vat_rate),
        });
    };

    const handleVatChange = (value: string) => {
        setInvoiceData({
            ...invoiceData,
            vat_rate: value,
            amount_gross: calculateGross(invoiceData.amount_net, value),
        });
    };

    // GUS lookup for debtor
    const handleGusLookup = async () => {
        if (!debtorData.nip || debtorData.nip.length !== 10) {
            toast.error('Wprowadź poprawny NIP (10 cyfr)');
            return;
        }

        setLoadingGus(true);
        try {
            const response = await fetch(`/api/gus/lookup?nip=${debtorData.nip}`);
            if (response.ok) {
                const data = await response.json();
                if (data.name) {
                    setDebtorData({
                        ...debtorData,
                        name: data.name || debtorData.name,
                        address: data.street || '',
                        city: data.city || '',
                        postal_code: data.postalCode || '',
                    });
                    toast.success('Dane pobrane z GUS');
                } else {
                    toast.error('Nie znaleziono firmy w GUS');
                }
            } else {
                toast.error('Błąd połączenia z GUS');
            }
        } catch (error) {
            toast.error('Nie można połączyć się z GUS');
        } finally {
            setLoadingGus(false);
        }
    };

    const handleNext = () => {
        if (currentStep < steps.length) {
            setCurrentStep(currentStep + 1);
        } else {
            handleComplete();
        }
    };

    const handleBack = () => {
        if (currentStep > 1) {
            setCurrentStep(currentStep - 1);
        }
    };

    const handleSkipStep = () => {
        if (currentStep === 3) {
            // Skipping debtor means we can't add invoice either (invoice needs debtor)
            setSkipDebtor(true);
            setSkipInvoice(true);
            // Jump to step 5 (sequences), skipping step 4
            setCurrentStep(5);
            return;
        }
        if (currentStep === 4) setSkipInvoice(true);
        handleNext();
    };

    const handleComplete = () => {
        // Build address from parts
        const fullAddress = [companyData.street, companyData.street_number].filter(Boolean).join(' ');

        const data = {
            company: {
                name: companyData.name,
                nip: companyData.nip,
                address: fullAddress,
                city: companyData.city,
                postal_code: companyData.postal_code,
                bank_account: companyData.bank_account,
            },
            debtor: skipDebtor ? null : debtorData,
            invoice: skipInvoice ? null : invoiceData,
            ksef: ksefData,
            sequence: selectedSequence,
        };
        console.log('Onboarding complete:', data);
        toast.success('Konfiguracja zakończona! Witaj w FluintyDebt 🎉');
        onComplete(data);
    };

    const handleSkipAll = () => {
        toast.info('Możesz dokończyć konfigurację później w Ustawieniach');
        onComplete();
    };

    // Validation for Step 1 - only name is truly required
    const canProceedStep1 = companyData.name.trim().length > 0;

    return (
        <div className="fixed inset-0 bg-background/95 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                <CardHeader className="text-center pb-2">
                    <div className="flex justify-center gap-2 mb-4">
                        {steps.map((step, idx) => {
                            const Icon = step.icon;
                            const isActive = step.id === currentStep;
                            const isComplete = step.id < currentStep;
                            return (
                                <div
                                    key={step.id}
                                    className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${isComplete
                                        ? 'bg-green-500 text-white'
                                        : isActive
                                            ? 'bg-primary text-primary-foreground'
                                            : 'bg-muted text-muted-foreground'
                                        }`}
                                >
                                    {isComplete ? <Check className="h-5 w-5" /> : <Icon className="h-5 w-5" />}
                                </div>
                            );
                        })}
                    </div>
                    <Progress value={progress} className="mb-4" />
                    <CardTitle>Krok {currentStep}: {steps[currentStep - 1].title}</CardTitle>
                    <CardDescription>
                        {currentStep === 1 && 'Uzupełnij podstawowe dane Twojej firmy'}
                        {currentStep === 2 && 'Automatyczny import faktur z Krajowego Systemu e-Faktur'}
                        {currentStep === 3 && 'Dodaj pierwszego kontrahenta do windykacji'}
                        {currentStep === 4 && 'Dodaj pierwszą fakturę do odzyskania'}
                        {currentStep === 5 && 'Wybierz domyślną sekwencję windykacyjną'}
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    {/* Step 1: Company */}
                    {currentStep === 1 && (
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="company_name">Nazwa firmy *</Label>
                                    <Input
                                        id="company_name"
                                        value={companyData.name}
                                        onChange={(e) => setCompanyData({ ...companyData, name: e.target.value })}
                                        placeholder="Twoja Firma Sp. z o.o."
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="company_nip">NIP *</Label>
                                    <Input
                                        id="company_nip"
                                        value={companyData.nip}
                                        onChange={(e) => setCompanyData({ ...companyData, nip: e.target.value })}
                                        placeholder="1234567890"
                                        maxLength={10}
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-3 gap-4">
                                <div className="col-span-2 space-y-2">
                                    <Label htmlFor="company_street">Ulica</Label>
                                    <Input
                                        id="company_street"
                                        value={companyData.street}
                                        onChange={(e) => setCompanyData({ ...companyData, street: e.target.value })}
                                        placeholder="ul. Biznesowa"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="company_number">Numer</Label>
                                    <Input
                                        id="company_number"
                                        value={companyData.street_number}
                                        onChange={(e) => setCompanyData({ ...companyData, street_number: e.target.value })}
                                        placeholder="15/3"
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="company_city">Miasto</Label>
                                    <Input
                                        id="company_city"
                                        value={companyData.city}
                                        onChange={(e) => setCompanyData({ ...companyData, city: e.target.value })}
                                        placeholder="Warszawa"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="company_postal">Kod pocztowy</Label>
                                    <Input
                                        id="company_postal"
                                        value={companyData.postal_code}
                                        onChange={(e) => setCompanyData({ ...companyData, postal_code: e.target.value })}
                                        placeholder="00-001"
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="bank_account">Numer konta bankowego</Label>
                                <Input
                                    id="bank_account"
                                    value={companyData.bank_account}
                                    onChange={(e) => setCompanyData({ ...companyData, bank_account: e.target.value })}
                                    placeholder="XX XXXX XXXX XXXX XXXX XXXX XXXX"
                                />
                                <p className="text-xs text-muted-foreground">
                                    Będzie wyświetlany w wezwaniach do zapłaty
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Step 2: KSeF (Optional) */}
                    {currentStep === 2 && (
                        <div className="space-y-4">
                            <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
                                <div className="flex items-start gap-3">
                                    <FileKey className="h-5 w-5 text-primary mt-0.5" />
                                    <div>
                                        <p className="font-medium">Automatyczny import faktur</p>
                                        <p className="text-sm text-muted-foreground mt-1">
                                            Połącz się z KSeF, aby automatycznie importować faktury sprzedażowe
                                            i uruchamiać dla nich sekwencje windykacyjne.
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {!ksefData.skipSetup ? (
                                <>
                                    <div className="space-y-2">
                                        <Label htmlFor="ksef_nip">NIP firmy</Label>
                                        <Input
                                            id="ksef_nip"
                                            value={ksefData.nip || companyData.nip}
                                            onChange={(e) => setKsefData({ ...ksefData, nip: e.target.value })}
                                            placeholder="1234567890"
                                            maxLength={10}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="ksef_token">Token autoryzacyjny</Label>
                                        <Input
                                            id="ksef_token"
                                            type="password"
                                            value={ksefData.token}
                                            onChange={(e) => setKsefData({ ...ksefData, token: e.target.value })}
                                            placeholder="Wklej token z aplikacji KSeF"
                                        />
                                        <p className="text-xs text-muted-foreground">
                                            Token możesz wygenerować w{' '}
                                            <a
                                                href="https://ksef-test.mf.gov.pl/aplikacja-podatnika-ksef/"
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-primary hover:underline inline-flex items-center gap-1"
                                            >
                                                Aplikacji Podatnika KSeF
                                                <ExternalLink className="h-3 w-3" />
                                            </a>
                                        </p>
                                    </div>
                                    <Button
                                        variant="ghost"
                                        onClick={() => setKsefData({ ...ksefData, skipSetup: true })}
                                        className="w-full"
                                    >
                                        Pomiń krok - skonfiguruję później
                                    </Button>
                                </>
                            ) : (
                                <div className="text-center py-6">
                                    <p className="text-muted-foreground">
                                        Integracja KSeF pominięta
                                    </p>
                                    <button
                                        type="button"
                                        onClick={() => setKsefData({ ...ksefData, skipSetup: false })}
                                        className="text-sm text-primary hover:underline mt-2"
                                    >
                                        Chcę jednak skonfigurować teraz
                                    </button>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Step 3: Debtor */}
                    {currentStep === 3 && (
                        <div className="space-y-4">
                            {!skipDebtor ? (
                                <>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="debtor_nip">NIP kontrahenta</Label>
                                            <div className="flex gap-2">
                                                <Input
                                                    id="debtor_nip"
                                                    value={debtorData.nip}
                                                    onChange={(e) => setDebtorData({ ...debtorData, nip: e.target.value })}
                                                    placeholder="9876543210"
                                                    maxLength={10}
                                                />
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    onClick={handleGusLookup}
                                                    disabled={loadingGus}
                                                    title="Pobierz dane z GUS"
                                                >
                                                    {loadingGus ? (
                                                        <Loader2 className="h-4 w-4 animate-spin" />
                                                    ) : (
                                                        <Search className="h-4 w-4" />
                                                    )}
                                                </Button>
                                            </div>
                                            <p className="text-xs text-muted-foreground">
                                                Wpisz NIP i kliknij lupę, aby pobrać dane z GUS
                                            </p>
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="debtor_name">Nazwa kontrahenta</Label>
                                            <Input
                                                id="debtor_name"
                                                value={debtorData.name}
                                                onChange={(e) => setDebtorData({ ...debtorData, name: e.target.value })}
                                                placeholder="ABC Sp. z o.o."
                                            />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="debtor_email">Email</Label>
                                            <Input
                                                id="debtor_email"
                                                type="email"
                                                value={debtorData.email}
                                                onChange={(e) => setDebtorData({ ...debtorData, email: e.target.value })}
                                                placeholder="kontakt@abc.pl"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="debtor_phone">Telefon</Label>
                                            <Input
                                                id="debtor_phone"
                                                value={debtorData.phone}
                                                onChange={(e) => setDebtorData({ ...debtorData, phone: e.target.value })}
                                                placeholder="+48 123 456 789"
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="debtor_address">Adres</Label>
                                        <Input
                                            id="debtor_address"
                                            value={debtorData.address}
                                            onChange={(e) => setDebtorData({ ...debtorData, address: e.target.value })}
                                            placeholder="ul. Przykładowa 10"
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="debtor_city">Miasto</Label>
                                            <Input
                                                id="debtor_city"
                                                value={debtorData.city}
                                                onChange={(e) => setDebtorData({ ...debtorData, city: e.target.value })}
                                                placeholder="Kraków"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="debtor_postal">Kod pocztowy</Label>
                                            <Input
                                                id="debtor_postal"
                                                value={debtorData.postal_code}
                                                onChange={(e) => setDebtorData({ ...debtorData, postal_code: e.target.value })}
                                                placeholder="30-001"
                                            />
                                        </div>
                                    </div>
                                </>
                            ) : (
                                <div className="text-center py-6">
                                    <p className="text-muted-foreground">
                                        Dodasz kontrahentów później
                                    </p>
                                    <button
                                        type="button"
                                        onClick={() => setSkipDebtor(false)}
                                        className="text-sm text-primary hover:underline mt-2"
                                    >
                                        Chcę jednak dodać teraz
                                    </button>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Step 4: Invoice */}
                    {currentStep === 4 && (
                        <div className="space-y-4">
                            {!skipInvoice ? (
                                <>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="invoice_number">Numer faktury</Label>
                                            <Input
                                                id="invoice_number"
                                                value={invoiceData.invoice_number}
                                                onChange={(e) => setInvoiceData({ ...invoiceData, invoice_number: e.target.value })}
                                                placeholder="FV/2026/001"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="invoice_vat">Stawka VAT</Label>
                                            <Select value={invoiceData.vat_rate} onValueChange={handleVatChange}>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Wybierz stawkę" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {VAT_RATES.map((rate) => (
                                                        <SelectItem key={rate.value} value={rate.value}>
                                                            {rate.label}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="invoice_net">Kwota netto (PLN)</Label>
                                            <Input
                                                id="invoice_net"
                                                type="number"
                                                step="0.01"
                                                value={invoiceData.amount_net}
                                                onChange={(e) => handleNetChange(e.target.value)}
                                                placeholder="4065.04"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="invoice_gross">Kwota brutto (PLN)</Label>
                                            <Input
                                                id="invoice_gross"
                                                type="number"
                                                step="0.01"
                                                value={invoiceData.amount_gross}
                                                readOnly
                                                className="bg-muted"
                                                placeholder="5000.00"
                                            />
                                            <p className="text-xs text-muted-foreground">
                                                Obliczana automatycznie
                                            </p>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="invoice_issue">Termin wystawienia</Label>
                                            <Input
                                                id="invoice_issue"
                                                type="date"
                                                value={invoiceData.issue_date}
                                                onChange={(e) => setInvoiceData({ ...invoiceData, issue_date: e.target.value })}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="invoice_due">Termin płatności</Label>
                                            <Input
                                                id="invoice_due"
                                                type="date"
                                                value={invoiceData.due_date}
                                                onChange={(e) => setInvoiceData({ ...invoiceData, due_date: e.target.value })}
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="invoice_desc">Opis</Label>
                                        <Textarea
                                            id="invoice_desc"
                                            value={invoiceData.description}
                                            onChange={(e) => setInvoiceData({ ...invoiceData, description: e.target.value })}
                                            placeholder="Usługi konsultingowe..."
                                            rows={2}
                                        />
                                    </div>
                                </>
                            ) : (
                                <div className="text-center py-6">
                                    <p className="text-muted-foreground">
                                        Dodasz faktury później
                                    </p>
                                    <button
                                        type="button"
                                        onClick={() => setSkipInvoice(false)}
                                        className="text-sm text-primary hover:underline mt-2"
                                    >
                                        Chcę jednak dodać teraz
                                    </button>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Step 5: Sequence */}
                    {currentStep === 5 && (
                        <div className="space-y-4">
                            <div className="bg-amber-500/10 border border-amber-500/20 p-4 rounded-lg">
                                <p className="text-sm">
                                    🎯 <strong>Wybrana sekwencja będzie domyślna dla wszystkich nowych kontrahentów.</strong>
                                    <br />
                                    Możesz później dodać własne sekwencje i przypisywać różne sekwencje do poszczególnych kontrahentów w ich widoku.
                                </p>
                            </div>
                            <div className="grid gap-3">
                                {[
                                    {
                                        id: 'gentle',
                                        name: 'Windykacja Łagodna',
                                        desc: '7 kroków przez 45 dni, nastawiona na utrzymanie relacji',
                                        steps: '0d, +2d, +7d, +15d, +30d (SMS), +30d, +45d',
                                    },
                                    {
                                        id: 'standard',
                                        name: 'Windykacja Standardowa',
                                        desc: '6 kroków przez 35 dni, najczęściej wybierana',
                                        steps: '+1d, +5d, +12d, +22d (Email+SMS), +35d',
                                    },
                                    {
                                        id: 'quick',
                                        name: 'Szybka Eskalacja',
                                        desc: '4 kroki przez 14 dni, dla ryzykownych klientów',
                                        steps: '+1d, +7d (Email+SMS), +14d',
                                    },
                                ].map((seq) => (
                                    <div
                                        key={seq.id}
                                        onClick={() => setSelectedSequence(seq.id)}
                                        className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${selectedSequence === seq.id
                                            ? 'border-primary bg-primary/5'
                                            : 'border-muted hover:border-primary/50'
                                            }`}
                                    >
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <p className="font-medium">{seq.name}</p>
                                                <p className="text-sm text-muted-foreground">{seq.desc}</p>
                                                <p className="text-xs text-muted-foreground mt-1">{seq.steps}</p>
                                            </div>
                                            {selectedSequence === seq.id && (
                                                <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                                                    <Check className="h-4 w-4 text-primary-foreground" />
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <div className="bg-primary/5 p-4 rounded-lg">
                                <p className="text-sm">
                                    💡 Możesz później stworzyć własne sekwencje w sekcji <strong>Sekwencje</strong>
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Actions */}
                    <div className="flex justify-between pt-4 border-t">
                        <div className="flex gap-2">
                            {currentStep > 1 ? (
                                <Button variant="outline" onClick={handleBack}>
                                    <ArrowLeft className="h-4 w-4 mr-2" />
                                    Wstecz
                                </Button>
                            ) : (
                                <Button variant="ghost" onClick={handleSkipAll}>
                                    Pomiń wszystko
                                </Button>
                            )}
                        </div>
                        <div className="flex gap-2">
                            {/* Skip button for steps 3 and 4 */}
                            {(currentStep === 3 || currentStep === 4) && !(skipDebtor && currentStep === 3) && !(skipInvoice && currentStep === 4) && (
                                <Button variant="ghost" onClick={handleSkipStep}>
                                    Pomiń
                                </Button>
                            )}
                            <Button onClick={handleNext} disabled={currentStep === 1 && !canProceedStep1}>
                                {currentStep === steps.length ? (
                                    <>
                                        <Check className="h-4 w-4 mr-2" />
                                        Zakończ
                                    </>
                                ) : (
                                    <>
                                        Dalej
                                        <ArrowRight className="h-4 w-4 ml-2" />
                                    </>
                                )}
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
