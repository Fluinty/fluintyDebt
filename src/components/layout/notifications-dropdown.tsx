'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { Bell, AlertTriangle, CheckCircle, Clock, Calendar, RefreshCw, Mail, MessageSquare, Trash2, AlertCircle } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuTrigger,
    DropdownMenuItem,
    DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { createClient } from '@/lib/supabase/client';
import { generateDailyNotifications, markAllNotificationsAsRead, markNotificationAsRead } from '@/app/actions/notification-actions';

interface Notification {
    id: string;
    type: string;
    title: string;
    message: string;
    link?: string;
    read: boolean;
    created_at: string;
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
        case 'email_sent':
        case 'info':
            return <Mail className="h-4 w-4 text-indigo-500" />;
        case 'sms_sent':
            return <MessageSquare className="h-4 w-4 text-orange-500" />;
        default:
            return <Bell className="h-4 w-4" />;
    }
}

function getRelativeTime(dateStr: string): string {
    const date = new Date(dateStr);
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

export function NotificationsDropdown() {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isOpen, setIsOpen] = useState(false);
    const [unreadCount, setUnreadCount] = useState(0);

    const loadNotifications = useCallback(async () => {
        try {
            const supabase = createClient();

            // Fetch notifications from DB
            const { data } = await supabase
                .from('notifications')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(20);

            if (data) {
                setNotifications(data as Notification[]);
                setUnreadCount(data.filter((n: any) => !n.read).length);
            }
        } catch (error) {
            console.error('Failed to load notifications', error);
        } finally {
            setIsLoading(false);
        }
    }, []);

    // Initial load and generate check
    useEffect(() => {
        // Trigger verification for overdue/scheduled items
        // This acts as a "lazy cron" when user logs in
        generateDailyNotifications().then(() => {
            loadNotifications();
        });

        // Set up realtime subscription for new notifications
        const supabase = createClient();
        const channel = supabase
            .channel('notifications_changes')
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'notifications',
                },
                (payload) => {
                    // Refresh on new notification
                    loadNotifications();
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [loadNotifications]);

    const handleMarkAsRead = async (id: string, link?: string) => {
        // Optimistic update
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
        setUnreadCount(prev => Math.max(0, prev - 1));

        await markNotificationAsRead(id);

        if (link) {
            setIsOpen(false);
        }
    };

    const handleMarkAllRead = async () => {
        setNotifications(prev => prev.map(n => ({ ...n, read: true })));
        setUnreadCount(0);
        await markAllNotificationsAsRead();
    };

    return (
        <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="relative">
                    <Bell className="h-5 w-5" />
                    {unreadCount > 0 && (
                        <Badge className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-xs animate-in zoom-in">
                            {unreadCount}
                        </Badge>
                    )}
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80 sm:w-96">
                <div className="px-4 py-3 border-b flex justify-between items-center bg-muted/30">
                    <div className="flex items-center gap-2">
                        <Bell className="h-4 w-4" />
                        <span className="font-semibold">Powiadomienia</span>
                    </div>
                    {unreadCount > 0 && (
                        <Button
                            variant="ghost"
                            size="sm"
                            className="h-auto px-2 text-xs text-muted-foreground hover:text-primary"
                            onClick={handleMarkAllRead}
                        >
                            Oznacz wszystkie
                        </Button>
                    )}
                </div>

                <div className="max-h-[70vh] overflow-y-auto">
                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                            <RefreshCw className="h-6 w-6 animate-spin mb-2 opacity-50" />
                            <span className="text-xs">Ładowanie...</span>
                        </div>
                    ) : notifications.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                            <Bell className="h-10 w-10 mb-3 opacity-20" />
                            <p className="text-sm">Brak nowych powiadomień</p>
                        </div>
                    ) : (
                        <div className="divide-y">
                            {notifications.map((notif) => (
                                <div
                                    key={notif.id}
                                    className={`relative group flex gap-4 p-4 transition-colors hover:bg-muted/50 ${!notif.read ? 'bg-primary/5' : ''}`}
                                >
                                    <div className={`mt-1 flex-shrink-0 ${!notif.read ? 'animate-pulse' : ''}`}>
                                        {getNotificationIcon(notif.type)}
                                    </div>
                                    <div className="flex-1 min-w-0 space-y-1">
                                        <Link
                                            href={notif.link || '#'}
                                            onClick={() => handleMarkAsRead(notif.id, notif.link)}
                                            className="block focus:outline-none"
                                        >
                                            <p className={`text-sm leading-none ${!notif.read ? 'font-semibold text-foreground' : 'text-muted-foreground'}`}>
                                                {notif.title}
                                            </p>
                                            <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                                                {notif.message}
                                            </p>
                                            <p className="text-xs text-muted-foreground/60 mt-2 flex items-center gap-1">
                                                <Clock className="h-3 w-3" />
                                                {getRelativeTime(notif.created_at)}
                                            </p>
                                        </Link>
                                    </div>
                                    {!notif.read && (
                                        <div className="absolute top-4 right-4">
                                            <div className="h-2 w-2 rounded-full bg-primary ring-2 ring-primary/20" />
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="p-2 border-t bg-muted/30">
                    <Link href="/history">
                        <Button variant="ghost" size="sm" className="w-full text-xs text-muted-foreground">
                            Zobacz pełną historię
                        </Button>
                    </Link>
                </div>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
