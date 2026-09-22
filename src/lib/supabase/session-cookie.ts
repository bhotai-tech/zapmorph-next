// Client-safe: detects whether this project's Supabase session cookie exists.
// A cheap hint so static pages can show "Dashboard" vs "Log in" without a
// server round-trip — never proof of a valid session (the server always verifies).

// @supabase/ssr names the cookie `sb-<project-ref>-auth-token` (chunked as
// `.0`, `.1`… when large). Match THIS project's ref only.
function sessionCookiePattern(): RegExp | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url || !URL.canParse(url)) return null;
  const ref = new URL(url).hostname.split('.')[0];
  return new RegExp(`(?:^|;\\s*)sb-${ref}-auth-token(?:\\.\\d+)?=`);
}

export function hasSessionCookie(): boolean {
  if (typeof document === 'undefined') return false;
  return sessionCookiePattern()?.test(document.cookie) ?? false;
}
