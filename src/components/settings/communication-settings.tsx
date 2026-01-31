'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
    MessageSquare,
    Phone,
    Mail,
    CheckCircle,
    AlertTriangle,
    Info,
    ArrowUpCircle
} from 'lucide-react';
import { toggleSMSEnabled, toggleVoiceEnabled } from '@/app/actions/sms-actions';
import { toast } from 'sonner';
import Link from 'next/link';

interface CommunicationSettingsProps {
    smsEnabled: boolean;
    voiceEnabled: boolean;
    smsUsed: number;
    smsLimit: number;
    callsUsed: number;
    callsLimit: number;
    tier: string;
}

export function CommunicationSettings({
    smsEnabled: initialSmsEnabled,
    voiceEnabled: initialVoiceEnabled,
    smsUsed,
    smsLimit,
    callsUsed,
    callsLimit,
    tier,
}: CommunicationSettingsProps) {
    const [smsEnabled, setSmsEnabled] = useState(initialSmsEnabled);
    const [voiceEnabled, setVoiceEnabled] = useState(initialVoiceEnabled);
    const [loading, setLoading] = useState<'sms' | 'voice' | null>(null);

    const isTrial = tier === 'trial' || !tier;
    const smsRemaining = Math.max(0, smsLimit - smsUsed);
    const callsRemaining = Math.max(0, callsLimit - callsUsed);

    const handleSMSToggle = async (checked: boolean) => {
        if (isTrial) {
            toast.error('SMS dostępne tylko w płatnych planach');
            return;
        }

        setLoading('sms');
        try {
            await toggleSMSEnabled(checked);
            setSmsEnabled(checked);
            toast.success(checked ? 'Powiadomienia SMS włączone' : 'Powiadomienia SMS wyłączone');
        } catch (error) {
            toast.error('Nie udało się zmienić ustawień');
        } finally {
            setLoading(null);
        }
    };

    const handleVoiceToggle = async (checked: boolean) => {
        if (isTrial) {
            toast.error('Połączenia głosowe dostępne tylko w płatnych planach');
            return;
        }

        setLoading('voice');
        try {
            await toggleVoiceEnabled(checked);
            setVoiceEnabled(checked);
            toast.success(checked ? 'Połączenia głosowe włączone' : 'Połączenia głosowe wyłączone');
        } catch (error) {
            toast.error('Nie udało się zmienić ustawień');
        } finally {
            setLoading(null);
        }
    };

    return (
        <div className="space-y-6">
            {/* Trial Warning */}
            {isTrial && (
                <Card className="border-yellow-500 bg-yellow-50 dark:bg-yellow-950">
                    <CardContent className="pt-6">
                        <div className="flex items-start gap-3">
                            <AlertTriangle className="h-5 w-5 text-yellow-600 shrink-0 mt-0.5" />
                            <div>
                                <p className="font-medium text-yellow-800 dark:text-yellow-200">
                                    SMS i połączenia głosowe dostępne w płatnych planach
                                </p>
                                <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                                    Ulepsz plan, aby odblokować wielokanałową windykację.
                                </p>
                                <Button asChild size="sm" className="mt-3">
                                    <Link href="/subscription">
                                        <ArrowUpCircle className="h-4 w-4 mr-2" />
                                        Ulepsz plan
                                    </Link>
                                </Button>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Email Status */}
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900">
                                <Mail className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                            </div>
                            <div>
                                <CardTitle className="text-lg">Email</CardTitle>
                                <CardDescription>Wysyłka wiadomości email przez Resend</CardDescription>
                            </div>
                        </div>
                        <Badge variant="default" className="bg-green-500">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Aktywne
                        </Badge>
                    </div>
                </CardHeader>
                <CardContent>
                    <p className="text-sm text-muted-foreground">
                        Email jest zawsze aktywny i nie ma limitu wysyłek.
                    </p>
                </CardContent>
            </Card>

            {/* SMS Settings */}
            <Card className={isTrial ? 'opacity-60' : ''}>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900">
                                <MessageSquare className="h-5 w-5 text-green-600 dark:text-green-400" />
                            </div>
                            <div>
                                <CardTitle className="text-lg">SMS</CardTitle>
                                <CardDescription>Powiadomienia SMS do kontrahentów</CardDescription>
                            </div>
                        </div>
                        <Switch
                            checked={smsEnabled}
                            onCheckedChange={handleSMSToggle}
                            disabled={loading === 'sms' || isTrial}
                        />
                    </div>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex items-center justify-between text-sm">
                        <span>Wykorzystanie w tym miesiącu:</span>
                        <span className="font-medium">{smsUsed} / {smsLimit} SMS</span>
                    </div>
                    <Progress value={(smsUsed / Math.max(1, smsLimit)) * 100} className="h-2" />
                    <p className="text-xs text-muted-foreground">
                        Pozostało: {smsRemaining} SMS. Limit resetuje się 1. dnia miesiąca.
                    </p>

                    <div className="flex items-start gap-2 p-3 rounded-lg bg-muted/50">
                        <Info className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                        <p className="text-xs text-muted-foreground">
                            SMS będzie wysyłany do kontrahentów z podanym numerem telefonu.
                            Upewnij się, że masz podstawę prawną do kontaktu.
                        </p>
                    </div>
                </CardContent>
            </Card>

            {/* Voice Settings */}
            <Card className={isTrial ? 'opacity-60' : ''}>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900">
                                <Phone className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                            </div>
                            <div>
                                <CardTitle className="text-lg">Połączenia głosowe</CardTitle>
                                <CardDescription>Automatyczne połączenia TTS (Text-to-Speech)</CardDescription>
                            </div>
                        </div>
                        <Switch
                            checked={voiceEnabled}
                            onCheckedChange={handleVoiceToggle}
                            disabled={loading === 'voice' || isTrial}
                        />
                    </div>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex items-center justify-between text-sm">
                        <span>Wykorzystanie w tym miesiącu:</span>
                        <span className="font-medium">{callsUsed} / {callsLimit} połączeń</span>
                    </div>
                    <Progress value={(callsUsed / Math.max(1, callsLimit)) * 100} className="h-2" />
                    <p className="text-xs text-muted-foreground">
                        Pozostało: {callsRemaining} połączeń. Limit resetuje się 1. dnia miesiąca.
                    </p>

                    <div className="flex items-start gap-2 p-3 rounded-lg bg-muted/50">
                        <Info className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                        <p className="text-xs text-muted-foreground">
                            Połączenia wykonywane są w godzinach 8:00-20:00.
                            Bot odczytuje przygotowany tekst głosem damskim.
                        </p>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
