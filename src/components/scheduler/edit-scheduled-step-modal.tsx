'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Calendar, Mail, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { getScheduledStep, updateScheduledStep, deleteScheduledStep } from '@/app/actions/scheduler-actions';

interface EditScheduledStepModalProps {
    stepId: string;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function EditScheduledStepModal({ stepId, open, onOpenChange }: EditScheduledStepModalProps) {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);

    const [stepData, setStepData] = useState<any>(null);
    const [formData, setFormData] = useState({
        scheduled_for: '',
        override_email_subject: '',
        override_email_body: '',
        override_channel: '' as '' | 'email',
        notes: '',
    });

    // Load step data when modal opens
    useEffect(() => {
        if (open && stepId) {
            loadStepData();
        }
    }, [open, stepId]);

    const loadStepData = async () => {
        setIsLoading(true);
        const { data, error } = await getScheduledStep(stepId);

        if (error || !data) {
            toast.error(error || 'Nie udało się załadować danych');
            onOpenChange(false);
            return;
        }

        setStepData(data);
        setFormData({
            scheduled_for: data.scheduled_for || '',
            override_email_subject: data.override_email_subject || '',
            override_email_body: data.override_email_body || '',
            override_channel: data.override_channel || '',
            notes: data.notes || '',
        });
        setIsLoading(false);
    };

    const handleSave = async () => {
        setIsSaving(true);

        const updateData: any = {
            scheduled_for: formData.scheduled_for || undefined,
        };

        // Only include override fields if they have values
        if (formData.override_email_subject) {
            updateData.override_email_subject = formData.override_email_subject;
        }
        if (formData.override_email_body) {
            updateData.override_email_body = formData.override_email_body;
        }
        if (formData.override_channel) {
            updateData.override_channel = formData.override_channel;
        }
        if (formData.notes) {
            updateData.notes = formData.notes;
        }

        const result = await updateScheduledStep(stepId, updateData);
        setIsSaving(false);

        if (result.success) {
            toast.success('Zapisano zmiany');
            onOpenChange(false);
            router.refresh();
        } else {
            toast.error(result.error || 'Błąd zapisu');
        }
    };

    const handleDelete = async () => {
        setIsDeleting(true);
        const result = await deleteScheduledStep(stepId);
        setIsDeleting(false);

        if (result.success) {
            toast.success('Usunięto krok z harmonogramu');
            setShowDeleteDialog(false);
            onOpenChange(false);
            router.refresh();
        } else {
            toast.error(result.error || 'Błąd usuwania');
        }
    };

    // Get original values from sequence step
    const seqStep = stepData?.sequence_steps;
    const originalSubject = seqStep?.email_subject || '';
    const originalBody = seqStep?.email_body || '';
    const originalChannel = seqStep?.channel || 'email';

    return (
        <>
            <Dialog open={open} onOpenChange={onOpenChange}>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Edytuj zaplanowany krok</DialogTitle>
                        <DialogDescription>
                            Zmiany dotyczą tylko tego konkretnego kroku. Sekwencja i inne zaplanowane kroki pozostają bez zmian.
                        </DialogDescription>
                    </DialogHeader>

                    {isLoading ? (
                        <div className="py-8 flex justify-center">
                            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                        </div>
                    ) : (
                        <div className="space-y-6 py-4">
                            {/* Info about invoice */}
                            {stepData?.invoices && (
                                <div className="p-3 rounded-lg bg-muted text-sm">
                                    <p className="font-medium">Faktura: {(stepData.invoices as any).invoice_number}</p>
                                    <p className="text-muted-foreground">
                                        Kontrahent: {(stepData.invoices as any).debtors?.name || 'Nieznany'}
                                    </p>
                                </div>
                            )}

                            {/* Scheduled date */}
                            <div className="space-y-2">
                                <Label htmlFor="scheduled_for">
                                    <Calendar className="h-4 w-4 inline mr-2" />
                                    Data wysyłki
                                </Label>
                                <Input
                                    id="scheduled_for"
                                    type="date"
                                    value={formData.scheduled_for}
                                    onChange={(e) => setFormData({ ...formData, scheduled_for: e.target.value })}
                                />
                            </div>



                            {/* Email subject */}
                            <div className="space-y-2">
                                <Label htmlFor="override_email_subject">Temat wiadomości</Label>
                                <Input
                                    id="override_email_subject"
                                    value={formData.override_email_subject}
                                    onChange={(e) => setFormData({ ...formData, override_email_subject: e.target.value })}
                                    placeholder={originalSubject || 'Wprowadź temat...'}
                                />
                                {!formData.override_email_subject && originalSubject && (
                                    <p className="text-xs text-muted-foreground">
                                        Domyślnie z sekwencji: {originalSubject}
                                    </p>
                                )}
                            </div>

                            {/* Email body */}
                            <div className="space-y-2">
                                <Label htmlFor="override_email_body">Treść wiadomości</Label>
                                <Textarea
                                    id="override_email_body"
                                    value={formData.override_email_body}
                                    onChange={(e) => setFormData({ ...formData, override_email_body: e.target.value })}
                                    placeholder={originalBody || 'Wprowadź treść...'}
                                    rows={8}
                                />
                                {!formData.override_email_body && originalBody && (
                                    <p className="text-xs text-muted-foreground">
                                        Domyślnie z sekwencji (pierwsze 100 znaków): {originalBody.substring(0, 100)}...
                                    </p>
                                )}
                                <p className="text-xs text-muted-foreground">
                                    Możesz użyć zmiennych: {'{{debtor_name}}'}, {'{{invoice_number}}'}, {'{{amount}}'}, {'{{due_date}}'}
                                </p>
                            </div>

                            {/* Notes */}
                            <div className="space-y-2">
                                <Label htmlFor="notes">Notatki (widoczne tylko dla Ciebie)</Label>
                                <Textarea
                                    id="notes"
                                    value={formData.notes}
                                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                                    placeholder="Opcjonalne notatki..."
                                    rows={2}
                                />
                            </div>
                        </div>
                    )}

                    <DialogFooter className="flex gap-2 sm:justify-between">
                        <Button
                            variant="destructive"
                            onClick={() => setShowDeleteDialog(true)}
                            disabled={isLoading || isSaving}
                        >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Usuń krok
                        </Button>
                        <div className="flex gap-2">
                            <Button variant="outline" onClick={() => onOpenChange(false)}>
                                Anuluj
                            </Button>
                            <Button onClick={handleSave} disabled={isLoading || isSaving}>
                                {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                                Zapisz zmiany
                            </Button>
                        </div>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Usunąć ten krok?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Ta akcja jest nieodwracalna. Krok zostanie usunięty z harmonogramu.
                            Sekwencja i inne zaplanowane kroki pozostaną bez zmian.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Anuluj</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDelete}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                            {isDeleting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                            Usuń
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
