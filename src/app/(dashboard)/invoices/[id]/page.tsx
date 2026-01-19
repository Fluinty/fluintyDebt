import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, Edit, Pause, Play, SkipForward, Mail, CreditCard, Clock, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Breadcrumbs } from '@/components/shared/breadcrumbs';
import { StatusBadge } from '@/components/invoices/status-badge';
import { formatCurrency } from '@/lib/utils/format-currency';
import { formatDate, formatOverdueDays } from '@/lib/utils/format-date';
import { calculateInterest } from '@/lib/interest/calculate-interest';
import { createClient } from '@/lib/supabase/server';
import { getActualInvoiceStatus, getDaysOverdue } from '@/lib/utils/invoice-calculations';
import { MarkAsPaidButton } from '@/components/invoices/mark-as-paid-button';
import { SequenceStepsList } from '@/components/invoices/sequence-steps-list';

export default async function InvoiceDetailsPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const supabase = await createClient();

    // Fetch invoice with debtor
    const { data: invoice } = await supabase
        .from('invoices')
        .select(`
            *,
            debtors (id, name, email, phone, nip)
        `)
        .eq('id', id)
        .single();

    if (!invoice) {
        notFound();
    }

    // Fetch scheduled steps for this invoice
    const { data: scheduledSteps } = await supabase
        .from('scheduled_steps')
        .select(`
            *,
            sequence_steps (email_subject, channel)
        `)
        .eq('invoice_id', id)
        .order('scheduled_for');

    // Calculate dynamic status and days overdue
    const calculatedStatus = getActualInvoiceStatus(invoice);
    const daysOverdue = getDaysOverdue(invoice.due_date);
    const interest = daysOverdue > 0 ? calculateInterest(invoice.amount, new Date(invoice.due_date)) : { interest: 0, total: invoice.amount };

    return (
        <div className="space-y-6">
            <Breadcrumbs />

            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                <div className="flex items-start gap-4">
                    <Link href="/invoices">
                        <Button variant="ghost" size="icon">
                            <ArrowLeft className="h-5 w-5" />
                        </Button>
                    </Link>
                    <div>
                        <div className="flex items-center gap-3">
                            <h1 className="text-3xl font-bold">{invoice.invoice_number}</h1>
                            <StatusBadge status={calculatedStatus} />
                        </div>
                        <p className="text-muted-foreground mt-1">
                            {invoice.debtors?.name || 'Nieznany kontrahent'}
                        </p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <Link href={`/invoices/${invoice.id}/edit`}>
                        <Button variant="outline">
                            <Edit className="h-4 w-4 mr-2" />
                            Edytuj
                        </Button>
                    </Link>
                    <MarkAsPaidButton
                        invoiceId={invoice.id}
                        amount={Number(invoice.amount)}
                        amountPaid={Number(invoice.amount_paid || 0)}
                        isPaid={calculatedStatus === 'paid'}
                    />
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Main content */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Invoice details */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Szczegóły faktury</CardTitle>
                        </CardHeader>
                        <CardContent className="grid grid-cols-2 gap-6">
                            <div>
                                <p className="text-sm text-muted-foreground">Kwota</p>
                                <p className="text-2xl font-bold">{formatCurrency(invoice.amount)}</p>
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">Pozostało do zapłaty</p>
                                <p className="text-2xl font-bold text-red-600">
                                    {formatCurrency(Number(invoice.amount) - Number(invoice.amount_paid || 0))}
                                </p>
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">Data wystawienia</p>
                                <p className="font-medium">{formatDate(invoice.issue_date)}</p>
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">Termin płatności</p>
                                <p className="font-medium">{formatDate(invoice.due_date)}</p>
                                {daysOverdue > 0 && (
                                    <p className="text-sm text-red-600">{formatOverdueDays(daysOverdue)}</p>
                                )}
                            </div>
                            {interest.interest > 0 && (
                                <>
                                    <div>
                                        <p className="text-sm text-muted-foreground">Naliczone odsetki</p>
                                        <p className="font-medium text-amber-600">{formatCurrency(interest.interest)}</p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-muted-foreground">Razem z odsetkami</p>
                                        <p className="font-bold text-lg">{formatCurrency(interest.total)}</p>
                                    </div>
                                </>
                            )}
                            {invoice.description && (
                                <div className="col-span-2">
                                    <p className="text-sm text-muted-foreground">Opis</p>
                                    <p className="font-medium">{invoice.description}</p>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Sequence timeline */}
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between">
                            <div>
                                <CardTitle>Sekwencja windykacyjna</CardTitle>
                                <CardDescription>
                                    {scheduledSteps?.length || 0} zaplanowanych kroków
                                </CardDescription>
                            </div>
                            <div className="flex gap-2">
                                <Button variant="outline" size="sm">
                                    <Pause className="h-4 w-4 mr-1" />
                                    Wstrzymaj
                                </Button>
                                <Button variant="outline" size="sm">
                                    <SkipForward className="h-4 w-4 mr-1" />
                                    Pomiń krok
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent>
                            {(!scheduledSteps || scheduledSteps.length === 0) ? (
                                <div className="text-center py-8 text-muted-foreground">
                                    <Clock className="h-10 w-10 mx-auto mb-2 opacity-50" />
                                    <p>Brak zaplanowanych kroków windykacyjnych</p>
                                </div>
                            ) : (
                                <SequenceStepsList
                                    steps={scheduledSteps.map(s => ({
                                        ...s,
                                        sequence_steps: s.sequence_steps as { email_subject: string; channel: string } | null
                                    }))}
                                    invoiceData={{
                                        invoice_number: invoice.invoice_number,
                                        amount: Number(invoice.amount),
                                        due_date: invoice.due_date,
                                        debtor_name: invoice.debtors?.name || 'Kontrahent',
                                    }}
                                />
                            )}
                        </CardContent>
                    </Card>
                </div>

                {/* Sidebar */}
                <div className="space-y-6">
                    {/* Debtor info */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Kontrahent</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            <div>
                                <p className="font-medium">{invoice.debtors?.name || 'Nieznany'}</p>
                                {invoice.debtors?.nip && (
                                    <p className="text-sm text-muted-foreground">NIP: {invoice.debtors.nip}</p>
                                )}
                            </div>
                            <Separator />
                            <div className="space-y-2">
                                {invoice.debtors?.email && (
                                    <p className="text-sm">📧 {invoice.debtors.email}</p>
                                )}
                                {invoice.debtors?.phone && (
                                    <p className="text-sm">📱 {invoice.debtors.phone}</p>
                                )}
                            </div>
                            {invoice.debtors?.id && (
                                <Link href={`/debtors/${invoice.debtors.id}`}>
                                    <Button variant="outline" size="sm" className="w-full mt-2">
                                        Zobacz profil
                                    </Button>
                                </Link>
                            )}
                        </CardContent>
                    </Card>

                    {/* Quick actions */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Akcje</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2">
                            <Button variant="outline" className="w-full justify-start">
                                <Mail className="h-4 w-4 mr-2" />
                                Wyślij wezwanie ręcznie
                            </Button>
                            <Button variant="outline" className="w-full justify-start">
                                <CreditCard className="h-4 w-4 mr-2" />
                                Kopiuj link do płatności
                            </Button>
                            <Button variant="outline" className="w-full justify-start">
                                <Play className="h-4 w-4 mr-2" />
                                Zmień sekwencję
                            </Button>
                        </CardContent>
                    </Card>

                    {/* Payment link */}
                    {invoice.payment_link && (
                        <Card>
                            <CardHeader>
                                <CardTitle>Link do płatności</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="p-3 bg-muted rounded-lg text-xs break-all font-mono">
                                    {invoice.payment_link}
                                </div>
                                <Button className="w-full mt-3" variant="outline">
                                    Kopiuj link
                                </Button>
                            </CardContent>
                        </Card>
                    )}
                </div>
            </div>
        </div>
    );
}
