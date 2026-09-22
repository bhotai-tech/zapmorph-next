'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createAdminClient, createClient } from '@/lib/supabase/server';
import { uuidSchema } from '@/schemas';
import {
  cancelAllSubscriptionsNow,
  cancelAutoRenew,
  getBillingPortalUrl,
} from '@/lib/billing/subscriptions';
import { apiLimiter } from '@/lib/rate-limit';
import { isProd } from '@/config/env';
import { audit } from '@/lib/audit';
import { log } from '@/lib/logger';

export type ActionState = { ok: boolean; message: string } | null;

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user };
}

export async function cancelSubscription(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const { supabase, user } = await requireUser();
  if (!user) return { ok: false, message: 'Not signed in.' };

  const parsed = uuidSchema.safeParse(formData.get('subscriptionId'));
  if (!parsed.success) return { ok: false, message: 'Invalid request.' };

  // Ownership check via RLS-scoped select (no IDOR); cancelAutoRenew re-checks user_id.
  const { data: subscription } = await supabase
    .from('subscriptions')
    .select('id')
    .eq('id', parsed.data)
    .maybeSingle();
  if (!subscription) return { ok: false, message: 'Subscription not found.' };

  let result: Awaited<ReturnType<typeof cancelAutoRenew>>;
  try {
    result = await cancelAutoRenew(subscription.id, user.id);
  } catch (err) {
    log('error', 'billing: cancel auto-renew failed', { subscriptionId: subscription.id, error: String(err) });
    return { ok: false, message: 'Could not cancel right now. Try again or contact support.' };
  }
  if (!result.ok) {
    return {
      ok: false,
      message:
        result.reason === 'not_cancellable'
          ? 'Auto-renewal is already off for this subscription.'
          : 'Subscription not found.',
    };
  }

  revalidatePath('/dashboard', 'layout');
  const until = result.cancelAt
    ? new Date(result.cancelAt).toLocaleDateString('en-US', { dateStyle: 'medium', timeZone: 'UTC' })
    : null;
  return {
    ok: true,
    message: until
      ? `Auto-renewal cancelled. You keep Pro until ${until}.`
      : 'Auto-renewal cancelled. You keep Pro until the end of your billing period.',
  };
}

const PORTAL_HOST = /(^|\.)paddle\.com$/;

/** Sends the customer to Paddle's portal to update their card or get invoices. */
export async function openBillingPortal(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const { user } = await requireUser();
  if (!user) return { ok: false, message: 'Not signed in.' };

  const { success } = await apiLimiter.limit(`portal:${user.id}`);
  if (!success) return { ok: false, message: 'Too many requests — try again shortly.' };

  let target: Parameters<typeof getBillingPortalUrl>[1] = { kind: 'overview' };
  if (formData.get('target') === 'payment_method') {
    const parsed = uuidSchema.safeParse(formData.get('subscriptionId'));
    if (!parsed.success) return { ok: false, message: 'Invalid request.' };
    target = { kind: 'payment_method', subscriptionId: parsed.data };
  }

  let url: string | null;
  try {
    url = await getBillingPortalUrl(user.id, target);
  } catch (err) {
    log('error', 'billing: portal session failed', { error: String(err) });
    return { ok: false, message: 'Billing portal is unavailable right now. Try again shortly.' };
  }
  if (!url) return { ok: false, message: 'No billing account found yet.' };

  // Only ever redirect to Paddle (a local mock API is allowed outside production).
  const parsedUrl = URL.canParse(url) ? new URL(url) : null;
  if (!parsedUrl || (isProd && (parsedUrl.protocol !== 'https:' || !PORTAL_HOST.test(parsedUrl.hostname)))) {
    log('error', 'billing: unexpected portal url', { host: parsedUrl?.hostname });
    return { ok: false, message: 'Billing portal is unavailable right now.' };
  }
  redirect(url);
}

export async function deleteAccount(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const { supabase, user } = await requireUser();
  if (!user) return { ok: false, message: 'Not signed in.' };
  if (formData.get('confirm') !== 'DELETE') {
    return { ok: false, message: 'Type DELETE to confirm.' };
  }

  await audit(user.id, 'account.delete_requested', 'profile', user.id);

  // Never leave a card being charged for a deleted account.
  if (!(await cancelAllSubscriptionsNow(user.id))) {
    return {
      ok: false,
      message: 'We couldn’t cancel your subscription automatically. Contact support to delete your account.',
    };
  }

  const { error } = await createAdminClient().auth.admin.deleteUser(user.id);
  if (error) return { ok: false, message: 'Could not delete account. Contact support.' };

  await supabase.auth.signOut();
  redirect('/');
}
