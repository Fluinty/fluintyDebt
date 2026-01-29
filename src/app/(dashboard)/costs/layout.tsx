import { requireModule } from '@/lib/auth/module-guard';
import { ReactNode } from 'react';

export default async function CostsLayout({
    children,
}: {
    children: ReactNode;
}) {
    // Strictly enforce 'costs' module access for all routes under /costs
    await requireModule('costs');

    return (
        <>
            {children}
        </>
    );
}
