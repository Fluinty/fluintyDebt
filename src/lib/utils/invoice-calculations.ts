/**
 * Utility functions for dynamic invoice and debtor calculations
 */

import type { InvoiceStatusKey } from '@/constants/invoice-statuses';

export interface InvoiceForCalculation {
    amount: number;
    amount_net?: number;
    amount_gross?: number;
    amount_paid: number | null;
    status: string;
    due_date: string;
}

/**
 * Calculate the actual status of an invoice based on due date and payment
 */
export function getActualInvoiceStatus(invoice: InvoiceForCalculation): InvoiceStatusKey {
    const invoiceAmount = Number(invoice.amount_gross || invoice.amount);
    const remaining = invoiceAmount - Number(invoice.amount_paid || 0);

    // If fully paid
    if (remaining <= 0) return 'paid';

    // If already marked as paid in DB
    if (invoice.status === 'paid') return 'paid';

    // If partially paid
    if (Number(invoice.amount_paid || 0) > 0) return 'partial';

    const dueDate = new Date(invoice.due_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    dueDate.setHours(0, 0, 0, 0);

    // If due date has passed
    if (dueDate < today) return 'overdue';

    // If due date is within 7 days
    const sevenDaysFromNow = new Date(today);
    sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);
    if (dueDate <= sevenDaysFromNow) return 'due_soon';

    return 'pending';
}

/**
 * Calculate days overdue for an invoice
 */
export function getDaysOverdue(dueDate: string): number {
    const due = new Date(dueDate);
    const today = new Date();
    due.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);

    const diffTime = today.getTime() - due.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    return Math.max(0, diffDays);
}

/**
 * Check if an invoice is overdue
 */
export function isInvoiceOverdue(invoice: InvoiceForCalculation): boolean {
    return getActualInvoiceStatus(invoice) === 'overdue';
}

/**
 * Calculate payment score for a debtor based on their invoices
 * Score: 100 = perfect, 0 = very bad
 */
export function calculatePaymentScore(invoices: InvoiceForCalculation[]): number {
    if (invoices.length === 0) return 100; // New debtor, clean slate

    let score = 100;

    for (const invoice of invoices) {
        const status = getActualInvoiceStatus(invoice);
        const daysOverdue = getDaysOverdue(invoice.due_date);

        if (status === 'overdue') {
            // Deduct points based on how overdue
            if (daysOverdue > 90) {
                score -= 25; // Very late
            } else if (daysOverdue > 30) {
                score -= 15; // Late
            } else if (daysOverdue > 7) {
                score -= 10; // Slightly late
            } else {
                score -= 5; // Just overdue
            }
        } else if (status === 'paid') {
            // Bonus for paid invoices
            score += 2;
        }
    }

    // Clamp between 0 and 100
    return Math.max(0, Math.min(100, score));
}

/**
 * Calculate debtor statistics from invoices
 */
export function calculateDebtorStats(invoices: InvoiceForCalculation[]) {
    const processedInvoices = invoices.map(inv => ({
        ...inv,
        calculatedStatus: getActualInvoiceStatus(inv),
    }));

    const paidInvoices = processedInvoices.filter(i => i.calculatedStatus === 'paid');
    const unpaidInvoices = processedInvoices.filter(i => i.calculatedStatus !== 'paid');
    const overdueInvoices = processedInvoices.filter(i => i.calculatedStatus === 'overdue');

    // Use gross amounts (amount_gross or fallback to amount)
    const totalDebt = unpaidInvoices.reduce(
        (sum, inv) => sum + Number(inv.amount_gross || inv.amount) - Number(inv.amount_paid || 0),
        0
    );
    const totalDebtNet = unpaidInvoices.reduce(
        (sum, inv) => sum + Number(inv.amount_net || (inv.amount / 1.23)),
        0
    );
    const overdueDebt = overdueInvoices.reduce(
        (sum, inv) => sum + Number(inv.amount_gross || inv.amount) - Number(inv.amount_paid || 0),
        0
    );
    const overdueDebtNet = overdueInvoices.reduce(
        (sum, inv) => sum + Number(inv.amount_net || (inv.amount / 1.23)),
        0
    );

    return {
        totalInvoices: invoices.length,
        paidInvoices: paidInvoices.length,
        unpaidInvoices: unpaidInvoices.length,
        overdueInvoices: overdueInvoices.length,
        pendingInvoices: unpaidInvoices.length - overdueInvoices.length,
        totalDebt,
        totalDebtNet,
        overdueDebt,
        overdueDebtNet,
        paymentScore: calculatePaymentScore(invoices),
    };
}
