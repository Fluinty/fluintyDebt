import Link from 'next/link';
import { Calendar, Mail, MessageSquare, CalendarDays, CheckCircle, XCircle, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Breadcrumbs } from '@/components/shared/breadcrumbs';
import { formatDate } from '@/lib/utils/format-date';
import { formatCurrency } from '@/lib/utils/format-currency';
import { processPlaceholders } from '@/lib/utils/process-placeholders';
import { createClient } from '@/lib/supabase/server';
import { ExecuteStepButton } from '@/components/scheduler/execute-step-button';
import { EditStepButton } from '@/components/scheduler/edit-step-button';

export default async function SchedulerPage() {
    const supabase = await createClient();
    const today = new Date().toISOString().split('T')[0];

    // Fetch all scheduled steps with sequence info
    const { data: scheduledSteps } = await supabase
        .from('scheduled_steps')
        .select(`
            *,
            invoices (id, invoice_number, amount, amount_net, amount_gross, debtors (id, name, email)),
            sequence_steps (
                email_subject, 
                channel, 
                days_offset, 
                step_order,
                sequences (id, name)
            )
        `)
        .order('scheduled_for');

    const stepsList = scheduledSteps || [];

    // Only show pending steps in scheduler
    const pendingSteps = stepsList.filter(s => s.status === 'pending');

    // Calculate total steps per invoice for "Krok X/Y" display
    const stepsPerInvoice = stepsList.reduce((acc, step) => {
        const invoiceId = step.invoice_id;
        if (!acc[invoiceId]) {
            acc[invoiceId] = { total: 0, executed: 0, pending: 0 };
        }
        acc[invoiceId].total++;
        if (step.status === 'executed' || step.status === 'skipped') {
            acc[invoiceId].executed++;
        } else if (step.status === 'pending') {
            acc[invoiceId].pending++;
        }
        return acc;
    }, {} as Record<string, { total: number; executed: number; pending: number }>);

    // Group pending by date
    const groupedByDate = pendingSteps.reduce((acc, step) => {
        const date = step.scheduled_for;
        if (!acc[date]) acc[date] = [];
        acc[date].push(step);
        return acc;
    }, {} as Record<string, typeof stepsList>);

    const sortedDates = Object.keys(groupedByDate).sort();

    // Count steps due today or earlier
    const dueCount = pendingSteps.filter(s => s.scheduled_for <= today).length;

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'sent':
                return <Badge className="bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300"><CheckCircle className="h-3 w-3 mr-1" />Wysłano</Badge>;
            case 'failed':
                return <Badge className="bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300"><XCircle className="h-3 w-3 mr-1" />Błąd</Badge>;
            case 'cancelled':
                return <Badge variant="outline" className="text-muted-foreground">Anulowano</Badge>;
            default:
                return <Badge variant="outline"><Clock className="h-3 w-3 mr-1" />Oczekuje</Badge>;
        }
    };

    return (
        <div className="space-y-6">
            <Breadcrumbs />

            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold">Harmonogram</h1>
                    <p className="text-muted-foreground mt-1">
                        Zaplanowane akcje windykacyjne
                    </p>
                </div>
                {dueCount > 0 && (
                    <Badge variant="default" className="text-sm px-3 py-1">
                        {dueCount} do wysłania
                    </Badge>
                )}
            </div>

            {/* Info */}
            <Card className="bg-primary/5 border-primary/20">
                <CardContent className="pt-6">
                    <p className="text-sm">
                        📧 Kliknij "Wyślij teraz" aby ręcznie wysłać wiadomość windykacyjną.
                        Wiadomości są wysyłane na adres email kontrahenta przypisanego do faktury.
                    </p>
                </CardContent>
            </Card>

            {/* Empty state */}
            {sortedDates.length === 0 && (
                <Card className="py-12">
                    <CardContent className="text-center">
                        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
                            <CalendarDays className="h-8 w-8 text-muted-foreground" />
                        </div>
                        <h3 className="text-lg font-medium mb-2">Brak zaplanowanych akcji</h3>
                        <p className="text-muted-foreground mb-4">
                            Dodaj faktury z sekwencjami, a tutaj pojawią się zaplanowane wiadomości
                        </p>
                        <Link href="/invoices/new">
                            <Button>Dodaj fakturę</Button>
                        </Link>
                    </CardContent>
                </Card>
            )}

            {/* Pending steps by date */}
            {sortedDates.length > 0 && (
                <div className="space-y-6">
                    <h2 className="text-xl font-semibold">Oczekujące</h2>
                    {sortedDates.map((date) => {
                        const isToday = date === today;
                        const isPast = date < today;

                        return (
                            <div key={date}>
                                <div className="flex items-center gap-2 mb-4">
                                    <Calendar className={`h-5 w-5 ${isPast ? 'text-red-500' : isToday ? 'text-amber-500' : 'text-primary'}`} />
                                    <h3 className="text-lg font-semibold">{formatDate(date)}</h3>
                                    {isPast && <Badge variant="destructive">Przeterminowane</Badge>}
                                    {isToday && <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300">Dzisiaj</Badge>}
                                    <Badge variant="outline">{groupedByDate[date].length} akcji</Badge>
                                </div>

                                <div className="space-y-3">
                                    {groupedByDate[date].map((step: typeof stepsList[number]) => {
                                        const invoice = step.invoices as any;
                                        const seqStep = step.sequence_steps as any;
                                        const hasEmail = invoice?.debtors?.email;

                                        // Prepare data for placeholder replacement
                                        const invoiceData = {
                                            invoice_number: invoice?.invoice_number || '',
                                            amount: invoice?.amount_gross || invoice?.amount || 0,
                                            due_date: invoice?.due_date || '',
                                            debtor_name: invoice?.debtors?.name || '',
                                        };
                                        const displaySubject = seqStep?.email_subject
                                            ? processPlaceholders(seqStep.email_subject, invoiceData)
                                            : 'Wiadomość windykacyjna';

                                        return (
                                            <Card key={step.id} className={!hasEmail ? 'border-amber-300 bg-amber-50/50 dark:bg-amber-950/20' : ''}>
                                                <CardContent className="py-4">
                                                    <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                                                        {/* Channel icon */}
                                                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${seqStep?.channel === 'sms'
                                                            ? 'bg-green-100 text-green-600 dark:bg-green-900 dark:text-green-400'
                                                            : 'bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-400'
                                                            }`}>
                                                            {seqStep?.channel === 'sms' ? (
                                                                <MessageSquare className="h-5 w-5" />
                                                            ) : (
                                                                <Mail className="h-5 w-5" />
                                                            )}
                                                        </div>

                                                        {/* Main content - grows */}
                                                        <div className="flex-1 min-w-0">
                                                            <p className="font-medium truncate">
                                                                {displaySubject}
                                                            </p>
                                                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                                                <Link href={`/invoices/${invoice?.id}`} className="text-primary hover:underline truncate">
                                                                    {invoice?.invoice_number}
                                                                </Link>
                                                                <span>•</span>
                                                                <Link href={`/debtors/${invoice?.debtors?.id}`} className="text-primary hover:underline truncate">
                                                                    {invoice?.debtors?.name || 'Nieznany'}
                                                                </Link>
                                                                {invoice?.amount && (
                                                                    <>
                                                                        <span>•</span>
                                                                        <span>{formatCurrency(invoice.amount_gross || invoice.amount)}</span>
                                                                    </>
                                                                )}
                                                            </div>
                                                            {!hasEmail && (
                                                                <p className="text-xs text-amber-600 mt-1">⚠️ Brak adresu email</p>
                                                            )}
                                                        </div>

                                                        {/* Badges */}
                                                        <div className="flex items-center gap-2 shrink-0">
                                                            {stepsPerInvoice[step.invoice_id] && (
                                                                <Badge variant="outline" className="text-xs whitespace-nowrap">
                                                                    Krok {seqStep?.step_order}/{stepsPerInvoice[step.invoice_id].total}
                                                                </Badge>
                                                            )}
                                                            {seqStep?.sequences?.name && (
                                                                <Badge variant="secondary" className="text-xs whitespace-nowrap hidden sm:inline-flex">
                                                                    {seqStep.sequences.name}
                                                                </Badge>
                                                            )}
                                                        </div>

                                                        {/* Status & Actions */}
                                                        <div className="flex items-center gap-2 shrink-0">
                                                            {getStatusBadge(step.status)}
                                                            <EditStepButton stepId={step.id} />
                                                            <ExecuteStepButton
                                                                stepId={step.id}
                                                                status={step.status}
                                                                channel={seqStep?.channel || 'email'}
                                                            />
                                                        </div>
                                                    </div>
                                                </CardContent>
                                            </Card>
                                        );
                                    })}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
