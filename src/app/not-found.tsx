import { Navbar } from '@/components/shared/navbar';
import { Footer } from '@/components/shared/footer';
import { ButtonLink } from '@/components/ui/button';

export default function NotFound() {
  return (
    <>
      <Navbar />
      <main className="mx-auto flex w-full max-w-lg flex-1 flex-col items-center justify-center px-4 py-16 sm:py-24 text-center">
        <p className="text-sm font-semibold text-primary">404</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight">Page not found</h1>
        <p className="mt-3 text-muted">That page doesn’t exist — but there are plenty of converters that do.</p>
        <ButtonLink href="/converters" size="lg" className="mt-8">
          Browse converters
        </ButtonLink>
      </main>
      <Footer />
    </>
  );
}
