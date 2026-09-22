type Level = 'debug' | 'info' | 'warn' | 'error';

/** Readable message for Errors and for Supabase's plain-object errors (which stringify to "[object Object]"). */
export function errorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  const message = (err as { message?: unknown } | null)?.message;
  return typeof message === 'string' ? message : String(err);
}

/**
 * Structured logging. Never pass secrets, tokens, or raw webhook payloads as meta.
 */
export function log(level: Level, message: string, meta?: object) {
  const entry = { level, message, timestamp: new Date().toISOString(), ...meta };
  if (process.env.NODE_ENV === 'production') {
    console.log(JSON.stringify(entry));
  } else {
    console[level](message, meta ?? '');
  }
}
