import Link from 'next/link';
import { siteConfig } from '@/config/site';

/** The bolt, drawn on a 24-unit grid and centred in the 32-unit tile. */
const BOLT =
  'M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z';

/**
 * Brand mark: "zap" (instant) as a bolt on a teal→blue gradient tile, the
 * gradient standing in for "morph". Gradient ids are namespaced so several
 * marks can share a page.
 */
export function LogoMark({ className = 'h-8 w-8', id = 'logo' }: { className?: string; id?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden focusable="false">
      <defs>
        <linearGradient id={`${id}-tile`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#14b8a6" />
          <stop offset="100%" stopColor="#0369a1" />
        </linearGradient>
      </defs>
      <rect width="32" height="32" rx="9" fill={`url(#${id}-tile)`} />
      <g transform="translate(4 4)">
        <path d={BOLT} fill="#fff" />
      </g>
    </svg>
  );
}

/**
 * Deliberately one colour: the tile carries the brand teal, and a coined word
 * like "Zapmorph" should read as one word, not two. (Matching the tile's
 * brighter teal in text would also fail contrast on a light background.)
 */
export function Wordmark({ className = '' }: { className?: string }) {
  return <span className={`font-bold tracking-tight ${className}`}>{siteConfig.name}</span>;
}

export function Logo({ showWordmark = true }: { showWordmark?: boolean } = {}) {
  return (
    <Link href="/" className="flex items-center gap-2.5" aria-label={`${siteConfig.name} home`}>
      <LogoMark className="h-8 w-8 rounded-[9px] shadow-sm" />
      {showWordmark && <Wordmark className="text-lg" />}
    </Link>
  );
}
