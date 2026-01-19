/**
 * Calculate statutory interest for late commercial payments
 * Polish law: Statutory interest for commercial transactions
 * Current rate: ~15.5% annually (check NBP for current rate)
 */

const CURRENT_YEARLY_RATE = 0.155; // 15.5%

interface InterestResult {
    principal: number;
    interest: number;
    total: number;
    daysOverdue: number;
    dailyRate: number;
}

/**
 * Calculate interest for overdue invoice
 */
export function calculateInterest(
    amount: number,
    dueDate: Date,
    today: Date = new Date(),
    yearlyRate: number = CURRENT_YEARLY_RATE
): InterestResult {
    const daysOverdue = Math.max(
        0,
        Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24))
    );

    if (daysOverdue <= 0) {
        return {
            principal: amount,
            interest: 0,
            total: amount,
            daysOverdue: 0,
            dailyRate: yearlyRate / 365,
        };
    }

    const dailyRate = yearlyRate / 365;
    const interest = amount * dailyRate * daysOverdue;

    // Round to 2 decimal places
    const roundedInterest = Math.round(interest * 100) / 100;

    return {
        principal: amount,
        interest: roundedInterest,
        total: amount + roundedInterest,
        daysOverdue,
        dailyRate,
    };
}

/**
 * Format interest info for display
 */
export function formatInterestInfo(result: InterestResult): string {
    if (result.interest === 0) {
        return 'Brak odsetek';
    }

    return `Odsetki: ${result.interest.toFixed(2)} PLN (${result.daysOverdue} dni × ${(result.dailyRate * 100).toFixed(4)}%)`;
}
