import 'server-only';

import { createAdminClient } from '@/lib/supabase/server';
import { getPaddleConfig } from '@/lib/paddle/config';
import {
  createTransaction,
  findOrCreateCustomer,
  getTransaction,
  type BillingInterval,
} from '@/lib/paddle/client';
import { paddleCustomerIdFor } from '@/lib/billing/subscriptions';
import { audit } from '@/lib/audit';
import type { BillingPeriod } from '@/types/database';

type AdminClient = ReturnType<typeof createAdminClient>;

export type PurchaseBlocker = 'already_subscribed' | 'already_lifetime';

export class CheckoutError extends Error {
  constructor(readonly code: 'invalid_plan' | PurchaseBlocker) {
    super(`checkout: ${code}`);
    this.name = 'CheckoutError';
  }
}

const UNIQUE_VIOLATION = '23505';

/** How long a started-but-unpaid checkout is resumed rather than recreated. */
const RESUME_WINDOW_MS = 30 * 60 * 1000;

export const INTERVAL: Record<BillingPeriod, BillingInterval | null> = {
  monthly: 'month',
  yearly: 'year',
  lifetime: null,
};

/**
 * Starts a Paddle checkout. The price comes from the `plans` table; the browser
 * only ever receives a transaction id. Monthly/yearly plans also get a
 * local subscription row that Paddle's subscription is linked to once the
 * first charge completes.
 */
export async function startCheckout(params: {
  userId: string;
  email: string;
  planId: string;
}): Promise<{ orderId: string; transactionId: string }> {
  const config = getPaddleConfig(); // fail before any DB writes if unconfigured
  const supabase = createAdminClient();

  const { data: plan } = await supabase
    .from('plans')
    .select('id, price_cents, currency, billing_period')
    .eq('id', params.planId)
    .eq('is_active', true)
    .maybeSingle();
  if (!plan) throw new CheckoutError('invalid_plan');
  const interval = INTERVAL[plan.billing_period];
  const productId = interval ? config.proProductId : config.lifetimeProductId;

  const blocker = await getPurchaseBlocker(params.userId, plan.billing_period, supabase);
  if (blocker) throw new CheckoutError(blocker);

  const customerId = await ensurePaddleCustomer(supabase, params.userId, params.email);

  let subscriptionId: string | null = null;
  if (interval) {
    const { data: subscription, error } = await supabase
      .from('subscriptions')
      .insert({ user_id: params.userId, plan_id: plan.id, status: 'initialized' })
      .select('id')
      .single();
    if (error) throw error;
    subscriptionId = subscription.id;
  }

  const { data: order, error: orderError } = await supabase
    .from('orders')
    .insert({
      user_id: params.userId,
      plan_id: plan.id,
      amount_cents: plan.price_cents,
      currency: plan.currency,
      status: 'created',
      subscription_id: subscriptionId,
    })
    .select('id')
    .single();
  if (orderError) throw orderError;

  let transactionId: string;
  try {
    const transaction = await createTransaction({
      customerId,
      productId,
      priceName: plan.billing_period === 'lifetime' ? 'Lifetime license' : `Pro (${plan.billing_period})`,
      description: `app plan ${plan.id}`,
      amountCents: plan.price_cents,
      currency: plan.currency,
      interval,
      customData: {
        user_id: params.userId,
        order_id: order.id,
        plan_id: plan.id,
        ...(subscriptionId ? { subscription_id: subscriptionId } : {}),
      },
    });
    transactionId = transaction.id;
  } catch (err) {
    await supabase.from('orders').update({ status: 'failed' }).eq('id', order.id);
    if (subscriptionId) {
      await supabase.from('subscriptions').update({ status: 'failed' }).eq('id', subscriptionId);
    }
    throw err;
  }

  const { error: linkError } = await supabase
    .from('orders')
    .update({ paddle_transaction_id: transactionId, status: 'pending' })
    .eq('id', order.id);
  if (linkError) throw linkError;

  await audit(params.userId, 'order.created', 'order', order.id, { planId: plan.id, transactionId });
  return { orderId: order.id, transactionId };
}

/**
 * The checkout page starts payment on load, so a refresh would otherwise mint
 * a new transaction every time. Resume a recent unpaid checkout for the same
 * plan while it's still open in Paddle and still priced correctly.
 */
export async function findResumableCheckout(
  userId: string,
  planId: string,
): Promise<{ orderId: string; transactionId: string } | null> {
  const supabase = createAdminClient();
  const [{ data: plan }, { data: order }] = await Promise.all([
    supabase
      .from('plans')
      .select('price_cents, billing_period')
      .eq('id', planId)
      .eq('is_active', true)
      .maybeSingle(),
    supabase
      .from('orders')
      .select('id, paddle_transaction_id, amount_cents')
      .eq('user_id', userId)
      .eq('plan_id', planId)
      .eq('status', 'pending')
      .not('paddle_transaction_id', 'is', null)
      .gte('created_at', new Date(Date.now() - RESUME_WINDOW_MS).toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);
  if (!plan || !order?.paddle_transaction_id || order.amount_cents !== plan.price_cents) return null;
  if (await getPurchaseBlocker(userId, plan.billing_period, supabase)) return null;

  try {
    const transaction = await getTransaction(order.paddle_transaction_id);
    if (transaction.status !== 'draft' && transaction.status !== 'ready') return null;
  } catch {
    return null;
  }
  return { orderId: order.id, transactionId: order.paddle_transaction_id };
}

/**
 * Guards against accidental double purchases: nothing to buy once you own
 * Lifetime, and one live subscription per account. Buying Lifetime while
 * subscribed is allowed — fulfillment stops the subscription from renewing.
 */
export async function getPurchaseBlocker(
  userId: string,
  period: BillingPeriod,
  supabase: AdminClient = createAdminClient(),
): Promise<PurchaseBlocker | null> {
  const { count: lifetime } = await supabase
    .from('entitlements')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('status', 'active')
    .is('expires_at', null);
  if (lifetime) return 'already_lifetime';

  if (period === 'lifetime') return null;

  const { count: live } = await supabase
    .from('subscriptions')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .in('status', ['active', 'past_due', 'paused']);
  return live ? 'already_subscribed' : null;
}

async function ensurePaddleCustomer(supabase: AdminClient, userId: string, email: string) {
  const existing = await paddleCustomerIdFor(supabase, userId);
  if (existing) return existing;

  const customerId = await findOrCreateCustomer(email);
  const { error } = await supabase
    .from('billing_customers')
    .insert({ user_id: userId, paddle_customer_id: customerId });
  if (error) {
    if (error.code !== UNIQUE_VIOLATION) throw error;
    // Lost a race for this user — or this Paddle customer already belongs to
    // another account, which must never be shared.
    const winner = await paddleCustomerIdFor(supabase, userId);
    if (winner) return winner;
    throw new Error('checkout: Paddle customer is linked to a different account');
  }
  return customerId;
}
