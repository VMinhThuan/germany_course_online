import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
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
      uploadFoldersByMediaType: {
        PDF: ['lesson-pdf', 'lesson-pdf/lektion-1'],
        AUDIO: ['quiz-audio'],
      },
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

    await screen.findByLabelText('Tìm kiếm')
    await user.selectOptions(screen.getByLabelText('Nơi lưu'), 'CLOUDINARY')
    await user.selectOptions(screen.getByLabelText('Tình trạng'), 'READY')
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
      assetFolder: 'lesson-pdf/lektion-1',
    },
    {
      name: 'audio',
      file: () => new File(['mock audio'], 'question.mp3', { type: 'audio/mpeg' }),
      mediaType: 'AUDIO',
      assetFolder: 'quiz-audio',
    },
  ])(
    'uploads a supported $name through the signed provider intent',
    async ({ file, mediaType, assetFolder }) => {
      const user = userEvent.setup()
      renderMediaPage()
      const selectedFile = file()

      await screen.findByLabelText('Tìm kiếm')
      await user.click(screen.getByRole('button', { name: 'Tải tệp lên' }))
      await user.upload(screen.getByLabelText('Tệp'), selectedFile)
      const fileInput = screen.getByLabelText('Tệp') as HTMLInputElement
      expect(fileInput.files?.[0]?.name).toBe(selectedFile.name)
      await user.selectOptions(screen.getByLabelText('Thư mục lưu'), assetFolder)
      fireEvent.submit(document.getElementById('admin-media-upload')!)
      await waitFor(() => expect(adminRepository.createUploadIntent).toHaveBeenCalled())

      expect(await screen.findByText('Tệp đã được thêm vào thư viện.')).toBeVisible()
      await user.click(screen.getByRole('button', { name: 'Tải tệp lên' }))
      expect((screen.getByLabelText('Tệp') as HTMLInputElement).files).toHaveLength(0)
      expect(adminRepository.createUploadIntent).toHaveBeenCalledWith(
        expect.objectContaining({
          originalName: selectedFile.name,
          mediaType,
          mimeType: selectedFile.type,
          fileSize: selectedFile.size,
          visibility: 'ENROLLED',
          assetFolder,
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

  it('shows delete progress only on the row being removed', async () => {
    const user = userEvent.setup()
    const secondAsset = {
      ...uploadedAsset,
      id: 'media-456',
      originalName: 'second.pdf',
      publicId: 'lesson-pdf/media-456',
    }
    vi.mocked(adminRepository.listMedia).mockResolvedValue({
      ...emptyMediaPage,
      items: [uploadedAsset, secondAsset],
      total: 2,
    })
    let finishDelete: (() => void) | undefined
    vi.mocked(adminRepository.deleteMedia).mockImplementation(
      () => new Promise<void>((resolve) => (finishDelete = resolve)),
    )
    renderMediaPage()

    const firstRow = await screen.findByRole('row', { name: /upload\.pdf/ })
    const secondRow = screen.getByRole('row', { name: /second\.pdf/ })
    await user.click(within(firstRow).getByRole('button', { name: 'Xóa' }))
    await user.click(await screen.findByRole('button', { name: 'Xóa tệp' }))

    await waitFor(() => expect(adminRepository.deleteMedia).toHaveBeenCalledWith('media-123'))
    const firstDeleteButton = within(firstRow).getByRole('button', {
      name: 'Xóa',
      hidden: true,
    })
    const secondDeleteButton = within(secondRow).getByRole('button', {
      name: 'Xóa',
      hidden: true,
    })
    expect(firstDeleteButton).toHaveAttribute('aria-busy', 'true')
    expect(secondDeleteButton).not.toHaveAttribute('aria-busy')
    expect(secondDeleteButton).toBeEnabled()

    finishDelete?.()
    await waitFor(() =>
      expect(firstDeleteButton).not.toHaveAttribute('aria-busy'),
    )
  })

  it('rejects a file whose MIME type does not match its extension before creating an intent', async () => {
    const user = userEvent.setup()
    renderMediaPage()

    await screen.findByLabelText('Tìm kiếm')
    await user.click(screen.getByRole('button', { name: 'Tải tệp lên' }))
    await user.upload(
      screen.getByLabelText('Tệp'),
      new File(['not a pdf'], 'lesson.pdf', { type: 'text/plain' }),
    )
    fireEvent.submit(document.getElementById('admin-media-upload')!)

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Tệp không đúng định dạng hoặc vượt quá dung lượng cho phép',
    )
    expect(adminRepository.createUploadIntent).not.toHaveBeenCalled()
  })
})
