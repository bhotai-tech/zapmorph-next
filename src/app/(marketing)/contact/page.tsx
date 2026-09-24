import type { Metadata } from 'next';
import Link from 'next/link';
import { Clock, Mail, RotateCcw } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { siteConfig } from '@/config/site';
import { ContactForm } from './contact-form';

export const metadata: Metadata = {
  title: 'Contact support',
  description: `Questions about ${siteConfig.name}, a purchase, or a refund? Send us a message and we’ll reply by email.`,
  alternates: { canonical: '/contact' },
};

export default function ContactPage() {
  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-10 sm:px-6 sm:py-16">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Support</p>
      <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">Contact support</h1>
      <p className="mt-3 max-w-2xl leading-7 text-muted">
        Questions about a conversion, your purchase, or a refund? Send us a message and we’ll reply by email.
      </p>

      <div className="mt-10 grid gap-8 lg:grid-cols-[1fr_280px]">
        <Card className="p-6 sm:p-8">
          <ContactForm />
        </Card>

        <div className="space-y-4">
          <Card className="p-5">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <Mail aria-hidden className="h-4 w-4 text-primary" />
              Email us directly
            </div>
            <p className="mt-2 break-words text-sm leading-6 text-muted">
              <a href={`mailto:${siteConfig.supportEmail}`} className="font-medium text-primary hover:underline">
                {siteConfig.supportEmail}
              </a>
            </p>
          </Card>
          <Card className="p-5">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <RotateCcw aria-hidden className="h-4 w-4 text-primary" />
              Refunds
            </div>
            <p className="mt-2 text-sm leading-6 text-muted">
              Every paid plan has a 14-day money-back guarantee. Write from your account email — see the{' '}
              <Link href="/refund-policy" className="font-medium text-primary hover:underline">
                refund policy
              </Link>
              .
            </p>
          </Card>
          <Card className="p-5">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <Clock aria-hidden className="h-4 w-4 text-primary" />
              Response time
            </div>
            <p className="mt-2 text-sm leading-6 text-muted">We usually reply within one business day.</p>
          </Card>
        </div>
      </div>
    </div>
  );
}
