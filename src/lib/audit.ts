import 'server-only';

import { createAdminClient } from '@/lib/supabase/server';
import { log } from '@/lib/logger';

/** Audit trail for billing and entitlement changes. Never throws into the caller's flow. */
export async function audit(
  actor: string,
  action: string,
  entity?: string,
  entityId?: string,
  metadata?: Record<string, unknown>,
) {
  try {
    const supabase = createAdminClient();
    await supabase.from('audit_logs').insert({
      actor,
      action,
      entity: entity ?? null,
      entity_id: entityId ?? null,
      metadata: metadata ? JSON.parse(JSON.stringify(metadata)) : null,
    });
  } catch (err) {
    log('error', 'audit: write failed', { action, error: String(err) });
  }
}
