import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { createAdminClient, getCurrentUser } from '@/lib/supabase/server';
import { Navbar } from '@/components/shared/navbar';
import { Footer } from '@/components/shared/footer';
import { Card } from '@/components/ui/card';
import { ButtonLink } from '@/components/ui/button';
import { findPlan } from '@/lib/plans';
import { getPurchaseBlocker } from '@/lib/billing/checkout';
import { paddleCustomerIdFor } from '@/lib/billing/subscriptions';
import { getPaddleConfig, isPaddleConfigured } from '@/lib/paddle/config';
import { InlineCheckout } from './inline-checkout';
import { OrderSummary } from './order-summary';

export const metadata: Metadata = { title: 'Checkout', robots: { index: false } };

export default async function CheckoutPage(props: PageProps<'/checkout'>) {
  // Proxy guards this route; re-verify (defence in depth).
  const { supabase, user } = await getCurrentUser();
  if (!user) redirect('/login?redirectTo=/pricing');

  const { plan: planParam } = await props.searchParams;
  const display = typeof planParam === 'string' ? findPlan(planParam) : null;
  if (!display) redirect('/pricing');

  // The price shown is the DB row the checkout API will charge, not the
  // static display catalog. RLS hides inactive plans.
  const [{ data: plan }, blocker, customerId] = await Promise.all([
    supabase.from('plans').select('price_cents').eq('id', display.id).maybeSingle(),
    getPurchaseBlocker(user.id, display.period),
    paddleCustomerIdFor(createAdminClient(), user.id),
  ]);
  if (!plan) redirect('/pricing');

  const paddle = isPaddleConfigured() ? getPaddleConfig() : null;
  const summary = { planName: display.name, period: display.period, priceUsd: plan.price_cents / 100 } as const;

  return (
    <>
      <Navbar />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 sm:px-6 sm:py-10 lg:py-14">
        <Link
          href="/pricing"
          className="inline-flex items-center gap-1.5 py-2 text-sm text-muted transition-colors hover:text-foreground"
        >
          <ArrowLeft aria-hidden className="h-4 w-4" />
          Back to pricing
        </Link>
        <h1 className="mt-4 text-3xl font-bold tracking-tight">Checkout</h1>

        {!blocker && paddle ? (
          <InlineCheckout
            planId={display.id}
            clientToken={paddle.clientToken}
            environment={paddle.environment}
            customerId={customerId}
            {...summary}
          />
        ) : (
          <div className="mt-8 grid items-start gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] lg:gap-8">
            <OrderSummary {...summary} totals={null} />
            <Card className="p-6 text-center sm:p-8">
              {blocker ? (
                <>
                  <h2 className="text-lg font-semibold">
                    {blocker === 'already_lifetime'
                      ? 'You already have Lifetime Pro'
                      : 'You already have an active Pro subscription'}
                  </h2>
                  <p className="mt-2 text-sm text-muted">
                    {blocker === 'already_lifetime'
                      ? 'Every Pro feature is unlocked on your account forever — nothing more to buy.'
                      : 'Manage renewal, payment method and invoices from Billing. You can still upgrade to Lifetime.'}
                  </p>
                  <div className="mt-6 flex flex-wrap justify-center gap-3">
                    <ButtonLink href="/dashboard/billing">Manage billing</ButtonLink>
                    {blocker === 'already_subscribed' && (
                      <ButtonLink href="/checkout?plan=pro-lifetime" variant="secondary">
                        Upgrade to Lifetime
                      </ButtonLink>
                    )}
                  </div>
                </>
              ) : (
                <p role="status" className="text-sm text-muted">
                  Checkout is temporarily unavailable. Please try again shortly.
                </p>
              )}
            </Card>
          </div>
        )}
      </main>
      <Footer />
    </>
  );
}
