#!/usr/bin/env node
// Paddle setup helper.
//
//   npm run paddle:setup                                   # create/find both products and all three prices
//   npm run paddle:setup -- --webhook-url https://example.com/api/webhooks/paddle
//                                                          # also create the notification destination
//
// Reads PADDLE_ENV and PADDLE_API_KEY from the environment or .env.local and
// prints the env lines to add. Safe to re-run: matching products and prices are reused.
// Never prints the API key.

import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const envFile = path.join(ROOT, '.env.local');
const fileEnv = existsSync(envFile)
  ? Object.fromEntries(
      readFileSync(envFile, 'utf8')
        .split('\n')
        .filter((line) => /^[A-Z0-9_]+=/.test(line))
        .map((line) => {
          const i = line.indexOf('=');
          return [line.slice(0, i), line.slice(i + 1).trim().replace(/^["']|["']$/g, '')];
        }),
    )
  : {};
const read = (key) => process.env[key] || fileEnv[key] || '';

const environment = read('PADDLE_ENV') || 'sandbox';
const apiKey = read('PADDLE_API_KEY');
const webhookUrlIndex = process.argv.indexOf('--webhook-url');
const webhookUrl = webhookUrlIndex > -1 ? process.argv[webhookUrlIndex + 1] : null;

function fail(message) {
  console.error(`✖ ${message}`);
  process.exit(1);
}

if (!['sandbox', 'production'].includes(environment)) {
  fail(`PADDLE_ENV must be sandbox or production (got "${environment}")`);
}
if (!apiKey) fail('PADDLE_API_KEY is not set (Paddle → Developer tools → Authentication).');
if (apiKey.startsWith(environment === 'sandbox' ? 'pdl_live_' : 'pdl_sdbx_')) {
  fail(`PADDLE_API_KEY does not match PADDLE_ENV=${environment}.`);
}

const BASE = environment === 'production' ? 'https://api.paddle.com' : 'https://sandbox-api.paddle.com';

const PRODUCTS = [
  {
    env: 'PADDLE_PRODUCT_ID_PRO',
    name: 'ZapMorph Pro',
    description: 'Unlimited in-browser file conversions, 1 GB files, and audio & video converters.',
  },
  {
    env: 'PADDLE_PRODUCT_ID_LIFETIME',
    name: 'ZapMorph Lifetime',
    description: 'One-time payment for permanent Pro access, including future converters.',
  },
];

const PRICES = [
  { env: 'PADDLE_PRICE_ID_PRO_MONTHLY', productEnv: 'PADDLE_PRODUCT_ID_PRO', name: 'Pro — monthly', description: 'Monthly Pro subscription', amount: '900', interval: 'month' },
  { env: 'PADDLE_PRICE_ID_PRO_YEARLY', productEnv: 'PADDLE_PRODUCT_ID_PRO', name: 'Pro — yearly', description: 'Yearly Pro subscription', amount: '7200', interval: 'year' },
  { env: 'PADDLE_PRICE_ID_LIFETIME', productEnv: 'PADDLE_PRODUCT_ID_LIFETIME', name: 'Lifetime access', description: 'One-time payment for permanent Pro access', amount: '9900', interval: null },
];

const WEBHOOK_EVENTS = [
  'transaction.completed',
  'transaction.paid',
  'subscription.created',
  'subscription.updated',
  'subscription.activated',
  'subscription.canceled',
  'subscription.past_due',
  'subscription.paused',
  'subscription.resumed',
  'adjustment.created',
  'adjustment.updated',
];

async function paddle(method, urlPath, body) {
  const res = await fetch(`${BASE}${urlPath}`, {
    method,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'Paddle-Version': '1',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const payload = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(`${method} ${urlPath} → ${res.status} ${payload?.error?.code ?? ''} ${payload?.error?.detail ?? ''}`);
  }
  return payload.data;
}

console.log(`Paddle ${environment} — ${BASE}\n`);

try {
  const existing = await paddle('GET', '/products?per_page=200&status=active');
  console.log('✔ API key is valid');

  const lines = [];
  const productIds = {};
  for (const productConfig of PRODUCTS) {
    let product = existing.find((p) => p.name === productConfig.name);
    if (product) {
      console.log(`✔ Found product "${productConfig.name}" (${product.id})`);
    } else {
      product = await paddle('POST', '/products', {
        name: productConfig.name,
        description: productConfig.description,
        tax_category: 'standard',
      });
      console.log(`✔ Created product "${productConfig.name}" (${product.id})`);
    }
    lines.push(`${productConfig.env}=${product.id}`);
    productIds[productConfig.env] = product.id;
  }

  const existingPrices = await paddle('GET', '/prices?per_page=200&status=active&type=standard');
  for (const priceConfig of PRICES) {
    const productId = productIds[priceConfig.productEnv];
    let price = existingPrices.find((candidate) =>
      candidate.product_id === productId &&
      candidate.unit_price.amount === priceConfig.amount &&
      candidate.unit_price.currency_code === 'USD' &&
      (candidate.billing_cycle?.interval ?? null) === priceConfig.interval &&
      (candidate.billing_cycle?.frequency ?? null) === (priceConfig.interval ? 1 : null),
    );
    if (price) {
      console.log(`✔ Found price "${priceConfig.name}" (${price.id})`);
    } else {
      price = await paddle('POST', '/prices', {
        product_id: productId,
        type: 'standard',
        name: priceConfig.name,
        description: priceConfig.description,
        unit_price: { amount: priceConfig.amount, currency_code: 'USD' },
        billing_cycle: priceConfig.interval ? { interval: priceConfig.interval, frequency: 1 } : null,
        quantity: { minimum: 1, maximum: 1 },
        tax_mode: 'account_setting',
      });
      console.log(`✔ Created price "${priceConfig.name}" (${price.id})`);
    }
    lines.push(`${priceConfig.env}=${price.id}`);
  }

  if (webhookUrl) {
    if (!/^https:\/\//.test(webhookUrl)) fail('--webhook-url must be a public https URL');
    const destination = await paddle('POST', '/notification-settings', {
      description: 'ZapMorph app',
      destination: webhookUrl,
      type: 'url',
      subscribed_events: WEBHOOK_EVENTS,
      api_version: 1,
    });
    console.log(`✔ Created notification destination → ${webhookUrl}`);
    lines.push(`PADDLE_WEBHOOK_SECRET=${destination.endpoint_secret_key}`);
  }

  console.log('\nAdd to your environment:\n');
  console.log(`PADDLE_ENV=${environment}`);
  for (const line of lines) console.log(line);
  console.log(`
Still to do in the Paddle dashboard:
  • Developer tools → Authentication → create a client-side token → NEXT_PUBLIC_PADDLE_CLIENT_TOKEN
  • Checkout → Checkout settings → Default payment link: https://yourdomain.com/pay
    (http://localhost:3000/pay is fine in sandbox) — checkout fails until this is set${webhookUrl ? '' : '\n  • Re-run with --webhook-url https://<your-domain>/api/webhooks/paddle to create the webhook'}
  • Production only: complete website/domain review for your domain`);
} catch (err) {
  fail(err.message);
}
