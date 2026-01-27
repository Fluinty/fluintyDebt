import Link from 'next/link';
import { Plus, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Breadcrumbs } from '@/components/shared/breadcrumbs';
import { VendorsTable } from '@/components/vendors/vendors-table';
import { getVendors } from '@/app/actions/vendor-actions';

export default async function VendorsPage() {
    const { data: vendors, error } = await getVendors();

    return (
        <div className="space-y-6">
            <Breadcrumbs />

            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold">Dostawcy</h1>
                    <p className="text-muted-foreground mt-1">
                        Zarządzaj bazą swoich dostawców i kontrahentów kosztowych
                    </p>
                </div>
                <Link href="/vendors/new">
                    <Button>
                        <Plus className="h-4 w-4 mr-2" />
                        Dodaj dostawcę
                    </Button>
                </Link>
            </div>

            {error ? (
                <div className="p-4 text-red-500 bg-red-50 rounded-lg">
                    Błąd pobierania dostawców: {error}
                </div>
            ) : (
                <VendorsTable vendors={vendors || []} />
            )}
        </div>
    );
}
