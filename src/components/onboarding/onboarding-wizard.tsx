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
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
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

export function OnboardingWizard({ onComplete }: OnboardingWizardProps) {
    const router = useRouter();
    const [currentStep, setCurrentStep] = useState(1);

    // Company data
    const [companyData, setCompanyData] = useState({
        name: '',
        nip: '',
        address: '',
        city: '',
        bank_account: '',
    });

    // Debtor data
    const [debtorData, setDebtorData] = useState({
        name: '',
        nip: '',
        email: '',
        phone: '',
    });

    // Invoice data
    const [invoiceData, setInvoiceData] = useState({
        invoice_number: '',
        amount: '',
        due_date: '',
        description: '',
    });

    // Sequence choice
    const [selectedSequence, setSelectedSequence] = useState('standard');

    // KSeF data (optional)
    const [ksefData, setKsefData] = useState({
        token: '',
        nip: '',
        skipSetup: false,
    });

    const progress = (currentStep / steps.length) * 100;

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

    const handleComplete = () => {
        const data = {
            company: companyData,
            debtor: debtorData,
            invoice: invoiceData,
            ksef: ksefData,
            sequence: selectedSequence,
        };
        console.log('Onboarding complete:', data);
        toast.success('Konfiguracja zakończona! Witaj w FluintyDebt 🎉');
        onComplete(data);
    };

    const handleSkip = () => {
        toast.info('Możesz dokończyć konfigurację później w Ustawieniach');
        onComplete();
    };

    return (
        <div className="fixed inset-0 bg-background/95 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <Card className="w-full max-w-2xl">
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
                        {currentStep === 5 && 'Wybierz sekwencję windykacyjną'}
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
                                    <Label htmlFor="company_nip">NIP</Label>
                                    <Input
                                        id="company_nip"
                                        value={companyData.nip}
                                        onChange={(e) => setCompanyData({ ...companyData, nip: e.target.value })}
                                        placeholder="1234567890"
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="company_address">Adres</Label>
                                <Input
                                    id="company_address"
                                    value={companyData.address}
                                    onChange={(e) => setCompanyData({ ...companyData, address: e.target.value })}
                                    placeholder="ul. Biznesowa 15, 00-001 Warszawa"
                                />
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
                                        <Label htmlFor="ksef_nip">NIP firmy *</Label>
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
                                    <button
                                        type="button"
                                        onClick={() => setKsefData({ ...ksefData, skipSetup: true })}
                                        className="text-sm text-muted-foreground hover:text-foreground underline"
                                    >
                                        Pomiń - skonfiguruję później w Ustawieniach
                                    </button>
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
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="debtor_name">Nazwa kontrahenta *</Label>
                                    <Input
                                        id="debtor_name"
                                        value={debtorData.name}
                                        onChange={(e) => setDebtorData({ ...debtorData, name: e.target.value })}
                                        placeholder="ABC Sp. z o.o."
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="debtor_nip">NIP</Label>
                                    <Input
                                        id="debtor_nip"
                                        value={debtorData.nip}
                                        onChange={(e) => setDebtorData({ ...debtorData, nip: e.target.value })}
                                        placeholder="9876543210"
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="debtor_email">Email *</Label>
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
                        </div>
                    )}

                    {/* Step 4: Invoice */}
                    {currentStep === 4 && (
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="invoice_number">Numer faktury *</Label>
                                    <Input
                                        id="invoice_number"
                                        value={invoiceData.invoice_number}
                                        onChange={(e) => setInvoiceData({ ...invoiceData, invoice_number: e.target.value })}
                                        placeholder="FV/2026/001"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="invoice_amount">Kwota brutto (PLN) *</Label>
                                    <Input
                                        id="invoice_amount"
                                        type="number"
                                        value={invoiceData.amount}
                                        onChange={(e) => setInvoiceData({ ...invoiceData, amount: e.target.value })}
                                        placeholder="5000.00"
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="invoice_due">Termin płatności *</Label>
                                <Input
                                    id="invoice_due"
                                    type="date"
                                    value={invoiceData.due_date}
                                    onChange={(e) => setInvoiceData({ ...invoiceData, due_date: e.target.value })}
                                />
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
                        </div>
                    )}

                    {/* Step 5: Sequence */}
                    {currentStep === 5 && (
                        <div className="space-y-4">
                            <div className="grid gap-3">
                                {[
                                    {
                                        id: 'gentle',
                                        name: 'Łagodna',
                                        desc: '4 kroki, idealna dla VIP klientów',
                                        steps: '-3d, +3d, +14d, +30d',
                                    },
                                    {
                                        id: 'standard',
                                        name: 'Standardowa',
                                        desc: '6 kroków, zalecana dla większości',
                                        steps: '-7d, -1d, +1d, +7d, +14d, +30d',
                                    },
                                    {
                                        id: 'quick',
                                        name: 'Szybka eskalacja',
                                        desc: '8 kroków, dla trudnych klientów',
                                        steps: '-7d, -1d, +1d, +3d, +7d, +14d, +21d, +30d',
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
                                <Button variant="ghost" onClick={handleSkip}>
                                    Pomiń na razie
                                </Button>
                            )}
                        </div>
                        <Button onClick={handleNext}>
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
                </CardContent>
            </Card>
        </div>
    );
}
