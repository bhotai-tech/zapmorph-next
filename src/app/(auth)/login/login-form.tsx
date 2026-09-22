'use client';

import Link from 'next/link';
import { useActionState } from 'react';
import { login, type AuthState } from '../actions';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input, Label, PasswordInput } from '@/components/ui/input';
import { GoogleButton } from '@/components/auth/google-button';

export function LoginForm({ redirectTo, callbackError }: { redirectTo: string; callbackError: boolean }) {
  const [state, action, pending] = useActionState<AuthState, FormData>(login, null);

  return (
    <div className="mt-8 space-y-6">
      <GoogleButton next={redirectTo} />
      <div className="flex items-center gap-3 text-xs uppercase tracking-wider text-muted">
        <span className="h-px flex-1 bg-border" /> or <span className="h-px flex-1 bg-border" />
      </div>
      <form action={action} className="space-y-4">
        <input type="hidden" name="redirectTo" value={redirectTo} />
        {callbackError && !state && (
          <Alert tone="error">That sign-in link is invalid or has expired. Please try again.</Alert>
        )}
        {state && !state.ok && <Alert tone="error">{state.message}</Alert>}
        <div>
          <Label htmlFor="email">Email</Label>
          <Input id="email" name="email" type="email" autoComplete="email" required />
        </div>
        <div>
          <div className="flex items-center justify-between">
            <Label htmlFor="password">Password</Label>
            <Link href="/forgot-password" className="mb-1.5 py-1 text-sm text-primary hover:underline">
              Forgot password?
            </Link>
          </div>
          <PasswordInput id="password" name="password" autoComplete="current-password" required />
        </div>
        <Button type="submit" size="lg" className="w-full" loading={pending}>
          Log in
        </Button>
      </form>
      <p className="text-center text-sm text-muted">
        New here?{' '}
        <Link href={`/signup?redirectTo=${encodeURIComponent(redirectTo)}`} className="font-medium text-primary hover:underline">
          Create a free account
        </Link>
      </p>
    </div>
  );
}
