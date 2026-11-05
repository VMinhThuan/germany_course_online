import type { ReactNode } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, useLocation } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { adminRepository } from '@/data/api/admin-repository'
import type {
  ApiAdminCourse,
  ApiAdminExercise,
  ApiAdminLesson,
  ApiAdminMediaAsset,
  ApiAdminSection,
} from '@/lib/api/types'
import { DialogProvider } from '@/shared/ui/dialogs'
import { NotificationProvider } from '@/shared/ui/notifications'
import {
  AdminExercisesPage,
  AdminLessonCreatePage,
  AdminLessonDetailPage,
  AdminLessonsPage,
  AdminSectionsPage,
} from './content-management-pages'

vi.mock('@/data/api/admin-repository', () => ({
  adminRepository: {
    listCourses: vi.fn(),
    listSections: vi.fn(),
    listLessons: vi.fn(),
    listExercises: vi.fn(),
    createSection: vi.fn(),
    updateSection: vi.fn(),
    deleteSection: vi.fn(),
    createLesson: vi.fn(),
    updateLesson: vi.fn(),
    deleteLesson: vi.fn(),
    createExercise: vi.fn(),
    updateExercise: vi.fn(),
    deleteExercise: vi.fn(),
    getMediaCapabilities: vi.fn(),
    listMedia: vi.fn(),
    createUploadIntent: vi.fn(),
    uploadFile: vi.fn(),
    completeUpload: vi.fn(),
    deleteMedia: vi.fn(),
    linkExerciseAsset: vi.fn(),
  },
}))

const course: ApiAdminCourse = {
  id: 'course-1',
  code: 'A1-1',
  slug: 'german-a1-1',
  title: 'Tiếng Đức A1.1',
  description: 'Mô tả khóa học',
  shortDescription: 'Khóa học A1.1',
  objectives: [],
  requirements: [],
  level: 'A1',
  thumbnailAssetId: null,
  bannerAssetId: null,
  introVideoAssetId: null,
  price: '1000000',
  accessDurationMonths: 12,
  sortOrder: 0,
  status: 'PUBLISHED',
  createdAt: '2026-11-05T00:00:00.000Z',
  updatedAt: '2026-11-05T00:00:00.000Z',
  deletedAt: null,
}

const section: ApiAdminSection = {
  id: 'section-1',
  courseId: course.id,
  title: 'Lektion 1',
  description: null,
  sectionType: 'CHAPTER',
  sortOrder: 0,
  status: 'PUBLISHED',
  createdAt: '2026-11-05T00:00:00.000Z',
  updatedAt: '2026-11-05T00:00:00.000Z',
  deletedAt: null,
}

const lesson: ApiAdminLesson = {
  id: 'lesson-1',
  sectionId: section.id,
  title: 'Begrüßung und Abschied',
  description: null,
  content: null,
  video: null,
  solutionVideo: null,
  lessonType: 'LECTURE',
  estimatedMinutes: null,
  countsTowardProgress: true,
  sortOrder: 0,
  status: 'PUBLISHED',
  createdAt: '2026-11-05T00:00:00.000Z',
  updatedAt: '2026-11-05T00:00:00.000Z',
  deletedAt: null,
}

const exercise: ApiAdminExercise = {
  id: 'exercise-1',
  lessonId: lesson.id,
  title: 'Arbeitsblatt',
  description: null,
  instructions: 'Làm bài trong PDF.',
  exerciseType: 'FILE_BASED',
  completionMode: 'MANUAL',
  isRequired: true,
  sortOrder: 0,
  status: 'DRAFT',
  createdAt: '2026-11-05T00:00:00.000Z',
  updatedAt: '2026-11-05T00:00:00.000Z',
  deletedAt: null,
}

const pdf: ApiAdminMediaAsset = {
  id: 'media-1',
  originalName: 'arbeitsblatt.pdf',
  mediaType: 'PDF',
  mimeType: 'application/pdf',
  fileSize: 2048,
  durationSeconds: null,
  visibility: 'ENROLLED',
  uploadedById: null,
  createdAt: '2026-11-05T00:00:00.000Z',
  provider: 'CLOUDINARY',
  uploadStatus: 'READY',
  usageCount: 0,
}

function page<T>(items: T[]) {
  return { items, page: 1, pageSize: 100, total: items.length, hasMore: false }
}

function LocationDisplay() {
  const location = useLocation()
  return <output aria-label="Đường dẫn hiện tại">{location.pathname}</output>
}

function renderPage(child: ReactNode, initialPath = '/admin/exercises') {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  return render(
    <NotificationProvider>
      <DialogProvider>
        <QueryClientProvider client={queryClient}>
          <MemoryRouter initialEntries={[initialPath]}>
            {child}
            <LocationDisplay />
          </MemoryRouter>
        </QueryClientProvider>
      </DialogProvider>
    </NotificationProvider>,
  )
}

async function chooseExerciseLocation(user: ReturnType<typeof userEvent.setup>) {
  const courseSelect = screen.getByRole('combobox', { name: '1. Khóa học' })
  await user.click(courseSelect)
  await user.click(await screen.findByRole('option', { name: /Tiếng Đức A1\.1/ }))

  const sectionSelect = screen.getByRole('combobox', { name: '2. Chương' })
  await user.click(sectionSelect)
  await user.click(await screen.findByRole('option', { name: /Lektion 1/ }))

  const lessonSelect = screen.getByRole('combobox', { name: '3. Bài học' })
  await user.click(lessonSelect)
  await user.click(await screen.findByRole('option', { name: /Begrüßung und Abschied/ }))
}

async function openExerciseCreateDialog(user: ReturnType<typeof userEvent.setup>) {
  await screen.findByRole('heading', { name: 'Danh sách bài tập' })
  await user.click(screen.getByRole('button', { name: 'Tạo bài tập' }))
  await screen.findByRole('dialog', { name: 'Tạo bài tập mới' })
  await chooseExerciseLocation(user)
}

describe('course content management', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(adminRepository.listCourses).mockResolvedValue(page([course]))
    vi.mocked(adminRepository.listSections).mockResolvedValue(page([section]))
    vi.mocked(adminRepository.listLessons).mockResolvedValue(page([lesson]))
    vi.mocked(adminRepository.listExercises).mockResolvedValue(page([exercise]))
    vi.mocked(adminRepository.createSection).mockResolvedValue({
      ...section,
      id: 'section-2',
      title: 'Lektion 2',
      status: 'DRAFT',
    })
    vi.mocked(adminRepository.createLesson).mockResolvedValue(lesson)
    vi.mocked(adminRepository.createExercise).mockResolvedValue(exercise)
    vi.mocked(adminRepository.getMediaCapabilities).mockResolvedValue({
      activeProvider: 'CLOUDINARY',
      supportedMediaTypes: ['PDF'],
    })
    vi.mocked(adminRepository.listMedia).mockResolvedValue(page([pdf]))
    vi.mocked(adminRepository.createUploadIntent).mockResolvedValue({
      assetId: 'upload-1',
      provider: 'CLOUDINARY',
      uploadUrl: 'https://api.cloudinary.com/v1_1/test/raw/upload',
      uploadMethod: 'POST',
      uploadHeaders: {},
      uploadFields: { api_key: 'test-key', signature: 'test-signature' },
      expiresAt: '2026-11-05T01:00:00.000Z',
    })
    vi.mocked(adminRepository.uploadFile).mockImplementation(async (_intent, _file, progress) => {
      progress(100)
    })
    vi.mocked(adminRepository.completeUpload).mockResolvedValue(pdf)
    vi.mocked(adminRepository.linkExerciseAsset).mockResolvedValue({
      id: 'association-1',
      exerciseId: exercise.id,
      assetId: pdf.id,
      assetRole: 'QUESTION_PDF',
      title: pdf.originalName,
      sortOrder: 0,
      media: pdf,
    })
  })

  it('shows all chapters with their course before a course is selected and creates in a dialog', async () => {
    const user = userEvent.setup()
    renderPage(<AdminSectionsPage />, '/admin/sections')

    expect(await screen.findByRole('row', { name: /Lektion 1.*Tiếng Đức A1\.1/ })).toBeVisible()
    await user.click(screen.getByRole('button', { name: 'Tạo chương' }))
    const dialog = await screen.findByRole('dialog', { name: 'Tạo chương mới' })
    expect(dialog).toBeVisible()
    expect(screen.getByRole('combobox', { name: 'Khóa học' })).toHaveValue('Tiếng Đức A1.1')

    await user.type(screen.getByLabelText('Tên chương'), 'Lektion 2')
    await user.click(screen.getByRole('button', { name: 'Tạo chương' }))
    await waitFor(() =>
      expect(adminRepository.createSection).toHaveBeenCalledWith(
        course.id,
        expect.objectContaining({ title: 'Lektion 2' }),
        expect.any(String),
      ),
    )
    expect(await screen.findByText('Đã tạo chương mới.')).toBeVisible()
  })

  it('shows all lessons across chapters and courses without a parent filter', async () => {
    renderPage(<AdminLessonsPage />, '/admin/lessons')

    expect(
      await screen.findByRole('row', {
        name: /Begrüßung und Abschied.*Tiếng Đức A1\.1.*Lektion 1/,
      }),
    ).toBeVisible()
    expect(screen.getByRole('button', { name: 'Tạo bài học' })).toBeVisible()
  })

  it('creates a complete lesson from its own page after choosing a course and dependent chapter', async () => {
    const user = userEvent.setup()
    renderPage(<AdminLessonCreatePage />, '/admin/lessons/new')

    const courseSelect = await screen.findByRole('combobox', { name: 'Khóa học' })
    await user.click(courseSelect)
    await user.click(await screen.findByRole('option', { name: /Tiếng Đức A1\.1/ }))
    const sectionSelect = screen.getByRole('combobox', { name: 'Chương' })
    await user.click(sectionSelect)
    await user.click(await screen.findByRole('option', { name: /Lektion 1/ }))
    await user.type(screen.getByLabelText('Tên bài học'), 'Bài học mới')
    await user.type(screen.getByLabelText('Mô tả nội dung bài học'), 'Mục tiêu bài học')
    await user.click(screen.getByRole('button', { name: 'Tạo bài học' }))

    await waitFor(() =>
      expect(adminRepository.createLesson).toHaveBeenCalledWith(
        section.id,
        expect.objectContaining({
          title: 'Bài học mới',
          description: 'Mục tiêu bài học',
          status: 'DRAFT',
        }),
        expect.any(String),
      ),
    )
    expect(await screen.findByLabelText('Đường dẫn hiện tại')).toHaveTextContent(
      `/admin/courses/${course.id}/sections/${section.id}/lessons/${lesson.id}`,
    )
  })

  it('publishes a PDF exercise created from the lesson detail page', async () => {
    const user = userEvent.setup()
    renderPage(
      <AdminLessonDetailPage courseId={course.id} sectionId={section.id} lessonId={lesson.id} />,
      `/admin/courses/${course.id}/sections/${section.id}/lessons/${lesson.id}`,
    )

    await user.type(await screen.findByLabelText('Tên bài tập'), 'Bài tập mới')
    await user.type(screen.getByLabelText('Hướng dẫn cho học viên'), 'Hoàn thành PDF.')
    await user.click(screen.getByRole('button', { name: 'Tạo bài tập' }))

    await waitFor(() =>
      expect(adminRepository.createExercise).toHaveBeenCalledWith(
        lesson.id,
        expect.objectContaining({
          title: 'Bài tập mới',
          status: 'PUBLISHED',
        }),
        expect.any(String),
      ),
    )
  })

  it('shows all exercises and supports sorting the complete list', async () => {
    const user = userEvent.setup()
    renderPage(<AdminExercisesPage />)

    expect(
      await screen.findByRole('row', { name: /Arbeitsblatt.*Tiếng Đức A1\.1.*Lektion 1/ }),
    ).toBeVisible()
    const statusHeader = screen.getByRole('columnheader', { name: /Trạng thái/ })
    expect(statusHeader).toHaveAttribute('aria-sort', 'none')
    await user.click(screen.getByRole('button', { name: /Trạng thái/ }))
    expect(statusHeader).toHaveAttribute('aria-sort', 'ascending')
  })

  it('uploads and attaches a selected PDF when creating an exercise in the dialog', async () => {
    const user = userEvent.setup()
    renderPage(<AdminExercisesPage />)
    await openExerciseCreateDialog(user)

    await user.type(screen.getByLabelText('Tên bài tập'), 'Arbeitsblatt mới')
    await user.type(screen.getByLabelText('Hướng dẫn cho học viên'), 'Mở PDF và làm bài.')
    const file = new File(['%PDF-1.4'], 'neu.pdf', { type: 'application/pdf' })
    await user.upload(screen.getByLabelText('Tệp PDF (tối đa 40 MB)'), file)
    await user.click(screen.getByRole('button', { name: 'Tạo bài tập' }))

    await waitFor(() =>
      expect(adminRepository.createUploadIntent).toHaveBeenCalledWith(
        {
          originalName: 'neu.pdf',
          mediaType: 'PDF',
          mimeType: 'application/pdf',
          fileSize: file.size,
          visibility: 'ENROLLED',
        },
        expect.any(AbortSignal),
      ),
    )
    expect(adminRepository.completeUpload).toHaveBeenCalledWith('upload-1')
    expect(adminRepository.linkExerciseAsset).toHaveBeenCalledWith('exercise-1', 'upload-1', {
      assetRole: 'QUESTION_PDF',
      title: 'neu.pdf',
      sortOrder: 0,
    })
  })

  it('attaches a PDF already in the library without uploading it again', async () => {
    const user = userEvent.setup()
    renderPage(<AdminExercisesPage />)
    await openExerciseCreateDialog(user)

    await user.type(screen.getByLabelText('Tên bài tập'), 'Arbeitsblatt mới')
    await user.type(screen.getByLabelText('Hướng dẫn cho học viên'), 'Mở PDF và làm bài.')
    await user.click(screen.getByRole('button', { name: 'Chọn PDF có sẵn' }))
    await user.click(await screen.findByRole('button', { name: /arbeitsblatt\.pdf/ }))
    await user.click(screen.getByRole('button', { name: 'Tạo bài tập' }))

    await waitFor(() =>
      expect(adminRepository.linkExerciseAsset).toHaveBeenCalledWith('exercise-1', 'media-1', {
        assetRole: 'QUESTION_PDF',
        title: 'arbeitsblatt.pdf',
        sortOrder: 0,
      }),
    )
    expect(adminRepository.createUploadIntent).not.toHaveBeenCalled()
  })
})
