import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function updateSession(request: NextRequest) {
    let supabaseResponse = NextResponse.next({
        request,
    });

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return request.cookies.getAll();
                },
                setAll(cookiesToSet) {
                    cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
                    supabaseResponse = NextResponse.next({
                        request,
                    });
                    cookiesToSet.forEach(({ name, value, options }) =>
                        supabaseResponse.cookies.set(name, value, options)
                    );
                },
            },
        }
    );

    // IMPORTANT: Do not use getUser() in middleware without proper error handling
    // This is simplified for MVP - proper auth middleware will be added in Phase 2
    const {
        data: { user },
    } = await supabase.auth.getUser();

    // Protected routes - redirect to login if not authenticated
    const protectedPaths = ['/dashboard', '/invoices', '/debtors', '/sequences', '/settings', '/ai-generator', '/costs'];
    const isProtectedPath = protectedPaths.some(path => request.nextUrl.pathname.startsWith(path));

    if (isProtectedPath && !user) {
        const url = request.nextUrl.clone();
        url.pathname = '/login';
        return NextResponse.redirect(url);
    }

    // SUBSCRIPTION CHECK
    if (user && isProtectedPath && !request.nextUrl.pathname.startsWith('/subscription/expired')) {
        const { data: subscription } = await supabase
            .from('subscriptions')
            .select('status, trial_ends_at')
            .eq('user_id', user.id)
            .single();

        // If subscription row exists, check status
        if (subscription) {
            const now = new Date();
            const isTrialActive = subscription.status === 'trialing' && subscription.trial_ends_at && new Date(subscription.trial_ends_at) > now;
            const isActive = ['active', 'active_non_renewing'].includes(subscription.status || '');

            if (!isActive && !isTrialActive) {
                // EXPIRED
                const url = request.nextUrl.clone();
                url.pathname = '/subscription/expired';
                return NextResponse.redirect(url);
            }
        }
    }

    // SUBSCRIPTION CHECK
    // Only check for authenticated users on protected paths
    // Exclude /subscription/expired itself to avoid loop
    // Exclude /settings to allow user to manage subscription if we put it there
    // For now, strict block: only /subscription/expired is allowed if expired.
    if (user && isProtectedPath && !request.nextUrl.pathname.startsWith('/subscription/expired')) {
        // Query subscription status
        const { data: subscription } = await supabase
            .from('subscriptions')
            .select('status, trial_ends_at')
            .eq('user_id', user.id)
            .single();

        // Logic:
        // 1. If no subscription row -> Assumption: New user or error -> Allow access (or redirect to init?)
        //    (Our migration creates rows, so this shouldn't happen usually. If it does, let them in or they can't pay).

        if (subscription) {
            const now = new Date();
            const isTrialActive = subscription.status === 'trialing' && subscription.trial_ends_at && new Date(subscription.trial_ends_at) > now;
            const isActive = ['active', 'active_non_renewing'].includes(subscription.status || '');

            if (!isActive && !isTrialActive) {
                // EXPIRED
                const url = request.nextUrl.clone();
                url.pathname = '/subscription/expired';
                return NextResponse.redirect(url);
            }
        }
    }

    // Auth pages - redirect to dashboard if already authenticated
    const authPaths = ['/login', '/register', '/forgot-password'];
    const isAuthPath = authPaths.some(path => request.nextUrl.pathname.startsWith(path));

    if (isAuthPath && user) {
        const url = request.nextUrl.clone();
        url.pathname = '/dashboard';
        return NextResponse.redirect(url);
    }

    return supabaseResponse;
}
