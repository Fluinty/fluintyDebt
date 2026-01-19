// Re-export all types
export * from './database';

// Additional types for the application

/**
 * Invoice status options
 */
export type InvoiceStatus = 'pending' | 'partial' | 'paid' | 'overdue' | 'paused' | 'written_off';

/**
 * Sequence status options
 */
export type SequenceStatus = 'active' | 'paused' | 'completed' | 'stopped';

/**
 * Channel options for sequence steps
 */
export type Channel = 'email' | 'sms' | 'both';

/**
 * Payment score ranges
 */
export type ScoreRating = 'excellent' | 'average' | 'risky' | 'problematic';

export function getScoreRating(score: number): ScoreRating {
    if (score >= 80) return 'excellent';
    if (score >= 50) return 'average';
    if (score >= 25) return 'risky';
    return 'problematic';
}

/**
 * Dashboard KPI data structure
 */
export interface DashboardKPIs {
    totalReceivables: number;
    overdueReceivables: number;
    recoveredThisMonth: number;
    paidOnTimeRate: number;
    activeInvoices: number;
    overdueInvoices: number;
}

/**
 * Cash flow prediction data
 */
export interface CashFlowPrediction {
    expectedReceivables: number;
    probableOnTime: number;
    probableWithDelay: number;
    atRisk: number;
    realisticForecast: number;
}

/**
 * ROI metrics
 */
export interface ROIMetrics {
    recoveredAmount: number;
    avgTimeToPayment: number;
    remindersSent: number;
    timeSavedHours: number;
    sequenceEffectiveness: {
        sequenceName: string;
        onTimeRate: number;
    }[];
}

/**
 * Sequence step with computed properties
 */
export interface SequenceStepWithTiming {
    id: string;
    sequenceId: string;
    stepOrder: number;
    daysOffset: number;
    channel: Channel;
    emailSubject: string | null;
    emailBody: string;
    smsBody: string | null;
    includePaymentLink: boolean;
    includeInterest: boolean;
    isAiGenerated: boolean;
    // Computed
    label: string; // e.g., "7 dni przed terminem" or "3 dni po terminie"
}

/**
 * Debtor with computed score styling
 */
export interface DebtorWithScore {
    id: string;
    name: string;
    email: string | null;
    phone: string | null;
    paymentScore: number;
    scoreRating: ScoreRating;
    totalDebt: number;
    overdueDebt: number;
}

/**
 * Invoice with debtor info for list views
 */
export interface InvoiceWithDebtor {
    id: string;
    invoiceNumber: string;
    debtorId: string;
    debtorName: string;
    amount: number;
    amountPaid: number;
    dueDate: string;
    daysOverdue: number;
    status: InvoiceStatus;
    sequenceStatus: SequenceStatus;
    interestAmount: number;
}
