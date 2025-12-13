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
    '/watchlist',
    '/friends',
    '/profile',
  ];
  
  // Public paths - no authentication required
  const publicPaths = ['/login', '/signup'];
  
  // Check if the current path is protected
  const isProtectedPath = protectedPaths.some(path => pathname.startsWith(path));
  const isPublicPath = publicPaths.some(path => pathname.startsWith(path));
  
  // If it's a protected path, check authentication
  if (isProtectedPath) {
    const token = await getToken({ 
      req: request, 
      secret: process.env.NEXTAUTH_SECRET 
    });
    
    // If no token, redirect to discover (which will show login/signup)
    if (!token) {
      return NextResponse.redirect(new URL('/discover', request.url));
    }
  }
  
  // If user is logged in and tries to access login/signup, redirect to discover
  if (isPublicPath) {
    const token = await getToken({ 
      req: request, 
      secret: process.env.NEXTAUTH_SECRET 
    });
    
    if (token) {
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
    '/watchlist',
    '/friends',
    '/profile',
    '/login',
    '/signup',
  ],
};
