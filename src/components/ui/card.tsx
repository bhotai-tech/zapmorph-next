import type { ComponentProps } from 'react';

export function Card({ className = '', ...props }: ComponentProps<'div'>) {
  return (
    <div
      className={`rounded-2xl border border-border bg-surface p-6 shadow-sm ${className}`}
      {...props}
    />
  );
}

export function Badge({
  className = '',
  tone = 'default',
  ...props
}: ComponentProps<'span'> & { tone?: 'default' | 'success' | 'warning' | 'danger' | 'pro' }) {
  const tones = {
    default: 'bg-primary-soft text-primary-strong',
    success: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300',
    warning: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300',
    danger: 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300',
    pro: 'bg-amber-100 text-amber-900 ring-1 ring-amber-300/60 dark:bg-amber-950 dark:text-amber-200 dark:ring-amber-800',
  } as const;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${tones[tone]} ${className}`}
      {...props}
    />
  );
}
