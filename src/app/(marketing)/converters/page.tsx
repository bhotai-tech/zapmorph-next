import type { Metadata } from 'next';
import { ConverterDirectory } from '@/components/converter/converter-directory';
import { CONVERTERS } from '@/lib/converters/catalog';

export const metadata: Metadata = {
  title: 'All file converters',
  description: `Browse ${CONVERTERS.length} free online converters for images, PDFs, spreadsheets, data, audio and video. Every conversion runs privately in your browser.`,
  alternates: { canonical: '/converters' },
};

export default function ConvertersPage() {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 sm:py-16">
      <div className="text-center">
        <h1 className="text-3xl font-bold sm:text-4xl tracking-tight">All converters</h1>
        <p className="mx-auto mt-3 max-w-xl text-muted">
          {CONVERTERS.length} tools that run entirely in your browser. Pick one to get started.
        </p>
      </div>
      <div className="mt-10">
        <ConverterDirectory />
      </div>
    </div>
  );
}
