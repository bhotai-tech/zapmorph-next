import Link from 'next/link';
import {
  ArrowRight,
  Check,
  Clock,
  CloudOff,
  FolderArchive,
  Mic,
  Receipt,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Table2,
  Video,
  X,
  Zap,
} from 'lucide-react';
import { ButtonLink } from '@/components/ui/button';
import { HeroConverter } from '@/components/marketing/hero-converter';
import { ConverterCard } from '@/components/converter/converter-card';
import { CategoryIcon } from '@/components/converter/category-icon';
import { PricingCards } from '@/components/marketing/pricing-cards';
import { Faq, faqJsonLd, type FaqItem } from '@/components/marketing/faq';
import {
  CATEGORIES,
  CONVERTERS,
  POPULAR_CONVERTERS,
  convertersInCategory,
  getConverter,
  type CategoryKey,
} from '@/lib/converters/catalog';
import { PLAN_LIMITS, fileCount, formatBytes } from '@/lib/usage-limits';
import { formatUsd } from '@/lib/plans';
import { getLivePlans } from '@/lib/plans-live';

const CATEGORY_ORDER: CategoryKey[] = ['image', 'pdf', 'data', 'media'];

const FLOATING = [
  { label: 'HEIC', className: 'left-[3%] top-[26%] bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300' },
  { label: 'PDF', className: 'right-[4%] top-[20%] bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300' },
  { label: 'CSV', className: 'left-[6%] bottom-[24%] bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300' },
  { label: 'MP4', className: 'right-[5%] bottom-[28%] bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300' },
];

const THEM = [
  'Your file is uploaded to someone else’s server',
  'Wait to upload, wait in a queue, wait to download',
  'Free tiers cap file size and stamp watermarks',
  'Copies can sit on their servers for hours',
];

const US = [
  'Your file never leaves your device',
  'Conversion starts the instant you pick a file',
  'No watermarks on any plan — including Free',
  'Nothing is stored, so there’s nothing to leak',
];

const USE_CASES = [
  {
    icon: Smartphone,
    slug: 'heic-to-jpg',
    title: 'iPhone photos Windows can open',
    body: 'Turn HEIC camera photos into JPGs you can email, print or upload anywhere.',
  },
  {
    icon: Receipt,
    slug: 'jpg-to-pdf',
    title: 'Receipts and scans into one PDF',
    body: 'Combine photos of documents into a single PDF for expenses, forms and filing.',
  },
  {
    icon: Table2,
    slug: 'excel-to-csv',
    title: 'Spreadsheets into clean CSV',
    body: 'Export every sheet of a workbook for imports, databases and scripts.',
  },
  {
    icon: Mic,
    slug: 'mp4-to-mp3',
    title: 'The audio out of a video',
    body: 'Pull an MP3 from a lecture, interview or podcast recording in one step.',
  },
  {
    icon: Video,
    slug: 'video-to-gif',
    title: 'Bug reports and demos as GIFs',
    body: 'Turn a screen recording into a GIF that plays in chat, docs and tickets.',
  },
  {
    icon: FolderArchive,
    slug: 'pdf-to-jpg',
    title: 'PDF pages as images',
    body: 'Drop document pages into slides or posts at up to print resolution.',
  },
];

const FAQ: FaqItem[] = [
  {
    question: 'Are my files uploaded anywhere?',
    answer:
      'No. Every conversion runs inside your browser using WebAssembly and built-in browser technology. Your files never leave your device, so they can’t be stored, leaked or seen by anyone — including us.',
  },
  {
    question: 'Is it really free?',
    answer: `Yes. Image, PDF and data converters are free: ${fileCount(PLAN_LIMITS.anonymous.filesPerDay ?? 0)} a day without an account, or ${fileCount(PLAN_LIMITS.free.filesPerDay ?? 0)} a day with a free account. Pro removes the limits and adds audio and video tools.`,
  },
  {
    question: 'Do converted files have a watermark?',
    answer: 'Never. Files you convert on any plan, including Free, are yours with no watermark or branding added.',
  },
  {
    question: 'Why is it faster than other converters?',
    answer:
      'Most online converters upload your file, queue it on a server, then make you download the result. We skip both transfers — the conversion starts the moment you pick a file.',
  },
  {
    question: 'Which devices and browsers are supported?',
    answer:
      'Any modern browser — Chrome, Edge, Firefox and Safari — on Windows, macOS, Linux, iPhone, iPad and Android. There is nothing to install.',
  },
];

// ISR so live DB prices show without a redeploy.
export const revalidate = 300;

export default async function HomePage() {
  const plans = await getLivePlans();
  const proMonthly = plans['pro-yearly'].usd / 12;

  return (
    <>
      {/* ── Hero: the tool itself ─────────────────────────────────────────── */}
      <section id="convert" className="relative overflow-hidden scroll-mt-20 border-b border-border">
        <div aria-hidden className="pointer-events-none absolute inset-0 bg-grid opacity-60" />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(70%_55%_at_50%_-5%,var(--primary-soft),transparent)]"
        />
        {FLOATING.map((badge) => (
          <span
            key={badge.label}
            aria-hidden
            className={`pointer-events-none absolute hidden rounded-xl px-2.5 py-1 font-mono text-[11px] font-bold opacity-80 shadow-sm animate-float lg:block ${badge.className}`}
            style={{ animationDelay: `${badge.label.length * 0.4}s` }}
          >
            {badge.label}
          </span>
        ))}

        <div className="relative mx-auto w-full max-w-3xl px-4 pb-12 pt-9 sm:px-6 sm:pt-12">
          <div className="text-center">
            <p className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3.5 py-1.5 text-xs font-semibold shadow-sm">
              <CloudOff aria-hidden className="h-3.5 w-3.5 text-primary" />
              {CONVERTERS.length} converters · nothing is uploaded
            </p>
            <h1 className="mx-auto mt-5 max-w-2xl text-[2.05rem] font-bold leading-[1.08] tracking-tight sm:text-5xl">
              Convert any file in seconds
              <span className="block bg-gradient-to-r from-primary to-sky-600 bg-clip-text text-transparent dark:to-sky-400">
                without uploading it
              </span>
            </h1>
            <p className="mx-auto mt-4 max-w-xl text-base leading-7 text-muted sm:text-lg">
              Images, PDFs, spreadsheets, data, audio and video — converted by your own browser. Private, instant,
              no watermarks.
            </p>
          </div>

          <div className="mt-7 rounded-[32px] border border-border bg-surface/60 p-3 shadow-2xl shadow-primary/5 backdrop-blur">
            <HeroConverter />
          </div>

          <ul className="mt-7 flex flex-wrap items-center justify-center gap-x-7 gap-y-3 text-sm font-medium">
            {[
              [ShieldCheck, 'Files stay on your device'],
              [Zap, 'No upload, no queue'],
              [Sparkles, 'No sign-up to start'],
            ].map(([Icon, label]) => {
              const Glyph = Icon as typeof ShieldCheck;
              return (
                <li key={label as string} className="flex items-center gap-2">
                  <Glyph aria-hidden className="h-4 w-4 text-primary" />
                  {label as string}
                </li>
              );
            })}
          </ul>
        </div>
      </section>

      {/* ── Proof strip ───────────────────────────────────────────────────── */}
      <section className="border-b border-border bg-surface">
        <dl className="mx-auto grid w-full max-w-6xl grid-cols-2 divide-border px-4 py-10 sm:px-6 md:grid-cols-4 md:divide-x">
          {[
            [`${CONVERTERS.length}`, 'converters, one place'],
            ['0 KB', 'of your files uploaded'],
            [formatBytes(PLAN_LIMITS.pro.maxFileBytes), 'max file size on Pro'],
            [`${formatUsd(0)}`, 'to start — no card'],
          ].map(([value, label]) => (
            <div key={label} className="px-2 py-3 text-center">
              <dt className="text-3xl font-bold tracking-tight text-primary tabular-nums">{value}</dt>
              <dd className="mt-1 text-sm text-muted">{label}</dd>
            </div>
          ))}
        </dl>
      </section>

      {/* ── Why this is different ─────────────────────────────────────────── */}
      <section className="mx-auto w-full max-w-6xl px-4 py-14 sm:px-6 sm:py-20">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Every other converter asks you to upload first
          </h2>
          <p className="mt-3 text-lg text-muted">
            That’s the slow part — and the risky part when the file is a contract, an ID or a medical scan.
          </p>
        </div>

        <div className="mt-10 grid gap-6 sm:mt-12 lg:grid-cols-2">
          <div className="rounded-3xl border border-border bg-surface-2/60 p-5 sm:p-7">
            <p className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-muted">
              <Clock aria-hidden className="h-4 w-4" />
              Typical online converter
            </p>
            <ul className="mt-6 space-y-4">
              {THEM.map((item) => (
                <li key={item} className="flex gap-3 text-muted">
                  <X aria-hidden className="mt-0.5 h-5 w-5 shrink-0 text-red-500" />
                  {item}
                </li>
              ))}
            </ul>
          </div>

          <div className="relative rounded-3xl border border-primary bg-surface p-5 shadow-xl sm:p-7 ring-1 ring-primary">
            <p className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-primary">
              <ShieldCheck aria-hidden className="h-4 w-4" />
              This site
            </p>
            <ul className="mt-6 space-y-4">
              {US.map((item) => (
                <li key={item} className="flex gap-3">
                  <Check aria-hidden className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                  {item}
                </li>
              ))}
            </ul>
            <div className="mt-7 flex items-center gap-4 rounded-2xl bg-primary-soft p-4">
              <svg aria-hidden viewBox="0 0 120 56" className="h-14 w-28 shrink-0">
                <rect x="1" y="6" width="54" height="44" rx="7" className="fill-surface stroke-primary" strokeWidth="2" />
                <rect x="9" y="16" width="26" height="4" rx="2" className="fill-primary opacity-70" />
                <rect x="9" y="26" width="38" height="4" rx="2" className="fill-primary opacity-40" />
                <rect x="9" y="36" width="20" height="4" rx="2" className="fill-primary opacity-40" />
                <path d="M60 28h22" className="stroke-muted" strokeWidth="2" strokeDasharray="4 4" />
                <path
                  d="M96 34a8 8 0 0 1 1-16 11 11 0 0 1 21 3 6 6 0 0 1-2 13H96z"
                  className="fill-none stroke-muted"
                  strokeWidth="2"
                  opacity="0.5"
                />
                <path d="M84 16l28 26" className="stroke-red-500" strokeWidth="2.5" strokeLinecap="round" />
              </svg>
              <p className="text-sm leading-6">
                <strong className="font-semibold">Your browser is the server.</strong> The cloud never sees the file —
                which is why it’s fast and why sensitive documents are safe here.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Categories ────────────────────────────────────────────────────── */}
      <section className="border-y border-border bg-surface">
        <div className="mx-auto w-full max-w-6xl px-4 py-14 sm:px-6 sm:py-20">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">Pick a category</h2>
            <Link href="/converters" className="flex items-center gap-1 text-sm font-medium text-primary hover:underline">
              All {CONVERTERS.length} converters
              <ArrowRight aria-hidden className="h-4 w-4" />
            </Link>
          </div>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {CATEGORY_ORDER.map((key) => (
              <Link
                key={key}
                href={`/converters#${key}`}
                className="group rounded-2xl border border-border bg-background p-6 transition-all hover:-translate-y-1 hover:border-primary/40 hover:shadow-lg"
              >
                <CategoryIcon category={key} size="lg" />
                <h3 className="mt-4 text-lg font-semibold">{CATEGORIES[key].name}</h3>
                <p className="mt-1 text-sm leading-6 text-muted">{CATEGORIES[key].description}</p>
                <p className="mt-4 flex items-center gap-1 text-sm font-semibold text-primary">
                  {convertersInCategory(key).length} tools
                  <ArrowRight aria-hidden className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── Use cases ─────────────────────────────────────────────────────── */}
      <section className="mx-auto w-full max-w-6xl px-4 py-14 sm:px-6 sm:py-20">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">What people convert here</h2>
          <p className="mt-3 text-lg text-muted">Everyday jobs that shouldn’t need an account or an upload.</p>
        </div>
        <div className="mt-12 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {USE_CASES.map(({ icon: Icon, slug, title, body }) => {
            const converter = getConverter(slug);
            return (
              <Link
                key={slug}
                href={`/convert/${slug}`}
                className="group flex gap-4 rounded-2xl border border-border bg-surface p-6 transition-all hover:-translate-y-1 hover:border-primary/40 hover:shadow-lg"
              >
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-primary-soft text-primary">
                  <Icon aria-hidden className="h-5 w-5" />
                </span>
                <span>
                  <span className="block font-semibold">{title}</span>
                  <span className="mt-1 block text-sm leading-6 text-muted">{body}</span>
                  <span className="mt-3 flex items-center gap-1 text-sm font-medium text-primary">
                    {converter?.title.replace(/ Converter$/, '')}
                    <ArrowRight aria-hidden className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                  </span>
                </span>
              </Link>
            );
          })}
        </div>
      </section>

      {/* ── Popular converters ────────────────────────────────────────────── */}
      <section className="border-y border-border bg-surface">
        <div className="mx-auto w-full max-w-6xl px-4 py-14 sm:px-6 sm:py-20">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 className="text-3xl font-bold tracking-tight">Most popular converters</h2>
              <p className="mt-2 text-muted">The tools people open every day.</p>
            </div>
            <Link href="/converters" className="flex items-center gap-1 text-sm font-medium text-primary hover:underline">
              View all {CONVERTERS.length}
              <ArrowRight aria-hidden className="h-4 w-4" />
            </Link>
          </div>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {POPULAR_CONVERTERS.slice(0, 8).map((converter) => (
              <ConverterCard key={converter.slug} converter={converter} />
            ))}
          </div>
        </div>
      </section>

      {/* ── Pricing ───────────────────────────────────────────────────────── */}
      <section className="mx-auto w-full max-w-6xl px-4 py-14 sm:px-6 sm:py-20">
        <div className="mx-auto max-w-2xl text-center">
          <p className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary">
            <Sparkles aria-hidden className="h-4 w-4" /> Pricing
          </p>
          <h2 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
            Free for everyday use. {formatUsd(proMonthly)}/month when you need more.
          </h2>
          <p className="mt-3 text-lg text-muted">
            Pro lifts every limit and unlocks audio and video. Or pay once and keep it forever.
          </p>
        </div>
        <div className="mt-12">
          <PricingCards plans={plans} />
        </div>
      </section>

      {/* ── FAQ ───────────────────────────────────────────────────────────── */}
      <section className="mx-auto w-full max-w-3xl px-4 pb-20 sm:px-6">
        <h2 className="text-center text-3xl font-bold tracking-tight">Frequently asked questions</h2>
        <div className="mt-8">
          <Faq items={FAQ} />
        </div>
      </section>

      {/* ── Closing CTA ───────────────────────────────────────────────────── */}
      <section className="mx-auto w-full max-w-6xl px-4 pb-24 sm:px-6">
        <div className="relative overflow-hidden rounded-3xl border border-primary/30 bg-gradient-to-br from-primary-soft to-surface px-6 py-14 text-center">
          <div aria-hidden className="pointer-events-none absolute inset-0 bg-grid opacity-40" />
          <div className="relative">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Try it with your own file</h2>
            <p className="mx-auto mt-3 max-w-lg text-muted">
              Nothing to install, nothing to sign up for, and nothing leaves your device.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <ButtonLink href="/#convert" size="lg">
                Convert a file now
                <ArrowRight aria-hidden className="h-4 w-4" />
              </ButtonLink>
              <ButtonLink href="/pricing" size="lg" variant="secondary">
                See Pro plans
              </ButtonLink>
            </div>
          </div>
        </div>
      </section>

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd(FAQ)) }} />
    </>
  );
}
