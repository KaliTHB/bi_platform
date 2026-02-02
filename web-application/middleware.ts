// web-application/middleware.ts - FIXED FOR CORRECT ROUTE STRUCTURE
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
    '/profile',
    '/settings',
    '/admin'
  ];

  // Reserved slugs that should not be treated as webview names
  const reservedSlugs = [
    'workspace',
    'login',
    'register',
    'forgot-password',
    'reset-password',
    'profile',
    'settings',
    'admin',
    'api',
    '_next',
    'favicon.ico',
    'robots.txt',
    'sitemap.xml',
    'icons',
    'images'
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

  // 🔥 HANDLE WORKSPACE DASHBOARD ROUTES FIRST (more specific)
  // Pattern: /workspace/[dashboard-uuid] (UUID format)
  const workspaceDashboardMatch = pathname.match(/^\/workspace\/([a-f0-9\-]{36})$/i);
  if (workspaceDashboardMatch) {
    console.log('Workspace dashboard route detected');
    
    // Require authentication for workspace dashboard access
    if (!token) {
      console.log('Workspace dashboard route without token, redirecting to login');
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('returnUrl', pathname);
      return NextResponse.redirect(loginUrl);
    }
    
    console.log('Allowing access to workspace dashboard route');
    return NextResponse.next();
  }

  // 🔥 HANDLE OTHER WORKSPACE ROUTES
  // Pattern: /workspace/anything-else (not UUID)
  if (pathname.startsWith('/workspace/')) {
    console.log('Other workspace route detected');
    
    if (!token) {
      console.log('Protected workspace route without token, redirecting to login');
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('returnUrl', pathname);
      return NextResponse.redirect(loginUrl);
    }
    
    return NextResponse.next();
  }

  // Handle bare /workspace redirect
  if (pathname === '/workspace') {
    console.log('Redirecting bare workspace to overview');
    return NextResponse.redirect(new URL('/workspace/overview', request.url));
  }

  // Allow API routes to pass through without authentication check
  if (pathname.startsWith('/api/')) {
    console.log('API route, passing through');
    return NextResponse.next();
  }

  // Allow public routes
  if (isPublicRoute) {
    console.log('Public route, allowing access');
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
      if (pathname !== '/') {
        loginUrl.searchParams.set('returnUrl', pathname);
      }
      return NextResponse.redirect(loginUrl);
    }
    
    console.log('Protected route with token, allowing access');
    return NextResponse.next();
  }

  // 🔥 HANDLE WEBVIEW ROUTES (should come AFTER workspace routes to avoid conflicts)
  // Pattern: /[webview-slug]/[dashboard-uuid]  
  const webviewDashboardMatch = pathname.match(/^\/([^\/]+)\/([a-f0-9\-]{36})$/i);
  if (webviewDashboardMatch) {
    const [, webviewSlug, dashboardUuid] = webviewDashboardMatch;
    
    // Make sure it's not a reserved slug
    if (!reservedSlugs.includes(webviewSlug)) {
      console.log('Webview dashboard route detected:', webviewSlug, dashboardUuid);
      // No authentication required for webview routes (public access)
      return NextResponse.next();
    }
  }

  // Pattern: /[webview-slug] (single level, webview home page)
  const singleWebviewMatch = pathname.match(/^\/([^\/]+)$/);
  if (singleWebviewMatch) {
    const [, webviewSlug] = singleWebviewMatch;
    
    // Make sure it's not a reserved slug
    if (!reservedSlugs.includes(webviewSlug)) {
      console.log('Single webview route detected:', webviewSlug);
      // No authentication required for webview routes (public access)
      return NextResponse.next();
    }
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