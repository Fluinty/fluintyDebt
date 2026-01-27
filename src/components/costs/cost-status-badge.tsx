import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export type CostInvoiceStatus = 'pending' | 'to_pay' | 'paid' | 'overdue' | 'due_soon';

const STATUS_CONFIG: Record<CostInvoiceStatus, { label: string; color: string }> = {
    pending: {
        label: 'Oczekująca',
        color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
    },
    to_pay: {
        label: 'Do zapłaty',
        color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
    },
    due_soon: {
        label: 'Bliski termin',
        color: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200',
    },
    paid: {
        label: 'Opłacona',
        color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
    },
    overdue: {
        label: 'Przeterminowana',
        color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
    },
};

interface CostStatusBadgeProps {
    status: string; // Allow string to match DB type but we expect CostInvoiceStatus
    className?: string;
}

export function CostStatusBadge({ status, className }: CostStatusBadgeProps) {
    const statusKey = (STATUS_CONFIG[status as CostInvoiceStatus] ? status : 'to_pay') as CostInvoiceStatus;
    const config = STATUS_CONFIG[statusKey];

    return (
        <Badge
            variant="outline"
            className={cn(config.color, 'border-0', className)}
        >
            {config.label}
        </Badge>
    );
}
