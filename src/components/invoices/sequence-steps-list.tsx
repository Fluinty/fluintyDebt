'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Clock, CheckCircle, XCircle, Send, Loader2, Mail, Edit, MessageSquare, Phone } from 'lucide-react';
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
        sms_body: string;
        voice_script: string;
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

    // Sync local state with props when they change (e.g. after refresh)
    useEffect(() => {
        setStepStatuses(Object.fromEntries(steps.map(s => [s.id, s.status])));
    }, [steps]);

    // Get current status (use local state, fallback to original)
    const getStepStatus = (stepId: string, originalStatus: string) =>
        stepStatuses[stepId] || originalStatus;

    // Find index of first pending step (using local statuses)
    const firstPendingIndex = steps.findIndex(s => getStepStatus(s.id, s.status) === 'pending');

    const handleExecuteStep = async (stepId: string, stepIndex: number) => {
        setLoadingStepId(stepId);
        const step = steps.find(s => s.id === stepId);
        const channel = step?.sequence_steps?.channel || 'email';

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
                setStepStatuses(prev => ({ ...prev, [stepId]: 'executed' }));

                let successMessage = 'Email wysłany pomyślnie!';
                if (channel === 'sms') successMessage = 'SMS wysłany pomyślnie!';
                else if (channel === 'voice') successMessage = 'Połączenie głosowe zainicjowane!';

                toast.success(successMessage);
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
                const canExecute = currentStatus === 'pending' || currentStatus === 'skipped' || currentStatus === 'failed';
                const isCompleted = currentStatus === 'sent' || currentStatus === 'executed';
                const isCancelled = currentStatus === 'cancelled';

                const channel = seqStep?.channel || 'email';

                let displaySubject = 'Krok windykacji';
                if (channel === 'email' && seqStep?.email_subject) {
                    displaySubject = seqStep.email_subject;
                } else if (channel === 'sms' && seqStep?.sms_body) {
                    displaySubject = seqStep.sms_body.length > 50
                        ? seqStep.sms_body.substring(0, 50) + '...'
                        : seqStep.sms_body;
                } else if (channel === 'voice' && seqStep?.voice_script) {
                    displaySubject = seqStep.voice_script.length > 50
                        ? seqStep.voice_script.substring(0, 50) + '...'
                        : seqStep.voice_script;
                }

                // Replace placeholders
                displaySubject = processPlaceholders(displaySubject, invoiceData);

                const getChannelIcon = () => {
                    switch (channel) {
                        case 'sms': return <MessageSquare className="h-3 w-3" />;
                        case 'voice': return <Phone className="h-3 w-3" />;
                        default: return <Mail className="h-3 w-3" />;
                    }
                };

                const getChannelLabel = () => {
                    switch (channel) {
                        case 'sms': return 'SMS';
                        case 'voice': return 'Głos';
                        default: return 'Email';
                    }
                };

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
                                    <p className="font-medium text-sm md:text-base">{displaySubject}</p>
                                    <p className="text-sm text-muted-foreground">{formatDate(step.scheduled_for)}</p>
                                    <p className="text-xs text-muted-foreground mt-1">
                                        <span className="flex items-center gap-1">
                                            {getChannelIcon()}
                                            {getChannelLabel()}
                                        </span>
                                    </p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Badge variant={isCompleted ? 'default' : 'outline'}>
                                        {getStatusLabel(currentStatus)}
                                    </Badge>
                                    {canExecute && (
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
                                                        {currentStatus === 'pending' ? 'Wyślij' : 'Wyślij ręcznie'}
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
