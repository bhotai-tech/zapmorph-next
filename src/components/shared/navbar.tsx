import { Logo } from '@/components/shared/logo';
import { MobileMenu } from '@/components/shared/mobile-menu';
import { NavAuth } from '@/components/shared/nav-auth';
import { NavLinks } from '@/components/shared/nav-links';

export function Navbar() {
  return (
    <header className="pt-safe sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center gap-2 sm:gap-4 px-4 sm:px-6">
        <div className="flex items-center gap-8 lg:gap-12">
          <Logo showWordmark={false} />
          <nav aria-label="Main" className="hidden items-center gap-1 md:flex">
            <NavLinks />
          </nav>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <NavAuth />
          <MobileMenu />
        </div>
      </div>
    </header>
  );
}
