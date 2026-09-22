import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { Sparkles } from 'lucide-react';
import { getCurrentUser } from '@/lib/supabase/server';
import { getProAccess, type ProAccess } from '@/lib/billing/entitlements';
import { getUsageToday } from '@/lib/usage';
import { PLAN_LIMITS, formatBytes } from '@/lib/usage-limits';
import { POPULAR_CONVERTERS } from '@/lib/converters/catalog';
import { Badge, Card } from '@/components/ui/card';
import { ButtonLink } from '@/components/ui/button';
import { ConverterCard } from '@/components/converter/converter-card';
import { log } from '@/lib/logger';
import { DeleteAccount } from './delete-account';

export const metadata: Metadata = { title: 'Dashboard', robots: { index: false } };

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { dateStyle: 'medium', timeZone: 'UTC' });
}

export default async function DashboardPage() {
  const { user } = await getCurrentUser();
  if (!user) redirect('/login');

  let access: ProAccess = { tier: 'free' };
  let usage = { files: 0, proRuns: 0 };
  try {
    [access, usage] = await Promise.all([getProAccess(user.id), getUsageToday(`user:${user.id}`)]);
  } catch (err) {
    log('error', 'dashboard: could not load plan/usage', { error: String(err) });
  }

  const isPro = access.tier === 'pro';
  const limits = PLAN_LIMITS[isPro ? 'pro' : 'free'];

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold tracking-tight">Overview</h1>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <p className="text-sm text-muted">Current plan</p>
          <div className="mt-2 flex items-center gap-2">
            <h2 className="text-2xl font-bold">{isPro ? 'Pro' : 'Free'}</h2>
            {access.tier === 'pro' && (
              <Badge tone="pro">
                <Sparkles aria-hidden className="h-3 w-3" />
                {access.source === 'lifetime' ? 'Lifetime' : 'Subscription'}
              </Badge>
            )}
          </div>
          <p className="mt-2 text-sm text-muted">
            {access.tier === 'pro'
              ? access.source === 'lifetime'
                ? 'Pro forever — every current and future converter is unlocked.'
                : `Pro is active through ${formatDate(access.expiresAt!)}.`
              : `${limits.filesPerDay} files a day, up to ${formatBytes(limits.maxFileBytes)} each, and ${limits.proRunsPerDay} Pro tool run a day.`}
          </p>
          <div className="mt-5">
            {isPro ? (
              <ButtonLink href="/dashboard/billing" variant="secondary">
                Manage billing
              </ButtonLink>
            ) : (
              <ButtonLink href="/pricing">
                <Sparkles aria-hidden className="h-4 w-4" />
                Upgrade to Pro
              </ButtonLink>
            )}
          </div>
        </Card>

        <Card>
          <p className="text-sm text-muted">Today’s usage (resets at 00:00 UTC)</p>
          {isPro ? (
            <p className="mt-2 text-2xl font-bold">Unlimited</p>
          ) : (
            <>
              <p className="mt-2 text-2xl font-bold tabular-nums">
                {usage.files} <span className="text-base font-normal text-muted">/ {limits.filesPerDay} files</span>
              </p>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-surface-2">
                <div
                  className="h-full rounded-full bg-primary"
                  style={{ width: `${Math.min(100, (usage.files / (limits.filesPerDay ?? 1)) * 100)}%` }}
                />
              </div>
              <p className="mt-3 text-sm text-muted">
                Pro tool runs: {usage.proRuns} / {limits.proRunsPerDay}
              </p>
            </>
          )}
          {isPro && <p className="mt-2 text-sm text-muted">{usage.files} files converted today.</p>}
        </Card>
      </div>

      <section>
        <h2 className="text-lg font-semibold">Popular converters</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {POPULAR_CONVERTERS.slice(0, 6).map((converter) => (
            <ConverterCard key={converter.slug} converter={converter} />
          ))}
        </div>
      </section>

      <DeleteAccount />
    </div>
  );
}
