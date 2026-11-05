import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { adminRepository } from '@/data/api/admin-repository'
import { DialogProvider } from '@/shared/ui/dialogs'
import { NotificationProvider } from '@/shared/ui/notifications'
import { AdminMediaPage } from './media-settings-pages'

vi.mock('@/data/api/admin-repository', () => ({
  adminRepository: {
    getMediaCapabilities: vi.fn(),
    getMediaDetail: vi.fn(),
    listMedia: vi.fn(),
    deleteMedia: vi.fn(),
    createUploadIntent: vi.fn(),
    uploadFile: vi.fn(),
    completeUpload: vi.fn(),
    createMediaPreviewAccess: vi.fn(),
    linkLessonAsset: vi.fn(),
    linkExerciseAsset: vi.fn(),
    unlinkLessonAsset: vi.fn(),
    unlinkExerciseAsset: vi.fn(),
    listLessonAssets: vi.fn(),
    listExerciseAssets: vi.fn(),
  },
}))

const emptyMediaPage = {
  items: [],
  page: 1,
  pageSize: 20,
  total: 0,
  hasMore: false,
}

const uploadedAsset = {
  id: 'media-123',
  originalName: 'upload.pdf',
  mediaType: 'PDF' as const,
  mimeType: 'application/pdf',
  fileSize: 12,
  durationSeconds: null,
  visibility: 'ENROLLED' as const,
  uploadedById: null,
  createdAt: '2026-11-05T00:00:00.000Z',
  provider: 'CLOUDINARY' as const,
  publicId: 'lesson-pdf/media-123',
  resourceType: 'image' as const,
  deliveryType: 'authenticated' as const,
  format: 'pdf',
  uploadStatus: 'READY' as const,
  uploadExpiresAt: null,
  usageCount: 0,
}

function renderMediaPage() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })
  return render(
    <NotificationProvider>
      <DialogProvider>
        <QueryClientProvider client={queryClient}>
          <AdminMediaPage />
        </QueryClientProvider>
      </DialogProvider>
    </NotificationProvider>,
  )
}

describe('admin media library', () => {
  beforeEach(() => {
    vi.mocked(adminRepository.getMediaCapabilities).mockResolvedValue({
      activeProvider: 'CLOUDINARY',
      supportedMediaTypes: ['PDF', 'AUDIO'],
    })
    vi.mocked(adminRepository.getMediaDetail).mockResolvedValue({
      media: uploadedAsset,
      references: [],
    })
    vi.mocked(adminRepository.listMedia).mockResolvedValue(emptyMediaPage)
    vi.mocked(adminRepository.createUploadIntent).mockResolvedValue({
      assetId: 'media-123',
      provider: 'CLOUDINARY',
      uploadUrl: 'https://api.cloudinary.com/v1_1/test/image/upload',
      uploadMethod: 'POST',
      uploadHeaders: {},
      uploadFields: { api_key: 'local-test-key', signature: 'local-test-signature' },
      expiresAt: '2026-11-05T01:00:00.000Z',
    })
    vi.mocked(adminRepository.uploadFile).mockImplementation(async (_intent, _file, progress) => {
      progress(100)
    })
    vi.mocked(adminRepository.completeUpload).mockResolvedValue(uploadedAsset)
  })

  it('applies search, status, and provider filters to the media query', async () => {
    const user = userEvent.setup()
    renderMediaPage()

    await screen.findByText('CLOUDINARY')
    await user.selectOptions(screen.getByLabelText('Provider'), 'CLOUDINARY')
    await user.selectOptions(screen.getByLabelText('Trạng thái'), 'READY')
    await user.type(screen.getByLabelText('Tìm kiếm'), 'lesson')

    await waitFor(() =>
      expect(adminRepository.listMedia).toHaveBeenLastCalledWith(
        expect.objectContaining({
          page: 1,
          pageSize: 20,
          provider: 'CLOUDINARY',
          uploadStatus: 'READY',
          q: 'lesson',
        }),
      ),
    )
  })

  it.each([
    {
      name: 'PDF',
      file: () => new File(['%PDF-1.4 test'], 'lesson.pdf', { type: 'application/pdf' }),
      mediaType: 'PDF',
    },
    {
      name: 'audio',
      file: () => new File(['mock audio'], 'question.mp3', { type: 'audio/mpeg' }),
      mediaType: 'AUDIO',
    },
  ])(
    'uploads a supported $name through the signed provider intent',
    async ({ file, mediaType }) => {
      const user = userEvent.setup()
      renderMediaPage()
      const selectedFile = file()

      await screen.findByText('CLOUDINARY')
      await user.upload(screen.getByLabelText('Tệp'), selectedFile)
      const fileInput = screen.getByLabelText('Tệp') as HTMLInputElement
      expect(fileInput.files?.[0]?.name).toBe(selectedFile.name)
      fireEvent.submit(screen.getByRole('button', { name: 'Tải lên và xác minh' }).closest('form')!)
      await waitFor(() => expect(adminRepository.createUploadIntent).toHaveBeenCalled())

      expect(
        await screen.findByText('Backend đã xác minh tệp và hoàn tất tài sản media.'),
      ).toBeVisible()
      expect(adminRepository.createUploadIntent).toHaveBeenCalledWith(
        expect.objectContaining({
          originalName: selectedFile.name,
          mediaType,
          mimeType: selectedFile.type,
          fileSize: selectedFile.size,
          visibility: 'ENROLLED',
        }),
        expect.any(AbortSignal),
      )
      expect(adminRepository.uploadFile).toHaveBeenCalledWith(
        expect.objectContaining({ provider: 'CLOUDINARY', uploadMethod: 'POST' }),
        selectedFile,
        expect.any(Function),
        expect.any(AbortSignal),
      )
      expect(adminRepository.completeUpload).toHaveBeenCalledWith('media-123')
    },
  )

  it('rejects a file whose MIME type does not match its extension before creating an intent', async () => {
    const user = userEvent.setup()
    renderMediaPage()

    await screen.findByText('CLOUDINARY')
    await user.upload(
      screen.getByLabelText('Tệp'),
      new File(['not a pdf'], 'lesson.pdf', { type: 'text/plain' }),
    )
    fireEvent.submit(screen.getByRole('button', { name: 'Tải lên và xác minh' }).closest('form')!)

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Định dạng hoặc dung lượng không được hỗ trợ',
    )
    expect(adminRepository.createUploadIntent).not.toHaveBeenCalled()
  })
})
