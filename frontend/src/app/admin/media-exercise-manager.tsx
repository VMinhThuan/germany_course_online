import { useEffect, useRef, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Check, FileUp, Link2, Search, Unlink } from 'lucide-react'
import { adminRepository } from '@/data/api/admin-repository'
import type { ApiAdminExercise, ApiAssetAssociation } from '@/lib/api/types'
import { useDialogs } from '@/shared/ui/dialogs'
import { Button, EmptyState, Pagination } from '@/shared/ui'
import { useNotifications } from '@/shared/ui/notifications'
import {
  AdminCard,
  AdminFeedback,
  AdminLoadError,
  AdminLoading,
  AdminSelect,
  useAdminMutation,
} from './shared'

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
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [selectedAssetId, setSelectedAssetId] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [fileError, setFileError] = useState<Error | undefined>()
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
    try {
      await linkAsset.mutateAsync({
        exerciseId: selectedExercise.id,
        assetId: asset.id,
        title: asset.originalName,
        sortOrder: questionPdfs.length,
      })
      setSelectedAssetId('')
      notifications.success('Đã gắn PDF vào bài tập.')
    } catch (error) {
      notifications.error(
        'Không gắn được PDF',
        error instanceof Error ? error.message : 'Thử lại sau.',
      )
    }
  }

  async function uploadAndAttach() {
    setFileError(undefined)
    if (!file) return
    if (
      !file.name.toLowerCase().endsWith('.pdf') ||
      file.type !== 'application/pdf' ||
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
      setFile(null)
      setSelectedAssetId(assetId)
      if (selectedExercise) {
        await linkAsset.mutateAsync({
          exerciseId: selectedExercise.id,
          assetId,
          title: file.name,
          sortOrder: questionPdfs.length,
        })
        setSelectedAssetId('')
        notifications.success('Đã tải PDF lên và gắn vào bài tập.')
      } else {
        await queryClient.invalidateQueries({ queryKey: ['admin', 'media'] })
        notifications.success(
          'Đã tải PDF lên thư viện tệp.',
          'Tạo bài tập PDF, rồi chọn tệp này để gắn vào bài.',
        )
      }
    } catch (error) {
      if (controller.signal.aborted && assetId && !uploadCompleted)
        await adminRepository.deleteMedia(assetId).catch(() => undefined)
      if (uploadCompleted) await queryClient.invalidateQueries({ queryKey: ['admin', 'media'] })
      setFileError(error instanceof Error ? error : new Error('Không tải hoặc gắn được PDF.'))
    } finally {
      uploadController.current = null
      setProgress(null)
      setUploadStage(null)
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

  return (
    <AdminCard
      title="PDF đề bài"
      description="Tải PDF từ máy hoặc chọn tệp đã có. Tệp được gắn vào bài tập đang chọn."
      className="min-w-0"
    >
      {availableExercises.length > 1 ? (
        <AdminSelect
          label="Bài tập nhận PDF"
          value={selectedExercise?.id ?? ''}
          onChange={selectExercise}
          options={availableExercises.map((exercise) => ({
            value: exercise.id,
            label: exercise.title,
          }))}
        />
      ) : availableExercises.length === 1 ? (
        <p className="rounded-xl bg-surface-muted p-3 text-sm text-ink-secondary">
          PDF dành cho bài tập{' '}
          <strong className="text-ink-primary">{availableExercises[0]!.title}</strong>.
        </p>
      ) : (
        <div className="grid gap-1 rounded-xl border border-border-subtle bg-surface-muted p-4">
          <p className="font-semibold">Chưa có bài tập PDF</p>
          <p className="text-sm text-ink-secondary">
            Tạo bài tập PDF trước. Sau đó có thể tải tệp hoặc chọn PDF đã có trong thư viện.
          </p>
        </div>
      )}

      {selectedExercise && (
        <section aria-label="PDF đã gắn" className="grid gap-2">
          <h3 className="text-sm font-semibold">PDF đang dùng</h3>
          {associations.isPending ? (
            <AdminLoading label="Đang tải PDF của bài tập" />
          ) : associations.isError ? (
            <AdminLoadError error={associations.error} retry={() => void associations.refetch()} />
          ) : questionPdfs.length ? (
            questionPdfs.map((asset) => (
              <div
                key={`${asset.assetId}-${asset.assetRole}`}
                className="flex min-w-0 items-center justify-between gap-3 rounded-xl border border-border-subtle bg-white p-3"
              >
                <span className="min-w-0">
                  <strong className="block truncate text-sm">
                    {asset.title || asset.media.originalName}
                  </strong>
                  <span className="text-xs text-ink-secondary">
                    {(asset.media.fileSize / 1024 / 1024).toFixed(2)} MB
                  </span>
                </span>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  aria-label={`Gỡ ${asset.media.originalName}`}
                  onClick={() => confirmUnlink(asset)}
                  loading={unlinkAsset.isPending}
                  startIcon={<Unlink aria-hidden="true" className="size-4" />}
                >
                  Gỡ
                </Button>
              </div>
            ))
          ) : (
            <p className="rounded-xl bg-surface-muted p-3 text-sm text-ink-secondary">
              Chưa gắn PDF cho bài tập này.
            </p>
          )}
        </section>
      )}

      <form
        className="grid gap-3 border-t border-border-subtle pt-4"
        onSubmit={(event) => {
          event.preventDefault()
          void uploadAndAttach()
        }}
      >
        <h3 className="font-semibold">Tải PDF từ máy</h3>
        <p className="text-xs leading-5 text-ink-secondary">
          PDF tối đa 40 MB.{' '}
          {selectedExercise
            ? 'Tệp sẽ được kiểm tra rồi gắn vào bài tập đang chọn.'
            : 'Tệp sẽ được kiểm tra và lưu vào thư viện để dùng sau.'}
        </p>
        <label className="grid gap-1.5 text-sm font-semibold text-ink-primary">
          <span>Tệp PDF</span>
          <input
            className="min-h-11 w-full rounded-xl border border-border-subtle bg-white p-2 font-normal outline-none focus-visible:ring-2 focus-visible:ring-action-primary disabled:bg-surface-muted"
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
            Đang chuẩn bị tải PDF…
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
        <AdminFeedback error={fileError} />
        <Button
          type="submit"
          loading={progress !== null || linkAsset.isPending}
          disabled={
            !file ||
            progress !== null ||
            linkAsset.isPending ||
            !capabilities.data?.activeProvider ||
            !capabilities.data.supportedMediaTypes.includes('PDF')
          }
          startIcon={<FileUp aria-hidden="true" className="size-4" />}
        >
          {selectedExercise ? 'Tải lên và gắn PDF' : 'Tải PDF lên thư viện tệp'}
        </Button>
      </form>

      <section
        aria-label="Chọn PDF trong thư viện tệp"
        className="grid gap-3 border-t border-border-subtle pt-4"
      >
        <div>
          <h3 className="font-semibold">Chọn PDF có sẵn</h3>
          <p className="mt-1 text-xs leading-5 text-ink-secondary">
            Chỉ hiển thị các PDF đã có trong thư viện. Chọn một tệp để gắn vào bài tập.
          </p>
        </div>
        <label className="grid gap-1.5 text-sm font-semibold text-ink-primary">
          <span>Tìm PDF</span>
          <input
            className="min-h-11 w-full rounded-xl border border-border-subtle bg-white px-3 font-normal outline-none focus-visible:ring-2 focus-visible:ring-action-primary"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value)
              setPage(1)
              setSelectedAssetId('')
            }}
            placeholder="Tên tệp PDF"
          />
        </label>
        {media.isPending ? (
          <AdminLoading label="Đang tải PDF trong thư viện" />
        ) : media.isError ? (
          <AdminLoadError error={media.error} retry={() => void media.refetch()} />
        ) : media.data.items.length ? (
          <div className="grid gap-2">
            {media.data.items.map((asset) => {
              const linked = linkedAssetIds.has(asset.id)
              const selected = selectedAssetId === asset.id
              return (
                <div
                  key={asset.id}
                  className={`flex min-w-0 flex-wrap items-center justify-between gap-3 rounded-xl border p-3 ${selected ? 'border-action-primary bg-surface-blue' : 'border-border-subtle bg-white'}`}
                >
                  <button
                    type="button"
                    aria-pressed={selected}
                    onClick={() => setSelectedAssetId(selected ? '' : asset.id)}
                    className="min-w-0 flex-1 text-left outline-none focus-visible:ring-2 focus-visible:ring-action-primary"
                  >
                    <strong className="block truncate text-sm">{asset.originalName}</strong>
                    <span className="text-xs text-ink-secondary">
                      {(asset.fileSize / 1024 / 1024).toFixed(2)} MB
                    </span>
                  </button>
                  {linked ? (
                    <span className="text-xs font-semibold text-success-foreground">Đã gắn</span>
                  ) : (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={!selected || !selectedExercise || linkAsset.isPending}
                      loading={selected && linkAsset.isPending}
                      onClick={() => void attachAsset(asset)}
                      startIcon={<Link2 aria-hidden="true" className="size-4" />}
                    >
                      Gắn PDF
                    </Button>
                  )}
                </div>
              )
            })}
          </div>
        ) : (
          <EmptyState
            title="Chưa có PDF trong thư viện"
            description="Tải PDF từ máy hoặc thêm tệp vào thư viện trước."
          />
        )}
        {media.data && media.data.total > media.data.pageSize && (
          <Pagination
            page={media.data.page}
            pages={Math.ceil(media.data.total / media.data.pageSize)}
            onPageChange={(nextPage) => {
              setPage(nextPage)
              setSelectedAssetId('')
            }}
          />
        )}
      </section>
    </AdminCard>
  )
}
