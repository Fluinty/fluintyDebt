'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronRight, Home } from 'lucide-react';

interface BreadcrumbItem {
    label: string;
    href?: string;
}

const routeLabels: Record<string, string> = {
    dashboard: 'Dashboard',
    invoices: 'Należności',
    new: 'Nowa',
    import: 'Import',
    edit: 'Edycja',
    debtors: 'Kontrahenci',
    sequences: 'Sekwencje',
    'ai-generator': 'Generator AI',
    settings: 'Ustawienia',
    company: 'Dane firmy',
    payment: 'Płatności',
    integrations: 'Integracje',
};

export function Breadcrumbs() {
    const pathname = usePathname();

    // Skip breadcrumbs on dashboard
    if (pathname === '/dashboard') {
        return null;
    }

    const segments = pathname.split('/').filter(Boolean);

    const items: BreadcrumbItem[] = segments.map((segment, index) => {
        const href = '/' + segments.slice(0, index + 1).join('/');
        // Check if segment is a UUID (dynamic route)
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(segment);
        const label = isUuid ? 'Szczegóły' : (routeLabels[segment] || segment);

        return {
            label,
            href: index < segments.length - 1 ? href : undefined,
        };
    });

    return (
        <nav className="flex items-center space-x-1 text-sm text-muted-foreground mb-6">
            <Link
                href="/dashboard"
                className="flex items-center hover:text-foreground transition-colors"
            >
                <Home className="h-4 w-4" />
            </Link>
            {items.map((item, index) => (
                <div key={index} className="flex items-center">
                    <ChevronRight className="h-4 w-4 mx-1" />
                    {item.href ? (
                        <Link
                            href={item.href}
                            className="hover:text-foreground transition-colors"
                        >
                            {item.label}
                        </Link>
                    ) : (
                        <span className="text-foreground font-medium">{item.label}</span>
                    )}
                </div>
            ))}
        </nav>
    );
}
