'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Plus, Trash2, Loader2, Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Breadcrumbs } from '@/components/shared/breadcrumbs';
import { formatDaysOffset } from '@/lib/utils/format-date';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';

interface NewStep {
    id: string;
    days_offset: number;
    channel: 'email' | 'sms' | 'both';
    email_subject: string;
    email_body: string;
}

export default function NewSequencePage() {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);
    const [selectedLanguage, setSelectedLanguage] = useState<'pl' | 'en' | null>(null);
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [steps, setSteps] = useState<NewStep[]>([
        { id: '1', days_offset: -7, channel: 'email', email_subject: '', email_body: '' },
    ]);

    const addStep = () => {
        const lastStep = steps[steps.length - 1];
        setSteps([
            ...steps,
            {
                id: `${Date.now()}`,
                days_offset: (lastStep?.days_offset || 0) + 7,
                channel: 'email',
                email_subject: '',
                email_body: '',
            },
        ]);
    };

    const removeStep = (id: string) => {
        if (steps.length > 1) {
            setSteps(steps.filter((s) => s.id !== id));
        }
    };

    const updateStep = (id: string, updates: Partial<NewStep>) => {
        setSteps(steps.map((s) => (s.id === id ? { ...s, ...updates } : s)));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!name) {
            toast.error('Podaj nazwę sekwencji');
            return;
        }

        if (!selectedLanguage) {
            toast.error('Wybierz język sekwencji');
            return;
        }

        setIsLoading(true);

        try {
            const supabase = createClient();

            // Get current user
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                toast.error('Musisz być zalogowany');
                return;
            }

            // Insert sequence
            const { data: sequence, error: seqError } = await supabase
                .from('sequences')
                .insert({
                    user_id: user.id,
                    name,
                    description: description || null,
                })
                .select()
                .single();

            if (seqError || !sequence) {
                console.error('Error creating sequence:', seqError);
                toast.error('Błąd: ' + (seqError?.message || 'Nie udało się utworzyć sekwencji'));
                return;
            }

            // Insert steps - save to appropriate language columns
            const stepsToInsert = steps.map((step, index) => {
                const baseStep = {
                    sequence_id: sequence.id,
                    step_order: index + 1,
                    days_offset: step.days_offset,
                    channel: step.channel,
                };

                if (selectedLanguage === 'en') {
                    return {
                        ...baseStep,
                        email_subject: null,
                        email_body: 'Payment reminder', // Fallback PL
                        email_subject_en: step.email_subject || null,
                        email_body_en: step.email_body || 'Payment reminder',
                    };
                } else {
                    return {
                        ...baseStep,
                        email_subject: step.email_subject || null,
                        email_body: step.email_body || 'Przypomnienie o płatności',
                        email_subject_en: null,
                        email_body_en: null,
                    };
                }
            });

            const { error: stepsError } = await supabase
                .from('sequence_steps')
                .insert(stepsToInsert);

            if (stepsError) {
                console.error('Error creating steps:', stepsError);
                toast.error('Błąd przy tworzeniu kroków: ' + stepsError.message);
                return;
            }

            toast.success('Sekwencja została utworzona!');
            router.push('/sequences');
            router.refresh();
        } catch (err) {
            console.error('Error:', err);
            toast.error('Wystąpił nieoczekiwany błąd');
        } finally {
            setIsLoading(false);
        }
    };

    // Language selection screen
    if (!selectedLanguage) {
        return (
            <div className="space-y-6">
                <Breadcrumbs />

                <div className="flex items-center gap-4">
                    <Link href="/sequences">
                        <Button variant="ghost" size="icon">
                            <ArrowLeft className="h-5 w-5" />
                        </Button>
                    </Link>
                    <div>
                        <h1 className="text-3xl font-bold">Nowa sekwencja</h1>
                        <p className="text-muted-foreground mt-1">
                            Wybierz język wiadomości
                        </p>
                    </div>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Globe className="h-5 w-5" />
                            Wybierz język sekwencji
                        </CardTitle>
                        <CardDescription>
                            Treść wiadomości będzie tworzona w wybranym języku.
                            Możesz później dodać tłumaczenie na drugi język.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <button
                                type="button"
                                onClick={() => setSelectedLanguage('pl')}
                                className="p-6 border-2 rounded-lg hover:border-primary hover:bg-primary/5 transition-colors text-left"
                            >
                                <div className="text-4xl mb-2">🇵🇱</div>
                                <h3 className="text-lg font-semibold">Polski</h3>
                                <p className="text-sm text-muted-foreground">
                                    Twórz wiadomości po polsku
                                </p>
                            </button>
                            <button
                                type="button"
                                onClick={() => setSelectedLanguage('en')}
                                className="p-6 border-2 rounded-lg hover:border-primary hover:bg-primary/5 transition-colors text-left"
                            >
                                <div className="text-4xl mb-2">🇬🇧</div>
                                <h3 className="text-lg font-semibold">English</h3>
                                <p className="text-sm text-muted-foreground">
                                    Create messages in English
                                </p>
                            </button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <Breadcrumbs />

            {/* Header */}
            <div className="flex items-center gap-4">
                <Link href="/sequences">
                    <Button variant="ghost" size="icon">
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                </Link>
                <div className="flex-1">
                    <div className="flex items-center gap-3">
                        <h1 className="text-3xl font-bold">Nowa sekwencja</h1>
                        <button
                            type="button"
                            onClick={() => setSelectedLanguage(null)}
                            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                        >
                            {selectedLanguage === 'pl' ? '🇵🇱 Polski' : '🇬🇧 English'}
                            <span className="text-xs opacity-60">zmień</span>
                        </button>
                    </div>
                    <p className="text-muted-foreground mt-1">
                        Utwórz własną sekwencję windykacyjną
                    </p>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                {/* Basic info */}
                <Card>
                    <CardHeader>
                        <CardTitle>Informacje podstawowe</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Nazwa sekwencji *</Label>
                                <Input
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    placeholder="np. Moja Sekwencja"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Opis</Label>
                                <Input
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    placeholder="Krótki opis sekwencji"
                                />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Steps */}
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                        <div>
                            <CardTitle>Kroki sekwencji ({steps.length})</CardTitle>
                            <CardDescription>
                                Zdefiniuj kiedy i jakie wiadomości mają być wysyłane
                            </CardDescription>
                        </div>
                        <Button type="button" variant="outline" onClick={addStep}>
                            <Plus className="h-4 w-4 mr-2" />
                            Dodaj krok
                        </Button>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        {steps.map((step, index) => (
                            <div key={step.id} className="border rounded-lg p-4 space-y-4">
                                <div className="flex items-center justify-between">
                                    <h4 className="font-medium">Krok {index + 1}</h4>
                                    {steps.length > 1 && (
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            className="text-red-600"
                                            onClick={() => removeStep(step.id)}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    )}
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div className="space-y-2">
                                        <Label>Dzień wysyłki</Label>
                                        <Input
                                            type="number"
                                            value={step.days_offset}
                                            onChange={(e) => updateStep(step.id, { days_offset: parseInt(e.target.value) })}
                                        />
                                        <p className="text-xs text-muted-foreground">
                                            {formatDaysOffset(step.days_offset)}
                                        </p>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Kanał</Label>
                                        <Select
                                            value={step.channel}
                                            onValueChange={(v) => updateStep(step.id, { channel: v as any })}
                                        >
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="email">Email</SelectItem>
                                                <SelectItem value="sms">SMS</SelectItem>
                                                <SelectItem value="both">Email + SMS</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Temat emaila</Label>
                                        <Input
                                            value={step.email_subject}
                                            onChange={(e) => updateStep(step.id, { email_subject: e.target.value })}
                                            placeholder="Temat wiadomości"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label>Treść</Label>
                                    <Textarea
                                        value={step.email_body}
                                        onChange={(e) => updateStep(step.id, { email_body: e.target.value })}
                                        rows={4}
                                        placeholder="Treść wiadomości..."
                                    />
                                </div>
                            </div>
                        ))}
                    </CardContent>
                </Card>

                {/* Actions */}
                <div className="flex gap-4">
                    <Link href="/sequences">
                        <Button type="button" variant="outline">Anuluj</Button>
                    </Link>
                    <Button type="submit" disabled={isLoading}>
                        {isLoading ? (
                            <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Tworzenie...</>
                        ) : (
                            'Utwórz sekwencję'
                        )}
                    </Button>
                </div>
            </form>
        </div>
    );
}
