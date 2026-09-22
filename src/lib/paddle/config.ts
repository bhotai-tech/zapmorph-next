import 'server-only';

import { env, isProd } from '@/config/env';

/**
 * Paddle settings, resolved lazily. The Paddle env vars are optional at boot so
 * the converters keep working without them; anything that actually needs
 * Paddle calls getPaddleConfig() and gets a clear error instead.
 */

export class PaddleNotConfiguredError extends Error {
  constructor(missing: string[]) {
    super(`Paddle is not configured — missing ${missing.join(', ')}`);
    this.name = 'PaddleNotConfiguredError';
  }
}

const API_BASE_URL = {
  sandbox: 'https://sandbox-api.paddle.com',
  production: 'https://api.paddle.com',
} as const;

export function getPaddleConfig() {
  const required = {
    PADDLE_API_KEY: env.PADDLE_API_KEY,
    PADDLE_WEBHOOK_SECRET: env.PADDLE_WEBHOOK_SECRET,
    NEXT_PUBLIC_PADDLE_CLIENT_TOKEN: env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN,
    PADDLE_PRODUCT_ID_PRO: env.PADDLE_PRODUCT_ID_PRO,
    PADDLE_PRODUCT_ID_LIFETIME: env.PADDLE_PRODUCT_ID_LIFETIME,
  };
  const missing = Object.entries(required)
    .filter(([, value]) => !value)
    .map(([name]) => name);
  if (missing.length > 0) throw new PaddleNotConfiguredError(missing);

  return {
    environment: env.PADDLE_ENV,
    apiKey: env.PADDLE_API_KEY!,
    webhookSecret: env.PADDLE_WEBHOOK_SECRET!,
    clientToken: env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN!,
    // The override exists only so tests can run against a local mock API; it
    // is ignored in production builds so it can never redirect money.
    apiBaseUrl:
      !isProd && env.PADDLE_API_BASE_URL ? env.PADDLE_API_BASE_URL : API_BASE_URL[env.PADDLE_ENV],
    proProductId: env.PADDLE_PRODUCT_ID_PRO!,
    lifetimeProductId: env.PADDLE_PRODUCT_ID_LIFETIME!,
  };
}

export function isPaddleConfigured(): boolean {
  try {
    getPaddleConfig();
    return true;
  } catch {
    return false;
  }
}
