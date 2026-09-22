import type { Metadata } from 'next';
import { LoginForm } from './login-form';

export const metadata: Metadata = { title: 'Log in', robots: { index: false } };

function safePath(raw: string | string[] | undefined): string {
  return typeof raw === 'string' && raw.startsWith('/') && !raw.startsWith('//') && !raw.includes('\\')
    ? raw
    : '/dashboard';
}

export default async function LoginPage(props: PageProps<'/login'>) {
  const { redirectTo, error } = await props.searchParams;
  return (
    <>
      <h1 className="text-2xl font-bold tracking-tight">Welcome back</h1>
      <p className="mt-2 text-sm text-muted">Log in to see your plan, usage and billing.</p>
      <LoginForm redirectTo={safePath(redirectTo)} callbackError={error === 'auth'} />
    </>
  );
}
