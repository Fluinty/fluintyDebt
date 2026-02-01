'use client';

import { useState, useEffect } from 'react';
import { Save, Loader2, Search, MessageSquare, Phone, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Breadcrumbs } from '@/components/shared/breadcrumbs';
import { KSeFSettingsCard } from '@/components/settings/ksef-settings-card';
import { toast } from 'sonner';
import { fetchCompanyByNip } from '@/app/actions/gus-actions';
import { getProfile, updateProfile, type ProfileData } from '@/app/actions/profile-actions';
import { toggleSMSEnabled, toggleVoiceEnabled } from '@/app/actions/sms-actions';

// Empty profile for initial state
const emptyProfile: ProfileData = {
    full_name: '',
    company_name: '',
    company_nip: '',
    company_address: '',
    company_city: '',
    company_postal_code: '',
    company_phone: '',
    company_email: '',
    bank_account_number: '',
    bank_name: '',
    send_thank_you_on_payment: true,
    interest_rate: 15.5,
    sms_enabled: false,
    voice_enabled: false,
    thank_you_email_subject: '',
    thank_you_email_body: '',
};

export default function SettingsPage() {
    const [isSaving, setIsSaving] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [isLoadingGus, setIsLoadingGus] = useState(false);

    // Toggle loading states
    const [isTogglingSms, setIsTogglingSms] = useState(false);
    const [isTogglingVoice, setIsTogglingVoice] = useState(false);

    const [profile, setProfile] = useState<ProfileData>(emptyProfile);
    const [originalProfile, setOriginalProfile] = useState<ProfileData>(emptyProfile);
    const [isDirty, setIsDirty] = useState(false);

    // Load profile on mount
    useEffect(() => {
        async function loadProfile() {
            const { data, error } = await getProfile();
            if (data) {
                const loadedProfile = { ...emptyProfile, ...data };
                setProfile(loadedProfile);
                setOriginalProfile(loadedProfile);
            } else if (error) {
                console.error('[Settings] Error loading profile:', error);
            }
            setIsLoading(false);
        }
        loadProfile();
    }, []);

    // Track changes
    useEffect(() => {
        // Exclude sms_enabled/voice_enabled from dirty check as they are saved immediately
        const { sms_enabled: s1, voice_enabled: v1, ...p1 } = profile;
        const { sms_enabled: s2, voice_enabled: v2, ...p2 } = originalProfile;
        setIsDirty(JSON.stringify(p1) !== JSON.stringify(p2));
    }, [profile, originalProfile]);

    const handleGusLookup = async () => {
        if (!profile.company_nip || profile.company_nip.trim().length === 0) {
            toast.error('Wprowadź numer NIP');
            return;
        }

        setIsLoadingGus(true);
        try {
            const result = await fetchCompanyByNip(profile.company_nip);

            if (result.success && result.data) {
                setProfile(prev => ({
                    ...prev,
                    company_name: result.data!.name,
                    company_address: result.data!.address,
                    company_city: result.data!.city,
                    company_postal_code: result.data!.postal_code,
                }));
                toast.success('Dane pobrane z GUS');
            } else {
                toast.error(result.error || 'Nie znaleziono danych');
            }
        } catch (error) {
            toast.error('Błąd połączenia z GUS');
        } finally {
            setIsLoadingGus(false);
        }
    };

    const handleSave = async () => {
        setIsSaving(true);
        const result = await updateProfile(profile);
        setIsSaving(false);

        if (result.success) {
            toast.success('Ustawienia zostały zapisane');
            setOriginalProfile(profile); // Reset dirty state
        } else {
            toast.error(result.error || 'Błąd zapisu');
        }
    };

    const handleSmsToggle = async (enabled: boolean) => {
        setIsTogglingSms(true);
        // Optimistic update
        setProfile(prev => ({ ...prev, sms_enabled: enabled }));

        try {
            const result = await toggleSMSEnabled(enabled);
            if (!result.success) {
                throw new Error(result.error || 'Failed to toggle SMS');
            }
            toast.success(enabled ? 'Powiadomienia SMS włączone' : 'Powiadomienia SMS wyłączone');
            setOriginalProfile(prev => ({ ...prev, sms_enabled: enabled }));
        } catch (error) {
            toast.error('Błąd zmiany ustawień SMS');
            // Revert
            setProfile(prev => ({ ...prev, sms_enabled: !enabled }));
        } finally {
            setIsTogglingSms(false);
        }
    };

    const handleVoiceToggle = async (enabled: boolean) => {
        setIsTogglingVoice(true);
        // Optimistic update
        setProfile(prev => ({ ...prev, voice_enabled: enabled }));

        try {
            const result = await toggleVoiceEnabled(enabled);
            if (!result.success) {
                throw new Error(result.error || 'Failed to toggle Voice');
            }
            toast.success(enabled ? 'Połączenia głosowe włączone' : 'Połączenia głosowe wyłączone');
            setOriginalProfile(prev => ({ ...prev, voice_enabled: enabled }));
        } catch (error) {
            toast.error('Błąd zmiany ustawień Voice');
            // Revert
            setProfile(prev => ({ ...prev, voice_enabled: !enabled }));
        } finally {
            setIsTogglingVoice(false);
        }
    };

    return (
        <div className="space-y-6">
            <Breadcrumbs />

            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold">Ustawienia</h1>
                    <p className="text-muted-foreground mt-1">
                        Zarządzaj swoim kontem i preferencjami
                    </p>
                </div>
                <Button onClick={handleSave} disabled={isSaving || isLoading || !isDirty}>
                    {isSaving ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                        <Save className="h-4 w-4 mr-2" />
                    )}
                    Zapisz ustawienia
                </Button>
            </div>

            <Tabs defaultValue="company" className="space-y-6">
                <TabsList>
                    <TabsTrigger value="company">Dane firmy</TabsTrigger>
                    <TabsTrigger value="payment">Płatności</TabsTrigger>
                    <TabsTrigger value="preferences">Preferencje</TabsTrigger>
                    <TabsTrigger value="communication">Komunikacja</TabsTrigger>
                    <TabsTrigger value="integrations">Integracje</TabsTrigger>
                </TabsList>

                <TabsContent value="company" className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Dane firmy</CardTitle>
                            <CardDescription>
                                Te dane będą używane w wezwaniach do zapłaty
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Nazwa firmy</Label>
                                    <Input
                                        value={profile.company_name}
                                        onChange={(e) => setProfile({ ...profile, company_name: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>NIP</Label>
                                    <div className="flex gap-2">
                                        <Input
                                            value={profile.company_nip}
                                            onChange={(e) => setProfile({ ...profile, company_nip: e.target.value })}
                                        />
                                        <Button
                                            type="button"
                                            variant="outline"
                                            onClick={handleGusLookup}
                                            disabled={isLoadingGus}
                                            className="shrink-0"
                                        >
                                            {isLoadingGus ? (
                                                <Loader2 className="h-4 w-4 animate-spin" />
                                            ) : (
                                                <Search className="h-4 w-4" />
                                            )}
                                            <span className="ml-2 hidden sm:inline">Pobierz z GUS</span>
                                        </Button>
                                    </div>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label>Adres</Label>
                                <Input
                                    value={profile.company_address}
                                    onChange={(e) => setProfile({ ...profile, company_address: e.target.value })}
                                />
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Miasto</Label>
                                    <Input
                                        value={profile.company_city}
                                        onChange={(e) => setProfile({ ...profile, company_city: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Kod pocztowy</Label>
                                    <Input
                                        value={profile.company_postal_code}
                                        onChange={(e) => setProfile({ ...profile, company_postal_code: e.target.value })}
                                    />
                                </div>
                            </div>
                            <Separator />
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Telefon</Label>
                                    <Input
                                        value={profile.company_phone}
                                        onChange={(e) => setProfile({ ...profile, company_phone: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Email firmowy</Label>
                                    <Input
                                        value={profile.company_email}
                                        onChange={(e) => setProfile({ ...profile, company_email: e.target.value })}
                                    />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Dane użytkownika</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Imię i nazwisko</Label>
                                    <Input
                                        value={profile.full_name}
                                        onChange={(e) => setProfile({ ...profile, full_name: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Email</Label>
                                    <Input
                                        value={profile.email}
                                        disabled
                                        className="bg-muted"
                                    />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="payment" className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Dane do przelewu</CardTitle>
                            <CardDescription>
                                Numer konta, który będzie podawany w wezwaniach
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <Label>Numer konta bankowego</Label>
                                <Input
                                    value={profile.bank_account_number}
                                    onChange={(e) => setProfile({ ...profile, bank_account_number: e.target.value })}
                                    placeholder="00 0000 0000 0000 0000 0000 0000"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Nazwa banku</Label>
                                <Input
                                    value={profile.bank_name}
                                    onChange={(e) => setProfile({ ...profile, bank_name: e.target.value })}
                                />
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="relative">
                        <CardHeader>
                            <div className="flex items-center gap-2">
                                <CardTitle>Stopa odsetek</CardTitle>
                                <span className="px-2 py-0.5 text-xs font-medium bg-amber-100 text-amber-800 rounded-full">
                                    Coming Soon
                                </span>
                            </div>
                            <CardDescription>
                                Roczna stopa odsetek za opóźnienie w płatnościach
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="flex items-center gap-4 opacity-50 pointer-events-none">
                                <Input
                                    type="number"
                                    step="0.1"
                                    value={15.5}
                                    disabled
                                    className="w-32"
                                />
                                <span className="text-muted-foreground">% rocznie</span>
                            </div>
                            <p className="text-xs text-muted-foreground mt-2">
                                Funkcjonalność naliczania odsetek będzie dostępna wkrótce
                            </p>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="preferences" className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Powiadomienia</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="font-medium">Email potwierdzający płatność</p>
                                    <p className="text-sm text-muted-foreground">
                                        Automatycznie wysyłaj podziękowanie po otrzymaniu płatności
                                    </p>
                                </div>
                                <Switch
                                    checked={profile.send_thank_you_on_payment}
                                    onCheckedChange={(checked) => setProfile({ ...profile, send_thank_you_on_payment: checked })}
                                />
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Szablon emaila z podziękowaniem</CardTitle>
                            <CardDescription>
                                Skonfiguruj treść wiadomości wysyłanej po otrzymaniu płatności
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {!profile.send_thank_you_on_payment && (
                                <div className="bg-yellow-50 dark:bg-yellow-900/20 p-3 rounded-lg text-sm text-yellow-800 dark:text-yellow-200 mb-4 border border-yellow-200 dark:border-yellow-900">
                                    ⚠️ Wysyłka podziękowań jest obecnie wyłączona. Włącz ją w sekcji powyżej.
                                </div>
                            )}
                            <div className="space-y-2">
                                <Label>Temat wiadomości</Label>
                                <Input
                                    value={profile.thank_you_email_subject || ''}
                                    onChange={(e) => setProfile({ ...profile, thank_you_email_subject: e.target.value })}
                                    placeholder="np. Dziękujemy za wpłatę - {{invoice_number}}"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Treść wiadomości</Label>
                                <textarea
                                    className="flex min-h-[150px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                    value={profile.thank_you_email_body || ''}
                                    onChange={(e) => setProfile({ ...profile, thank_you_email_body: e.target.value })}
                                    placeholder="Treść emaila..."
                                />
                            </div>
                            <div className="bg-muted/50 p-4 rounded-lg">
                                <p className="text-sm font-medium mb-2">Dostępne zmienne:</p>
                                <div className="flex flex-wrap gap-2">
                                    {['{{debtor_name}}', '{{invoice_number}}', '{{amount}}', '{{company_name}}'].map((ph) => (
                                        <div key={ph} className="bg-secondary px-2 py-1 rounded text-xs font-mono">
                                            {ph}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="communication" className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Kanały komunikacji</CardTitle>
                            <CardDescription>
                                Zarządzaj sposobami kontaktu z kontrahentami
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            {/* Email - always active */}
                            <div className="flex items-center justify-between p-4 border rounded-lg">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900">
                                        <Mail className="h-5 w-5 text-blue-600" />
                                    </div>
                                    <div>
                                        <p className="font-medium">Email</p>
                                        <p className="text-sm text-muted-foreground">Zawsze aktywny, bez limitu</p>
                                    </div>
                                </div>
                                <span className="text-sm text-green-600 font-medium">✓ Aktywny</span>
                            </div>

                            {/* SMS */}
                            <div className="flex items-center justify-between p-4 border rounded-lg">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900">
                                        <MessageSquare className="h-5 w-5 text-green-600" />
                                    </div>
                                    <div>
                                        <p className="font-medium">SMS</p>
                                        <p className="text-sm text-muted-foreground">
                                            {profile.sms_enabled
                                                ? 'Wysyłka aktywna (wymaga środków)'
                                                : 'Włącz, aby wysyłać powiadomienia SMS'}
                                        </p>
                                    </div>
                                </div>
                                <Switch
                                    checked={!!profile.sms_enabled}
                                    onCheckedChange={handleSmsToggle}
                                    disabled={isTogglingSms}
                                />
                            </div>

                            {/* Voice (Coming Soon) */}
                            <div className="flex items-center justify-between p-4 border rounded-lg opacity-70">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900">
                                        <Phone className="h-5 w-5 text-purple-600" />
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <p className="font-medium">Połączenia głosowe</p>
                                            <span className="text-[10px] bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full border border-purple-200">WKRÓTCE</span>
                                        </div>
                                        <p className="text-sm text-muted-foreground">
                                            Bot windykacyjny (Wymaga aktywacji VMS w SMSAPI)
                                        </p>
                                    </div>
                                </div>
                                <Switch
                                    checked={false}
                                    disabled={true}
                                />
                            </div>


                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="integrations" className="space-y-6">
                    <KSeFSettingsCard companyNip={profile.company_nip} />

                    <Card>
                        <CardHeader>
                            <CardTitle>Inne integracje</CardTitle>
                            <CardDescription>
                                Połącz z zewnętrznymi usługami
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex items-center justify-between p-4 border rounded-lg">
                                <div>
                                    <p className="font-medium">PayU / Przelewy24</p>
                                    <p className="text-sm text-muted-foreground">
                                        Płatności online w wezwaniach
                                    </p>
                                </div>
                                <Button variant="outline" disabled>
                                    Wkrótce
                                </Button>
                            </div>
                            <div className="flex items-center justify-between p-4 border rounded-lg">
                                <div>
                                    <p className="font-medium">SendGrid / Resend</p>
                                    <p className="text-sm text-muted-foreground">
                                        Wysyłka emaili
                                    </p>
                                </div>
                                <Button variant="outline" disabled>
                                    Wkrótce
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
