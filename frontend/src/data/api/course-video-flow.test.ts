import { describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/api/client', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/api/client')>()
  return { ...actual, apiRequest: vi.fn() }
})

import { apiPublicRepository } from './public-repository'
import { apiStudentRepositories } from './student-repository'
import { apiRequest } from '@/lib/api/client'

const requestMock = vi.mocked(apiRequest)

describe('A1.1 real API data mapping', () => {
  it('maps the public course API outline into catalog view models', async () => {
    requestMock.mockResolvedValueOnce({
      id: 'course-id',
      code: 'NIVEAU_A1_1',
      slug: 'niveau-a1-1',
      title: 'Niveau A1.1',
      description: 'Các bài học tiếng Đức trình độ A1.1 dành cho người mới bắt đầu.',
      shortDescription: 'Học tiếng Đức A1.1 qua các bài giảng YouTube.',
      objectives: [],
      requirements: [],
      level: 'A1.1',
      price: '1000000',
      accessDurationMonths: 6,
      thumbnail: null,
      banner: null,
      introMedia: null,
      sections: [
        {
          id: 'section-id',
          title: 'Lektion 1',
          description: '',
          sortOrder: 1,
          lessonCount: 7,
          lessons: [
            {
              id: 'lesson-id',
              title: 'Begrüßung und Abschied',
              description: '',
              lessonType: 'LECTURE',
              estimatedMinutes: null,
              sortOrder: 1,
            },
          ],
        },
      ],
    })

    const course = await apiPublicRepository.getCourseBySlug('niveau-a1-1')

    expect(course).toMatchObject({
      title: 'Niveau A1.1',
      priceVnd: '1000000',
      accessDurationMonths: 6,
      sections: [
        {
          title: 'Lektion 1',
          lessons: [{ title: 'Begrüßung und Abschied', lessonType: 'LECTURE' }],
        },
      ],
    })
  })

  it('passes the authorized Lesson DTO video ID through to the student view model', async () => {
    requestMock
      .mockResolvedValueOnce({
        id: 'lesson-id',
        courseId: 'course-id',
        sectionId: 'section-id',
        title: 'Begrüßung und Abschied',
        description: '',
        content: { version: 1, paragraphs: [] },
        video: { provider: 'YOUTUBE', videoId: 'lamg3tUwct4' },
        lessonType: 'LECTURE',
        estimatedMinutes: null,
        countsTowardProgress: true,
        assets: [],
        media: [],
        exercises: [],
        canCompleteLesson: true,
        outstandingRequiredCount: 0,
      })
      .mockResolvedValueOnce({
        course: { id: 'course-id', slug: 'niveau-a1-1', title: 'Niveau A1.1', level: 'A1.1' },
        sections: [
          {
            id: 'section-id',
            title: 'Lektion 1',
            description: '',
            sectionType: 'CHAPTER',
            sortOrder: 1,
            lessons: [
              {
                id: 'lesson-id',
                title: 'Begrüßung und Abschied',
                description: '',
                lessonType: 'LECTURE',
                estimatedMinutes: null,
                countsTowardProgress: true,
                sortOrder: 1,
                progress: {
                  lessonId: 'lesson-id',
                  status: 'NOT_STARTED',
                  completedAt: null,
                },
              },
            ],
          },
        ],
        access: 'ACTIVE',
        progress: {
          courseId: 'course-id',
          percent: 0,
          completedLessons: 0,
          totalLessons: 9,
        },
      })

    const lesson = await apiStudentRepositories.learning.getLesson('session-id', 'lesson-id')

    expect(lesson.video).toEqual({ provider: 'YOUTUBE', videoId: 'lamg3tUwct4' })
    expect(lesson.lesson.title).toBe('Begrüßung und Abschied')
  })
})
