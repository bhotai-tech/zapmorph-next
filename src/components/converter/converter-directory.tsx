'use client';

import { useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import { ConverterCard } from '@/components/converter/converter-card';
import { CategoryIcon } from '@/components/converter/category-icon';
import { CATEGORIES, CONVERTERS, FORMATS, type CategoryKey } from '@/lib/converters/catalog';

const ORDER: CategoryKey[] = ['image', 'pdf', 'data', 'media'];

export function ConverterDirectory() {
  const [query, setQuery] = useState('');

  const matches = useMemo(() => {
    const terms = query.toLowerCase().split(/\s+|to/).filter(Boolean);
    if (terms.length === 0) return CONVERTERS;
    return CONVERTERS.filter((converter) => {
      const haystack = [
        converter.title,
        converter.slug,
        FORMATS[converter.from].label,
        FORMATS[converter.to].label,
        CATEGORIES[converter.category].name,
      ]
        .join(' ')
        .toLowerCase();
      return terms.every((term) => haystack.includes(term));
    });
  }, [query]);

  return (
    <div>
      <div className="relative mx-auto max-w-xl">
        <Search aria-hidden className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted" />
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search — “heic”, “pdf to jpg”…"
          aria-label="Search converters"
          className="h-12 w-full rounded-2xl sm:h-14 border border-border bg-surface pl-12 pr-4 text-base shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
      </div>

      {matches.length === 0 ? (
        <p className="mt-12 text-center text-muted">
          No converter matches “{query}” yet. Tell us what you need at the email in the footer.
        </p>
      ) : (
        <div className="mt-10 space-y-12 sm:mt-12 sm:space-y-14">
          {ORDER.map((category) => {
            const items = matches.filter((converter) => converter.category === category);
            if (items.length === 0) return null;
            return (
              <section key={category} id={category} className="scroll-mt-24">
                <div className="flex items-center gap-3">
                  <CategoryIcon category={category} />
                  <div>
                    <h2 className="text-xl font-semibold">{CATEGORIES[category].name}</h2>
                    <p className="text-sm text-muted">{CATEGORIES[category].description}</p>
                  </div>
                </div>
                <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {items.map((converter) => (
                    <ConverterCard key={converter.slug} converter={converter} />
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
