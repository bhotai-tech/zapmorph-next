import 'server-only';

import { createAdminClient } from '@/lib/supabase/server';
import { audit } from '@/lib/audit';
import { sendPurchaseConfirmationEmail, sendRefundEmail } from '@/lib/email/send';
import { log } from '@/lib/logger';

type AdminClient = ReturnType<typeof createAdminClient>;

const UNIQUE_VIOLATION = '23505';

/** Renewal webhooks can land a little after the paid period ends — don't flicker to Free. */
export const RENEWAL_GRACE_MS = 24 * 60 * 60 * 1000;

export type ProAccess =
  | { tier: 'pro'; source: 'lifetime' | 'subscription'; expiresAt: string | null }
  | { tier: 'free' };

/** The user's best active entitlement: lifetime beats a subscription. */
export async function getProAccess(
  userId: string,
  supabase: AdminClient = createAdminClient(),
): Promise<ProAccess> {
  const { data, error } = await supabase
    .from('entitlements')
    .select('expires_at')
    .eq('user_id', userId)
    .eq('status', 'active');
  if (error) throw error;

  let best: ProAccess = { tier: 'free' };
  for (const row of data ?? []) {
    if (row.expires_at === null) return { tier: 'pro', source: 'lifetime', expiresAt: null };
    const active = new Date(row.expires_at).getTime() + RENEWAL_GRACE_MS > Date.now();
    if (active && (best.tier === 'free' || (best.expiresAt ?? '') < row.expires_at)) {
      best = { tier: 'pro', source: 'subscription', expiresAt: row.expires_at };
    }
  }
  return best;
}

/** Idempotent: `entitlements.order_id` is unique, so concurrent fulfillment grants once. */
export async function issueEntitlementForOrder(
  supabase: AdminClient,
  params: {
    orderId: string;
    userId: string;
    planId: string;
    planLabel: string;
    expiresAt: string | null;
    subscriptionId: string | null;
    actor: string;
  },
): Promise<string> {
  const { data, error } = await supabase
    .from('entitlements')
    .insert({
      order_id: params.orderId,
      user_id: params.userId,
      plan_id: params.planId,
      subscription_id: params.subscriptionId,
      expires_at: params.expiresAt,
    })
    .select('id')
    .single();

  if (!error) {
    await audit(params.actor, 'entitlement.granted', 'entitlement', data.id, {
      orderId: params.orderId,
      planId: params.planId,
      expiresAt: params.expiresAt,
    });

    // Whoever wins this insert race owns sending the receipt — exactly once,
    // to the account the purchase belongs to, never to a fixed inbox.
    const { data: userData, error: userError } = await supabase.auth.admin.getUserById(params.userId);
    if (userError || !userData?.user?.email) {
      log('error', 'entitlements: could not resolve purchaser email for receipt', {
        userId: params.userId,
        orderId: params.orderId,
        error: userError ? String(userError) : undefined,
      });
    } else {
      await sendPurchaseConfirmationEmail(userData.user.email, params.planLabel);
    }

    return data.id;
  }
  if (error.code !== UNIQUE_VIOLATION) throw error;

  const { data: existing, error: readError } = await supabase
    .from('entitlements')
    .select('id')
    .eq('order_id', params.orderId)
    .single();
  if (readError) throw readError;
  return existing.id;
}

export async function revokeEntitlement(
  supabase: AdminClient,
  entitlementId: string,
  params: { actor: string; reason: 'refund' | 'chargeback' },
): Promise<void> {
  const { data, error } = await supabase
    .from('entitlements')
    .update({ status: 'revoked', revoked_at: new Date().toISOString(), revoke_reason: params.reason })
    .eq('id', entitlementId)
    .eq('status', 'active')
    .select('id, user_id');
  if (error) throw error;
  if (data.length > 0) {
    await audit(params.actor, 'entitlement.revoked', 'entitlement', entitlementId, { reason: params.reason });

    // Chargebacks are disputes in progress, not something to notify the
    // customer about; approved refunds are, same as sendPaymentFailedEmail below.
    if (params.reason === 'refund') {
      const { data: userData, error: userError } = await supabase.auth.admin.getUserById(
        data[0].user_id,
      );
      if (userError || !userData?.user?.email) {
        log('error', 'entitlements: could not resolve purchaser email for refund notice', {
          entitlementId,
          error: userError ? String(userError) : undefined,
        });
      } else {
        await sendRefundEmail(userData.user.email);
      }
    }
  }
}
