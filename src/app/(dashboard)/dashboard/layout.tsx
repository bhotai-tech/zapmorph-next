import { redirect } from 'next/navigation';
import { CreditCard, LayoutDashboard, LogOut } from 'lucide-react';
import Link from 'next/link';
import { getCurrentUser } from '@/lib/supabase/server';
import { Navbar } from '@/components/shared/navbar';
import { Footer } from '@/components/shared/footer';
import { logout } from '@/app/(auth)/actions';

const NAV = [
  { href: '/dashboard', label: 'Overview', icon: LayoutDashboard },
  { href: '/dashboard/billing', label: 'Billing', icon: CreditCard },
] as const;

export default async function DashboardLayout({ children }: LayoutProps<'/dashboard'>) {
  const { user } = await getCurrentUser();
  if (!user) redirect('/login?redirectTo=/dashboard');

  return (
    <>
      <Navbar />
      <div className="mx-auto grid w-full max-w-6xl flex-1 gap-6 px-4 py-8 sm:px-6 md:gap-8 md:py-10 md:grid-cols-[200px_1fr]">
        <aside>
          <p className="truncate text-sm text-muted" title={user.email}>
            {user.email}
          </p>
          <nav aria-label="Dashboard" className="mt-4 flex flex-wrap gap-1 md:flex-col">
            {NAV.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium hover:bg-primary-soft"
              >
                <Icon aria-hidden className="h-4 w-4 text-muted" />
                {label}
              </Link>
            ))}
            <form action={logout}>
              <button
                type="submit"
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium text-muted hover:bg-primary-soft hover:text-foreground"
              >
                <LogOut aria-hidden className="h-4 w-4" />
                Log out
              </button>
            </form>
          </nav>
        </aside>
        <main className="min-w-0">{children}</main>
      </div>
      <Footer />
    </>
  );
}
