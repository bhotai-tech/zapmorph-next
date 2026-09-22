'use client';

import { useEffect, useState } from 'react';
import { CheckCircle2, Clock, XCircle } from 'lucide-react';
import { ButtonLink } from '@/components/ui/button';

type Status = 'checking' | 'paid' | 'pending' | 'failed' | 'timeout';

const POLL_MS = 3000;
const MAX_POLLS = 40; // ~2 minutes

export function StatusPoller({ statusUrl }: { statusUrl: string }) {
  const [status, setStatus] = useState<Status>('checking');

  useEffect(() => {
    let polls = 0;
    let stopped = false;

    async function poll() {
      if (stopped) return;
      polls += 1;
      try {
        const res = await fetch(statusUrl, { cache: 'no-store' });
        if (res.ok) {
          const { status: current } = (await res.json()) as { status: string };
          if (current === 'paid') return setStatus('paid');
          if (current === 'failed' || current === 'not_found') return setStatus('failed');
          setStatus('pending');
        }
      } catch {
        // transient network error — keep polling
      }
      if (polls < MAX_POLLS) setTimeout(poll, POLL_MS);
      else setStatus('timeout');
    }

    poll();
    return () => {
      stopped = true;
    };
  }, [statusUrl]);

  if (status === 'paid') {
    return (
      <div>
        <CheckCircle2 aria-hidden className="mx-auto h-14 w-14 text-emerald-500" />
        <h1 className="mt-4 text-2xl font-bold">You’re Pro now 🎉</h1>
        <p className="mt-2 text-muted">
          Unlimited conversions, 1 GB files and every audio & video tool are unlocked. Paddle has emailed your receipt.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <ButtonLink href="/converters" size="lg">
            Start converting
          </ButtonLink>
          <ButtonLink href="/dashboard/billing" size="lg" variant="secondary">
            View billing
          </ButtonLink>
        </div>
      </div>
    );
  }

  if (status === 'failed') {
    return (
      <div>
        <XCircle aria-hidden className="mx-auto h-14 w-14 text-red-500" />
        <h1 className="mt-4 text-2xl font-bold">Payment not completed</h1>
        <p className="mt-2 text-muted">Your payment didn’t go through and no money was taken. You can try again.</p>
        <ButtonLink href="/pricing" size="lg" className="mt-8">
          Back to pricing
        </ButtonLink>
      </div>
    );
  }

  if (status === 'timeout') {
    return (
      <div>
        <Clock aria-hidden className="mx-auto h-14 w-14 text-primary" />
        <h1 className="mt-4 text-2xl font-bold">Still confirming your payment</h1>
        <p className="mt-2 text-muted">
          This is taking longer than usual. If you were charged, Pro will appear on your account as soon as the
          payment clears — no need to pay again.
        </p>
        <ButtonLink href="/dashboard/billing" size="lg" className="mt-8">
          Check billing
        </ButtonLink>
      </div>
    );
  }

  return (
    <div>
      <Clock aria-hidden className="mx-auto h-14 w-14 animate-pulse text-primary" />
      <h1 className="mt-4 text-2xl font-bold">Confirming your payment…</h1>
      <p className="mt-2 text-muted">This usually takes a few seconds. Please don’t close this page.</p>
    </div>
  );
}
