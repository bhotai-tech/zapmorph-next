'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { CheckCircle2, Loader2, XCircle } from 'lucide-react';
import { initializePaddle, type Environments } from '@paddle/paddle-js';
import { Button, ButtonLink } from '@/components/ui/button';
import { siteConfig } from '@/config/site';

type State = 'loading' | 'open' | 'completed' | 'closed' | 'error';

const LOAD_TIMEOUT_MS = 20_000;

/** Initializes Paddle.js; Paddle opens the `_ptxn` checkout on its own. */
export function PaddleLinkLauncher({
  hasTransaction,
  clientToken,
  environment,
}: {
  hasTransaction: boolean;
  clientToken: string;
  environment: Environments;
}) {
  const [state, setState] = useState<State>('loading');

  useEffect(() => {
    if (!hasTransaction) return;
    let cancelled = false;
    const timeout = setTimeout(() => {
      if (!cancelled) setState((s) => (s === 'loading' ? 'error' : s));
    }, LOAD_TIMEOUT_MS);

    initializePaddle({
      environment,
      token: clientToken,
      checkout: { settings: { displayMode: 'overlay', allowLogout: false } },
      eventCallback: (event) => {
        if (cancelled) return;
        if (event.name === 'checkout.loaded') setState('open');
        else if (event.name === 'checkout.completed') setState('completed');
        else if (event.name === 'checkout.closed') setState((s) => (s === 'completed' ? s : 'closed'));
        else if (event.name === 'checkout.error') setState('error');
      },
    })
      .then((paddle) => {
        if (!paddle && !cancelled) setState('error');
      })
      .catch(() => {
        if (!cancelled) setState('error');
      });

    return () => {
      cancelled = true;
      clearTimeout(timeout);
    };
  }, [hasTransaction, clientToken, environment]);

  if (!hasTransaction) {
    return (
      <Message
        icon={<XCircle aria-hidden className="mx-auto h-12 w-12 text-red-500" />}
        title="This payment link is incomplete"
        body="Open the link from your email again, or manage your plan from your dashboard."
        actions={<ButtonLink href="/dashboard/billing">Go to billing</ButtonLink>}
      />
    );
  }

  if (state === 'completed') {
    return (
      <Message
        icon={<CheckCircle2 aria-hidden className="mx-auto h-12 w-12 text-emerald-500" />}
        title="Payment details received"
        body="Thanks! Your billing will update in a moment — Paddle also emails you a receipt."
        actions={<ButtonLink href="/dashboard/billing">Go to billing</ButtonLink>}
      />
    );
  }

  if (state === 'closed' || state === 'error') {
    return (
      <Message
        icon={<XCircle aria-hidden className="mx-auto h-12 w-12 text-muted" />}
        title={state === 'closed' ? 'Checkout closed' : 'Secure checkout couldn’t load'}
        body={
          state === 'closed'
            ? 'No payment was taken. You can reopen the checkout whenever you’re ready.'
            : `Disable any ad blocker for this site and try again. If it keeps failing, email ${siteConfig.supportEmail}.`
        }
        actions={<Button onClick={() => window.location.reload()}>Reopen checkout</Button>}
      />
    );
  }

  return (
    <Message
      icon={<Loader2 aria-hidden className="mx-auto h-12 w-12 animate-spin text-primary" />}
      title={state === 'open' ? 'Complete your payment' : 'Opening secure checkout…'}
      body={
        state === 'open'
          ? 'Finish in the secure Paddle window. Card details go directly to Paddle.'
          : 'This only takes a moment.'
      }
    />
  );
}

function Message({ icon, title, body, actions }: { icon: ReactNode; title: string; body: string; actions?: ReactNode }) {
  return (
    <div role="status">
      {icon}
      <h1 className="mt-4 text-xl font-bold">{title}</h1>
      <p className="mt-2 text-sm leading-6 text-muted">{body}</p>
      {actions && <div className="mt-6 flex flex-wrap justify-center gap-3">{actions}</div>}
    </div>
  );
}
