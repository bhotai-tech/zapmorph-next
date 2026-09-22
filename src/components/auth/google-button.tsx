'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';

export function GoogleButton({ next = '/dashboard' }: { next?: string }) {
  const [loading, setLoading] = useState(false);

  async function signIn() {
    setLoading(true);
    try {
      // Loaded on click so the Supabase SDK stays out of the auth page bundle.
      const { createClient } = await import('@/lib/supabase/client');
      const { error } = await createClient().auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
        },
      });
      // A successful call navigates away; only reachable here on failure.
      if (error) setLoading(false);
    } catch {
      setLoading(false);
    }
  }

  return (
    <Button type="button" variant="secondary" size="lg" className="w-full" onClick={signIn} loading={loading}>
      {!loading && (
        <svg aria-hidden width="16" height="16" viewBox="0 0 24 24">
          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1Z" />
          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23Z" />
          <path fill="#FBBC05" d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84Z" />
          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.16-3.16A11 11 0 0 0 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52Z" />
        </svg>
      )}
      {loading ? 'Redirecting…' : 'Continue with Google'}
    </Button>
  );
}
