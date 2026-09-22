'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef } from 'react';
import { Menu } from 'lucide-react';
import { NavLinks } from '@/components/shared/nav-links';

/**
 * A native <details> disclosure that also closes on navigation, on outside
 * taps and on Escape — otherwise it stays open over the page after a link tap.
 */
export function MobileMenu() {
  const pathname = usePathname();
  const ref = useRef<HTMLDetailsElement>(null);

  useEffect(() => {
    const menu = ref.current;
    if (!menu) return;
    const close = () => menu.removeAttribute('open');
    const onPointer = (event: PointerEvent) => {
      if (!menu.contains(event.target as Node)) close();
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close();
    };
    document.addEventListener('pointerdown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, []);

  useEffect(() => {
    ref.current?.removeAttribute('open');
  }, [pathname]);

  return (
    <details ref={ref} className="relative md:hidden">
      <summary
        aria-label="Menu"
        className="grid h-11 w-11 cursor-pointer list-none place-items-center rounded-lg border border-border [&::-webkit-details-marker]:hidden"
      >
        <Menu aria-hidden className="h-5 w-5" />
      </summary>
      <nav
        aria-label="Mobile"
        className="absolute right-0 mt-2 w-56 max-w-[calc(100vw-2rem)] rounded-xl border border-border bg-surface p-2 shadow-lg"
      >
        <Link href="/login" className="block rounded-lg px-3 py-3 text-sm hover:bg-primary-soft sm:hidden">
          Log in
        </Link>
        <NavLinks variant="mobile" />
      </nav>
    </details>
  );
}
