import { useEffect, useRef, useState, type FormEvent } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Eye, FileUp, Unlink, X } from 'lucide-react'
import { adminRepository } from '@/data/api/admin-repository'
import type {
  ApiAdminSiteSettings,
  ApiAssetAssociation,
  ApiMediaPreviewAccess,
} from '@/lib/api/types'
import { formatDateTimeInTimezone } from '@/shared/lib/format'
import { useDialogs } from '@/shared/ui/dialogs'
import { Button, EmptyState, Pagination } from '@/shared/ui'
import { AudioPlayer, PDFViewer, VideoPlayer } from '@/domains/media/components'
import type { MediaViewModel } from '@/domains/media'
import {
  AdminCard,
  AdminField,
  AdminFeedback,
  AdminLoadError,
  AdminLoading,
  AdminSelect,
  AdminTextArea,
  useAdminMutation,
} from './shared'

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
      setUploadError(new Error('Chọn tệp trước khi tải lên.'))
      return
    }
    if (file.size <= 0) {
      setUploadError(new Error('Tệp trống không thể tải lên.'))
      return
    }
    const type = file.type.startsWith('image/')
      ? 'IMAGE'
      : file.type.startsWith('video/')
        ? 'VIDEO'
        : file.type.startsWith('audio/')
          ? 'AUDIO'
          : file.type === 'application/pdf'
            ? 'PDF'
            : null
    const extension = file.name.split('.').at(-1)?.toLowerCase()
    const acceptedExtensions: Record<string, string[]> = {
      IMAGE: ['png', 'jpg', 'jpeg', 'webp'],
      VIDEO: ['mp4'],
      AUDIO: ['mp3', 'm4a', 'mp4', 'wav', 'ogg'],
      PDF: ['pdf'],
    }
    const mimeByExtension: Record<string, string> = {
      png: 'image/png',
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      webp: 'image/webp',
      mp4: type === 'AUDIO' ? 'audio/mp4' : 'video/mp4',
      mp3: 'audio/mpeg',
      m4a: 'audio/mp4',
      wav: 'audio/wav',
      ogg: 'audio/ogg',
      pdf: 'application/pdf',
    }
    const maxBytes: Record<string, number> = {
      IMAGE: 20 * 1024 * 1024,
      VIDEO: 250 * 1024 * 1024,
      AUDIO: 50 * 1024 * 1024,
      PDF: 40 * 1024 * 1024,
    }
    if (
      !type ||
      !(acceptedExtensions[type] ?? []).includes(extension ?? '') ||
      mimeByExtension[extension ?? ''] !== file.type ||
      !capabilities.data?.supportedMediaTypes.includes(type) ||
      file.size > maxBytes[type]!
    ) {
      setUploadError(
        new Error(
          `Định dạng hoặc dung lượng không được hỗ trợ. Provider hiện tại cho phép: ${capabilities.data?.supportedMediaTypes.join(', ') || 'chưa cấu hình'}.`,
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
        },
        controller.signal,
      )
      createdAssetId = intent.assetId
      setUploadStage('transferring')
      await adminRepository.uploadFile(intent, file, setProgress, controller.signal)
      await adminRepository.completeUpload(intent.assetId)
      setUploadSuccess('Backend đã xác minh tệp và hoàn tất tài sản media.')
      setFile(null)
      await assets.refetch()
      setSelectedAssetId(intent.assetId)
    } catch (error) {
      if (controller.signal.aborted && createdAssetId)
        await adminRepository.deleteMedia(createdAssetId).catch(() => undefined)
      setUploadError(error)
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
      title: 'Xóa media này?',
      description: 'Backend sẽ kiểm tra các liên kết trước khi xóa.',
      confirmLabel: 'Xóa media',
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
      setAssociationNotice('Đã tạo liên kết qua API.')
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

  return (
    <div className="grid gap-5">
      <div className="grid gap-5 xl:grid-cols-2">
        <AdminCard
          title="Thư viện media"
          description="Chỉ tài sản đã được backend xác minh mới xuất hiện. Storage key và credential không được trả về."
        >
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
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
              label="Loại media"
              value={mediaType}
              onChange={(value) => {
                setMediaType(value)
                setPage(1)
              }}
              options={[
                { value: '', label: 'Tất cả' },
                ...['IMAGE', 'VIDEO', 'AUDIO', 'PDF'].map((value) => ({ value, label: value })),
              ]}
            />
            <AdminSelect
              label="Trạng thái"
              value={uploadStatus}
              onChange={(value) => {
                setUploadStatus(value)
                setPage(1)
              }}
              options={[
                { value: '', label: 'Mọi trạng thái' },
                ...['PENDING', 'READY', 'DELETING', 'DELETED'].map((value) => ({
                  value,
                  label: value,
                })),
              ]}
            />
            <AdminSelect
              label="Provider"
              value={provider}
              onChange={(value) => {
                setProvider(value)
                setPage(1)
              }}
              options={[
                { value: '', label: 'Mọi provider' },
                { value: 'S3_COMPATIBLE', label: 'S3 Compatible' },
                { value: 'CLOUDINARY', label: 'Cloudinary' },
              ]}
            />
          </div>
          {assets.isPending ? (
            <AdminLoading />
          ) : assets.isError ? (
            <AdminLoadError error={assets.error} retry={() => void assets.refetch()} />
          ) : assets.data?.items.length ? (
            <div className="grid gap-2">
              {assets.data.items.map((asset) => (
                <div
                  key={asset.id}
                  className="grid gap-3 rounded-xl border border-border-subtle bg-white p-3"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <span className="min-w-0">
                      <strong className="block truncate">{asset.originalName}</strong>
                      <span className="text-xs text-ink-secondary">
                        {asset.mediaType} · {asset.mimeType} ·{' '}
                        {(asset.fileSize / 1024 / 1024).toFixed(2)} MB · {asset.visibility}
                      </span>
                      <span className="mt-1 block text-xs text-ink-secondary">
                        {asset.provider ?? 'UNKNOWN'} · {asset.uploadStatus ?? 'READY'} ·{' '}
                        {formatDateTimeInTimezone(asset.createdAt)} · Dùng tại{' '}
                        {asset.usageCount ?? 0} vị trí
                      </span>
                      <code className="mt-1 block break-all text-[11px] text-ink-muted">
                        Asset ID: {asset.id}
                      </code>
                    </span>
                    <span className="flex flex-wrap gap-2">
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
                        loading={deleteAsset.isPending}
                        onClick={() => void removeAsset(asset.id)}
                      >
                        Xóa
                      </Button>
                    </span>
                  </div>
                  {selectedAssetId === asset.id && (
                    <div className="grid gap-3 rounded-xl bg-surface-muted p-3">
                      <div className="flex items-center justify-between gap-3">
                        <h3 className="font-semibold">Chi tiết tài sản</h3>
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
                          <dl className="grid gap-2 text-sm sm:grid-cols-2">
                            <div>
                              <dt className="text-ink-muted">Public ID</dt>
                              <dd>
                                <code className="break-all">
                                  {detail.data.media.publicId ?? '—'}
                                </code>
                              </dd>
                            </div>
                            <div>
                              <dt className="text-ink-muted">Provider / resource</dt>
                              <dd>
                                {detail.data.media.provider} ·{' '}
                                {detail.data.media.resourceType ?? '—'} ·{' '}
                                {detail.data.media.deliveryType ?? '—'}
                              </dd>
                            </div>
                            <div>
                              <dt className="text-ink-muted">Định dạng / trạng thái</dt>
                              <dd>
                                {detail.data.media.format ?? detail.data.media.mimeType} ·{' '}
                                {detail.data.media.uploadStatus}
                              </dd>
                            </div>
                            <div>
                              <dt className="text-ink-muted">Số tham chiếu</dt>
                              <dd>{detail.data.references.length}</dd>
                            </div>
                          </dl>
                          <div className="grid gap-2">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <h4 className="font-semibold">Nội dung đang sử dụng</h4>
                              <Button
                                size="sm"
                                variant="outline"
                                disabled={detail.data.media.uploadStatus !== 'READY'}
                                onClick={() => void previewAsset(asset.id)}
                              >
                                Tạo bản xem trước tạm thời
                              </Button>
                            </div>
                            {detail.data.references.length ? (
                              <ul className="grid gap-1 text-sm">
                                {detail.data.references.map((reference, index) => (
                                  <li
                                    key={`${reference.kind}-${reference.parentId}-${reference.role}-${index}`}
                                  >
                                    {reference.kind} · {reference.title ?? reference.parentId} ·{' '}
                                    {reference.role}
                                  </li>
                                ))}
                              </ul>
                            ) : (
                              <p className="text-sm text-ink-secondary">
                                Tài sản chưa được liên kết.
                              </p>
                            )}
                          </div>
                          {previewError && (
                            <p role="alert" className="text-sm text-danger-foreground">
                              {previewError}
                            </p>
                          )}
                          {preview?.assetId === asset.id && (
                            <MediaAssetPreview access={preview} title={asset.originalName} />
                          )}
                        </>
                      ) : null}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              title="Chưa có media"
              description="Tải tệp lên nếu dịch vụ lưu trữ đã được cấu hình."
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
        </AdminCard>
        <AdminCard
          title="Tải media lên"
          description="Quy trình gồm upload intent, upload trực tiếp và xác minh hoàn tất từ backend. Tài sản không READY chỉ vì trình duyệt báo tải xong."
        >
          <p className="rounded-xl bg-surface-muted p-3 text-sm text-ink-secondary">
            Provider đang hoạt động:{' '}
            <strong>{capabilities.data?.activeProvider ?? 'chưa cấu hình'}</strong>
            {capabilities.data && (
              <> · Loại tệp: {capabilities.data.supportedMediaTypes.join(', ') || 'không có'}</>
            )}
          </p>
          <form className="grid gap-3" onSubmit={(event) => void upload(event)}>
            <label className="grid gap-1.5 text-sm font-semibold">
              Tệp
              <input
                className="min-h-11 w-full rounded-xl border border-border-subtle bg-white p-2 font-normal"
                type="file"
                accept={mediaAccept(capabilities.data?.supportedMediaTypes ?? [])}
                onChange={(event) => {
                  setFile(event.target.files?.[0] ?? null)
                  setUploadError(undefined)
                }}
                disabled={
                  progress !== null || capabilities.isPending || !capabilities.data?.activeProvider
                }
                required
              />
            </label>
            <AdminSelect
              label="Phạm vi"
              value={visibility}
              onChange={(value) => setVisibility(value as typeof visibility)}
              options={[
                { value: 'ENROLLED', label: 'Học viên có quyền' },
                { value: 'PUBLIC', label: 'Công khai' },
              ]}
            />
            {uploadStage === 'preparing' && (
              <p role="status" className="text-sm text-ink-secondary">
                Đang tạo lượt tải lên an toàn…
              </p>
            )}
            {uploadStage === 'transferring' && progress !== null && (
              <div className="text-sm">
                <p role="status">Đang tải lên {progress}%</p>
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
            <AdminFeedback error={uploadError} success={uploadSuccess} />
            <Button
              type="submit"
              loading={progress !== null}
              disabled={
                capabilities.isPending || !capabilities.data?.activeProvider || progress !== null
              }
              startIcon={<FileUp aria-hidden="true" className="size-4" />}
            >
              Tải lên và xác minh
            </Button>
          </form>
          <p className="text-xs leading-5 text-ink-secondary">
            Nếu provider chưa cấu hình, API sẽ trả lỗi; không tạo URL phát giả và không đánh dấu
            READY.
          </p>
        </AdminCard>
      </div>
      <AdminCard
        title="Liên kết asset với nội dung"
        description="API xác minh loại tài sản và vai trò phù hợp cho Lesson hoặc Exercise."
      >
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
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
                  { value: 'lesson', label: 'Lesson' },
                  { value: 'exercise', label: 'Exercise' },
                ]}
              />
              <AdminField
                label="ID nội dung"
                value={ownerId}
                onChange={setOwnerId}
                required
                placeholder={ownerType === 'lesson' ? 'Lesson ID' : 'Exercise ID'}
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <AdminField
                label="Asset ID"
                value={assetId}
                onChange={setAssetId}
                required
                placeholder="ID từ thư viện bên trái"
              />
              <AdminSelect
                label="Vai trò asset"
                value={assetRole}
                onChange={setAssetRole}
                options={roles.map((value) => ({ value, label: value }))}
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
              Tạo liên kết
            </Button>
            <AdminFeedback error={mutationError} success={associationNotice} />
          </form>
          <div className="grid content-start gap-3">
            <h3 className="font-semibold">Liên kết hiện tại</h3>
            {!ownerId.trim() ? (
              <p className="text-sm text-ink-secondary">
                Nhập Lesson ID hoặc Exercise ID để tải liên kết đã lưu.
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
                        {item.assetRole} · {item.media.mediaType} · {item.assetId}
                      </span>
                    </span>
                    <Button
                      size="sm"
                      variant="outline"
                      loading={unlinkLesson.isPending || unlinkExercise.isPending}
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

function mediaAccept(types: readonly string[]): string {
  const accepted = new Set<string>()
  if (types.includes('IMAGE')) accepted.add('.jpg,.jpeg,.png,.webp')
  if (types.includes('VIDEO')) accepted.add('.mp4')
  if (types.includes('AUDIO')) accepted.add('.mp3,.m4a,.wav,.ogg')
  if (types.includes('PDF')) accepted.add('.pdf')
  return [...accepted].join(',')
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
