import 'server-only';

import { createHmac } from 'node:crypto';
import { env } from '@/config/env';
import { createAdminClient, createClient } from '@/lib/supabase/server';
import { getProAccess, type ProAccess } from '@/lib/billing/entitlements';
import { clientIp } from '@/lib/rate-limit';
import { PLAN_LIMITS, type Tier, type UsageDenial } from '@/lib/usage-limits';

/**
 * Daily conversion quota. Signed-in users are counted per account; visitors
 * per HMAC-hashed IP (the raw IP is never stored).
 */

export type UsageSubject = {
  subject: string;
  tier: Tier;
  signedIn: boolean;
  access: ProAccess | null;
};

function hashIp(ip: string): string {
  return createHmac('sha256', env.USAGE_HASH_SECRET ?? env.SUPABASE_SERVICE_ROLE_KEY)
    .update(ip)
    .digest('hex')
    .slice(0, 32);
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

export async function resolveSubject(request: Request): Promise<UsageSubject> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { subject: `ip:${hashIp(clientIp(request))}`, tier: 'anonymous', signedIn: false, access: null };
  }
  const access = await getProAccess(user.id);
  return {
    subject: `user:${user.id}`,
    tier: access.tier === 'pro' ? 'pro' : 'free',
    signedIn: true,
    access,
  };
}

export async function getUsageToday(subject: string): Promise<{ files: number; proRuns: number }> {
  const { data, error } = await createAdminClient()
    .from('usage_daily')
    .select('conversions, pro_conversions')
    .eq('subject', subject)
    .eq('day', today())
    .maybeSingle();
  if (error) throw error;
  return { files: data?.conversions ?? 0, proRuns: data?.pro_conversions ?? 0 };
}

export type ConsumeResult =
  | { allowed: true; files: number; proRuns: number }
  | { allowed: false; reason: UsageDenial; files: number; proRuns: number };

export async function consumeUsage(
  who: UsageSubject,
  run: { slug: string; files: number; totalBytes: number; largestBytes: number; isProTool: boolean },
): Promise<ConsumeResult> {
  const limits = PLAN_LIMITS[who.tier];

  // Pro tools need an account: free accounts get one run a day, Pro is unlimited.
  if (run.isProTool && who.tier === 'anonymous') {
    return { allowed: false, reason: 'sign_in_required', files: 0, proRuns: 0 };
  }
  if (run.files > limits.maxBatch) {
    return { allowed: false, reason: 'batch_too_large', files: 0, proRuns: 0 };
  }
  if (run.largestBytes > limits.maxFileBytes) {
    return { allowed: false, reason: 'file_too_large', files: 0, proRuns: 0 };
  }

  const { data, error } = await createAdminClient().rpc('consume_usage', {
    p_subject: who.subject,
    p_slug: run.slug,
    p_files: run.files,
    p_bytes: run.totalBytes,
    p_is_pro_tool: run.isProTool,
    p_file_limit: limits.filesPerDay,
    p_pro_limit: limits.proRunsPerDay,
  });
  if (error) throw error;
  const row = data[0];
  if (!row) throw new Error('consume_usage returned no row');

  return row.allowed
    ? { allowed: true, files: row.used, proRuns: row.pro_used }
    : {
        allowed: false,
        reason: row.reason === 'pro_limit' ? 'pro_limit' : 'daily_limit',
        files: row.used,
        proRuns: row.pro_used,
      };
}
