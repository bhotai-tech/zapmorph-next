'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlertCircle, Lock } from 'lucide-react';
import {
  initializePaddle,
  type CheckoutEventsData,
  type Environments,
  type PaddleEventData,
} from '@paddle/paddle-js';
import { Button, ButtonLink } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import type { BillingPeriod } from '@/lib/plans';
import { OrderSummary, type LiveTotals } from './order-summary';

/** Paddle mounts its iframe into the element with this class name. */
const FRAME_CLASS = 'paddle-checkout-frame';
const LOAD_TIMEOUT_MS = 25_000;

const ERROR_MESSAGES: Record<string, string> = {
  rate_limited: 'Too many checkout attempts — please wait a few minutes and try again.',
  already_subscribed: 'You already have an active Pro subscription — manage it from Billing.',
  already_lifetime: 'You already have Lifetime Pro — nothing more to buy.',
  payments_unavailable: 'Payments are temporarily unavailable. Please try again shortly.',
  invalid_plan: 'This plan is no longer available.',
  paddle_blocked: 'Secure checkout couldn’t load. Disable any ad blocker for this site and try again.',
};
const GENERIC_ERROR = 'We couldn’t start checkout. Please try again.';

type Phase = 'starting' | 'ready' | 'completing' | 'error';

function toTotals(data: CheckoutEventsData): LiveTotals {
  return {
    currency: data.currency_code,
    subtotal: data.totals.subtotal,
    tax: data.totals.tax,
    total: data.totals.total,
    recurringTotal: data.recurring_totals?.total ?? null,
  };
}

/**
 * Branded inline checkout: our order summary beside Paddle's embedded payment
 * frame. The transaction is created server-side (price from our DB); a page
 * refresh resumes the same transaction instead of creating another.
 */
export function InlineCheckout({
  planId,
  clientToken,
  environment,
  customerId,
  planName,
  period,
  priceUsd,
}: {
  planId: string;
  clientToken: string;
  environment: Environments;
  customerId: string | null;
  planName: string;
  period: BillingPeriod;
  priceUsd: number;
}) {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>('starting');
  const [error, setError] = useState<string | null>(null);
  const [totals, setTotals] = useState<LiveTotals | null>(null);
  const started = useRef(false);
  const statusUrl = useRef<string | null>(null);

  // Paddle keeps the first eventCallback for the page's lifetime; route events
  // through a ref so they always reach the current render's state setters.
  const onEvent = useRef<(event: PaddleEventData) => void>(() => {});
  useEffect(() => {
    onEvent.current = (event) => {
      if (
        event.data &&
        (event.name === 'checkout.loaded' ||
          event.name === 'checkout.updated' ||
          event.name === 'checkout.customer.updated' ||
          event.name === 'checkout.items.updated')
      ) {
        setTotals(toTotals(event.data));
      }
      if (event.name === 'checkout.loaded') setPhase('ready');
      if (event.name === 'checkout.completed' && statusUrl.current) {
        setPhase('completing');
        router.push(statusUrl.current);
      }
      if (event.name === 'checkout.error' || event.name === 'checkout.failed') {
        setError(GENERIC_ERROR);
        setPhase('error');
      }
    };
  });

  useEffect(() => {
    // Run once, even under React Strict Mode's double-invoked effects in dev.
    if (started.current) return;
    started.current = true;

    const timeout = setTimeout(() => {
      setPhase((current) => {
        if (current !== 'starting') return current;
        setError(ERROR_MESSAGES.paddle_blocked);
        return 'error';
      });
    }, LOAD_TIMEOUT_MS);

    (async () => {
      try {
        const [paddle, res] = await Promise.all([
          initializePaddle({
            environment,
            token: clientToken,
            pwCustomer: customerId ? { id: customerId } : undefined,
            eventCallback: (event) => onEvent.current(event),
          }).catch(() => undefined),
          fetch('/api/checkout/transaction', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ planId }),
          }),
        ]);

        if (res.status === 401) {
          router.push(`/login?redirectTo=${encodeURIComponent(`/checkout?plan=${planId}`)}`);
          return;
        }
        const body = (await res.json().catch(() => ({}))) as {
          error?: string;
          orderId?: string;
          transactionId?: string;
        };
        if (!res.ok || !body.orderId || !body.transactionId) {
          throw new Error(body.error ?? 'unknown');
        }
        if (!paddle) throw new Error('paddle_blocked');

        statusUrl.current = `/checkout/status/${body.orderId}`;
        paddle.Checkout.open({
          transactionId: body.transactionId,
          settings: {
            displayMode: 'inline',
            variant: 'one-page',
            frameTarget: FRAME_CLASS,
            frameInitialHeight: 450,
            frameStyle: 'width: 100%; min-width: 280px; background-color: transparent; border: none;',
            theme: window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light',
            allowLogout: false,
            showAddDiscounts: false,
          },
        });
      } catch (err) {
        const code = err instanceof Error ? err.message : '';
        setError(ERROR_MESSAGES[code] ?? GENERIC_ERROR);
        setPhase('error');
      } finally {
        clearTimeout(timeout);
      }
    })();
  }, [planId, clientToken, environment, customerId, router]);

  return (
    <div className="mt-8 grid items-start gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] lg:gap-8">
      <div className="lg:sticky lg:top-24">
        <OrderSummary planName={planName} period={period} priceUsd={priceUsd} totals={totals} />
      </div>

      <Card className="p-6 sm:p-8">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-lg font-semibold">Payment details</h2>
          <span className="flex items-center gap-1.5 text-xs text-muted">
            <Lock aria-hidden className="h-3.5 w-3.5" />
            Secure checkout
          </span>
        </div>

        {phase === 'error' ? (
          <div role="alert" className="mt-8 rounded-xl border border-border p-6 text-center">
            <AlertCircle aria-hidden className="mx-auto h-10 w-10 text-red-500" />
            <p className="mt-3 text-sm">{error}</p>
            <div className="mt-5 flex flex-wrap justify-center gap-3">
              <Button onClick={() => window.location.reload()}>Try again</Button>
              <ButtonLink href="/pricing" variant="secondary">
                Back to pricing
              </ButtonLink>
            </div>
          </div>
        ) : (
          <div className="relative mt-6 min-h-[450px]">
            {phase !== 'ready' && (
              <div aria-hidden className="absolute inset-0 space-y-5">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="space-y-2">
                    <div className="h-3 w-24 animate-pulse rounded bg-border" />
                    <div className="h-11 w-full animate-pulse rounded-lg bg-border/60" />
                  </div>
                ))}
                <div className="h-12 w-full animate-pulse rounded-lg bg-border/60" />
              </div>
            )}
            <p className="sr-only" role="status">
              {phase === 'starting' ? 'Loading secure checkout…' : phase === 'completing' ? 'Confirming your payment…' : ''}
            </p>
            <div className={FRAME_CLASS} />
          </div>
        )}

        {phase === 'error' && (
          <p className="mt-6 border-t border-border pt-4 text-center text-xs leading-5 text-muted">
            Payments are processed by Paddle, our Merchant of Record. We never see your card details.
          </p>
        )}
      </Card>
    </div>
  );
}
