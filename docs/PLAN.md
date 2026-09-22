# ZapMorph — product & engineering plan

> Private, instant file conversion in the browser. Files never leave the device.

## 1. Product thesis

File converters are one of the highest-intent search categories on the web
("png to jpg", "heic to jpg", "mp4 to mp3", "merge pdf" — millions of monthly
searches). Incumbents (CloudConvert, Zamzar, iLovePDF, FreeConvert) upload every
file to their servers, which means waiting for uploads, size caps, queues, and a
privacy question for anything sensitive (contracts, IDs, medical scans).

**Our wedge:** conversions run locally in the browser (Canvas, WebAssembly,
pdf.js, ffmpeg.wasm). That gives us three things competitors can't match cheaply:

| For users | For the business |
|---|---|
| Nothing is uploaded — safe for sensitive files | Near-zero compute cost per conversion (the user's CPU does the work) |
| No upload/download wait, works on slow connections | Gross margin ~95%+ even on the free tier |
| Batch converts without queues | Scales on a static CDN; no worker fleet in v1 |

**Target users:** (1) one-off searchers from Google (acquisition), (2) repeat
"prosumers" — marketers, designers, students, admins, developers — who convert
weekly (monetization), (3) privacy-sensitive professionals (legal, HR, health)
who can't upload files to third parties (premium positioning).

## 2. Converter catalog

### Phase 1 — shipped in this repo (50 tools, all in-browser)

| Category | Converters | Engine | Tier |
|---|---|---|---|
| Image (15) | PNG→JPG, JPG→PNG, WEBP→JPG, WEBP→PNG, JPG→WEBP, PNG→WEBP, HEIC→JPG, HEIC→PNG, SVG→PNG, SVG→JPG, AVIF→JPG, AVIF→PNG, BMP→JPG, GIF→PNG, PNG→ICO | Canvas, heic-to (libheif wasm, CSP-safe build) | Free |
| PDF (8) | JPG→PDF, PNG→PDF, HEIC→PDF, TXT→PDF, PDF→JPG, PDF→PNG, PDF→Text, Merge PDF | pdf-lib, pdf.js | Free |
| PDF (Pro) | Split PDF | pdf-lib | Pro |
| Data & documents (14) | CSV→JSON, JSON→CSV, JSON→YAML, YAML→JSON, XML→JSON, JSON→XML, XML→CSV, CSV→XML, CSV→Excel, JSON→Excel, Excel→CSV, Excel→JSON, Markdown→HTML, HTML→Markdown | PapaParse, js-yaml, fast-xml-parser, ExcelJS, marked, Turndown | Free |
| Audio & video (12) | MP4→MP3, WAV→MP3, M4A→MP3, FLAC→MP3, OGG→MP3, MP3→WAV, Video→GIF, GIF→MP4, MOV→MP4, WEBM→MP4, MKV→MP4, AVI→MP4 | ffmpeg.wasm (single-thread core, self-hosted) | Pro |

Why this set: image + PDF + data formats cover the highest search volume and are
cheap to run in a browser, so they're free and act as the SEO acquisition
engine. Audio/video conversions are CPU-heavy, clearly "worth paying for", and
are the natural upgrade trigger.

Every converter is one entry in `src/lib/converters/catalog.ts` (metadata, SEO
copy, options, tier) plus a function in an engine module. Adding a converter is
~20 lines and automatically gets its own statically generated landing page,
sitemap entry, and directory card.

### Phase 2 — server-side worker (weeks 5–10)

Formats that need native binaries and can't run well in a browser. Runs on a
queue-backed worker (Cloud Run / Fly.io container with LibreOffice, Ghostscript,
Tesseract, Calibre), files in Supabase Storage with 1-hour TTL, Pro-only.

- DOCX↔PDF, PPTX→PDF, XLSX→PDF, ODT→DOCX (LibreOffice)
- Compress PDF, PDF→PDF/A (Ghostscript)
- OCR: scanned PDF/image → searchable PDF / text (Tesseract)
- EPUB↔MOBI↔PDF (Calibre)
- RAW (CR2/NEF/ARW) → JPG, PSD → PNG

### Phase 3 — expansion (months 3–6)

- **Developer API** (usage-based: $0.002–0.01 per conversion, API keys, webhooks) — the CloudConvert business model
- **Teams** plan (seats, shared billing, SSO later)
- Desktop app (Tauri) + browser extension "right-click → convert"
- Automations: watch folder / Zapier / Make integrations

## 3. Monetization

### Pricing

| | Free | Pro | Lifetime |
|---|---|---|---|
| Price | $0 | **$9/mo** or **$72/yr** ($6/mo, save 33%) | **$99 once** (launch price, anchored at $149) |
| Files per day | 1 signed-out · 5 signed-in | Unlimited | Unlimited |
| Max file size | 25 MB signed-out · 50 MB signed-in | 1 GB | 1 GB |
| Files per batch | 3 · 5 | 50 | 50 |
| Audio/video & Pro tools | — · 1 trial run/day | Unlimited | Unlimited |
| Future server converters (Phase 2) | — | Included | Included |

Rationale:

- **Freemium with a tight free tier.** Free users are still the SEO flywheel
  (links, shares, brand searches) and every image, PDF and data converter stays
  free — but the daily quota is small enough that a returning user meets it fast.
- **Three-step funnel:** anonymous (1 file/day, no Pro tools) → *sign up*
  (5 files/day, 50 MB files, one Pro-tool run a day) → *Pro* (unlimited, 1 GB,
  all audio/video and advanced PDF). The free account gives us an email for
  lifecycle nudges and lets people feel the Pro tools once before paying —
  trying MP4→MP3 and hitting the next-day wall is the strongest upgrade moment.
- **Watch the drop-off.** A 1-file limit converts hard but can also turn a
  first-time visitor away before they see the product work; the hero lets them
  finish one conversion first. Track signup rate and bounce after the limit
  screen, and loosen the anonymous quota if the top of the funnel dries up.
- **$9/mo anchors, $72/yr is the target plan.** Yearly is pre-selected on the
  pricing page; most revenue should come from annual prepay (lower churn,
  better cash flow).
- **Lifetime at $99** converts the subscription-averse audience that dominates
  utility-tool buyers, and funds early growth. Revisit (raise or remove) once
  MRR is stable; existing lifetime buyers stay grandfathered.
- **Upgrade triggers in product:** limit reached, file too large, batch too
  big, Pro-tool paywall — each shows a contextual upgrade card rather than a
  generic error.

### Payments — Paddle Billing (Merchant of Record)

Paddle handles checkout, global sales tax/VAT, invoices, dunning, and refunds,
so we don't register for tax in every country. Implementation mirrors the
hardened flow from the screen-masker project:

- Each plan has a Paddle catalog price. Before creating a transaction, the
  server checks its amount and billing period against the `plans` table; the
  browser never sends an amount.
- Inline Paddle checkout embedded next to our own order summary.
- Signed webhooks (HMAC, constant-time, replay window, secret rotation),
  production IP allowlist, idempotency ledger, and handlers that always re-read
  state from the Paddle API.
- Monthly/yearly plans are Paddle subscriptions; renewals extend the same
  entitlement. Lifetime is a one-time transaction; buying it schedules any
  running subscription to stop renewing.
- Full refunds and chargebacks revoke Pro immediately; cancelling auto-renew
  keeps Pro until the paid period ends.

### Metrics to run the business on

- Acquisition: organic sessions per converter page, top converters by runs (`converter_stats`)
- Activation: % visitors completing a conversion, signup rate after limit hit
- Monetization: paywall view → checkout start → paid conversion, ARPU, plan mix
- Retention: weekly converting users, subscription churn, refund rate

## 4. Growth plan

0. **The home page is a demo, not a pitch** — the hero is a working dropzone:
   drop any file, we detect its type, offer the conversions that fit, and run
   the real tool inline. Visitors experience the product in one action, before
   reading a single claim, which is what makes the Pro upsell credible later.
1. **Programmatic SEO** — one static page per converter (`/convert/png-to-jpg`)
   with unique title/description, "what is PNG / what is JPG" sections, how-to
   steps, FAQ schema (JSON-LD), and related converters for internal linking.
2. **Privacy positioning** — "your files never leave your device" on every page;
   target "secure/offline/private X converter" long-tail queries.
3. **Product-led loops** — shareable results, "converted with ZapMorph"
   footer in HTML exports (opt-out for Pro), directory submissions
   (Product Hunt, AlternativeTo, There's An AI/Tool For That).
4. **Content** — comparison pages ("HEIC vs JPG"), and later a blog.
5. **Paid** only after organic conversion rates are known.

## 5. Architecture

```
Browser (Next.js client)                      Server (Next.js route handlers)        External
────────────────────────                      ───────────────────────────────        ────────
/convert/[slug]  (static, SEO)
 ├─ pick files → POST /api/usage ───────────▶ identify user | hashed IP
 │                                            tier from entitlements
 │                                            consume_usage() in Postgres (atomic)
 │  ◀──────────── allowed / reason ───────────
 ├─ run engine locally (Canvas/wasm/pdf.js/ffmpeg.wasm)
 └─ download (object URLs, zip for batches)

/pricing → /checkout?plan=… ─ POST /api/checkout/transaction ─▶ price from DB ─▶ Paddle transaction
Paddle inline checkout ─────────────────────────────────────────────────────────▶ Paddle
                                              POST /api/webhooks/paddle ◀──────── signed events
                                              fulfill → entitlements row (Pro)
```

- **Stack:** Next.js 16 (App Router, Turbopack), React 19, TypeScript, Tailwind 4,
  Supabase (Auth + Postgres + RLS), Paddle Billing, zod.
- **Rendering:** marketing and converter pages are statically prerendered; auth
  state in the navbar is detected client-side so they stay static and CDN-cached.
- **Engines** are dynamically imported per converter, so a PNG→JPG visitor never
  downloads ffmpeg (32 MB wasm) or pdf.js.
- **Heavy vendor assets** (pdf.js worker, ffmpeg core) are copied to
  `public/vendor` on install and served same-origin (strict CSP, no third-party CDN).

### Data model (Supabase)

| Table | Purpose | Client access |
|---|---|---|
| `profiles` | 1:1 with `auth.users` | read/update own |
| `plans` | authoritative prices | public read (active) |
| `billing_customers` | user ↔ Paddle customer | none |
| `orders`, `payments` | billing history per Paddle transaction | read own |
| `subscriptions` | mirror of Paddle subscriptions | read own |
| `entitlements` | Pro access (lifetime: no expiry; subscription: period end) | read own |
| `usage_daily` | files/Pro runs per subject per UTC day | none |
| `converter_stats` | runs per converter per day (product analytics) | none |
| `webhook_events`, `audit_logs`, `rate_limits` | ops & security | none |

All entitlement and money writes use the service-role client in server code only.

### Limits enforcement — honest trade-off

Because free conversions run client-side, a determined user could bypass the
browser's quota check. That's acceptable: the cost of a bypassed free
conversion is zero, and the quota's job is to create an upgrade moment for
normal users. Phase 2 server-side converters are enforced fully on the server.

## 6. Security checklist (carried over from screen-masker)

- Env validated with zod at boot; live/sandbox Paddle key mismatch refuses to boot
- RLS on every table; no client write policies on money/entitlement tables
- Webhook: IP allowlist (prod), HMAC over raw body, idempotency, API re-reads
- Server-side price and plan validation; transaction ↔ order cross-check before granting Pro
- Rate limits (Postgres, fail closed in production) on auth, checkout, usage
- Strict CSP (`wasm-unsafe-eval` only, no `unsafe-eval` in prod), HSTS, frame-ancestors none
- Open-redirect-safe `redirectTo` handling; generic auth error messages

## 7. Milestones

| Week | Deliverable |
|---|---|
| 1 | ✅ Foundation: Next.js, Supabase schema, auth, 50 converters, SEO pages |
| 1 | ✅ Pricing page, Paddle checkout, webhooks, billing dashboard |
| 2 | Supabase + Paddle sandbox wired, end-to-end purchase test, deploy to Vercel |
| 2 | Analytics (PostHog/Plausible), Search Console, sitemap submission |
| 3 | Paddle live approval (terms/privacy/refund pages already included), launch |
| 4 | Content pages, comparison pages, Product Hunt launch |
| 5–10 | Phase 2 server worker: DOCX↔PDF, compress PDF, OCR |
| 12+ | Developer API, Teams |

## 8. Go-live checklist

- [ ] Supabase project: run `supabase db push`, enable email confirmation, Google OAuth, leaked-password protection, set Site URL + `/auth/callback` redirect
- [ ] Paddle sandbox: API key, client token, `npm run paddle:setup`, default payment link `/pay`, webhook destination
- [ ] Sandbox purchase of each plan (monthly, yearly, lifetime) → Pro granted; cancel; refund → Pro revoked
- [ ] Paddle live account + domain review (terms, privacy, refund pages linked in footer)
- [ ] Production env vars, `/api/health` shows `db: connected`, `payments: configured`
- [ ] Trademark/domain check for the final brand name (`src/config/site.ts`)
