import Link from 'next/link';
import { Logo } from '@/components/shared/logo';
import { siteConfig } from '@/config/site';
import { CATEGORIES, convertersInCategory, type CategoryKey } from '@/lib/converters/catalog';

const CATEGORY_ORDER: CategoryKey[] = ['image', 'pdf', 'data', 'media'];

export function Footer() {
  return (
    <footer className="mt-auto border-t border-border bg-surface">
      <div className="mx-auto grid w-full max-w-6xl gap-x-6 gap-y-10 px-4 py-12 sm:px-6 grid-cols-2 md:grid-cols-[1.4fr_repeat(4,1fr)]">
        <div className="col-span-2 md:col-span-1">
          <Logo />
          <p className="mt-3 max-w-xs text-sm leading-6 text-muted">
            {siteConfig.tagline}. Files are processed on your device and never uploaded.
          </p>
          <ul className="mt-5 space-y-1 text-sm">
            <li><Link href="/pricing" className="inline-block py-1 text-muted hover:text-foreground">Pricing</Link></li>
            <li><Link href="/terms" className="inline-block py-1 text-muted hover:text-foreground">Terms of service</Link></li>
            <li><Link href="/privacy" className="inline-block py-1 text-muted hover:text-foreground">Privacy policy</Link></li>
            <li><Link href="/refund-policy" className="inline-block py-1 text-muted hover:text-foreground">Refund policy</Link></li>
            <li>
              <a href={`mailto:${siteConfig.supportEmail}`} className="inline-block py-1 text-muted hover:text-foreground">
                Contact support
              </a>
            </li>
          </ul>
        </div>
        {CATEGORY_ORDER.map((key) => (
          <div key={key}>
            <p className="text-sm font-semibold">{CATEGORIES[key].short}</p>
            <ul className="mt-3 space-y-1 text-sm">
              {convertersInCategory(key)
                .slice(0, 7)
                .map((converter) => (
                  <li key={converter.slug}>
                    <Link href={`/convert/${converter.slug}`} className="inline-block py-1 text-muted hover:text-foreground">
                      {converter.title.replace(/ Converter$/, '')}
                    </Link>
                  </li>
                ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-border">
        <p className="mx-auto w-full max-w-6xl px-4 py-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] text-xs text-muted sm:px-6">
          © {new Date().getFullYear()} {siteConfig.name}. Payments are processed by Paddle.com, our Merchant of Record.
        </p>
      </div>
    </footer>
  );
}
