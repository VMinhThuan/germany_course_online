import { describe, expect, it } from 'vitest'
import { getReturnToFromSearch, sanitizeReturnTo } from './redirects'

describe('auth return destination sanitation', () => {
  it('keeps known internal student routes and their query state', () => {
    expect(sanitizeReturnTo('/student/courses?sort=recent#active')).toBe(
      '/student/courses?sort=recent#active',
    )
  })

  it.each([
    'https://evil.example/path',
    '//evil.example/path',
    '/\\evil.example',
    '/courses',
    '/student/../../login',
  ])('falls back for an unsafe or non-student target: %s', (target) => {
    expect(sanitizeReturnTo(target)).toBe('/student')
  })

  it('decodes returnTo from the login query and still sanitizes it', () => {
    expect(getReturnToFromSearch('returnTo=%2Fstudent%2Fcourses')).toBe('/student/courses')
    expect(getReturnToFromSearch('returnTo=https%3A%2F%2Fevil.example')).toBe('/student')
  })
})
