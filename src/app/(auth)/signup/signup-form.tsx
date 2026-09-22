'use client';

import Link from 'next/link';
import { useActionState } from 'react';
import { signup, type AuthState } from '../actions';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input, Label, PasswordInput } from '@/components/ui/input';
import { GoogleButton } from '@/components/auth/google-button';

export function SignupForm({ redirectTo }: { redirectTo: string }) {
  const [state, action, pending] = useActionState<AuthState, FormData>(signup, null);

  if (state?.ok) {
    return (
      <div className="mt-8">
        <Alert tone="success">{state.message}</Alert>
      </div>
    );
  }

  return (
    <div className="mt-8 space-y-6">
      <GoogleButton next={redirectTo} />
      <div className="flex items-center gap-3 text-xs uppercase tracking-wider text-muted">
        <span className="h-px flex-1 bg-border" /> or <span className="h-px flex-1 bg-border" />
      </div>
      <form action={action} className="space-y-4">
        <input type="hidden" name="redirectTo" value={redirectTo} />
        {state && !state.ok && <Alert tone="error">{state.message}</Alert>}
        <div>
          <Label htmlFor="fullName">Name</Label>
          <Input id="fullName" name="fullName" autoComplete="name" required maxLength={120} />
        </div>
        <div>
          <Label htmlFor="email">Email</Label>
          <Input id="email" name="email" type="email" autoComplete="email" required />
        </div>
        <div>
          <Label htmlFor="password">Password</Label>
          <PasswordInput id="password" name="password" autoComplete="new-password" required minLength={8} />
          <p className="mt-1 text-xs text-muted">At least 8 characters.</p>
        </div>
        <Button type="submit" size="lg" className="w-full" loading={pending}>
          Create account
        </Button>
        <p className="text-xs leading-5 text-muted">
          By signing up you agree to our <Link href="/terms" className="underline">terms</Link> and{' '}
          <Link href="/privacy" className="underline">privacy policy</Link>.
        </p>
      </form>
      <p className="text-center text-sm text-muted">
        Already have an account?{' '}
        <Link href={`/login?redirectTo=${encodeURIComponent(redirectTo)}`} className="font-medium text-primary hover:underline">
          Log in
        </Link>
      </p>
    </div>
  );
}
