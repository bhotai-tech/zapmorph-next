import 'server-only';

import { createAdminClient } from '@/lib/supabase/server';
import {
  cancelSubscription,
  createPortalSession,
  getSubscription,
  type PaddleSubscription,
} from '@/lib/paddle/client';
import { revokeEntitlement } from '@/lib/billing/entitlements';
import { sendPaymentFailedEmail } from '@/lib/email/send';
import { audit } from '@/lib/audit';
import { log } from '@/lib/logger';
import { uuidSchema } from '@/schemas';
import type { SubscriptionStatus } from '@/types/database';

/**
 * Subscription lifecycle + refunds. Every state write starts from a fresh
 * Paddle API read, never from a webhook payload, so retried or out-of-order
 * deliveries can't apply stale state.
 *
 * Access policy: cancelling or lapsing a subscription never removes Pro early —
 * the entitlement's expires_at (end of the paid period) ends access. Only an
 * approved full refund or a chargeback revokes immediately.
 */

type AdminClient = ReturnType<typeof createAdminClient>;

const STATUS_MAP: Record<PaddleSubscription['status'], SubscriptionStatus> = {
  active: 'active',
  trialing: 'active',
  past_due: 'past_due',
  paused: 'paused',
  canceled: 'cancelled',
};

/** Copies Paddle's current subscription state onto our row. */
export async function applySubscriptionState(
  supabase: AdminClient,
  localId: string,
  subscription: PaddleSubscription,
): Promise<void> {
  const { data: before } = await supabase
    .from('subscriptions')
    .select('status, user_id')
    .eq('id', localId)
    .single();

  const status = STATUS_MAP[subscription.status];
  const cancelAt =
    subscription.scheduled_change?.action === 'cancel'
      ? subscription.scheduled_change.effective_at
      : subscription.status === 'canceled'
        ? (subscription.canceled_at ?? new Date().toISOString())
        : null;

  const { error } = await supabase
    .from('subscriptions')
    .update({
      paddle_subscription_id: subscription.id,
      status,
      next_charge_at: subscription.next_billed_at,
      cancel_at: cancelAt,
      // Paddle clears the billing period once canceled; keep the last known end.
      ...(subscription.current_billing_period
        ? { current_period_ends_at: subscription.current_billing_period.ends_at }
        : {}),
    })
    .eq('id', localId);
  if (error) throw error;

  if (before && before.status !== status) {
    await audit('webhook', 'subscription.status_changed', 'subscription', localId, {
      from: before.status,
      to: status,
    });
    if (status === 'past_due') {
      const { data: userData, error: userError } = await supabase.auth.admin.getUserById(before.user_id);
      if (userError || !userData?.user?.email) {
        log('error', 'subscriptions: could not resolve email for payment-failed notice', {
          subscriptionId: localId,
          error: userError ? String(userError) : undefined,
        });
      } else {
        await sendPaymentFailedEmail(userData.user.email);
      }
    }
  }
}

/** subscription.* webhooks: find our row and sync it. */
export async function syncSubscription(paddleSubscriptionId: string): Promise<'synced' | 'not_found'> {
  const supabase = createAdminClient();
  const subscription = await getSubscription(paddleSubscriptionId);

  const { data: linked } = await supabase
    .from('subscriptions')
    .select('id')
    .eq('paddle_subscription_id', subscription.id)
    .maybeSingle();
  let localId = linked?.id;

  // subscription.created can beat transaction.completed: link via the custom
  // data attached at checkout, but only to an unlinked row owned by this
  // Paddle customer.
  if (!localId) {
    const hinted = uuidSchema.safeParse(subscription.custom_data?.subscription_id);
    if (hinted.success) {
      const { data: row } = await supabase
        .from('subscriptions')
        .select('id, user_id')
        .eq('id', hinted.data)
        .is('paddle_subscription_id', null)
        .maybeSingle();
      if (row && (await paddleCustomerIdFor(supabase, row.user_id)) === subscription.customer_id) {
        localId = row.id;
      }
    }
  }

  if (!localId) {
    log('warn', 'billing: subscription not linked to any account', { paddleSubscriptionId });
    return 'not_found';
  }
  await applySubscriptionState(supabase, localId, subscription);
  return 'synced';
}

/** Customer cancels auto-renewal: Pro stays until the paid period ends. */
export async function cancelAutoRenew(
  localId: string,
  userId: string,
): Promise<{ ok: true; cancelAt: string | null } | { ok: false; reason: 'not_found' | 'not_cancellable' }> {
  const supabase = createAdminClient();
  const { data: row } = await supabase
    .from('subscriptions')
    .select('id, status, paddle_subscription_id, cancel_at')
    .eq('id', localId)
    .eq('user_id', userId)
    .maybeSingle();
  if (!row?.paddle_subscription_id) return { ok: false, reason: 'not_found' };
  if (row.cancel_at || (row.status !== 'active' && row.status !== 'past_due')) {
    return { ok: false, reason: 'not_cancellable' };
  }

  const subscription = await cancelSubscription(row.paddle_subscription_id, 'next_billing_period');
  await applySubscriptionState(supabase, row.id, subscription);
  const cancelAt = subscription.scheduled_change?.effective_at ?? subscription.canceled_at ?? null;
  await audit(userId, 'subscription.cancel_scheduled', 'subscription', row.id, { cancelAt });
  return { ok: true, cancelAt };
}

/**
 * After a Lifetime purchase, schedule any running subscription to end at its
 * period end. Best effort: a failure is logged, never fails fulfillment (the
 * customer already has Pro; support can cancel manually).
 */
export async function stopRenewalsAfterLifetime(userId: string): Promise<void> {
  const supabase = createAdminClient();
  const { data: rows } = await supabase
    .from('subscriptions')
    .select('id')
    .eq('user_id', userId)
    .not('paddle_subscription_id', 'is', null)
    .is('cancel_at', null)
    .in('status', ['active', 'past_due']);

  for (const row of rows ?? []) {
    try {
      const result = await cancelAutoRenew(row.id, userId);
      if (result.ok) {
        await audit('system', 'subscription.cancelled_for_lifetime', 'subscription', row.id);
      }
    } catch (err) {
      log('error', 'billing: could not stop renewal after lifetime purchase', {
        subscriptionId: row.id,
        error: String(err),
      });
    }
  }
}

/**
 * Account deletion must not leave a card being charged for a deleted account:
 * cancel every live subscription immediately first. Returns false if any
 * cancellation couldn't be confirmed — the caller must abort the deletion.
 */
export async function cancelAllSubscriptionsNow(userId: string): Promise<boolean> {
  const supabase = createAdminClient();
  const { data: rows } = await supabase
    .from('subscriptions')
    .select('id, paddle_subscription_id')
    .eq('user_id', userId)
    .not('paddle_subscription_id', 'is', null)
    .in('status', ['active', 'past_due', 'paused']);

  for (const row of rows ?? []) {
    try {
      await cancelImmediately(supabase, row.id, row.paddle_subscription_id!);
      await audit(userId, 'subscription.cancelled', 'subscription', row.id, { reason: 'account_deletion' });
    } catch (err) {
      log('error', 'billing: cancel on account deletion failed', { subscriptionId: row.id, error: String(err) });
      return false;
    }
  }
  return true;
}

async function cancelImmediately(supabase: AdminClient, localId: string, paddleSubscriptionId: string) {
  try {
    await applySubscriptionState(
      supabase,
      localId,
      await cancelSubscription(paddleSubscriptionId, 'immediately'),
    );
  } catch (err) {
    // Already canceled on Paddle's side (e.g. via their dashboard) is success.
    const current = await getSubscription(paddleSubscriptionId);
    if (current.status !== 'canceled') throw err;
    await applySubscriptionState(supabase, localId, current);
  }
}

export type AdjustmentEvent = {
  id: string;
  action: string;
  type: string;
  status: string;
  transaction_id: string;
};

/**
 * adjustment.created/updated webhooks. An approved FULL refund or a chargeback
 * marks the order refunded, cancels its subscription immediately (so the
 * customer isn't billed again) and revokes Pro. Partial refunds and credits
 * are only audited.
 */
export async function handleAdjustment(adjustment: AdjustmentEvent): Promise<void> {
  const supabase = createAdminClient();
  const revokes =
    adjustment.status === 'approved' &&
    ((adjustment.action === 'refund' && adjustment.type === 'full') ||
      adjustment.action === 'chargeback');

  if (!revokes) {
    if (adjustment.status === 'approved') {
      await audit('webhook', `adjustment.${adjustment.action}`, 'transaction', adjustment.transaction_id, {
        adjustmentId: adjustment.id,
        type: adjustment.type,
      });
    }
    return;
  }

  const { data: order } = await supabase
    .from('orders')
    .select('id, status, subscription_id')
    .eq('paddle_transaction_id', adjustment.transaction_id)
    .maybeSingle();
  if (!order) {
    log('warn', 'billing: adjustment for unknown transaction', { transactionId: adjustment.transaction_id });
    return;
  }

  if (order.status !== 'refunded') {
    await supabase.from('orders').update({ status: 'refunded' }).eq('id', order.id);
    await supabase
      .from('payments')
      .update({ status: 'refunded' })
      .eq('paddle_transaction_id', adjustment.transaction_id);
    await audit('webhook', 'order.refunded', 'order', order.id, {
      adjustmentId: adjustment.id,
      action: adjustment.action,
    });
  }

  const reason = adjustment.action === 'chargeback' ? 'chargeback' : 'refund';
  if (order.subscription_id) {
    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('id, status, paddle_subscription_id')
      .eq('id', order.subscription_id)
      .single();
    if (subscription?.paddle_subscription_id && subscription.status !== 'cancelled') {
      await cancelImmediately(supabase, subscription.id, subscription.paddle_subscription_id);
    }
    const { data: entitlements } = await supabase
      .from('entitlements')
      .select('id')
      .eq('subscription_id', order.subscription_id);
    for (const entitlement of entitlements ?? []) {
      await revokeEntitlement(supabase, entitlement.id, { actor: 'webhook', reason });
    }
  } else {
    const { data: entitlement } = await supabase
      .from('entitlements')
      .select('id')
      .eq('order_id', order.id)
      .maybeSingle();
    if (entitlement) await revokeEntitlement(supabase, entitlement.id, { actor: 'webhook', reason });
  }
}

/**
 * One-time link into Paddle's customer portal. `payment_method` deep-links to
 * updating the card on a specific subscription; `overview` lists invoices and
 * subscriptions. Returns null when the user has never checked out.
 */
export async function getBillingPortalUrl(
  userId: string,
  target: { kind: 'overview' } | { kind: 'payment_method'; subscriptionId: string },
): Promise<string | null> {
  const supabase = createAdminClient();
  const customerId = await paddleCustomerIdFor(supabase, userId);
  if (!customerId) return null;

  if (target.kind === 'overview') {
    return (await createPortalSession(customerId, [])).general.overview;
  }

  const { data: row } = await supabase
    .from('subscriptions')
    .select('paddle_subscription_id')
    .eq('id', target.subscriptionId)
    .eq('user_id', userId)
    .maybeSingle();
  if (!row?.paddle_subscription_id) return null;

  const urls = await createPortalSession(customerId, [row.paddle_subscription_id]);
  return (
    urls.subscriptions.find((s) => s.id === row.paddle_subscription_id)
      ?.update_subscription_payment_method ?? urls.general.overview
  );
}

export async function paddleCustomerIdFor(supabase: AdminClient, userId: string) {
  const { data } = await supabase
    .from('billing_customers')
    .select('paddle_customer_id')
    .eq('user_id', userId)
    .maybeSingle();
  return data?.paddle_customer_id ?? null;
}
