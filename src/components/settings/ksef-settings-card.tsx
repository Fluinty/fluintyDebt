'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
    FileText,
    Loader2,
    Check,
    X,
    RefreshCw,
    Settings,
    AlertTriangle,
    ExternalLink,
    Eye,
    EyeOff,
    Upload,
    FileKey,
    Shield
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';

import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import {
    Alert,
    AlertDescription,
    AlertTitle,
} from '@/components/ui/alert';
import { toast } from 'sonner';
import {
    getKSeFSettings,
    saveKSeFSettings,
    testKSeFConnection,
    deleteKSeFSettings,
    syncKSeFInvoices,
    deleteAllUserInvoices
} from '@/app/actions/ksef-actions';
import type { KSeFEnvironment, SyncFrequency, UserKSeFSettings } from '@/lib/ksef/types';

interface KSeFSettingsCardProps {
    companyNip?: string;
}

export function KSeFSettingsCard({ companyNip }: KSeFSettingsCardProps) {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [isTesting, setIsTesting] = useState(false);
    const [isSyncing, setIsSyncing] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [showDisconnectDialog, setShowDisconnectDialog] = useState(false);

    const [settings, setSettings] = useState<UserKSeFSettings | null>(null);

    // File states
    const [certFile, setCertFile] = useState<File | null>(null);
    const [keyFile, setKeyFile] = useState<File | null>(null);
    const [certPassword, setCertPassword] = useState('');

    const [formData, setFormData] = useState({
        ksef_environment: 'production' as KSeFEnvironment,
        ksef_nip: companyNip || '',
        is_enabled: false,
        sync_frequency: 'daily' as SyncFrequency,
        sync_time: '21:00',
        auto_confirm_invoices: false,
    });

    // Sync companyNip from profile into formData when it becomes available
    useEffect(() => {
        if (companyNip && !formData.ksef_nip) {
            setFormData(prev => ({ ...prev, ksef_nip: companyNip }));
        }
    }, [companyNip]);

    useEffect(() => {
        loadSettings();
    }, [companyNip]);

    const loadSettings = async () => {
        setIsLoading(true);
        const result = await getKSeFSettings();
        if (result.settings) {
            setSettings(result.settings);
            setFormData({
                ksef_environment: result.settings.ksef_environment as KSeFEnvironment,
                ksef_nip: result.settings.ksef_nip || companyNip || '',
                is_enabled: result.settings.is_enabled,
                sync_frequency: result.settings.sync_frequency,
                sync_time: result.settings.sync_time || '21:00',
                auto_confirm_invoices: result.settings.auto_confirm_invoices,
            });
            // We don't load files back, but we can set password placeholder if it exists
        } else {
            // No settings saved yet - populate NIP from profile
            setFormData(prev => ({
                ...prev,
                ksef_nip: companyNip || prev.ksef_nip,
            }));
        }
        setIsLoading(false);
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'cert' | 'key') => {
        const file = e.target.files?.[0] || null;
        if (type === 'cert') setCertFile(file);
        if (type === 'key') setKeyFile(file);
    };

    const handleSave = async () => {
        if (!formData.ksef_nip) {
            toast.error('Wprowadź NIP powiązany z KSeF');
            return;
        }

        const isNewConfig = !settings?.ksef_cert_storage_path && !settings?.ksef_token_encrypted;
        // Also consider re-upload if one file is missing but other present in state? 
        // Logic: if user selects ANY file, we assume they update credentials.

        // If it's a new config, ensure files are present
        if (isNewConfig || (!settings?.ksef_cert_storage_path && !settings?.ksef_token_encrypted)) {
            if (!certFile) {
                toast.error('Wybierz plik certyfikatu (.crt / .pem)');
                return;
            }
            if (!keyFile) {
                toast.error('Wybierz plik klucza prywatnego (.key / .pem)');
                return;
            }
        }

        // If user wants to update certificate, they should probably provide both or we handle partial updates?
        // Typically cert and key go together. If user provides one, they should provide other.
        if ((certFile && !keyFile) || (!certFile && keyFile)) {
            if (!settings?.ksef_cert_storage_path) { // exact logic might vary, but simplified:
                // if strictly updating, maybe require both to avoid mismatch
                toast.warning('Zalecane jest podanie zarówno certyfikatu jak i klucza prywatnego, aby zapewnić ich zgodność.');
            }
        }

        setIsSaving(true);

        const data = new FormData();
        data.append('ksef_environment', formData.ksef_environment);
        data.append('ksef_nip', formData.ksef_nip);
        data.append('is_enabled', String(formData.is_enabled));
        data.append('sync_frequency', formData.sync_frequency);
        data.append('sync_time', formData.sync_time);
        data.append('auto_confirm_invoices', String(formData.auto_confirm_invoices));

        // Always set format to PEM for separate files
        data.append('ksef_cert_format', 'pem');

        if (certFile) data.append('ksef_cert_file', certFile);
        if (keyFile) data.append('ksef_key_file', keyFile);
        if (certPassword) data.append('ksef_cert_password', certPassword);

        const result = await saveKSeFSettings(data);
        setIsSaving(false);

        if (result.success) {
            toast.success('Ustawienia KSeF zostały zapisane');
            // reset files inputs
            setCertFile(null);
            setKeyFile(null);
            setCertPassword('');
            // Optional: reset file input values via ref if needed, but react state null is okay for logic.
            // visual reset of input is harder without uncontrolled component or key reset.
            await loadSettings();
        } else {
            toast.error('Błąd: ' + result.error);
        }
    };

    const handleTestConnection = async () => {
        setIsTesting(true);
        const result = await testKSeFConnection();
        setIsTesting(false);

        if (result.success) {
            toast.success(result.message);
        } else {
            toast.error(result.message);
        }
    };

    const handleDisconnect = async () => {
        const result = await deleteKSeFSettings();
        if (result.success) {
            toast.success('KSeF został rozłączony');
            setSettings(null);
            setFormData({
                ksef_environment: 'production',
                ksef_nip: '',
                is_enabled: false,
                sync_frequency: 'daily',
                sync_time: '21:00',
                auto_confirm_invoices: false,
            });
            setShowDisconnectDialog(false);
            setCertFile(null);
            setKeyFile(null);
            setCertPassword('');
        } else {
            toast.error('Błąd: ' + result.error);
        }
    };

    if (isLoading) {
        return (
            <Card>
                <CardContent className="py-12 flex justify-center">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </CardContent>
            </Card>
        );
    }

    // Check if configured - based on existence of cert path
    const isConfigured = settings !== null && (!!settings.ksef_cert_storage_path || !!settings.ksef_token_encrypted);

    const handleSyncNow = async () => {
        setIsSyncing(true);
        try {
            const result = await syncKSeFInvoices(30); // Last 30 days (dedup skips existing)
            if (result.success) {
                if (result.warning) {
                    toast.warning(result.warning);
                } else {
                    toast.success(`Pobrano ${result.invoicesImported} faktur z KSeF`);
                }
                await loadSettings(); // Refresh to show new sync time
            } else {
                toast.error('Błąd: ' + result.error);
            }
        } catch (err) {
            toast.error('Wystąpił błąd podczas synchronizacji');
        } finally {
            setIsSyncing(false);
        }
    };

    const handleClearInvoices = async () => {
        try {
            const result = await deleteAllUserInvoices();
            if (result.success) {
                toast.success(`Usunięto ${result.deletedCount} faktur`);
            } else {
                toast.error('Błąd: ' + result.error);
            }
        } catch (err) {
            toast.error('Wystąpił błąd podczas usuwania faktur');
        }
    };
    const isSyncInProgress = isSyncing;

    // Check if form has changes compared to saved settings
    const hasChanges = !isConfigured || (
        (!!certFile) || // New file selected
        (!!keyFile) ||
        (!!certPassword) ||
        formData.ksef_nip !== (settings?.ksef_nip || '') ||
        formData.ksef_environment !== settings?.ksef_environment ||
        formData.is_enabled !== settings?.is_enabled ||
        formData.sync_frequency !== settings?.sync_frequency ||
        formData.sync_time !== (settings?.sync_time || '21:00') ||
        formData.auto_confirm_invoices !== settings?.auto_confirm_invoices
    );

    return (
        <>
            {/* Full-page loading overlay */}
            {isSyncInProgress && (
                <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center">
                    <div className="flex flex-col items-center gap-4 p-8 rounded-lg bg-card border shadow-lg">
                        <Loader2 className="h-12 w-12 animate-spin text-primary" />
                        <div className="text-center">
                            <p className="text-lg font-semibold">Synchronizacja z KSeF...</p>
                            <p className="text-sm text-muted-foreground">
                                Pobieranie faktur. To może potrwać kilka sekund.
                            </p>
                        </div>
                    </div>
                </div>
            )}

            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-primary/10">
                                <FileText className="h-5 w-5 text-primary" />
                            </div>
                            <div>
                                <CardTitle>KSeF 2.0</CardTitle>
                                <CardDescription>
                                    Integracja za pomocą Certyfikatu i Klucza Prywatnego
                                </CardDescription>
                            </div>
                        </div>
                        {isConfigured ? (
                            <Badge
                                className={settings?.is_enabled
                                    ? 'bg-green-500 hover:bg-green-600 text-white'
                                    : 'bg-red-500 hover:bg-red-600 text-white'
                                }
                            >
                                {settings?.is_enabled ? 'Aktywny' : 'Nieaktywny'}
                            </Badge>
                        ) : (
                            <Badge variant="outline">Nieskonfigurowany</Badge>
                        )}
                    </div>
                </CardHeader>
                <CardContent className="space-y-6">
                    {/* Production environment — always fixed */}
                    <Alert className="border-amber-200 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-900">
                        <AlertTriangle className="h-4 w-4 text-amber-600" />
                        <AlertTitle className="text-amber-800 dark:text-amber-400">Środowisko produkcyjne</AlertTitle>
                        <AlertDescription className="text-amber-700 dark:text-amber-500">
                            Wszystkie operacje są wykonywane na prawdziwych danych w KSeF MF.{' '}
                            <a
                                href="https://ap.ksef.mf.gov.pl/"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 underline font-medium"
                            >
                                ksef.mf.gov.pl <ExternalLink className="h-3 w-3" />
                            </a>
                        </AlertDescription>
                    </Alert>

                    {/* Step-by-step guide */}
                    <div className="rounded-lg border bg-muted/40 p-4 space-y-3">
                        <p className="text-sm font-semibold flex items-center gap-2">
                            <span className="text-base">📋</span>
                            Jak nadać uprawnienia i pobrać certyfikat z KSeF?
                        </p>
                        <ol className="text-sm text-muted-foreground space-y-2 list-none">
                            <li className="flex gap-2">
                                <span className="flex-shrink-0 w-5 h-5 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center font-bold">1</span>
                                <span>Wejdź na <a href="https://ap.ksef.mf.gov.pl/" target="_blank" rel="noopener noreferrer" className="text-primary underline">ksef.mf.gov.pl</a> i zaloguj się przez profil zaufany lub e-dowód.</span>
                            </li>
                            <li className="flex gap-2">
                                <span className="flex-shrink-0 w-5 h-5 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center font-bold">2</span>
                                <span>Przejdź do <strong>Ustawienia → Certyfikaty</strong> (lub „Zarządzanie certyfikatami").</span>
                            </li>
                            <li className="flex gap-2">
                                <span className="flex-shrink-0 w-5 h-5 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center font-bold">3</span>
                                <span>
                                    Kliknij <strong>„Wygeneruj certyfikat"</strong> — wybierz typ <em>Certyfikat aplikacji</em>.{' '}
                                    Wystarczy uprawnienie <strong className="text-foreground">Odczyt faktur</strong>{' '}
                                    — FluintyDebt tylko pobiera faktury, nie wystawia ich.
                                </span>
                            </li>
                            <li className="flex gap-2">
                                <span className="flex-shrink-0 w-5 h-5 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center font-bold">4</span>
                                <span>Pobierz pliki: <strong>certyfikat (.pem lub .crt)</strong> oraz <strong>klucz prywatny (.key)</strong>. Zapisz hasło jeśli zostało ustawione.</span>
                            </li>
                            <li className="flex gap-2">
                                <span className="flex-shrink-0 w-5 h-5 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center font-bold">5</span>
                                <span>Wróć tutaj i wgraj oba pliki poniżej. Gotowe! 🎉</span>
                            </li>
                        </ol>
                    </div>


                    {/* NIP */}
                    <div className="space-y-2">
                        <Label htmlFor="ksef_nip">NIP powiązany z KSeF</Label>
                        <Input
                            id="ksef_nip"
                            value={formData.ksef_nip}
                            onChange={(e) => setFormData({ ...formData, ksef_nip: e.target.value })}
                            placeholder="1234567890"
                            maxLength={10}
                            readOnly={!!companyNip}
                            className={companyNip ? 'bg-muted cursor-not-allowed' : ''}
                        />
                        <p className="text-xs text-muted-foreground">
                            {companyNip
                                ? 'NIP pobierany automatycznie z danych firmy (zakładka "Dane firmy")'
                                : 'NIP firmy, dla której wygenerowany jest certyfikat'
                            }
                        </p>
                    </div>

                    {/* Certificate and Key Upload */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                        <div className="space-y-2">
                            <Label htmlFor="ksef_cert" className="flex items-center gap-2">
                                <Upload className="h-4 w-4" />
                                Certyfikat (Publiczny)
                                {isConfigured && settings?.ksef_cert_storage_path && (
                                    <Check className="h-4 w-4 text-green-500" />
                                )}
                            </Label>
                            <Input
                                id="ksef_cert"
                                type="file"
                                accept=".crt,.pem,.cer"
                                onChange={(e) => handleFileChange(e, 'cert')}
                            />
                            <p className="text-xs text-muted-foreground">
                                Format: .pem, .crt (Klucz publiczny)
                            </p>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="ksef_key" className="flex items-center gap-2">
                                <FileKey className="h-4 w-4" />
                                Klucz Prywatny
                                {isConfigured && settings?.ksef_key_storage_path && (
                                    <Check className="h-4 w-4 text-green-500" />
                                )}
                            </Label>
                            <Input
                                id="ksef_key"
                                type="file"
                                accept=".key,.pem"
                                onChange={(e) => handleFileChange(e, 'key')}
                            />
                            <p className="text-xs text-muted-foreground">
                                Format: .pem, .key (Klucz prywatny)
                            </p>
                        </div>
                    </div>

                    {/* Private Key Password */}
                    <div className="space-y-2">
                        <Label htmlFor="ksef_password" className="flex items-center gap-2">
                            <Shield className="h-4 w-4" />
                            Hasło klucza prywatnego (opcjonalne)
                        </Label>
                        <div className="relative">
                            <Input
                                id="ksef_password"
                                type={showPassword ? 'text' : 'password'}
                                value={certPassword}
                                onChange={(e) => setCertPassword(e.target.value)}
                                placeholder={isConfigured && settings?.ksef_cert_password_encrypted ? '••••••••' : 'Wpisz hasło klucza jeśli jest wymagane'}
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
                        <p className="text-xs text-muted-foreground">
                            Wymagane tylko jeśli Twój klucz prywatny jest zabezpieczony hasłem.
                        </p>
                    </div>

                    {/* Sync settings */}
                    {isConfigured && (
                        <>
                            <div className="space-y-4 pt-4 border-t">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <Label>Włącz automatyczny import</Label>
                                        <p className="text-xs text-muted-foreground">
                                            Automatycznie pobieraj nowe faktury z KSeF
                                        </p>
                                    </div>
                                    <Switch
                                        checked={formData.is_enabled}
                                        onCheckedChange={(checked) =>
                                            setFormData({ ...formData, is_enabled: checked })
                                        }
                                    />
                                </div>

                                {/* Info o automatycznej synchronizacji */}
                                <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-950/30 text-sm border border-blue-200 dark:border-blue-900">
                                    <div className="flex items-center gap-2">
                                        <RefreshCw className="h-4 w-4 text-blue-600" />
                                        <span className="font-medium text-blue-700 dark:text-blue-400">
                                            Automatyczna synchronizacja: codziennie o 7:00
                                        </span>
                                    </div>
                                    <p className="text-xs text-blue-600/80 dark:text-blue-400/80 mt-1">
                                        Faktury z KSeF są pobierane automatycznie raz dziennie.
                                        Możesz też pobrać ręcznie klikając przycisk poniżej.
                                    </p>
                                </div>

                                <div className="flex items-center justify-between">
                                    <div>
                                        <Label>Automatyczne potwierdzanie faktur</Label>
                                        <p className="text-xs text-muted-foreground">
                                            Pomiń krok ręcznego potwierdzania importowanych faktur
                                        </p>
                                    </div>
                                    <Switch
                                        checked={formData.auto_confirm_invoices}
                                        onCheckedChange={(checked) =>
                                            setFormData({ ...formData, auto_confirm_invoices: checked })
                                        }
                                    />
                                </div>
                            </div>

                            {/* Sync status */}
                            {settings?.last_sync_at && (
                                <div className="p-3 rounded-lg bg-muted text-sm">
                                    <div className="flex items-center justify-between">
                                        <span className="text-muted-foreground">Ostatnia synchronizacja:</span>
                                        <span>{new Date(settings.last_sync_at).toLocaleString('pl-PL')}</span>
                                    </div>
                                    {settings.invoices_synced_count > 0 && (
                                        <div className="flex items-center justify-between mt-1">
                                            <span className="text-muted-foreground">Zaimportowanych faktur:</span>
                                            <span>{settings.invoices_synced_count}</span>
                                        </div>
                                    )}
                                </div>
                            )}
                        </>
                    )}

                    {/* Actions */}
                    <div className="flex flex-wrap gap-2 pt-4 border-t">
                        <Button onClick={handleSave} disabled={isSaving || !hasChanges}>
                            {isSaving ? (
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            ) : (
                                <Check className="h-4 w-4 mr-2" />
                            )}
                            {isConfigured ? 'Zapisz zmiany' : 'Połącz z KSeF'}
                        </Button>

                        {isConfigured && (
                            <>
                                <Button
                                    variant="outline"
                                    onClick={handleTestConnection}
                                    disabled={isTesting}
                                >
                                    {isTesting ? (
                                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    ) : (
                                        <RefreshCw className="h-4 w-4 mr-2" />
                                    )}
                                    Testuj połączenie
                                </Button>

                                <Button
                                    variant="outline"
                                    onClick={handleClearInvoices}
                                >
                                    <X className="h-4 w-4 mr-2" />
                                    Wyczyść faktury
                                </Button>

                                <Button
                                    variant="secondary"
                                    onClick={handleSyncNow}
                                    disabled={isSyncing}
                                >
                                    {isSyncing ? (
                                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    ) : (
                                        <FileText className="h-4 w-4 mr-2" />
                                    )}
                                    Pobierz faktury (1 dzień)
                                </Button>

                                <Dialog open={showDisconnectDialog} onOpenChange={setShowDisconnectDialog}>
                                    <DialogTrigger asChild>
                                        <Button variant="destructive">
                                            <X className="h-4 w-4 mr-2" />
                                            Rozłącz
                                        </Button>
                                    </DialogTrigger>
                                    <DialogContent>
                                        <DialogHeader>
                                            <DialogTitle>Rozłącz KSeF?</DialogTitle>
                                            <DialogDescription>
                                                Czy na pewno chcesz usunąć konfigurację KSeF?
                                                Certyfikaty zostaną usunięte i automatyczny import faktur zostanie wyłączony.
                                            </DialogDescription>
                                        </DialogHeader>
                                        <DialogFooter>
                                            <Button variant="outline" onClick={() => setShowDisconnectDialog(false)}>
                                                Anuluj
                                            </Button>
                                            <Button variant="destructive" onClick={handleDisconnect}>
                                                Rozłącz
                                            </Button>
                                        </DialogFooter>
                                    </DialogContent>
                                </Dialog>
                            </>
                        )}
                    </div>
                </CardContent>
            </Card>
        </>
    );
}
