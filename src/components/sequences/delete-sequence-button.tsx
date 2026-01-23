'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Trash2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';

interface DeleteSequenceButtonProps {
    sequenceId: string;
    sequenceName: string;
}

export function DeleteSequenceButton({ sequenceId, sequenceName }: DeleteSequenceButtonProps) {
    const router = useRouter();
    const [isDeleting, setIsDeleting] = useState(false);
    const [open, setOpen] = useState(false);

    const handleDelete = async () => {
        setIsDeleting(true);
        try {
            const supabase = createClient();

            // First delete associated sequence steps
            await supabase
                .from('sequence_steps')
                .delete()
                .eq('sequence_id', sequenceId);

            // Then delete the sequence
            const { error } = await supabase
                .from('sequences')
                .delete()
                .eq('id', sequenceId);

            if (error) throw error;

            toast.success(`Sekwencja "${sequenceName}" została usunięta`);
            setOpen(false);
            router.refresh();
        } catch (err) {
            console.error('Error deleting sequence:', err);
            toast.error('Nie udało się usunąć sekwencji');
        } finally {
            setIsDeleting(false);
        }
    };

    return (
        <AlertDialog open={open} onOpenChange={setOpen}>
            <AlertDialogTrigger asChild>
                <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700">
                    <Trash2 className="h-4 w-4" />
                </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Usunąć sekwencję?</AlertDialogTitle>
                    <AlertDialogDescription>
                        Czy na pewno chcesz usunąć sekwencję <strong>"{sequenceName}"</strong>?
                        <br /><br />
                        Ta akcja jest nieodwracalna. Wszystkie kroki sekwencji zostaną również usunięte.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel disabled={isDeleting}>Anuluj</AlertDialogCancel>
                    <AlertDialogAction
                        onClick={handleDelete}
                        disabled={isDeleting}
                        className="bg-red-600 hover:bg-red-700"
                    >
                        {isDeleting ? (
                            <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                Usuwanie...
                            </>
                        ) : (
                            'Usuń sekwencję'
                        )}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}
