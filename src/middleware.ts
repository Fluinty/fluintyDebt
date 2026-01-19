import { type NextRequest, NextResponse } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';

// DEV MODE: Set to false for production
const DEV_MODE_BYPASS_AUTH = false;

export async function middleware(request: NextRequest) {
    // In dev mode, skip all auth checks
    if (DEV_MODE_BYPASS_AUTH) {
        return NextResponse.next();
    }

    // Production: use real Supabase session
    return await updateSession(request);
}

export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         * - public folder
         */
        '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
    ],
};
