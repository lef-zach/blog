import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Public paths that don't require authentication
  const publicPaths = ['/', '/login', '/register', '/blog', '/papers', '/about', '/s', '/api/health', '/api/proxy'];

  // Check if the path is public
  const isPublicPath = publicPaths.some(path => {
    if (path === '/') {
      return pathname === path;
    }
    return pathname.startsWith(path);
  });

  if (isPublicPath) {
    // If user is authenticated and trying to access login/register, redirect to admin
    if ((pathname === '/login' || pathname === '/register') && request.cookies.get('accessToken')) {
      return NextResponse.redirect(new URL('/admin', request.url));
    }
    return NextResponse.next();
  }

  // Protected paths require authentication
  const accessToken = request.cookies.get('accessToken');

  if (!accessToken) {
    // Redirect to login with return URL
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
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
    '/((?!api|_next/static|_next/image|favicon.ico|.*\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
