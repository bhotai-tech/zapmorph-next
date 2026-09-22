import { Check } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { siteConfig } from '@/config/site';
import { PRO_FEATURES, formatUsd, type BillingPeriod } from '@/lib/plans';

export type LiveTotals = {
  currency: string;
  subtotal: number;
  tax: number;
  total: number;
  /** Amount charged on each renewal (subscriptions). */
  recurringTotal: number | null;
};

function money(amount: number, currency: string) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount);
}

const PERIOD_COPY: Record<BillingPeriod, { label: string; badge: string; unit: string }> = {
  monthly: { label: 'Monthly subscription', badge: 'Billed monthly', unit: 'month' },
  yearly: { label: 'Yearly subscription', badge: 'Billed yearly', unit: 'year' },
  lifetime: { label: 'Lifetime access', badge: 'Pay once', unit: '' },
};

/**
 * Paddle's inline frame only collects customer and payment details, so the
 * item, totals and renewal terms are shown here — live from Paddle.js events
 * once available, the plan price before that.
 */
export function OrderSummary({
  planName,
  period,
  priceUsd,
  totals,
}: {
  planName: string;
  period: BillingPeriod;
  priceUsd: number;
  totals: LiveTotals | null;
}) {
  const copy = PERIOD_COPY[period];
  return (
    <Card className="p-6 sm:p-8">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Order summary</p>

      <div className="mt-5 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold">
            {siteConfig.name} {planName}
          </h2>
          <p className="mt-1 text-sm text-muted">{copy.label}</p>
        </div>
        <span className="shrink-0 rounded-full bg-primary-soft px-2.5 py-1 text-xs font-medium text-primary-strong">
          {copy.badge}
        </span>
      </div>

      <ul className="mt-6 space-y-2.5">
        {PRO_FEATURES.map((feature) => (
          <li key={feature} className="flex items-start gap-2 text-sm text-muted">
            <Check aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            {feature}
          </li>
        ))}
      </ul>

      <dl className="mt-8 space-y-3 border-t border-border pt-6 text-sm">
        {totals ? (
          <>
            <div className="flex justify-between">
              <dt className="text-muted">Subtotal</dt>
              <dd className="tabular-nums">{money(totals.subtotal, totals.currency)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted">Tax</dt>
              <dd className="tabular-nums">{money(totals.tax, totals.currency)}</dd>
            </div>
          </>
        ) : (
          <div className="flex justify-between">
            <dt className="text-muted">Tax</dt>
            <dd className="text-muted">Calculated from your country</dd>
          </div>
        )}
        <div className="flex items-baseline justify-between border-t border-border pt-4">
          <dt className="font-semibold">Due today</dt>
          <dd className="text-2xl font-bold tabular-nums" aria-live="polite">
            {totals ? money(totals.total, totals.currency) : formatUsd(priceUsd)}
          </dd>
        </div>
      </dl>

      <p className="mt-4 text-xs leading-5 text-muted">
        {period === 'lifetime'
          ? 'One-time payment. No subscription, no renewals. If you have a Pro subscription, it will stop renewing automatically.'
          : `Renews at ${totals?.recurringTotal != null ? money(totals.recurringTotal, totals.currency) : formatUsd(priceUsd)} every ${copy.unit} until you cancel — cancel anytime from your dashboard.`}{' '}
        14-day money-back guarantee.
      </p>
    </Card>
  );
}
