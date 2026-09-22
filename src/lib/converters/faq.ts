import { FORMATS, type Converter } from '@/lib/converters/catalog';
import { PLAN_LIMITS, fileCount, formatBytes } from '@/lib/usage-limits';
import type { FaqItem } from '@/components/marketing/faq';

/** Programmatic FAQ for each converter landing page (also emitted as FAQPage JSON-LD). */
export function converterFaq(converter: Converter): FaqItem[] {
  const from = FORMATS[converter.from].label;
  const name = converter.title.replace(/ Converter$/, '').toLowerCase();

  const batchAnswer =
    converter.mode === 'single'
      ? `${converter.title} works on one file at a time and can produce many output files, which you can download together as a ZIP.`
      : converter.mode === 'combine'
        ? `Yes. Add several files and they’re combined into one document in the order you choose — ${PLAN_LIMITS.free.maxBatch} files on the free plan, ${PLAN_LIMITS.pro.maxBatch} on Pro.`
        : `Yes. Select several ${from} files at once — up to ${PLAN_LIMITS.free.maxBatch} on the free plan or ${PLAN_LIMITS.pro.maxBatch} on Pro — and download all results in a single ZIP.`;

  return [
    {
      question: `Is the ${name} converter free?`,
      answer:
        converter.tier === 'free'
          ? `Yes. Convert ${fileCount(PLAN_LIMITS.anonymous.filesPerDay ?? 0)} a day without an account, or ${fileCount(PLAN_LIMITS.free.filesPerDay ?? 0)} a day with a free account. Pro removes all daily limits.`
          : `This is a Pro tool. With a free account you get one run a day to try it; Pro and Lifetime plans include unlimited use.`,
    },
    {
      question: 'Are my files uploaded to a server?',
      answer:
        'No. The conversion runs entirely in your browser, so your files never leave your device. We only count how many files you convert — never their names or contents.',
    },
    {
      question: 'What is the maximum file size?',
      answer: `Up to ${formatBytes(PLAN_LIMITS.anonymous.maxFileBytes)} per file without an account, ${formatBytes(PLAN_LIMITS.free.maxFileBytes)} with a free account, and ${formatBytes(PLAN_LIMITS.pro.maxFileBytes)} on Pro. Very large files also depend on your device’s memory.`,
    },
    { question: `Can I convert multiple ${from} files at once?`, answer: batchAnswer },
    {
      question: 'Does it work on Mac, Windows, iPhone and Android?',
      answer:
        'Yes. It works in any modern browser — Chrome, Edge, Firefox and Safari — on desktop and mobile, with nothing to install.',
    },
  ];
}
