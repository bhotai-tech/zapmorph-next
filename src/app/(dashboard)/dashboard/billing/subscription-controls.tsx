'use client';

import { useActionState, useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { cancelSubscription, openBillingPortal, type ActionState } from '../actions';
import { Button } from '@/components/ui/button';

function Feedback({ state }: { state: ActionState }) {
  if (!state) return null;
  return (
    <p
      role={state.ok ? 'status' : 'alert'}
      className={`mt-2 text-sm ${state.ok ? 'text-emerald-600' : 'text-red-600'}`}
    >
      {state.message}
    </p>
  );
}

export function CancelSubscriptionButton({ subscriptionId }: { subscriptionId: string }) {
  const [confirming, setConfirming] = useState(false);
  const [state, action, pending] = useActionState<ActionState, FormData>(cancelSubscription, null);

  if (!confirming && !state) {
    return (
      <Button type="button" variant="ghost" size="sm" onClick={() => setConfirming(true)}>
        Cancel auto-renewal
      </Button>
    );
  }

  return (
    <form action={action}>
      <input type="hidden" name="subscriptionId" value={subscriptionId} />
      {!state?.ok && (
        <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-900 dark:bg-amber-950">
          <AlertTriangle aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
          <div className="flex-1">
            <p className="text-sm font-medium text-amber-900 dark:text-amber-200">
              Stop renewing? You keep Pro until the end of the period you’ve paid for.
            </p>
            <div className="mt-3 flex gap-3">
              <Button type="submit" variant="danger" size="sm" loading={pending}>
                {pending ? 'Cancelling…' : 'Yes, cancel'}
              </Button>
              <Button type="button" variant="secondary" size="sm" disabled={pending} onClick={() => setConfirming(false)}>
                Keep Pro
              </Button>
            </div>
          </div>
        </div>
      )}
      <Feedback state={state} />
    </form>
  );
}

/** Redirects to Paddle's customer portal (one-time authenticated link). */
export function BillingPortalButton({
  target,
  subscriptionId,
  label,
}: {
  target: 'overview' | 'payment_method';
  subscriptionId?: string;
  label: string;
}) {
  const [state, action, pending] = useActionState<ActionState, FormData>(openBillingPortal, null);
  return (
    <form action={action}>
      <input type="hidden" name="target" value={target} />
      {subscriptionId && <input type="hidden" name="subscriptionId" value={subscriptionId} />}
      <Button type="submit" variant="secondary" size="sm" loading={pending}>
        {label}
      </Button>
      <Feedback state={state} />
    </form>
  );
}
