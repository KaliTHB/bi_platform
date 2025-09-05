// web-application/middleware.ts - FIXED VERSION
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const token = request.cookies.get('token')?.value || request.headers.get('authorization')?.replace('Bearer ', '');
  const { pathname } = request.nextUrl;

  console.log(`Middleware processing: ${pathname}, hasToken: ${!!token}`);

  // Public routes that don't require authentication
  const publicRoutes = [
    '/login',
    '/register',
    '/forgot-password',
    '/reset-password',
    '/_next',
    '/api',
    '/favicon.ico',
    '/robots.txt',
    '/sitemap.xml',
    '/icons',
    '/images'
  ];

  // Protected routes that require authentication
  const protectedRoutes = [
    '/workspace',
    '/dashboard',
    '/profile',
    '/settings',
    '/admin'
  ];

  // Check if current path is public
  const isPublicRoute = publicRoutes.some(route => {
    return pathname.startsWith(route);
  });

  // Check if current path is protected
  const isProtectedRoute = protectedRoutes.some(route => {
    return pathname.startsWith(route);
  });

  // Handle root path
  if (pathname === '/') {
    console.log('Root path detected, letting index.tsx handle redirect');
    return NextResponse.next();
  }

  // 🔥 FIXED: Only redirect bare /workspace to overview
  if (pathname === '/workspace') {
    console.log('Redirecting bare workspace to overview');
    return NextResponse.redirect(new URL('/workspace/overview', request.url));
  }

  // 🔥 FIXED: Allow all workspace-specific routes to pass through
  // This includes /workspace/[slug]/datasets, /workspace/[slug]/dashboards, etc.
  if (pathname.startsWith('/workspace/')) {
    console.log('Workspace-specific route, allowing access');
    
    // Only redirect if the user doesn't have a token
    if (!token) {
      console.log('Protected workspace route without token, redirecting to login');
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('returnUrl', pathname);
      return NextResponse.redirect(loginUrl);
    }
    
    return NextResponse.next();
  }

  // Allow API routes to pass through without authentication check
  if (pathname.startsWith('/api/')) {
    console.log('API route, passing through');
    return NextResponse.next();
  }
  
  if (pathname.match(/^\/workspace\/[^\/]+\/overview$/)) {
    console.log('Redirecting workspace-specific overview to main overview');
    return NextResponse.redirect(new URL('/workspace/overview', request.url));
  }

  // Allow public routes
  if (isPublicRoute) {
    console.log('Public route, allowing access');
    // If user has token but is on login page, redirect to workspace overview
    if (token && pathname === '/login') {
      console.log('User has token but on login page, redirecting to workspace overview');
      return NextResponse.redirect(new URL('/workspace/overview', request.url));
    }
    return NextResponse.next();
  }

  // Handle protected routes
  if (isProtectedRoute) {
    if (!token) {
      console.log('Protected route without token, redirecting to login');
      const loginUrl = new URL('/login', request.url);
      // Add return URL so we can redirect back after login
      if (pathname !== '/') {
        loginUrl.searchParams.set('returnUrl', pathname);
      }
      return NextResponse.redirect(loginUrl);
    }
    
    console.log('Protected route with token, allowing access');
    return NextResponse.next();
  }

  // Handle potential webview routes (public dashboard access)
  // Pattern: /{webview-name} or /{webview-name}/{dashboard-slug}
  if (pathname.match(/^\/[^\/]+$/) || pathname.match(/^\/[^\/]+\/[^\/]+$/)) {
    console.log('Potential webview route, allowing access');
    return NextResponse.next();
  }

  // Default: allow the request to continue
  console.log('Default case, allowing request');
  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (images, etc.)
     */
    '/((?!_next/static|_next/image|favicon.ico|icons|images|robots.txt|sitemap.xml).*)'
  ]
};