# ZapMorph

Private, instant file conversion in the browser — 36 converters for images, PDFs,
spreadsheets, data, audio and video. Files never leave the user's device.
Freemium with Pro subscriptions and a Lifetime plan sold through Paddle.

**Production domain:** zapmorph.com

**Stack:** Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS 4 ·
Supabase (Auth + Postgres + RLS) · Paddle Billing · pdf.js · pdf-lib · ffmpeg.wasm · ExcelJS

## Docs

| Doc | What's in it |
|---|---|
| [docs/PLAN.md](docs/PLAN.md) | Product thesis, converter roadmap, pricing strategy, architecture, milestones |
| [docs/PADDLE.md](docs/PADDLE.md) | Paddle setup, checkout/webhook flows, go-live checklist |

## Setup

1. **Install** — `npm install` (also copies pdf.js and ffmpeg engine assets into `public/vendor`).
2. **Environment** — copy `.env.example` to `.env.local` and fill in Supabase URL,
   anon key and service-role key, `USAGE_HASH_SECRET` (`openssl rand -base64 32`),
   and the Paddle values (see [docs/PADDLE.md](docs/PADDLE.md)). Converters work
   without Paddle; checkout shows "temporarily unavailable" until it's configured.
3. **Database**

   ```bash
   supabase link --project-ref <your-project-ref>
   supabase db push
   ```

4. **Supabase Auth** — enable email confirmation, set Site URL and the
   `/auth/callback` redirect URL, optionally enable Google, and turn on
   leaked-password protection.
5. **Paddle** — `npm run paddle:setup` (see [docs/PADDLE.md](docs/PADDLE.md)).
6. **Run**

   ```bash
   npm run dev          # http://localhost:3000
   npm run build
   npm run lint
   npm run type-check
   ```

## Troubleshooting

### "I can convert unlimited times without signing in"

Daily limits live in Postgres, not in the browser. Before each run the client
calls `POST /api/usage`, which records the conversion with the `consume_usage`
function and returns `403` once the plan's limit is reached.

If Supabase isn't configured (no `.env.local`, wrong keys, or migrations not
applied), that call fails — and the client **fails open on purpose**, because a
backend outage shouldn't block a conversion that runs entirely on the user's own
device. The browser console says so explicitly:

```
[usage] daily limits are NOT being enforced — /api/usage returned 503.
```

To enforce limits locally: create a Supabase project, fill in `.env.local`, run
`supabase db push`, restart `npm run dev`, then check
`curl localhost:3000/api/health` — it must report `"db": "connected"`.

Two things to know once it works:

- **On localhost every visitor looks like one person.** Anonymous quota is keyed
  to a hashed IP, and local requests have no `x-forwarded-for` header, so they
  all share `127.0.0.1`. Sign-in accounts are counted per user id.
- **The quota is an upgrade prompt, not DRM.** Because conversions run
  client-side, a determined user can bypass the check. That costs us nothing
  (their CPU does the work); the Phase 2 server-side converters are the ones
  enforced for real.

## Project layout

```
src/
  app/
    (marketing)/          home, /converters, /convert/[slug] (static SEO pages), /pricing, legal
    (auth)/               login, signup, password reset
    (dashboard)/dashboard overview (plan + usage), billing
    checkout/, pay/       Paddle inline checkout, payment-link landing
    api/usage             daily quota check before each conversion
    api/checkout/*        transaction creation + status polling
    api/webhooks/paddle   signed Paddle events
  components/converter/   converter tool UI, cards, directory
  lib/converters/
    catalog.ts            every converter's metadata + SEO copy (add new converters here)
    run.ts                slug → engine
    engines/              image, heic, ico, pdf, data, sheet, media (ffmpeg.wasm)
  lib/billing/            checkout, fulfillment, subscriptions, entitlements
  lib/paddle/             REST client, webhook signature + IP verification
supabase/migrations/      schema, RLS policies, usage + rate-limit functions
```

## Adding a converter

1. Add an entry to `CONVERTERS` in `src/lib/converters/catalog.ts` (slug, formats, copy, tier, options).
2. Add a runner for the slug in `src/lib/converters/run.ts`.

The landing page, sitemap entry, directory card and footer link are generated automatically.
