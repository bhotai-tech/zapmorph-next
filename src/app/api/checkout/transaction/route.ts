import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { CheckoutError, findResumableCheckout, startCheckout } from '@/lib/billing/checkout';
import { PaddleNotConfiguredError } from '@/lib/paddle/config';
import { PaddleApiError } from '@/lib/paddle/client';
import { checkoutSchema } from '@/schemas';
import { checkoutLimiter } from '@/lib/rate-limit';
import { log } from '@/lib/logger';

/** Creates (or resumes) a Paddle transaction; the checkout page embeds it inline. */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user?.email) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    }

    // Only a plan id is accepted — never an amount.
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'invalid_plan' }, { status: 400 });
    }
    const parsed = checkoutSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'invalid_plan' }, { status: 400 });
    }

    // A refresh of the checkout page resumes the checkout already started.
    const resumed = await findResumableCheckout(user.id, parsed.data.planId);
    if (resumed) return NextResponse.json(resumed);

    const { success } = await checkoutLimiter.limit(user.id);
    if (!success) {
      return NextResponse.json({ error: 'rate_limited' }, { status: 429 });
    }

    const result = await startCheckout({
      userId: user.id,
      email: user.email,
      planId: parsed.data.planId,
    });
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof CheckoutError) {
      return NextResponse.json(
        { error: err.code },
        { status: err.code === 'invalid_plan' ? 400 : 409 },
      );
    }
    if (err instanceof PaddleNotConfiguredError) {
      log('error', 'checkout/transaction: Paddle not configured', { error: err.message });
      return NextResponse.json({ error: 'payments_unavailable' }, { status: 503 });
    }
    if (err instanceof PaddleApiError && err.code === 'transaction_default_checkout_url_not_set') {
      log('error', 'checkout/transaction: set the default payment link in Paddle → Checkout → Checkout settings (docs/PADDLE.md)');
      return NextResponse.json({ error: 'payments_unavailable' }, { status: 503 });
    }
    log('error', 'checkout/transaction failed', { error: String(err) });
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}
