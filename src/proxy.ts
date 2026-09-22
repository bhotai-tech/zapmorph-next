import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { isSafeRedirectPath } from '@/lib/safe-redirect';

const PROTECTED_PREFIXES = ['/dashboard', '/checkout'];
const AUTH_ONLY_PREFIXES = ['/login', '/signup', '/forgot-password'];

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // Refreshes the session cookie and verifies the JWT. Pages and actions
  // still re-verify with getUser().
  const { data } = await supabase.auth.getClaims();
  const signedIn = Boolean(data?.claims?.sub);

  const path = request.nextUrl.pathname;

  if (PROTECTED_PREFIXES.some((p) => path.startsWith(p)) && !signedIn) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.search = '';
    url.searchParams.set('redirectTo', path + request.nextUrl.search);
    return NextResponse.redirect(url);
  }

  if (AUTH_ONLY_PREFIXES.some((p) => path.startsWith(p)) && signedIn) {
    const redirectTo = request.nextUrl.searchParams.get('redirectTo');
    const target = isSafeRedirectPath(redirectTo) ? redirectTo : '/dashboard';
    return NextResponse.redirect(new URL(target, request.url));
  }

  return response;
}

export const config = {
  // Only routes that read the session. Marketing and converter pages are
  // static and skip proxy entirely.
  matcher: [
    '/dashboard/:path*',
    '/checkout/:path*',
    '/login',
    '/signup',
    '/forgot-password',
    '/reset-password',
    // The usage API reads the session; refresh expiring tokens on the way in.
    '/api/usage',
  ],
};
