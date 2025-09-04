import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const token = request.cookies.get('token')?.value;
  const { pathname } = request.nextUrl;

  // Protected routes that require authentication
  const protectedRoutes = [
    '/workspace/:path*',
    '/dashboard/:path*',
    '/profile',
    '/settings'
  ];

  // Public routes that don't require authentication
  const publicRoutes = [
    '/login',
    '/register',
    '/forgot-password'
  ];

  // Check if current path is protected
  const isProtectedRoute = protectedRoutes.some(route => {
    const regex = new RegExp(`^${route.replace(':path*', '.*')}$`);
    return regex.test(pathname);
  });

  // Redirect to login if accessing protected route without token
  if (isProtectedRoute && !token) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Redirect to default workspace if accessing login while authenticated
  if (publicRoutes.includes(pathname) && token) {
    // In a real app, you'd decode the token to get user's default workspace
    return NextResponse.redirect(new URL('/workspace/default/overview', request.url));
  }

  // Handle workspace root redirect
  if (pathname.match(/^\/workspace\/[^\/]+$/)) {
    return NextResponse.redirect(new URL(`${pathname}/overview`, request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico).*)'
  ]
};
