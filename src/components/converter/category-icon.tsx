import { Clapperboard, FileText, Image as ImageIcon, Table2, type LucideIcon } from 'lucide-react';
import type { CategoryKey } from '@/lib/converters/catalog';

const ICONS: Record<CategoryKey, { icon: LucideIcon; className: string }> = {
  image: { icon: ImageIcon, className: 'bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300' },
  pdf: { icon: FileText, className: 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300' },
  data: { icon: Table2, className: 'bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300' },
  media: { icon: Clapperboard, className: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300' },
};

export function CategoryIcon({ category, size = 'md' }: { category: CategoryKey; size?: 'sm' | 'md' | 'lg' }) {
  const { icon: Icon, className } = ICONS[category];
  const box = { sm: 'h-8 w-8 rounded-lg', md: 'h-10 w-10 rounded-xl', lg: 'h-12 w-12 rounded-xl' }[size];
  const glyph = { sm: 'h-4 w-4', md: 'h-5 w-5', lg: 'h-6 w-6' }[size];
  return (
    <span className={`grid shrink-0 place-items-center ${box} ${className}`}>
      <Icon aria-hidden className={glyph} />
    </span>
  );
}
