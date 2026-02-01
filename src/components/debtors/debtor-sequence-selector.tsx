'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { PlayCircle, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';

interface DebtorSequenceSelectorProps {
    debtorId: string;
    currentSequenceId: string | null;
    currentSequenceName: string | null;
}

interface Sequence {
    id: string;
    name: string;
    is_default: boolean;
}

export function DebtorSequenceSelector({
    debtorId,
    currentSequenceId,
    currentSequenceName,
}: DebtorSequenceSelectorProps) {
    const router = useRouter();
    const [sequences, setSequences] = useState<Sequence[]>([]);
    const [selectedId, setSelectedId] = useState<string>(currentSequenceId || '');
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        loadSequences();
    }, []);

    const loadSequences = async () => {
        const supabase = createClient();
        const { data } = await supabase
            .from('sequences')
            .select('id, name, is_default')
            .order('is_default', { ascending: false })
            .order('name');

        setSequences(data || []);
        setIsLoading(false);

        // If no current sequence but has default, auto-select it
        if (!currentSequenceId && data && data.length > 0) {
            const defaultSeq = data.find(s => s.is_default);
            if (defaultSeq) {
                setSelectedId(defaultSeq.id);
            }
        }
    };

    const handleChange = async (newSequenceId: string) => {
        setIsSaving(true);
        try {
            const supabase = createClient();
            const { error } = await supabase
                .from('debtors')
                .update({ default_sequence_id: newSequenceId || null })
                .eq('id', debtorId);

            if (error) throw error;

            setSelectedId(newSequenceId);
            toast.success('Sekwencja została zmieniona');
            router.refresh();
        } catch (err) {
            toast.error('Błąd podczas zmiany sekwencji');
            console.error(err);
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) {
        return (
            <Card>
                <CardContent className="py-6 flex justify-center">
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </CardContent>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <PlayCircle className="h-4 w-4 text-primary" />
                    Sekwencja windykacji
                </CardTitle>
            </CardHeader>
            <CardContent>
                <Select
                    value={selectedId}
                    onValueChange={handleChange}
                    disabled={isSaving}
                >
                    <SelectTrigger className="w-full">
                        <SelectValue placeholder="Wybierz sekwencję..." />
                    </SelectTrigger>
                    <SelectContent>
                        {sequences.map((seq) => (
                            <SelectItem key={seq.id} value={seq.id}>
                                {seq.name}
                                {seq.is_default && ' (domyślna)'}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                {sequences.length === 0 && (
                    <p className="text-sm text-muted-foreground mt-2">
                        Brak dostępnych sekwencji
                    </p>
                )}
            </CardContent>
        </Card>
    );
}
