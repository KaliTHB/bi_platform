// middleware.ts - FIXED VERSION WITH PROPER WEBVIEW/WORKSPACE ACCESS CONTROL
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

  // Check if current path is public
  const isPublicRoute = publicRoutes.some(route => {
    return pathname.startsWith(route);
  });

  // Handle root path
  if (pathname === '/') {
    console.log('Root path detected, letting index.tsx handle redirect');
    return NextResponse.next();
  }

  // FIXED: Only redirect bare /workspace to overview
  if (pathname === '/workspace') {
    console.log('Redirecting bare workspace to overview');
    return NextResponse.redirect(new URL('/workspace/overview', request.url));
  }

  // Allow API routes to pass through without authentication check
  if (pathname.startsWith('/api/')) {
    console.log('API route, passing through');
    return NextResponse.next();
  }

  // FIXED: Handle workspace dashboard routes (ALWAYS PROTECTED)
  // Pattern: /workspace/{dashboard-uuid}
  const workspaceDashboardMatch = pathname.match(/^\/workspace\/([a-f0-9\-]{36})$/i);
  if (workspaceDashboardMatch) {
    const [, dashboardUuid] = workspaceDashboardMatch;
    console.log(`Workspace dashboard route detected: ${dashboardUuid}`);
    
    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(dashboardUuid)) {
      console.log('Invalid dashboard UUID format, returning 404');
      return NextResponse.redirect(new URL('/404', request.url));
    }

    // Workspace dashboard routes are ALWAYS PROTECTED
    if (!token) {
      console.log('Protected workspace dashboard route without token, redirecting to login');
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('returnUrl', pathname);
      return NextResponse.redirect(loginUrl);
    }
    
    console.log('Valid workspace dashboard route with token, allowing access');
    return NextResponse.next();
  }

  // FIXED: Handle other workspace routes (ALWAYS PROTECTED)
  if (pathname.startsWith('/workspace/') && !pathname.match(/^\/workspace\/[a-f0-9\-]{36}$/i)) {
    console.log('General workspace route, checking authentication');
    
    // All workspace routes require authentication
    if (!token) {
      console.log('Protected workspace route without token, redirecting to login');
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('returnUrl', pathname);
      return NextResponse.redirect(loginUrl);
    }
    
    console.log('Workspace route with token, allowing access');
    return NextResponse.next();
  }

  // FIXED: Handle webview dashboard routes (CAN BE PUBLIC OR PROTECTED)
  // Pattern: /{webview-slug}/{dashboard-uuid}
  const webviewDashboardMatch = pathname.match(/^\/([^\/]+)\/([a-f0-9\-]{36})$/i);
  if (webviewDashboardMatch) {
    const [, webviewSlug, dashboardUuid] = webviewDashboardMatch;
    console.log(`Webview dashboard route detected: ${webviewSlug}/${dashboardUuid}`);
    
    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(dashboardUuid)) {
      console.log('Invalid dashboard UUID format, returning 404');
      return NextResponse.redirect(new URL('/404', request.url));
    }
    
    // IMPORTANT: Webview dashboard access control is handled at the component level
    // Some webviews are public, some require authentication
    // The component will check webview permissions and redirect if needed
    console.log('Valid webview dashboard route, allowing access - auth will be handled by component');
    return NextResponse.next();
  }

  // Allow public routes
  if (isPublicRoute) {
    console.log('Public route, allowing access');
    // If user has token but is on login page, check where to redirect
    if (token && pathname === '/login') {
      // Check if there's a returnUrl to go back to
      const returnUrl = request.nextUrl.searchParams.get('returnUrl');
      if (returnUrl) {
        console.log(`User has token, redirecting to returnUrl: ${returnUrl}`);
        return NextResponse.redirect(new URL(returnUrl, request.url));
      } else {
        console.log('User has token but no returnUrl, redirecting to workspace overview');
        return NextResponse.redirect(new URL('/workspace/overview', request.url));
      }
    }
    return NextResponse.next();
  }

  // FIXED: Handle webview homepage routes (CAN BE PUBLIC OR PROTECTED)
  // Pattern: /{webview-slug} (single segment, no UUID)
  if (pathname.match(/^\/([^\/]+)$/) && !pathname.match(/^\/[a-f0-9\-]{36}$/i)) {
    const webviewSlug = pathname.substring(1); // Remove leading slash
    console.log(`Webview homepage route detected: ${webviewSlug}`);
    
    // IMPORTANT: Webview access control is handled at the component level
    // Some webviews are public, some require authentication
    // The component will check webview permissions and redirect if needed
    console.log('Webview homepage route, allowing access - auth will be handled by component');
    return NextResponse.next();
  }

  // Handle any other protected routes (admin, profile, settings, etc.)
  const otherProtectedRoutes = ['/profile', '/settings', '/admin'];
  const isOtherProtectedRoute = otherProtectedRoutes.some(route => pathname.startsWith(route));
  
  if (isOtherProtectedRoute) {
    if (!token) {
      console.log('Other protected route without token, redirecting to login');
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('returnUrl', pathname);
      return NextResponse.redirect(loginUrl);
    }
    
    console.log('Other protected route with token, allowing access');
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