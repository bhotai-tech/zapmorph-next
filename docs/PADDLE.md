# Paddle Billing — setup, flows, testing, go-live

ZapMorph sells Pro through [Paddle Billing](https://developer.paddle.com/). Paddle
is the **Merchant of Record**: it runs checkout, collects payment, charges sales
tax / VAT, issues invoices, and processes refunds. This app never sees card details.

The integration is ported from the screen-masker project; the difference is
that a purchase grants a Pro **entitlement** instead of a license key.

## 1. Sandbox setup (≈10 minutes)

1. Create a [sandbox account](https://sandbox-login.paddle.com/signup).
2. **API key** — Developer tools → Authentication → *API keys*, with read/write on
   customers, transactions, subscriptions, products, notification settings, and
   customer portal sessions → `PADDLE_API_KEY`.
3. **Products and prices** — `npm run paddle:setup` verifies the key and creates
   (or reuses) *ZapMorph Pro* and *ZapMorph Lifetime*, with $9 monthly, $72 yearly,
   and $99 one-time catalog prices. Copy both `PADDLE_PRODUCT_ID_*` values into
   `.env.local` (the `PADDLE_PRICE_ID_*` values are informational; checkout prices
   come from the `plans` table).
4. **Client-side token** — Developer tools → Authentication → *Client-side tokens*
   → `NEXT_PUBLIC_PADDLE_CLIENT_TOKEN` (`test_…`).
5. **Default payment link** — Checkout → Checkout settings → *Default payment link*:
   `http://localhost:3000/pay`. Without it every checkout fails with
   `transaction_default_checkout_url_not_set`.
6. **Webhooks** — expose localhost with a tunnel (e.g. `cloudflared tunnel --url http://localhost:3000`), then
   `npm run paddle:setup -- --webhook-url https://<tunnel-host>/api/webhooks/paddle`
   and copy `PADDLE_WEBHOOK_SECRET`.
7. Restart `npm run dev` and buy a plan with test card `4242 4242 4242 4242`
   (any future expiry, any CVC).

`GET /api/health` reports `"payments": "configured"` once every Paddle variable is set.

## 2. Plans

| Plan id | Price (DB) | Paddle price | Result |
|---|---|---|---|
| `pro-monthly` | $9 | Pro product, inline price from DB, `billing_cycle: month` | subscription → entitlement until period end, extended on renewal |
| `pro-yearly` | $72 | Pro product, inline price from DB, `billing_cycle: year` | same, yearly |
| `pro-lifetime` | $99 | Lifetime product, inline price from DB, one-time | entitlement with no expiry; any running subscription is set to stop renewing |

Checkout prices the Paddle transaction straight from the `plans` row (a
non-catalog price on the product), so changing a price is one DB update plus
`src/lib/plans.ts` for the static fallback; the pricing page picks it up within
5 minutes (ISR). Existing subscriptions keep the price they were sold at.

## 3. How checkout works

```
/pricing → /checkout?plan=pro-yearly (login required)
  POST /api/checkout/transaction {planId}
    auth + rate limit + zod → verify catalog price against plans table → Paddle customer
    insert subscriptions (recurring) + orders → POST /transactions (price_id, custom_data: user/order/sub ids)
  Paddle.Checkout.open({ transactionId, displayMode: inline })
Paddle → POST /api/webhooks/paddle (transaction.completed, signed)
  verify → ledger → GET /transactions/:id → cross-check amount/currency/interval/order id
  → order paid → entitlements row → Pro
Browser → /checkout/status/:orderId (polls; also re-verifies with Paddle if the webhook is late)
```

- **Cancel auto-renewal** (Dashboard → Billing) schedules cancellation at period
  end; Pro continues until then. **Update payment method** and **Invoices & receipts**
  open Paddle's customer portal.
- **Refunds / chargebacks:** an approved *full* refund or any chargeback marks the
  order refunded, cancels the subscription immediately, and revokes Pro.
- **Account deletion** cancels live subscriptions immediately first and refuses to
  delete if that fails.

## 4. Webhooks

Endpoint `POST /api/webhooks/paddle`. Subscribe to `transaction.completed`,
`transaction.paid`, `subscription.created|updated|activated|canceled|past_due|paused|resumed`,
`adjustment.created|updated`.

Guarantees: production IP allowlist (live from `api.paddle.com/ips`, fails closed),
HMAC-SHA256 signature over the raw body (constant-time, all `h1` values for secret
rotation, 5-minute replay window), idempotency via unique `event_id`, handlers that
re-read state from the Paddle API, and non-2xx on failure so Paddle retries.

## 5. Checkout appearance

Style the embedded form in **Paddle → Checkout → Checkout settings → Branded inline checkout**:

| Setting | Value |
|---|---|
| Primary button / hover | `#0f766e` / `#115e59`, text `#ffffff` |
| Text / secondary text | `#0f1a19` / `#56655f` |
| Input border / focus | `#dfe6e3` / `#5eead4` |
| Border radius | `8px` |

## 6. Go-live checklist

- [ ] Paddle live account verified; domain review approved (terms, privacy, refund pages are in the footer and name Paddle as Merchant of Record)
- [ ] Live API key, client token (`live_…`), both product IDs and all three price IDs from `npm run paddle:setup` with the live key, default payment link `https://<domain>/pay`, webhook destination
- [ ] `PADDLE_ENV=production`; `PADDLE_API_BASE_URL` unset
- [ ] `/api/health` shows `db: connected`, `payments: configured`
- [ ] Real low-value purchase → Pro granted → refund from the Paddle dashboard → Pro revoked
