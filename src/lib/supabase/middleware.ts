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
    const protectedPaths = ['/dashboard', '/invoices', '/debtors', '/sequences', '/settings', '/ai-generator'];
    const isProtectedPath = protectedPaths.some(path => request.nextUrl.pathname.startsWith(path));

    if (isProtectedPath && !user) {
        const url = request.nextUrl.clone();
        url.pathname = '/login';
        return NextResponse.redirect(url);
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
