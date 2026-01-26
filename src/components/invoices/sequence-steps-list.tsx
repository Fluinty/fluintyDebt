'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Clock, CheckCircle, XCircle, Send, Loader2, Mail, Edit } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { executeScheduledStep, skipEarlierSteps } from '@/app/actions/email-actions';
import { formatDate } from '@/lib/utils/format-date';
import { processPlaceholders } from '@/lib/utils/process-placeholders';
import { EditStepButton } from '@/components/scheduler/edit-step-button';

interface ScheduledStep {
    id: string;
    scheduled_for: string;
    status: string;
    sequence_steps: {
        email_subject: string;
        channel: string;
    } | null;
}

interface SequenceStepsListProps {
    steps: ScheduledStep[];
    invoiceData: {
        invoice_number: string;
        amount: number;
        due_date: string;
        debtor_name: string;
    };
}

export function SequenceStepsList({ steps, invoiceData }: SequenceStepsListProps) {
    const router = useRouter();
    const [loadingStepId, setLoadingStepId] = useState<string | null>(null);
    // Local state to track step statuses for immediate UI update
    const [stepStatuses, setStepStatuses] = useState<Record<string, string>>(() =>
        Object.fromEntries(steps.map(s => [s.id, s.status]))
    );

    // Get current status (use local state, fallback to original)
    const getStepStatus = (stepId: string, originalStatus: string) =>
        stepStatuses[stepId] || originalStatus;

    // Find index of first pending step (using local statuses)
    const firstPendingIndex = steps.findIndex(s => getStepStatus(s.id, s.status) === 'pending');

    const handleExecuteStep = async (stepId: string, stepIndex: number) => {
        setLoadingStepId(stepId);

        try {
            // If this is not the first pending step, skip earlier ones
            if (stepIndex > firstPendingIndex && firstPendingIndex !== -1) {
                const stepsToSkip = steps
                    .slice(firstPendingIndex, stepIndex)
                    .filter(s => getStepStatus(s.id, s.status) === 'pending')
                    .map(s => s.id);

                if (stepsToSkip.length > 0) {
                    await skipEarlierSteps(stepsToSkip);
                    // Update local statuses for skipped steps
                    setStepStatuses(prev => ({
                        ...prev,
                        ...Object.fromEntries(stepsToSkip.map(id => [id, 'skipped']))
                    }));
                    toast.info(`Pominięto ${stepsToSkip.length} wcześniejszych kroków`);
                }
            }

            const result = await executeScheduledStep(stepId);

            if (result.success) {
                // Update local status immediately - no need to wait for refresh
                setStepStatuses(prev => ({ ...prev, [stepId]: 'executed' }));
                toast.success('Email wysłany pomyślnie!');
                router.refresh(); // Still refresh but UI is already updated
            } else {
                toast.error(result.error || 'Błąd wysyłki');
            }
        } catch (err) {
            console.error('Execute error:', err);
            toast.error('Wystąpił błąd');
        } finally {
            setLoadingStepId(null);
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'sent':
            case 'executed':
                return <CheckCircle className="h-4 w-4" />;
            case 'failed':
                return <XCircle className="h-4 w-4" />;
            case 'cancelled':
            case 'skipped':
                return <XCircle className="h-4 w-4 opacity-50" />;
            default:
                return <Clock className="h-4 w-4" />;
        }
    };

    const getStatusClass = (status: string) => {
        switch (status) {
            case 'sent':
            case 'executed':
                return 'bg-green-100 text-green-600 dark:bg-green-900 dark:text-green-400';
            case 'failed':
                return 'bg-red-100 text-red-600 dark:bg-red-900 dark:text-red-400';
            case 'cancelled':
            case 'skipped':
                return 'bg-muted text-muted-foreground opacity-50';
            default:
                return 'bg-amber-100 text-amber-600 dark:bg-amber-900 dark:text-amber-400';
        }
    };

    const getStatusLabel = (status: string) => {
        switch (status) {
            case 'sent':
            case 'executed':
                return 'Wysłano';
            case 'failed':
                return 'Błąd';
            case 'cancelled':
            case 'skipped':
                return 'Pominięto';
            default:
                return 'Oczekuje';
        }
    };

    return (
        <div className="space-y-4">
            {steps.map((step, index) => {
                const seqStep = step.sequence_steps;
                const isLoading = loadingStepId === step.id;
                // Use local status for immediate UI updates
                const currentStatus = getStepStatus(step.id, step.status);
                const isPending = currentStatus === 'pending';
                const isCompleted = currentStatus === 'sent' || currentStatus === 'executed';
                const isCancelled = currentStatus === 'cancelled' || currentStatus === 'skipped';

                // Replace placeholders in subject for preview
                const displaySubject = seqStep?.email_subject
                    ? processPlaceholders(seqStep.email_subject, invoiceData)
                    : 'Krok windykacji';

                return (
                    <div key={step.id} className={`flex gap-4 ${isCancelled ? 'opacity-50' : ''}`}>
                        <div className="flex flex-col items-center">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${getStatusClass(currentStatus)}`}>
                                {getStatusIcon(currentStatus)}
                            </div>
                            {index < steps.length - 1 && (
                                <div className="w-0.5 h-8 bg-border mt-2" />
                            )}
                        </div>
                        <div className="flex-1 pb-4">
                            <div className="flex items-center justify-between gap-2">
                                <div className="flex-1">
                                    <p className="font-medium">{displaySubject}</p>
                                    <p className="text-sm text-muted-foreground">{formatDate(step.scheduled_for)}</p>
                                    <p className="text-xs text-muted-foreground mt-1">
                                        <span className="flex items-center gap-1"><Mail className="h-3 w-3" /> Email</span>
                                    </p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Badge variant={isCompleted ? 'default' : 'outline'}>
                                        {getStatusLabel(currentStatus)}
                                    </Badge>
                                    {isPending && (
                                        <>
                                            <EditStepButton stepId={step.id} />
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => handleExecuteStep(step.id, index)}
                                                disabled={isLoading}
                                            >
                                                {isLoading ? (
                                                    <>
                                                        <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                                                        Wysyłam...
                                                    </>
                                                ) : (
                                                    <>
                                                        <Send className="h-4 w-4 mr-1" />
                                                        Wyślij
                                                    </>
                                                )}
                                            </Button>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
