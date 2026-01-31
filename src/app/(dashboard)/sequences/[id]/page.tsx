'use client';

import { useState, useEffect } from 'react';
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
import { useParams } from 'next/navigation';

interface SequenceStep {
    id: string;
    step_order: number;
    days_offset: number;
    channel: 'email' | 'sms' | 'voice';
    email_subject: string | null;
    email_body: string | null;
    email_subject_en: string | null;
    email_body_en: string | null;
    sms_body: string | null;
    voice_script: string | null;
    include_payment_link: boolean;
    include_interest: boolean;
    attach_invoice?: boolean;
    sequence_id?: string;
}

interface Sequence {
    id: string;
    name: string;
    description: string | null;
    is_default: boolean;
    steps: SequenceStep[];
}

export default function SequenceEditorPage() {
    const router = useRouter();
    const params = useParams();
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [sequence, setSequence] = useState<Sequence | null>(null);
    const [originalSteps, setOriginalSteps] = useState<SequenceStep[]>([]);
    const [selectedStep, setSelectedStep] = useState<SequenceStep | null>(null);
    const [activeTab, setActiveTab] = useState<'pl' | 'en'>('pl');

    useEffect(() => {
        const fetchSequence = async () => {
            try {
                const supabase = createClient();
                const sequenceId = params.id as string;

                // Fetch sequence
                const { data: seqData, error: seqError } = await supabase
                    .from('sequences')
                    .select('*')
                    .eq('id', sequenceId)
                    .single();

                if (seqError) throw seqError;

                // Fetch steps
                const { data: stepsData, error: stepsError } = await supabase
                    .from('sequence_steps')
                    .select('*')
                    .eq('sequence_id', sequenceId)
                    .order('step_order', { ascending: true });

                if (stepsError) throw stepsError;

                const loadedSequence = {
                    ...seqData,
                    steps: stepsData || []
                };

                setSequence(loadedSequence);
                setOriginalSteps(JSON.parse(JSON.stringify(stepsData || [])));

                if (stepsData && stepsData.length > 0) {
                    setSelectedStep(stepsData[0]);
                }
            } catch (error) {
                console.error('Error fetching sequence:', error);
                toast.error('Nie udało się załadować sekwencji');
            } finally {
                setIsLoading(false);
            }
        };

        if (params.id) {
            fetchSequence();
        }
    }, [params.id]);

    const handleSave = async () => {
        if (!sequence) return;
        setIsSaving(true);
        const supabase = createClient();

        try {
            // Update sequence details
            const { error: seqError } = await supabase
                .from('sequences')
                .update({
                    name: sequence.name,
                    description: sequence.description
                })
                .eq('id', sequence.id);

            if (seqError) throw seqError;

            // Handle steps updates
            // 1. Delete removed steps
            const currentStepIds = sequence.steps.filter(s => !s.id.startsWith('new-')).map(s => s.id);
            const stepsToDelete = originalSteps.filter(s => !currentStepIds.includes(s.id));

            if (stepsToDelete.length > 0) {
                const { error: deleteError } = await supabase
                    .from('sequence_steps')
                    .delete()
                    .in('id', stepsToDelete.map(s => s.id));
                if (deleteError) throw deleteError;
            }

            // 2. Upsert current steps
            const stepsToUpsert = sequence.steps.map((step, index) => {
                const stepData = {
                    sequence_id: sequence.id,
                    step_order: index + 1,
                    days_offset: step.days_offset,
                    channel: step.channel,
                    email_subject: step.email_subject,
                    email_body: step.email_body,
                    email_subject_en: step.email_subject_en,
                    email_body_en: step.email_body_en,
                    sms_body: step.sms_body,
                    voice_script: step.voice_script,
                    include_payment_link: step.include_payment_link,
                    include_interest: step.include_interest,
                    attach_invoice: step.attach_invoice || false
                };

                // Remove temp ID for new items so DB generates real UUID
                // UPDATE: Upsert requires ID for all items if mixed. We generate UUID client-side.
                if (step.id.startsWith('new-')) {
                    return { ...stepData, id: crypto.randomUUID() };
                }
                return { ...stepData, id: step.id };
            });

            const { data: savedSteps, error: stepsError } = await supabase
                .from('sequence_steps')
                .upsert(stepsToUpsert)
                .select();

            if (stepsError) throw stepsError;

            // Update local state
            if (savedSteps) {
                const updatedSequence = { ...sequence, steps: savedSteps };
                setSequence(updatedSequence);
                setOriginalSteps(JSON.parse(JSON.stringify(savedSteps)));
                // Update selected step ID reference if it was a new one
                if (selectedStep && selectedStep.id.startsWith('new-')) {
                    // This part is tricky because we don't know which new ID maps to which step easily
                    // For now just select the first step to be safe
                    setSelectedStep(savedSteps[0]);
                }
            }

            toast.success('Zmiany zostały zapisane');
            router.refresh();
        } catch (error: any) {
            console.error('Error saving sequence:', error);
            toast.error('Błąd zapisu: ' + (error?.message || 'Nieznany błąd'));
        } finally {
            setIsSaving(false);
        }
    };

    const addStep = () => {
        if (!sequence) return;
        const lastStep = sequence.steps[sequence.steps.length - 1];
        const newStep: SequenceStep = {
            id: `new-${Date.now()}`,
            step_order: sequence.steps.length + 1,
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
        const updatedSteps = [...sequence.steps, newStep];
        setSequence({ ...sequence, steps: updatedSteps });
        setSelectedStep(newStep);
    };

    const removeStep = (stepId: string) => {
        if (!sequence) return;
        const newSteps = sequence.steps
            .filter((s) => s.id !== stepId)
            .map((s, i) => ({ ...s, step_order: i + 1 }));
        setSequence({ ...sequence, steps: newSteps });
        if (selectedStep?.id === stepId) {
            setSelectedStep(newSteps[0] || null);
        }
    };

    const updateStep = (updates: Partial<SequenceStep>) => {
        if (!selectedStep || !sequence) return;
        const newSteps = sequence.steps.map((s) =>
            s.id === selectedStep.id ? { ...s, ...updates } : s
        );
        setSequence({ ...sequence, steps: newSteps });
        setSelectedStep({ ...selectedStep, ...updates });
    };

    if (isLoading) {
        return (
            <div className="flex h-[50vh] items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    if (!sequence) {
        return (
            <div className="flex bg-background h-[50vh] flex-col items-center justify-center gap-4">
                <h2 className="text-xl font-semibold">Nie znaleziono sekwencji</h2>
                <Link href="/sequences">
                    <Button>Wróć do listy</Button>
                </Link>
            </div>
        );
    }

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
                            value={sequence.name}
                            onChange={(e) => setSequence({ ...sequence, name: e.target.value })}
                            className="text-2xl font-bold h-auto px-2 py-1 border-transparent hover:border-input focus:border-input w-[300px]"
                        />
                        <Input
                            value={sequence.description || ''}
                            onChange={(e) => setSequence({ ...sequence, description: e.target.value })}
                            className="text-muted-foreground h-auto px-2 py-1 text-sm border-transparent hover:border-input focus:border-input mt-1"
                            placeholder="Dodaj opis..."
                        />
                    </div>
                </div>
                <Button onClick={handleSave} disabled={isSaving}>
                    {isSaving ? (
                        <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Zapisywanie...</>
                    ) : (
                        <><Save className="h-4 w-4 mr-2" />Zapisz zmiany</>
                    )}
                </Button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Steps list */}
                <Card className="h-fit">
                    <CardHeader>
                        <CardTitle>Kroki ({sequence.steps.length})</CardTitle>
                        <CardDescription>Kliknij aby edytować</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-2">
                        {sequence.steps.map((step) => (
                            <div
                                key={step.id}
                                onClick={() => setSelectedStep(step)}
                                className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${selectedStep?.id === step.id ? 'bg-primary/10 border border-primary' : 'bg-muted/50 hover:bg-muted'
                                    }`}
                            >
                                <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" />
                                <div className="flex-1 min-w-0">
                                    <p className="font-medium text-sm truncate">
                                        {step.step_order}. {
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

                {/* Step editor */}
                <Card className="lg:col-span-2">
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <CardTitle>
                                {selectedStep ? `Edycja kroku ${selectedStep.step_order}` : 'Wybierz krok'}
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
                                            onValueChange={(v: 'email' | 'sms' | 'voice') => updateStep({ channel: v })}
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
                                            onChange={(e) => updateStep({ days_offset: parseInt(e.target.value) })}
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
                                                onChange={(e) => updateStep({ sms_body: e.target.value })}
                                                rows={4}
                                                placeholder="Treść wiadomości SMS..."
                                            />
                                            {(selectedStep.sms_body?.length || 0) > 160 && (
                                                <p className="text-xs text-yellow-500">
                                                    ⚠️ SMS dłuższy niż 160 znaków zostanie podzielony na kilka wiadomości
                                                </p>
                                            )}
                                        </div>
                                        <div className="bg-muted/50 p-4 rounded-lg">
                                            <p className="text-sm font-medium mb-2">Dostępne zmienne:</p>
                                            <div className="flex flex-wrap gap-2">
                                                {['{{debtor_name}}', '{{invoice_number}}', '{{amount}}', '{{due_date}}', '{{days_overdue}}', '{{company_name}}'].map((ph) => (
                                                    <Badge key={ph} variant="secondary" className="font-mono text-xs">{ph}</Badge>
                                                ))}
                                            </div>
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
                                                onChange={(e) => updateStep({ voice_script: e.target.value })}
                                                rows={6}
                                                placeholder="Tekst który zostanie odczytany przez bota..."
                                            />
                                            <p className="text-xs text-muted-foreground">
                                                Bot odczyta ten tekst głosem damskim. Połączenia wykonywane są w godzinach 8:00-20:00.
                                            </p>
                                        </div>
                                        <div className="bg-muted/50 p-4 rounded-lg">
                                            <p className="text-sm font-medium mb-2">Dostępne zmienne:</p>
                                            <div className="flex flex-wrap gap-2">
                                                {['{{debtor_name}}', '{{invoice_number}}', '{{amount}}', '{{due_date}}', '{{days_overdue}}', '{{company_name}}'].map((ph) => (
                                                    <Badge key={ph} variant="secondary" className="font-mono text-xs">{ph}</Badge>
                                                ))}
                                            </div>
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
                                                        onChange={(e) => updateStep({ email_subject: e.target.value })}
                                                        placeholder="np. Przypomnienie o płatności"
                                                    />
                                                </div>
                                                <div className="space-y-2">
                                                    <Label>Treść emaila (PL)</Label>
                                                    <Textarea
                                                        value={selectedStep.email_body || ''}
                                                        onChange={(e) => updateStep({ email_body: e.target.value })}
                                                        rows={10}
                                                        className="font-mono text-sm"
                                                    />
                                                </div>
                                            </TabsContent>
                                            <TabsContent value="en" className="space-y-4 mt-0">
                                                <div className="space-y-2">
                                                    <Label>Temat emaila (EN)</Label>
                                                    <Input
                                                        value={selectedStep.email_subject_en || ''}
                                                        onChange={(e) => updateStep({ email_subject_en: e.target.value })}
                                                        placeholder="e.g. Payment Reminder"
                                                    />
                                                </div>
                                                <div className="space-y-2">
                                                    <Label>Treść emaila (EN)</Label>
                                                    <Textarea
                                                        value={selectedStep.email_body_en || ''}
                                                        onChange={(e) => updateStep({ email_body_en: e.target.value })}
                                                        rows={10}
                                                        className="font-mono text-sm"
                                                    />
                                                </div>
                                            </TabsContent>
                                        </Tabs>

                                        <div className="flex flex-wrap gap-6 pt-4 border-t">
                                            <div className="flex items-center gap-2">
                                                <Switch
                                                    checked={selectedStep.include_payment_link}
                                                    onCheckedChange={(v) => updateStep({ include_payment_link: v })}
                                                />
                                                <Label>Dołącz link do płatności</Label>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Switch
                                                    checked={selectedStep.include_interest}
                                                    onCheckedChange={(v) => updateStep({ include_interest: v })}
                                                />
                                                <Label>Dołącz naliczone odsetki</Label>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Switch
                                                    checked={selectedStep.attach_invoice || false}
                                                    onCheckedChange={(v) => updateStep({ attach_invoice: v })}
                                                />
                                                <Label>Załącz oryginał faktury (PDF)</Label>
                                            </div>
                                        </div>

                                        <div className="bg-muted/50 p-4 rounded-lg mt-4">
                                            <p className="text-sm font-medium mb-2">Dostępne zmienne (do użycia w szablonach):</p>
                                            <div className="flex flex-wrap gap-2">
                                                {['{{debtor_name}}', '{{invoice_number}}', '{{amount}}', '{{due_date}}', '{{days_overdue}}', '{{payment_link}}', '{{company_name}}', '{{amount_with_interest}}', '{{interest_amount}}'].map((ph) => (
                                                    <Badge key={ph} variant="secondary" className="font-mono text-xs cursor-copy hover:bg-muted-foreground/20">
                                                        {ph}
                                                    </Badge>
                                                ))}
                                            </div>
                                        </div>
                                    </>
                                )}
                            </>
                        ) : (
                            <div className="flex flex-col items-center justify-center h-[400px] text-muted-foreground">
                                <GripVertical className="h-12 w-12 mb-4 opacity-20" />
                                <p>Wybierz krok z listy po lewej stronie aby go edytować</p>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
