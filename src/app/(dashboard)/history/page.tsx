import { History as HistoryIcon } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Breadcrumbs } from '@/components/shared/breadcrumbs';
import { HistoryTimeline } from '@/components/history/history-timeline';
import { formatCurrency } from '@/lib/utils/format-currency';
import { createClient } from '@/lib/supabase/server';

interface HistoryEvent {
    id: string;
    type: string;
    title: string;
    description: string;
    date: string;
    link?: string;
    status?: 'success' | 'pending' | 'failed';
}

export default async function HistoryPage() {
    const supabase = await createClient();
    const events: HistoryEvent[] = [];

    // 1. Get recent invoices (created)
    const { data: recentInvoices } = await supabase
        .from('invoices')
        .select('id, invoice_number, amount, created_at, status, paid_at, debtors(name)')
        .order('created_at', { ascending: false })
        .limit(20);

    if (recentInvoices) {
        recentInvoices.forEach(inv => {
            const debtor = inv.debtors as any;

            // Invoice created event
            events.push({
                id: `inv-created-${inv.id}`,
                type: 'invoice_created',
                title: 'Nowa faktura',
                description: `${inv.invoice_number} dla ${debtor?.name || 'kontrahenta'} na kwotę ${formatCurrency(inv.amount)}`,
                date: inv.created_at,
                link: `/invoices/${inv.id}`,
                status: 'success',
            });

            // Invoice paid event
            if (inv.status === 'paid' && inv.paid_at) {
                events.push({
                    id: `inv-paid-${inv.id}`,
                    type: 'invoice_paid',
                    title: 'Faktura opłacona',
                    description: `${inv.invoice_number} - otrzymano ${formatCurrency(inv.amount)}`,
                    date: inv.paid_at,
                    link: `/invoices/${inv.id}`,
                    status: 'success',
                });
            }
        });
    }

    // 2. Get recent debtors (created)
    const { data: recentDebtors } = await supabase
        .from('debtors')
        .select('id, name, email, created_at')
        .order('created_at', { ascending: false })
        .limit(10);

    if (recentDebtors) {
        recentDebtors.forEach(debtor => {
            events.push({
                id: `debtor-${debtor.id}`,
                type: 'debtor_created',
                title: 'Nowy kontrahent',
                description: `Dodano ${debtor.name}${debtor.email ? ` (${debtor.email})` : ''}`,
                date: debtor.created_at,
                link: `/debtors/${debtor.id}`,
                status: 'success',
            });
        });
    }

    // 3. Get scheduled steps (to show what's planned)
    const { data: scheduledSteps } = await supabase
        .from('scheduled_steps')
        .select(`
            id,
            scheduled_for,
            status,
            invoices(invoice_number, debtors(name)),
            sequence_steps(channel, email_subject)
        `)
        .order('scheduled_for', { ascending: false })
        .limit(20);

    if (scheduledSteps) {
        scheduledSteps.forEach(step => {
            const invoice = step.invoices as any;
            const seqStep = step.sequence_steps as any;
            const channel = seqStep?.channel === 'sms' ? 'SMS' : seqStep?.channel === 'both' ? 'Email i SMS' : 'Email';

            let status: 'success' | 'pending' | 'failed' = 'pending';
            let title = 'Zaplanowane przypomnienie';
            let eventType = 'step_scheduled';

            if (step.status === 'sent' || step.status === 'executed') {
                status = 'success';
                title = `${channel} wysłany`;
                eventType = 'step_executed';
            } else if (step.status === 'failed') {
                status = 'failed';
                title = `${channel} - błąd`;
                eventType = 'step_executed';
            } else if (step.status === 'cancelled') {
                return; // Skip cancelled steps
            }

            events.push({
                id: `step-${step.id}`,
                type: eventType,
                title,
                description: `${invoice?.invoice_number || 'Faktura'} → ${invoice?.debtors?.name || 'kontrahent'}`,
                date: step.scheduled_for,
                link: '/scheduler',
                status,
            });
        });
    }

    // Sort by date descending
    events.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    const sortedEvents = events.slice(0, 50);

    return (
        <div className="space-y-6">
            <Breadcrumbs />

            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold">Historia</h1>
                    <p className="text-muted-foreground mt-1">
                        Wszystkie zdarzenia w systemie
                    </p>
                </div>
            </div>

            {/* Empty state */}
            {sortedEvents.length === 0 && (
                <Card className="py-12">
                    <CardContent className="text-center">
                        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
                            <HistoryIcon className="h-8 w-8 text-muted-foreground" />
                        </div>
                        <h3 className="text-lg font-medium mb-2">Brak historii</h3>
                        <p className="text-muted-foreground mb-4">
                            Dodaj faktury i kontrahentów, a tutaj pojawi się historia zdarzeń
                        </p>
                    </CardContent>
                </Card>
            )}

            {/* History timeline with filters */}
            {sortedEvents.length > 0 && (
                <HistoryTimeline events={sortedEvents} />
            )}
        </div>
    );
}
