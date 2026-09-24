'use client';

import { useActionState } from 'react';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input, Label, Textarea } from '@/components/ui/input';
import { submitContact, type ContactState } from './actions';

export function ContactForm() {
  const [state, action, pending] = useActionState<ContactState, FormData>(submitContact, null);

  if (state?.ok) {
    return <Alert tone="success">{state.message}</Alert>;
  }

  return (
    <form action={action} className="space-y-5">
      <div>
        <Label htmlFor="contact-email">Your email</Label>
        <Input
          id="contact-email"
          name="email"
          type="email"
          required
          autoComplete="email"
          maxLength={254}
          defaultValue={state?.values?.email}
        />
      </div>
      <div>
        <Label htmlFor="contact-message">How can we help?</Label>
        <Textarea
          id="contact-message"
          name="message"
          rows={6}
          required
          minLength={10}
          maxLength={5000}
          defaultValue={state?.values?.message}
        />
      </div>
      {/* Honeypot — invisible to people and assistive tech, bots fill it in. */}
      <input type="text" name="hp" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden="true" />
      {state && !state.ok && <Alert tone="error">{state.message}</Alert>}
      <Button type="submit" loading={pending}>
        {pending ? 'Sending…' : 'Send message'}
      </Button>
    </form>
  );
}
