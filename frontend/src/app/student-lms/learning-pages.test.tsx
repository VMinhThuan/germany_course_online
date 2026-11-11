import { render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NotificationProvider } from '@/shared/ui/notifications'
import { LearningCoursePage, LearningLessonPage } from './learning-pages'

const mocks = vi.hoisted(() => ({
  useProductCourse: vi.fn(),
  useProductLesson: vi.fn(),
  useProductLessonNote: vi.fn(),
  useSaveLessonNote: vi.fn(),
  useCompleteExercise: vi.fn(),
  completeExercise: vi.fn(),
  useCompleteLesson: vi.fn(),
  completeLesson: vi.fn(),
  listLessonComments: vi.fn(),
}))

vi.mock('@/app/auth/auth-session', () => ({
  useAuthSession: () => ({ session: { id: 'session-1' } }),
}))

vi.mock('@/data/student-demo/product-queries', () => ({
  useProductCourse: mocks.useProductCourse,
  useProductLesson: mocks.useProductLesson,
  useProductLessonNote: mocks.useProductLessonNote,
  useSaveLessonNote: mocks.useSaveLessonNote,
  useCompleteExercise: mocks.useCompleteExercise,
  useCompleteLesson: mocks.useCompleteLesson,
}))

vi.mock('@/data/api/lesson-comments-repository', () => ({
  lessonCommentsRepository: {
    listLessonComments: mocks.listLessonComments,
  },
}))

vi.mock('./shared', () => ({
  ProductPage: ({
    title,
    heading,
    children,
  }: {
    title: string
    heading?: React.ReactNode
    children: React.ReactNode
  }) => (
    <main>
      {heading ?? <h1>{title}</h1>}
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

const courseData = {
  course: { id: 'course-1', slug: 'niveau-a1-1', title: 'Niveau A1.1', level: 'A1.1' },
  tree: {
    courseId: 'course-1',
    courseTitle: 'Niveau A1.1',
    currentLessonId: 'lesson-2',
    sections: [
      {
        id: 'section-1',
        courseId: 'course-1',
        title: 'Lektion 1',
        sectionType: 'CHAPTER' as const,
        contentStatus: 'PUBLISHED' as const,
        sortOrder: 1,
        lessons: [
          {
            id: 'lesson-1',
            title: 'Begrüßung und Abschied',
            lessonType: 'LECTURE' as const,
            contentStatus: 'PUBLISHED' as const,
            countsTowardProgress: true,
            progressStatus: 'COMPLETED' as const,
            hasVideo: true,
            exercises: [{ id: 'exercise-1', title: 'Arbeitsblatt', sortOrder: 1 }],
          },
          {
            id: 'lesson-2',
            title: 'Sich vorstellen',
            lessonType: 'LECTURE' as const,
            contentStatus: 'PUBLISHED' as const,
            countsTowardProgress: true,
            progressStatus: 'IN_PROGRESS' as const,
            hasVideo: true,
            exercises: [],
          },
        ],
      },
    ],
  },
  access: { kind: 'available' as const, label: 'Quyền học đang hoạt động' },
  progress: { courseId: 'course-1', percent: 50, completedLessons: 1, totalLessons: 2 },
}

function LocationProbe() {
  const location = useLocation()
  return <output data-testid="current-path">{location.pathname}</output>
}

function renderLesson() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <NotificationProvider>
        <MemoryRouter initialEntries={['/learn/lessons/lesson-2']}>
          <LocationProbe />
          <Routes>
            <Route path="/learn/lessons/:lessonId" element={<LearningLessonPage />} />
          </Routes>
        </MemoryRouter>
      </NotificationProvider>
    </QueryClientProvider>,
  )
}

describe('LearningLessonPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.useProductCourse.mockReturnValue({ data: courseData, isPending: false, isError: false })
    mocks.useProductLesson.mockReturnValue({ data: lessonData, isPending: false, isError: false })
    mocks.useProductLessonNote.mockReturnValue({ data: '', isPending: false, isError: false })
    mocks.useSaveLessonNote.mockReturnValue({ mutateAsync: vi.fn() })
    mocks.completeExercise.mockResolvedValue(undefined)
    mocks.useCompleteExercise.mockReturnValue({
      mutateAsync: mocks.completeExercise,
      isPending: false,
      isError: false,
    })
    mocks.completeLesson.mockResolvedValue(undefined)
    mocks.listLessonComments.mockResolvedValue({
      items: [],
      total: 0,
      hasMore: false,
      nextCursor: null,
    })
    mocks.useCompleteLesson.mockReturnValue({
      mutateAsync: mocks.completeLesson,
      isPending: false,
      isError: false,
    })
  })

  it('renders the custom lesson heading and the current lesson children only in the sidebar', async () => {
    renderLesson()

    expect(screen.getByRole('heading', { level: 1, name: 'Không gian bài học' })).toBeVisible()
    expect(await screen.findByRole('heading', { name: 'Thảo luận bài học' })).toBeVisible()
    await waitFor(() =>
      expect(mocks.listLessonComments).toHaveBeenCalledWith(
        'lesson-2',
        expect.objectContaining({ limit: 20, sort: 'newest' }),
      ),
    )
    expect(screen.getByRole('link', { name: /Video bài giảng/ })).toHaveAttribute(
      'href',
      '/learn/lessons/lesson-2',
    )
    expect(screen.queryByRole('link', { name: /Arbeitsblatt/ })).not.toBeInTheDocument()
  })

  it('shows the full-width lesson content without inventing empty exercise or answer sections', () => {
    renderLesson()

    expect(screen.getByRole('heading', { name: 'Sich vorstellen' })).toBeVisible()
    expect(screen.getByRole('heading', { name: 'Bài giảng' })).toBeVisible()
    expect(screen.queryByRole('heading', { name: 'Bài tập' })).not.toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Đáp án' })).not.toBeInTheDocument()
    expect(
      screen.queryByRole('complementary', { name: 'Điều hướng bài học' }),
    ).not.toBeInTheDocument()
    expect(screen.queryByRole('navigation', { name: 'Các bài trong khóa học' })).toBeNull()

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

  it('renders file-based exercises and their PDFs directly in the lesson', async () => {
    const user = userEvent.setup()
    mocks.useProductLesson.mockReturnValue({
      data: {
        ...lessonData,
        exercises: [
          {
            id: 'exercise-1',
            lessonId: 'lesson-2',
            title: 'Arbeitsblatt · Sich vorstellen',
            description: 'Bài tập PDF của Lektion 1.',
            instructions: 'Mở PDF và hoàn thành các câu hỏi.',
            exerciseType: 'FILE_BASED',
            completionMode: 'MANUAL',
            status: 'NOT_STARTED',
            isRequired: true,
            assets: [
              {
                id: 'question-pdf-1',
                title: 'Arbeitsblatt.pdf',
                role: 'QUESTION_PDF',
                mediaType: 'PDF',
                canDownload: false,
                availability: 'unavailable',
              },
            ],
            capabilities: { canMarkComplete: true, canViewSolutions: false },
            href: '/learn/exercises/exercise-1',
          },
        ],
      },
      isPending: false,
      isError: false,
    })

    renderLesson()

    expect(screen.getByRole('heading', { name: 'Arbeitsblatt · Sich vorstellen' })).toBeVisible()
    expect(screen.getByText('Mở PDF và hoàn thành các câu hỏi.')).toBeVisible()
    expect(screen.getByRole('region', { name: 'Arbeitsblatt.pdf' })).toBeVisible()

    await user.click(screen.getByRole('button', { name: 'Đánh dấu hoàn thành' }))

    expect(mocks.completeExercise).toHaveBeenCalledWith('exercise-1')
    expect(await screen.findByText('Bài tập đã hoàn thành')).toBeVisible()
  })

  it('shows a linked quiz card with its question count in the lesson exercise list', () => {
    mocks.useProductLesson.mockReturnValue({
      data: {
        ...lessonData,
        exercises: [
          {
            id: 'quiz-exercise-1',
            lessonId: 'lesson-2',
            title: 'Verbkonjugation',
            description: 'Luyện chia động từ.',
            instructions: 'Chọn đáp án phù hợp.',
            exerciseType: 'QUIZ',
            completionMode: 'QUIZ_SUBMISSION',
            status: 'NOT_STARTED',
            isRequired: true,
            assets: [],
            capabilities: { canMarkComplete: false, canViewSolutions: false },
            quiz: {
              title: 'Unregelmäßige Verben',
              description: 'Ôn lại động từ bất quy tắc.',
              questionCount: 20,
            },
            href: '/learn/exercises/quiz-exercise-1',
          },
        ],
      },
      isPending: false,
      isError: false,
    })

    renderLesson()

    const card = screen.getByRole('link', { name: /Unregelmäßige Verben/ })
    expect(card).toHaveAttribute('href', '/learn/exercises/quiz-exercise-1')
    expect(card).toHaveTextContent('Bài kiểm tra · 20 câu')
    expect(card).toHaveTextContent('Ôn lại động từ bất quy tắc.')
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

    expect(screen.getByTitle('Video chữa bài · Sich vorstellen')).toHaveAttribute(
      'src',
      'https://www.youtube-nocookie.com/embed/lamg3tUwct4?rel=0',
    )
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

describe('LearningCoursePage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.useProductCourse.mockReturnValue({ data: courseData, isPending: false, isError: false })
  })

  it('separates the decorative heading from the dynamic course title and opens real child items', async () => {
    const user = userEvent.setup()
    render(
      <MemoryRouter initialEntries={['/learn/courses/course-1']}>
        <LocationProbe />
        <Routes>
          <Route path="/learn/courses/:courseId" element={<LearningCoursePage />} />
          <Route path="/learn/exercises/:exerciseId" element={<div>Exercise destination</div>} />
        </Routes>
      </MemoryRouter>,
    )

    expect(screen.getByRole('heading', { level: 1, name: 'Không gian khóa học' })).toBeVisible()
    expect(screen.getByText('Niveau A1.1')).toBeVisible()
    expect(screen.getByRole('button', { name: /Begrüßung und Abschied.*Xong/ })).toHaveAttribute(
      'aria-expanded',
      'false',
    )

    await user.click(screen.getByRole('button', { name: /Begrüßung und Abschied.*Xong/ }))
    expect(screen.getByRole('link', { name: /Video bài giảng/ })).toHaveAttribute(
      'href',
      '/learn/lessons/lesson-1',
    )
    expect(screen.getByRole('link', { name: /Arbeitsblatt/ })).toHaveAttribute(
      'href',
      '/learn/exercises/exercise-1',
    )
    expect(screen.queryByText(/Chưa có video hoặc bài tập được công bố/)).not.toBeInTheDocument()

    await user.click(screen.getByRole('link', { name: /Arbeitsblatt/ }))
    expect(screen.getByTestId('current-path')).toHaveTextContent('/learn/exercises/exercise-1')
  })
})
