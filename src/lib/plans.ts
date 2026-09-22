/**
 * Display catalog for pricing pages (static so pages prerender). The
 * authoritative prices live in the `plans` table — checkout always charges the
 * DB price, never this file or the client. Keep both in sync.
 */

export type BillingPeriod = 'monthly' | 'yearly' | 'lifetime';

export const PLAN_IDS = ['pro-monthly', 'pro-yearly', 'pro-lifetime'] as const;
export type PlanId = (typeof PLAN_IDS)[number];

export type PlanDisplay = {
  id: PlanId;
  name: string;
  period: BillingPeriod;
  usd: number;
  compareAtUsd: number | null;
};

export const PLANS: Record<PlanId, PlanDisplay> = {
  'pro-monthly': { id: 'pro-monthly', name: 'Pro', period: 'monthly', usd: 9, compareAtUsd: null },
  'pro-yearly': { id: 'pro-yearly', name: 'Pro', period: 'yearly', usd: 72, compareAtUsd: 108 },
  'pro-lifetime': {
    id: 'pro-lifetime',
    name: 'Lifetime',
    period: 'lifetime',
    usd: 99,
    compareAtUsd: 149,
  },
};

export const FREE_FEATURES = [
  '5 files per day with a free account',
  'Files up to 50 MB',
  'Batch up to 5 files',
  'All image, PDF and data converters',
  '1 Pro tool run per day (audio, video, split PDF)',
  'No watermarks, ever',
  'Files never leave your device',
] as const;

export const PRO_FEATURES = [
  'Unlimited conversions',
  'Files up to 1 GB',
  'Batch up to 50 files + ZIP download',
  'Audio & video converters (MP4→MP3, GIF, MOV→MP4…)',
  'Pro PDF tools (split PDF)',
  'Every new converter as it ships',
  'Priority email support',
] as const;

export function findPlan(planId: string): PlanDisplay | null {
  return (PLAN_IDS as readonly string[]).includes(planId) ? PLANS[planId as PlanId] : null;
}

/** "$9" for whole amounts, "$9.99" otherwise. */
export function formatUsd(amount: number): string {
  const digits = Number.isInteger(amount) ? 0 : 2;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(amount);
}

export const periodLabel: Record<BillingPeriod, string> = {
  monthly: 'per month',
  yearly: 'per year',
  lifetime: 'one-time payment',
};
