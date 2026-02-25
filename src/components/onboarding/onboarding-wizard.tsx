'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
    Building2,
    Zap,
    Check,
    ArrowRight,
    ArrowLeft,
    FileKey,
    ExternalLink,
    Search,
    Loader2,
    ShieldCheck,
    Upload,
    Eye,
    EyeOff
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { toast } from 'sonner';
import { fetchCompanyByNip } from '@/app/actions/gus-actions';
import { saveKSeFSettings } from '@/app/actions/ksef-actions';
import type { KSeFEnvironment } from '@/lib/ksef/types';

interface OnboardingWizardProps {
    onComplete: (data?: any) => void;
}

const steps = [
    { id: 1, title: 'Dane firmy', icon: Building2 },
    { id: 2, title: 'KSeF (opcjonalne)', icon: FileKey },
    { id: 3, title: 'Domyślna sekwencja', icon: Zap },
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

    // Sequence choice
    const [selectedSequence, setSelectedSequence] = useState('standard');

    // KSeF data
    const [ksefData, setKsefData] = useState({
        isConfigured: false,
        skipSetup: false,
    });

    // KSeF Form State
    const ksefEnv = 'production' as KSeFEnvironment;
    const [ksefNip, setKsefNip] = useState('');
    const [certFormat, setCertFormat] = useState<'p12' | 'pem'>('pem');
    const [certFile, setCertFile] = useState<File | null>(null);
    const [keyFile, setKeyFile] = useState<File | null>(null);
    const [p12File, setP12File] = useState<File | null>(null);
    const [certPassword, setCertPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [isConnectingKsef, setIsConnectingKsef] = useState(false);

    const progress = (currentStep / steps.length) * 100;

    const handleNext = () => {
        if (currentStep < steps.length) {
            // Pre-fill KSeF NIP from Company NIP if clear
            if (currentStep === 1 && !ksefNip) {
                setKsefNip(companyData.nip);
            }
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

    const handleGusLookup = async () => {
        if (!companyData.nip || companyData.nip.trim().length === 0) {
            toast.error('Wprowadź numer NIP');
            return;
        }

        setLoadingGus(true);
        try {
            const result = await fetchCompanyByNip(companyData.nip);

            if (result.success && result.data) {
                setCompanyData({
                    ...companyData,
                    name: result.data.name || companyData.name,
                    street: result.data.address || companyData.street,
                    city: result.data.city || companyData.city,
                    postal_code: result.data.postal_code || companyData.postal_code,
                });
                toast.success('Dane pobrane z GUS');
            } else {
                toast.error(result.error || 'Nie znaleziono danych');
            }
        } catch (error) {
            toast.error('Błąd połączenia z GUS');
        } finally {
            setLoadingGus(false);
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'cert' | 'key' | 'p12') => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            if (type === 'cert') setCertFile(file);
            if (type === 'key') setKeyFile(file);
            if (type === 'p12') setP12File(file);
        }
    };

    const handleConnectKSeF = async () => {
        if (!ksefNip) {
            toast.error('NIP jest wymagany');
            return;
        }

        if (certFormat === 'pem' && (!certFile || !keyFile)) {
            toast.error('Wymagane pliki .crt i .key');
            return;
        }
        if (certFormat === 'p12' && !p12File) {
            toast.error('Wymagany plik .p12');
            return;
        }

        setIsConnectingKsef(true);
        try {
            const formData = new FormData();
            formData.append('ksef_environment', ksefEnv);
            formData.append('ksef_nip', ksefNip);
            formData.append('ksef_cert_format', certFormat);
            formData.append('is_enabled', 'true');
            formData.append('auto_confirm_invoices', 'false'); // Default for wizard

            if (certPassword) formData.append('ksef_cert_password', certPassword);

            if (certFormat === 'pem') {
                if (certFile) formData.append('ksef_cert_file', certFile);
                if (keyFile) formData.append('ksef_key_file', keyFile);
            } else {
                if (p12File) formData.append('ksef_p12_file', p12File);
            }

            const result = await saveKSeFSettings(formData);

            if (result.success) {
                setKsefData({ isConfigured: true, skipSetup: false });
                toast.success('KSeF połączony pomyślnie! Certyfikat zweryfikowany przez Ministerstwo Finansów. ✅');
            } else {
                toast.error('Błąd połączenia z KSeF: ' + (result.error || 'Sprawdź certyfikat i klucz prywatny'));
            }
        } catch (e) {
            toast.error('Wystąpił nieoczekiwany błąd');
        } finally {
            setIsConnectingKsef(false);
        }
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
            // Note: KSeF is already saved if configured. passing basic meta-data
            ksef_configured: ksefData.isConfigured,
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
                        {currentStep === 2 && 'Skonfiguruj certyfikat KSeF (możesz pominąć)'}
                        {currentStep === 3 && 'Wybierz domyślną sekwencję windykacyjną'}
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
                                    <div className="flex gap-2">
                                        <Input
                                            id="company_nip"
                                            value={companyData.nip}
                                            onChange={(e) => setCompanyData({ ...companyData, nip: e.target.value })}
                                            placeholder="1234567890"
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
                                    maxLength={32}
                                />
                            </div>
                        </div>
                    )}

                    {/* Step 2: KSeF (Updated with Certificates) */}
                    {currentStep === 2 && (
                        <div className="space-y-4">
                            {!ksefData.skipSetup ? (
                                <>
                                    <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
                                        <div className="flex items-start gap-3">
                                            <ShieldCheck className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
                                            <div>
                                                <p className="font-medium">Autoryzacja certyfikatem</p>
                                                <p className="text-sm text-muted-foreground mt-1">
                                                    Wgraj certyfikat i klucz prywatny, aby w pełni zautomatyzować pobieranie faktur.
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    {!ksefData.isConfigured ? (
                                        <div className="space-y-4 border rounded-lg p-4 bg-card">
                                            {/* Production only — no env selector */}
                                            <div className="flex items-center gap-2 text-sm text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded px-3 py-2">
                                                <span>🏢</span>
                                                <span>Środowisko <strong>produkcyjne</strong> — ksef.mf.gov.pl</span>
                                            </div>

                                            <div className="space-y-2">
                                                <Label>Format kluczy</Label>
                                                <RadioGroup
                                                    value={certFormat}
                                                    onValueChange={(v: 'p12' | 'pem') => setCertFormat(v)}
                                                    className="flex gap-4 pt-2"
                                                >
                                                    <div className="flex items-center space-x-2">
                                                        <RadioGroupItem value="pem" id="wz-pem" />
                                                        <Label htmlFor="wz-pem">.crt + .key</Label>
                                                    </div>
                                                    <div className="flex items-center space-x-2">
                                                        <RadioGroupItem value="p12" id="wz-p12" />
                                                        <Label htmlFor="wz-p12">.p12</Label>
                                                    </div>
                                                </RadioGroup>
                                            </div>

                                            <div className="space-y-2">
                                                <Label>NIP</Label>
                                                <Input value={ksefNip} onChange={e => setKsefNip(e.target.value)} placeholder="NIP" />
                                            </div>

                                            {certFormat === 'pem' ? (
                                                <div className="grid grid-cols-2 gap-4">
                                                    <div className="space-y-2">
                                                        <Label>Certyfikat (.crt)</Label>
                                                        <Input type="file" accept=".crt,.pem,.cer" onChange={e => handleFileChange(e, 'cert')} />
                                                    </div>
                                                    <div className="space-y-2">
                                                        <Label>Klucz prywatny (.key)</Label>
                                                        <Input type="file" accept=".key,.pem" onChange={e => handleFileChange(e, 'key')} />
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="space-y-2">
                                                    <Label>Plik .p12</Label>
                                                    <Input type="file" accept=".p12,.pfx" onChange={e => handleFileChange(e, 'p12')} />
                                                </div>
                                            )}

                                            <div className="space-y-2">
                                                <Label>Hasło do klucza (opcjonalne)</Label>
                                                <div className="relative">
                                                    <Input
                                                        type={showPassword ? "text" : "password"}
                                                        value={certPassword}
                                                        onChange={e => setCertPassword(e.target.value)}
                                                        placeholder="Hasło jeśli wymagane"
                                                    />
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="sm"
                                                        className="absolute right-1 top-1/2 -translate-y-1/2"
                                                        onClick={() => setShowPassword(!showPassword)}
                                                    >
                                                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                                    </Button>
                                                </div>
                                            </div>

                                            <Button className="w-full mt-2" onClick={handleConnectKSeF} disabled={isConnectingKsef}>
                                                {isConnectingKsef && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                                Połącz z KSeF
                                            </Button>

                                            <div className="text-center pt-2">
                                                <Button variant="ghost" size="sm" onClick={() => setKsefData({ ...ksefData, skipSetup: true })}>
                                                    Pomiń konfigurację KSeF
                                                </Button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="text-center py-8 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                                            <div className="inline-flex p-3 rounded-full bg-green-100 dark:bg-green-800 mb-4">
                                                <Check className="h-8 w-8 text-green-600 dark:text-green-300" />
                                            </div>
                                            <h3 className="text-lg font-medium text-green-800 dark:text-green-300">Połączono pomyślnie!</h3>
                                            <p className="text-sm text-green-700 dark:text-green-400 mt-2">
                                                Twoja integracja KSeF jest gotowa. Faktury będą pobierane automatycznie.
                                            </p>
                                        </div>
                                    )}
                                </>
                            ) : (
                                <div className="text-center py-10 space-y-4">
                                    <div className="mx-auto w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                                        <FileKey className="h-6 w-6 text-muted-foreground" />
                                    </div>
                                    <div>
                                        <p className="font-medium text-muted-foreground">Konfiguracja KSeF pominięta</p>
                                        <p className="text-xs text-muted-foreground mt-1">Będziesz mógł to zrobić później w Ustawieniach.</p>
                                    </div>
                                    <Button variant="outline" size="sm" onClick={() => setKsefData({ ...ksefData, skipSetup: false })}>
                                        Chcę jednak skonfigurować teraz
                                    </Button>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Step 3: Sequence */}
                    {currentStep === 3 && (
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
                </CardContent>
            </Card>
        </div >
    );
}
