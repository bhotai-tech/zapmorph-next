'use server';

import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { authLimiter } from '@/lib/rate-limit';
import { emailSchema, loginSchema, passwordSchema, signupSchema } from '@/schemas';
import { env } from '@/config/env';
import { isSafeRedirectPath } from '@/lib/safe-redirect';

export type AuthState = { ok: boolean; message: string } | null;

// Generic error keeps account existence private.
const BAD_CREDENTIALS = 'Invalid email or password.';

async function limited(bucket: string): Promise<boolean> {
  const hdrs = await headers();
  const ip = hdrs.get('x-forwarded-for')?.split(',')[0]?.trim() ?? '127.0.0.1';
  const { success } = await authLimiter.limit(`${bucket}:${ip}`);
  return !success;
}

function safeRedirectPath(raw: FormDataEntryValue | null): string {
  return isSafeRedirectPath(raw) ? raw : '/dashboard';
}

export async function login(_prev: AuthState, formData: FormData): Promise<AuthState> {
  if (await limited('login')) {
    return { ok: false, message: 'Too many attempts. Please wait a minute.' };
  }
  const parsed = loginSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
  });
  if (!parsed.success) return { ok: false, message: BAD_CREDENTIALS };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) return { ok: false, message: BAD_CREDENTIALS };

  redirect(safeRedirectPath(formData.get('redirectTo')));
}

export async function signup(_prev: AuthState, formData: FormData): Promise<AuthState> {
  if (await limited('signup')) {
    return { ok: false, message: 'Too many attempts. Please wait a minute.' };
  }
  const parsed = signupSchema.safeParse({
    fullName: formData.get('fullName'),
    email: formData.get('email'),
    password: formData.get('password'),
  });
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? 'Invalid input' };
  }

  const next = safeRedirectPath(formData.get('redirectTo'));
  const supabase = await createClient();
  await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: { full_name: parsed.data.fullName },
      emailRedirectTo: `${env.NEXT_PUBLIC_APP_URL}/auth/callback?next=${encodeURIComponent(next)}`,
    },
  });
  // Same message whether the email is taken or not.
  return {
    ok: true,
    message: 'Check your inbox — if this email is available, a confirmation link is on its way.',
  };
}

export async function forgotPassword(_prev: AuthState, formData: FormData): Promise<AuthState> {
  if (await limited('forgot')) {
    return { ok: false, message: 'Too many attempts. Please wait a minute.' };
  }
  const generic = { ok: true, message: 'If this email has an account, a reset link has been sent.' };
  const parsed = emailSchema.safeParse(formData.get('email'));
  if (!parsed.success) return generic;

  const supabase = await createClient();
  await supabase.auth.resetPasswordForEmail(parsed.data, {
    redirectTo: `${env.NEXT_PUBLIC_APP_URL}/auth/callback?next=/reset-password`,
  });
  return generic;
}

export async function resetPassword(_prev: AuthState, formData: FormData): Promise<AuthState> {
  if (await limited('reset')) {
    return { ok: false, message: 'Too many attempts. Please wait a minute.' };
  }
  const parsed = passwordSchema.safeParse(formData.get('password'));
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? 'Invalid password' };
  }
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, message: 'Your reset link has expired. Please request a new one.' };
  }
  const { error } = await supabase.auth.updateUser({ password: parsed.data });
  if (error) return { ok: false, message: 'Could not update password. Try again.' };
  redirect('/dashboard');
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect('/');
}
