import 'server-only';
import { z } from 'zod';

/**
 * Server-side environment validation. Fails fast on cold start if a required
 * secret is missing or malformed. Never import this module from a Client Component.
 */

/** Optional value where an empty `KEY=` line in .env counts as unset. */
const optional = <T extends z.ZodType>(schema: T) =>
  z.preprocess((value) => (value === '' ? undefined : value), schema.optional());

const envSchema = z
  .object({
    NEXT_PUBLIC_SUPABASE_URL: z.url(),
    NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
    SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
    NEXT_PUBLIC_APP_URL: z.url(),
    USAGE_HASH_SECRET: optional(z.string().min(16)),

    // Paddle Billing. Optional at boot so converters and marketing pages keep
    // working without them; lib/paddle/config.ts reports what's missing.
    PADDLE_ENV: z.enum(['sandbox', 'production']).default('sandbox'),
    PADDLE_API_KEY: optional(z.string().min(1)),
    PADDLE_WEBHOOK_SECRET: optional(z.string().min(1)),
    NEXT_PUBLIC_PADDLE_CLIENT_TOKEN: optional(
      z.string().regex(/^(test|live)_/, 'must be a Paddle client-side token (test_… or live_…)'),
    ),
    PADDLE_PRODUCT_ID_PRO: optional(z.string().regex(/^pro_/, 'must be a Paddle product id (pro_…)')),
    PADDLE_PRODUCT_ID_LIFETIME: optional(z.string().regex(/^pro_/, 'must be a Paddle product id (pro_…)')),
    PADDLE_PRICE_ID_PRO_MONTHLY: optional(z.string().regex(/^pri_/, 'must be a Paddle price id (pri_…)')),
    PADDLE_PRICE_ID_PRO_YEARLY: optional(z.string().regex(/^pri_/, 'must be a Paddle price id (pri_…)')),
    PADDLE_PRICE_ID_LIFETIME: optional(z.string().regex(/^pri_/, 'must be a Paddle price id (pri_…)')),
    // Test-only mock API override; ignored in production (see lib/paddle/config.ts).
    PADDLE_API_BASE_URL: optional(z.url()),

    // Transactional email (purchase receipts, payment-failed, refunds). Optional
    // at boot — lib/email/send.ts logs and skips sending when unset.
    RESEND_API_KEY: optional(z.string().min(1)),
    EMAIL_FROM: z.string().default('ZapMorph <no-reply@zapmorph.com>'),

    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  })
  .superRefine((e, ctx) => {
    // A live key with PADDLE_ENV=sandbox (or the reverse) silently breaks
    // checkout or, worse, charges real cards during testing — refuse to boot.
    const sandbox = e.PADDLE_ENV === 'sandbox';
    if (e.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN?.startsWith(sandbox ? 'live_' : 'test_')) {
      ctx.addIssue({
        code: 'custom',
        path: ['NEXT_PUBLIC_PADDLE_CLIENT_TOKEN'],
        message: `client token does not match PADDLE_ENV=${e.PADDLE_ENV}`,
      });
    }
    if (e.PADDLE_API_KEY?.startsWith(sandbox ? 'pdl_live_' : 'pdl_sdbx_')) {
      ctx.addIssue({
        code: 'custom',
        path: ['PADDLE_API_KEY'],
        message: `API key does not match PADDLE_ENV=${e.PADDLE_ENV}`,
      });
    }
    if (e.NODE_ENV === 'production' && !e.USAGE_HASH_SECRET) {
      ctx.addIssue({
        code: 'custom',
        path: ['USAGE_HASH_SECRET'],
        message: 'required in production (salts hashed visitor IPs)',
      });
    }
    if (e.NODE_ENV === 'production' && !e.RESEND_API_KEY) {
      ctx.addIssue({
        code: 'custom',
        path: ['RESEND_API_KEY'],
        message: 'required in production (purchase receipts, payment-failed and refund emails)',
      });
    }
  });

export const env = envSchema.parse(process.env);

export const isProd = env.NODE_ENV === 'production';
