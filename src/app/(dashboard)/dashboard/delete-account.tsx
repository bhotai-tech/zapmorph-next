'use client';

import { useActionState, useState } from 'react';
import { deleteAccount, type ActionState } from './actions';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input, Label } from '@/components/ui/input';

export function DeleteAccount() {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState<ActionState, FormData>(deleteAccount, null);

  return (
    <section className="rounded-2xl border border-red-200 p-6 dark:border-red-900">
      <h2 className="font-semibold">Delete account</h2>
      <p className="mt-1 text-sm text-muted">
        Permanently deletes your account and cancels any active subscription immediately. This can’t be undone.
      </p>
      {open ? (
        <form action={action} className="mt-4 max-w-sm space-y-3">
          {state && !state.ok && <Alert tone="error">{state.message}</Alert>}
          <div>
            <Label htmlFor="confirm">Type DELETE to confirm</Label>
            <Input id="confirm" name="confirm" autoComplete="off" required />
          </div>
          <div className="flex gap-3">
            <Button type="submit" variant="danger" loading={pending}>
              Delete my account
            </Button>
            <Button type="button" variant="secondary" onClick={() => setOpen(false)} disabled={pending}>
              Cancel
            </Button>
          </div>
        </form>
      ) : (
        <Button variant="secondary" className="mt-4" onClick={() => setOpen(true)}>
          Delete account…
        </Button>
      )}
    </section>
  );
}
