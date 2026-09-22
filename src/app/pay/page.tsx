import type { Metadata } from 'next';
import { Logo } from '@/components/shared/logo';
import { Card } from '@/components/ui/card';
import { getPaddleConfig, isPaddleConfigured } from '@/lib/paddle/config';
import { PaddleLinkLauncher } from './paddle-link-launcher';

export const metadata: Metadata = {
  title: 'Secure payment',
  robots: { index: false, follow: false },
};

/**
 * Paddle "default payment link" target (Paddle → Checkout → Checkout settings).
 * Paddle sends customers here with `?_ptxn=txn_…` — for payment links and for
 * updating the card on a subscription — and Paddle.js opens that checkout
 * automatically. Deliberately public: the transaction id is the capability.
 */
export default async function PayPage(props: PageProps<'/pay'>) {
  const { _ptxn } = await props.searchParams;
  const paddle = isPaddleConfigured() ? getPaddleConfig() : null;
  const hasTransaction = typeof _ptxn === 'string' && /^txn_[a-z0-9]+$/.test(_ptxn);

  return (
    <main className="flex flex-1 flex-col items-center justify-center px-4 py-16">
      <div className="mb-8">
        <Logo />
      </div>
      <Card className="w-full max-w-md p-8 text-center">
        {paddle ? (
          <PaddleLinkLauncher
            hasTransaction={hasTransaction}
            clientToken={paddle.clientToken}
            environment={paddle.environment}
          />
        ) : (
          <p role="status" className="text-sm text-muted">
            Payments are temporarily unavailable. Please try again shortly.
          </p>
        )}
      </Card>
      <p className="mt-6 max-w-md text-center text-xs leading-5 text-muted">
        Payments are processed securely by Paddle, our Merchant of Record.
      </p>
    </main>
  );
}
