/**
 * Plan limits, shared by the converter UI (for instant feedback) and the usage
 * API (which enforces them). Client-safe. `null` means unlimited.
 */

export type Tier = 'anonymous' | 'free' | 'pro';

export const MB = 1024 * 1024;

export type PlanLimits = {
  filesPerDay: number | null;
  maxFileBytes: number;
  maxBatch: number;
  proRunsPerDay: number | null;
};

export const PLAN_LIMITS: Record<Tier, PlanLimits> = {
  anonymous: { filesPerDay: 1, maxFileBytes: 25 * MB, maxBatch: 3, proRunsPerDay: 0 },
  free: { filesPerDay: 5, maxFileBytes: 50 * MB, maxBatch: 5, proRunsPerDay: 1 },
  pro: { filesPerDay: null, maxFileBytes: 1024 * MB, maxBatch: 50, proRunsPerDay: null },
};

/**
 * `sign_in_required`: Pro tools need an account (visitors get none).
 * `pro_limit`: the free account's daily Pro-tool run is already used up.
 */
export type UsageDenial =
  | 'daily_limit'
  | 'pro_limit'
  | 'sign_in_required'
  | 'file_too_large'
  | 'batch_too_large';

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const units = ['KB', 'MB', 'GB'];
  let value = bytes / 1024;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  return `${value >= 10 || Number.isInteger(value) ? Math.round(value) : value.toFixed(1)} ${units[unit]}`;
}

/** "1 file" / "5 files" — daily limits appear in prose across the marketing copy. */
export function fileCount(count: number): string {
  return `${count} file${count === 1 ? '' : 's'}`;
}
