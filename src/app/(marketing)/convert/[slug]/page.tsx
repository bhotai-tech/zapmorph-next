import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ChevronRight, ShieldCheck } from 'lucide-react';
import { siteConfig } from '@/config/site';
import { Badge } from '@/components/ui/card';
import { ConverterTool } from '@/components/converter/converter-tool';
import { ConverterCard } from '@/components/converter/converter-card';
import { CategoryIcon } from '@/components/converter/category-icon';
import { Faq, faqJsonLd } from '@/components/marketing/faq';
import {
  CATEGORIES,
  CONVERTERS,
  FORMATS,
  getConverter,
  relatedConverters,
} from '@/lib/converters/catalog';
import { converterFaq } from '@/lib/converters/faq';

export const dynamicParams = false;

export function generateStaticParams() {
  return CONVERTERS.map((converter) => ({ slug: converter.slug }));
}

export async function generateMetadata(props: PageProps<'/convert/[slug]'>): Promise<Metadata> {
  const { slug } = await props.params;
  const converter = getConverter(slug);
  if (!converter) return {};
  const title = `${converter.title} — Free, Private, No Upload`;
  return {
    title,
    description: converter.summary,
    alternates: { canonical: `/convert/${slug}` },
    // Metadata objects are shallow-merged, so the social image has to be
    // repeated here or these pages would inherit none.
    openGraph: {
      title,
      description: converter.summary,
      url: `/convert/${slug}`,
      type: 'website',
      images: [{ url: '/og.png', width: 1200, height: 630, alt: siteConfig.name }],
    },
    twitter: { card: 'summary_large_image', title, description: converter.summary, images: ['/og.png'] },
  };
}

export default async function ConverterPage(props: PageProps<'/convert/[slug]'>) {
  const { slug } = await props.params;
  const converter = getConverter(slug);
  if (!converter) notFound();

  const from = FORMATS[converter.from];
  const to = FORMATS[converter.to];
  const faq = converterFaq(converter);
  const related = relatedConverters(converter);
  const category = CATEGORIES[converter.category];
  const sameFormat = converter.from === converter.to;

  const steps = [
    {
      title: `Choose your ${from.label} file${converter.mode === 'single' ? '' : 's'}`,
      body: 'Click the upload area or drag files onto it. Nothing is uploaded — files are opened locally.',
    },
    {
      title: converter.options?.length ? 'Adjust the settings' : 'Start the conversion',
      body: converter.options?.length
        ? `Pick ${converter.options.map((option) => option.label.toLowerCase()).join(' and ')}, then press the convert button.`
        : 'Press the convert button. Your browser converts the files in seconds.',
    },
    {
      title: 'Download the result',
      body: 'Save each file individually or everything at once as a ZIP.',
    },
  ];

  const jsonLd = [
    {
      '@context': 'https://schema.org',
      '@type': 'SoftwareApplication',
      name: converter.title,
      description: converter.summary,
      applicationCategory: 'MultimediaApplication',
      operatingSystem: 'Any (web browser)',
      url: `${siteConfig.url}/convert/${converter.slug}`,
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
    },
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: siteConfig.url },
        { '@type': 'ListItem', position: 2, name: 'Converters', item: `${siteConfig.url}/converters` },
        { '@type': 'ListItem', position: 3, name: converter.title, item: `${siteConfig.url}/convert/${converter.slug}` },
      ],
    },
    faqJsonLd(faq),
  ];

  return (
    <>
      <section className="border-b border-border bg-[radial-gradient(70%_60%_at_50%_0%,var(--primary-soft),transparent)]">
        <div className="mx-auto w-full max-w-3xl px-4 pb-14 pt-8 sm:px-6">
          <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-1 text-sm text-muted">
            <Link href="/" className="shrink-0 py-2 hover:text-foreground">Home</Link>
            <ChevronRight aria-hidden className="h-3.5 w-3.5" />
            <Link href={`/converters#${converter.category}`} className="shrink-0 py-2 hover:text-foreground">{category.short}</Link>
            <ChevronRight aria-hidden className="h-3.5 w-3.5" />
            <span className="truncate text-foreground">{converter.title}</span>
          </nav>

          <div className="mt-8 text-center">
            <div className="flex items-center justify-center gap-2">
              <CategoryIcon category={converter.category} size="sm" />
              {converter.tier === 'pro' && <Badge tone="pro">Pro tool</Badge>}
            </div>
            <h1 className="mt-4 text-3xl font-bold tracking-tight [overflow-wrap:anywhere] sm:text-5xl">{converter.title}</h1>
            <p className="mx-auto mt-4 max-w-xl text-muted">{converter.summary}</p>
          </div>

          <div className="mt-8">
            <ConverterTool converter={converter} />
          </div>
        </div>
      </section>

      <div className="mx-auto w-full max-w-3xl space-y-12 px-4 py-12 sm:space-y-16 sm:px-6 sm:py-16">
        <section>
          <h2 className="text-2xl font-bold tracking-tight">
            How to {sameFormat ? converter.title.toLowerCase() : `convert ${from.label} to ${to.label}`}
          </h2>
          <ol className="mt-6 grid gap-4 sm:grid-cols-3">
            {steps.map((step, index) => (
              <li key={step.title} className="rounded-2xl border border-border bg-surface p-5">
                <span className="grid h-8 w-8 place-items-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
                  {index + 1}
                </span>
                <h3 className="mt-3 font-semibold">{step.title}</h3>
                <p className="mt-1 text-sm leading-6 text-muted">{step.body}</p>
              </li>
            ))}
          </ol>
          <p className="mt-6 leading-7 text-muted">{converter.about}</p>
        </section>

        <section className="grid gap-6 sm:grid-cols-2">
          {(sameFormat ? [from] : [from, to]).map((format) => (
            <div key={format.label} className="rounded-2xl border border-border bg-surface p-6">
              <h2 className="text-lg font-semibold">What is {format.label}?</h2>
              <p className="mt-2 text-sm leading-6 text-muted">{format.description}</p>
            </div>
          ))}
          <div className="flex gap-4 rounded-2xl border border-primary/30 bg-primary-soft p-5 sm:p-6 sm:col-span-2">
            <ShieldCheck aria-hidden className="h-6 w-6 shrink-0 text-primary" />
            <div>
              <h2 className="font-semibold">Safe for confidential files</h2>
              <p className="mt-1 text-sm leading-6 text-muted">
                Unlike upload-based converters, {siteConfig.name} processes files inside your browser tab. Your
                documents are never transmitted, stored or logged — close the tab and they’re gone.
              </p>
            </div>
          </div>
        </section>

        <section>
          <h2 className="text-2xl font-bold tracking-tight">Frequently asked questions</h2>
          <div className="mt-6">
            <Faq items={faq} />
          </div>
        </section>

        {related.length > 0 && (
          <section>
            <h2 className="text-2xl font-bold tracking-tight">Related converters</h2>
            <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {related.map((item) => (
                <ConverterCard key={item.slug} converter={item} />
              ))}
            </div>
          </section>
        )}
      </div>

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
    </>
  );
}
