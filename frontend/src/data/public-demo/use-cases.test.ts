import { describe, expect, it, vi } from 'vitest'
import { PUBLIC_DEMO_COURSE, PUBLIC_PREVIEW_MANIFEST } from './fixtures'
import { createPublicDemoRepository } from './repository'
import { getPreviewSections, isPreviewSectionAllowed, loadPreviewExperience } from './use-cases'
import type { PublicCourseRepository } from './types'

describe('public demo preview use cases', () => {
  it('validates exactly the configured published chapters', () => {
    const course = structuredClone(PUBLIC_DEMO_COURSE)
    const sections = getPreviewSections(course, PUBLIC_PREVIEW_MANIFEST)

    expect(sections?.map((section) => section.id)).toEqual([
      'a11-chapter-01',
      'a11-chapter-02',
      'a11-chapter-03',
    ])
    expect(sections?.every((section) => isPreviewSectionAllowed(section.id, sections))).toBe(true)
    expect(isPreviewSectionAllowed('a11-chapter-04', sections ?? [])).toBe(false)
  })

  it('rejects duplicate, cross-course, and non-chapter manifest entries', () => {
    const course = structuredClone(PUBLIC_DEMO_COURSE)
    expect(
      getPreviewSections(course, {
        ...PUBLIC_PREVIEW_MANIFEST,
        sectionIds: ['a11-chapter-01', 'a11-chapter-01', 'a11-chapter-03'],
      }),
    ).toBeNull()
    expect(
      getPreviewSections(course, { ...PUBLIC_PREVIEW_MANIFEST, courseSlug: 'another-course' }),
    ).toBeNull()
    expect(
      getPreviewSections(course, {
        ...PUBLIC_PREVIEW_MANIFEST,
        sectionIds: ['a11-chapter-01', 'a11-chapter-02', 'a11-exam-prep-01'],
      }),
    ).toBeNull()
  })

  it('returns not-found for an unknown course slug', async () => {
    const repository = createPublicDemoRepository()
    await expect(loadPreviewExperience(repository, 'not-a-course')).resolves.toEqual({
      kind: 'course-not-found',
    })
  })

  it('does not request preview content for a paid chapter', async () => {
    const base = createPublicDemoRepository()
    const getPreviewLesson = vi.fn(base.getPreviewLesson)
    const repository: PublicCourseRepository = { ...base, getPreviewLesson }

    const experience = await loadPreviewExperience(
      repository,
      'tieng-duc-a1-1',
      'a11-chapter-04',
      'a11-lesson-06',
    )

    expect(experience.kind).toBe('restricted-section')
    expect(getPreviewLesson).not.toHaveBeenCalled()
  })

  it('rejects a query section outside the course and never resolves its lesson', async () => {
    const base = createPublicDemoRepository()
    const getPreviewLesson = vi.fn(base.getPreviewLesson)
    const repository: PublicCourseRepository = { ...base, getPreviewLesson }

    const experience = await loadPreviewExperience(
      repository,
      'tieng-duc-a1-1',
      'not-a-section',
      'a11-lesson-01',
    )

    expect(experience.kind).toBe('invalid-section')
    expect(getPreviewLesson).not.toHaveBeenCalled()
  })

  it('returns available content only for a lesson in the preview manifest', async () => {
    const experience = await loadPreviewExperience(
      createPublicDemoRepository(),
      'tieng-duc-a1-1',
      'a11-chapter-02',
      'a11-lesson-03',
    )

    expect(experience.kind).toBe('available')
    if (experience.kind !== 'available') return
    expect(experience.content.lessonId).toBe('a11-lesson-03')
    expect(experience.content.media[0]).toMatchObject({
      availability: 'unavailable',
      message: 'Video học thử đang được cập nhật.',
    })
    expect(experience.content.media[0]).not.toHaveProperty('src')
  })

  it('keeps published preview lessons with missing fixture content in an empty state', async () => {
    const experience = await loadPreviewExperience(
      createPublicDemoRepository(),
      'tieng-duc-a1-1',
      'a11-chapter-01',
      'a11-lesson-02',
    )

    expect(experience.kind).toBe('content-missing')
  })

  it('contains only safe public course and lesson data', () => {
    const serialized = JSON.stringify({
      course: PUBLIC_DEMO_COURSE,
      manifest: PUBLIC_PREVIEW_MANIFEST,
    })
    expect(serialized).not.toMatch(/passwordHash|refreshTokenHash|userId|payment|quiz|isCorrect/i)
  })
})
