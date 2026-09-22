import type { Metadata } from 'next';
import { LegalPage } from '@/components/marketing/legal-page';
import { siteConfig } from '@/config/site';

export const metadata: Metadata = { title: 'Privacy policy', alternates: { canonical: '/privacy' } };

export default function PrivacyPage() {
  const name = siteConfig.name;
  return (
    <LegalPage title="Privacy policy" updated="September 15, 2026">
      <p>
        Privacy is the core of {name}. This policy explains what we collect, why, and what we never collect.
      </p>

      <h2>Your files</h2>
      <p>
        <strong className="text-foreground">We never receive your files.</strong> All conversions run inside your
        browser. File contents and file names are not transmitted to or stored on our servers.
      </p>

      <h2>What we collect</h2>
      <ul>
        <li>
          <strong className="text-foreground">Account data</strong> — your email address, name, and authentication
          details when you create an account.
        </li>
        <li>
          <strong className="text-foreground">Usage counts</strong> — the number of files converted per day, total
          bytes, and which converter was used, to enforce plan limits and improve the product. For visitors without an
          account, this is linked to a one-way hashed IP address; the raw IP is not stored.
        </li>
        <li>
          <strong className="text-foreground">Billing data</strong> — your plan, subscription status and order history.
          Payment details are collected and processed by Paddle, our Merchant of Record; we never see your card number.
        </li>
      </ul>

      <h2>Cookies</h2>
      <p>
        We use essential cookies to keep you signed in. We do not use advertising cookies or sell personal data.
      </p>

      <h2>Service providers</h2>
      <ul>
        <li>Supabase — authentication and database hosting</li>
        <li>Paddle — checkout, payments, invoicing and tax (see paddle.com/legal/privacy)</li>
        <li>Our hosting provider — serving the website</li>
      </ul>

      <h2>Retention and your rights</h2>
      <p>
        Daily usage counters are kept only as long as needed for limits and aggregate analytics. You can delete your
        account at any time from the dashboard, which erases your profile and entitlements; financial records may be
        retained where the law requires. You may request access to, correction of, or deletion of your data by
        emailing <a href={`mailto:${siteConfig.supportEmail}`}>{siteConfig.supportEmail}</a>.
      </p>
    </LegalPage>
  );
}
