import 'server-only';

import { Resend } from 'resend';
import { env, isProd } from '@/config/env';
import { log } from '@/lib/logger';
import { siteConfig } from '@/config/site';

/**
 * Every email here goes to the customer the purchase/subscription belongs to
 * (looked up via supabase.auth.admin.getUserById), never to a fixed inbox —
 * that's what makes this different from a plain Paddle dashboard notification.
 */

function client(): Resend | null {
  if (!env.RESEND_API_KEY) {
    if (isProd) log('error', 'email: RESEND_API_KEY missing in production');
    return null;
  }
  return new Resend(env.RESEND_API_KEY);
}

async function send(to: string, subject: string, html: string) {
  const resend = client();
  if (!resend) {
    log('warn', 'email: skipped (no RESEND_API_KEY)', { subject });
    return;
  }
  const { error } = await resend.emails.send({ from: env.EMAIL_FROM, to, subject, html });
  if (error) log('error', 'email: send failed', { subject, error: error.message });
}

/** Shared branded layout — table-based with inline styles for Gmail/Outlook/Apple Mail. */
function wrap(heading: string, body: string, footnote?: string) {
  return `
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f2f2fa;padding:40px 16px;">
  <tr>
    <td align="center">
      <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;">
        <tr>
          <td style="padding:0 8px 20px;font-family:Arial,sans-serif;font-size:17px;font-weight:bold;color:#16162b;">
            ${siteConfig.name}
          </td>
        </tr>
        <tr>
          <td style="background-color:#ffffff;border:1px solid #e6e6f2;border-radius:14px;padding:36px 36px 32px;">
            <h1 style="margin:0 0 14px;font-family:Arial,sans-serif;font-size:22px;line-height:30px;color:#16162b;">${heading}</h1>
            ${body}
            ${
              footnote
                ? `<hr style="border:none;border-top:1px solid #e6e6f2;margin:28px 0 20px;" />
            <p style="margin:0;font-family:Arial,sans-serif;font-size:12px;line-height:19px;color:#9a9ab4;">${footnote}</p>`
                : ''
            }
          </td>
        </tr>
        <tr>
          <td style="padding:20px 8px 0;text-align:center;font-family:Arial,sans-serif;font-size:12px;line-height:19px;color:#9a9ab4;">
            ${siteConfig.name} — ${siteConfig.tagline}.<br />
            Need help? <a href="mailto:${siteConfig.supportEmail}" style="color:#5b5bd6;">Contact support</a>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>`;
}

const p = (text: string) =>
  `<p style="margin:0 0 14px;font-family:Arial,sans-serif;font-size:15px;line-height:24px;color:#64647e;">${text}</p>`;

const strong = (text: string) => `<strong style="color:#16162b;">${text}</strong>`;

const button = (href: string, label: string) => `
<table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px 0;">
  <tr>
    <td style="background-color:#5b5bd6;border-radius:10px;">
      <a href="${href}" target="_blank" style="display:inline-block;padding:13px 32px;font-family:Arial,sans-serif;font-size:15px;font-weight:bold;color:#ffffff;text-decoration:none;">${label}</a>
    </td>
  </tr>
</table>`;

/** Sent once, right after a purchase is fulfilled and Pro access is granted. */
export async function sendPurchaseConfirmationEmail(to: string, planLabel: string) {
  await send(
    to,
    `Your ${siteConfig.name} ${planLabel} purchase is confirmed`,
    wrap(
      'You’re all set 🎉',
      p(`Thanks for purchasing ${strong(planLabel)}! Your account has been upgraded and Pro features are unlocked now.`) +
        button(`${env.NEXT_PUBLIC_APP_URL}/dashboard`, 'Go to dashboard'),
      `You received this email because a ${planLabel} purchase was completed on your ${siteConfig.name} account. Didn’t make this purchase? Contact support right away.`,
    ),
  );
}

/** Sent when a subscription renewal charge fails (webhook: subscription.past_due). */
export async function sendPaymentFailedEmail(to: string) {
  await send(
    to,
    `Your ${siteConfig.name} renewal payment failed`,
    wrap(
      'We couldn’t renew your subscription',
      p('Your card declined the renewal charge for your subscription. Your Pro access stays active until it expires — update your payment method to avoid losing access.') +
        button(`${env.NEXT_PUBLIC_APP_URL}/dashboard/billing`, 'Manage billing'),
      'Paddle, our payment provider, will retry the charge automatically. If it keeps failing, contact support.',
    ),
  );
}

/** Sent when an approved refund revokes Pro access (webhook: adjustment.created/updated). */
export async function sendRefundEmail(to: string) {
  await send(
    to,
    `Your ${siteConfig.name} refund has been processed`,
    wrap(
      'Refund processed',
      p('Your refund has been processed and Pro access has been removed from your account. The amount will reach your original payment method within 5–7 business days.') +
        p('We’d love to know what didn’t work for you — reply to this email or reach out any time.') +
        button(`mailto:${siteConfig.supportEmail}`, 'Contact support'),
      'If this refund was unexpected, please contact support immediately.',
    ),
  );
}
