'use server';

import { headers } from 'next/headers';
import { contactSchema } from '@/schemas';
import { contactLimiter } from '@/lib/rate-limit';
import { sendContactNotification } from '@/lib/email/send';
import { siteConfig } from '@/config/site';

/** `values` echoes the input on failure: React 19 resets the form after every action, which would wipe the visitor's message. */
export type ContactState = {
  ok: boolean;
  message: string;
  values?: { email: string; message: string };
} | null;

const SUCCESS = 'Thanks! We’ve received your message and will reply by email.';

const text = (value: FormDataEntryValue | null, max: number) =>
  typeof value === 'string' ? value.slice(0, max) : '';

export async function submitContact(_prev: ContactState, formData: FormData): Promise<ContactState> {
  // Honeypot: a person never sees this field. Pretend it worked so bots learn nothing.
  if (formData.get('hp')) return { ok: true, message: SUCCESS };

  const values = { email: text(formData.get('email'), 254), message: text(formData.get('message'), 5_000) };

  const hdrs = await headers();
  const ip = hdrs.get('x-forwarded-for')?.split(',')[0]?.trim() ?? '127.0.0.1';
  const { success } = await contactLimiter.limit(ip);
  if (!success) {
    return { ok: false, message: 'Too many messages from this connection. Please try again in an hour.', values };
  }

  const parsed = contactSchema.safeParse(values);
  if (!parsed.success) {
    return {
      ok: false,
      message: parsed.error.issues[0]?.message ?? 'Please check your details and try again.',
      values,
    };
  }

  const delivered = await sendContactNotification(parsed.data.email, parsed.data.message);
  if (!delivered) {
    return {
      ok: false,
      message: `We couldn’t send your message right now. Please email ${siteConfig.supportEmail} directly.`,
      values,
    };
  }
  return { ok: true, message: SUCCESS };
}
