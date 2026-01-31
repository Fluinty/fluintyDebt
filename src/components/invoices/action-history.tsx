'use client';

import {
    CheckCircle,
    XCircle,
    Clock,
    Mail,
    MessageSquare,
    Phone,
    AlertCircle,
    User
} from 'lucide-react';
import { formatDate } from '@/lib/utils/format-date';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface ActionLog {
    id: string;
    action_type: string;
    channel?: string;
    status: string;
    created_at: string;
    sent_at?: string;
    error_message?: string;
    content?: string;
    metadata?: any;
}

interface ActionHistoryProps {
    actions: ActionLog[];
}

export function ActionHistory({ actions }: ActionHistoryProps) {
    if (!actions || actions.length === 0) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Historia akcji</CardTitle>
                    <CardDescription>Brak zarejestrowanych zdarzeń dla tej faktury</CardDescription>
                </CardHeader>
            </Card>
        );
    }

    const getIcon = (action: ActionLog) => {
        // Prioritize channel if available
        const type = action.channel || action.action_type;

        switch (type) {
            case 'sms': return <MessageSquare className="h-4 w-4" />;
            case 'voice': return <Phone className="h-4 w-4" />;
            case 'email': return <Mail className="h-4 w-4" />;
            case 'manual': return <User className="h-4 w-4" />;
            default: return <Clock className="h-4 w-4" />;
        }
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'sent':
            case 'executed':
            case 'delivered':
                return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Wysłano</Badge>;
            case 'failed':
            case 'undelivered':
                return <Badge variant="destructive">Błąd</Badge>;
            case 'pending':
                return <Badge variant="secondary">W trakcie</Badge>;
            default:
                return <Badge variant="outline">{status}</Badge>;
        }
    };

    const formatActionName = (action: ActionLog) => {
        const type = action.channel || action.action_type;
        switch (type) {
            case 'sms': return 'Wiadomość SMS';
            case 'voice': return 'Połączenie głosowe';
            case 'email': return 'Wiadomość Email';
            case 'manual': return 'Akcja ręczna';
            default: return action.action_type;
        }
    };

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle>Historia akcji</CardTitle>
                        <CardDescription>Zrealizowane działania windykacyjne</CardDescription>
                    </div>
                    <Badge variant="secondary">{actions.length}</Badge>
                </div>
            </CardHeader>
            <CardContent>
                <div className="overflow-y-auto h-[300px] pr-4">
                    <div className="space-y-4">
                        {actions.map((action, index) => (
                            <div key={action.id} className="relative flex gap-4">
                                {/* Timeline line */}
                                {index !== actions.length - 1 && (
                                    <div className="absolute left-[15px] top-8 bottom-[-16px] w-[2px] bg-muted" />
                                )}

                                <div className={`
                                    relative z-10 w-8 h-8 rounded-full flex items-center justify-center border
                                    ${action.status === 'failed' ? 'bg-red-50 border-red-200 text-red-600' :
                                        'bg-background border-muted text-muted-foreground'}
                                `}>
                                    {getIcon(action)}
                                </div>

                                <div className="flex-1 space-y-1 pb-1">
                                    <div className="flex items-center justify-between">
                                        <p className="font-medium text-sm">
                                            {formatActionName(action)}
                                        </p>
                                        <span className="text-xs text-muted-foreground">
                                            {formatDate(action.created_at)}
                                        </span>
                                    </div>

                                    <div className="flex items-center gap-2">
                                        {getStatusBadge(action.status)}
                                        {action.error_message && (
                                            <span className="text-xs text-red-600 flex items-center gap-1">
                                                <AlertCircle className="h-3 w-3" />
                                                {action.error_message}
                                            </span>
                                        )}
                                    </div>

                                    {action.content && (
                                        <div className="mt-2 p-2 bg-muted/30 rounded text-sm italic text-muted-foreground border border-muted">
                                            "{action.content}"
                                        </div>
                                    )}

                                    {/* Only show metadata if no content or debug mode needed (hidden for now for clarity) */}
                                    {action.metadata && action.status === 'failed' && (
                                        <div className="bg-red-50 p-2 rounded text-xs mt-2 text-red-600 font-mono">
                                            {JSON.stringify(action.metadata, null, 2)}
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
