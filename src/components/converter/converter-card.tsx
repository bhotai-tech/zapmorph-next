import Link from 'next/link';
import { ArrowRight, Sparkles } from 'lucide-react';
import { Badge } from '@/components/ui/card';
import { CategoryIcon } from '@/components/converter/category-icon';
import { FORMATS, type Converter } from '@/lib/converters/catalog';

export function ConverterCard({ converter }: { converter: Converter }) {
  const sameFormat = converter.from === converter.to;
  return (
    <Link
      href={`/convert/${converter.slug}`}
      className="group flex h-full flex-col rounded-2xl border border-border bg-surface p-4 sm:p-5 transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md"
    >
      <div className="flex items-start justify-between gap-3">
        <CategoryIcon category={converter.category} size="sm" />
        {converter.tier === 'pro' && (
          <Badge tone="pro">
            <Sparkles aria-hidden className="h-3 w-3" />
            Pro
          </Badge>
        )}
      </div>
      <h3 className="mt-4 font-semibold">{converter.title.replace(/ Converter$/, '')}</h3>
      {!sameFormat && (
        <p className="mt-1 flex items-center gap-1.5 font-mono text-xs text-muted">
          {FORMATS[converter.from].label}
          <ArrowRight aria-hidden className="h-3 w-3" />
          {FORMATS[converter.to].label}
        </p>
      )}
      <p className="mt-2 line-clamp-2 text-sm leading-6 text-muted">{converter.summary}</p>
    </Link>
  );
}
