import { NextResponse, type NextRequest } from 'next/server';
import { getConverter } from '@/lib/converters/catalog';
import { consumeUsage, getUsageToday, resolveSubject, type UsageSubject } from '@/lib/usage';
import { PLAN_LIMITS } from '@/lib/usage-limits';
import { clientIp, usageLimiter } from '@/lib/rate-limit';
import { usageConsumeSchema } from '@/schemas';
import { errorMessage, log } from '@/lib/logger';

const NO_STORE = { 'Cache-Control': 'no-store' };

function account(who: UsageSubject, usage: { files: number; proRuns: number }) {
  return { tier: who.tier, signedIn: who.signedIn, limits: PLAN_LIMITS[who.tier], usage };
}

/** Current plan, limits and today's usage for the converter UI. */
export async function GET(request: NextRequest) {
  try {
    const who = await resolveSubject(request);
    const usage = await getUsageToday(who.subject);
    return NextResponse.json({ account: account(who, usage) }, { headers: NO_STORE });
  } catch (err) {
    log('error', 'usage: status failed', { error: errorMessage(err) });
    return NextResponse.json({ error: 'unavailable' }, { status: 503, headers: NO_STORE });
  }
}

/** Reserves quota for one conversion run before the browser starts converting. */
export async function POST(request: NextRequest) {
  const { success } = await usageLimiter.limit(clientIp(request));
  if (!success) return NextResponse.json({ allowed: false, reason: 'rate_limited' }, { status: 429 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'invalid_request' }, { status: 400 });
  }
  const parsed = usageConsumeSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: 'invalid_request' }, { status: 400 });

  const converter = getConverter(parsed.data.slug);
  if (!converter) return NextResponse.json({ error: 'unknown_converter' }, { status: 404 });

  try {
    const who = await resolveSubject(request);
    const result = await consumeUsage(who, {
      slug: converter.slug,
      files: parsed.data.files,
      totalBytes: parsed.data.totalBytes,
      largestBytes: parsed.data.largestBytes,
      isProTool: converter.tier === 'pro',
    });
    const usage = { files: result.files, proRuns: result.proRuns };
    if (!result.allowed) {
      return NextResponse.json(
        { allowed: false, reason: result.reason, account: account(who, usage) },
        { status: 403, headers: NO_STORE },
      );
    }
    return NextResponse.json({ allowed: true, account: account(who, usage) }, { headers: NO_STORE });
  } catch (err) {
    log('error', 'usage: consume failed', { error: errorMessage(err) });
    return NextResponse.json({ error: 'unavailable' }, { status: 503, headers: NO_STORE });
  }
}
