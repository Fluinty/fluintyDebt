import { FileText, Users, GitBranch, Inbox } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

interface EmptyStateProps {
    type: 'invoices' | 'debtors' | 'sequences' | 'generic';
    title?: string;
    description?: string;
    actionLabel?: string;
    actionHref?: string;
}

const emptyStateConfig = {
    invoices: {
        icon: FileText,
        title: 'Brak faktur',
        description: 'Dodaj pierwszą fakturę, aby rozpocząć zarządzanie należnościami.',
        actionLabel: 'Dodaj fakturę',
        actionHref: '/invoices/new',
    },
    debtors: {
        icon: Users,
        title: 'Brak kontrahentów',
        description: 'Dodaj pierwszego kontrahenta, aby móc przypisywać mu faktury.',
        actionLabel: 'Dodaj kontrahenta',
        actionHref: '/debtors/new',
    },
    sequences: {
        icon: GitBranch,
        title: 'Brak sekwencji',
        description: 'Utwórz własną sekwencję windykacyjną lub użyj jednej z domyślnych.',
        actionLabel: 'Utwórz sekwencję',
        actionHref: '/sequences/new',
    },
    generic: {
        icon: Inbox,
        title: 'Brak danych',
        description: 'Nie znaleziono żadnych elementów.',
        actionLabel: undefined,
        actionHref: undefined,
    },
};

export function EmptyState({
    type,
    title,
    description,
    actionLabel,
    actionHref,
}: EmptyStateProps) {
    const config = emptyStateConfig[type];
    const Icon = config.icon;

    return (
        <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
                <Icon className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-2">
                {title || config.title}
            </h3>
            <p className="text-muted-foreground max-w-sm mb-6">
                {description || config.description}
            </p>
            {(actionHref || config.actionHref) && (
                <Link href={actionHref || config.actionHref!}>
                    <Button>
                        {actionLabel || config.actionLabel}
                    </Button>
                </Link>
            )}
        </div>
    );
}
