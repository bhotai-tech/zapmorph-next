'use client';

import Link from 'next/link';
import { useActionState } from 'react';
import { forgotPassword, type AuthState } from '../actions';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input, Label } from '@/components/ui/input';

export default function ForgotPasswordPage() {
  const [state, action, pending] = useActionState<AuthState, FormData>(forgotPassword, null);

  return (
    <>
      <title>Reset password</title>
      <h1 className="text-2xl font-bold tracking-tight">Reset your password</h1>
      <p className="mt-2 text-sm text-muted">We’ll email you a link to choose a new password.</p>
      <form action={action} className="mt-8 space-y-4">
        {state && <Alert tone={state.ok ? 'success' : 'error'}>{state.message}</Alert>}
        <div>
          <Label htmlFor="email">Email</Label>
          <Input id="email" name="email" type="email" autoComplete="email" required />
        </div>
        <Button type="submit" size="lg" className="w-full" loading={pending}>
          Send reset link
        </Button>
      </form>
      <p className="mt-6 text-center text-sm text-muted">
        <Link href="/login" className="font-medium text-primary hover:underline">
          Back to log in
        </Link>
      </p>
    </>
  );
}
