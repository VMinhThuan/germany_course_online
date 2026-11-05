import { useEffect, useRef, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { FileUp, Link2, Unlink } from 'lucide-react'
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

export function AdminExercisePdfManager({
  lessonTitle,
  exercises,
  onCreateExercise,
}: {
  lessonTitle: string
  exercises: readonly ApiAdminExercise[]
  onCreateExercise?: () => Promise<ApiAdminExercise>
}) {
  const dialogs = useDialogs()
  const notifications = useNotifications()
  const queryClient = useQueryClient()
  const [selectedExerciseId, setSelectedExerciseId] = useState('')
  const [createdExercise, setCreatedExercise] = useState<ApiAdminExercise | null>(null)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [selectedAssetId, setSelectedAssetId] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [fileError, setFileError] = useState<Error | undefined>()
  const [creatingExercise, setCreatingExercise] = useState(false)
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
        provider: 'CLOUDINARY',
        uploadStatus: 'READY',
        ...(search.trim() ? { q: search.trim() } : {}),
      }),
    retry: false,
  })

  const availableExercises = [
    ...exercises.filter((exercise) => exercise.exerciseType === 'FILE_BASED'),
    ...(createdExercise &&
    createdExercise.exerciseType === 'FILE_BASED' &&
    !exercises.some((exercise) => exercise.id === createdExercise.id)
      ? [createdExercise]
      : []),
  ]
  const selectedExercise =
    availableExercises.find((exercise) => exercise.id === selectedExerciseId) ??
    availableExercises[0]
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
    if (!selectedExercise || !file) return
    if (
      !file.name.toLowerCase().endsWith('.pdf') ||
      file.type !== 'application/pdf' ||
      file.size > MAX_PDF_BYTES ||
      !capabilities.data?.supportedMediaTypes.includes('PDF')
    ) {
      setFileError(
        new Error('Chọn tệp PDF hợp lệ, tối đa 40 MB; provider hiện tại cần hỗ trợ PDF.'),
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
      await linkAsset.mutateAsync({
        exerciseId: selectedExercise.id,
        assetId,
        title: file.name,
        sortOrder: questionPdfs.length,
      })
      setFile(null)
      setSelectedAssetId('')
      notifications.success('Đã tải PDF lên và gắn vào bài tập.')
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

  async function createFileExercise() {
    if (!onCreateExercise || creatingExercise) return
    setCreatingExercise(true)
    try {
      const exercise = await onCreateExercise()
      setCreatedExercise(exercise)
      setSelectedExerciseId(exercise.id)
      notifications.success('Đã tạo bài tập để gắn PDF.')
    } catch (error) {
      notifications.error(
        'Không tạo được bài tập',
        error instanceof Error ? error.message : 'Thử lại sau.',
      )
    } finally {
      setCreatingExercise(false)
    }
  }

  function confirmUnlink(asset: ApiAssetAssociation) {
    if (!selectedExercise) return
    dialogs.confirm({
      title: 'Gỡ PDF khỏi bài tập?',
      description: `Tệp “${asset.media.originalName}” sẽ được gỡ khỏi bài tập này, nhưng vẫn nằm trong thư viện media.`,
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
      title="PDF bài tập"
      description="Chọn bài tập dạng FILE_BASED rồi tải PDF lên hoặc gắn một tệp PDF đã có trong Cloudinary."
      className="min-w-0"
    >
      {availableExercises.length ? (
        <AdminSelect
          label="Bài tập nhận PDF"
          value={selectedExercise?.id ?? ''}
          onChange={setSelectedExerciseId}
          options={availableExercises.map((exercise) => ({
            value: exercise.id,
            label: exercise.title,
          }))}
        />
      ) : (
        <div className="grid gap-3 rounded-xl border border-border-subtle bg-surface-muted p-4">
          <p className="text-sm text-ink-secondary">
            Tạo bài tập dạng FILE_BASED cho “{lessonTitle}” trước khi thêm PDF.
          </p>
          <Button
            type="button"
            variant="outline"
            onClick={() => void createFileExercise()}
            loading={creatingExercise}
            disabled={!onCreateExercise || creatingExercise}
          >
            Tạo bài tập FILE_BASED
          </Button>
        </div>
      )}

      {selectedExercise && (
        <>
          <section aria-label="PDF đã gắn" className="grid gap-2">
            <h3 className="text-sm font-semibold">PDF đang dùng</h3>
            {associations.isPending ? (
              <AdminLoading label="Đang tải PDF của bài tập" />
            ) : associations.isError ? (
              <AdminLoadError
                error={associations.error}
                retry={() => void associations.refetch()}
              />
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
                      {(asset.media.fileSize / 1024 / 1024).toFixed(2)} MB ·{' '}
                      {asset.media.provider ?? 'UNKNOWN'}
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

          <form
            className="grid gap-3 border-t border-border-subtle pt-4"
            onSubmit={(event) => {
              event.preventDefault()
              void uploadAndAttach()
            }}
          >
            <h3 className="font-semibold">Tải PDF từ máy</h3>
            <p className="text-xs leading-5 text-ink-secondary">
              Provider: {capabilities.data?.activeProvider ?? 'chưa cấu hình'} · PDF tối đa 40 MB.
              Tệp sẽ được xác minh trước khi gắn vào bài tập.
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
                Đang chuẩn bị lượt tải lên an toàn…
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
              Tải lên và gắn PDF
            </Button>
          </form>

          <section
            aria-label="Chọn PDF trong Cloudinary"
            className="grid gap-3 border-t border-border-subtle pt-4"
          >
            <div>
              <h3 className="font-semibold">Chọn từ Cloudinary</h3>
              <p className="mt-1 text-xs leading-5 text-ink-secondary">
                Chỉ hiển thị PDF đã tải lên và được backend xác minh.
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
              <AdminLoading label="Đang tải thư viện PDF Cloudinary" />
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
                          {(asset.fileSize / 1024 / 1024).toFixed(2)} MB · CLOUDINARY
                        </span>
                      </button>
                      {linked ? (
                        <span className="text-xs font-semibold text-success-foreground">
                          Đã gắn
                        </span>
                      ) : (
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          disabled={!selected || linkAsset.isPending}
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
                title="Chưa có PDF trên Cloudinary"
                description="Tải một tệp PDF ở phần trên hoặc thêm PDF vào thư viện media trước."
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
        </>
      )}
    </AdminCard>
  )
}
