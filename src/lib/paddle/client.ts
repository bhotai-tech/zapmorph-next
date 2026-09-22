import 'server-only';

import { z } from 'zod';
import { getPaddleConfig } from '@/lib/paddle/config';

/**
 * Minimal Paddle Billing REST client (server-only — the API key never reaches
 * the browser). Hand-rolled over fetch so every response is validated with zod
 * and tests can point it at a local mock API.
 */

const REQUEST_TIMEOUT_MS = 10_000;

export class PaddleApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string | undefined,
    readonly detail: string | undefined,
  ) {
    super(`Paddle API ${status} ${code ?? 'error'}: ${detail ?? ''}`.trim());
    this.name = 'PaddleApiError';
  }
}

async function paddleFetch<T extends z.ZodType>(
  path: string,
  schema: T,
  init?: { method?: 'GET' | 'POST' | 'PATCH'; body?: unknown },
): Promise<z.infer<T>> {
  const { apiKey, apiBaseUrl } = getPaddleConfig();
  const res = await fetch(`${apiBaseUrl}${path}`, {
    method: init?.method ?? 'GET',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'Paddle-Version': '1',
    },
    body: init?.body === undefined ? undefined : JSON.stringify(init.body),
    cache: 'no-store',
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });

  const payload = (await res.json().catch(() => null)) as {
    data?: unknown;
    error?: { code?: string; detail?: string };
  } | null;
  if (!res.ok) {
    throw new PaddleApiError(res.status, payload?.error?.code, payload?.error?.detail);
  }
  return schema.parse(payload?.data);
}

// ── Response schemas (only the fields this app reads) ─────────────────────────

const customDataSchema = z.record(z.string(), z.unknown()).nullable().catch(null);

const timePeriodSchema = z.object({ starts_at: z.string(), ends_at: z.string() });

export const transactionSchema = z.object({
  id: z.string(),
  status: z.enum(['draft', 'ready', 'billed', 'paid', 'completed', 'canceled', 'past_due']),
  customer_id: z.string().nullable(),
  subscription_id: z.string().nullable(),
  origin: z.string(),
  currency_code: z.string(),
  custom_data: customDataSchema,
  billed_at: z.string().nullable().optional(),
  billing_period: timePeriodSchema.nullable().optional(),
  items: z.array(
    z.object({
      quantity: z.number(),
      price: z.object({
        product_id: z.string(),
        unit_price: z.object({ amount: z.string(), currency_code: z.string() }),
        billing_cycle: z.object({ interval: z.string(), frequency: z.number() }).nullable(),
      }),
    }),
  ),
  details: z
    .object({
      totals: z.object({ grand_total: z.string() }).nullable(),
    })
    .nullable()
    .optional(),
  payments: z
    .array(
      z.object({
        status: z.string(),
        method_details: z.object({ type: z.string() }).nullable().optional(),
      }),
    )
    .optional(),
});
export type PaddleTransaction = z.infer<typeof transactionSchema>;

export const subscriptionSchema = z.object({
  id: z.string(),
  status: z.enum(['active', 'canceled', 'past_due', 'paused', 'trialing']),
  customer_id: z.string(),
  custom_data: customDataSchema,
  next_billed_at: z.string().nullable(),
  canceled_at: z.string().nullable().optional(),
  current_billing_period: timePeriodSchema.nullable(),
  scheduled_change: z
    .object({ action: z.string(), effective_at: z.string() })
    .nullable(),
});
export type PaddleSubscription = z.infer<typeof subscriptionSchema>;

const customerSchema = z.object({ id: z.string(), email: z.string() });

const portalSessionSchema = z.object({
  urls: z.object({
    general: z.object({ overview: z.string() }),
    subscriptions: z.array(
      z.object({
        id: z.string(),
        cancel_subscription: z.string(),
        update_subscription_payment_method: z.string(),
      }),
    ),
  }),
});

// ── Operations ────────────────────────────────────────────────────────────────

/** Creates the Paddle customer for an email, or returns the existing one. */
export async function findOrCreateCustomer(email: string): Promise<string> {
  try {
    const customer = await paddleFetch('/customers', customerSchema, {
      method: 'POST',
      body: { email },
    });
    return customer.id;
  } catch (err) {
    // 409 detail: "customer email conflicts with customer of id ctm_…"
    const existingId =
      err instanceof PaddleApiError && err.code === 'customer_already_exists'
        ? err.detail?.match(/ctm_[a-z0-9]+/)?.[0]
        : undefined;
    if (existingId) return existingId;
    throw err;
  }
}

export type BillingInterval = 'month' | 'year';

/**
 * A single-item transaction priced from OUR database (a non-catalog price on
 * a catalog product), so admin price edits apply with no Paddle dashboard
 * change and the browser never supplies an amount. A billing cycle makes Paddle
 * create a subscription when the transaction completes; custom data is copied
 * to that subscription and every renewal transaction.
 */
export async function createTransaction(params: {
  customerId: string;
  productId: string;
  /** Shown to the customer at checkout and on invoices, e.g. "Lifetime license". */
  priceName: string;
  /** Internal note, never shown to customers. */
  description: string;
  amountCents: number;
  currency: string;
  interval: BillingInterval | null;
  customData: Record<string, string>;
}): Promise<PaddleTransaction> {
  return paddleFetch('/transactions', transactionSchema, {
    method: 'POST',
    body: {
      customer_id: params.customerId,
      currency_code: params.currency,
      collection_mode: 'automatic',
      custom_data: params.customData,
      items: [
        {
          quantity: 1,
          price: {
            product_id: params.productId,
            name: params.priceName,
            description: params.description,
            unit_price: { amount: String(params.amountCents), currency_code: params.currency },
            // One purchase, one seat: customers can't change the quantity.
            quantity: { minimum: 1, maximum: 1 },
            billing_cycle: params.interval ? { interval: params.interval, frequency: 1 } : null,
            tax_mode: 'account_setting',
          },
        },
      ],
    },
  });
}

export function getTransaction(transactionId: string): Promise<PaddleTransaction> {
  return paddleFetch(`/transactions/${encodeURIComponent(transactionId)}`, transactionSchema);
}

export function getSubscription(subscriptionId: string): Promise<PaddleSubscription> {
  return paddleFetch(`/subscriptions/${encodeURIComponent(subscriptionId)}`, subscriptionSchema);
}

/**
 * `next_billing_period` keeps the subscription active until the paid period
 * ends (customer cancels auto-renewal); `immediately` stops it now (refunds,
 * account deletion).
 */
export function cancelSubscription(
  subscriptionId: string,
  effectiveFrom: 'next_billing_period' | 'immediately',
): Promise<PaddleSubscription> {
  return paddleFetch(
    `/subscriptions/${encodeURIComponent(subscriptionId)}/cancel`,
    subscriptionSchema,
    { method: 'POST', body: { effective_from: effectiveFrom } },
  );
}

/** Authenticated links to Paddle's customer portal (payment method, invoices). */
export async function createPortalSession(customerId: string, subscriptionIds: string[]) {
  const session = await paddleFetch(
    `/customers/${encodeURIComponent(customerId)}/portal-sessions`,
    portalSessionSchema,
    { method: 'POST', body: { subscription_ids: subscriptionIds } },
  );
  return session.urls;
}
