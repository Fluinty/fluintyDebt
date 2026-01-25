'use client';

import { useState } from 'react';
import { Edit } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { EditScheduledStepModal } from './edit-scheduled-step-modal';

interface EditStepButtonProps {
    stepId: string;
    variant?: 'default' | 'ghost' | 'outline';
    size?: 'default' | 'sm' | 'icon';
}

export function EditStepButton({ stepId, variant = 'ghost', size = 'icon' }: EditStepButtonProps) {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <>
            <Button
                variant={variant}
                size={size}
                onClick={() => setIsOpen(true)}
                title="Edytuj krok"
            >
                <Edit className="h-4 w-4" />
            </Button>
            <EditScheduledStepModal
                stepId={stepId}
                open={isOpen}
                onOpenChange={setIsOpen}
            />
        </>
    );
}
