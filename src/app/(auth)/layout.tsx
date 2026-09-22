import { Lock, ShieldCheck, Sparkles } from 'lucide-react';
import { Logo } from '@/components/shared/logo';

export default function AuthLayout({ children }: LayoutProps<'/'>) {
  return (
    <div className="grid flex-1 lg:grid-cols-2">
      <div className="flex flex-col px-4 py-6 sm:px-10 sm:py-8">
        <Logo />
        <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center py-8 sm:py-12">{children}</div>
      </div>
      <aside className="hidden flex-col justify-center border-l border-border bg-[radial-gradient(80%_60%_at_30%_20%,var(--primary-soft),transparent)] px-16 lg:flex">
        <h2 className="max-w-md text-3xl font-bold tracking-tight">
          More conversions, bigger files, zero uploads.
        </h2>
        <ul className="mt-8 space-y-5 text-muted">
          <li className="flex gap-3">
            <Sparkles aria-hidden className="h-5 w-5 shrink-0 text-primary" />
            A free account gives you five conversions a day plus one Pro tool run.
          </li>
          <li className="flex gap-3">
            <ShieldCheck aria-hidden className="h-5 w-5 shrink-0 text-primary" />
            Files are still converted on your device — your account only stores your plan.
          </li>
          <li className="flex gap-3">
            <Lock aria-hidden className="h-5 w-5 shrink-0 text-primary" />
            Payments handled securely by Paddle. Cancel anytime.
          </li>
        </ul>
      </aside>
    </div>
  );
}
