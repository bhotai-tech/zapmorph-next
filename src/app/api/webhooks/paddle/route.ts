import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase/server';
import { getPaddleConfig } from '@/lib/paddle/config';
import { verifyPaddleSignature } from '@/lib/paddle/verify';
import { isPaddleWebhookIp } from '@/lib/paddle/ips';
import { fulfillTransaction } from '@/lib/billing/fulfill';
import { handleAdjustment, syncSubscription } from '@/lib/billing/subscriptions';
import { clientIp } from '@/lib/rate-limit';
import { log } from '@/lib/logger';

/**
 * Paddle webhook: IP allowlist → raw-body HMAC verification → idempotency
 * ledger → handlers that re-read state from the Paddle API → only then
 * entitlement changes.
 *
 * Subscribe the notification destination to: transaction.completed,
 * transaction.paid, subscription.created, subscription.updated,
 * subscription.activated, subscription.canceled, subscription.past_due,
 * subscription.paused, subscription.resumed, adjustment.created,
 * adjustment.updated.
 */

const eventSchema = z.object({
  event_id: z.string().min(1).max(128),
  event_type: z.string().min(1).max(128),
  occurred_at: z.string().optional(),
  data: z.record(z.string(), z.unknown()),
});
type PaddleEvent = z.infer<typeof eventSchema>;

const entitySchema = z.object({ id: z.string().min(1), status: z.string().optional() });

const adjustmentSchema = z.object({
  id: z.string(),
  action: z.string(),
  type: z.string(),
  status: z.string(),
  transaction_id: z.string(),
});

export async function POST(request: NextRequest) {
  let webhookSecret: string;
  let environment: 'sandbox' | 'production';
  try {
    const config = getPaddleConfig();
    webhookSecret = config.webhookSecret;
    environment = config.environment;
  } catch (err) {
    log('error', 'webhook: Paddle not configured', { error: String(err) });
    return NextResponse.json({ error: 'Not configured' }, { status: 503 });
  }

  // 1. IP allowlist (production only — sandbox/tunnel testing sends from arbitrary IPs).
  if (environment === 'production') {
    const ip = clientIp(request);
    let allowed: boolean;
    try {
      allowed = await isPaddleWebhookIp(ip);
    } catch (err) {
      log('error', 'webhook: could not verify sender IP', { error: String(err) });
      return NextResponse.json({ error: 'Service unavailable' }, { status: 503 });
    }
    if (!allowed) {
      log('warn', 'webhook: rejected non-Paddle IP', { ip });
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
  }

  // 2. Verify the signature over the RAW body (never re-serialized JSON).
  const rawBody = await request.text();
  if (!verifyPaddleSignature(rawBody, request.headers.get('paddle-signature'), webhookSecret)) {
    log('warn', 'webhook: invalid signature');
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }

  let event: PaddleEvent;
  try {
    event = eventSchema.parse(JSON.parse(rawBody));
  } catch {
    return NextResponse.json({ error: 'Malformed payload' }, { status: 400 });
  }

  const supabase = createAdminClient();
  const entity = entitySchema.safeParse(event.data);

  // 3. Idempotency ledger. Sanitized subset only — never the full payload.
  const { error: insertError } = await supabase.from('webhook_events').insert({
    event_id: event.event_id,
    event_type: event.event_type,
    payload: {
      event_type: event.event_type,
      occurred_at: event.occurred_at ?? null,
      entity_id: entity.success ? entity.data.id : null,
      status: entity.success ? (entity.data.status ?? null) : null,
    },
  });
  if (insertError) {
    if (insertError.code !== '23505') {
      log('error', 'webhook: ledger insert failed', { error: insertError.message });
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
    const { data: prior } = await supabase
      .from('webhook_events')
      .select('processed_at, error')
      .eq('event_id', event.event_id)
      .single();
    if (prior?.processed_at && !prior.error) {
      return NextResponse.json({ received: true });
    }
    // A previous delivery failed (or is still running). Handlers are
    // idempotent, so reprocess rather than swallowing Paddle's retry.
  }

  // 4. Process.
  let processingError: string | null = null;
  try {
    await dispatch(event);
  } catch (err) {
    processingError = String(err);
    log('error', 'webhook: processing failed', {
      eventId: event.event_id,
      eventType: event.event_type,
      error: processingError,
    });
  }

  await supabase
    .from('webhook_events')
    .update({ processed_at: new Date().toISOString(), error: processingError })
    .eq('event_id', event.event_id);

  // Non-2xx → Paddle retries with backoff.
  if (processingError) {
    return NextResponse.json({ error: 'Processing failed' }, { status: 500 });
  }
  return NextResponse.json({ received: true });
}

async function dispatch(event: PaddleEvent) {
  const type = event.event_type;

  if (type === 'transaction.completed' || type === 'transaction.paid') {
    await fulfillTransaction(entitySchema.parse(event.data).id, 'webhook');
  } else if (type.startsWith('subscription.')) {
    await syncSubscription(entitySchema.parse(event.data).id);
  } else if (type === 'adjustment.created' || type === 'adjustment.updated') {
    await handleAdjustment(adjustmentSchema.parse(event.data));
  }
  // Everything else is acknowledged without action.
}
