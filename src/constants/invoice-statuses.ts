/**
 * Invoice status constants with Polish labels
 */

export const INVOICE_STATUSES = {
    pending: {
        value: 'pending',
        label: 'Oczekująca',
        color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
    },
    due_soon: {
        value: 'due_soon',
        label: 'Bliski termin',
        color: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200',
    },
    partial: {
        value: 'partial',
        label: 'Częściowo opłacona',
        color: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200',
    },
    paid: {
        value: 'paid',
        label: 'Opłacona',
        color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
    },
    overdue: {
        value: 'overdue',
        label: 'Przeterminowana',
        color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
    },
    paused: {
        value: 'paused',
        label: 'Wstrzymana',
        color: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200',
    },
    written_off: {
        value: 'written_off',
        label: 'Spisana',
        color: 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200',
    },
} as const;

export type InvoiceStatusKey = keyof typeof INVOICE_STATUSES;
