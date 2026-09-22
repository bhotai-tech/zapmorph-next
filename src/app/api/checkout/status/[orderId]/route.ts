import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { fulfillTransaction, type FulfillmentResult } from '@/lib/billing/fulfill';
import { apiLimiter, clientIp } from '@/lib/rate-limit';
import { uuidSchema } from '@/schemas';
import { log } from '@/lib/logger';

export async function GET(request: NextRequest, context: RouteContext<'/api/checkout/status/[orderId]'>) {
  try {
    const { success } = await apiLimiter.limit(clientIp(request));
    if (!success) return NextResponse.json({ error: 'Rate limited' }, { status: 429 });

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { orderId } = await context.params;
    const parsed = uuidSchema.safeParse(orderId);
    if (!parsed.success) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    // Ownership check via RLS-scoped client (no IDOR).
    const { data: order } = await supabase
      .from('orders')
      .select('id, status, paddle_transaction_id')
      .eq('id', parsed.data)
      .maybeSingle();
    if (!order) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    if (order.status === 'paid') return NextResponse.json({ status: 'paid' });
    if (order.status === 'failed' || order.status === 'refunded') {
      return NextResponse.json({ status: 'failed' });
    }
    if (!order.paddle_transaction_id) return NextResponse.json({ status: 'pending' });

    // The webhook is the primary fulfillment path; this covers webhook delays
    // by re-reading the transaction from Paddle (never trusting the browser).
    let status: FulfillmentResult = 'pending';
    try {
      status = await fulfillTransaction(order.paddle_transaction_id, user.id);
    } catch (err) {
      log('warn', 'checkout/status: Paddle check failed', { orderId: order.id, error: String(err) });
    }
    return NextResponse.json({ status });
  } catch (err) {
    log('error', 'checkout/status failed', { error: String(err) });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
