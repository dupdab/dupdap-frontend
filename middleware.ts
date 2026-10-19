import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const AUTH_COOKIE_NAMES = ['token', 'auth_token', 'access_token'];

function hasAuthToken(request: NextRequest): boolean {
  for (const name of AUTH_COOKIE_NAMES) {
    const value = request.cookies.get(name)?.value;
    if (value && value.trim().length > 0) {
      return true;
    }
  }

  const authorization = request.headers.get('authorization');
  if (authorization && authorization.trim().length > 0) {
    return true;
  }

  return false;
}

export function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  if (pathname === '/dashboard' || pathname.startsWith('/dashboard/')) {
    if (!hasAuthToken(request)) {
      const loginUrl = new URL('/auth/login', request.url);
      loginUrl.searchParams.set('redirect', `${pathname}${search}`);
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard', '/dashboard/:path*'],
};
