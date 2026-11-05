import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { adminRepository } from '@/data/api/admin-repository'
import type { ApiAdminExercise, ApiAdminMediaAsset } from '@/lib/api/types'
import { DialogProvider } from '@/shared/ui/dialogs'
import { NotificationProvider } from '@/shared/ui/notifications'
import { AdminExercisePdfManager } from './media-exercise-manager'

vi.mock('@/data/api/admin-repository', () => ({
  adminRepository: {
    getMediaCapabilities: vi.fn(),
    listMedia: vi.fn(),
    listExerciseAssets: vi.fn(),
    linkExerciseAsset: vi.fn(),
    unlinkExerciseAsset: vi.fn(),
    createUploadIntent: vi.fn(),
    uploadFile: vi.fn(),
    completeUpload: vi.fn(),
    deleteMedia: vi.fn(),
  },
}))

const exercise: ApiAdminExercise = {
  id: 'exercise-1',
  lessonId: 'lesson-1',
  title: 'Arbeitsblatt',
  description: null,
  instructions: 'Làm bài trong tệp PDF.',
  exerciseType: 'FILE_BASED',
  completionMode: 'MANUAL',
  isRequired: true,
  sortOrder: 1,
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

function renderManager(exercises: readonly ApiAdminExercise[] = [exercise]) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  return render(
    <NotificationProvider>
      <DialogProvider>
        <QueryClientProvider client={queryClient}>
          <AdminExercisePdfManager exercises={exercises} />
        </QueryClientProvider>
      </DialogProvider>
    </NotificationProvider>,
  )
}

describe('AdminExercisePdfManager', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(adminRepository.getMediaCapabilities).mockResolvedValue({
      activeProvider: 'CLOUDINARY',
      supportedMediaTypes: ['PDF'],
    })
    vi.mocked(adminRepository.listMedia).mockResolvedValue({
      items: [pdf],
      page: 1,
      pageSize: 20,
      total: 1,
      hasMore: false,
    })
    vi.mocked(adminRepository.listExerciseAssets).mockResolvedValue({ items: [] })
    vi.mocked(adminRepository.linkExerciseAsset).mockResolvedValue({
      id: 'association-1',
      exerciseId: exercise.id,
      assetId: pdf.id,
      assetRole: 'QUESTION_PDF',
      title: pdf.originalName,
      sortOrder: 0,
      media: pdf,
    })
    vi.mocked(adminRepository.createUploadIntent).mockResolvedValue({
      assetId: 'upload-1',
      provider: 'CLOUDINARY',
      uploadUrl: 'https://api.cloudinary.com/v1_1/test/raw/upload',
      uploadMethod: 'POST',
      uploadHeaders: {},
      uploadFields: { api_key: 'local-test-key', signature: 'local-test-signature' },
      expiresAt: '2026-11-05T01:00:00.000Z',
    })
    vi.mocked(adminRepository.uploadFile).mockImplementation(async (_intent, _file, progress) => {
      progress(100)
    })
    vi.mocked(adminRepository.completeUpload).mockResolvedValue({ ...pdf, id: 'upload-1' })
  })

  it('explains how to create a file exercise before attaching its PDF', async () => {
    renderManager([])

    expect(await screen.findByText('Chưa có bài tập dạng PDF')).toBeVisible()
    expect(screen.getByText(/Tạo bài tập ở biểu mẫu phía trên/)).toBeVisible()
    expect(screen.getByLabelText('Tệp PDF')).toBeVisible()
    expect(screen.getByRole('button', { name: 'Tải PDF lên thư viện media' })).toBeVisible()
    expect(screen.queryByRole('button', { name: 'Tạo bài tập FILE_BASED' })).not.toBeInTheDocument()
  })

  it('stores a PDF in the media library before an exercise exists', async () => {
    const user = userEvent.setup()
    renderManager([])
    const file = new File(['%PDF'], 'neu.pdf', { type: 'application/pdf' })

    await screen.findByText(/Provider: CLOUDINARY/)
    await user.upload(screen.getByLabelText('Tệp PDF'), file)
    await user.click(screen.getByRole('button', { name: 'Tải PDF lên thư viện media' }))

    expect(await screen.findByText('Đã tải PDF lên thư viện media.')).toBeVisible()
    expect(adminRepository.completeUpload).toHaveBeenCalledWith('upload-1')
    expect(adminRepository.linkExerciseAsset).not.toHaveBeenCalled()
  })

  it('attaches an existing Cloudinary PDF to the selected file exercise', async () => {
    const user = userEvent.setup()
    renderManager()

    await user.click(await screen.findByRole('button', { name: /arbeitsblatt\.pdf/i }))
    await user.click(screen.getByRole('button', { name: 'Gắn PDF' }))

    await waitFor(() =>
      expect(adminRepository.linkExerciseAsset).toHaveBeenCalledWith('exercise-1', 'media-1', {
        assetRole: 'QUESTION_PDF',
        title: 'arbeitsblatt.pdf',
        sortOrder: 0,
      }),
    )
  })

  it('uploads a local PDF through the verified media flow and attaches it to the exercise', async () => {
    const user = userEvent.setup()
    renderManager()
    const file = new File(['%PDF'], 'neu.pdf', { type: 'application/pdf' })

    await screen.findByText(/Provider: CLOUDINARY/)
    await user.upload(screen.getByLabelText('Tệp PDF'), file)
    await user.click(screen.getByRole('button', { name: 'Tải lên và gắn PDF' }))

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
    expect(adminRepository.uploadFile).toHaveBeenCalled()
    expect(adminRepository.completeUpload).toHaveBeenCalledWith('upload-1')
    expect(adminRepository.linkExerciseAsset).toHaveBeenCalledWith('exercise-1', 'upload-1', {
      assetRole: 'QUESTION_PDF',
      title: 'neu.pdf',
      sortOrder: 0,
    })
  })
})
