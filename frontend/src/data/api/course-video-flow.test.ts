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
        solutionVideo: null,
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
    expect(lesson.solutionVideo).toBeNull()
    expect(lesson.lesson.title).toBe('Begrüßung und Abschied')
  })

  it('maps chapter and lesson order, enables adjacent lessons, and loads permitted solution videos', async () => {
    requestMock
      .mockResolvedValueOnce({
        id: 'lesson-2',
        courseId: 'course-id',
        sectionId: 'section-1',
        title: 'Sich vorstellen',
        description: '',
        content: { version: 1, paragraphs: [] },
        video: null,
        solutionVideo: null,
        lessonType: 'LECTURE',
        estimatedMinutes: null,
        countsTowardProgress: true,
        assets: [],
        media: [],
        exercises: [
          {
            id: 'exercise-1',
            lessonId: 'lesson-2',
            title: 'Vorstellung üben',
            description: null,
            instructions: '',
            exerciseType: 'FILE_BASED',
            completionMode: 'MANUAL',
            isRequired: true,
            sortOrder: 1,
            assets: [
              {
                assetId: 'solution-video-1',
                role: 'SOLUTION_VIDEO',
                title: null,
                mediaType: 'VIDEO',
                mimeType: 'video/mp4',
                fileSize: 1024,
                durationSeconds: 60,
              },
            ],
            progress: {
              exerciseId: 'exercise-1',
              status: 'COMPLETED',
              completionSource: 'MANUAL',
              completedAt: null,
            },
            capabilities: { canMarkComplete: false, canViewSolutions: true },
          },
        ],
        canCompleteLesson: true,
        outstandingRequiredCount: 0,
      })
      .mockResolvedValueOnce({
        course: { id: 'course-id', slug: 'niveau-a1-1', title: 'Niveau A1.1', level: 'A1.1' },
        sections: [
          {
            id: 'section-1',
            title: 'Lektion 1',
            description: '',
            sectionType: 'CHAPTER',
            sortOrder: 1,
            lessons: [
              {
                id: 'lesson-1',
                title: 'Begrüßung und Abschied',
                description: '',
                lessonType: 'LECTURE',
                estimatedMinutes: null,
                countsTowardProgress: true,
                sortOrder: 1,
                progress: {
                  lessonId: 'lesson-1',
                  status: 'COMPLETED',
                  completedAt: null,
                },
              },
              {
                id: 'lesson-2',
                title: 'Sich vorstellen',
                description: '',
                lessonType: 'LECTURE',
                estimatedMinutes: null,
                countsTowardProgress: true,
                sortOrder: 2,
                progress: {
                  lessonId: 'lesson-2',
                  status: 'IN_PROGRESS',
                  completedAt: null,
                },
              },
            ],
          },
          {
            id: 'section-2',
            title: 'Lektion 2',
            description: '',
            sectionType: 'CHAPTER',
            sortOrder: 2,
            lessons: [
              {
                id: 'lesson-3',
                title: 'Die Länder',
                description: '',
                lessonType: 'LECTURE',
                estimatedMinutes: null,
                countsTowardProgress: true,
                sortOrder: 1,
                progress: {
                  lessonId: 'lesson-3',
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
          percent: 33,
          completedLessons: 1,
          totalLessons: 3,
        },
      })
      .mockResolvedValueOnce({
        assetId: 'solution-video-1',
        url: 'https://media.example.test/solution.mp4',
        expiresAt: '2026-11-05T00:00:00.000Z',
        mediaType: 'VIDEO',
      })

    const lesson = await apiStudentRepositories.learning.getLesson('session-id', 'lesson-2')

    expect(lesson.sectionTitle).toBe('Lektion 1')
    expect(lesson.lessonNumber).toBe(2)
    expect(lesson.previousLessonId).toBe('lesson-1')
    expect(lesson.nextLessonId).toBe('lesson-3')
    expect(lesson.progressItems.map((item) => [item.sectionTitle, item.lessonNumber])).toEqual([
      ['Lektion 1', 1],
      ['Lektion 1', 2],
      ['Lektion 2', 1],
    ])
    expect(lesson.solutionVideos).toEqual([
      expect.objectContaining({
        exerciseTitle: 'Vorstellung üben',
        media: expect.objectContaining({
          title: 'Video chữa bài · Vorstellung üben',
          src: 'https://media.example.test/solution.mp4',
          availability: 'ready',
        }),
      }),
    ])
  })

  it('loads signed question PDFs into the lesson exercise view model', async () => {
    requestMock
      .mockResolvedValueOnce({
        id: 'lesson-id',
        courseId: 'course-id',
        sectionId: 'section-id',
        title: 'Begrüßung und Abschied',
        description: '',
        content: { version: 1, paragraphs: [] },
        video: null,
        solutionVideo: null,
        lessonType: 'LECTURE',
        estimatedMinutes: null,
        countsTowardProgress: true,
        assets: [],
        media: [],
        exercises: [
          {
            id: 'exercise-id',
            lessonId: 'lesson-id',
            title: 'Arbeitsblatt · Begrüßung',
            description: null,
            instructions: 'Lies das PDF und beantworte die Fragen.',
            exerciseType: 'FILE_BASED',
            completionMode: 'MANUAL',
            isRequired: true,
            sortOrder: 0,
            assets: [
              {
                assetId: 'question-pdf-id',
                role: 'QUESTION_PDF',
                title: 'Arbeitsblatt.pdf',
                mediaType: 'PDF',
                mimeType: 'application/pdf',
                fileSize: 2048,
                durationSeconds: null,
              },
            ],
            progress: {
              exerciseId: 'exercise-id',
              status: 'NOT_STARTED',
              completionSource: null,
              completedAt: null,
            },
            capabilities: { canMarkComplete: true, canViewSolutions: false },
          },
        ],
        canCompleteLesson: false,
        outstandingRequiredCount: 1,
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
        progress: { courseId: 'course-id', percent: 0, completedLessons: 0, totalLessons: 1 },
      })
      .mockResolvedValueOnce({
        assetId: 'question-pdf-id',
        url: 'https://media.example.test/question.pdf',
        expiresAt: '2026-11-05T00:00:00.000Z',
        mediaType: 'PDF',
      })

    const lesson = await apiStudentRepositories.learning.getLesson('session-id', 'lesson-id')

    expect(lesson.exercises[0]).toMatchObject({
      id: 'exercise-id',
      title: 'Arbeitsblatt · Begrüßung',
      instructions: 'Lies das PDF und beantworte die Fragen.',
      exerciseType: 'FILE_BASED',
      assets: [
        {
          id: 'question-pdf-id',
          title: 'Arbeitsblatt.pdf',
          role: 'QUESTION_PDF',
          mediaType: 'PDF',
          src: 'https://media.example.test/question.pdf',
          availability: 'ready',
        },
      ],
    })
    expect(requestMock).toHaveBeenCalledWith('/learn/media-access', {
      method: 'POST',
      body: { assetId: 'question-pdf-id', exerciseId: 'exercise-id' },
    })
  })
})
