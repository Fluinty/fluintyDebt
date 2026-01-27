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
    createdAt?: string;
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

    // 3. Get recent cost invoices
    const { data: recentCosts } = await supabase
        .from('cost_invoices')
        .select('id, invoice_number, amount, contractor_name, created_at, payment_status, paid_at')
        .order('created_at', { ascending: false })
        .limit(20);

    if (recentCosts) {
        recentCosts.forEach(cost => {
            // Cost invoice created event
            events.push({
                id: `cost-created-${cost.id}`,
                type: 'cost_created',
                title: 'Nowy wydatek',
                description: `Faktura ${cost.invoice_number} od ${cost.contractor_name} na kwotę ${formatCurrency(cost.amount)}`,
                date: cost.created_at,
                link: '/costs',
                status: 'success',
            });

            // Cost invoice paid event
            if (cost.payment_status === 'paid' && cost.paid_at) {
                events.push({
                    id: `cost-paid-${cost.id}`,
                    type: 'cost_paid',
                    title: 'Wydatek opłacony',
                    description: `Opłacono fakturę ${cost.invoice_number} od ${cost.contractor_name}`,
                    date: cost.paid_at,
                    link: '/costs',
                    status: 'success',
                });
            }
        });
    }

    // 4. Get scheduled steps (only executed ones)
    const { data: scheduledSteps } = await supabase
        .from('scheduled_steps')
        .select(`
            id,
            scheduled_for,
            created_at,
            status,
            executed_at,
            invoices(invoice_number, debtors(name)),
            sequence_steps(channel, email_subject)
        `)
        .order('scheduled_for', { ascending: false })
        .limit(20);

    if (scheduledSteps) {
        scheduledSteps.forEach(step => {
            // Filter out pending/cancelled - only show history
            if (step.status !== 'sent' && step.status !== 'executed' && step.status !== 'failed') {
                return;
            }

            const invoice = step.invoices as any;
            const seqStep = step.sequence_steps as any;
            const channel = 'Email';

            let status: 'success' | 'pending' | 'failed' = 'success';
            let title = `${channel} wysłany`;
            let eventType = 'step_executed';

            if (step.status === 'failed') {
                status = 'failed';
                title = `${channel} - błąd`;
            }

            events.push({
                id: `step-${step.id}`,
                type: eventType,
                title,
                description: `${invoice?.invoice_number || 'Faktura'} → ${invoice?.debtors?.name || 'kontrahent'}`,
                date: step.executed_at || step.scheduled_for, // Use executed_at if available
                createdAt: step.created_at,
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
