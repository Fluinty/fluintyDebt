'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTheme } from 'next-themes';
import {
    Bell,
    Menu,
    Search,
    Plus,
    X,
    LogOut,
    Settings,
    User,
    Sun,
    Moon,
    Mail,
    AlertTriangle,
    CheckCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { createClient } from '@/lib/supabase/client';
import type { User as SupabaseUser } from '@supabase/supabase-js';
import type { Profile } from '@/types';
import { NotificationsDropdown } from './notifications-dropdown';

interface HeaderProps {
    user: SupabaseUser;
    profile: Profile | null;
}

export function Header({ user, profile }: HeaderProps) {
    const router = useRouter();
    const { theme, setTheme } = useTheme();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

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
        <header className="sticky top-0 z-40 bg-background border-b">
            <div className="flex items-center justify-between h-16 px-6">
                {/* Mobile menu button */}
                <Button
                    variant="ghost"
                    size="icon"
                    className="lg:hidden"
                    onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                >
                    {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
                </Button>

                {/* Mobile logo */}
                <Link href="/dashboard" className="lg:hidden flex items-center gap-2">
                    <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                        <span className="text-primary-foreground font-bold text-sm">V</span>
                    </div>
                </Link>

                {/* Search */}
                <div className="hidden md:flex flex-1 max-w-md">
                    <div className="relative w-full">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            type="search"
                            placeholder="Szukaj faktur, kontrahentów..."
                            className="pl-10 w-full"
                        />
                    </div>
                </div>

                {/* Right side */}
                <div className="flex items-center gap-2">
                    {/* Quick add button */}
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button size="sm" className="hidden sm:flex">
                                <Plus className="h-4 w-4 mr-1" />
                                Dodaj
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuItem asChild>
                                <Link href="/invoices/new">Nowa faktura</Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem asChild>
                                <Link href="/debtors/new">Nowy kontrahent</Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem asChild>
                                <Link href="/sequences/new">Nowa sekwencja</Link>
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>

                    {/* Dark mode toggle */}
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                    >
                        <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                        <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
                        <span className="sr-only">Zmień motyw</span>
                    </Button>

                    {/* Notifications dropdown */}
                    <NotificationsDropdown />

                    {/* User menu (desktop) */}
                    <div className="hidden lg:block">
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon">
                                    <Avatar className="h-8 w-8">
                                        <AvatarFallback className="bg-primary/10 text-primary text-xs">
                                            {getInitials(profile?.full_name, user.email || '')}
                                        </AvatarFallback>
                                    </Avatar>
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-56">
                                <div className="px-2 py-1.5">
                                    <p className="text-sm font-medium">{profile?.full_name || user.email}</p>
                                    <p className="text-xs text-muted-foreground">{profile?.company_name}</p>
                                </div>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem asChild>
                                    <Link href="/settings">
                                        <User className="mr-2 h-4 w-4" />
                                        Profil
                                    </Link>
                                </DropdownMenuItem>
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
            </div>

            {/* Mobile menu */}
            {isMobileMenuOpen && (
                <div className="lg:hidden border-t py-4 px-6">
                    <nav className="space-y-2">
                        <Link
                            href="/dashboard"
                            className="block py-2 text-sm font-medium"
                            onClick={() => setIsMobileMenuOpen(false)}
                        >
                            Dashboard
                        </Link>
                        <Link
                            href="/invoices"
                            className="block py-2 text-sm font-medium"
                            onClick={() => setIsMobileMenuOpen(false)}
                        >
                            Należności
                        </Link>
                        <Link
                            href="/debtors"
                            className="block py-2 text-sm font-medium"
                            onClick={() => setIsMobileMenuOpen(false)}
                        >
                            Kontrahenci
                        </Link>
                        <Link
                            href="/sequences"
                            className="block py-2 text-sm font-medium"
                            onClick={() => setIsMobileMenuOpen(false)}
                        >
                            Sekwencje
                        </Link>
                        <Link
                            href="/ai-generator"
                            className="block py-2 text-sm font-medium"
                            onClick={() => setIsMobileMenuOpen(false)}
                        >
                            Generator AI
                        </Link>
                        <Link
                            href="/settings"
                            className="block py-2 text-sm font-medium"
                            onClick={() => setIsMobileMenuOpen(false)}
                        >
                            Ustawienia
                        </Link>
                        <div className="pt-4 border-t mt-4">
                            <Button
                                variant="ghost"
                                className="w-full justify-start text-red-600"
                                onClick={handleLogout}
                            >
                                <LogOut className="mr-2 h-4 w-4" />
                                Wyloguj się
                            </Button>
                        </div>
                    </nav>
                </div>
            )}
        </header>
    );
}
