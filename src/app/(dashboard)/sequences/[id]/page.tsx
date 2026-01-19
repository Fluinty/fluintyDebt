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
import { Breadcrumbs } from '@/components/shared/breadcrumbs';
import { formatDaysOffset } from '@/lib/utils/format-date';
import { toast } from 'sonner';

interface SequenceStep {
    id: string;
    step_order: number;
    days_offset: number;
    channel: 'email' | 'sms' | 'both';
    email_subject: string;
    email_body: string;
    sms_body?: string;
    include_payment_link: boolean;
    include_interest: boolean;
}

// Mock sequence for editing
const mockSequence = {
    id: '2',
    name: 'Standardowa',
    description: 'Domyślna sekwencja dla większości kontrahentów',
    is_default: true,
    steps: [
        { id: '1', step_order: 1, days_offset: -7, channel: 'email' as const, email_subject: 'Przypomnienie o zbliżającym się terminie', email_body: 'Dzień dobry,\n\nUprzejmie przypominamy o zbliżającym się terminie płatności...', include_payment_link: false, include_interest: false },
        { id: '2', step_order: 2, days_offset: -1, channel: 'email' as const, email_subject: 'Jutro mija termin płatności', email_body: 'Dzień dobry,\n\nPrzypominamy, że jutro mija termin płatności...', include_payment_link: true, include_interest: false },
        { id: '3', step_order: 3, days_offset: 1, channel: 'email' as const, email_subject: 'Termin płatności minął', email_body: 'Dzień dobry,\n\nInformujemy, że wczoraj minął termin płatności...', include_payment_link: true, include_interest: false },
        { id: '4', step_order: 4, days_offset: 7, channel: 'both' as const, email_subject: 'Wezwanie do zapłaty', email_body: 'Szanowni Państwo,\n\nFaktura jest przeterminowana o 7 dni...', sms_body: 'Faktura {{invoice_number}} przeterminowana. Prosimy o pilną wpłatę.', include_payment_link: true, include_interest: false },
        { id: '5', step_order: 5, days_offset: 14, channel: 'email' as const, email_subject: 'WEZWANIE DO ZAPŁATY z odsetkami', email_body: 'Szanowni Państwo,\n\nPomimo wcześniejszych wezwań...', include_payment_link: true, include_interest: true },
        { id: '6', step_order: 6, days_offset: 30, channel: 'email' as const, email_subject: 'OSTATECZNE WEZWANIE DO ZAPŁATY', email_body: 'Szanowni Państwo,\n\nNiniejszym wzywamy do NATYCHMIASTOWEJ zapłaty...', include_payment_link: true, include_interest: true },
    ] as SequenceStep[],
};

export default function SequenceEditorPage() {
    const router = useRouter();
    const [isSaving, setIsSaving] = useState(false);
    const [sequence, setSequence] = useState(mockSequence);
    const [selectedStep, setSelectedStep] = useState<SequenceStep | null>(mockSequence.steps[0]);

    const handleSave = async () => {
        setIsSaving(true);
        await new Promise((resolve) => setTimeout(resolve, 1000));
        setIsSaving(false);
        toast.success('Sekwencja została zapisana');
    };

    const addStep = () => {
        const lastStep = sequence.steps[sequence.steps.length - 1];
        const newStep: SequenceStep = {
            id: `new-${Date.now()}`,
            step_order: sequence.steps.length + 1,
            days_offset: (lastStep?.days_offset || 0) + 7,
            channel: 'email',
            email_subject: '',
            email_body: '',
            include_payment_link: true,
            include_interest: false,
        };
        setSequence({ ...sequence, steps: [...sequence.steps, newStep] });
        setSelectedStep(newStep);
    };

    const removeStep = (stepId: string) => {
        const newSteps = sequence.steps
            .filter((s) => s.id !== stepId)
            .map((s, i) => ({ ...s, step_order: i + 1 }));
        setSequence({ ...sequence, steps: newSteps });
        if (selectedStep?.id === stepId) {
            setSelectedStep(newSteps[0] || null);
        }
    };

    const updateStep = (updates: Partial<SequenceStep>) => {
        if (!selectedStep) return;
        const newSteps = sequence.steps.map((s) =>
            s.id === selectedStep.id ? { ...s, ...updates } : s
        );
        setSequence({ ...sequence, steps: newSteps });
        setSelectedStep({ ...selectedStep, ...updates });
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
                        <h1 className="text-3xl font-bold">{sequence.name}</h1>
                        <p className="text-muted-foreground mt-1">{sequence.description}</p>
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
                <Card>
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
                                        {step.step_order}. {step.email_subject || '(Bez tytułu)'}
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                        {formatDaysOffset(step.days_offset)} • {step.channel === 'both' ? 'Email + SMS' : step.channel.toUpperCase()}
                                    </p>
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
                        <CardTitle>
                            {selectedStep ? `Krok ${selectedStep.step_order}` : 'Wybierz krok'}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        {selectedStep ? (
                            <>
                                <div className="grid grid-cols-2 gap-4">
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
                                    <div className="space-y-2">
                                        <Label>Kanał</Label>
                                        <Select
                                            value={selectedStep.channel}
                                            onValueChange={(v) => updateStep({ channel: v as any })}
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
                                </div>

                                <div className="space-y-2">
                                    <Label>Temat emaila</Label>
                                    <Input
                                        value={selectedStep.email_subject}
                                        onChange={(e) => updateStep({ email_subject: e.target.value })}
                                        placeholder="np. Przypomnienie o płatności"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label>Treść emaila</Label>
                                    <Textarea
                                        value={selectedStep.email_body}
                                        onChange={(e) => updateStep({ email_body: e.target.value })}
                                        rows={8}
                                        className="font-mono text-sm"
                                    />
                                </div>

                                {(selectedStep.channel === 'sms' || selectedStep.channel === 'both') && (
                                    <div className="space-y-2">
                                        <Label>Treść SMS (max 160 znaków)</Label>
                                        <Textarea
                                            value={selectedStep.sms_body || ''}
                                            onChange={(e) => updateStep({ sms_body: e.target.value })}
                                            rows={2}
                                            maxLength={160}
                                        />
                                        <p className="text-xs text-muted-foreground">
                                            {(selectedStep.sms_body || '').length}/160 znaków
                                        </p>
                                    </div>
                                )}

                                <div className="flex flex-wrap gap-6">
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
                                </div>

                                <div className="pt-4 border-t">
                                    <p className="text-sm font-medium mb-2">Dostępne placeholdery:</p>
                                    <div className="flex flex-wrap gap-2">
                                        {['{{debtor_name}}', '{{invoice_number}}', '{{amount}}', '{{due_date}}', '{{days_overdue}}', '{{payment_link}}'].map((ph) => (
                                            <Badge key={ph} variant="outline" className="font-mono text-xs">
                                                {ph}
                                            </Badge>
                                        ))}
                                    </div>
                                </div>
                            </>
                        ) : (
                            <p className="text-muted-foreground text-center py-8">
                                Wybierz krok z listy po lewej stronie
                            </p>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
