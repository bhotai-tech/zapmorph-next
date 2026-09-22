'use client';

import { useState } from 'react';
import { Check, Sparkles } from 'lucide-react';
import { ButtonLink } from '@/components/ui/button';
import { FREE_FEATURES, PRO_FEATURES, formatUsd, type PlanId } from '@/lib/plans';
import type { LivePlan } from '@/lib/plans-live';

type Cycle = 'monthly' | 'yearly';

export function PricingCards({ plans }: { plans: Record<PlanId, LivePlan> }) {
  const [cycle, setCycle] = useState<Cycle>('yearly');
  const pro = cycle === 'yearly' ? plans['pro-yearly'] : plans['pro-monthly'];
  const monthlyEquivalent = cycle === 'yearly' ? pro.usd / 12 : pro.usd;
  const savings = Math.round((1 - plans['pro-yearly'].usd / (plans['pro-monthly'].usd * 12)) * 100);
  const lifetime = plans['pro-lifetime'];

  return (
    <div>
      <div className="flex justify-center">
        <div role="radiogroup" aria-label="Billing cycle" className="inline-flex rounded-full border border-border bg-surface p-1 text-sm">
          {(['monthly', 'yearly'] as const).map((option) => (
            <button
              key={option}
              type="button"
              role="radio"
              aria-checked={cycle === option}
              onClick={() => setCycle(option)}
              className={`rounded-full px-4 py-2.5 font-medium transition-colors sm:py-2 ${
                cycle === option ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted hover:text-foreground'
              }`}
            >
              {option === 'monthly' ? 'Monthly' : `Yearly · save ${savings}%`}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-10 grid items-stretch gap-8 lg:grid-cols-3 lg:gap-6">
        <PlanCard
          name="Free"
          tagline="For occasional conversions"
          price={formatUsd(0)}
          priceNote="forever"
          features={FREE_FEATURES}
          cta={{ href: '/signup', label: 'Create free account' }}
        />
        <PlanCard
          highlighted
          name="Pro"
          tagline="For people who convert every week"
          price={formatUsd(Math.round(monthlyEquivalent * 100) / 100)}
          priceNote={cycle === 'yearly' ? `per month · billed ${formatUsd(pro.usd)} yearly` : 'per month'}
          compareAt={cycle === 'yearly' && pro.compareAtUsd ? `${formatUsd(pro.compareAtUsd)}/yr` : null}
          features={PRO_FEATURES}
          cta={{ href: `/checkout?plan=${pro.id}`, label: 'Get Pro', disabled: !pro.available }}
          footnote="Cancel anytime · 14-day money-back guarantee"
        />
        <PlanCard
          name="Lifetime"
          tagline="Pay once, Pro forever"
          price={formatUsd(lifetime.usd)}
          priceNote="one-time payment"
          compareAt={lifetime.compareAtUsd ? formatUsd(lifetime.compareAtUsd) : null}
          badge="Launch price"
          features={['Everything in Pro, forever', 'All future converters included', 'No subscription, no renewals', ...PRO_FEATURES.slice(1, 4)]}
          cta={{ href: `/checkout?plan=${lifetime.id}`, label: 'Get lifetime access', disabled: !lifetime.available }}
          footnote="14-day money-back guarantee"
        />
      </div>
    </div>
  );
}

function PlanCard({
  name,
  tagline,
  price,
  priceNote,
  compareAt = null,
  badge,
  features,
  cta,
  footnote,
  highlighted = false,
}: {
  name: string;
  tagline: string;
  price: string;
  priceNote: string;
  compareAt?: string | null;
  badge?: string;
  features: readonly string[];
  cta: { href: string; label: string; disabled?: boolean };
  footnote?: string;
  highlighted?: boolean;
}) {
  return (
    <div
      className={`relative flex flex-col rounded-3xl border bg-surface p-6 sm:p-7 ${
        highlighted ? 'border-primary shadow-xl ring-1 ring-primary lg:-my-3 lg:py-10' : 'border-border shadow-sm'
      }`}
    >
      {(highlighted || badge) && (
        <span
          className={`absolute -top-3 left-6 sm:left-7 inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold ${
            highlighted ? 'bg-primary text-primary-foreground' : 'bg-amber-400 text-amber-950'
          }`}
        >
          <Sparkles aria-hidden className="h-3 w-3" />
          {highlighted ? 'Most popular' : badge}
        </span>
      )}
      <h3 className="text-lg font-semibold">{name}</h3>
      <p className="mt-1 text-sm text-muted">{tagline}</p>
      <div className="mt-6 flex items-baseline gap-2">
        <span className="text-4xl font-bold tracking-tight tabular-nums">{price}</span>
        {compareAt && <span className="text-sm text-muted line-through">{compareAt}</span>}
      </div>
      <p className="mt-1 text-sm text-muted">{priceNote}</p>
      {cta.disabled ? (
        <p className="mt-6 w-full rounded-xl border border-border px-4 py-3 text-center text-sm font-medium text-muted">
          Currently unavailable
        </p>
      ) : (
        <ButtonLink
          href={cta.href}
          variant={highlighted ? 'primary' : 'secondary'}
          size="lg"
          className="mt-6 w-full"
        >
          {cta.label}
        </ButtonLink>
      )}
      <ul className="mt-7 space-y-3 text-sm">
        {features.map((feature) => (
          <li key={feature} className="flex gap-2.5">
            <Check aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <span>{feature}</span>
          </li>
        ))}
      </ul>
      {footnote && <p className="mt-auto pt-6 text-xs text-muted">{footnote}</p>}
    </div>
  );
}
