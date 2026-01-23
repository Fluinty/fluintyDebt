'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { changeInvoiceSequence, getAvailableSequences } from '@/app/actions/invoice-actions';

interface SequenceSelectorProps {
    invoiceId: string;
    dueDate: string;
    currentSequenceId: string | null;
    currentSequenceName: string | null;
}

export function SequenceSelector({
    invoiceId,
    dueDate,
    currentSequenceId,
    currentSequenceName,
}: SequenceSelectorProps) {
    const router = useRouter();
    const [sequences, setSequences] = useState<{ id: string; name: string }[]>([]);
    const [selectedSequence, setSelectedSequence] = useState<string>(currentSequenceId || '');
    const [isLoading, setIsLoading] = useState(false);
    const [isChanging, setIsChanging] = useState(false);

    useEffect(() => {
        loadSequences();
    }, []);

    const loadSequences = async () => {
        setIsLoading(true);
        const result = await getAvailableSequences();
        if (result.sequences) {
            setSequences(result.sequences);
        }
        setIsLoading(false);
    };

    const handleChange = async (newSequenceId: string) => {
        if (newSequenceId === selectedSequence) return;

        setIsChanging(true);
        setSelectedSequence(newSequenceId);

        try {
            const result = await changeInvoiceSequence(invoiceId, newSequenceId, dueDate);
            if (result.error) {
                toast.error('Błąd: ' + result.error);
                setSelectedSequence(currentSequenceId || '');
            } else {
                toast.success('Sekwencja została zmieniona!');
                router.refresh();
            }
        } catch (err) {
            console.error('Error changing sequence:', err);
            toast.error('Wystąpił błąd podczas zmiany sekwencji');
            setSelectedSequence(currentSequenceId || '');
        } finally {
            setIsChanging(false);
        }
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-base">Sekwencja windykacyjna</CardTitle>
            </CardHeader>
            <CardContent>
                <Select
                    value={selectedSequence}
                    onValueChange={handleChange}
                    disabled={isLoading || isChanging}
                >
                    <SelectTrigger className="w-full">
                        {isChanging ? (
                            <div className="flex items-center gap-2">
                                <Loader2 className="h-4 w-4 animate-spin" />
                                <span>Zapisuję...</span>
                            </div>
                        ) : (
                            <SelectValue placeholder={isLoading ? "Ładowanie..." : "Wybierz sekwencję..."} />
                        )}
                    </SelectTrigger>
                    <SelectContent>
                        {sequences.map((seq) => (
                            <SelectItem key={seq.id} value={seq.id}>
                                {seq.name}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </CardContent>
        </Card>
    );
}
