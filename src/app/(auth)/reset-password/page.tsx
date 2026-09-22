'use client';

import { useActionState } from 'react';
import { resetPassword, type AuthState } from '../actions';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Label, PasswordInput } from '@/components/ui/input';

export default function ResetPasswordPage() {
  const [state, action, pending] = useActionState<AuthState, FormData>(resetPassword, null);

  return (
    <>
      <title>Choose a new password</title>
      <h1 className="text-2xl font-bold tracking-tight">Choose a new password</h1>
      <form action={action} className="mt-8 space-y-4">
        {state && !state.ok && <Alert tone="error">{state.message}</Alert>}
        <div>
          <Label htmlFor="password">New password</Label>
          <PasswordInput id="password" name="password" autoComplete="new-password" required minLength={8} />
        </div>
        <Button type="submit" size="lg" className="w-full" loading={pending}>
          Update password
        </Button>
      </form>
    </>
  );
}
