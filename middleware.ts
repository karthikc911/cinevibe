import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

export async function middleware(request: NextRequest) {
  const start = Date.now();
  const { pathname, searchParams } = request.nextUrl;
  
  // Log API requests only (not static assets)
  if (pathname.startsWith('/api/')) {
    const duration = Date.now() - start;
    const query = searchParams.toString() ? `?${searchParams.toString()}` : '';
    
    // Log in terminal format
    console.log(
      `\x1b[36m📘 INFO\x1b[0m \x1b[1m[API]\x1b[0m ${request.method} ${pathname}${query} (${duration}ms)`
    );
  }
  
  // Protected routes - require authentication
  const protectedPaths = [
    '/onboarding',
    '/rate',
    '/my-ratings',
    '/watchlist',
    '/friends',
    '/profile',
  ];
  
  // Public paths - no authentication required
  const publicPaths = ['/login', '/signup'];
  
  // Check if the current path is protected
  const isProtectedPath = protectedPaths.some(path => pathname.startsWith(path));
  const isPublicPath = publicPaths.some(path => pathname.startsWith(path));
  
  // Get the secret - check multiple possible env var names
  const secret = process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET;
  
  // If it's a protected path, check authentication
  if (isProtectedPath) {
    // Also check for session cookie as fallback
    const sessionCookie = request.cookies.get('next-auth.session-token') || 
                          request.cookies.get('__Secure-next-auth.session-token');
    
    let isAuthenticated = false;
    
    // Try JWT token first if we have a secret
    if (secret) {
      try {
        const token = await getToken({ 
          req: request, 
          secret: secret 
        });
        isAuthenticated = !!token;
      } catch (error) {
        console.log('[MIDDLEWARE] getToken error:', error);
      }
    }
    
    // Fallback: check if session cookie exists
    if (!isAuthenticated && sessionCookie) {
      isAuthenticated = true;
    }
    
    // If still not authenticated, redirect to discover
    if (!isAuthenticated) {
      console.log('[MIDDLEWARE] No auth found, redirecting to /discover from', pathname);
      return NextResponse.redirect(new URL('/discover', request.url));
    }
  }
  
  // If user is logged in and tries to access login/signup, redirect to discover
  if (isPublicPath) {
    const sessionCookie = request.cookies.get('next-auth.session-token') || 
                          request.cookies.get('__Secure-next-auth.session-token');
    
    let isAuthenticated = false;
    
    if (secret) {
      try {
        const token = await getToken({ 
          req: request, 
          secret: secret 
        });
        isAuthenticated = !!token;
      } catch (error) {
        // Ignore error
      }
    }
    
    if (!isAuthenticated && sessionCookie) {
      isAuthenticated = true;
    }
    
    if (isAuthenticated) {
      return NextResponse.redirect(new URL('/discover', request.url));
    }
  }
  
  return NextResponse.next();
}

export const config = {
  matcher: [
    '/api/:path*',
    '/onboarding',
    '/rate',
    '/my-ratings',
    '/watchlist',
    '/friends',
    '/profile',
    '/login',
    '/signup',
  ],
};
