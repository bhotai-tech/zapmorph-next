'use client';

import { useEffect, useId, useState, type DragEvent } from 'react';
import Link from 'next/link';
import {
  ArrowDown,
  ArrowUp,
  CheckCircle2,
  Download,
  FileUp,
  FolderArchive,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  X,
} from 'lucide-react';
import { Button, ButtonLink } from '@/components/ui/button';
import { Alert } from '@/components/ui/alert';
import { FORMATS, fileMatchesConverter, type Converter, type ConverterOption } from '@/lib/converters/catalog';
import {
  PLAN_LIMITS,
  formatBytes,
  type PlanLimits,
  type Tier,
  type UsageDenial,
} from '@/lib/usage-limits';

type Account = {
  tier: Tier;
  signedIn: boolean;
  limits: PlanLimits;
  usage: { files: number; proRuns: number };
};

type Result = { name: string; url: string; blob: Blob };

const QUOTA_TIMEOUT_MS = 4000;
type Denial = UsageDenial | 'rate_limited';

// ffmpeg.wasm holds the input file, a copy on its virtual filesystem, and its
// decode/encode buffers in memory at once — large audio/video files can crash
// the tab well before the plan's byte cap. Warn instead of blocking, since the
// actual ceiling depends on the visitor's device.
const LARGE_MEDIA_WARNING_BYTES = 300 * 1024 * 1024;

function uniqueName(name: string, used: Map<string, number>): string {
  const count = used.get(name) ?? 0;
  used.set(name, count + 1);
  if (count === 0) return name;
  const dot = name.lastIndexOf('.');
  return dot > 0 ? `${name.slice(0, dot)} (${count})${name.slice(dot)}` : `${name} (${count})`;
}

function saveBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

function actionLabel(converter: Converter, count: number): string {
  if (converter.slug === 'merge-pdf') return 'Merge PDFs';
  if (converter.slug === 'split-pdf') return 'Split PDF';
  if (converter.mode === 'combine') return `Create PDF${count > 1 ? ` from ${count} images` : ''}`;
  return `Convert${count > 1 ? ` ${count} files` : ''} to ${FORMATS[converter.to].label}`;
}

export function ConverterTool({
  converter,
  initialFiles,
}: {
  converter: Converter;
  /** Files already chosen elsewhere (the home-page dropzone). */
  initialFiles?: File[];
}) {
  const inputId = useId();
  const [files, setFiles] = useState<File[]>(initialFiles ?? []);
  const [options, setOptions] = useState<Record<string, string>>(() =>
    Object.fromEntries((converter.options ?? []).map((option) => [option.key, String(option.default)])),
  );
  const [converting, setConverting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<Result[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [denial, setDenial] = useState<Denial | null>(null);
  const [account, setAccount] = useState<Account | null>(null);
  const [dragging, setDragging] = useState(false);
  const [zipping, setZipping] = useState(false);

  const tier: Tier = account?.tier ?? 'anonymous';
  const limits = account?.limits ?? PLAN_LIMITS[tier];
  const maxFiles = converter.mode === 'single' ? 1 : limits.maxBatch;
  const fromLabel = FORMATS[converter.from].label;

  useEffect(() => {
    const controller = new AbortController();
    fetch('/api/usage', { signal: controller.signal, cache: 'no-store' })
      .then((res) => (res.ok ? res.json() : null))
      .then((body: { account?: Account } | null) => {
        if (body?.account) setAccount(body.account);
      })
      .catch(() => undefined);
    return () => controller.abort();
  }, []);

  // Free the previous results' memory whenever they're replaced, and on unmount.
  useEffect(() => () => results.forEach((result) => URL.revokeObjectURL(result.url)), [results]);

  function addFiles(list: FileList | File[]) {
    const incoming = Array.from(list);
    const supported = incoming.filter((file) => fileMatchesConverter(converter, file));
    const fitting = supported.filter((file) => file.size <= limits.maxFileBytes);
    const merged = converter.mode === 'single' ? fitting.slice(0, 1) : [...files, ...fitting];
    const next = merged.slice(0, maxFiles);

    const messages: string[] = [];
    const skippedType = incoming.length - supported.length;
    if (skippedType > 0) {
      messages.push(`${skippedType} file${skippedType > 1 ? 's' : ''} skipped — only ${fromLabel} files are supported here.`);
    }
    if (converter.category === 'media' && fitting.some((file) => file.size > LARGE_MEDIA_WARNING_BYTES)) {
      messages.push(
        `Large audio/video files can run out of memory in the browser — if the conversion fails, try a smaller file or a lower resolution.`,
      );
    }

    setResults([]);
    setError(null);
    setNotice(messages.join(' ') || null);
    setDenial(
      supported.length > fitting.length
        ? 'file_too_large'
        : converter.mode !== 'single' && merged.length > maxFiles
          ? 'batch_too_large'
          : null,
    );
    setFiles(next);
  }

  function removeFile(index: number) {
    setFiles((current) => current.filter((_, i) => i !== index));
    setDenial(null);
  }

  function moveFile(index: number, delta: number) {
    setFiles((current) => {
      const next = [...current];
      const [item] = next.splice(index, 1);
      next.splice(index + delta, 0, item);
      return next;
    });
  }

  function reset() {
    setFiles([]);
    setResults([]);
    setError(null);
    setNotice(null);
    setDenial(null);
    setProgress(0);
  }

  /**
   * Server-side quota. Only an explicit denial blocks: if our API is down or
   * slow, the local conversion still runs rather than leaving the user waiting.
   */
  async function reserveQuota(): Promise<boolean> {
    try {
      const res = await fetch('/api/usage', {
        method: 'POST',
        signal: AbortSignal.timeout(QUOTA_TIMEOUT_MS),
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slug: converter.slug,
          files: files.length,
          totalBytes: files.reduce((sum, file) => sum + file.size, 0),
          largestBytes: Math.max(...files.map((file) => file.size)),
        }),
      });
      const body = (await res.json().catch(() => ({}))) as { reason?: UsageDenial; account?: Account };
      if (body.account) setAccount(body.account);
      if (res.status === 429) {
        setDenial('rate_limited');
        return false;
      }
      if (res.status === 403) {
        setDenial(body.reason ?? 'daily_limit');
        return false;
      }
      if (!res.ok) {
        // Loud in the console because the symptom is silent: conversions keep
        // working, but nothing is counting them (usually no database configured).
        console.warn(
          `[usage] daily limits are NOT being enforced — /api/usage returned ${res.status}. Check Supabase env vars and that migrations are applied.`,
        );
      }
      return true;
    } catch (err) {
      console.warn('[usage] daily limits are NOT being enforced — /api/usage is unreachable.', err);
      return true;
    }
  }

  async function convert() {
    if (files.length === 0 || converting) return;
    setError(null);
    setNotice(null);
    setDenial(null);
    setResults([]);
    setProgress(0);
    setConverting(true);
    try {
      if (!(await reserveQuota())) return;
      const { runConverter } = await import('@/lib/converters/run');
      const outputs = await runConverter(converter.slug, {
        files,
        options,
        onProgress: (ratio) => setProgress(ratio),
      });
      setResults(outputs.map((output) => ({ ...output, url: URL.createObjectURL(output.blob) })));
    } catch (err) {
      console.error(err);
      setError(
        err instanceof Error && err.name === 'ConversionError'
          ? err.message
          : 'Something went wrong during conversion. Try again, or try a different file.',
      );
    } finally {
      setConverting(false);
    }
  }

  async function downloadZip() {
    setZipping(true);
    try {
      const { default: JSZip } = await import('jszip');
      const zip = new JSZip();
      const used = new Map<string, number>();
      results.forEach((result) => zip.file(uniqueName(result.name, used), result.blob));
      saveBlob(await zip.generateAsync({ type: 'blob' }), `${converter.slug}.zip`);
    } finally {
      setZipping(false);
    }
  }

  function onDrop(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    setDragging(false);
    if (!converting && event.dataTransfer.files.length > 0) addFiles(event.dataTransfer.files);
  }

  const done = results.length > 0;
  const totalOutputBytes = results.reduce((sum, result) => sum + result.blob.size, 0);

  return (
    <div className="rounded-3xl border border-border bg-surface p-4 shadow-sm sm:p-6">
      {converter.tier === 'pro' && tier !== 'pro' && (
        <div className="mb-4 flex flex-wrap items-center gap-2 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:bg-amber-950/60 dark:text-amber-200">
          <Sparkles aria-hidden className="h-4 w-4 shrink-0" />
          <span>
            <strong>Pro tool.</strong> Free accounts get 1 run per day to try it.
          </span>
          <Link href="/pricing" className="ml-auto py-1 font-medium underline underline-offset-2">
            See Pro
          </Link>
        </div>
      )}

      {!done && (
        <label
          htmlFor={inputId}
          onDragOver={(event) => {
            event.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          className={`flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed px-4 py-8 text-center sm:px-6 sm:py-10 transition-colors ${
            dragging ? 'border-primary bg-primary-soft' : 'border-border hover:border-primary/50 hover:bg-surface-2'
          } ${converting ? 'pointer-events-none opacity-60' : ''}`}
        >
          <span className="grid h-14 w-14 place-items-center rounded-2xl bg-primary text-primary-foreground shadow-sm">
            <FileUp aria-hidden className="h-6 w-6" />
          </span>
          <span className="mt-4 text-lg font-semibold">
            {files.length > 0 ? 'Add more files' : `Choose ${fromLabel} file${converter.mode === 'single' ? '' : 's'}`}
          </span>
          <span className="mt-1 text-sm text-muted">
            <span className="hidden sm:inline">or drag and drop · </span>up to {formatBytes(limits.maxFileBytes)}
            {converter.mode !== 'single' && ` · ${maxFiles} files at once`}
          </span>
          <input
            id={inputId}
            type="file"
            className="sr-only"
            accept={converter.accept}
            multiple={converter.mode !== 'single'}
            disabled={converting}
            onChange={(event) => {
              if (event.target.files) addFiles(event.target.files);
              event.target.value = '';
            }}
          />
        </label>
      )}

      {files.length > 0 && !done && (
        <ul className="mt-4 divide-y divide-border rounded-2xl border border-border">
          {files.map((file, index) => (
            <li key={`${file.name}-${file.size}-${file.lastModified}-${index}`} className="flex items-center gap-2 px-3 py-2 text-sm sm:gap-3 sm:px-4 sm:py-2.5">
              <span className="min-w-0 flex-1">
                <span className="block truncate font-medium">{file.name}</span>
                <span className="block tabular-nums text-xs text-muted sm:hidden">{formatBytes(file.size)}</span>
              </span>
              <span className="hidden shrink-0 tabular-nums text-muted sm:inline">{formatBytes(file.size)}</span>
              {converter.mode === 'combine' && files.length > 1 && (
                <span className="flex shrink-0 gap-0.5 sm:gap-1">
                  <IconButton label={`Move ${file.name} up`} disabled={index === 0 || converting} onClick={() => moveFile(index, -1)}>
                    <ArrowUp aria-hidden className="h-4 w-4" />
                  </IconButton>
                  <IconButton label={`Move ${file.name} down`} disabled={index === files.length - 1 || converting} onClick={() => moveFile(index, 1)}>
                    <ArrowDown aria-hidden className="h-4 w-4" />
                  </IconButton>
                </span>
              )}
              <IconButton label={`Remove ${file.name}`} disabled={converting} onClick={() => removeFile(index)}>
                <X aria-hidden className="h-4 w-4" />
              </IconButton>
            </li>
          ))}
        </ul>
      )}

      {converter.options && files.length > 0 && !done && (
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {converter.options.map((option) => (
            <OptionField
              key={option.key}
              option={option}
              value={options[option.key]}
              disabled={converting}
              onChange={(value) => setOptions((current) => ({ ...current, [option.key]: value }))}
            />
          ))}
        </div>
      )}

      {notice && <p className="mt-4 text-sm text-muted">{notice}</p>}
      {error && (
        <div className="mt-4">
          <Alert tone="error">{error}</Alert>
        </div>
      )}
      {denial && <UpgradePrompt denial={denial} tier={tier} limits={limits} slug={converter.slug} />}

      {files.length > 0 && !done && (
        <div className="mt-5">
          {converting ? (
            <div role="status" aria-live="polite">
              <div className="flex justify-between text-sm">
                <span className="font-medium">Converting on your device…</span>
                <span className="tabular-nums text-muted">{Math.round(progress * 100)}%</span>
              </div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-surface-2">
                <div
                  className="h-full rounded-full bg-primary transition-[width] duration-300"
                  style={{ width: `${Math.max(progress * 100, 3)}%` }}
                />
              </div>
              {converter.category === 'media' && (
                <p className="mt-2 text-xs text-muted">
                  The first audio/video conversion downloads the engine (about 30 MB). Later runs start instantly.
                </p>
              )}
            </div>
          ) : (
            <Button size="lg" className="w-full" onClick={convert}>
              {actionLabel(converter, files.length)}
            </Button>
          )}
        </div>
      )}

      {done && (
        <div>
          <div className="flex items-start gap-3">
            <CheckCircle2 aria-hidden className="h-6 w-6 text-emerald-500" />
            <div>
              <p className="font-semibold">
                Done — {results.length} file{results.length > 1 ? 's' : ''} ready
              </p>
              <p className="text-sm text-muted">{formatBytes(totalOutputBytes)} total · created on your device</p>
            </div>
          </div>
          <ul className="mt-4 divide-y divide-border rounded-2xl border border-border">
            {results.map((result) => (
              <li key={result.url} className="flex items-center gap-2 px-3 py-2 text-sm sm:gap-3 sm:px-4 sm:py-2.5">
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium">{result.name}</span>
                  <span className="block tabular-nums text-xs text-muted sm:hidden">{formatBytes(result.blob.size)}</span>
                </span>
                <span className="hidden shrink-0 tabular-nums text-muted sm:inline">{formatBytes(result.blob.size)}</span>
                <a
                  href={result.url}
                  download={result.name}
                  className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-primary-soft px-3 py-2.5 font-medium sm:py-1.5 text-primary-strong hover:bg-primary hover:text-primary-foreground"
                >
                  <Download aria-hidden className="h-4 w-4" />
                  Download
                </a>
              </li>
            ))}
          </ul>
          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            {results.length > 1 && (
              <Button onClick={downloadZip} loading={zipping}>
                {!zipping && <FolderArchive aria-hidden className="h-4 w-4" />}
                Download all (.zip)
              </Button>
            )}
            <Button variant="secondary" onClick={reset}>
              <RotateCcw aria-hidden className="h-4 w-4" />
              Convert more files
            </Button>
          </div>
        </div>
      )}

      <div className="mt-5 flex flex-wrap items-center justify-between gap-2 border-t border-border pt-4 text-xs text-muted">
        <span className="flex items-center gap-1.5">
          <ShieldCheck aria-hidden className="h-4 w-4 text-primary" />
          Your files never leave your device
        </span>
        <UsageSummary account={account} />
      </div>
    </div>
  );
}

function IconButton({
  label,
  onClick,
  disabled,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="grid h-10 w-10 place-items-center rounded-md sm:h-7 sm:w-7 text-muted hover:bg-surface-2 hover:text-foreground disabled:opacity-40"
    >
      {children}
    </button>
  );
}

function OptionField({
  option,
  value,
  disabled,
  onChange,
}: {
  option: ConverterOption;
  value: string;
  disabled: boolean;
  onChange: (value: string) => void;
}) {
  const id = useId();
  if (option.type === 'range') {
    const shown = option.display === 'percent' ? `${Math.round(Number(value) * 100)}%` : value;
    return (
      <div>
        <label htmlFor={id} className="flex justify-between text-sm font-medium">
          {option.label}
          <span className="tabular-nums text-muted">{shown}</span>
        </label>
        <input
          id={id}
          type="range"
          min={option.min}
          max={option.max}
          step={option.step}
          value={value}
          disabled={disabled}
          onChange={(event) => onChange(event.target.value)}
          className="mt-2 h-8 w-full accent-[var(--primary)] sm:mt-3 sm:h-auto"
        />
      </div>
    );
  }
  return (
    <div>
      <label htmlFor={id} className="text-sm font-medium">
        {option.label}
      </label>
      <select
        id={id}
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        className="mt-1.5 h-11 w-full rounded-lg border border-border bg-surface px-3 text-sm sm:h-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {option.choices.map((choice) => (
          <option key={choice.value} value={choice.value}>
            {choice.label}
          </option>
        ))}
      </select>
    </div>
  );
}

function UsageSummary({ account }: { account: Account | null }) {
  if (!account) return null;
  if (account.tier === 'pro') {
    return (
      <span className="flex items-center gap-1 font-medium text-amber-700 dark:text-amber-300">
        <Sparkles aria-hidden className="h-3.5 w-3.5" /> Pro · unlimited
      </span>
    );
  }
  const limit = account.limits.filesPerDay;
  return (
    <span className="tabular-nums">
      {limit === null ? 'Unlimited' : `${Math.min(account.usage.files, limit)} of ${limit} free files used today`}
      {account.tier === 'anonymous' && (
        <>
          {' · '}
          <Link href="/signup" className="font-medium text-primary hover:underline">
            Sign up for more
          </Link>
        </>
      )}
    </span>
  );
}

function UpgradePrompt({
  denial,
  tier,
  limits,
  slug,
}: {
  denial: Denial;
  tier: Tier;
  limits: PlanLimits;
  slug: string;
}) {
  if (denial === 'rate_limited') {
    return (
      <div className="mt-4">
        <Alert tone="error">Too many requests — wait a moment and try again.</Alert>
      </div>
    );
  }

  const anonymous = tier === 'anonymous';
  const copy: Record<UsageDenial, { title: string; body: string }> = {
    sign_in_required: {
      title: 'Create a free account to use this Pro tool',
      body: 'Free accounts get one Pro tool run every day. Pro unlocks unlimited audio, video and advanced PDF conversions.',
    },
    pro_limit: {
      title: 'You’ve used today’s free Pro run',
      body: 'Upgrade to Pro for unlimited audio, video and advanced PDF conversions — or come back tomorrow.',
    },
    daily_limit: {
      title: 'You’ve reached today’s free limit',
      body: anonymous
        ? `Sign up free to convert ${PLAN_LIMITS.free.filesPerDay} files a day, or go Pro for unlimited conversions.`
        : 'Upgrade to Pro for unlimited conversions, or come back tomorrow.',
    },
    file_too_large: {
      title: `Some files are larger than ${formatBytes(limits.maxFileBytes)}`,
      body: anonymous
        ? `Free accounts handle files up to ${formatBytes(PLAN_LIMITS.free.maxFileBytes)}; Pro handles up to ${formatBytes(PLAN_LIMITS.pro.maxFileBytes)}.`
        : `Pro handles files up to ${formatBytes(PLAN_LIMITS.pro.maxFileBytes)}.`,
    },
    batch_too_large: {
      title: `Your plan converts up to ${limits.maxBatch} files at once`,
      body: `Only the first ${limits.maxBatch} were added. Pro converts up to ${PLAN_LIMITS.pro.maxBatch} files in one go with a single ZIP download.`,
    },
  };
  const { title, body } = copy[denial];
  const redirect = encodeURIComponent(`/convert/${slug}`);

  return (
    <div className="mt-4 rounded-2xl border border-amber-300/60 bg-gradient-to-br from-amber-50 to-orange-50 p-4 sm:p-5 dark:border-amber-800 dark:from-amber-950/60 dark:to-orange-950/40">
      <p className="flex items-center gap-2 font-semibold text-amber-950 dark:text-amber-100">
        <Sparkles aria-hidden className="h-4 w-4" />
        {title}
      </p>
      <p className="mt-1.5 text-sm leading-6 text-amber-900/80 dark:text-amber-200/80">{body}</p>
      <div className="mt-4 flex flex-wrap gap-3">
        {anonymous && denial !== 'pro_limit' ? (
          <>
            <ButtonLink href={`/signup?redirectTo=${redirect}`} size="sm">
              Sign up free
            </ButtonLink>
            <ButtonLink href="/pricing" size="sm" variant="secondary">
              See Pro plans
            </ButtonLink>
          </>
        ) : (
          <ButtonLink href="/pricing" size="sm">
            Upgrade to Pro
          </ButtonLink>
        )}
      </div>
    </div>
  );
}
