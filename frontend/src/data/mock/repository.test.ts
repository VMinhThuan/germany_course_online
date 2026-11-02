import { describe, expect, it } from 'vitest'
import { CourseStatus, EnrollmentStatus, SectionType } from '@/domains/contracts/backend-enums'
import { formatDateInTimezone, formatVnd } from '@/shared/lib/format'
import {
  A11_COURSE,
  MOCK_EXERCISE,
  MOCK_PREVIEW_MANIFEST,
  MOCK_QUIZ_ATTEMPT,
  MOCK_SCENARIO_FIXTURES,
  MOCK_SCENARIOS,
  accessFromEnrollment,
  createMockRepository,
  createScenarioClock,
} from '@/data/mock'
import { isMockPreviewSection } from '@/domains/catalog'

describe('Phase 1B typed mock foundation', () => {
  it('uses exactly the twelve requested deterministic scenario IDs', async () => {
    expect(MOCK_SCENARIOS).toHaveLength(12)
    expect(Object.keys(MOCK_SCENARIO_FIXTURES).sort()).toEqual([...MOCK_SCENARIOS].sort())
    const first = await createMockRepository('active_student').getCourseTree()
    const second = await createMockRepository('active_student').getCourseTree()
    expect(first).toEqual(second)
  })

  it('keeps the mock preview manifest on exactly three existing CHAPTER IDs', () => {
    expect(MOCK_PREVIEW_MANIFEST.mode).toBe('MOCK_ONLY')
    expect(MOCK_PREVIEW_MANIFEST.sectionIds).toHaveLength(3)
    const sections = A11_COURSE.sections
    for (const id of MOCK_PREVIEW_MANIFEST.sectionIds) {
      const section = sections.find((item) => item.id === id)
      expect(section).toBeDefined()
      expect(section?.sectionType).toBe('CHAPTER')
      expect(isMockPreviewSection(section!, MOCK_PREVIEW_MANIFEST)).toBe(true)
    }
    expect(isMockPreviewSection(A11_COURSE.sections[3]!, MOCK_PREVIEW_MANIFEST)).toBe(false)
  })

  it('keeps fixture relationships connected to the same course and stable lesson IDs', async () => {
    const tree = await createMockRepository('partially_completed_student').getCourseTree()
    expect(tree.courseId).toBe(A11_COURSE.id)
    const sectionIds = tree.sections.map((section) => section.id)
    expect(new Set(sectionIds).size).toBe(sectionIds.length)
    const lessonIds = tree.sections.flatMap((section) => section.lessons.map((lesson) => lesson.id))
    expect(new Set(lessonIds).size).toBe(lessonIds.length)
    expect(tree.sections.every((section) => section.courseId === tree.courseId)).toBe(true)
    expect(
      tree.sections
        .flatMap((section) => section.lessons)
        .filter((lesson) => lesson.progressStatus === 'COMPLETED'),
    ).toHaveLength(2)
    expect(MOCK_EXERCISE.assets.every((asset) => asset.id.includes('exercise-'))).toBe(true)
  })

  it('does not leak answer flags or storage keys into quiz start/media presentation models', async () => {
    const attempt = await createMockRepository('quiz_in_progress').getQuizAttempt(
      MOCK_QUIZ_ATTEMPT.id,
    )
    const safeModels = JSON.stringify({
      attempt,
      media: await createMockRepository('active_student').getLessonContent('a11-lesson-01'),
    })
    expect(safeModels).not.toContain('isCorrect')
    expect(safeModels).not.toContain('correctOptionId')
    expect(safeModels).not.toContain('storageKey')
  })

  it('derives expired display from the injected clock without changing EnrollmentStatus', async () => {
    const repository = createMockRepository('expired_enrollment', {
      clock: createScenarioClock('2026-11-02T08:00:00Z'),
    })
    const enrollment = await repository.getEnrollment(A11_COURSE.id)
    expect(enrollment?.status).toBe('ACTIVE')
    expect(enrollment?.accessState).toBe('expired-display')
    expect(accessFromEnrollment(enrollment ?? null).kind).toBe('expired-display')
  })

  it('uses a stable injectable clock and explicit Vietnam display formatting', () => {
    const clock = createScenarioClock('2026-01-01T18:30:00Z')
    const first = clock.now()
    first.setUTCFullYear(1999)
    expect(clock.now().toISOString()).toBe('2026-01-01T18:30:00.000Z')
    expect(formatDateInTimezone('2026-01-01T18:30:00Z')).toContain('02 thg 1, 2026')
    expect(formatVnd('123456789012345678')).toBe('123.456.789.012.345.678 ₫')
  })

  it('keeps pending payment separate from entitlement and coupon outcomes from fixture data', async () => {
    const repository = createMockRepository('payment_pending')
    expect((await repository.getOrders())[0]?.status).toBe('PENDING')
    expect(await repository.getEnrollment(A11_COURSE.id)).toBeNull()
    expect((await repository.getCourseAccess()).kind).toBe('restricted')
    const invalidCoupon = await createMockRepository('invalid_coupon').validateCoupon('A11-DEMO')
    expect(invalidCoupon).toMatchObject({ kind: 'invalid', status: 422, code: 'A11-DEMO' })
    const confirmed = await createMockRepository('payment_confirmed').getEnrollment(A11_COURSE.id)
    expect(confirmed?.accessState).toBe('available')
  })

  it('isolates note and exercise mutations per repository instance', async () => {
    const first = createMockRepository('active_student')
    const second = createMockRepository('active_student')
    await first.saveLessonNote('a11-lesson-01', 'Saved only here')
    expect(await first.getLessonNote('a11-lesson-01')).toBe('Saved only here')
    expect(await second.getLessonNote('a11-lesson-01')).not.toBe('Saved only here')
    const completed = await first.completeExercise(MOCK_EXERCISE.id)
    expect(completed.status).toBe('COMPLETED')
    expect(completed.capabilities.canViewSolutions).toBe(true)
    expect((await second.getExercise(MOCK_EXERCISE.id)).status).toBe('IN_PROGRESS')
  })

  it('supports successful empty list responses', async () => {
    const repository = createMockRepository('active_student', { responseMode: 'empty' })
    expect(await repository.getCourseCatalog()).toEqual([])
    expect(await repository.getSessions()).toEqual([])
    expect(await repository.getEnrollment(A11_COURSE.id)).toBeNull()
  })

  it.each([401, 403, 404, 409, 422, 429, 500] as const)(
    'preserves API error status, caller-supplied code, and envelope for HTTP %i',
    async (status) => {
      const repository = createMockRepository('active_student', {
        responseMode: 'api-error',
        failure: {
          mode: 'api-error',
          status,
          code: 'V3-CODE-FROM-FIXTURE',
          message: 'Fixture response failure.',
        },
      })
      await expect(repository.getCourseCatalog()).rejects.toMatchObject({
        failure: {
          kind: 'api',
          status,
          code: 'V3-CODE-FROM-FIXTURE',
          envelope: {
            success: false,
            error: {
              code: 'V3-CODE-FROM-FIXTURE',
              message: 'Fixture response failure.',
              details: null,
            },
          },
        },
      })
    },
  )

  it('maps network failures without inventing an API error code', async () => {
    const repository = createMockRepository('active_student', { responseMode: 'network-error' })
    await expect(repository.getCourseCatalog()).rejects.toMatchObject({
      failure: { kind: 'network' },
    })
  })

  it('keeps confirmed enum values separate from display states', () => {
    expect(CourseStatus).toEqual(['DRAFT', 'PUBLISHED', 'ARCHIVED'])
    expect(SectionType).toEqual(['CHAPTER', 'EXAM_PREP'])
    expect(EnrollmentStatus).toEqual(['ACTIVE', 'REVOKED'])
    expect(EnrollmentStatus).not.toContain('EXPIRED')
  })
})
