export function sanitizeInternalRedirect(
  redirectTarget: string | null | undefined,
  fallback = '/'
): string {
  if (!redirectTarget) return fallback

  // Only allow same-origin path redirects.
  if (!redirectTarget.startsWith('/')) return fallback
  if (redirectTarget.startsWith('//')) return fallback

  return redirectTarget
}
