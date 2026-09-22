import 'server-only';

import { createPublicClient } from '@/lib/supabase/server';
import { log } from '@/lib/logger';
import { PLAN_IDS, PLANS, type PlanDisplay, type PlanId } from '@/lib/plans';

/** Marketing pages must never hang on the database — fall back fast instead. */
const READ_TIMEOUT_MS = 3000;

export type LivePlan = PlanDisplay & { available: boolean };

/**
 * Pricing-page plans with prices from the `plans` table (cookie-less anon client
 * under the `anyone_reads_active_plans` RLS policy, so pages stay statically
 * prerendered and refresh via ISR). A plan the DB marks inactive is absent from
 * the read and comes back `available: false`. If the read fails or times out we
 * fall back to the static catalog; checkout always re-reads the DB anyway.
 */
export async function getLivePlans(): Promise<Record<PlanId, LivePlan>> {
  const fallback = Object.fromEntries(
    PLAN_IDS.map((id) => [id, { ...PLANS[id], available: true }]),
  ) as Record<PlanId, LivePlan>;

  try {
    const { data, error } = await createPublicClient()
      .from('plans')
      .select('id, price_cents, compare_at_price_cents')
      .abortSignal(AbortSignal.timeout(READ_TIMEOUT_MS));
    if (error || !data) throw error ?? new Error('no data');
    if (data.length === 0) throw new Error('plans table is empty');

    const rows = new Map(data.map((row) => [row.id, row]));
    return Object.fromEntries(
      PLAN_IDS.map((id) => {
        const row = rows.get(id);
        const plan: LivePlan = row
          ? {
              ...PLANS[id],
              usd: row.price_cents / 100,
              compareAtUsd: row.compare_at_price_cents ? row.compare_at_price_cents / 100 : null,
              available: true,
            }
          : { ...PLANS[id], available: false };
        return [id, plan];
      }),
    ) as Record<PlanId, LivePlan>;
  } catch (err) {
    const message = (err as { message?: string } | null)?.message ?? String(err);
    log('warn', 'plans-live: falling back to static prices', { error: message });
    return fallback;
  }
}
