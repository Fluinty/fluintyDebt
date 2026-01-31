'use client';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangle, Mail, Phone } from 'lucide-react';
import Link from 'next/link';

interface MissingDataDebtor {
    id: string;
    name: string;
    missingEmail: boolean;
    missingPhone: boolean;
}

interface MissingDataAlertsProps {
    debtors: MissingDataDebtor[];
}

export function MissingDataAlerts({ debtors }: MissingDataAlertsProps) {
    if (debtors.length === 0) {
        return null;
    }

    const missingEmail = debtors.filter(d => d.missingEmail);
    const missingPhone = debtors.filter(d => d.missingPhone);

    return (
        <div className="space-y-3">
            {missingEmail.length > 0 && (
                <Alert variant="destructive" className="border-yellow-500 bg-yellow-50 dark:bg-yellow-950">
                    <Mail className="h-4 w-4" />
                    <AlertTitle className="text-yellow-800 dark:text-yellow-200">
                        Brak adresu email ({missingEmail.length})
                    </AlertTitle>
                    <AlertDescription className="text-yellow-700 dark:text-yellow-300">
                        <ul className="list-disc list-inside mt-1 space-y-1">
                            {missingEmail.slice(0, 3).map(d => (
                                <li key={d.id}>
                                    <Link
                                        href={`/debtors/${d.id}/edit`}
                                        className="underline hover:no-underline"
                                    >
                                        {d.name}
                                    </Link>
                                    {' '} – uzupełnij, aby wysyłać emaile
                                </li>
                            ))}
                            {missingEmail.length > 3 && (
                                <li>...i {missingEmail.length - 3} więcej</li>
                            )}
                        </ul>
                    </AlertDescription>
                </Alert>
            )}

            {missingPhone.length > 0 && (
                <Alert variant="destructive" className="border-orange-500 bg-orange-50 dark:bg-orange-950">
                    <Phone className="h-4 w-4" />
                    <AlertTitle className="text-orange-800 dark:text-orange-200">
                        Brak numeru telefonu ({missingPhone.length})
                    </AlertTitle>
                    <AlertDescription className="text-orange-700 dark:text-orange-300">
                        <ul className="list-disc list-inside mt-1 space-y-1">
                            {missingPhone.slice(0, 3).map(d => (
                                <li key={d.id}>
                                    <Link
                                        href={`/debtors/${d.id}/edit`}
                                        className="underline hover:no-underline"
                                    >
                                        {d.name}
                                    </Link>
                                    {' '} – uzupełnij, aby wysyłać SMS/dzwonić
                                </li>
                            ))}
                            {missingPhone.length > 3 && (
                                <li>...i {missingPhone.length - 3} więcej</li>
                            )}
                        </ul>
                    </AlertDescription>
                </Alert>
            )}
        </div>
    );
}
