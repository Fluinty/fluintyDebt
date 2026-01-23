'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
    LayoutDashboard,
    FileText,
    Users,
    GitBranch,
    Sparkles,
    Settings,
    ChevronDown,
    LogOut,
    Calendar,
    BarChart3,
    History,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import type { User } from '@supabase/supabase-js';
import type { Profile } from '@/types';

interface SidebarProps {
    user: User;
    profile: Profile | null;
}

const navigation = [
    {
        name: 'Dashboard',
        href: '/dashboard',
        icon: LayoutDashboard,
    },
    {
        name: 'Należności',
        href: '/invoices',
        icon: FileText,
        children: [
            { name: 'Wszystkie', href: '/invoices' },
            { name: 'Import', href: '/invoices/import' },
        ],
    },
    {
        name: 'Kontrahenci',
        href: '/debtors',
        icon: Users,
    },
    {
        name: 'Sekwencje',
        href: '/sequences',
        icon: GitBranch,
    },
    {
        name: 'Harmonogram',
        href: '/scheduler',
        icon: Calendar,
    },
    {
        name: 'Generator AI',
        href: '/ai-generator',
        icon: Sparkles,
    },
    {
        name: 'Raporty',
        href: '/reports',
        icon: BarChart3,
    },
    {
        name: 'Historia',
        href: '/history',
        icon: History,
    },
    {
        name: 'Ustawienia',
        href: '/settings',
        icon: Settings,
    },
];

export function Sidebar({ user, profile }: SidebarProps) {
    const pathname = usePathname();
    const router = useRouter();

    const handleLogout = async () => {
        const supabase = createClient();
        await supabase.auth.signOut();
        router.push('/login');
        router.refresh();
    };

    const getInitials = (name: string | null | undefined, email: string) => {
        if (name) {
            return name
                .split(' ')
                .map((n) => n[0])
                .join('')
                .toUpperCase()
                .slice(0, 2);
        }
        return email.slice(0, 2).toUpperCase();
    };

    return (
        <aside className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-64 lg:flex-col">
            <div className="flex flex-col flex-grow bg-card border-r overflow-y-auto">
                {/* Logo */}
                <div className="flex items-center h-16 px-6 border-b">
                    <Link href="/dashboard" className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                            <span className="text-primary-foreground font-bold text-sm">V</span>
                        </div>
                        <span className="font-semibold text-lg">FluintyDebt</span>
                    </Link>
                </div>

                {/* Navigation */}
                <nav className="flex-1 px-4 py-4 space-y-1">
                    {navigation.map((item) => {
                        const isActive = pathname === item.href || pathname.startsWith(item.href + '/');

                        if (item.children) {
                            return (
                                <div key={item.name}>
                                    <Link
                                        href={item.href}
                                        className={cn(
                                            'flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg transition-colors',
                                            isActive
                                                ? 'bg-primary/10 text-primary'
                                                : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                                        )}
                                    >
                                        <item.icon className="h-5 w-5" />
                                        {item.name}
                                    </Link>
                                    <div className="ml-8 mt-1 space-y-1">
                                        {item.children.map((child) => (
                                            <Link
                                                key={child.href}
                                                href={child.href}
                                                className={cn(
                                                    'block px-3 py-1.5 text-sm rounded-md transition-colors',
                                                    pathname === child.href
                                                        ? 'text-primary font-medium'
                                                        : 'text-muted-foreground hover:text-foreground'
                                                )}
                                            >
                                                {child.name}
                                            </Link>
                                        ))}
                                    </div>
                                </div>
                            );
                        }

                        return (
                            <Link
                                key={item.name}
                                href={item.href}
                                className={cn(
                                    'flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg transition-colors',
                                    isActive
                                        ? 'bg-primary/10 text-primary'
                                        : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                                )}
                            >
                                <item.icon className="h-5 w-5" />
                                {item.name}
                            </Link>
                        );
                    })}
                </nav>

                {/* User Menu */}
                <div className="border-t p-4">
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="w-full justify-start gap-3 h-auto py-2">
                                <Avatar className="h-8 w-8">
                                    <AvatarFallback className="bg-primary/10 text-primary text-xs">
                                        {getInitials(profile?.full_name, user.email || '')}
                                    </AvatarFallback>
                                </Avatar>
                                <div className="flex-1 text-left">
                                    <p className="text-sm font-medium truncate">
                                        {profile?.full_name || user.email}
                                    </p>
                                    <p className="text-xs text-muted-foreground truncate">
                                        {profile?.company_name}
                                    </p>
                                </div>
                                <ChevronDown className="h-4 w-4 text-muted-foreground" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-56">
                            <DropdownMenuItem asChild>
                                <Link href="/settings">
                                    <Settings className="mr-2 h-4 w-4" />
                                    Ustawienia
                                </Link>
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={handleLogout} className="text-red-600">
                                <LogOut className="mr-2 h-4 w-4" />
                                Wyloguj się
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </div>
        </aside>
    );
}
