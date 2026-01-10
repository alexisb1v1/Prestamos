import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function proxy(request: NextRequest) {
    // Get the token from cookies
    const token = request.cookies.get('auth_token')?.value;

    // Define public paths that don't require authentication
    const publicPaths = ['/login', '/favicon.ico'];
    const isPublicPath = publicPaths.some(path => request.nextUrl.pathname.startsWith(path)) ||
        request.nextUrl.pathname.startsWith('/_next');

    // If user is on a public path but has a token, consider redirecting to dashboard
    if (token && request.nextUrl.pathname === '/login') {
        return NextResponse.redirect(new URL('/dashboard', request.url));
    }

    // If user is not logged in and tries to access a protected route
    if (!token && !isPublicPath) {
        return NextResponse.redirect(new URL('/login', request.url));
    }

    return NextResponse.next();
}

export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - api (API routes)
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         */
        '/((?!api|_next/static|_next/image|favicon.ico).*)',
    ],
};
