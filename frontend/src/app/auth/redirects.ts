const protectedTargets = new Set([
  '/student',
  '/student/courses',
  '/student/progress',
  '/student/orders',
  '/student/profile',
  '/student/security/password',
  '/student/security/sessions',
])

const protectedTargetPatterns = [
  /^\/learn\/courses\/[A-Za-z0-9_-]+$/,
  /^\/learn\/courses\/[A-Za-z0-9_-]+\/sections\/[A-Za-z0-9_-]+$/,
  /^\/learn\/lessons\/[A-Za-z0-9_-]+$/,
  /^\/learn\/exercises\/[A-Za-z0-9_-]+$/,
  /^\/learn\/quizzes\/[A-Za-z0-9_-]+(?:\/result)?$/,
  /^\/checkout\/[A-Za-z0-9_-]+$/,
  /^\/orders\/[A-Za-z0-9_-]+\/(?:pending|result)$/,
  /^\/student\/orders\/[A-Za-z0-9_-]+$/,
  /^\/student\/courses\/[A-Za-z0-9_-]+\/renew$/,
]

/** Restrict returnTo to known internal student pages; it can never redirect to another origin. */
export function sanitizeReturnTo(value: string | null | undefined, fallback = '/student') {
  if (!value || !value.startsWith('/') || value.startsWith('//') || value.includes('\\')) {
    return fallback
  }
  if (
    [...value].some((character) => character.charCodeAt(0) < 32 || character.charCodeAt(0) === 127)
  ) {
    return fallback
  }

  try {
    const parsed = new URL(value, 'https://deutsch-demo.invalid')
    if (
      parsed.origin !== 'https://deutsch-demo.invalid' ||
      (!protectedTargets.has(parsed.pathname) &&
        !protectedTargetPatterns.some((pattern) => pattern.test(parsed.pathname)))
    ) {
      return fallback
    }
    return `${parsed.pathname}${parsed.search}${parsed.hash}`
  } catch {
    return fallback
  }
}

export function getReturnToFromSearch(search: string) {
  const params = new URLSearchParams(search)
  return sanitizeReturnTo(params.get('returnTo'))
}
