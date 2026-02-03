'use client';

import { useState, useEffect } from 'react';
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
    EyeOff
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
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
    const [showToken, setShowToken] = useState(false);
    const [showDisconnectDialog, setShowDisconnectDialog] = useState(false);

    const [settings, setSettings] = useState<UserKSeFSettings | null>(null);
    const [formData, setFormData] = useState({
        ksef_environment: 'test' as KSeFEnvironment,
        ksef_token: '',
        ksef_nip: companyNip || '',
        is_enabled: false,
        sync_frequency: 'daily' as SyncFrequency,
        sync_time: '21:00',
        auto_confirm_invoices: false,
    });

    useEffect(() => {
        loadSettings();
    }, [companyNip]);

    const loadSettings = async () => {
        setIsLoading(true);
        const result = await getKSeFSettings();
        if (result.settings) {
            setSettings(result.settings);
            setFormData({
                ksef_environment: result.settings.ksef_environment,
                ksef_token: '', // Don't populate token field
                ksef_nip: result.settings.ksef_nip || companyNip || '',
                is_enabled: result.settings.is_enabled,
                sync_frequency: result.settings.sync_frequency,
                sync_time: result.settings.sync_time || '21:00',
                auto_confirm_invoices: result.settings.auto_confirm_invoices,
            });
        } else {
            // No settings saved yet - populate NIP from profile
            setFormData(prev => ({
                ...prev,
                ksef_nip: companyNip || prev.ksef_nip,
            }));
        }
        setIsLoading(false);
    };

    const handleSave = async () => {
        if (!formData.ksef_token && !settings?.ksef_token_encrypted) {
            toast.error('Wprowadź token KSeF');
            return;
        }

        if (!formData.ksef_nip) {
            toast.error('Wprowadź NIP powiązany z KSeF');
            return;
        }

        setIsSaving(true);
        const result = await saveKSeFSettings(formData);
        setIsSaving(false);

        if (result.success) {
            toast.success('Ustawienia KSeF zostały zapisane');
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
                ksef_environment: 'test',
                ksef_token: '',
                ksef_nip: '',
                is_enabled: false,
                sync_frequency: 'daily',
                sync_time: '21:00',
                auto_confirm_invoices: false,
            });
            setShowDisconnectDialog(false);
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

    // Check if configured - settings exist and have token
    const isConfigured = settings !== null && settings.ksef_token_encrypted && settings.ksef_token_encrypted !== '';

    const handleSyncNow = async () => {
        setIsSyncing(true);
        try {
            const result = await syncKSeFInvoices(1); // Last 1 day
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
        formData.ksef_token !== '' || // New token entered
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
                                <CardTitle>KSeF</CardTitle>
                                <CardDescription>
                                    Krajowy System e-Faktur
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
                    {/* Environment info */}
                    <Alert>
                        <AlertTriangle className="h-4 w-4" />
                        <AlertTitle>Środowisko testowe</AlertTitle>
                        <AlertDescription>
                            Zalecamy najpierw przetestować integrację na środowisku testowym KSeF.
                            <br />
                            <a
                                href="https://ksef-test.mf.gov.pl/aplikacja-podatnika-ksef/"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-primary hover:underline mt-1"
                            >
                                Otwórz aplikację testową KSeF
                                <ExternalLink className="h-3 w-3" />
                            </a>
                        </AlertDescription>
                    </Alert>

                    {/* Environment selector */}
                    <div className="space-y-2">
                        <Label>Środowisko</Label>
                        <Select
                            value={formData.ksef_environment}
                            onValueChange={(value: KSeFEnvironment) =>
                                setFormData({ ...formData, ksef_environment: value })
                            }
                        >
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="test">
                                    🧪 Testowe (ksef-test.mf.gov.pl)
                                </SelectItem>
                                <SelectItem value="production">
                                    🏢 Produkcyjne (ksef.mf.gov.pl)
                                </SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {/* NIP */}
                    <div className="space-y-2">
                        <Label htmlFor="ksef_nip">NIP powiązany z KSeF</Label>
                        <Input
                            id="ksef_nip"
                            value={companyNip || formData.ksef_nip}
                            onChange={(e) => !companyNip && setFormData({ ...formData, ksef_nip: e.target.value })}
                            placeholder="1234567890"
                            maxLength={10}
                            readOnly={!!companyNip}
                            className={companyNip ? 'bg-muted cursor-not-allowed' : ''}
                        />
                        <p className="text-xs text-muted-foreground">
                            {companyNip
                                ? 'NIP pobierany automatycznie z danych firmy (zakładka "Dane firmy")'
                                : 'NIP firmy, dla której wygenerowany jest token'
                            }
                        </p>
                    </div>

                    {/* Token */}
                    <div className="space-y-2">
                        <Label htmlFor="ksef_token">
                            Token autoryzacyjny
                            {isConfigured && (
                                <span className="ml-2 text-green-600 font-normal">
                                    (zapisany)
                                </span>
                            )}
                        </Label>
                        <div className="flex gap-2">
                            <div className="relative flex-1">
                                <Input
                                    id="ksef_token"
                                    type={showToken ? 'text' : 'password'}
                                    value={formData.ksef_token}
                                    onChange={(e) => setFormData({ ...formData, ksef_token: e.target.value })}
                                    placeholder={isConfigured ? '••••••••••••' : 'Wklej token z aplikacji KSeF'}
                                />
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    className="absolute right-1 top-1/2 -translate-y-1/2"
                                    onClick={() => setShowToken(!showToken)}
                                >
                                    {showToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </Button>
                            </div>
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Token jest przechowywany w bezpieczny sposób. {isConfigured ? 'Zostaw puste, aby nie zmieniać.' : ''}
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
                                                Token zostanie usunięty i automatyczny import faktur zostanie wyłączony.
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
