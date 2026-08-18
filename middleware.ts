import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import NextAuth from 'next-auth';
import { authConfig } from './auth.config';

const { auth } = NextAuth(authConfig);

export default auth((req: NextRequest & { auth: any }) => {
  const { pathname } = req.nextUrl;

  // Protect the internal portal routes
  if (pathname.startsWith('/portal') || pathname.startsWith('/dashboard')) {
    if (!req.auth) {
      const loginUrl = new URL('/login', req.url);
      loginUrl.searchParams.set('callbackUrl', req.url);
      return NextResponse.redirect(loginUrl);
    }
  }

  // Handle external share preview routes
  if (pathname.startsWith('/preview/')) {
    const parts = pathname.replace(/^\/preview\//, '').split('/');
    const slug = parts[0];
    const subPath = parts.slice(1).join('/');

    if (slug) {
      const hasAuth = req.cookies.get(`share-auth-${slug}`);

      if (hasAuth) {
        // Authenticated: internally rewrite to the proxy route handler to serve content at /preview URL
        const proxyUrl = new URL(`/api/proxy/${slug}${subPath ? `/${subPath}` : ''}`, req.url);
        return NextResponse.rewrite(proxyUrl);
      } else {
        // Not authenticated: if subpath exists (e.g. /preview/slug/title), rewrite to base /preview/slug auth form
        if (subPath) {
          const authPageUrl = new URL(`/preview/${slug}`, req.url);
          return NextResponse.rewrite(authPageUrl);
        }
      }
    }
  }

  return NextResponse.next();
});

export const config = {
  // Match all routes except static files, images, and the auth api itself
  matcher: ['/((?!api/auth|_next/static|_next/image|favicon.ico).*)'],
};
