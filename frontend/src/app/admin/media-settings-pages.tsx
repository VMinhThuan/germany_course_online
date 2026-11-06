import { useEffect, useRef, useState, type FormEvent } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Eye, FileUp, FolderOpen, Unlink, X } from 'lucide-react'
import { ApiError } from '@/lib/api/client'
import { adminRepository } from '@/data/api/admin-repository'
import type {
  ApiAdminMediaAsset,
  ApiAdminSiteSettings,
  ApiAssetAssociation,
  ApiMediaPreviewAccess,
} from '@/lib/api/types'
import { formatDateTimeInTimezone } from '@/shared/lib/format'
import { BaseDialog, useDialogs } from '@/shared/ui/dialogs'
import { Button, EmptyState, Pagination } from '@/shared/ui'
import { AudioPlayer, PDFViewer, VideoPlayer } from '@/domains/media/components'
import type { MediaViewModel } from '@/domains/media'
import {
  folderRoots,
  mediaAccept as mediaAcceptForType,
  mediaAcceptForTypes,
  mediaTypeForFile,
  uploadFolders,
  validateAdminMediaFile,
  type AdminMediaType,
} from './media-upload'
import {
  AdminCard,
  AdminField,
  AdminFeedback,
  AdminLoadError,
  AdminLoading,
  AdminSortableTable,
  AdminSelect,
  AdminTextArea,
  type AdminTableColumn,
  useAdminMutation,
} from './shared'

function mediaTypeLabel(mediaType: ApiAdminMediaAsset['mediaType']) {
  return { IMAGE: 'Hình ảnh', VIDEO: 'Video', AUDIO: 'Âm thanh', PDF: 'PDF' }[mediaType]
}

function uploadStatusLabel(status?: ApiAdminMediaAsset['uploadStatus']) {
  if (status === 'READY') return 'Đã sẵn sàng'
  if (status === 'PENDING') return 'Đang chờ tải lên'
  if (status === 'DELETING') return 'Đang xóa'
  if (status === 'DELETED') return 'Đã xóa'
  return 'Đã sẵn sàng'
}

function folderLabel(folder: string, folders: readonly string[], mediaType: AdminMediaType) {
  const root = folderRoots(folders).find(
    (candidate) => folder === candidate || folder.startsWith(`${candidate}/`),
  )
  const ending = root?.split('/').at(-1)?.toLowerCase()
  const rootLabel =
    mediaType === 'IMAGE'
      ? 'Ảnh khóa học'
      : mediaType === 'PDF'
        ? 'Tài liệu PDF'
        : ending === 'lesson-audio'
          ? 'Âm thanh bài tập'
          : 'Âm thanh trắc nghiệm'
  const subfolder =
    root && folder !== root ? folder.slice(root.length + 1).replaceAll('/', ' / ') : ''
  return subfolder ? `${rootLabel} · ${subfolder}` : rootLabel
}

function mediaRoleLabel(role: string) {
  const labels: Record<string, string> = {
    LECTURE_VIDEO: 'Video bài giảng',
    LECTURE_PDF: 'Tài liệu bài học',
    ATTACHMENT: 'Tệp đính kèm',
    QUESTION_PDF: 'PDF bài tập',
    QUESTION_AUDIO: 'Âm thanh bài tập',
    ANSWER_PDF: 'PDF đáp án',
    SOLUTION_VIDEO: 'Video chữa bài',
  }
  return labels[role] ?? role
}

function friendlyUploadError(error: unknown) {
  if (error instanceof ApiError) {
    if (error.code === 'MEDIA_FOLDER_UNAVAILABLE')
      return 'Thư mục này không còn khả dụng. Hãy chọn một thư mục khác.'
    if (error.code === 'MEDIA_FOLDER_UNSUPPORTED')
      return 'Chưa thể chọn thư mục lưu cho loại tệp này.'
    if (error.code === 'MEDIA_STORAGE_UNAVAILABLE')
      return 'Chưa thể tải tệp lên lúc này. Vui lòng thử lại sau.'
  }
  return 'Không thể tải tệp lên. Hãy kiểm tra tệp rồi thử lại.'
}

export function AdminMediaPage() {
  const dialogs = useDialogs()
  const [search, setSearch] = useState('')
  const [mediaType, setMediaType] = useState('')
  const [uploadStatus, setUploadStatus] = useState('')
  const [provider, setProvider] = useState('')
  const [page, setPage] = useState(1)
  const [selectedAssetId, setSelectedAssetId] = useState('')
  const [preview, setPreview] = useState<ApiMediaPreviewAccess | null>(null)
  const [previewError, setPreviewError] = useState('')
  const [uploadOpen, setUploadOpen] = useState(false)
  const capabilities = useQuery({
    queryKey: ['admin', 'media-capabilities'],
    queryFn: () => adminRepository.getMediaCapabilities(),
    retry: false,
  })
  const detail = useQuery({
    queryKey: ['admin', 'media-detail', selectedAssetId],
    queryFn: () => adminRepository.getMediaDetail(selectedAssetId),
    enabled: Boolean(selectedAssetId),
    retry: false,
  })
  const assets = useQuery({
    queryKey: ['admin', 'media', search, mediaType, uploadStatus, provider, page],
    queryFn: () =>
      adminRepository.listMedia({
        page,
        pageSize: 20,
        ...(search ? { q: search } : {}),
        ...(mediaType ? { mediaType } : {}),
        ...(uploadStatus ? { uploadStatus } : {}),
        ...(provider ? { provider } : {}),
      }),
    retry: false,
  })
  const deleteAsset = useAdminMutation((assetId: string) => adminRepository.deleteMedia(assetId))
  const linkLesson = useAdminMutation(
    ({
      lessonId,
      assetId,
      input,
    }: {
      lessonId: string
      assetId: string
      input: { assetRole: string; title: string | null; sortOrder: number }
    }) => adminRepository.linkLessonAsset(lessonId, assetId, input),
  )
  const linkExercise = useAdminMutation(
    ({
      exerciseId,
      assetId,
      input,
    }: {
      exerciseId: string
      assetId: string
      input: { assetRole: string; title: string | null; sortOrder: number }
    }) => adminRepository.linkExerciseAsset(exerciseId, assetId, input),
  )
  const unlinkLesson = useAdminMutation(
    ({ lessonId, assetId, role }: { lessonId: string; assetId: string; role: string }) =>
      adminRepository.unlinkLessonAsset(lessonId, assetId, role),
  )
  const unlinkExercise = useAdminMutation(
    ({ exerciseId, assetId, role }: { exerciseId: string; assetId: string; role: string }) =>
      adminRepository.unlinkExerciseAsset(exerciseId, assetId, role),
  )
  const [file, setFile] = useState<File | null>(null)
  const [fileInputKey, setFileInputKey] = useState(0)
  const [assetFolder, setAssetFolder] = useState('')
  const [visibility, setVisibility] = useState<'PUBLIC' | 'ENROLLED'>('ENROLLED')
  const [progress, setProgress] = useState<number | null>(null)
  const [uploadStage, setUploadStage] = useState<'preparing' | 'transferring' | null>(null)
  const [uploadError, setUploadError] = useState<unknown>()
  const [uploadSuccess, setUploadSuccess] = useState('')
  const uploadController = useRef<AbortController | null>(null)
  const [ownerType, setOwnerType] = useState<'lesson' | 'exercise'>('lesson')
  const [ownerId, setOwnerId] = useState('')
  const [assetId, setAssetId] = useState('')
  const [assetRole, setAssetRole] = useState('LECTURE_VIDEO')
  const [title, setTitle] = useState('')
  const [sortOrder, setSortOrder] = useState('0')
  const [associationNotice, setAssociationNotice] = useState('')
  const folderOptions = (['IMAGE', 'PDF', 'AUDIO'] as const).flatMap((type) =>
    uploadFolders(capabilities.data, type).map((folder) => ({ folder, mediaType: type })),
  )
  const folderSelectionRequired = capabilities.data?.activeProvider === 'CLOUDINARY'
  const selectedFolderOption = folderOptions.find((option) => option.folder === assetFolder)
  const folderMediaType = selectedFolderOption?.mediaType ?? null
  const selectedMediaType = folderSelectionRequired ? folderMediaType : mediaTypeForFile(file)
  const canSelectFolder = folderSelectionRequired && folderOptions.length > 0
  const selectedFolder = selectedFolderOption?.folder ?? ''
  const associations = useQuery({
    queryKey: ['admin', 'asset-associations', ownerType, ownerId],
    queryFn: () =>
      ownerType === 'lesson'
        ? adminRepository.listLessonAssets(ownerId)
        : adminRepository.listExerciseAssets(ownerId),
    enabled: Boolean(ownerId),
    retry: false,
  })

  async function upload(event: FormEvent) {
    event.preventDefault()
    setUploadError(undefined)
    setUploadSuccess('')
    if (!file) {
      setUploadError(new Error('Vui lòng chọn một tệp trước khi tải lên.'))
      return
    }
    if (file.size <= 0) {
      setUploadError(new Error('Tệp này chưa có nội dung. Hãy chọn một tệp khác.'))
      return
    }
    const type = selectedMediaType
    const fileError = type
      ? validateAdminMediaFile(file, type)
      : 'Chọn thư mục lưu trước khi chọn tệp.'
    if (
      !type ||
      fileError ||
      !capabilities.data?.supportedMediaTypes.includes(type) ||
      (folderSelectionRequired && !selectedFolder)
    ) {
      setUploadError(
        new Error(
          fileError ??
            'Tệp không đúng định dạng hoặc vượt quá dung lượng cho phép. Hãy chọn tệp khác.',
        ),
      )
      return
    }
    const controller = new AbortController()
    uploadController.current = controller
    setProgress(0)
    setUploadStage('preparing')
    let createdAssetId = ''
    try {
      const intent = await adminRepository.createUploadIntent(
        {
          originalName: file.name,
          mediaType: type,
          mimeType: file.type,
          fileSize: file.size,
          visibility,
          ...(canSelectFolder && selectedFolder ? { assetFolder: selectedFolder } : {}),
        },
        controller.signal,
      )
      createdAssetId = intent.assetId
      setUploadStage('transferring')
      await adminRepository.uploadFile(intent, file, setProgress, controller.signal)
      await adminRepository.completeUpload(intent.assetId)
      setUploadSuccess('Tệp đã được thêm vào thư viện.')
      setFile(null)
      setFileInputKey((key) => key + 1)
      setUploadOpen(false)
      await assets.refetch()
      setSelectedAssetId(intent.assetId)
    } catch (error) {
      if (controller.signal.aborted && createdAssetId)
        await adminRepository.deleteMedia(createdAssetId).catch(() => undefined)
      setUploadError(controller.signal.aborted ? undefined : new Error(friendlyUploadError(error)))
      setUploadSuccess('')
    } finally {
      uploadController.current = null
      setProgress(null)
      setUploadStage(null)
    }
  }
  async function previewAsset(id: string) {
    setPreview(null)
    setPreviewError('')
    try {
      setPreview(await adminRepository.createMediaPreviewAccess(id))
    } catch (error) {
      setPreviewError(error instanceof Error ? error.message : 'Không thể tạo bản xem trước.')
    }
  }
  function removeAsset(id: string) {
    dialogs.confirm({
      title: 'Xóa tệp này?',
      description: 'Chỉ có thể xóa tệp chưa được dùng trong bài học hoặc bài tập.',
      confirmLabel: 'Xóa tệp',
      destructive: true,
      onConfirm: async () => {
        try {
          await deleteAsset.mutateAsync(id)
        } catch {
          /* API error below */
        }
      },
    })
  }
  async function attach(event: FormEvent) {
    event.preventDefault()
    setAssociationNotice('')
    const input = { assetRole, title: title.trim() || null, sortOrder: Number(sortOrder) }
    try {
      if (ownerType === 'lesson')
        await linkLesson.mutateAsync({ lessonId: ownerId.trim(), assetId: assetId.trim(), input })
      else
        await linkExercise.mutateAsync({
          exerciseId: ownerId.trim(),
          assetId: assetId.trim(),
          input,
        })
      setAssociationNotice('Đã gắn tệp vào nội dung.')
      await associations.refetch()
    } catch {
      /* API errors shown */
    }
  }
  function detach(item: ApiAssetAssociation) {
    dialogs.confirm({
      title: 'Gỡ liên kết media?',
      description: `Gỡ liên kết ${item.assetRole} khỏi nội dung này? Tệp vẫn còn trong thư viện.`,
      confirmLabel: 'Gỡ liên kết',
      destructive: true,
      onConfirm: async () => {
        try {
          if (ownerType === 'lesson')
            await unlinkLesson.mutateAsync({
              lessonId: ownerId,
              assetId: item.assetId,
              role: item.assetRole,
            })
          else
            await unlinkExercise.mutateAsync({
              exerciseId: ownerId,
              assetId: item.assetId,
              role: item.assetRole,
            })
          await associations.refetch()
        } catch {
          /* API error below */
        }
      },
    })
  }
  const mutationError =
    linkLesson.error ?? linkExercise.error ?? unlinkLesson.error ?? unlinkExercise.error
  const roles =
    ownerType === 'lesson'
      ? ['LECTURE_VIDEO', 'LECTURE_PDF', 'ATTACHMENT']
      : ['QUESTION_PDF', 'QUESTION_AUDIO', 'ANSWER_PDF', 'SOLUTION_VIDEO']
  const mediaColumns: AdminTableColumn<ApiAdminMediaAsset>[] = [
    {
      key: 'name',
      label: 'Tên tệp',
      sortValue: (asset) => asset.originalName,
      render: (asset) => <span className="font-semibold">{asset.originalName}</span>,
    },
    {
      key: 'type',
      label: 'Loại tệp',
      sortValue: (asset) => mediaTypeLabel(asset.mediaType),
      render: (asset) => mediaTypeLabel(asset.mediaType),
    },
    {
      key: 'size',
      label: 'Dung lượng',
      sortValue: (asset) => asset.fileSize,
      render: (asset) => `${(asset.fileSize / 1024 / 1024).toFixed(2)} MB`,
    },
    {
      key: 'visibility',
      label: 'Phạm vi',
      sortValue: (asset) => asset.visibility,
      render: (asset) => (asset.visibility === 'PUBLIC' ? 'Công khai' : 'Học viên có quyền'),
    },
    {
      key: 'status',
      label: 'Tình trạng',
      sortValue: (asset) => uploadStatusLabel(asset.uploadStatus),
      render: (asset) => (
        <span className="font-medium text-ink-secondary">
          {uploadStatusLabel(asset.uploadStatus)}
        </span>
      ),
    },
    {
      key: 'createdAt',
      label: 'Ngày thêm',
      sortValue: (asset) => Date.parse(asset.createdAt),
      render: (asset) => formatDateTimeInTimezone(asset.createdAt),
    },
    {
      key: 'usage',
      label: 'Đang dùng',
      sortValue: (asset) => asset.usageCount ?? 0,
      render: (asset) => `${asset.usageCount ?? 0} vị trí`,
    },
    {
      key: 'actions',
      label: 'Thao tác',
      className: 'text-right',
      render: (asset) => (
        <div className="flex justify-end gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setSelectedAssetId(asset.id)
              setPreview(null)
              setPreviewError('')
            }}
            startIcon={<Eye aria-hidden="true" className="size-4" />}
          >
            Chi tiết
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={(asset.usageCount ?? 0) > 0 || asset.uploadStatus !== 'READY'}
            loading={deleteAsset.isPending && deleteAsset.variables === asset.id}
            onClick={() => void removeAsset(asset.id)}
          >
            Xóa
          </Button>
        </div>
      ),
    },
  ]

  return (
    <div className="grid gap-5">
      <AdminCard
        title="Thư viện tệp"
        description="Tìm, sắp xếp và xem các tệp đã tải lên. Hãy kiểm tra nơi đang dùng trước khi xóa."
      >
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="grid min-w-0 flex-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <AdminField
              label="Tìm kiếm"
              value={search}
              onChange={(value) => {
                setSearch(value)
                setPage(1)
              }}
              placeholder="Tên tệp"
            />
            <AdminSelect
              label="Loại tệp"
              value={mediaType}
              onChange={(value) => {
                setMediaType(value)
                setPage(1)
              }}
              options={[
                { value: '', label: 'Tất cả' },
                ...['IMAGE', 'VIDEO', 'AUDIO', 'PDF'].map((value) => ({
                  value,
                  label: mediaTypeLabel(value as ApiAdminMediaAsset['mediaType']),
                })),
              ]}
            />
            <AdminSelect
              label="Tình trạng"
              value={uploadStatus}
              onChange={(value) => {
                setUploadStatus(value)
                setPage(1)
              }}
              options={[
                { value: '', label: 'Mọi tình trạng' },
                ...['PENDING', 'READY', 'DELETING', 'DELETED'].map((value) => ({
                  value,
                  label: uploadStatusLabel(value as ApiAdminMediaAsset['uploadStatus']),
                })),
              ]}
            />
            <AdminSelect
              label="Dịch vụ lưu trữ"
              value={provider}
              onChange={(value) => {
                setProvider(value)
                setPage(1)
              }}
              options={[
                { value: '', label: 'Mọi nơi lưu' },
                { value: 'S3_COMPATIBLE', label: 'S3 Compatible' },
                { value: 'CLOUDINARY', label: 'Cloudinary' },
              ]}
            />
          </div>
          <Button
            type="button"
            onClick={() => {
              setUploadError(undefined)
              setUploadSuccess('')
              setUploadOpen(true)
            }}
            startIcon={<FileUp aria-hidden="true" className="size-4" />}
          >
            Tải tệp lên
          </Button>
        </div>
        {assets.isPending ? (
          <AdminLoading />
        ) : assets.isError ? (
          <AdminLoadError error={assets.error} retry={() => void assets.refetch()} />
        ) : (
          <AdminSortableTable
            rows={assets.data?.items ?? []}
            columns={mediaColumns}
            rowKey={(asset) => asset.id}
            emptyContent={
              <EmptyState
                title={
                  search || mediaType || uploadStatus || provider
                    ? 'Không tìm thấy tệp'
                    : 'Chưa có tệp'
                }
                description={
                  search || mediaType || uploadStatus || provider
                    ? 'Thử thay đổi bộ lọc hoặc từ khóa tìm kiếm.'
                    : 'Tải tệp đầu tiên lên để thêm vào thư viện.'
                }
              />
            }
          />
        )}
        {assets.data && <p className="text-xs text-ink-muted">Tổng số: {assets.data.total}</p>}
        {assets.data && assets.data.total > assets.data.pageSize && (
          <Pagination
            page={assets.data.page}
            pages={Math.ceil(assets.data.total / assets.data.pageSize)}
            onPageChange={setPage}
          />
        )}
        <AdminFeedback error={deleteAsset.error} />

        {selectedAssetId && (
          <section className="grid gap-3 rounded-xl border border-border-subtle bg-surface-muted p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <h3 className="font-semibold">
                  {detail.data?.media.originalName ?? 'Chi tiết tệp'}
                </h3>
                <p className="mt-1 text-sm text-ink-secondary">
                  Thông tin tệp và nơi đang được sử dụng.
                </p>
              </div>
              <Button
                size="sm"
                variant="outline"
                aria-label="Đóng chi tiết media"
                onClick={() => {
                  setSelectedAssetId('')
                  setPreview(null)
                }}
              >
                <X aria-hidden="true" className="size-4" />
              </Button>
            </div>
            {detail.isPending ? (
              <AdminLoading />
            ) : detail.isError ? (
              <AdminLoadError error={detail.error} retry={() => void detail.refetch()} />
            ) : detail.data ? (
              <>
                <dl className="grid gap-3 text-sm sm:grid-cols-2">
                  <div>
                    <dt className="text-ink-muted">Thư mục</dt>
                    <dd className="break-all">
                      {detail.data.media.publicId?.split('/').slice(0, -1).join('/') || '—'}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-ink-muted">Nơi lưu</dt>
                    <dd>{detail.data.media.provider ?? '—'}</dd>
                  </div>
                  <div>
                    <dt className="text-ink-muted">Định dạng</dt>
                    <dd>{detail.data.media.format ?? detail.data.media.mimeType}</dd>
                  </div>
                  <div>
                    <dt className="text-ink-muted">Đang dùng tại</dt>
                    <dd>{detail.data.references.length} nội dung</dd>
                  </div>
                </dl>
                <div className="grid gap-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h4 className="font-semibold">Nội dung đang dùng tệp này</h4>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={detail.data.media.uploadStatus !== 'READY'}
                      onClick={() => void previewAsset(selectedAssetId)}
                    >
                      Xem tệp
                    </Button>
                  </div>
                  {detail.data.references.length ? (
                    <ul className="grid gap-1 text-sm">
                      {detail.data.references.map((reference, index) => (
                        <li
                          key={
                            reference.kind +
                            '-' +
                            reference.parentId +
                            '-' +
                            reference.role +
                            '-' +
                            index
                          }
                        >
                          {reference.kind === 'LESSON'
                            ? 'Bài học'
                            : reference.kind === 'EXERCISE'
                              ? 'Bài tập'
                              : reference.kind === 'COURSE'
                                ? 'Khóa học'
                                : reference.kind === 'USER_PROFILE'
                                  ? 'Tài khoản'
                                  : 'Cài đặt website'}
                          {reference.title && ' · ' + reference.title}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-ink-secondary">Tệp này chưa được sử dụng.</p>
                  )}
                </div>
                {previewError && (
                  <p role="alert" className="text-sm text-danger-foreground">
                    {previewError}
                  </p>
                )}
                {preview?.assetId === selectedAssetId && (
                  <MediaAssetPreview access={preview} title={detail.data.media.originalName} />
                )}
              </>
            ) : null}
          </section>
        )}
      </AdminCard>

      <BaseDialog
        open={uploadOpen}
        onOpenChange={(open) => {
          if (progress !== null) return
          setUploadOpen(open)
        }}
        title="Tải tệp lên thư viện"
        description="Chọn nơi lưu và tệp muốn thêm. Mỗi nơi nhận một loại tệp riêng."
        footer={
          <>
            <Button
              type="button"
              variant="outline"
              disabled={progress !== null}
              onClick={() => setUploadOpen(false)}
            >
              Đóng
            </Button>
            <Button
              type="submit"
              form="admin-media-upload"
              loading={progress !== null}
              disabled={
                !file ||
                capabilities.isPending ||
                !capabilities.data?.activeProvider ||
                (folderSelectionRequired && !selectedFolder) ||
                !selectedMediaType ||
                progress !== null
              }
              startIcon={<FileUp aria-hidden="true" className="size-4" />}
            >
              Tải tệp lên
            </Button>
          </>
        }
      >
        <div className="grid gap-4">
          <p className="rounded-xl bg-surface-muted p-3 text-sm leading-6 text-ink-secondary">
            {capabilities.isPending
              ? 'Đang kiểm tra loại tệp có thể tải lên…'
              : capabilities.data?.supportedMediaTypes.length
                ? 'Có thể tải lên: ' +
                  capabilities.data.supportedMediaTypes
                    .map((type) => mediaTypeLabel(type))
                    .join(', ') +
                  '.'
                : 'Hiện chưa thể tải tệp lên.'}
          </p>
          <form
            id="admin-media-upload"
            className="grid gap-3"
            onSubmit={(event) => void upload(event)}
          >
            {canSelectFolder && (
              <AdminSelect
                label="Thư mục lưu"
                value={selectedFolder}
                onChange={(folder) => {
                  setAssetFolder(folder)
                  setFile(null)
                  setFileInputKey((key) => key + 1)
                  setUploadError(undefined)
                }}
                disabled={progress !== null}
                options={[
                  { value: '', label: 'Chọn nơi lưu' },
                  ...folderOptions.map((option) => ({
                    value: option.folder,
                    label: folderLabel(
                      option.folder,
                      uploadFolders(capabilities.data, option.mediaType),
                      option.mediaType,
                    ),
                  })),
                ]}
              />
            )}
            <label className="flex cursor-pointer items-center gap-3 rounded-2xl border border-dashed border-border-subtle bg-white p-4 transition-colors hover:border-action-primary hover:bg-surface-muted focus-within:ring-2 focus-within:ring-action-primary">
              <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-surface-blue text-action-primary">
                <FolderOpen aria-hidden="true" className="size-5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-semibold text-ink-primary">
                  {file ? file.name : 'Chọn tệp từ thiết bị'}
                </span>
                <span className="mt-1 block text-xs font-normal text-ink-secondary">
                  {file
                    ? (file.size / 1024 / 1024).toFixed(2) +
                      ' MB · ' +
                      (selectedMediaType
                        ? mediaTypeLabel(selectedMediaType)
                        : 'Chưa nhận diện được loại tệp')
                    : folderSelectionRequired && !selectedFolder
                      ? 'Chọn nơi lưu trước khi chọn tệp'
                      : 'Chọn tệp theo loại được hỗ trợ'}
                </span>
              </span>
              <span className="shrink-0 rounded-lg border border-border-subtle px-3 py-2 text-sm font-semibold text-ink-primary">
                Chọn tệp
              </span>
              <input
                key={fileInputKey}
                aria-label="Tệp"
                className="sr-only"
                type="file"
                accept={
                  selectedMediaType
                    ? mediaAcceptForType(selectedMediaType)
                    : mediaAcceptForTypes(
                        (capabilities.data?.supportedMediaTypes ?? []) as AdminMediaType[],
                      )
                }
                onChange={(event) => {
                  const nextFile = event.target.files?.[0] ?? null
                  setUploadError(undefined)
                  setUploadSuccess('')
                  if (nextFile) {
                    const type = selectedMediaType ?? mediaTypeForFile(nextFile)
                    const invalid = type
                      ? validateAdminMediaFile(nextFile, type)
                      : 'Chọn nơi lưu trước khi chọn tệp.'
                    if (
                      !type ||
                      invalid ||
                      !capabilities.data?.supportedMediaTypes.includes(type)
                    ) {
                      setUploadError(
                        new Error(
                          invalid ?? 'Tệp này không đúng với nơi lưu đã chọn. Hãy chọn tệp khác.',
                        ),
                      )
                      setFile(null)
                      event.currentTarget.value = ''
                      return
                    }
                  }
                  setFile(nextFile)
                }}
                disabled={
                  progress !== null ||
                  capabilities.isPending ||
                  !capabilities.data?.activeProvider ||
                  (folderSelectionRequired && !selectedFolder)
                }
              />
            </label>
            <AdminSelect
              label="Ai có thể xem tệp"
              value={visibility}
              onChange={(value) => setVisibility(value as typeof visibility)}
              disabled={progress !== null}
              options={[
                { value: 'ENROLLED', label: 'Học viên có quyền' },
                { value: 'PUBLIC', label: 'Mọi người' },
              ]}
            />
            {uploadStage === 'preparing' && (
              <p role="status" className="text-sm text-ink-secondary">
                Đang chuẩn bị tệp…
              </p>
            )}
            {uploadStage === 'transferring' && progress !== null && (
              <div className="text-sm">
                <p role="status">Đang tải tệp lên {progress}%</p>
                <progress className="mt-2 block w-full" value={progress} max={100} />
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="mt-2"
                  onClick={() => uploadController.current?.abort()}
                >
                  Hủy tải lên
                </Button>
              </div>
            )}
            {uploadError instanceof Error && (
              <p
                role="alert"
                className="rounded-xl border border-danger-foreground/20 bg-danger-surface p-3 text-sm text-danger-foreground"
              >
                {uploadError.message}
              </p>
            )}
          </form>
          <AdminFeedback success={uploadSuccess} />
        </div>
      </BaseDialog>
      <AdminCard
        title="Gắn tệp vào bài học hoặc bài tập"
        description="Chọn nội dung và mục đích sử dụng để gắn tệp đúng chỗ."
      >
        <div className="grid gap-4">
          <form className="grid content-start gap-3" onSubmit={(event) => void attach(event)}>
            <div className="grid gap-3 sm:grid-cols-2">
              <AdminSelect
                label="Loại nội dung"
                value={ownerType}
                onChange={(value) => {
                  setOwnerType(value as typeof ownerType)
                  setAssetRole(value === 'lesson' ? 'LECTURE_VIDEO' : 'QUESTION_PDF')
                }}
                options={[
                  { value: 'lesson', label: 'Bài học' },
                  { value: 'exercise', label: 'Bài tập' },
                ]}
              />
              <AdminField
                label="Mã bài học hoặc bài tập"
                value={ownerId}
                onChange={setOwnerId}
                required
                placeholder={ownerType === 'lesson' ? 'Nhập mã bài học' : 'Nhập mã bài tập'}
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <AdminField
                label="Mã tệp"
                value={assetId}
                onChange={setAssetId}
                required
                placeholder="Nhập mã tệp trong thư viện"
              />
              <AdminSelect
                label="Dùng làm"
                value={assetRole}
                onChange={setAssetRole}
                options={roles.map((value) => ({ value, label: mediaRoleLabel(value) }))}
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <AdminField label="Tiêu đề hiển thị" value={title} onChange={setTitle} />
              <AdminField
                label="Thứ tự"
                value={sortOrder}
                onChange={setSortOrder}
                type="number"
                min={0}
              />
            </div>
            <Button
              type="submit"
              disabled={!ownerId.trim() || !assetId.trim()}
              loading={linkLesson.isPending || linkExercise.isPending}
            >
              Gắn tệp
            </Button>
            <AdminFeedback error={mutationError} success={associationNotice} />
          </form>
          <div className="grid content-start gap-3">
            <h3 className="font-semibold">Liên kết hiện tại</h3>
            {!ownerId.trim() ? (
              <p className="text-sm text-ink-secondary">
                Nhập mã bài học hoặc bài tập để xem các tệp đã gắn.
              </p>
            ) : associations.isPending ? (
              <AdminLoading />
            ) : associations.isError ? (
              <AdminLoadError
                error={associations.error}
                retry={() => void associations.refetch()}
              />
            ) : associations.data?.items.length ? (
              <div className="grid gap-2">
                {associations.data.items.map((item) => (
                  <div
                    key={`${item.assetId}-${item.assetRole}`}
                    className="flex items-start justify-between gap-3 rounded-xl border border-border-subtle bg-white p-3"
                  >
                    <span>
                      <strong>{item.title ?? item.media.originalName}</strong>
                      <span className="mt-1 block text-xs text-ink-secondary">
                        {mediaRoleLabel(item.assetRole)} · {mediaTypeLabel(item.media.mediaType)}
                      </span>
                    </span>
                    <Button
                      size="sm"
                      variant="outline"
                      loading={
                        (unlinkLesson.isPending &&
                          unlinkLesson.variables?.assetId === item.assetId &&
                          unlinkLesson.variables.role === item.assetRole) ||
                        (unlinkExercise.isPending &&
                          unlinkExercise.variables?.assetId === item.assetId &&
                          unlinkExercise.variables.role === item.assetRole)
                      }
                      onClick={() => void detach(item)}
                      startIcon={<Unlink aria-hidden="true" className="size-4" />}
                    >
                      Gỡ
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState title="Chưa có liên kết" />
            )}
          </div>
        </div>
      </AdminCard>
    </div>
  )
}

function MediaAssetPreview({ access, title }: { access: ApiMediaPreviewAccess; title: string }) {
  const media: MediaViewModel = {
    id: access.assetId,
    title,
    mediaType: access.mediaType,
    src: access.url,
    signedUrlExpiresAt: access.expiresAt,
    canDownload: false,
    availability: 'ready',
  }
  return (
    <section className="grid gap-2 rounded-xl border border-border-subtle bg-white p-3">
      <p className="text-xs text-ink-muted">
        Bản xem trước · hết hạn {formatDateTimeInTimezone(access.expiresAt)}
      </p>
      {access.mediaType === 'PDF' ? <PDFViewer media={media} /> : null}
      {access.mediaType === 'AUDIO' ? <AudioPlayer media={media} /> : null}
      {access.mediaType === 'VIDEO' ? <VideoPlayer media={media} /> : null}
      {access.mediaType === 'IMAGE' ? (
        <img
          src={access.url}
          alt={title}
          className="max-h-96 max-w-full rounded-lg object-contain"
        />
      ) : null}
    </section>
  )
}

export function AdminSettingsPage() {
  const query = useQuery({
    queryKey: ['admin', 'settings'],
    queryFn: () => adminRepository.getSiteSettings(),
    retry: false,
  })
  const update = useAdminMutation((input: Record<string, unknown>) =>
    adminRepository.updateSiteSettings(input),
  )
  const [form, setForm] = useState<Partial<ApiAdminSiteSettings>>({})
  const [payment, setPayment] = useState({
    enabled: false,
    bankName: '',
    accountNumber: '',
    accountHolderName: '',
    qrUrl: '',
    transferInstructions: '',
  })
  const [mainSuccess, setMainSuccess] = useState('')
  const [paymentSuccess, setPaymentSuccess] = useState('')
  // The form is initialized from server-owned settings after the query resolves.
  useEffect(() => {
    if (!query.data) return
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setForm(query.data)
    const current = query.data.payment
    setPayment({
      enabled: current?.enabled ?? false,
      bankName: current?.bankName ?? '',
      accountNumber: current?.accountNumber ?? '',
      accountHolderName: current?.accountHolderName ?? '',
      qrUrl: current?.qrUrl ?? '',
      transferInstructions: current?.transferInstructions ?? '',
    })
  }, [query.data])
  if (query.isPending) return <AdminLoading />
  if (query.isError || !query.data)
    return (
      <AdminLoadError
        error={query.error ?? new Error('Thiếu cài đặt website.')}
        retry={() => void query.refetch()}
      />
    )
  async function saveMain(event: FormEvent) {
    event.preventDefault()
    setMainSuccess('')
    const input = {
      siteName: form.siteName,
      logoAssetId: form.logoAssetId,
      heroTitle: form.heroTitle,
      heroDescription: form.heroDescription,
      heroAssetId: form.heroAssetId,
      contactEmail: form.contactEmail,
      contactPhone: form.contactPhone,
      facebookUrl: form.facebookUrl,
      zaloUrl: form.zaloUrl,
      footerDescription: form.footerDescription,
    }
    try {
      await update.mutateAsync(input)
      setMainSuccess('Đã lưu nội dung website.')
    } catch {
      /* error shown */
    }
  }
  async function savePayment(event: FormEvent) {
    event.preventDefault()
    setPaymentSuccess('')
    if (!payment.enabled) {
      try {
        await update.mutateAsync({ payment: { enabled: false } })
        setPaymentSuccess('Đã tắt hướng dẫn chuyển khoản.')
      } catch {
        /* error shown */
      }
      return
    }
    const input = {
      payment: {
        enabled: true,
        bankName: payment.bankName.trim(),
        accountNumber: payment.accountNumber.trim(),
        accountHolderName: payment.accountHolderName.trim(),
        qrUrl: payment.qrUrl.trim() || null,
        transferInstructions: payment.transferInstructions.trim(),
      },
    }
    try {
      await update.mutateAsync(input)
      setPaymentSuccess('Đã lưu cấu hình chuyển khoản.')
    } catch {
      /* error shown */
    }
  }
  const set = (key: keyof ApiAdminSiteSettings, value: string) =>
    setForm((old) => ({ ...old, [key]: value }))
  return (
    <div className="grid gap-5 xl:grid-cols-2">
      <AdminCard
        title="Nội dung website"
        description="PATCH chỉ chứa các trường website, không gửi lại khối payment."
      >
        <form className="grid gap-3" onSubmit={(event) => void saveMain(event)}>
          <AdminField
            label="Tên website"
            value={form.siteName ?? ''}
            onChange={(value) => set('siteName', value)}
            required
          />
          <AdminField
            label="Logo Asset ID"
            value={form.logoAssetId ?? ''}
            onChange={(value) => setForm((old) => ({ ...old, logoAssetId: value || null }))}
          />
          <AdminField
            label="Tiêu đề hero"
            value={form.heroTitle ?? ''}
            onChange={(value) => set('heroTitle', value)}
            required
          />
          <AdminTextArea
            label="Mô tả hero"
            value={form.heroDescription ?? ''}
            onChange={(value) => set('heroDescription', value)}
            rows={3}
          />
          <AdminField
            label="Hero Asset ID"
            value={form.heroAssetId ?? ''}
            onChange={(value) => setForm((old) => ({ ...old, heroAssetId: value || null }))}
          />
          <div className="grid gap-3 sm:grid-cols-2">
            <AdminField
              label="Email liên hệ"
              value={form.contactEmail ?? ''}
              onChange={(value) => setForm((old) => ({ ...old, contactEmail: value || null }))}
              type="email"
            />
            <AdminField
              label="Điện thoại liên hệ"
              value={form.contactPhone ?? ''}
              onChange={(value) => setForm((old) => ({ ...old, contactPhone: value || null }))}
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <AdminField
              label="Facebook URL"
              value={form.facebookUrl ?? ''}
              onChange={(value) => setForm((old) => ({ ...old, facebookUrl: value || null }))}
              type="url"
            />
            <AdminField
              label="Zalo URL"
              value={form.zaloUrl ?? ''}
              onChange={(value) => setForm((old) => ({ ...old, zaloUrl: value || null }))}
              type="url"
            />
          </div>
          <AdminTextArea
            label="Mô tả footer"
            value={form.footerDescription ?? ''}
            onChange={(value) => set('footerDescription', value)}
            rows={3}
          />
          <AdminFeedback error={update.error} success={mainSuccess} />
          <Button type="submit" loading={update.isPending}>
            Lưu nội dung website
          </Button>
        </form>
      </AdminCard>
      <AdminCard
        title="Thanh toán chuyển khoản"
        description="Chỉ hiển thị ngân hàng/QR do Admin cấu hình. QR là ảnh tĩnh, không tự chứa số tiền hoặc mã đơn."
      >
        <form className="grid gap-3" onSubmit={(event) => void savePayment(event)}>
          <label className="flex min-h-11 items-center gap-2 rounded-xl border border-border-subtle bg-white px-3 text-sm">
            <input
              type="checkbox"
              checked={payment.enabled}
              onChange={(event) => setPayment((old) => ({ ...old, enabled: event.target.checked }))}
            />
            Bật hướng dẫn chuyển khoản
          </label>
          <AdminField
            label="Ngân hàng"
            value={payment.bankName}
            onChange={(bankName) => setPayment((old) => ({ ...old, bankName }))}
            required={payment.enabled}
            disabled={!payment.enabled}
          />
          <AdminField
            label="Số tài khoản"
            value={payment.accountNumber}
            onChange={(accountNumber) => setPayment((old) => ({ ...old, accountNumber }))}
            required={payment.enabled}
            disabled={!payment.enabled}
          />
          <AdminField
            label="Chủ tài khoản"
            value={payment.accountHolderName}
            onChange={(accountHolderName) => setPayment((old) => ({ ...old, accountHolderName }))}
            required={payment.enabled}
            disabled={!payment.enabled}
          />
          <AdminField
            label="QR URL HTTPS"
            value={payment.qrUrl}
            onChange={(qrUrl) => setPayment((old) => ({ ...old, qrUrl }))}
            type="url"
            disabled={!payment.enabled}
            placeholder="URL ảnh QR tĩnh"
          />
          <AdminTextArea
            label="Hướng dẫn chuyển khoản"
            value={payment.transferInstructions}
            onChange={(transferInstructions) =>
              setPayment((old) => ({ ...old, transferInstructions }))
            }
            rows={4}
            required={payment.enabled}
          />
          <p className="text-xs leading-5 text-ink-secondary">
            Nếu chưa có cấu hình, checkout sẽ hiển thị trạng thái chưa sẵn sàng thay vì thông tin
            giả.
          </p>
          <AdminFeedback error={update.error} success={paymentSuccess} />
          <Button type="submit" loading={update.isPending}>
            Lưu cài đặt chuyển khoản
          </Button>
        </form>
      </AdminCard>
    </div>
  )
}

export function AdminAuditLogsPage() {
  const [entityType, setEntityType] = useState('')
  const [entityId, setEntityId] = useState('')
  const [actorUserId, setActorUserId] = useState('')
  const [page, setPage] = useState(1)
  const logs = useQuery({
    queryKey: ['admin', 'audit-logs', entityType, entityId, actorUserId, page],
    queryFn: () =>
      adminRepository.listAuditLogs({
        page,
        pageSize: 20,
        ...(entityType ? { entityType } : {}),
        ...(entityId ? { entityId } : {}),
        ...(actorUserId ? { actorUserId } : {}),
      }),
    retry: false,
  })
  return (
    <AdminCard
      title="Nhật ký quản trị"
      description="Chỉ đọc. Lý do điều chỉnh và kết quả thao tác lấy trực tiếp từ audit API."
    >
      <div className="grid gap-3 sm:grid-cols-3">
        <AdminField
          label="Loại đối tượng"
          value={entityType}
          onChange={(value) => {
            setEntityType(value)
            setPage(1)
          }}
        />
        <AdminField
          label="Entity ID"
          value={entityId}
          onChange={(value) => {
            setEntityId(value)
            setPage(1)
          }}
        />
        <AdminField
          label="Actor User ID"
          value={actorUserId}
          onChange={(value) => {
            setActorUserId(value)
            setPage(1)
          }}
        />
      </div>
      {logs.isPending ? (
        <AdminLoading />
      ) : logs.isError ? (
        <AdminLoadError error={logs.error} retry={() => void logs.refetch()} />
      ) : logs.data?.items.length ? (
        <div className="overflow-x-auto rounded-xl border border-border-subtle">
          <table className="w-full min-w-[820px] text-left text-sm">
            <thead className="bg-surface-muted text-xs uppercase text-ink-secondary">
              <tr>
                <th className="p-3">Thời gian</th>
                <th className="p-3">Hành động</th>
                <th className="p-3">Đối tượng</th>
                <th className="p-3">ID</th>
                <th className="p-3">Actor</th>
                <th className="p-3">Trường thay đổi</th>
              </tr>
            </thead>
            <tbody>
              {logs.data.items.map((entry) => (
                <tr key={entry.id} className="border-t border-border-subtle bg-white">
                  <td className="p-3">{formatDateTimeInTimezone(entry.createdAt)}</td>
                  <td className="p-3 font-semibold">{entry.action}</td>
                  <td className="p-3">{entry.entityType}</td>
                  <td className="p-3 font-mono text-xs">{entry.entityId}</td>
                  <td className="p-3 font-mono text-xs">{entry.actorUserId ?? '—'}</td>
                  <td className="p-3">{entry.changedFields.join(', ') || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <EmptyState title="Chưa có nhật ký phù hợp" />
      )}
      {logs.data && <p className="text-xs text-ink-muted">Tổng số: {logs.data.total}</p>}
      {logs.data && logs.data.total > logs.data.pageSize && (
        <Pagination
          page={logs.data.page}
          pages={Math.ceil(logs.data.total / logs.data.pageSize)}
          onPageChange={setPage}
        />
      )}
    </AdminCard>
  )
}
