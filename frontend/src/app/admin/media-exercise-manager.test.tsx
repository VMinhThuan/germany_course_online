import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { adminRepository } from '@/data/api/admin-repository'
import type { ApiAdminExercise, ApiAdminMediaAsset, ApiAssetAssociation } from '@/lib/api/types'
import { DialogProvider } from '@/shared/ui/dialogs'
import { NotificationProvider } from '@/shared/ui/notifications'
import { AdminExerciseMediaManager } from './exercise-media-manager'

vi.mock('@/data/api/admin-repository', () => ({
  adminRepository: {
    getMediaCapabilities: vi.fn(),
    listMedia: vi.fn(),
    listExerciseAssets: vi.fn(),
    linkExerciseAsset: vi.fn(),
    unlinkExerciseAsset: vi.fn(),
    createMediaPreviewAccess: vi.fn(),
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

const attachedPdf: ApiAssetAssociation = {
  id: 'association-1',
  exerciseId: exercise.id,
  assetId: pdf.id,
  assetRole: 'QUESTION_PDF',
  title: pdf.originalName,
  sortOrder: 0,
  media: pdf,
}

function renderManager(exercises: readonly ApiAdminExercise[] = [exercise]) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  return render(
    <NotificationProvider>
      <DialogProvider>
        <QueryClientProvider client={queryClient}>
          <AdminExerciseMediaManager exercises={exercises} />
        </QueryClientProvider>
      </DialogProvider>
    </NotificationProvider>,
  )
}

describe('AdminExerciseMediaManager', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(adminRepository.getMediaCapabilities).mockResolvedValue({
      activeProvider: 'CLOUDINARY',
      supportedMediaTypes: ['IMAGE', 'PDF', 'AUDIO'],
      uploadFoldersByMediaType: {
        IMAGE: ['course-banner'],
        PDF: ['lesson-pdf'],
        AUDIO: ['quiz-audio', 'lesson-audio'],
      },
    })
    vi.mocked(adminRepository.listMedia).mockResolvedValue({
      items: [pdf],
      page: 1,
      pageSize: 20,
      total: 1,
      hasMore: false,
    })
    vi.mocked(adminRepository.listExerciseAssets).mockResolvedValue({ items: [] })
    vi.mocked(adminRepository.unlinkExerciseAsset).mockResolvedValue(undefined)
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
    vi.mocked(adminRepository.createMediaPreviewAccess).mockResolvedValue({
      assetId: pdf.id,
      url: 'https://media.example.test/preview.pdf',
      expiresAt: '2026-11-05T01:00:00.000Z',
      mediaType: 'PDF',
      mimeType: 'application/pdf',
    })
  })

  it('asks the admin to create an exercise before attaching files', async () => {
    renderManager([])

    expect(await screen.findByText('Chưa có bài tập')).toBeVisible()
    expect(screen.getByText('Tạo bài tập trước để thêm tệp đính kèm.')).toBeVisible()
    expect(screen.queryByRole('button', { name: 'Thêm tệp' })).not.toBeInTheDocument()
  })

  it('attaches an existing Cloudinary PDF to the selected file exercise', async () => {
    const user = userEvent.setup()
    renderManager()

    await user.click(await screen.findByRole('button', { name: 'Thêm tệp' }))
    await user.click(screen.getByRole('button', { name: 'Chọn tệp có sẵn' }))
    await user.click(await screen.findByRole('button', { name: 'Gắn' }))

    await waitFor(() =>
      expect(adminRepository.linkExerciseAsset).toHaveBeenCalledWith('exercise-1', 'media-1', {
        assetRole: 'QUESTION_PDF',
        title: 'arbeitsblatt.pdf',
        sortOrder: 0,
      }),
    )
  })

  it('uploads and attaches multiple PDFs without replacing existing exercise media', async () => {
    const user = userEvent.setup()
    renderManager()
    const firstFile = new File(['%PDF first'], 'neu.pdf', { type: 'application/pdf' })
    const secondFile = new File(['%PDF second'], 'noch-eins.pdf', { type: 'application/pdf' })
    vi.mocked(adminRepository.createUploadIntent)
      .mockResolvedValueOnce({
        assetId: 'upload-1',
        provider: 'CLOUDINARY',
        uploadUrl: 'https://api.cloudinary.com/v1_1/test/image/upload',
        uploadMethod: 'POST',
        uploadHeaders: {},
        uploadFields: { api_key: 'local-test-key', signature: 'local-test-signature' },
        expiresAt: '2026-11-05T01:00:00.000Z',
      })
      .mockResolvedValueOnce({
        assetId: 'upload-2',
        provider: 'CLOUDINARY',
        uploadUrl: 'https://api.cloudinary.com/v1_1/test/image/upload',
        uploadMethod: 'POST',
        uploadHeaders: {},
        uploadFields: { api_key: 'local-test-key', signature: 'local-test-signature' },
        expiresAt: '2026-11-05T01:00:00.000Z',
      })

    await user.click(await screen.findByRole('button', { name: 'Thêm tệp' }))
    await user.upload(screen.getByLabelText('Tệp tải lên'), [firstFile, secondFile])
    await user.click(screen.getByRole('button', { name: 'Tải lên và gắn 2 tệp' }))

    await waitFor(() => expect(adminRepository.linkExerciseAsset).toHaveBeenCalledTimes(2))
    expect(adminRepository.createUploadIntent).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        originalName: 'neu.pdf',
        mediaType: 'PDF',
        mimeType: 'application/pdf',
        fileSize: firstFile.size,
        visibility: 'ENROLLED',
        assetFolder: 'lesson-pdf',
      }),
      expect.any(AbortSignal),
    )
    expect(adminRepository.createUploadIntent).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        originalName: 'noch-eins.pdf',
        mediaType: 'PDF',
        assetFolder: 'lesson-pdf',
      }),
      expect.any(AbortSignal),
    )
    expect(adminRepository.completeUpload).toHaveBeenNthCalledWith(1, 'upload-1')
    expect(adminRepository.completeUpload).toHaveBeenNthCalledWith(2, 'upload-2')
    expect(adminRepository.linkExerciseAsset).toHaveBeenNthCalledWith(1, 'exercise-1', 'upload-1', {
      assetRole: 'QUESTION_PDF',
      title: 'neu.pdf',
      sortOrder: 0,
    })
    expect(adminRepository.linkExerciseAsset).toHaveBeenNthCalledWith(2, 'exercise-1', 'upload-2', {
      assetRole: 'QUESTION_PDF',
      title: 'noch-eins.pdf',
      sortOrder: 1,
    })
  })

  it('stores exercise audio in the lesson-audio folder', async () => {
    const user = userEvent.setup()
    renderManager()
    const file = new File(['mock audio'], 'dialog.mp3', { type: 'audio/mpeg' })

    await user.click(await screen.findByRole('button', { name: 'Thêm tệp' }))
    await user.selectOptions(screen.getByLabelText('Loại tệp'), 'QUESTION_AUDIO')
    await user.upload(screen.getByLabelText('Tệp tải lên'), file)
    await user.click(screen.getByRole('button', { name: 'Tải lên và gắn 1 tệp' }))

    await waitFor(() =>
      expect(adminRepository.createUploadIntent).toHaveBeenCalledWith(
        expect.objectContaining({
          originalName: 'dialog.mp3',
          mediaType: 'AUDIO',
          mimeType: 'audio/mpeg',
          assetFolder: 'lesson-audio',
        }),
        expect.any(AbortSignal),
      ),
    )
    expect(adminRepository.linkExerciseAsset).toHaveBeenCalledWith('exercise-1', 'upload-1', {
      assetRole: 'QUESTION_AUDIO',
      title: 'dialog.mp3',
      sortOrder: 0,
    })
  })

  it('shows the attached file, previews it, and marks it in the available file list', async () => {
    const user = userEvent.setup()
    const secondPdf = { ...pdf, id: 'media-2', originalName: 'anderes.pdf' }
    vi.mocked(adminRepository.listExerciseAssets).mockResolvedValue({ items: [attachedPdf] })
    vi.mocked(adminRepository.listMedia).mockResolvedValue({
      items: [pdf, secondPdf],
      page: 1,
      pageSize: 20,
      total: 2,
      hasMore: false,
    })
    renderManager()

    expect(await screen.findByText('arbeitsblatt.pdf')).toBeVisible()
    await user.click(screen.getByRole('button', { name: 'Xem trước' }))
    expect(adminRepository.createMediaPreviewAccess).toHaveBeenCalledWith(pdf.id)
    expect(await screen.findByRole('dialog', { name: 'Xem trước tệp' })).toBeVisible()

    await user.click(screen.getByRole('button', { name: 'Đóng hộp thoại' }))
    await user.click(screen.getByRole('button', { name: 'Thêm tệp' }))
    await user.click(screen.getByRole('button', { name: 'Chọn tệp có sẵn' }))
    expect(await screen.findByText('Đang gắn')).toBeVisible()
    expect(screen.getByRole('button', { name: 'Gắn' })).toBeVisible()
  })

  it('keeps the current attachment when another library file is added', async () => {
    const user = userEvent.setup()
    const secondPdf = { ...pdf, id: 'media-2', originalName: 'anderes.pdf' }
    vi.mocked(adminRepository.listExerciseAssets).mockResolvedValue({ items: [attachedPdf] })
    vi.mocked(adminRepository.listMedia).mockResolvedValue({
      items: [pdf, secondPdf],
      page: 1,
      pageSize: 20,
      total: 2,
      hasMore: false,
    })
    renderManager()

    await user.click(await screen.findByRole('button', { name: 'Thêm tệp' }))
    await user.click(screen.getByRole('button', { name: 'Chọn tệp có sẵn' }))
    await screen.findByText('anderes.pdf')
    await user.click(screen.getByRole('button', { name: 'Gắn' }))

    await waitFor(() =>
      expect(adminRepository.linkExerciseAsset).toHaveBeenCalledWith('exercise-1', 'media-2', {
        assetRole: 'QUESTION_PDF',
        title: 'anderes.pdf',
        sortOrder: 1,
      }),
    )
    expect(adminRepository.unlinkExerciseAsset).not.toHaveBeenCalled()
  })
})
