'use client';

import { useState, useEffect } from 'react';
import { Save, Loader2, Search } from 'lucide-react';
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
};

export default function SettingsPage() {
    const [isSaving, setIsSaving] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [isLoadingGus, setIsLoadingGus] = useState(false);
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
        setIsDirty(JSON.stringify(profile) !== JSON.stringify(originalProfile));
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

                    <Card>
                        <CardHeader>
                            <CardTitle>Stopa odsetek</CardTitle>
                            <CardDescription>
                                Roczna stopa odsetek za opóźnienie w płatnościach
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="flex items-center gap-4">
                                <Input
                                    type="number"
                                    step="0.1"
                                    value={profile.interest_rate}
                                    onChange={(e) => setProfile({ ...profile, interest_rate: parseFloat(e.target.value) })}
                                    className="w-32"
                                />
                                <span className="text-muted-foreground">% rocznie</span>
                            </div>
                            <p className="text-xs text-muted-foreground mt-2">
                                Aktualna stopa ustawowa: 15,5% (styczeń 2026)
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
