import { useEffect, useRef, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Check,
  CheckCircle2,
  Eye,
  FileUp,
  FileText,
  FolderOpen,
  Link2,
  Search,
  Unlink,
} from 'lucide-react'
import { adminRepository } from '@/data/api/admin-repository'
import type { ApiAdminExercise, ApiAssetAssociation, ApiMediaPreviewAccess } from '@/lib/api/types'
import { useDialogs, BaseDialog } from '@/shared/ui/dialogs'
import { Button, EmptyState, Pagination } from '@/shared/ui'
import { useNotifications } from '@/shared/ui/notifications'
import { PDFViewer } from '@/domains/media/components'
import type { MediaViewModel } from '@/domains/media'
import { AdminCard, AdminLoadError, AdminLoading, AdminSelect, useAdminMutation } from './shared'

const MAX_PDF_BYTES = 40 * 1024 * 1024

export type ExercisePdfSelection =
  | { source: 'upload'; file: File; title: string }
  | { source: 'library'; assetId: string; title: string }

export function AdminExercisePdfPicker({
  value,
  onChange,
  disabled = false,
}: {
  value: ExercisePdfSelection | null
  onChange: (value: ExercisePdfSelection | null) => void
  disabled?: boolean
}) {
  const [mode, setMode] = useState<'upload' | 'library'>('upload')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [fileError, setFileError] = useState('')
  const capabilities = useQuery({
    queryKey: ['admin', 'media-capabilities'],
    queryFn: () => adminRepository.getMediaCapabilities(),
    retry: false,
  })
  const media = useQuery({
    queryKey: ['admin', 'media', 'exercise-pdf-picker', search, page],
    queryFn: () =>
      adminRepository.listMedia({
        page,
        pageSize: 20,
        mediaType: 'PDF',
        uploadStatus: 'READY',
        ...(search.trim() ? { q: search.trim() } : {}),
      }),
    enabled: mode === 'library',
    retry: false,
  })

  return (
    <section className="grid min-w-0 gap-3 rounded-2xl border border-border-subtle bg-surface-muted p-4">
      <div>
        <h3 className="font-semibold">Tệp PDF đề bài</h3>
        <p className="mt-1 text-xs leading-5 text-ink-secondary">
          Chọn tệp từ máy hoặc dùng PDF đã có. Tệp sẽ được gắn vào bài tập khi bạn bấm lưu.
        </p>
      </div>
      <div className="grid grid-cols-2 gap-2 rounded-xl bg-white p-1" aria-label="Nguồn PDF">
        <button
          type="button"
          aria-pressed={mode === 'upload'}
          disabled={disabled}
          onClick={() => {
            setMode('upload')
            onChange(null)
            setFileError('')
          }}
          className={`min-h-10 rounded-lg px-3 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-action-primary ${mode === 'upload' ? 'bg-surface-blue text-action-primary' : 'text-ink-secondary hover:bg-surface-muted'}`}
        >
          Tải từ máy
        </button>
        <button
          type="button"
          aria-pressed={mode === 'library'}
          disabled={disabled}
          onClick={() => {
            setMode('library')
            onChange(null)
            setFileError('')
          }}
          className={`min-h-10 rounded-lg px-3 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-action-primary ${mode === 'library' ? 'bg-surface-blue text-action-primary' : 'text-ink-secondary hover:bg-surface-muted'}`}
        >
          Chọn PDF có sẵn
        </button>
      </div>
      {mode === 'upload' ? (
        <div className="grid gap-2">
          <label className="grid gap-1.5 text-sm font-semibold text-ink-primary">
            <span>Tệp PDF (tối đa 40 MB)</span>
            <input
              className="min-h-11 w-full rounded-xl border border-border-subtle bg-white p-2 font-normal outline-none focus-visible:ring-2 focus-visible:ring-action-primary disabled:bg-surface-muted"
              type="file"
              accept="application/pdf,.pdf"
              disabled={disabled}
              onChange={(event) => {
                const file = event.target.files?.[0]
                if (!file) {
                  onChange(null)
                  setFileError('')
                  return
                }
                if (
                  !file.name.toLowerCase().endsWith('.pdf') ||
                  file.type !== 'application/pdf' ||
                  file.size <= 0 ||
                  file.size > MAX_PDF_BYTES
                ) {
                  onChange(null)
                  setFileError('Chọn tệp PDF hợp lệ, có dung lượng tối đa 40 MB.')
                  event.currentTarget.value = ''
                  return
                }
                setFileError('')
                onChange({ source: 'upload', file, title: file.name })
              }}
            />
          </label>
          {fileError && (
            <p role="alert" className="text-sm text-danger-foreground">
              {fileError}
            </p>
          )}
          {capabilities.data && !capabilities.data.supportedMediaTypes.includes('PDF') && (
            <p className="text-xs text-warning-foreground">
              Chưa thể tải PDF lên. Hãy chọn một tệp đã có trong thư viện.
            </p>
          )}
          {capabilities.isError && (
            <p className="text-xs text-warning-foreground">Không kiểm tra được khả năng tải tệp.</p>
          )}
        </div>
      ) : (
        <div className="grid min-w-0 gap-2">
          <label className="relative grid gap-1.5 text-sm font-semibold text-ink-primary">
            <span>Tìm PDF theo tên</span>
            <Search aria-hidden="true" className="absolute bottom-3 left-3 size-4 text-ink-muted" />
            <input
              className="min-h-11 w-full rounded-xl border border-border-subtle bg-white pl-10 pr-3 font-normal outline-none focus-visible:ring-2 focus-visible:ring-action-primary"
              value={search}
              onChange={(event) => {
                setSearch(event.target.value)
                setPage(1)
              }}
              placeholder="Nhập tên tệp"
              disabled={disabled}
            />
          </label>
          {media.isPending ? (
            <AdminLoading label="Đang tìm PDF trong thư viện" />
          ) : media.isError ? (
            <AdminLoadError error={media.error} retry={() => void media.refetch()} />
          ) : media.data?.items.length ? (
            <div className="grid max-h-64 gap-1 overflow-y-auto rounded-xl border border-border-subtle bg-white p-1">
              {media.data.items.map((asset) => {
                const selected = value?.source === 'library' && value.assetId === asset.id
                return (
                  <button
                    key={asset.id}
                    type="button"
                    aria-pressed={selected}
                    disabled={disabled}
                    onClick={() =>
                      onChange(
                        selected
                          ? null
                          : { source: 'library', assetId: asset.id, title: asset.originalName },
                      )
                    }
                    className={`flex min-h-12 items-center justify-between gap-3 rounded-lg px-3 py-2 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-action-primary ${selected ? 'bg-surface-blue text-action-primary' : 'hover:bg-surface-muted'}`}
                  >
                    <span className="min-w-0">
                      <strong className="block truncate text-sm">{asset.originalName}</strong>
                      <span className="text-xs text-ink-secondary">
                        {(asset.fileSize / 1024 / 1024).toFixed(2)} MB
                      </span>
                    </span>
                    {selected && <Check aria-hidden="true" className="size-4 shrink-0" />}
                  </button>
                )
              })}
            </div>
          ) : (
            <p className="rounded-xl border border-border-subtle bg-white p-3 text-sm text-ink-secondary">
              PDF chưa có trong thư viện. Hãy chuyển sang “Tải từ máy” để thêm tệp.
            </p>
          )}
          {media.data && media.data.total > media.data.pageSize && (
            <Pagination
              page={media.data.page}
              pages={Math.ceil(media.data.total / media.data.pageSize)}
              onPageChange={setPage}
            />
          )}
        </div>
      )}
      {value && (
        <p role="status" className="rounded-xl bg-white p-3 text-sm text-ink-secondary">
          Đã chọn: <strong className="text-ink-primary">{value.title}</strong>
        </p>
      )}
    </section>
  )
}

export async function uploadAndAttachExercisePdf(
  exerciseId: string,
  selection: ExercisePdfSelection,
  onProgress: (progress: number | null) => void = () => undefined,
) {
  let assetId = selection.source === 'library' ? selection.assetId : ''
  let uploadCompleted = false
  try {
    if (selection.source === 'upload') {
      const { file } = selection
      if (
        !file.name.toLowerCase().endsWith('.pdf') ||
        file.type !== 'application/pdf' ||
        file.size <= 0 ||
        file.size > MAX_PDF_BYTES
      )
        throw new Error('Chọn tệp PDF hợp lệ, có dung lượng tối đa 40 MB.')

      const capabilities = await adminRepository.getMediaCapabilities()
      if (!capabilities.supportedMediaTypes.includes('PDF'))
        throw new Error('Hiện chưa thể tải PDF lên. Hãy thử lại sau.')

      const controller = new AbortController()
      const intent = await adminRepository.createUploadIntent(
        {
          originalName: file.name,
          mediaType: 'PDF',
          mimeType: 'application/pdf',
          fileSize: file.size,
          visibility: 'ENROLLED',
        },
        controller.signal,
      )
      assetId = intent.assetId
      onProgress(0)
      await adminRepository.uploadFile(intent, file, onProgress, controller.signal)
      await adminRepository.completeUpload(assetId)
      uploadCompleted = true
    }

    await adminRepository.linkExerciseAsset(exerciseId, assetId, {
      assetRole: 'QUESTION_PDF',
      title: selection.title,
      sortOrder: 0,
    })
  } catch (error) {
    if (selection.source === 'upload' && assetId && !uploadCompleted)
      await adminRepository.deleteMedia(assetId).catch(() => undefined)
    throw error
  } finally {
    onProgress(null)
  }
}

export function AdminExercisePdfManager({
  exercises,
  selectedExerciseId,
  onExerciseSelect,
}: {
  exercises: readonly ApiAdminExercise[]
  selectedExerciseId?: string
  onExerciseSelect?: (exerciseId: string) => void
}) {
  const dialogs = useDialogs()
  const notifications = useNotifications()
  const queryClient = useQueryClient()
  const [localSelectedExerciseId, setLocalSelectedExerciseId] = useState('')
  const [changeOpen, setChangeOpen] = useState(false)
  const [mode, setMode] = useState<'upload' | 'library'>('upload')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [file, setFile] = useState<File | null>(null)
  const [fileInputKey, setFileInputKey] = useState(0)
  const [fileError, setFileError] = useState<Error | undefined>()
  const [preview, setPreview] = useState<{
    access: ApiMediaPreviewAccess
    title: string
  } | null>(null)
  const [previewingAssetId, setPreviewingAssetId] = useState('')
  const [progress, setProgress] = useState<number | null>(null)
  const [uploadStage, setUploadStage] = useState<'preparing' | 'transferring' | null>(null)
  const uploadController = useRef<AbortController | null>(null)

  const capabilities = useQuery({
    queryKey: ['admin', 'media-capabilities'],
    queryFn: () => adminRepository.getMediaCapabilities(),
    retry: false,
  })
  const media = useQuery({
    queryKey: ['admin', 'media', 'lesson-exercise-pdf', search, page],
    queryFn: () =>
      adminRepository.listMedia({
        page,
        pageSize: 20,
        mediaType: 'PDF',
        uploadStatus: 'READY',
        ...(search.trim() ? { q: search.trim() } : {}),
      }),
    retry: false,
    enabled: changeOpen && mode === 'library',
  })

  const availableExercises = exercises.filter((exercise) => exercise.exerciseType === 'FILE_BASED')
  const activeExerciseId = selectedExerciseId ?? localSelectedExerciseId
  const selectedExercise =
    availableExercises.find((exercise) => exercise.id === activeExerciseId) ?? availableExercises[0]
  const associations = useQuery({
    queryKey: ['admin', 'exercise-assets', selectedExercise?.id],
    queryFn: () => adminRepository.listExerciseAssets(selectedExercise!.id),
    enabled: Boolean(selectedExercise?.id),
    retry: false,
  })
  const questionPdfs = (associations.data?.items ?? []).filter(
    (asset) => asset.assetRole === 'QUESTION_PDF',
  )
  const linkedAssetIds = new Set(questionPdfs.map((asset) => asset.assetId))

  const linkAsset = useAdminMutation(
    ({
      exerciseId,
      assetId,
      title,
      sortOrder,
    }: {
      exerciseId: string
      assetId: string
      title: string
      sortOrder: number
    }) =>
      adminRepository.linkExerciseAsset(exerciseId, assetId, {
        assetRole: 'QUESTION_PDF',
        title,
        sortOrder,
      }),
  )
  const unlinkAsset = useAdminMutation(
    ({ exerciseId, assetId }: { exerciseId: string; assetId: string }) =>
      adminRepository.unlinkExerciseAsset(exerciseId, assetId, 'QUESTION_PDF'),
  )

  useEffect(() => {
    return () => uploadController.current?.abort()
  }, [])

  async function attachAsset(asset: ApiAssetAssociation['media']) {
    if (!selectedExercise) return
    setFileError(undefined)
    let newAssetAttached = false
    try {
      await linkAsset.mutateAsync({
        exerciseId: selectedExercise.id,
        assetId: asset.id,
        title: asset.originalName,
        sortOrder: 0,
      })
      newAssetAttached = true
      const previousAssets = questionPdfs.filter((item) => item.assetId !== asset.id)
      for (const previous of previousAssets) {
        await unlinkAsset.mutateAsync({
          exerciseId: selectedExercise.id,
          assetId: previous.assetId,
        })
      }
      await associations.refetch()
      setChangeOpen(false)
      notifications.success(previousAssets.length ? 'Đã thay PDF đề bài.' : 'Đã gắn PDF đề bài.')
    } catch {
      await associations.refetch()
      setFileError(
        new Error(
          newAssetAttached
            ? 'PDF mới đã được gắn, nhưng chưa gỡ được PDF cũ. Hãy đóng hộp thoại rồi gỡ tệp cũ trong danh sách đính kèm.'
            : 'Không thể gắn PDF này. Hãy thử lại sau.',
        ),
      )
    }
  }

  async function uploadAndAttach() {
    setFileError(undefined)
    if (!file) return
    if (
      !file.name.toLowerCase().endsWith('.pdf') ||
      file.type !== 'application/pdf' ||
      file.size <= 0 ||
      file.size > MAX_PDF_BYTES ||
      !capabilities.data?.supportedMediaTypes.includes('PDF')
    ) {
      setFileError(
        new Error('Chọn PDF hợp lệ tối đa 40 MB. Nếu chưa tải được, hãy thử PDF có sẵn.'),
      )
      return
    }

    const controller = new AbortController()
    uploadController.current = controller
    setProgress(0)
    setUploadStage('preparing')
    let assetId = ''
    let uploadCompleted = false
    let newAssetAttached = false
    try {
      const intent = await adminRepository.createUploadIntent(
        {
          originalName: file.name,
          mediaType: 'PDF',
          mimeType: 'application/pdf',
          fileSize: file.size,
          visibility: 'ENROLLED',
        },
        controller.signal,
      )
      assetId = intent.assetId
      setUploadStage('transferring')
      await adminRepository.uploadFile(intent, file, setProgress, controller.signal)
      await adminRepository.completeUpload(assetId)
      uploadCompleted = true
      if (selectedExercise) {
        await linkAsset.mutateAsync({
          exerciseId: selectedExercise.id,
          assetId,
          title: file.name,
          sortOrder: 0,
        })
        newAssetAttached = true
        for (const previous of questionPdfs) {
          await unlinkAsset.mutateAsync({
            exerciseId: selectedExercise.id,
            assetId: previous.assetId,
          })
        }
        await associations.refetch()
        notifications.success('Đã tải lên và thay PDF đề bài.')
      } else {
        await queryClient.invalidateQueries({ queryKey: ['admin', 'media'] })
        notifications.success(
          'Đã tải PDF lên thư viện tệp.',
          'Tạo bài tập PDF, rồi chọn tệp này để gắn vào bài.',
        )
      }
      setFile(null)
      setFileInputKey((key) => key + 1)
      setChangeOpen(false)
    } catch {
      if (controller.signal.aborted && assetId && !uploadCompleted)
        await adminRepository.deleteMedia(assetId).catch(() => undefined)
      if (uploadCompleted) await queryClient.invalidateQueries({ queryKey: ['admin', 'media'] })
      setFileError(
        new Error(
          newAssetAttached
            ? 'PDF mới đã được gắn, nhưng chưa gỡ được PDF cũ. Hãy đóng hộp thoại rồi gỡ tệp cũ trong danh sách đính kèm.'
            : 'Không thể tải hoặc gắn PDF. Hãy kiểm tra tệp rồi thử lại.',
        ),
      )
    } finally {
      uploadController.current = null
      setProgress(null)
      setUploadStage(null)
    }
  }

  async function previewAsset(asset: ApiAssetAssociation) {
    setPreviewingAssetId(asset.assetId)
    try {
      const access = await adminRepository.createMediaPreviewAccess(asset.assetId)
      setPreview({ access, title: asset.title || asset.media.originalName })
    } catch (error) {
      notifications.error(
        'Chưa mở được bản xem trước',
        error instanceof Error ? error.message : 'Hãy thử lại sau.',
      )
    } finally {
      setPreviewingAssetId('')
    }
  }

  function selectExercise(exerciseId: string) {
    setLocalSelectedExerciseId(exerciseId)
    onExerciseSelect?.(exerciseId)
  }

  function confirmUnlink(asset: ApiAssetAssociation) {
    if (!selectedExercise) return
    dialogs.confirm({
      title: 'Gỡ PDF khỏi bài tập?',
      description: `Tệp “${asset.media.originalName}” sẽ được gỡ khỏi bài tập này, nhưng vẫn nằm trong thư viện tệp.`,
      confirmLabel: 'Gỡ PDF',
      onConfirm: async () => {
        try {
          await unlinkAsset.mutateAsync({
            exerciseId: selectedExercise.id,
            assetId: asset.assetId,
          })
          await associations.refetch()
          notifications.success('Đã gỡ PDF khỏi bài tập.')
        } catch (error) {
          notifications.error(
            'Không gỡ được PDF',
            error instanceof Error ? error.message : 'Thử lại sau.',
          )
        }
      },
    })
  }

  const previewMedia: MediaViewModel | null = preview
    ? {
        id: preview.access.assetId,
        title: preview.title,
        mediaType: 'PDF',
        src: preview.access.url,
        signedUrlExpiresAt: preview.access.expiresAt,
        canDownload: false,
        availability: 'ready',
      }
    : null

  return (
    <>
      <AdminCard
        title="Tệp đính kèm cho bài tập"
        description="Xem PDF đang dùng hoặc thay bằng tệp mới."
        className="min-w-0"
      >
        {availableExercises.length > 1 ? (
          <AdminSelect
            label="Bài tập"
            value={selectedExercise?.id ?? ''}
            onChange={selectExercise}
            options={availableExercises.map((exercise) => ({
              value: exercise.id,
              label: exercise.title,
            }))}
          />
        ) : null}

        {selectedExercise ? (
          <section aria-label="File được đính kèm cho bài tập" className="grid gap-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="font-semibold">File được đính kèm</h3>
                <p className="mt-1 text-sm text-ink-secondary">{selectedExercise.title}</p>
              </div>
              <Button
                type="button"
                onClick={() => {
                  setFileError(undefined)
                  setFile(null)
                  setMode('upload')
                  setSearch('')
                  setPage(1)
                  setChangeOpen(true)
                }}
                startIcon={<FileUp aria-hidden="true" className="size-4" />}
              >
                Thay đổi tệp
              </Button>
            </div>

            {associations.isPending ? (
              <AdminLoading label="Đang tải tệp đính kèm" />
            ) : associations.isError ? (
              <AdminLoadError
                error={associations.error}
                retry={() => void associations.refetch()}
              />
            ) : questionPdfs.length ? (
              <div className="grid gap-2">
                {questionPdfs.map((asset) => (
                  <div
                    key={`${asset.assetId}-${asset.assetRole}`}
                    className="flex min-w-0 flex-wrap items-center justify-between gap-3 rounded-xl border border-border-subtle bg-white p-3"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-surface-blue text-action-primary">
                        <FileText aria-hidden="true" className="size-5" />
                      </span>
                      <span className="min-w-0">
                        <strong className="block truncate text-sm">
                          {asset.media.originalName}
                        </strong>
                        <span className="text-xs text-ink-secondary">
                          PDF · {(asset.media.fileSize / 1024 / 1024).toFixed(2)} MB
                        </span>
                      </span>
                    </div>
                    <div className="flex shrink-0 flex-wrap gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        loading={previewingAssetId === asset.assetId}
                        onClick={() => void previewAsset(asset)}
                        startIcon={<Eye aria-hidden="true" className="size-4" />}
                      >
                        Xem trước
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        aria-label={`Gỡ ${asset.media.originalName}`}
                        onClick={() => confirmUnlink(asset)}
                        loading={
                          unlinkAsset.isPending && unlinkAsset.variables?.assetId === asset.assetId
                        }
                        startIcon={<Unlink aria-hidden="true" className="size-4" />}
                      >
                        Gỡ
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-border-subtle bg-surface-muted p-4">
                <p className="font-semibold">Chưa có tệp PDF đính kèm</p>
                <p className="mt-1 text-sm text-ink-secondary">
                  Nhấn “Thay đổi tệp” để tải PDF lên hoặc chọn tệp trong thư viện.
                </p>
              </div>
            )}
          </section>
        ) : (
          <div className="grid gap-3 rounded-xl border border-dashed border-border-subtle bg-surface-muted p-4">
            <div>
              <p className="font-semibold">Chưa có bài tập PDF</p>
              <p className="mt-1 text-sm text-ink-secondary">
                Bạn vẫn có thể tải PDF vào thư viện để dùng sau.
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setMode('upload')
                setChangeOpen(true)
              }}
              startIcon={<FileUp aria-hidden="true" className="size-4" />}
            >
              Tải PDF lên thư viện
            </Button>
          </div>
        )}
      </AdminCard>

      <BaseDialog
        open={changeOpen}
        onOpenChange={(open) => {
          if (progress !== null) return
          setChangeOpen(open)
        }}
        title={selectedExercise ? 'Thay đổi PDF đề bài' : 'Tải PDF lên thư viện'}
        description={
          selectedExercise
            ? 'Chọn tệp mới từ máy hoặc thư viện. Tệp mới sẽ thay tệp đang đính kèm.'
            : 'Chọn một PDF từ thiết bị để lưu vào thư viện tệp.'
        }
        footer={
          <>
            <Button
              type="button"
              variant="outline"
              disabled={progress !== null}
              onClick={() => setChangeOpen(false)}
            >
              Đóng
            </Button>
            {mode === 'upload' && (
              <Button
                type="submit"
                form="exercise-pdf-upload"
                loading={progress !== null || linkAsset.isPending || unlinkAsset.isPending}
                disabled={
                  !file ||
                  progress !== null ||
                  linkAsset.isPending ||
                  unlinkAsset.isPending ||
                  capabilities.isPending ||
                  !capabilities.data?.activeProvider ||
                  !capabilities.data.supportedMediaTypes.includes('PDF')
                }
                startIcon={<FileUp aria-hidden="true" className="size-4" />}
              >
                {selectedExercise ? 'Tải lên và gắn PDF' : 'Tải PDF lên thư viện tệp'}
              </Button>
            )}
          </>
        }
      >
        <div className="grid gap-4">
          {selectedExercise && (
            <div className="grid grid-cols-2 gap-2 rounded-xl bg-surface-muted p-1">
              <button
                type="button"
                aria-pressed={mode === 'upload'}
                disabled={progress !== null}
                onClick={() => setMode('upload')}
                className={`min-h-10 rounded-lg px-3 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-action-primary ${mode === 'upload' ? 'bg-white text-action-primary shadow-sm' : 'text-ink-secondary hover:bg-white/70'}`}
              >
                Tải từ máy
              </button>
              <button
                type="button"
                aria-pressed={mode === 'library'}
                disabled={progress !== null}
                onClick={() => setMode('library')}
                className={`min-h-10 rounded-lg px-3 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-action-primary ${mode === 'library' ? 'bg-white text-action-primary shadow-sm' : 'text-ink-secondary hover:bg-white/70'}`}
              >
                Chọn tệp có sẵn
              </button>
            </div>
          )}

          {mode === 'upload' ? (
            <form
              id="exercise-pdf-upload"
              className="grid gap-3"
              onSubmit={(event) => {
                event.preventDefault()
                void uploadAndAttach()
              }}
            >
              <p className="text-sm leading-6 text-ink-secondary">
                PDF tối đa 40 MB.{' '}
                {selectedExercise
                  ? 'Sau khi tải xong, tệp này sẽ thay PDF đang đính kèm.'
                  : 'Tệp sẽ được lưu vào thư viện để dùng sau.'}
              </p>
              <label className="flex cursor-pointer items-center gap-3 rounded-2xl border border-dashed border-border-subtle bg-white p-4 transition-colors hover:border-action-primary hover:bg-surface-muted focus-within:ring-2 focus-within:ring-action-primary">
                <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-surface-blue text-action-primary">
                  <FolderOpen aria-hidden="true" className="size-5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold text-ink-primary">
                    {file?.name ?? 'Chọn tệp PDF từ thiết bị'}
                  </span>
                  <span className="mt-1 block text-xs font-normal text-ink-secondary">
                    {file
                      ? `${(file.size / 1024 / 1024).toFixed(2)} MB · PDF`
                      : 'Chọn tệp có dung lượng tối đa 40 MB'}
                  </span>
                </span>
                <span className="shrink-0 rounded-lg border border-border-subtle px-3 py-2 text-sm font-semibold">
                  Chọn tệp
                </span>
                <input
                  key={fileInputKey}
                  aria-label="Tệp PDF"
                  className="sr-only"
                  type="file"
                  accept="application/pdf,.pdf"
                  onChange={(event) => {
                    setFile(event.target.files?.[0] ?? null)
                    setFileError(undefined)
                  }}
                  disabled={progress !== null || capabilities.isPending}
                />
              </label>
              {uploadStage === 'preparing' && (
                <p role="status" className="text-sm text-ink-secondary">
                  Đang chuẩn bị PDF…
                </p>
              )}
              {uploadStage === 'transferring' && progress !== null && (
                <div className="text-sm">
                  <p role="status">Đang tải PDF lên {progress}%</p>
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
              {fileError && (
                <p
                  role="alert"
                  className="rounded-xl border border-danger-foreground/20 bg-danger-surface p-3 text-sm text-danger-foreground"
                >
                  {fileError.message}
                </p>
              )}
            </form>
          ) : (
            <section aria-label="Chọn tệp PDF có sẵn" className="grid gap-3">
              <label className="relative grid gap-1.5 text-sm font-semibold text-ink-primary">
                <span>Tìm PDF theo tên</span>
                <Search
                  aria-hidden="true"
                  className="absolute bottom-3 left-3 size-4 text-ink-muted"
                />
                <input
                  className="min-h-11 w-full rounded-xl border border-border-subtle bg-white pl-10 pr-3 font-normal outline-none focus-visible:ring-2 focus-visible:ring-action-primary"
                  value={search}
                  onChange={(event) => {
                    setSearch(event.target.value)
                    setPage(1)
                  }}
                  placeholder="Nhập tên tệp PDF"
                />
              </label>
              {media.isPending ? (
                <AdminLoading label="Đang tìm PDF trong thư viện" />
              ) : media.isError ? (
                <AdminLoadError error={media.error} retry={() => void media.refetch()} />
              ) : media.data?.items.length ? (
                <div className="grid max-h-72 gap-2 overflow-y-auto pr-1">
                  {media.data.items.map((asset) => {
                    const linked = linkedAssetIds.has(asset.id)
                    return (
                      <div
                        key={asset.id}
                        className="flex min-w-0 flex-wrap items-center justify-between gap-3 rounded-xl border border-border-subtle bg-white p-3"
                      >
                        <span className="flex min-w-0 items-center gap-3">
                          <FileText
                            aria-hidden="true"
                            className="size-5 shrink-0 text-action-primary"
                          />
                          <span className="min-w-0">
                            <strong className="block truncate text-sm">{asset.originalName}</strong>
                            <span className="text-xs text-ink-secondary">
                              {(asset.fileSize / 1024 / 1024).toFixed(2)} MB
                            </span>
                          </span>
                        </span>
                        {linked ? (
                          <span className="inline-flex min-h-9 items-center gap-1.5 rounded-full bg-success-surface px-3 text-xs font-semibold text-success-foreground">
                            <CheckCircle2 aria-hidden="true" className="size-4" />
                            Đang gắn
                          </span>
                        ) : (
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            loading={
                              linkAsset.isPending && linkAsset.variables?.assetId === asset.id
                            }
                            disabled={linkAsset.isPending || unlinkAsset.isPending}
                            onClick={() => void attachAsset(asset)}
                            startIcon={<Link2 aria-hidden="true" className="size-4" />}
                          >
                            Gắn
                          </Button>
                        )}
                      </div>
                    )
                  })}
                </div>
              ) : (
                <EmptyState
                  title="Chưa có PDF trong thư viện"
                  description="Chuyển sang “Tải từ máy” để thêm PDF mới."
                />
              )}
              {media.data && media.data.total > media.data.pageSize && (
                <Pagination
                  page={media.data.page}
                  pages={Math.ceil(media.data.total / media.data.pageSize)}
                  onPageChange={setPage}
                />
              )}
            </section>
          )}
        </div>
      </BaseDialog>

      <BaseDialog
        open={preview !== null}
        onOpenChange={(open) => !open && setPreview(null)}
        title="Xem trước PDF"
        description={preview?.title ?? 'Nội dung của tệp PDF đính kèm.'}
      >
        {preview && previewMedia && (
          <section className="grid gap-3">
            <p className="text-xs text-ink-muted">Bản xem trước tạm thời của tệp đính kèm.</p>
            <PDFViewer media={previewMedia} />
          </section>
        )}
      </BaseDialog>
    </>
  )
}
