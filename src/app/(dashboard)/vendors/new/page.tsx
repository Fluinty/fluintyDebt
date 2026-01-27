import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Breadcrumbs } from '@/components/shared/breadcrumbs';
import { VendorForm } from '@/components/vendors/vendor-form';

export default function NewVendorPage() {
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
                    <h1 className="text-3xl font-bold">Nowy dostawca</h1>
                    <p className="text-muted-foreground mt-1">
                        Dodaj nowego kontrahenta do swojej bazy dostawców
                    </p>
                </div>
            </div>

            <VendorForm />
        </div>
    );
}
