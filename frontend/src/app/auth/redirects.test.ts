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

  it.each([
    '/learn/courses/course-a11-demo',
    '/learn/courses/course-a11-demo/sections/section-greetings',
    '/learn/lessons/a11-lesson-01#notes',
    '/learn/exercises/exercise-a11-greeting',
    '/learn/quizzes/attempt-1/result',
    '/checkout/purchase-course-a11-demo',
    '/orders/demo-order-1/pending',
    '/student/orders/demo-order-1',
    '/student/courses/course-a11-demo/renew',
    '/student/security/password',
  ])('keeps a protected product route: %s', (target) => {
    expect(sanitizeReturnTo(target)).toBe(target)
  })

  it.each([
    '/learn/lessons/one/two',
    '/checkout/https://evil.example',
    '/orders/order-id/other',
    '/student/orders/../login',
  ])('rejects an unrecognized protected path: %s', (target) => {
    expect(sanitizeReturnTo(target)).toBe('/student')
  })
})
