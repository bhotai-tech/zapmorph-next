import type { ReactNode } from 'react';

export function LegalPage({ title, updated, children }: { title: string; updated: string; children: ReactNode }) {
  return (
    <article className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6 sm:py-16">
      <h1 className="text-3xl font-bold sm:text-4xl tracking-tight">{title}</h1>
      <p className="mt-2 text-sm text-muted">Last updated {updated}</p>
      <div className="mt-10 space-y-6 leading-7 text-muted [&_h2]:mt-10 [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:text-foreground break-words [&_li]:ml-5 [&_li]:list-disc [&_a]:text-primary [&_a]:underline">
        {children}
      </div>
    </article>
  );
}
