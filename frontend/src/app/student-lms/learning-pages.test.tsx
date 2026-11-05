import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NotificationProvider } from '@/shared/ui/notifications'
import { LearningLessonPage } from './learning-pages'

const mocks = vi.hoisted(() => ({
  useProductLesson: vi.fn(),
  useProductLessonNote: vi.fn(),
  useSaveLessonNote: vi.fn(),
  useCompleteLesson: vi.fn(),
  completeLesson: vi.fn(),
}))

vi.mock('@/app/auth/auth-session', () => ({
  useAuthSession: () => ({ session: { id: 'session-1' } }),
}))

vi.mock('@/data/student-demo/product-queries', () => ({
  useProductLesson: mocks.useProductLesson,
  useProductLessonNote: mocks.useProductLessonNote,
  useSaveLessonNote: mocks.useSaveLessonNote,
  useCompleteLesson: mocks.useCompleteLesson,
}))

vi.mock('./shared', () => ({
  ProductPage: ({ title, children }: { title: string; children: React.ReactNode }) => (
    <main>
      <h1>{title}</h1>
      {children}
    </main>
  ),
  ProductError: () => null,
  ProductLoading: () => null,
  ProductNotFound: () => null,
}))

const lessonData = {
  lesson: {
    id: 'lesson-2',
    title: 'Sich vorstellen',
    lessonType: 'LECTURE' as const,
    contentStatus: 'PUBLISHED' as const,
    countsTowardProgress: true,
    progressStatus: 'NOT_STARTED' as const,
  },
  courseId: 'course-1',
  courseTitle: 'Niveau A1.1',
  sectionId: 'section-1',
  sectionTitle: 'Lektion 1',
  lessonNumber: 2,
  paragraphs: [],
  video: null,
  solutionVideo: null,
  media: [],
  access: { kind: 'available' as const, label: 'Quyền học đang hoạt động' },
  exercises: [],
  solutionVideos: [],
  hasRestrictedSolutionVideos: false,
  progressItems: [
    {
      lessonId: 'lesson-1',
      title: 'Begrüßung und Abschied',
      status: 'COMPLETED' as const,
      href: '/learn/lessons/lesson-1',
      sectionId: 'section-1',
      sectionTitle: 'Lektion 1',
      lessonNumber: 1,
    },
    {
      lessonId: 'lesson-2',
      title: 'Sich vorstellen',
      status: 'NOT_STARTED' as const,
      href: '/learn/lessons/lesson-2',
      sectionId: 'section-1',
      sectionTitle: 'Lektion 1',
      lessonNumber: 2,
    },
    {
      lessonId: 'lesson-3',
      title: 'Die Länder',
      status: 'NOT_STARTED' as const,
      href: '/learn/lessons/lesson-3',
      sectionId: 'section-2',
      sectionTitle: 'Lektion 2',
      lessonNumber: 1,
    },
  ],
  canCompleteLesson: true,
  isCompleted: false,
  previousLessonId: 'lesson-1',
  nextLessonId: 'lesson-3',
}

function LocationProbe() {
  const location = useLocation()
  return <output data-testid="current-path">{location.pathname}</output>
}

function renderLesson() {
  return render(
    <NotificationProvider>
      <MemoryRouter initialEntries={['/learn/lessons/lesson-2']}>
        <LocationProbe />
        <Routes>
          <Route path="/learn/lessons/:lessonId" element={<LearningLessonPage />} />
        </Routes>
      </MemoryRouter>
    </NotificationProvider>,
  )
}

describe('LearningLessonPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.useProductLesson.mockReturnValue({ data: lessonData, isPending: false, isError: false })
    mocks.useProductLessonNote.mockReturnValue({ data: '', isPending: false, isError: false })
    mocks.useSaveLessonNote.mockReturnValue({ mutateAsync: vi.fn() })
    mocks.completeLesson.mockResolvedValue(undefined)
    mocks.useCompleteLesson.mockReturnValue({
      mutateAsync: mocks.completeLesson,
      isPending: false,
      isError: false,
    })
  })

  it('shows the chapter and lesson number, full-width lesson content, and the answer empty state', () => {
    renderLesson()

    expect(screen.getByText('Lektion 1 · Bài 2')).toBeVisible()
    expect(screen.getByRole('heading', { name: 'Bài giảng của bài học' })).toBeVisible()
    expect(screen.getByRole('heading', { name: 'Bài tập của bài học' })).toBeVisible()
    expect(screen.getByRole('heading', { name: 'Đáp án bài tập' })).toBeVisible()
    expect(screen.getByText('Bài này chưa có đáp án.')).toBeVisible()
    expect(screen.getByRole('link', { name: /Bài 1: Begrüßung und Abschied/ })).toBeVisible()

    const article = screen.getByRole('heading', { name: 'Sich vorstellen' }).closest('article')
    expect(article).toHaveClass('w-full')
    expect(article).not.toHaveClass('max-w-3xl')
  })

  it('renders an authorized exercise solution video', () => {
    mocks.useProductLesson.mockReturnValue({
      data: {
        ...lessonData,
        solutionVideos: [
          {
            exerciseId: 'exercise-1',
            exerciseTitle: 'Vorstellung üben',
            media: {
              id: 'solution-video-1',
              title: 'Video chữa bài · Vorstellung üben',
              mediaType: 'VIDEO',
              src: 'https://media.example.test/solution.mp4',
              canDownload: false,
              availability: 'ready',
            },
          },
        ],
      },
      isPending: false,
      isError: false,
    })
    renderLesson()

    expect(screen.getByLabelText('Video chữa bài · Vorstellung üben')).toBeVisible()
  })

  it('renders a YouTube lesson solution video', () => {
    mocks.useProductLesson.mockReturnValue({
      data: {
        ...lessonData,
        solutionVideo: { provider: 'YOUTUBE', videoId: 'lamg3tUwct4' },
      },
      isPending: false,
      isError: false,
    })
    renderLesson()

    expect(
      screen.getByRole('button', { name: 'Tải video: Video chữa bài · Sich vorstellen' }),
    ).toBeVisible()
  })

  it('navigates to the previous and next lesson', async () => {
    const user = userEvent.setup()
    renderLesson()

    await user.click(screen.getByRole('button', { name: 'Bài trước' }))
    await waitFor(() => expect(screen.getByTestId('current-path')).toHaveTextContent('lesson-1'))

    await user.click(screen.getByRole('button', { name: 'Bài tiếp' }))
    await waitFor(() => expect(screen.getByTestId('current-path')).toHaveTextContent('lesson-3'))
  })

  it('shows a success toast after the lesson is completed', async () => {
    const user = userEvent.setup()
    renderLesson()

    await user.click(screen.getByRole('button', { name: 'Hoàn thành bài học' }))

    expect(mocks.completeLesson).toHaveBeenCalledWith('lesson-2')
    expect(await screen.findByText('Bài học đã hoàn thành')).toBeVisible()
  })
})
