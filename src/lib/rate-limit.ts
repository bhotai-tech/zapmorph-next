import 'server-only';

import { isProd } from '@/config/env';
import { log } from '@/lib/logger';
import { createAdminClient } from '@/lib/supabase/server';

/**
 * Production counts hits in Postgres (public.rate_limit_hit) and fails closed
 * if that call errors. Development uses an in-memory limiter so local runs
 * never share counters with the real database.
 */

type Limiter = { limit: (id: string) => Promise<{ success: boolean }> };

let admin: ReturnType<typeof createAdminClient> | undefined;

function makePostgres(tokens: number, windowSeconds: number, prefix: string, failOpen: boolean): Limiter {
  return {
    async limit(id: string) {
      admin ??= createAdminClient();
      const { data, error } = await admin.rpc('rate_limit_hit', {
        p_key: `${prefix}:${id}`,
        p_limit: tokens,
        p_window_seconds: windowSeconds,
      });
      if (error) {
        log('error', `rate-limit: rate_limit_hit failed — failing ${failOpen ? 'open' : 'closed'}`, {
          prefix,
          error: error.message,
        });
        return { success: failOpen };
      }
      return { success: data === true };
    },
  };
}

/** Fixed window in process memory — not shared across serverless instances. */
function makeMemory(tokens: number, windowMs: number): Limiter {
  const hits = new Map<string, { count: number; reset: number }>();
  return {
    async limit(id: string) {
      const now = Date.now();
      const entry = hits.get(id);
      if (!entry || entry.reset < now) {
        hits.set(id, { count: 1, reset: now + windowMs });
        return { success: true };
      }
      entry.count += 1;
      return { success: entry.count <= tokens };
    },
  };
}

function makeLimiter(
  tokens: number,
  windowSeconds: number,
  prefix: string,
  { failOpen = false }: { failOpen?: boolean } = {},
): Limiter {
  return isProd
    ? makePostgres(tokens, windowSeconds, prefix, failOpen)
    : makeMemory(tokens, windowSeconds * 1000);
}

export const authLimiter = makeLimiter(5, 60, 'auth');
export const checkoutLimiter = makeLimiter(10, 3_600, 'checkout');
export const apiLimiter = makeLimiter(60, 60, 'api');
// Every accepted submission sends a real email, so keep this tight.
export const contactLimiter = makeLimiter(5, 3_600, 'contact');
// Conversions run in the browser, so a database outage must not block them:
// the quota itself is enforced by consume_usage, and the UI fails open too.
export const usageLimiter = makeLimiter(120, 60, 'usage', { failOpen: true });

export function clientIp(request: Request): string {
  const fwd = request.headers.get('x-forwarded-for');
  return fwd ? fwd.split(',')[0].trim() : '127.0.0.1';
}
