import 'server-only';

/**
 * Paddle's webhook-sending IPs, fetched live rather than hard-coded — Paddle
 * states this list can change. Cached in memory for a few minutes.
 */
const IPS_URL = 'https://api.paddle.com/ips';
const CACHE_TTL_MS = 5 * 60 * 1000;

let cached: { cidrs: string[]; fetchedAt: number } | null = null;

async function fetchCidrs(): Promise<string[]> {
  const res = await fetch(IPS_URL, { signal: AbortSignal.timeout(5000) });
  if (!res.ok) throw new Error(`Paddle IPs endpoint returned ${res.status}`);
  const body = (await res.json()) as { data?: { ipv4_cidrs?: unknown } };
  const cidrs = body.data?.ipv4_cidrs;
  if (!Array.isArray(cidrs) || cidrs.length === 0 || !cidrs.every((c) => typeof c === 'string')) {
    throw new Error('Paddle IPs endpoint returned an unexpected shape');
  }
  return cidrs;
}

function ipToInt(ip: string): number | null {
  const parts = ip.split('.');
  if (parts.length !== 4) return null;
  let value = 0;
  for (const part of parts) {
    if (!/^\d{1,3}$/.test(part)) return null;
    const n = Number(part);
    if (n > 255) return null;
    value = (value << 8) | n;
  }
  return value >>> 0;
}

function ipInCidr(ip: string, cidr: string): boolean {
  const [range, bitsStr] = cidr.split('/');
  const bits = Number(bitsStr);
  const ipInt = ipToInt(ip);
  const rangeInt = ipToInt(range);
  if (ipInt === null || rangeInt === null || Number.isNaN(bits)) return false;
  if (bits === 0) return true;
  const mask = bits >= 32 ? 0xffffffff : (0xffffffff << (32 - bits)) >>> 0;
  return (ipInt & mask) === (rangeInt & mask);
}

/**
 * Fails closed: if Paddle's IPs endpoint is unreachable and there's no usable
 * cache, the request is rejected rather than allowed through unchecked.
 */
export async function isPaddleWebhookIp(ip: string): Promise<boolean> {
  if (!cached || Date.now() - cached.fetchedAt > CACHE_TTL_MS) {
    try {
      cached = { cidrs: await fetchCidrs(), fetchedAt: Date.now() };
    } catch (err) {
      if (!cached) throw err;
      // Stale cache is safer than no check while Paddle's endpoint is down.
    }
  }
  return cached.cidrs.some((cidr) => ipInCidr(ip, cidr));
}
