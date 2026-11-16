/**
 * Returns `target` only if it is a same-origin relative path (e.g. `/dashboard`
 * or `/invitations/abc/accept?x=1`). Anything else — absolute URLs, scheme-
 * relative (`//host`), backslash variants (`/\host`), other schemes or control
 * characters — falls back to `fallback`.
 */
export function safeRedirect(
  target: string | null | undefined,
  fallback = '/dashboard',
): string {
  if (!target || typeof target !== 'string') return fallback
  // Browsers strip tabs/newlines from URLs, which could turn `/\t/host` into `//host`.
  if (/[\u0000-\u001F\u007F]/.test(target)) return fallback
  if (!target.startsWith('/')) return fallback
  if (target.startsWith('//') || target.startsWith('/\\')) return fallback
  return target
}
