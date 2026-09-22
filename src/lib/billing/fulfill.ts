import 'server-only';

import { createAdminClient } from '@/lib/supabase/server';
import { getSubscription, getTransaction, type PaddleTransaction } from '@/lib/paddle/client';
import { issueEntitlementForOrder } from '@/lib/billing/entitlements';
import { applySubscriptionState, stopRenewalsAfterLifetime } from '@/lib/billing/subscriptions';
import { INTERVAL } from '@/lib/billing/checkout';
import { getPaddleConfig } from '@/lib/paddle/config';
import { audit } from '@/lib/audit';
import { log } from '@/lib/logger';

/**
 * Pro is granted ONLY here, server-side, after re-reading the transaction from
 * the Paddle API. Idempotent: safe to call from both the webhook and the
 * checkout status poller, concurrently.
 */

export type FulfillmentResult = 'paid' | 'pending' | 'failed' | 'not_found';

type AdminClient = ReturnType<typeof createAdminClient>;

const DAY_MS = 24 * 60 * 60 * 1000;
const UNIQUE_VIOLATION = '23505';

/** Payment captured — `paid` precedes `completed` by moments. */
const CAPTURED = new Set<PaddleTransaction['status']>(['paid', 'completed']);

export async function fulfillTransaction(
  transactionId: string,
  actor: string,
): Promise<FulfillmentResult> {
  const transaction = await getTransaction(transactionId);
  return transaction.origin === 'subscription_recurring'
    ? fulfillRenewal(transaction, actor)
    : fulfillCheckout(transaction, actor);
}

/** A checkout created in lib/billing/checkout.ts (lifetime or first subscription charge). */
async function fulfillCheckout(
  transaction: PaddleTransaction,
  actor: string,
): Promise<FulfillmentResult> {
  const supabase = createAdminClient();

  // Bound by the transaction id we stored at creation — never by client input.
  const { data: order } = await supabase
    .from('orders')
    .select('id, user_id, plan_id, status, amount_cents, currency, subscription_id')
    .eq('paddle_transaction_id', transaction.id)
    .maybeSingle();
  if (!order) {
    log('warn', 'fulfill: transaction has no matching order', { transactionId: transaction.id });
    return 'not_found';
  }
  if (order.status === 'refunded') return 'failed';

  if (transaction.status === 'canceled') {
    if (order.status === 'paid') return 'paid';
    await supabase.from('orders').update({ status: 'failed' }).eq('id', order.id);
    return 'failed';
  }
  if (!CAPTURED.has(transaction.status)) return 'pending';

  const { data: plan } = await supabase
    .from('plans')
    .select('name, billing_period')
    .eq('id', order.plan_id)
    .single();
  if (!plan) throw new Error(`fulfill: plan ${order.plan_id} missing`);
  const expectedInterval = INTERVAL[plan.billing_period];
  const config = getPaddleConfig();
  const expectedProductId = expectedInterval ? config.proProductId : config.lifetimeProductId;

  // Defence in depth: what Paddle charged must be exactly what we priced.
  const item = transaction.items[0];
  if (
    transaction.items.length !== 1 ||
    item.quantity !== 1 ||
    item.price.product_id !== expectedProductId ||
    item.price.unit_price.amount !== String(order.amount_cents) ||
    item.price.unit_price.currency_code !== order.currency ||
    (item.price.billing_cycle?.interval ?? null) !== expectedInterval ||
    Boolean(order.subscription_id) !== Boolean(expectedInterval) ||
    transaction.custom_data?.order_id !== order.id
  ) {
    log('error', 'fulfill: transaction does not match order', {
      orderId: order.id,
      transactionId: transaction.id,
    });
    await audit('system', 'order.mismatch', 'order', order.id, { transactionId: transaction.id });
    return 'failed';
  }

  // Paddle creates the subscription when the transaction completes.
  if (order.subscription_id && !transaction.subscription_id) return 'pending';

  if (order.status !== 'paid') {
    const { error } = await supabase.from('orders').update({ status: 'paid' }).eq('id', order.id);
    if (error) throw error;
    await audit(actor, 'order.paid', 'order', order.id, { transactionId: transaction.id });
  }
  await recordPayment(supabase, order.id, transaction);

  let expiresAt: string | null = null;
  if (order.subscription_id && transaction.subscription_id) {
    const subscription = await getSubscription(transaction.subscription_id);
    await applySubscriptionState(supabase, order.subscription_id, subscription);
    expiresAt =
      subscription.current_billing_period?.ends_at ??
      new Date(Date.now() + (plan.billing_period === 'monthly' ? 31 : 366) * DAY_MS).toISOString();
  }

  await issueEntitlementForOrder(supabase, {
    orderId: order.id,
    userId: order.user_id,
    planId: order.plan_id,
    planLabel:
      plan.billing_period === 'lifetime'
        ? plan.name
        : `${plan.name} (${plan.billing_period === 'monthly' ? 'Monthly' : 'Yearly'})`,
    expiresAt,
    subscriptionId: order.subscription_id,
    actor,
  });

  // Upgraded to Lifetime: don't keep charging for a subscription they no longer need.
  if (!order.subscription_id) await stopRenewalsAfterLifetime(order.user_id);

  return 'paid';
}

/** A subscription renewal charge: new billing-history row, same entitlement, later expiry. */
async function fulfillRenewal(
  transaction: PaddleTransaction,
  actor: string,
): Promise<FulfillmentResult> {
  if (!CAPTURED.has(transaction.status)) return 'pending';
  if (!transaction.subscription_id) return 'not_found';

  const supabase = createAdminClient();
  const { data: subscriptionRow } = await supabase
    .from('subscriptions')
    .select('id, user_id, plan_id')
    .eq('paddle_subscription_id', transaction.subscription_id)
    .maybeSingle();
  if (!subscriptionRow) {
    log('error', 'fulfill: renewal for unknown subscription', {
      transactionId: transaction.id,
      subscriptionId: transaction.subscription_id,
    });
    return 'not_found';
  }

  // paddle_transaction_id is unique: a retried webhook finds the existing row
  // and carries on, so a crash after this insert can't skip the extension.
  const { data: inserted, error } = await supabase
    .from('orders')
    .insert({
      user_id: subscriptionRow.user_id,
      plan_id: subscriptionRow.plan_id,
      subscription_id: subscriptionRow.id,
      amount_cents: Number(transaction.items[0]?.price.unit_price.amount),
      currency: transaction.currency_code,
      status: 'paid',
      paddle_transaction_id: transaction.id,
    })
    .select('id')
    .single();

  let orderId = inserted?.id;
  if (error) {
    if (error.code !== UNIQUE_VIOLATION) throw error;
    const { data: existing } = await supabase
      .from('orders')
      .select('id')
      .eq('paddle_transaction_id', transaction.id)
      .single();
    orderId = existing?.id;
  } else {
    await audit(actor, 'subscription.charged', 'subscription', subscriptionRow.id, {
      orderId,
      transactionId: transaction.id,
    });
  }
  if (!orderId) throw new Error('fulfill: renewal order missing');
  await recordPayment(supabase, orderId, transaction);

  const subscription = await getSubscription(transaction.subscription_id);
  await applySubscriptionState(supabase, subscriptionRow.id, subscription);

  const { data: entitlement } = await supabase
    .from('entitlements')
    .select('id, status, expires_at')
    .eq('subscription_id', subscriptionRow.id)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();
  if (!entitlement) {
    log('error', 'fulfill: renewal for subscription without an entitlement', {
      subscriptionId: subscriptionRow.id,
    });
    return 'paid';
  }
  // Never resurrect access revoked by a refund or chargeback.
  if (entitlement.status === 'revoked') return 'paid';

  const current = entitlement.expires_at ? new Date(entitlement.expires_at) : null;
  const periodEnd = subscription.current_billing_period?.ends_at;
  const next = periodEnd
    ? new Date(periodEnd)
    : new Date(Math.max(Date.now(), current?.getTime() ?? 0) + 31 * DAY_MS);

  if (!current || next > current) {
    const { error: updateError } = await supabase
      .from('entitlements')
      .update({ expires_at: next.toISOString() })
      .eq('id', entitlement.id);
    if (updateError) throw updateError;
    await audit(actor, 'entitlement.renewed', 'entitlement', entitlement.id, {
      subscriptionId: subscriptionRow.id,
      expiresAt: next.toISOString(),
    });
  }
  return 'paid';
}

async function recordPayment(supabase: AdminClient, orderId: string, transaction: PaddleTransaction) {
  const captured =
    transaction.payments?.find((p) => p.status === 'captured') ?? transaction.payments?.[0];
  const grandTotal = transaction.details?.totals?.grand_total;
  const { error } = await supabase.from('payments').upsert(
    {
      order_id: orderId,
      paddle_transaction_id: transaction.id,
      amount_cents: grandTotal ? Number(grandTotal) : null,
      method: captured?.method_details?.type ?? null,
      status: 'success',
    },
    { onConflict: 'paddle_transaction_id', ignoreDuplicates: true },
  );
  if (error) throw error;
}
