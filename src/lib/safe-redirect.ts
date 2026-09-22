/**
 * Guards every post-auth redirect target (login/signup `redirectTo`, email
 * confirmation/OAuth `next`, proxy bounce-back) against open redirects.
 * Only same-origin relative paths are valid — no protocol-relative ("//host"),
 * backslash tricks ("/\host", which some browsers treat as "//host"), or
 * absolute URLs.
 */
export function isSafeRedirectPath(path: unknown): path is string {
  return typeof path === 'string' && path.startsWith('/') && !path.startsWith('//') && !path.includes('\\');
}
