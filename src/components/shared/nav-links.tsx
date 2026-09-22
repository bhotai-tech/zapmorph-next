'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { getConverter, type CategoryKey } from '@/lib/converters/catalog';

type NavLink = { href: string; label: string; section?: CategoryKey };

const LINKS: readonly NavLink[] = [
  { href: '/converters', label: 'All converters' },
  { href: '/converters#image', label: 'Image', section: 'image' },
  { href: '/converters#pdf', label: 'PDF', section: 'pdf' },
  { href: '/converters#media', label: 'Audio & video', section: 'media' },
  { href: '/pricing', label: 'Pricing' },
];

/** Every section id on the directory page, including ones with no nav entry. */
const SECTION_IDS: CategoryKey[] = ['image', 'pdf', 'data', 'media'];
const NAV_SECTIONS = new Set(LINKS.map((link) => link.section).filter(Boolean));

/** Sticky header height plus a little slack, matching the sections' scroll-margin. */
const HEADER_OFFSET = 100;

/**
 * The directory's category links are hash links, and Next's client navigation
 * updates the hash without firing `hashchange`. Tracking the section currently
 * under the header keeps the highlight right after a click *and* while
 * scrolling. Positions are measured live on each scroll frame: an
 * IntersectionObserver only reports sections whose visibility changed, which
 * leaves stale positions for the rest after a long jump.
 */
function useVisibleSection(enabled: boolean): CategoryKey | null {
  const [section, setSection] = useState<CategoryKey | null>(null);

  useEffect(() => {
    if (!enabled) return;
    const targets = SECTION_IDS.map((id) => document.getElementById(id)).filter(
      (element): element is HTMLElement => element !== null,
    );
    if (targets.length === 0) return;

    let frame = 0;
    const update = () => {
      frame = 0;
      // The last section whose start has scrolled past the header is the one
      // being read; above all of them, nothing is active.
      let current: CategoryKey | null = null;
      for (const target of targets) {
        if (target.getBoundingClientRect().top <= HEADER_OFFSET) current = target.id as CategoryKey;
      }
      setSection(current);
    };
    const schedule = () => {
      frame ||= requestAnimationFrame(update);
    };

    schedule();
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
    };
  }, [enabled]);

  return enabled ? section : null;
}

export function NavLinks({ variant = 'desktop' }: { variant?: 'desktop' | 'mobile' }) {
  const pathname = usePathname();
  const onDirectory = pathname === '/converters';
  const visibleSection = useVisibleSection(onDirectory);
  const converterCategory = pathname.startsWith('/convert/')
    ? getConverter(pathname.slice('/convert/'.length))?.category
    : undefined;

  function isActive(link: NavLink): boolean {
    if (link.section) {
      return onDirectory ? visibleSection === link.section : converterCategory === link.section;
    }
    if (link.href === '/converters') {
      // Stays lit while reading a section that has no nav entry (Data & docs).
      return onDirectory && !NAV_SECTIONS.has(visibleSection ?? undefined);
    }
    return pathname === link.href;
  }

  return (
    <>
      {LINKS.map((link) => {
        const active = isActive(link);
        const base =
          variant === 'desktop'
            ? 'rounded-full px-3 py-1.5 text-sm transition-colors'
            : 'block rounded-lg px-3 py-3 text-sm transition-colors';
        const tone = active
          ? 'bg-primary-soft font-semibold text-primary-strong'
          : 'text-muted hover:text-foreground';
        return (
          <Link
            key={link.href}
            href={link.href}
            aria-current={active ? 'page' : undefined}
            className={`${base} ${tone}`}
          >
            {link.label}
          </Link>
        );
      })}
    </>
  );
}
