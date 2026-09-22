import 'server-only';

import { createHmac, timingSafeEqual } from 'node:crypto';

/** Replay window (Paddle retries late deliveries with a fresh timestamp). */
const MAX_SKEW_MS = 5 * 60 * 1000;

/**
 * Paddle webhook signature verification:
 * header `Paddle-Signature: ts=<unix seconds>;h1=<hex>[;h1=<hex>…]`,
 * h1 = hex(HMAC-SHA256(`${ts}:${rawBody}`, endpoint secret)).
 *
 * Written by hand rather than via the Paddle SDK, whose validator only keeps
 * the last h1 (breaks during secret rotation, when Paddle sends one per
 * active secret) and compares with `===` instead of in constant time.
 */
export function verifyPaddleSignature(
  rawBody: string,
  header: string | null,
  secret: string,
  now: number = Date.now(),
): boolean {
  if (!header) return false;

  let timestamp: string | undefined;
  const signatures: string[] = [];
  for (const part of header.split(';')) {
    const separator = part.indexOf('=');
    if (separator === -1) continue;
    const key = part.slice(0, separator).trim();
    const value = part.slice(separator + 1).trim();
    if (key === 'ts') timestamp = value;
    else if (key === 'h1') signatures.push(value);
  }

  if (!timestamp || !/^\d{1,12}$/.test(timestamp) || signatures.length === 0) return false;
  if (Math.abs(now - Number(timestamp) * 1000) > MAX_SKEW_MS) return false;

  const expected = createHmac('sha256', secret).update(`${timestamp}:${rawBody}`).digest();

  return signatures.some((signature) => {
    if (!/^[0-9a-f]{64}$/i.test(signature)) return false;
    return timingSafeEqual(Buffer.from(signature, 'hex'), expected);
  });
}
