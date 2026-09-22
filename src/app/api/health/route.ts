import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { isPaddleConfigured } from '@/lib/paddle/config';

export async function GET() {
  // Only a boolean — never which keys are missing.
  const payments = isPaddleConfigured() ? 'configured' : 'not_configured';
  try {
    const { error } = await createAdminClient().from('plans').select('id').limit(1);
    if (error) {
      return NextResponse.json({ status: 'degraded', db: 'error', payments }, { status: 503 });
    }
    return NextResponse.json({ status: 'ok', db: 'connected', payments });
  } catch {
    return NextResponse.json({ status: 'degraded', payments }, { status: 503 });
  }
}
