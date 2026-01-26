'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { Clock, Mail, MessageSquare, CheckCircle, XCircle, CreditCard, FileText, UserPlus, Calendar, Search, Filter } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { formatDate } from '@/lib/utils/format-date';

interface HistoryEvent {
    id: string;
    type: string;
    title: string;
    description: string;
    date: string;
    createdAt?: string;
    link?: string;
    status?: 'success' | 'pending' | 'failed';
}

interface HistoryTimelineProps {
    events: HistoryEvent[];
}

const getEventIcon = (type: string, status?: string) => {
    if (status === 'failed') return <XCircle className="h-5 w-5 text-red-500" />;

    switch (type) {
        case 'invoice_paid':
            return <CreditCard className="h-5 w-5 text-green-500" />;
        case 'invoice_created':
            return <FileText className="h-5 w-5 text-blue-500" />;
        case 'debtor_created':
            return <UserPlus className="h-5 w-5 text-indigo-500" />;
        case 'step_scheduled':
            return <Calendar className="h-5 w-5 text-amber-500" />;
        case 'step_executed':
        case 'email':
            return <Mail className="h-5 w-5 text-blue-500" />;

        default:
            return <Clock className="h-5 w-5 text-muted-foreground" />;
    }
};

const getStatusBadge = (status?: string) => {
    switch (status) {
        case 'success':
            return <Badge className="bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300">Sukces</Badge>;
        case 'pending':
            return <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300">Oczekuje</Badge>;
        case 'failed':
            return <Badge className="bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300">Błąd</Badge>;
        default:
            return null;
    }
};

const eventTypeLabels: Record<string, string> = {
    'all': 'Wszystkie',
    'invoice_created': 'Nowe faktury',
    'invoice_paid': 'Płatności otrzymane',
    'debtor_created': 'Nowi kontrahenci',
    'step_scheduled': 'Zaplanowane akcje',
    'step_executed': 'Wysłane wiadomości',
    'email': 'Emaile',

};

export function HistoryTimeline({ events }: HistoryTimelineProps) {
    const [search, setSearch] = useState('');
    const [typeFilter, setTypeFilter] = useState('all');

    // Get unique event types that actually exist in the data
    const availableTypes = useMemo(() => {
        const types = new Set(events.map(e => e.type));
        return ['all', ...Array.from(types)];
    }, [events]);

    const filteredEvents = useMemo(() => {
        let result = [...events];

        // Search filter
        if (search.trim()) {
            const searchLower = search.toLowerCase();
            result = result.filter(ev =>
                ev.title.toLowerCase().includes(searchLower) ||
                ev.description.toLowerCase().includes(searchLower)
            );
        }

        // Type filter
        if (typeFilter !== 'all') {
            result = result.filter(ev => ev.type === typeFilter);
        }

        return result;
    }, [events, search, typeFilter]);

    return (
        <>
            {/* Filters */}
            <Card>
                <CardContent className="pt-6">
                    <div className="flex flex-col sm:flex-row gap-4">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Szukaj w historii..."
                                className="pl-10"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                            />
                        </div>
                        <Select value={typeFilter} onValueChange={setTypeFilter}>
                            <SelectTrigger className="w-[200px]">
                                <SelectValue placeholder="Typ zdarzenia" />
                            </SelectTrigger>
                            <SelectContent>
                                {availableTypes.map((type) => (
                                    <SelectItem key={type} value={type}>
                                        {eventTypeLabels[type] || type}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    {(search || typeFilter !== 'all') && (
                        <div className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
                            <span>Wyniki: {filteredEvents.length} z {events.length}</span>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => { setSearch(''); setTypeFilter('all'); }}
                            >
                                Wyczyść filtry
                            </Button>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Timeline */}
            <Card>
                <CardHeader>
                    <CardTitle>Ostatnie zdarzenia</CardTitle>
                    <CardDescription>{filteredEvents.length} zdarzeń</CardDescription>
                </CardHeader>
                <CardContent>
                    {filteredEvents.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                            Brak zdarzeń spełniających kryteria
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {filteredEvents.map((event, index) => (
                                <div key={event.id} className="flex gap-4">
                                    <div className="flex flex-col items-center">
                                        <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                                            {getEventIcon(event.type, event.status)}
                                        </div>
                                        {index < filteredEvents.length - 1 && (
                                            <div className="w-0.5 flex-1 bg-border mt-2" />
                                        )}
                                    </div>
                                    <div className="flex-1 pb-6">
                                        <div className="flex items-start justify-between">
                                            <div>
                                                <p className="font-medium">{event.title}</p>
                                                <p className="text-sm text-muted-foreground">
                                                    {event.description}
                                                </p>
                                            </div>
                                            {getStatusBadge(event.status)}
                                        </div>
                                        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-2">
                                            <p>Data: {formatDate(event.date)}</p>
                                            {event.createdAt && (
                                                <>
                                                    <span className="text-border">|</span>
                                                    <p>Utworzono: {formatDate(event.createdAt)}</p>
                                                </>
                                            )}
                                        </div>
                                        {event.link && (
                                            <Link
                                                href={event.link}
                                                className="text-xs text-primary hover:underline mt-1 inline-block"
                                            >
                                                Szczegóły →
                                            </Link>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        </>
    );
}
