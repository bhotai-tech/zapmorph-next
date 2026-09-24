import type { Metadata } from 'next';
import Link from 'next/link';
import { Check, Minus, ShieldCheck } from 'lucide-react';
import { PricingCards } from '@/components/marketing/pricing-cards';
import { Faq, faqJsonLd, type FaqItem } from '@/components/marketing/faq';
import { siteConfig } from '@/config/site';
import { formatUsd } from '@/lib/plans';
import { getLivePlans } from '@/lib/plans-live';
import { PLAN_LIMITS, formatBytes } from '@/lib/usage-limits';

// Prerendered + ISR so live DB prices show without a redeploy.
export const revalidate = 300;

export async function generateMetadata(): Promise<Metadata> {
  const plans = await getLivePlans();
  return {
    title: 'Pricing',
    description: `Free file converters for everyday use. Pro unlocks unlimited conversions, 1 GB files and audio/video tools from ${formatUsd(plans['pro-yearly'].usd / 12)}/month, or pay once with Lifetime.`,
    alternates: { canonical: '/pricing' },
  };
}

type Cell = string | boolean;

const { anonymous, free, pro } = PLAN_LIMITS;

const ROWS: { label: string; free: Cell; pro: Cell; lifetime: Cell }[] = [
  {
    label: 'Files per day',
    free: `${anonymous.filesPerDay} (no account) · ${free.filesPerDay} (free account)`,
    pro: 'Unlimited',
    lifetime: 'Unlimited',
  },
  {
    label: 'Maximum file size',
    free: `${formatBytes(anonymous.maxFileBytes)} · ${formatBytes(free.maxFileBytes)}`,
    pro: formatBytes(pro.maxFileBytes),
    lifetime: formatBytes(pro.maxFileBytes),
  },
  { label: 'Files per batch', free: `${anonymous.maxBatch} · ${free.maxBatch}`, pro: String(pro.maxBatch), lifetime: String(pro.maxBatch) },
  { label: 'Image, PDF & data converters', free: true, pro: true, lifetime: true },
  { label: 'Audio & video converters', free: '1 run/day (free account)', pro: true, lifetime: true },
  { label: 'Split PDF & Pro PDF tools', free: '1 run/day (free account)', pro: true, lifetime: true },
  { label: 'ZIP download for batches', free: true, pro: true, lifetime: true },
  { label: 'No watermarks, files never uploaded', free: true, pro: true, lifetime: true },
  { label: 'Upcoming DOCX↔PDF, OCR & compression', free: false, pro: true, lifetime: true },
  { label: 'Priority email support', free: false, pro: true, lifetime: true },
];

const FAQ: FaqItem[] = [
  {
    question: 'Can I cancel anytime?',
    answer:
      'Yes. Cancel auto-renewal from your dashboard in one click. You keep Pro until the end of the period you’ve paid for and won’t be charged again.',
  },
  {
    question: 'Do you offer refunds?',
    answer:
      'Yes — every paid plan comes with a 14-day money-back guarantee. Contact support within 14 days of purchase for a full refund. See our refund policy for details.',
  },
  {
    question: 'What’s the difference between Pro and Lifetime?',
    answer:
      'They include exactly the same features. Pro is billed monthly or yearly; Lifetime is a single payment that gives you Pro forever, including every converter we add in the future.',
  },
  {
    question: 'I already have Pro. Can I switch to Lifetime?',
    answer:
      'Yes. Buy Lifetime from this page and your subscription is automatically set to stop renewing, so you are never charged twice.',
  },
  {
    question: 'Who handles payments and taxes?',
    answer:
      'Payments are processed securely by Paddle, our Merchant of Record. Paddle handles VAT and sales tax, accepts cards, PayPal, Apple Pay and Google Pay, and emails your invoice.',
  },
  {
    question: 'Do you offer discounts for teams or education?',
    answer: `Get in touch through our contact page or at ${siteConfig.supportEmail} — we’re happy to help schools, non-profits and teams.`,
  },
];

function Value({ value }: { value: Cell }) {
  if (value === true) return <Check aria-label="Included" className="mx-auto h-5 w-5 text-primary" />;
  if (value === false) return <Minus aria-label="Not included" className="mx-auto h-5 w-5 text-muted/60" />;
  return <span>{value}</span>;
}

export default async function PricingPage() {
  const plans = await getLivePlans();
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 sm:py-16">
      <div className="text-center">
        <h1 className="text-3xl font-bold tracking-tight sm:text-5xl">Simple, honest pricing</h1>
        <p className="mx-auto mt-4 max-w-2xl text-lg text-muted">
          Everyday conversions are free. Go Pro for unlimited use, bigger files and audio &amp; video tools.
        </p>
      </div>

      <div className="mt-12">
        <PricingCards plans={plans} />
      </div>

      <p className="mt-10 flex items-center justify-center gap-2 text-sm text-muted">
        <ShieldCheck aria-hidden className="h-4 w-4 text-primary" />
        14-day money-back guarantee · Secure checkout by Paddle · Cancel anytime
      </p>

      <section className="mt-24">
        <h2 className="text-center text-3xl font-bold tracking-tight">Compare plans</h2>
        <div className="mt-8 overflow-x-auto rounded-2xl border border-border bg-surface">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b border-border text-left">
                <th scope="col" className="px-3 py-4 font-medium text-muted sm:px-5">Features</th>
                <th scope="col" className="px-5 py-4 text-center font-semibold">Free</th>
                <th scope="col" className="px-5 py-4 text-center font-semibold text-primary">Pro</th>
                <th scope="col" className="px-5 py-4 text-center font-semibold">Lifetime</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {ROWS.map((row) => (
                <tr key={row.label}>
                  <th scope="row" className="px-5 py-3.5 text-left font-medium">{row.label}</th>
                  <td className="px-5 py-3.5 text-center text-muted"><Value value={row.free} /></td>
                  <td className="px-5 py-3.5 text-center"><Value value={row.pro} /></td>
                  <td className="px-5 py-3.5 text-center"><Value value={row.lifetime} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mx-auto mt-24 max-w-3xl">
        <h2 className="text-center text-3xl font-bold tracking-tight">Billing questions</h2>
        <div className="mt-8">
          <Faq items={FAQ} />
        </div>
        <p className="mt-6 text-center text-sm text-muted">
          Read the <Link href="/terms" className="underline">terms</Link> and{' '}
          <Link href="/refund-policy" className="underline">refund policy</Link>.
        </p>
      </section>

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd(FAQ)) }} />
    </div>
  );
}
