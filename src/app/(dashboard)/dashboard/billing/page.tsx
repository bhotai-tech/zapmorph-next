import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { Sparkles } from 'lucide-react';
import { getCurrentUser } from '@/lib/supabase/server';
import { PLANS, findPlan, periodLabel } from '@/lib/plans';
import { Badge, Card } from '@/components/ui/card';
import { ButtonLink } from '@/components/ui/button';
import { BillingPortalButton, CancelSubscriptionButton } from './subscription-controls';
import type { OrderStatus, SubscriptionStatus } from '@/types/database';

export const metadata: Metadata = { title: 'Billing', robots: { index: false } };

function formatDate(iso: string | null) {
  return iso ? new Date(iso).toLocaleDateString('en-US', { dateStyle: 'medium', timeZone: 'UTC' }) : '—';
}

function formatMoney(cents: number, currency: string) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(cents / 100);
}

const SUBSCRIPTION_TONE: Record<SubscriptionStatus, 'success' | 'warning' | 'danger' | 'default'> = {
  active: 'success',
  past_due: 'warning',
  paused: 'warning',
  cancelled: 'default',
  initialized: 'default',
  failed: 'danger',
};

const ORDER_TONE: Record<OrderStatus, 'success' | 'warning' | 'danger' | 'default'> = {
  paid: 'success',
  pending: 'warning',
  created: 'default',
  failed: 'danger',
  refunded: 'default',
};

/** Cancelled subscriptions stay listed until the paid period they cover has ended. */
function stillCoversPaidPeriod(subscription: {
  status: SubscriptionStatus;
  current_period_ends_at: string | null;
}): boolean {
  return (
    subscription.status !== 'cancelled' ||
    (subscription.current_period_ends_at !== null &&
      new Date(subscription.current_period_ends_at).getTime() > Date.now())
  );
}

export default async function BillingPage() {
  const { supabase, user } = await getCurrentUser();
  if (!user) redirect('/login');

  // RLS scopes every query to the signed-in user.
  const [{ data: subscriptions }, { data: orders }, { data: lifetime }] = await Promise.all([
    supabase
      .from('subscriptions')
      .select('id, plan_id, status, next_charge_at, current_period_ends_at, cancel_at')
      .in('status', ['active', 'past_due', 'paused', 'cancelled'])
      .order('created_at', { ascending: false }),
    supabase
      .from('orders')
      .select('id, plan_id, amount_cents, currency, status, created_at')
      .in('status', ['paid', 'refunded'])
      .order('created_at', { ascending: false })
      .limit(50),
    supabase
      .from('entitlements')
      .select('id, created_at')
      .eq('status', 'active')
      .is('expires_at', null)
      .limit(1)
      .maybeSingle(),
  ]);

  const visibleSubscriptions = (subscriptions ?? []).filter(stillCoversPaidPeriod);
  const hasBillingHistory = (orders ?? []).length > 0;

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold tracking-tight">Billing</h1>

      {lifetime && (
        <Card className="flex flex-wrap items-center gap-4">
          <Sparkles aria-hidden className="h-6 w-6 text-amber-500" />
          <div className="flex-1">
            <h2 className="font-semibold">Lifetime Pro</h2>
            <p className="text-sm text-muted">Purchased {formatDate(lifetime.created_at)} · no renewals, ever.</p>
          </div>
        </Card>
      )}

      {visibleSubscriptions.map((subscription) => {
        const plan = findPlan(subscription.plan_id);
        const renewing = subscription.status === 'active' && !subscription.cancel_at;
        return (
          <Card key={subscription.id}>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="font-semibold">
                    Pro — {plan ? periodLabel[plan.period].replace('per ', '') + 'ly' : 'subscription'}
                  </h2>
                  <Badge tone={SUBSCRIPTION_TONE[subscription.status]}>
                    {subscription.status === 'past_due' ? 'Payment failed' : subscription.status}
                  </Badge>
                </div>
                <p className="mt-1 text-sm text-muted">
                  {renewing
                    ? `Renews on ${formatDate(subscription.next_charge_at)}`
                    : subscription.cancel_at
                      ? `Auto-renewal off · Pro until ${formatDate(subscription.cancel_at)}`
                      : subscription.status === 'past_due'
                        ? 'Paddle is retrying your payment. Update your card to keep Pro.'
                        : `Ends ${formatDate(subscription.current_period_ends_at)}`}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {(subscription.status === 'active' || subscription.status === 'past_due') && (
                  <BillingPortalButton
                    target="payment_method"
                    subscriptionId={subscription.id}
                    label="Update payment method"
                  />
                )}
              </div>
            </div>
            {renewing && (
              <div className="mt-4 border-t border-border pt-4">
                <CancelSubscriptionButton subscriptionId={subscription.id} />
              </div>
            )}
          </Card>
        );
      })}

      {!lifetime && visibleSubscriptions.length === 0 && (
        <Card className="text-center">
          <h2 className="font-semibold">You’re on the Free plan</h2>
          <p className="mt-1 text-sm text-muted">
            Upgrade for unlimited conversions, 1 GB files and audio & video tools — from{' '}
            {`$${PLANS['pro-yearly'].usd / 12}`}/month.
          </p>
          <ButtonLink href="/pricing" className="mt-5">
            See plans
          </ButtonLink>
        </Card>
      )}

      {hasBillingHistory && (
        <section>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-semibold">Billing history</h2>
            <BillingPortalButton target="overview" label="Invoices & receipts" />
          </div>
          <div className="mt-4 overflow-x-auto rounded-2xl border border-border bg-surface">
            <table className="w-full min-w-[480px] text-sm">
              <thead>
                <tr className="border-b border-border text-left text-muted">
                  <th scope="col" className="px-5 py-3 font-medium">Date</th>
                  <th scope="col" className="px-5 py-3 font-medium">Plan</th>
                  <th scope="col" className="px-5 py-3 font-medium">Amount</th>
                  <th scope="col" className="px-5 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {(orders ?? []).map((order) => {
                  const plan = findPlan(order.plan_id);
                  return (
                    <tr key={order.id}>
                      <td className="px-5 py-3">{formatDate(order.created_at)}</td>
                      <td className="px-5 py-3">
                        {plan ? `${plan.name} (${plan.period})` : order.plan_id}
                      </td>
                      <td className="px-5 py-3 tabular-nums">{formatMoney(order.amount_cents, order.currency)}</td>
                      <td className="px-5 py-3">
                        <Badge tone={ORDER_TONE[order.status]}>{order.status}</Badge>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-xs text-muted">
            Amounts exclude tax. Paddle, our Merchant of Record, issues invoices and receipts.
          </p>
        </section>
      )}
    </div>
  );
}
