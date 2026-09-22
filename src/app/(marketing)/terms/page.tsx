import type { Metadata } from 'next';
import Link from 'next/link';
import { LegalPage } from '@/components/marketing/legal-page';
import { siteConfig } from '@/config/site';

export const metadata: Metadata = { title: 'Terms of service', alternates: { canonical: '/terms' } };

export default function TermsPage() {
  const name = siteConfig.name;
  return (
    <LegalPage title="Terms of service" updated="September 15, 2026">
      <p>
        These terms govern your use of {name} (the “Service”). By using the Service you agree to them. If you do not
        agree, do not use the Service.
      </p>

      <h2>1. The Service</h2>
      <p>
        {name} provides file conversion tools that run in your web browser. Files you convert are processed on your
        device and are not uploaded to our servers. You are responsible for keeping copies of your original files.
      </p>

      <h2>2. Accounts</h2>
      <p>
        You need an account for some features and for paid plans. Keep your credentials secure; you are responsible
        for activity on your account. You must be at least 16 years old to create an account.
      </p>

      <h2>3. Acceptable use</h2>
      <ul>
        <li>Only convert files you have the right to use and convert.</li>
        <li>Do not attempt to bypass usage limits, abuse our APIs, or disrupt the Service.</li>
        <li>Do not use the Service for anything unlawful.</li>
      </ul>

      <h2>4. Plans, payments and renewals</h2>
      <p>
        Our order process is conducted by our online reseller Paddle.com. Paddle.com is the Merchant of Record for all
        our orders. Paddle provides all customer service inquiries and handles returns. Prices are shown before
        purchase and may include applicable taxes calculated at checkout.
      </p>
      <p>
        Monthly and yearly Pro plans renew automatically at the end of each billing period until cancelled. You can
        cancel auto-renewal at any time from your dashboard; Pro remains active until the end of the paid period.
        Lifetime plans are a one-time payment that grants Pro access for the life of the Service.
      </p>

      <h2>5. Refunds</h2>
      <p>
        Paid plans come with a 14-day money-back guarantee. See our <Link href="/refund-policy">refund policy</Link>.
      </p>

      <h2>6. Free plan and limits</h2>
      <p>
        Free usage is subject to the daily limits described on the <Link href="/pricing">pricing page</Link>. We may
        change free limits and features at any time. Changes to paid plans apply at your next renewal.
      </p>

      <h2>7. Disclaimer and liability</h2>
      <p>
        The Service is provided “as is” without warranties of any kind. Conversion results depend on your files,
        browser and device, and we do not guarantee that every file converts perfectly. To the maximum extent
        permitted by law, our total liability is limited to the amount you paid us in the 12 months before the claim.
      </p>

      <h2>8. Termination</h2>
      <p>
        You may delete your account at any time from the dashboard. We may suspend accounts that violate these terms.
      </p>

      <h2>9. Changes</h2>
      <p>
        We may update these terms. Material changes will be announced on this page before they take effect. Contact
        us at <a href={`mailto:${siteConfig.supportEmail}`}>{siteConfig.supportEmail}</a> with any questions.
      </p>
    </LegalPage>
  );
}
