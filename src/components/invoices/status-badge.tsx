import { Badge } from '@/components/ui/badge';
import { INVOICE_STATUSES, type InvoiceStatusKey } from '@/constants/invoice-statuses';
import { cn } from '@/lib/utils';

interface StatusBadgeProps {
    status: InvoiceStatusKey;
    className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
    const config = INVOICE_STATUSES[status] || INVOICE_STATUSES.pending;

    return (
        <Badge
            variant="outline"
            className={cn(config.color, 'border-0', className)}
        >
            {config.label}
        </Badge>
    );
}
