import type { Metadata } from 'next';
import { LegalPage } from '@/components/marketing/legal-page';
import { siteConfig } from '@/config/site';

export const metadata: Metadata = { title: 'Refund policy', alternates: { canonical: '/refund-policy' } };

export default function RefundPolicyPage() {
  return (
    <LegalPage title="Refund policy" updated="September 15, 2026">
      <p>
        We want you to be happy with {siteConfig.name} Pro. Every paid plan — monthly, yearly and lifetime — includes
        a <strong className="text-foreground">14-day money-back guarantee</strong>.
      </p>

      <h2>How to request a refund</h2>
      <p>
        Email <a href={`mailto:${siteConfig.supportEmail}`}>{siteConfig.supportEmail}</a> within 14 days of your
        purchase or renewal from the email address on your account, or reply to your Paddle receipt. You don’t need
        to give a reason. Refunds are issued by Paddle, our Merchant of Record, to the original payment method and
        usually appear within 5–10 business days.
      </p>

      <h2>What happens after a refund</h2>
      <p>
        Pro access ends when the refund is processed, and any subscription is cancelled so you are not charged again.
      </p>

      <h2>Cancelling a subscription</h2>
      <p>
        You can cancel auto-renewal at any time from your dashboard. Cancelling stops future charges; you keep Pro
        until the end of the period you paid for. Renewals older than 14 days are not refunded, except where required
        by law.
      </p>
    </LegalPage>
  );
}
