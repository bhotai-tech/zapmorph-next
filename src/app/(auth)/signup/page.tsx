import type { Metadata } from 'next';
import { SignupForm } from './signup-form';

export const metadata: Metadata = { title: 'Create your free account', robots: { index: false } };

export default async function SignupPage(props: PageProps<'/signup'>) {
  const { redirectTo } = await props.searchParams;
  const next =
    typeof redirectTo === 'string' && redirectTo.startsWith('/') && !redirectTo.startsWith('//') && !redirectTo.includes('\\')
      ? redirectTo
      : '/dashboard';
  return (
    <>
      <h1 className="text-2xl font-bold tracking-tight">Create your free account</h1>
      <p className="mt-2 text-sm text-muted">Five conversions a day, a daily Pro tool run, and bigger files. No card needed.</p>
      <SignupForm redirectTo={next} />
    </>
  );
}
