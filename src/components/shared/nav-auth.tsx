'use client';

import Link from 'next/link';
import { useSyncExternalStore } from 'react';
import { ButtonLink } from '@/components/ui/button';
import { hasSessionCookie } from '@/lib/supabase/session-cookie';

const subscribe = () => () => {};

/**
 * Keeps marketing and converter pages static: the session is detected from
 * the cookie on the client, and the dashboard re-verifies on the server.
 */
export function NavAuth() {
  const signedIn = useSyncExternalStore(subscribe, hasSessionCookie, () => false);

  if (signedIn) {
    return (
      <ButtonLink href="/dashboard" size="sm">
        Dashboard
      </ButtonLink>
    );
  }
  return (
    <div className="flex items-center gap-2">
      <Link
        href="/login"
        className="hidden whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium text-muted transition-colors hover:text-foreground sm:block"
      >
        Log in
      </Link>
      <ButtonLink href="/signup" size="sm" className="whitespace-nowrap">
        Sign up free
      </ButtonLink>
    </div>
  );
}
