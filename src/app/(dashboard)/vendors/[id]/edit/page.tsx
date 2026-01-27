import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Breadcrumbs } from '@/components/shared/breadcrumbs';
import { VendorForm } from '@/components/vendors/vendor-form';
import { getVendor } from '@/app/actions/vendor-actions';

interface EditVendorPageProps {
    params: Promise<{ id: string }>;
}

export default async function EditVendorPage({ params }: EditVendorPageProps) {
    const { id } = await params;
    const { data: vendor, error } = await getVendor(id);

    if (error || !vendor) {
        notFound();
    }

    return (
        <div className="space-y-6">
            <Breadcrumbs />

            <div className="flex items-center gap-4">
                <Link href="/vendors">
                    <Button variant="ghost" size="icon">
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                </Link>
                <div>
                    <h1 className="text-3xl font-bold">Edytuj dostawcę</h1>
                    <p className="text-muted-foreground mt-1">
                        Aktualizuj dane: {vendor.name}
                    </p>
                </div>
            </div>

            <VendorForm vendor={vendor} />
        </div>
    );
}
