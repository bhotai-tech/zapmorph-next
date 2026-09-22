import { AlertCircle, CheckCircle2 } from 'lucide-react';
import type { ReactNode } from 'react';

const tones = {
  success:
    'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-300',
  error:
    'border-red-200 bg-red-50 text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-300',
} as const;

export function Alert({ tone, children }: { tone: keyof typeof tones; children: ReactNode }) {
  const Icon = tone === 'success' ? CheckCircle2 : AlertCircle;
  return (
    <div
      role={tone === 'success' ? 'status' : 'alert'}
      className={`flex items-start gap-2 rounded-lg border px-3 py-2.5 text-sm ${tones[tone]}`}
    >
      <Icon aria-hidden className="mt-0.5 h-4 w-4 shrink-0" />
      <span>{children}</span>
    </div>
  );
}
