'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { Bell, AlertTriangle, CheckCircle, Clock, Calendar, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { createClient } from '@/lib/supabase/client';
import { formatCurrency } from '@/lib/utils/format-currency';

const STORAGE_KEY = 'fluintydebt_read_notifications';

interface Notification {
    id: string;
    type: 'overdue' | 'due_soon' | 'payment' | 'scheduled' | 'info' | 'ksef_sync';
    title: string;
    message: string;
    time: string;
    link?: string;
    read: boolean;
    dbId?: string; // For database-stored notifications
}

function getNotificationIcon(type: string) {
    switch (type) {
        case 'overdue':
            return <AlertTriangle className="h-4 w-4 text-red-500" />;
        case 'due_soon':
            return <Clock className="h-4 w-4 text-amber-500" />;
        case 'payment':
            return <CheckCircle className="h-4 w-4 text-green-500" />;
        case 'scheduled':
            return <Calendar className="h-4 w-4 text-blue-500" />;
        case 'ksef_sync':
            return <RefreshCw className="h-4 w-4 text-emerald-500" />;
        default:
            return <Bell className="h-4 w-4" />;
    }
}

function getRelativeTime(date: Date): string {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'teraz';
    if (diffMins < 60) return `${diffMins} min temu`;
    if (diffHours < 24) return `${diffHours} godz. temu`;
    if (diffDays < 7) return `${diffDays} dni temu`;
    return date.toLocaleDateString('pl-PL');
}

function getReadNotifications(): Set<string> {
    if (typeof window === 'undefined') return new Set();
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
            const data = JSON.parse(stored);
            // Clean up old entries (older than 7 days)
            const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
            const filtered = Object.entries(data)
                .filter(([_, timestamp]) => (timestamp as number) > weekAgo)
                .map(([id]) => id);
            return new Set(filtered);
        }
    } catch {
        // Ignore errors
    }
    return new Set();
}

function markAsRead(ids: string[]) {
    if (typeof window === 'undefined') return;
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        const data = stored ? JSON.parse(stored) : {};
        const now = Date.now();
        ids.forEach(id => {
            data[id] = now;
        });
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch {
        // Ignore errors
    }
}

export function NotificationsDropdown() {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isOpen, setIsOpen] = useState(false);
    const [readIds, setReadIds] = useState<Set<string>>(new Set());

    const loadNotifications = useCallback(async () => {
        const supabase = createClient();
        const notifs: Notification[] = [];
        const today = new Date();
        const todayStr = today.toISOString().split('T')[0];
        const storedReadIds = getReadNotifications();

        // 1. Get overdue invoices
        const { data: overdueInvoices } = await supabase
            .from('invoices')
            .select('id, invoice_number, amount, due_date, debtors(name)')
            .lt('due_date', todayStr)
            .neq('status', 'paid')
            .order('due_date', { ascending: true })
            .limit(5);

        if (overdueInvoices) {
            overdueInvoices.forEach(inv => {
                const dueDate = new Date(inv.due_date);
                const daysOverdue = Math.floor((today.getTime() - dueDate.getTime()) / 86400000);
                const notifId = `overdue-${inv.id}`;
                notifs.push({
                    id: notifId,
                    type: 'overdue',
                    title: 'Faktura przeterminowana',
                    message: `${inv.invoice_number} - ${daysOverdue} dni po terminie (${formatCurrency(inv.amount)})`,
                    time: getRelativeTime(dueDate),
                    link: `/invoices/${inv.id}`,
                    read: storedReadIds.has(notifId),
                });
            });
        }

        // 2. Get invoices due soon (next 3 days)
        const threeDaysLater = new Date(today);
        threeDaysLater.setDate(threeDaysLater.getDate() + 3);
        const threeDaysStr = threeDaysLater.toISOString().split('T')[0];

        const { data: dueSoonInvoices } = await supabase
            .from('invoices')
            .select('id, invoice_number, amount, due_date, debtors(name)')
            .gte('due_date', todayStr)
            .lte('due_date', threeDaysStr)
            .neq('status', 'paid')
            .order('due_date', { ascending: true })
            .limit(3);

        if (dueSoonInvoices) {
            dueSoonInvoices.forEach(inv => {
                const dueDate = new Date(inv.due_date);
                const daysUntil = Math.floor((dueDate.getTime() - today.getTime()) / 86400000);
                const notifId = `due-${inv.id}`;
                notifs.push({
                    id: notifId,
                    type: 'due_soon',
                    title: 'Zbliża się termin',
                    message: `${inv.invoice_number} - za ${daysUntil} dni (${formatCurrency(inv.amount)})`,
                    time: `Termin: ${dueDate.toLocaleDateString('pl-PL')}`,
                    link: `/invoices/${inv.id}`,
                    read: storedReadIds.has(notifId),
                });
            });
        }

        // 3. Get today's scheduled steps
        const { data: scheduledToday } = await supabase
            .from('scheduled_steps')
            .select(`
                id,
                scheduled_for,
                invoices(invoice_number),
                sequence_steps(email_subject, channel)
            `)
            .eq('scheduled_for', todayStr)
            .eq('status', 'pending')
            .limit(3);

        if (scheduledToday) {
            scheduledToday.forEach(step => {
                const invoice = step.invoices as any;
                const seqStep = step.sequence_steps as any;
                const notifId = `sched-${step.id}`;
                notifs.push({
                    id: notifId,
                    type: 'scheduled',
                    title: 'Zaplanowana akcja',
                    message: `${seqStep?.channel === 'email' ? 'Email' : 'SMS'} dla ${invoice?.invoice_number || 'faktury'}`,
                    time: 'Dzisiaj',
                    link: '/scheduler',
                    read: storedReadIds.has(notifId),
                });
            });
        }

        // 4. Get recent payments (last 7 days)
        const weekAgo = new Date(today);
        weekAgo.setDate(weekAgo.getDate() - 7);

        const { data: recentPayments } = await supabase
            .from('invoices')
            .select('id, invoice_number, amount, paid_at, debtors(name)')
            .eq('status', 'paid')
            .gte('paid_at', weekAgo.toISOString())
            .order('paid_at', { ascending: false })
            .limit(3);

        if (recentPayments) {
            recentPayments.forEach(inv => {
                const debtor = inv.debtors as any;
                const notifId = `paid-${inv.id}`;
                notifs.push({
                    id: notifId,
                    type: 'payment',
                    title: 'Otrzymano płatność',
                    message: `${debtor?.name || 'Kontrahent'} zapłacił ${formatCurrency(inv.amount)}`,
                    time: inv.paid_at ? getRelativeTime(new Date(inv.paid_at)) : 'Niedawno',
                    link: `/invoices/${inv.id}`,
                    read: storedReadIds.has(notifId),
                });
            });
        }

        // 5. Get database notifications (KSeF sync, etc.)
        const { data: dbNotifications } = await supabase
            .from('notifications')
            .select('*')
            .eq('read', false)
            .order('created_at', { ascending: false })
            .limit(5);

        if (dbNotifications) {
            dbNotifications.forEach(n => {
                notifs.push({
                    id: `db-${n.id}`,
                    dbId: n.id,
                    type: n.type as Notification['type'],
                    title: n.title,
                    message: n.message,
                    time: getRelativeTime(new Date(n.created_at)),
                    link: n.link,
                    read: n.read,
                });
            });
        }

        // Sort by read status and limit
        notifs.sort((a, b) => {
            if (a.read === b.read) return 0;
            return a.read ? 1 : -1;
        });

        setNotifications(notifs.slice(0, 10));
        setReadIds(storedReadIds);
        setIsLoading(false);
    }, []);

    useEffect(() => {
        loadNotifications();
    }, [loadNotifications]);

    // Mark all as read when dropdown closes
    const handleOpenChange = async (open: boolean) => {
        setIsOpen(open);

        if (!open && notifications.length > 0) {
            // Mark all current notifications as read
            const unreadIds = notifications.filter(n => !n.read).map(n => n.id);
            if (unreadIds.length > 0) {
                markAsRead(unreadIds);
                // Update local state
                setNotifications(prev => prev.map(n => ({ ...n, read: true })));

                // Mark database notifications as read
                const dbIds = notifications.filter(n => n.dbId && !n.read).map(n => n.dbId!);
                if (dbIds.length > 0) {
                    const supabase = createClient();
                    await supabase
                        .from('notifications')
                        .update({ read: true })
                        .in('id', dbIds);
                }
            }
        }
    };

    const unreadCount = notifications.filter(n => !n.read).length;

    return (
        <DropdownMenu open={isOpen} onOpenChange={handleOpenChange}>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="relative">
                    <Bell className="h-5 w-5" />
                    {unreadCount > 0 && (
                        <Badge className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-xs">
                            {unreadCount}
                        </Badge>
                    )}
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80">
                <div className="px-3 py-2 border-b flex justify-between items-center">
                    <p className="font-semibold">Powiadomienia</p>
                    {unreadCount > 0 && (
                        <span className="text-xs text-muted-foreground">
                            {unreadCount} nowych
                        </span>
                    )}
                </div>
                <div className="max-h-80 overflow-y-auto">
                    {isLoading ? (
                        <div className="px-3 py-4 text-center text-muted-foreground">
                            Ładowanie...
                        </div>
                    ) : notifications.length === 0 ? (
                        <div className="px-3 py-4 text-center text-muted-foreground">
                            Brak powiadomień
                        </div>
                    ) : (
                        notifications.map((notif) => (
                            <Link
                                key={notif.id}
                                href={notif.link || '#'}
                                className={`block px-3 py-3 hover:bg-muted/50 cursor-pointer border-b last:border-0 ${!notif.read ? 'bg-primary/5' : ''}`}
                            >
                                <div className="flex gap-3">
                                    <div className="mt-1">{getNotificationIcon(notif.type)}</div>
                                    <div className="flex-1 min-w-0">
                                        <p className={`text-sm ${!notif.read ? 'font-medium' : ''}`}>
                                            {notif.title}
                                        </p>
                                        <p className="text-xs text-muted-foreground truncate">
                                            {notif.message}
                                        </p>
                                        <p className="text-xs text-muted-foreground mt-1">{notif.time}</p>
                                    </div>
                                    {!notif.read && (
                                        <div className="w-2 h-2 bg-primary rounded-full mt-2" />
                                    )}
                                </div>
                            </Link>
                        ))
                    )}
                </div>
                {notifications.length > 0 && (
                    <div className="px-3 py-2 border-t">
                        <Link href="/history" className="text-xs text-primary hover:underline">
                            Zobacz całą historię
                        </Link>
                    </div>
                )}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
