'use client';

import { useId, useState, type DragEvent } from 'react';
import Link from 'next/link';
import { FileUp, RotateCcw } from 'lucide-react';
import { ConverterTool } from '@/components/converter/converter-tool';
import {
  CONVERTERS,
  convertersForFile,
  fileMatchesConverter,
  targetLabel,
  type Converter,
} from '@/lib/converters/catalog';

const QUICK_SLUGS = ['png-to-jpg', 'heic-to-jpg', 'pdf-to-jpg', 'jpg-to-pdf', 'merge-pdf', 'mp4-to-mp3'];
const QUICK = QUICK_SLUGS.map((slug) => CONVERTERS.find((converter) => converter.slug === slug)!);

/**
 * The home page's main event: drop any file, we work out what it is and offer
 * the conversions that fit, then run the real tool inline — no navigation, no
 * sign-up, no upload.
 */
export function HeroConverter() {
  const inputId = useId();
  const [files, setFiles] = useState<File[]>([]);
  const [candidates, setCandidates] = useState<Converter[]>([]);
  const [target, setTarget] = useState<Converter | null>(null);
  const [unsupported, setUnsupported] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);

  function pick(list: FileList | File[]) {
    const picked = Array.from(list);
    if (picked.length === 0) return;
    const options = convertersForFile(picked[0]);
    if (options.length === 0) {
      const extension = picked[0].name.split('.').pop();
      setUnsupported(extension ? `.${extension.toLowerCase()}` : 'that');
      return;
    }
    setUnsupported(null);
    setFiles(picked);
    setCandidates(options);
    setTarget(options[0]);
  }

  function reset() {
    setFiles([]);
    setCandidates([]);
    setTarget(null);
    setUnsupported(null);
  }

  function onDrop(event: DragEvent<HTMLElement>) {
    event.preventDefault();
    setDragging(false);
    if (event.dataTransfer.files.length > 0) pick(event.dataTransfer.files);
  }

  if (target) {
    return (
      <div className="animate-rise">
        <div className="flex flex-wrap items-center justify-between gap-3 px-1 pb-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-medium text-muted">Convert to</span>
            {candidates.map((converter) => {
              const active = converter.slug === target.slug;
              return (
                <button
                  key={converter.slug}
                  type="button"
                  onClick={() => setTarget(converter)}
                  aria-pressed={active}
                  className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
                    active
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'border border-border bg-surface text-muted hover:border-primary/50 hover:text-foreground'
                  }`}
                >
                  {targetLabel(converter)}
                </button>
              );
            })}
          </div>
          <button
            type="button"
            onClick={reset}
            className="inline-flex items-center gap-1.5 py-2 text-sm font-medium text-muted transition-colors hover:text-foreground"
          >
            <RotateCcw aria-hidden className="h-3.5 w-3.5" />
            Start over
          </button>
        </div>

        <ConverterTool
          key={target.slug}
          converter={target}
          initialFiles={files.filter((file) => fileMatchesConverter(target, file))}
        />

        <p className="mt-4 text-center text-sm text-muted">
          More options on the{' '}
          <Link href={`/convert/${target.slug}`} className="font-medium text-primary hover:underline">
            {target.title}
          </Link>{' '}
          page.
        </p>
      </div>
    );
  }

  return (
    <div className="animate-rise">
      <label
        htmlFor={inputId}
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className={`group flex cursor-pointer flex-col items-center justify-center rounded-[28px] border-2 border-dashed px-4 py-8 text-center transition-all sm:px-6 sm:py-11 ${
          dragging
            ? 'scale-[1.01] border-primary bg-primary-soft'
            : 'border-border bg-surface/70 hover:border-primary/60 hover:bg-surface'
        }`}
      >
        <span className="grid h-14 w-14 place-items-center rounded-2xl bg-primary text-primary-foreground shadow-lg transition-transform group-hover:-translate-y-0.5">
          <FileUp aria-hidden className="h-6 w-6" />
        </span>
        <span className="mt-4 text-lg font-bold sm:text-xl">Drop any file to convert it</span>
        <span className="mt-1.5 max-w-sm text-sm text-muted">
          Images, PDFs, spreadsheets, data, audio, video — we’ll show you what it can become.
        </span>
        <span className="mt-4 inline-flex h-11 items-center rounded-lg bg-primary px-5 text-sm font-semibold text-primary-foreground shadow-sm transition-colors group-hover:bg-primary-strong">
          Choose a file
        </span>
        <input
          id={inputId}
          type="file"
          multiple
          className="sr-only"
          onChange={(event) => {
            if (event.target.files) pick(event.target.files);
            event.target.value = '';
          }}
        />
      </label>

      {unsupported && (
        <p role="alert" className="mt-4 text-center text-sm text-red-600 dark:text-red-400">
          We can’t convert {unsupported} files yet —{' '}
          <Link href="/converters" className="underline">
            see what’s supported
          </Link>
          .
        </p>
      )}

      <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
        <span className="text-sm text-muted">Or jump straight to</span>
        {QUICK.map((converter) => (
          <Link
            key={converter.slug}
            href={`/convert/${converter.slug}`}
            className="rounded-full border border-border bg-surface px-4 py-2 text-sm font-medium shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary/50 hover:text-primary"
          >
            {converter.title.replace(/ Converter$/, '')}
          </Link>
        ))}
      </div>
    </div>
  );
}
