'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Plus, Trash2, GripVertical, Loader2, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Breadcrumbs } from '@/components/shared/breadcrumbs';
import { formatDaysOffset } from '@/lib/utils/format-date';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';

const VariableList = () => (
    <div className="bg-muted/50 p-3 rounded-lg mt-2">
        <p className="text-xs font-medium mb-2 text-muted-foreground">Dostępne zmienne (kliknij aby skopiować):</p>
        <div className="flex flex-wrap gap-2">
            {[
                { label: 'Dłużnik', value: '{{debtor_name}}' },
                { label: 'Nr faktury', value: '{{invoice_number}}' },
                { label: 'Kwota', value: '{{amount}}' },
                { label: 'Kwota z odsetkami', value: '{{amount_with_interest}}' },
                { label: 'Odsetki', value: '{{interest_amount}}' },
                { label: 'Termin', value: '{{due_date}}' },
                { label: 'Dni po terminie', value: '{{days_overdue}}' },
                { label: 'Twoja firma', value: '{{company_name}}' },
                { label: 'Link', value: '{{payment_link}}' },
            ].map((v) => (
                <Badge
                    key={v.value}
                    variant="outline"
                    className="font-mono text-[10px] cursor-pointer hover:bg-secondary transition-colors"
                    onClick={() => {
                        navigator.clipboard.writeText(v.value);
                        toast.success(`Skopiowano ${v.value}`);
                    }}
                    title={v.label}
                >
                    {v.value}
                </Badge>
            ))}
        </div>
    </div>
);

interface NewStep {
    id: string;
    days_offset: number;
    channel: 'email' | 'sms' | 'voice';
    email_subject: string;
    email_body: string;
    email_subject_en: string;
    email_body_en: string;
    sms_body: string;
    voice_script: string;
    include_payment_link: boolean;
    include_interest: boolean;
    attach_invoice?: boolean;
}

export default function NewSequencePage() {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);
    const [activeTab, setActiveTab] = useState<'pl' | 'en'>('pl');

    // Sequence State
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [steps, setSteps] = useState<NewStep[]>([
        {
            id: '1',
            days_offset: -3, // Pre-due
            channel: 'email',
            email_subject: '',
            email_body: '',
            email_subject_en: '',
            email_body_en: '',
            sms_body: '',
            voice_script: '',
            include_payment_link: true,
            include_interest: false,
            attach_invoice: false,
        }
    ]);
    const [selectedStepId, setSelectedStepId] = useState<string>('1');

    const selectedStep = steps.find(s => s.id === selectedStepId);

    const addStep = () => {
        const lastStep = steps[steps.length - 1];
        const newId = `${Date.now()}`;
        const newStep: NewStep = {
            id: newId,
            days_offset: (lastStep?.days_offset || 0) + 7,
            channel: 'email',
            email_subject: '',
            email_body: '',
            email_subject_en: '',
            email_body_en: '',
            sms_body: '',
            voice_script: '',
            include_payment_link: true,
            include_interest: false,
            attach_invoice: false,
        };
        setSteps([...steps, newStep]);
        setSelectedStepId(newId);
    };

    const removeStep = (id: string) => {
        if (steps.length > 1) {
            const newSteps = steps.filter((s) => s.id !== id);
            setSteps(newSteps);
            if (selectedStepId === id) {
                setSelectedStepId(newSteps[0].id);
            }
        } else {
            toast.error('Sekwencja musi mieć co najmniej jeden krok');
        }
    };

    const updateSelectedStep = (updates: Partial<NewStep>) => {
        if (!selectedStepId) return;
        setSteps(steps.map((s) => (s.id === selectedStepId ? { ...s, ...updates } : s)));
    };

    const handleSubmit = async () => {
        if (!name) {
            toast.error('Podaj nazwę sekwencji');
            return;
        }

        setIsLoading(true);

        try {
            const supabase = createClient();
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

            // Insert steps
            const stepsToInsert = steps.map((step, index) => {
                return {
                    sequence_id: sequence.id,
                    step_order: index + 1,
                    days_offset: step.days_offset,
                    channel: step.channel,

                    // Email fields
                    email_subject: step.channel === 'email' ? (step.email_subject || null) : null,
                    email_body: step.channel === 'email' ? (step.email_body || ' ') : 'Placeholder', // Placeholder for NOT NULL constraint
                    email_subject_en: step.channel === 'email' ? (step.email_subject_en || null) : null,
                    email_body_en: step.channel === 'email' ? (step.email_body_en || null) : null,

                    // SMS fields
                    sms_body: step.channel === 'sms' ? (step.sms_body || '') : null,
                    // Typically mapped to PL field. For EN support we might need sms_body_en if schema supports it or just use one field?
                    // Schema has sms_body. Assuming PL only for now per original design or if EN exists?
                    // Check schema: 019_add_sms_voice usually adds just one column unless specified?
                    // Original code mapped only one. I will use only one for now unless I confirmed 'sms_body_en' exists.
                    // Actually, edit UI has NO tabs for SMS.
                    // Wait, `[id]/page.tsx` line 462 has Tabs ONLY for Email.
                    // So SMS/Voice are language-agnostic or single language for now?
                    // I'll stick to single field for SMS/Voice as in [id]/page.tsx.

                    // Voice fields
                    voice_script: step.channel === 'voice' ? (step.voice_script || '') : null,

                    include_payment_link: step.include_payment_link,
                    include_interest: step.include_interest,
                    attach_invoice: step.attach_invoice || false,
                };
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

    return (
        <div className="space-y-6">
            <Breadcrumbs />

            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-center gap-4">
                    <Link href="/sequences">
                        <Button variant="ghost" size="icon">
                            <ArrowLeft className="h-5 w-5" />
                        </Button>
                    </Link>
                    <div>
                        <Input
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="text-2xl font-bold h-auto px-2 py-1 border-transparent hover:border-input focus:border-input w-[300px] placeholder:text-muted-foreground/50"
                            placeholder="Nazwa nowej sekwencji"
                            autoFocus
                        />
                        <Input
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            className="text-muted-foreground h-auto px-2 py-1 text-sm border-transparent hover:border-input focus:border-input mt-1 w-[400px]"
                            placeholder="Dodaj opis sekwencji..."
                        />
                    </div>
                </div>
                <div className="flex gap-2">
                    <Link href="/sequences">
                        <Button variant="outline">Anuluj</Button>
                    </Link>
                    <Button onClick={handleSubmit} disabled={isLoading}>
                        {isLoading ? (
                            <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Tworzenie...</>
                        ) : (
                            <><Save className="h-4 w-4 mr-2" />Utwórz sekwencję</>
                        )}
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Steps list (Left Sidebar) */}
                <Card className="h-fit">
                    <CardHeader>
                        <CardTitle>Kroki sekwencji ({steps.length})</CardTitle>
                        <CardDescription>Kliknij w krok aby edytować</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-2">
                        {steps.map((step, index) => (
                            <div
                                key={step.id}
                                onClick={() => setSelectedStepId(step.id)}
                                className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${selectedStepId === step.id ? 'bg-primary/10 border border-primary' : 'bg-muted/50 hover:bg-muted'
                                    }`}
                            >
                                <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" />
                                <div className="flex-1 min-w-0">
                                    <p className="font-medium text-sm truncate">
                                        {index + 1}. {
                                            step.channel === 'email'
                                                ? (step.email_subject || step.email_subject_en || '(Bez tytułu)')
                                                : step.channel === 'sms'
                                                    ? (step.sms_body?.substring(0, 30) || '(Brak treści SMS)')
                                                    : (step.voice_script?.substring(0, 30) || '(Brak skryptu)')
                                        }
                                    </p>
                                    <div className="flex items-center gap-2 mt-1">
                                        <Badge variant="outline" className="text-[10px] px-1 py-0 h-4">
                                            {formatDaysOffset(step.days_offset)}
                                        </Badge>
                                        <span className={`text-xs uppercase ${step.channel === 'email' ? 'text-blue-500' :
                                            step.channel === 'sms' ? 'text-green-500' : 'text-purple-500'
                                            }`}>
                                            {step.channel === 'email' ? '📧 Email' :
                                                step.channel === 'sms' ? '📲 SMS' : '📞 Telefon'}
                                        </span>
                                    </div>
                                </div>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-muted-foreground hover:text-red-600"
                                    onClick={(e) => { e.stopPropagation(); removeStep(step.id); }}
                                >
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </div>
                        ))}
                        <Button variant="outline" className="w-full mt-4" onClick={addStep}>
                            <Plus className="h-4 w-4 mr-2" />
                            Dodaj krok
                        </Button>
                    </CardContent>
                </Card>

                {/* Step editor (Right Content) */}
                <Card className="lg:col-span-2">
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <CardTitle>
                                {selectedStep ? `Edycja kroku ${steps.findIndex(s => s.id === selectedStepId) + 1}` : 'Wybierz krok'}
                            </CardTitle>
                            {selectedStep && (
                                <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'pl' | 'en')} className="w-[200px]">
                                    <TabsList className="grid w-full grid-cols-2">
                                        <TabsTrigger value="pl">🇵🇱 Polski</TabsTrigger>
                                        <TabsTrigger value="en">🇬🇧 English</TabsTrigger>
                                    </TabsList>
                                </Tabs>
                            )}
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        {selectedStep ? (
                            <>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-b pb-6">
                                    <div className="space-y-2">
                                        <Label>Kanał</Label>
                                        <Select
                                            value={selectedStep.channel}
                                            onValueChange={(v: 'email' | 'sms' | 'voice') => updateSelectedStep({ channel: v })}
                                        >
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="email">📧 Email</SelectItem>
                                                <SelectItem value="sms">📲 SMS</SelectItem>
                                                <SelectItem value="voice" disabled>📞 Połączenie głosowe (Wkrótce)</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Dzień wysyłki</Label>
                                        <Input
                                            type="number"
                                            value={selectedStep.days_offset}
                                            onChange={(e) => updateSelectedStep({ days_offset: parseInt(e.target.value) })}
                                        />
                                        <p className="text-xs text-muted-foreground">
                                            {formatDaysOffset(selectedStep.days_offset)}
                                        </p>
                                    </div>
                                </div>

                                {/* SMS Content */}
                                {selectedStep.channel === 'sms' && (
                                    <div className="space-y-4">
                                        <div className="space-y-2">
                                            <div className="flex items-center justify-between">
                                                <Label>Treść SMS</Label>
                                                <span className={`text-xs ${(selectedStep.sms_body?.length || 0) > 160 ? 'text-yellow-500' : 'text-muted-foreground'}`}>
                                                    {selectedStep.sms_body?.length || 0}/160 znaków
                                                </span>
                                            </div>
                                            <Textarea
                                                value={selectedStep.sms_body || ''}
                                                onChange={(e) => updateSelectedStep({ sms_body: e.target.value })}
                                                rows={4}
                                                placeholder="Treść wiadomości SMS..."
                                            />
                                            {(selectedStep.sms_body?.length || 0) > 160 && (
                                                <p className="text-xs text-yellow-500">
                                                    ⚠️ SMS dłuższy niż 160 znaków zostanie podzielony na kilka wiadomości
                                                </p>
                                            )}
                                            <VariableList />
                                        </div>
                                    </div>
                                )}

                                {/* Voice Script */}
                                {selectedStep.channel === 'voice' && (
                                    <div className="space-y-4">
                                        <div className="space-y-2">
                                            <div className="flex items-center justify-between">
                                                <Label>Skrypt głosowy (TTS)</Label>
                                                <span className={`text-xs ${(selectedStep.voice_script?.length || 0) > 500 ? 'text-yellow-500' : 'text-muted-foreground'}`}>
                                                    {selectedStep.voice_script?.length || 0}/500 znaków
                                                </span>
                                            </div>
                                            <Textarea
                                                value={selectedStep.voice_script || ''}
                                                onChange={(e) => updateSelectedStep({ voice_script: e.target.value })}
                                                rows={6}
                                                placeholder="Tekst który zostanie odczytany przez bota..."
                                            />
                                            <p className="text-xs text-muted-foreground">
                                                Bot odczyta ten tekst głosem damskim. Połączenia wykonywane są w godzinach 8:00-20:00.
                                            </p>
                                            <VariableList />
                                        </div>
                                    </div>
                                )}

                                {/* Email Content */}
                                {selectedStep.channel === 'email' && (
                                    <>
                                        <Tabs value={activeTab} className="w-full">
                                            <TabsContent value="pl" className="space-y-4 mt-0">
                                                <div className="space-y-2">
                                                    <Label>Temat emaila (PL)</Label>
                                                    <Input
                                                        value={selectedStep.email_subject || ''}
                                                        onChange={(e) => updateSelectedStep({ email_subject: e.target.value })}
                                                        placeholder="np. Przypomnienie o płatności"
                                                    />
                                                </div>
                                                <div className="space-y-2">
                                                    <Label>Treść emaila (PL)</Label>
                                                    <Textarea
                                                        value={selectedStep.email_body || ''}
                                                        onChange={(e) => updateSelectedStep({ email_body: e.target.value })}
                                                        rows={10}
                                                        placeholder="Treść wiadomości..."
                                                        className="font-mono text-sm"
                                                    />
                                                    <VariableList />
                                                </div>
                                            </TabsContent>
                                            <TabsContent value="en" className="space-y-4 mt-0">
                                                <div className="space-y-2">
                                                    <Label>Temat emaila (EN)</Label>
                                                    <Input
                                                        value={selectedStep.email_subject_en || ''}
                                                        onChange={(e) => updateSelectedStep({ email_subject_en: e.target.value })}
                                                        placeholder="e.g. Payment Reminder"
                                                    />
                                                </div>
                                                <div className="space-y-2">
                                                    <Label>Treść emaila (EN)</Label>
                                                    <Textarea
                                                        value={selectedStep.email_body_en || ''}
                                                        onChange={(e) => updateSelectedStep({ email_body_en: e.target.value })}
                                                        rows={10}
                                                        placeholder="Message content..."
                                                        className="font-mono text-sm"
                                                    />
                                                    <VariableList />
                                                </div>
                                            </TabsContent>
                                        </Tabs>

                                        <div className="flex flex-wrap gap-6 pt-4 border-t mt-4">
                                            <div className="flex items-center gap-2">
                                                <Switch
                                                    checked={selectedStep.include_payment_link}
                                                    onCheckedChange={(v) => updateSelectedStep({ include_payment_link: v })}
                                                />
                                                <Label>Dołącz link do płatności</Label>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Switch
                                                    checked={selectedStep.include_interest}
                                                    onCheckedChange={(v) => updateSelectedStep({ include_interest: v })}
                                                />
                                                <Label>Dołącz naliczone odsetki</Label>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Switch
                                                    checked={selectedStep.attach_invoice || false}
                                                    onCheckedChange={(v) => updateSelectedStep({ attach_invoice: v })}
                                                />
                                                <Label>Załącz oryginał faktury (PDF)</Label>
                                            </div>
                                        </div>
                                    </>
                                )}
                            </>
                        ) : (
                            <div className="flex flex-col items-center justify-center h-[400px] text-muted-foreground">
                                <GripVertical className="h-12 w-12 mb-4 opacity-20" />
                                <p>Dodaj krok lub wybierz istniejący z listy</p>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
