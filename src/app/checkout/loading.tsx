import { Navbar } from '@/components/shared/navbar';
import { Footer } from '@/components/shared/footer';
import { Card } from '@/components/ui/card';

/**
 * /checkout is server-rendered per request (auth check + plan/customer
 * lookups before it can respond), so without this file a click from pricing
 * lands on a frozen screen until that round trip finishes. This renders
 * instantly on navigation and streams the real page in over it.
 */
export default function CheckoutLoading() {
  return (
    <>
      <Navbar />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 sm:px-6 sm:py-10 lg:py-14">
        <div className="h-5 w-28 animate-pulse rounded bg-border/60" />
        <div className="mt-4 h-9 w-40 animate-pulse rounded bg-border/60" />

        <div className="mt-8 grid items-start gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] lg:gap-8">
          <Card className="p-6 sm:p-8">
            <div className="h-3 w-24 animate-pulse rounded bg-border/60" />
            <div className="mt-5 h-6 w-3/4 animate-pulse rounded bg-border/60" />
            <div className="mt-3 space-y-2.5">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="h-3.5 w-full animate-pulse rounded bg-border/40" />
              ))}
            </div>
            <div className="mt-8 h-16 animate-pulse rounded bg-border/40" />
          </Card>

          <Card className="p-6 sm:p-8">
            <div className="flex items-center justify-between gap-4">
              <div className="h-5 w-32 animate-pulse rounded bg-border/60" />
              <div className="h-4 w-24 animate-pulse rounded bg-border/40" />
            </div>
            <div aria-hidden className="mt-6 space-y-5">
              {[0, 1, 2].map((i) => (
                <div key={i} className="space-y-2">
                  <div className="h-3 w-24 animate-pulse rounded bg-border" />
                  <div className="h-11 w-full animate-pulse rounded-lg bg-border/60" />
                </div>
              ))}
              <div className="h-12 w-full animate-pulse rounded-lg bg-border/60" />
            </div>
            <p className="sr-only" role="status">
              Loading checkout…
            </p>
          </Card>
        </div>
      </main>
      <Footer />
    </>
  );
}
