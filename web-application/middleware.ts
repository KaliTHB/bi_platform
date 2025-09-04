// web-application/middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// web-application/middleware.ts
export function middleware(request: NextRequest) {
  const token = request.cookies.get('token')?.value;
  const { pathname } = request.nextUrl;

  // Protected routes that require authentication
  const protectedRoutes = [
    '/workspace/:path*',  // Still protect workspace routes
    '/dashboard/:path*',
    '/profile',
    '/settings'
  ];

  // ... existing middleware logic ...

  // Redirect workspace-specific overview to main overview
  if (pathname.match(/^\/workspace\/[^\/]+\/overview$/)) {
    return NextResponse.redirect(new URL('/workspace/overview', request.url));
  }

  // Redirect workspace root to overview
  if (pathname.match(/^\/workspace\/[^\/]+$/)) {
    return NextResponse.redirect(new URL('/workspace/overview', request.url));
  }

  // Redirect bare /workspace to overview
  if (pathname === '/workspace') {
    return NextResponse.redirect(new URL('/workspace/overview', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico).*)'
  ]
};