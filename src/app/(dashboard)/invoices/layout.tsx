import { requireModule } from '@/lib/auth/module-guard';
import { ReactNode } from 'react';

export default async function InvoicesLayout({
    children,
}: {
    children: ReactNode;
}) {
    // Strictly enforce 'sales' module access for all routes under /invoices
    await requireModule('sales');

    return (
        <>
            {children}
        </>
    );
}
