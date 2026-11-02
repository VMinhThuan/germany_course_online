const protectedTargets = new Set(['/student', '/student/courses'])

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
      !protectedTargets.has(parsed.pathname)
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
