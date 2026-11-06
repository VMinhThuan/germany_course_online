import { useState, type ChangeEvent } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  AudioLines,
  Check,
  CheckCircle2,
  Eye,
  FileText,
  FileUp,
  FolderOpen,
  Link2,
  Search,
  Unlink,
  Video,
} from 'lucide-react'
import { adminRepository } from '@/data/api/admin-repository'
import type {
  ApiAdminExercise,
  ApiAdminMediaAsset,
  ApiAssetAssociation,
  ApiMediaPreviewAccess,
} from '@/lib/api/types'
import { BaseDialog, useDialogs } from '@/shared/ui/dialogs'
import { Button, EmptyState, Pagination } from '@/shared/ui'
import { useNotifications } from '@/shared/ui/notifications'
import { AudioPlayer, PDFViewer, VideoPlayer } from '@/domains/media/components'
import type { MediaViewModel } from '@/domains/media'
import { AdminCard, AdminLoadError, AdminLoading, AdminSelect, useAdminMutation } from './shared'
import {
  folderRoots,
  mediaAccept,
  mediaTypeLabel,
  preferredUploadFolder,
  uploadAdminMedia,
  uploadFolders,
  validateAdminMediaFile,
  type AdminMediaType,
} from './media-upload'

export type ExerciseQuestionRole = 'QUESTION_PDF' | 'QUESTION_AUDIO'
export type ExerciseMediaRole = ExerciseQuestionRole | 'ANSWER_PDF' | 'SOLUTION_VIDEO'

export type ExerciseMediaSelection =
  | {
      source: 'upload'
      role: ExerciseMediaRole
      file: File
      title: string
      assetFolder?: string
    }
  | {
      source: 'library'
      role: ExerciseMediaRole
      assetId: string
      mediaType: AdminMediaType
      title: string
    }

const questionRoles: ReadonlyArray<{ value: ExerciseQuestionRole; label: string }> = [
  { value: 'QUESTION_PDF', label: 'PDF đề bài' },
  { value: 'QUESTION_AUDIO', label: 'Âm thanh bài tập' },
]

const roleDetails: Record<ExerciseMediaRole, { label: string; mediaType: AdminMediaType }> = {
  QUESTION_PDF: { label: 'PDF đề bài', mediaType: 'PDF' },
  QUESTION_AUDIO: { label: 'Âm thanh bài tập', mediaType: 'AUDIO' },
  ANSWER_PDF: { label: 'PDF đáp án', mediaType: 'PDF' },
  SOLUTION_VIDEO: { label: 'Video đáp án', mediaType: 'VIDEO' },
}

function roleLabel(role: string) {
  return role in roleDetails ? roleDetails[role as ExerciseMediaRole].label : 'Tệp bài tập'
}

function roleMediaType(role: ExerciseMediaRole): AdminMediaType {
  return roleDetails[role].mediaType
}

function folderOptionLabel(folder: string, folders: readonly string[], type: AdminMediaType) {
  const root = folderRoots(folders).find(
    (candidate) => folder === candidate || folder.startsWith(`${candidate}/`),
  )
  const ending = root?.split('/').at(-1)?.toLowerCase()
  const rootLabel =
    type === 'PDF' ? 'Tài liệu PDF' : ending === 'lesson-audio' ? 'Âm thanh bài tập' : 'Âm thanh'
  const subfolder =
    root && folder !== root ? folder.slice(root.length + 1).replaceAll('/', ' / ') : ''
  return subfolder ? `${rootLabel} · ${subfolder}` : rootLabel
}

function mediaIcon(type: string) {
  if (type === 'AUDIO') return <AudioLines aria-hidden="true" className="size-5" />
  if (type === 'VIDEO') return <Video aria-hidden="true" className="size-5" />
  return <FileText aria-hidden="true" className="size-5" />
}

export function AdminExerciseMediaPicker({
  value,
  onChange,
  disabled = false,
}: {
  value: readonly ExerciseMediaSelection[]
  onChange: (value: ExerciseMediaSelection[]) => void
  disabled?: boolean
}) {
  const [mode, setMode] = useState<'upload' | 'library'>('upload')
  const [role, setRole] = useState<ExerciseQuestionRole>('QUESTION_PDF')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [filesError, setFilesError] = useState('')
  const [assetFolder, setAssetFolder] = useState('')
  const mediaType = roleMediaType(role)
  const capabilities = useQuery({
    queryKey: ['admin', 'media-capabilities'],
    queryFn: () => adminRepository.getMediaCapabilities(),
    retry: false,
  })
  const folders = uploadFolders(capabilities.data, mediaType)
  const activeFolder = folders.includes(assetFolder)
    ? assetFolder
    : preferredUploadFolder(
        capabilities.data,
        mediaType,
        role === 'QUESTION_AUDIO' ? 'lesson-audio' : undefined,
      )
  const media = useQuery({
    queryKey: ['admin', 'media', 'exercise-media-picker', mediaType, search, page],
    queryFn: () =>
      adminRepository.listMedia({
        page,
        pageSize: 20,
        mediaType,
        uploadStatus: 'READY',
        ...(search.trim() ? { q: search.trim() } : {}),
      }),
    enabled: mode === 'library',
    retry: false,
  })

  function appendFiles(event: ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(event.target.files ?? [])
    const invalid = selected.find((file) => validateAdminMediaFile(file, mediaType))
    if (invalid) {
      setFilesError(validateAdminMediaFile(invalid, mediaType) ?? 'Kiểm tra lại tệp đã chọn.')
      event.currentTarget.value = ''
      return
    }
    const additions: ExerciseMediaSelection[] = selected.map((file) => ({
      source: 'upload',
      role,
      file,
      title: file.name,
      ...(activeFolder ? { assetFolder: activeFolder } : {}),
    }))
    const existing = new Set(
      value
        .filter((item) => item.source === 'upload')
        .map(
          (item) => `${item.role}:${item.file.name}:${item.file.size}:${item.file.lastModified}`,
        ),
    )
    onChange([
      ...value,
      ...additions.filter((item) => {
        if (item.source !== 'upload') return false
        const key = `${item.role}:${item.file.name}:${item.file.size}:${item.file.lastModified}`
        if (existing.has(key)) return false
        existing.add(key)
        return true
      }),
    ])
    setFilesError('')
    event.currentTarget.value = ''
  }

  function toggleLibraryAsset(asset: ApiAdminMediaAsset) {
    const selected = value.some(
      (item) => item.source === 'library' && item.assetId === asset.id && item.role === role,
    )
    onChange(
      selected
        ? value.filter(
            (item) =>
              !(item.source === 'library' && item.assetId === asset.id && item.role === role),
          )
        : [
            ...value,
            {
              source: 'library',
              role,
              assetId: asset.id,
              mediaType: asset.mediaType as 'PDF' | 'AUDIO',
              title: asset.originalName,
            },
          ],
    )
  }

  function removeSelection(index: number) {
    onChange(value.filter((_, itemIndex) => itemIndex !== index))
  }

  return (
    <section className="grid min-w-0 gap-3 rounded-2xl border border-border-subtle bg-surface-muted p-4">
      <div>
        <h3 className="font-semibold">Tệp đính kèm</h3>
        <p className="mt-1 text-xs leading-5 text-ink-secondary">
          Thêm một hoặc nhiều PDF đề bài, âm thanh hoặc chọn tệp đã có.
        </p>
      </div>
      <div className="grid grid-cols-2 gap-2 rounded-xl bg-white p-1" aria-label="Cách chọn tệp">
        <button
          type="button"
          aria-pressed={mode === 'upload'}
          disabled={disabled}
          onClick={() => setMode('upload')}
          className={`min-h-10 rounded-lg px-3 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-action-primary ${mode === 'upload' ? 'bg-surface-blue text-action-primary' : 'text-ink-secondary hover:bg-surface-muted'}`}
        >
          Tải từ máy
        </button>
        <button
          type="button"
          aria-pressed={mode === 'library'}
          disabled={disabled}
          onClick={() => setMode('library')}
          className={`min-h-10 rounded-lg px-3 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-action-primary ${mode === 'library' ? 'bg-surface-blue text-action-primary' : 'text-ink-secondary hover:bg-surface-muted'}`}
        >
          Chọn tệp có sẵn
        </button>
      </div>

      <AdminSelect
        label="Loại tệp"
        value={role}
        onChange={(nextRole) => {
          setRole(nextRole as ExerciseQuestionRole)
          setAssetFolder('')
          setPage(1)
          setFilesError('')
        }}
        disabled={disabled}
        options={questionRoles}
      />

      {mode === 'upload' ? (
        <div className="grid gap-2">
          {capabilities.data?.activeProvider === 'CLOUDINARY' && folders.length > 0 && (
            <AdminSelect
              label="Nơi lưu"
              value={activeFolder}
              onChange={(folder) => {
                setAssetFolder(folder)
                onChange(
                  value.map((item) =>
                    item.source === 'upload' && item.role === role
                      ? { ...item, assetFolder: folder }
                      : item,
                  ),
                )
              }}
              disabled={
                disabled ||
                capabilities.isPending ||
                !capabilities.data?.supportedMediaTypes.includes(mediaType)
              }
              options={folders.map((folder) => ({
                value: folder,
                label: folderOptionLabel(folder, folders, mediaType),
              }))}
            />
          )}
          <label className="flex cursor-pointer items-center gap-3 rounded-2xl border border-dashed border-border-subtle bg-white p-4 transition-colors hover:border-action-primary hover:bg-surface-muted focus-within:ring-2 focus-within:ring-action-primary">
            <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-surface-blue text-action-primary">
              <FolderOpen aria-hidden="true" className="size-5" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block font-semibold text-ink-primary">Chọn một hoặc nhiều tệp</span>
              <span className="mt-1 block text-xs font-normal text-ink-secondary">
                {mediaType === 'PDF' ? 'PDF tối đa 40 MB mỗi tệp' : 'Âm thanh tối đa 50 MB mỗi tệp'}
              </span>
            </span>
            <span className="shrink-0 rounded-lg border border-border-subtle px-3 py-2 text-sm font-semibold">
              Chọn tệp
            </span>
            <input
              aria-label="Tệp bài tập"
              className="sr-only"
              type="file"
              multiple
              accept={mediaAccept(mediaType)}
              disabled={disabled || capabilities.isPending}
              onChange={appendFiles}
            />
          </label>
          {capabilities.data && !capabilities.data.supportedMediaTypes.includes(mediaType) && (
            <p role="status" className="text-xs text-warning-foreground">
              Hiện chưa thể tải {mediaTypeLabel(mediaType)} lên. Bạn có thể chọn tệp có sẵn trong
              thư viện.
            </p>
          )}
          {filesError && (
            <p role="alert" className="text-sm text-danger-foreground">
              {filesError}
            </p>
          )}
        </div>
      ) : (
        <section aria-label="Chọn tệp từ thư viện" className="grid min-w-0 gap-2">
          <label className="relative grid gap-1.5 text-sm font-semibold text-ink-primary">
            <span>Tìm tệp theo tên</span>
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
            <AdminLoading label="Đang tìm tệp trong thư viện" />
          ) : media.isError ? (
            <AdminLoadError error={media.error} retry={() => void media.refetch()} />
          ) : media.data?.items.length ? (
            <div className="grid max-h-64 gap-1 overflow-y-auto rounded-xl border border-border-subtle bg-white p-1">
              {media.data.items.map((asset) => {
                const selected = value.some(
                  (item) =>
                    item.source === 'library' && item.assetId === asset.id && item.role === role,
                )
                return (
                  <button
                    key={asset.id}
                    type="button"
                    aria-pressed={selected}
                    disabled={disabled}
                    onClick={() => toggleLibraryAsset(asset)}
                    className={`flex min-h-12 items-center justify-between gap-3 rounded-lg px-3 py-2 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-action-primary ${selected ? 'bg-surface-blue text-action-primary' : 'hover:bg-surface-muted'}`}
                  >
                    <span className="flex min-w-0 items-center gap-2">
                      {mediaIcon(asset.mediaType)}
                      <span className="min-w-0">
                        <strong className="block truncate text-sm">{asset.originalName}</strong>
                        <span className="text-xs text-ink-secondary">
                          {(asset.fileSize / 1024 / 1024).toFixed(2)} MB
                        </span>
                      </span>
                    </span>
                    {selected && <Check aria-hidden="true" className="size-4 shrink-0" />}
                  </button>
                )
              })}
            </div>
          ) : (
            <EmptyState
              title="Chưa có tệp phù hợp"
              description="Chuyển sang “Tải từ máy” để thêm tệp mới."
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

      {value.length > 0 && (
        <ul aria-label="Tệp đã chọn" className="grid gap-2">
          {value.map((item, index) => (
            <li
              key={
                item.source === 'upload'
                  ? `${item.role}-${item.file.name}-${item.file.size}-${item.file.lastModified}`
                  : `${item.role}-${item.assetId}`
              }
              className="flex min-w-0 items-center justify-between gap-3 rounded-xl border border-border-subtle bg-white p-3"
            >
              <span className="flex min-w-0 items-center gap-2">
                {mediaIcon(item.source === 'upload' ? roleMediaType(item.role) : item.mediaType)}
                <span className="min-w-0">
                  <strong className="block truncate text-sm">{item.title}</strong>
                  <span className="text-xs text-ink-secondary">{roleLabel(item.role)}</span>
                </span>
              </span>
              <Button
                type="button"
                size="sm"
                variant="outline"
                aria-label={`Bỏ ${item.title} khỏi danh sách`}
                disabled={disabled}
                onClick={() => removeSelection(index)}
              >
                Bỏ
              </Button>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

export async function uploadAndAttachExerciseMedia(
  exerciseId: string,
  selections: readonly ExerciseMediaSelection[],
  onProgress: (progress: number | null) => void = () => undefined,
  onFileStart: (index: number, count: number) => void = () => undefined,
  sortOrderOffset = 0,
) {
  try {
    for (const [index, selection] of selections.entries()) {
      onFileStart(index, selections.length)
      let assetId = selection.source === 'library' ? selection.assetId : ''
      try {
        if (selection.source === 'upload') {
          assetId = await uploadAdminMedia(
            selection.file,
            roleMediaType(selection.role),
            'ENROLLED',
            {
              ...(selection.assetFolder ? { assetFolder: selection.assetFolder } : {}),
              ...(selection.role === 'QUESTION_AUDIO'
                ? { preferredFolderEnding: 'lesson-audio' }
                : {}),
              onProgress,
            },
          )
        }
        await adminRepository.linkExerciseAsset(exerciseId, assetId, {
          assetRole: selection.role,
          title: selection.title,
          sortOrder: sortOrderOffset + index,
        })
      } catch (error) {
        if (selection.source === 'upload' && assetId)
          await adminRepository.deleteMedia(assetId).catch(() => undefined)
        throw error
      }
    }
  } finally {
    onProgress(null)
  }
}

export function AdminExerciseMediaManager({
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
  const [role, setRole] = useState<ExerciseMediaRole>('QUESTION_PDF')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [files, setFiles] = useState<File[]>([])
  const [fileInputKey, setFileInputKey] = useState(0)
  const [fileError, setFileError] = useState<Error | undefined>()
  const [assetFolder, setAssetFolder] = useState('')
  const [preview, setPreview] = useState<{
    access: ApiMediaPreviewAccess
    title: string
  } | null>(null)
  const [previewingAssetId, setPreviewingAssetId] = useState('')
  const [progress, setProgress] = useState<number | null>(null)
  const [uploadingFile, setUploadingFile] = useState('')
  const capabilities = useQuery({
    queryKey: ['admin', 'media-capabilities'],
    queryFn: () => adminRepository.getMediaCapabilities(),
    retry: false,
  })

  const activeExerciseId = selectedExerciseId ?? localSelectedExerciseId
  const selectedExercise =
    exercises.find((exercise) => exercise.id === activeExerciseId) ?? exercises[0]
  const selectedRoleType = roleMediaType(role)
  const folders = uploadFolders(capabilities.data, selectedRoleType)
  const selectedFolder = folders.includes(assetFolder)
    ? assetFolder
    : preferredUploadFolder(
        capabilities.data,
        selectedRoleType,
        role === 'QUESTION_AUDIO' ? 'lesson-audio' : undefined,
      )
  const associations = useQuery({
    queryKey: ['admin', 'exercise-assets', selectedExercise?.id],
    queryFn: () => adminRepository.listExerciseAssets(selectedExercise!.id),
    enabled: Boolean(selectedExercise?.id),
    retry: false,
  })
  const linkedAssets = associations.data?.items ?? []
  const media = useQuery({
    queryKey: ['admin', 'media', 'exercise-attachment-picker', selectedRoleType, search, page],
    queryFn: () =>
      adminRepository.listMedia({
        page,
        pageSize: 20,
        mediaType: selectedRoleType,
        uploadStatus: 'READY',
        ...(search.trim() ? { q: search.trim() } : {}),
      }),
    retry: false,
    enabled: changeOpen && mode === 'library',
  })
  const linkAsset = useAdminMutation(
    ({
      asset,
      exerciseId,
      assetRole,
    }: {
      asset: ApiAdminMediaAsset
      exerciseId: string
      assetRole: ExerciseMediaRole
    }) =>
      adminRepository.linkExerciseAsset(exerciseId, asset.id, {
        assetRole,
        title: asset.originalName,
        sortOrder: linkedAssets.length,
      }),
  )
  const unlinkAsset = useAdminMutation(
    ({
      exerciseId,
      assetId,
      assetRole,
    }: {
      exerciseId: string
      assetId: string
      assetRole: string
    }) => adminRepository.unlinkExerciseAsset(exerciseId, assetId, assetRole),
  )

  function selectExercise(exerciseId: string) {
    setLocalSelectedExerciseId(exerciseId)
    onExerciseSelect?.(exerciseId)
  }

  async function previewAsset(asset: ApiAssetAssociation) {
    setPreviewingAssetId(asset.assetId)
    try {
      const access = await adminRepository.createMediaPreviewAccess(asset.assetId)
      setPreview({ access, title: asset.title ?? asset.media.originalName })
    } catch {
      notifications.error('Không mở được tệp xem trước', 'Hãy thử lại sau.')
    } finally {
      setPreviewingAssetId('')
    }
  }

  function confirmUnlink(asset: ApiAssetAssociation) {
    if (!selectedExercise) return
    dialogs.confirm({
      title: 'Gỡ tệp khỏi bài tập?',
      description: `Tệp “${asset.media.originalName}” vẫn còn trong thư viện sau khi gỡ.`,
      confirmLabel: 'Gỡ tệp',
      onConfirm: async () => {
        try {
          await unlinkAsset.mutateAsync({
            exerciseId: selectedExercise.id,
            assetId: asset.assetId,
            assetRole: asset.assetRole,
          })
          await associations.refetch()
          notifications.success('Đã gỡ tệp khỏi bài tập.')
        } catch {
          notifications.error('Không gỡ được tệp', 'Hãy thử lại sau.')
        }
      },
    })
  }

  async function attachAsset(asset: ApiAdminMediaAsset) {
    if (!selectedExercise) return
    setFileError(undefined)
    try {
      await linkAsset.mutateAsync({ exerciseId: selectedExercise.id, asset, assetRole: role })
      await associations.refetch()
      notifications.success('Đã gắn tệp vào bài tập.')
    } catch {
      setFileError(new Error('Không gắn được tệp này. Hãy thử lại sau.'))
    }
  }

  async function uploadAndAttach() {
    setFileError(undefined)
    if (files.length === 0) return
    const invalid = files.find((file) => validateAdminMediaFile(file, selectedRoleType))
    if (invalid) {
      setFileError(
        new Error(validateAdminMediaFile(invalid, selectedRoleType) ?? 'Kiểm tra lại tệp.'),
      )
      return
    }
    const exerciseId = selectedExercise?.id
    const selections: ExerciseMediaSelection[] = files.map((file) => ({
      source: 'upload',
      role,
      file,
      title: file.name,
      ...(selectedFolder ? { assetFolder: selectedFolder } : {}),
    }))
    try {
      for (const [index, file] of files.entries()) {
        setUploadingFile(`${index + 1} / ${files.length} · ${file.name}`)
        if (exerciseId) {
          await uploadAndAttachExerciseMedia(
            exerciseId,
            [selections[index]!],
            setProgress,
            undefined,
            linkedAssets.length + index,
          )
        } else {
          await uploadAdminMedia(file, selectedRoleType, 'ENROLLED', {
            ...(selectedFolder ? { assetFolder: selectedFolder } : {}),
            ...(role === 'QUESTION_AUDIO' ? { preferredFolderEnding: 'lesson-audio' } : {}),
            onProgress: setProgress,
          })
        }
        setFiles((pending) =>
          pending.filter(
            (candidate) =>
              !(
                candidate.name === file.name &&
                candidate.size === file.size &&
                candidate.lastModified === file.lastModified
              ),
          ),
        )
      }
      setFiles([])
      setFileInputKey((key) => key + 1)
      setChangeOpen(false)
      if (exerciseId) {
        await associations.refetch()
        notifications.success(
          files.length > 1 ? 'Đã thêm các tệp vào bài tập.' : 'Đã thêm tệp vào bài tập.',
        )
      } else {
        await queryClient.invalidateQueries({ queryKey: ['admin', 'media'] })
        notifications.success('Đã thêm tệp vào thư viện.')
      }
    } catch {
      if (exerciseId) await associations.refetch()
      await queryClient.invalidateQueries({ queryKey: ['admin', 'media'] })
      setFileError(
        new Error(
          'Một số tệp chưa được thêm. Các tệp đã gắn thành công vẫn được giữ lại; bạn có thể thử thêm lại phần còn thiếu.',
        ),
      )
    } finally {
      setProgress(null)
      setUploadingFile('')
    }
  }

  const previewView: MediaViewModel | null = preview
    ? {
        id: preview.access.assetId,
        title: preview.title,
        mediaType: preview.access.mediaType,
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
        description="Thêm nhiều PDF, âm thanh hoặc tệp đáp án cho bài tập này."
        className="min-w-0"
      >
        {exercises.length > 1 && (
          <AdminSelect
            label="Bài tập"
            value={selectedExercise?.id ?? ''}
            onChange={selectExercise}
            options={exercises.map((exercise) => ({ value: exercise.id, label: exercise.title }))}
          />
        )}
        {selectedExercise ? (
          <section aria-label="Danh sách tệp đính kèm" className="grid gap-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="font-semibold">{selectedExercise.title}</h3>
                <p className="mt-1 text-sm text-ink-secondary">
                  {linkedAssets.length} {linkedAssets.length === 1 ? 'tệp đã gắn' : 'tệp đã gắn'}
                </p>
              </div>
              <Button
                type="button"
                onClick={() => {
                  setFileError(undefined)
                  setFiles([])
                  setRole('QUESTION_PDF')
                  setMode('upload')
                  setSearch('')
                  setPage(1)
                  setChangeOpen(true)
                }}
                startIcon={<FileUp aria-hidden="true" className="size-4" />}
              >
                Thêm tệp
              </Button>
            </div>
            {associations.isPending ? (
              <AdminLoading label="Đang tải tệp đính kèm" />
            ) : associations.isError ? (
              <AdminLoadError
                error={associations.error}
                retry={() => void associations.refetch()}
              />
            ) : linkedAssets.length ? (
              <div className="grid gap-2">
                {linkedAssets.map((asset) => (
                  <div
                    key={`${asset.assetId}-${asset.assetRole}`}
                    className="flex min-w-0 flex-wrap items-center justify-between gap-3 rounded-xl border border-border-subtle bg-white p-3"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-surface-blue text-action-primary">
                        {mediaIcon(asset.media.mediaType)}
                      </span>
                      <span className="min-w-0">
                        <strong className="block truncate text-sm">
                          {asset.title || asset.media.originalName}
                        </strong>
                        <span className="text-xs text-ink-secondary">
                          {roleLabel(asset.assetRole)} · {mediaTypeLabel(asset.media.mediaType)} ·{' '}
                          {(asset.media.fileSize / 1024 / 1024).toFixed(2)} MB
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
                <p className="font-semibold">Chưa có tệp đính kèm</p>
                <p className="mt-1 text-sm text-ink-secondary">
                  Thêm một hoặc nhiều tệp để học viên xem cùng bài tập.
                </p>
              </div>
            )}
          </section>
        ) : (
          <EmptyState
            title="Chưa có bài tập"
            description="Tạo bài tập trước để thêm tệp đính kèm."
          />
        )}
      </AdminCard>

      <BaseDialog
        open={changeOpen}
        onOpenChange={(open) => {
          if (progress !== null) return
          setChangeOpen(open)
        }}
        title="Thêm tệp cho bài tập"
        description="Tải lên hoặc chọn các tệp muốn gắn. Tệp đang có sẽ không bị thay thế."
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
                type="button"
                loading={progress !== null || linkAsset.isPending}
                disabled={
                  !files.length ||
                  progress !== null ||
                  linkAsset.isPending ||
                  capabilities.isPending ||
                  !capabilities.data?.activeProvider ||
                  !capabilities.data.supportedMediaTypes.includes(selectedRoleType)
                }
                onClick={() => void uploadAndAttach()}
                startIcon={<FileUp aria-hidden="true" className="size-4" />}
              >
                {selectedExercise
                  ? `Tải lên và gắn ${files.length || ''} tệp`
                  : `Tải ${files.length || ''} tệp vào thư viện`}
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

          <AdminSelect
            label="Loại tệp"
            value={role}
            onChange={(value) => {
              setRole(value as ExerciseMediaRole)
              setAssetFolder('')
              setFiles([])
              setFileInputKey((key) => key + 1)
              setPage(1)
              setFileError(undefined)
            }}
            disabled={progress !== null}
            options={Object.entries(roleDetails)
              .filter(([entryRole]) => {
                const type = roleMediaType(entryRole as ExerciseMediaRole)
                return (
                  capabilities.data?.supportedMediaTypes.includes(type) ||
                  (mode === 'library' && Boolean(capabilities.data?.activeProvider))
                )
              })
              .map(([value, detail]) => ({ value, label: detail.label }))}
          />

          {mode === 'upload' ? (
            <section className="grid gap-3">
              {capabilities.data?.activeProvider === 'CLOUDINARY' && folders.length > 0 && (
                <AdminSelect
                  label="Nơi lưu"
                  value={selectedFolder}
                  onChange={(folder) => {
                    setAssetFolder(folder)
                  }}
                  disabled={progress !== null}
                  options={folders.map((folder) => ({
                    value: folder,
                    label: folderOptionLabel(folder, folders, selectedRoleType),
                  }))}
                />
              )}
              {capabilities.data &&
              !capabilities.data.supportedMediaTypes.includes(selectedRoleType) ? (
                <p className="rounded-xl bg-surface-muted p-3 text-sm text-ink-secondary">
                  Hiện chưa thể tải loại tệp này lên. Bạn có thể chọn tệp có sẵn trong thư viện.
                </p>
              ) : (
                <label className="flex cursor-pointer items-center gap-3 rounded-2xl border border-dashed border-border-subtle bg-white p-4 transition-colors hover:border-action-primary hover:bg-surface-muted focus-within:ring-2 focus-within:ring-action-primary">
                  <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-surface-blue text-action-primary">
                    <FolderOpen aria-hidden="true" className="size-5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-semibold text-ink-primary">
                      {files.length ? `${files.length} tệp đã chọn` : 'Chọn một hoặc nhiều tệp'}
                    </span>
                    <span className="mt-1 block text-xs font-normal text-ink-secondary">
                      {selectedRoleType === 'PDF'
                        ? 'PDF tối đa 40 MB mỗi tệp'
                        : 'Âm thanh tối đa 50 MB mỗi tệp'}
                    </span>
                  </span>
                  <span className="shrink-0 rounded-lg border border-border-subtle px-3 py-2 text-sm font-semibold">
                    Chọn tệp
                  </span>
                  <input
                    key={fileInputKey}
                    aria-label="Tệp tải lên"
                    className="sr-only"
                    type="file"
                    multiple
                    accept={mediaAccept(selectedRoleType)}
                    disabled={progress !== null || capabilities.isPending}
                    onChange={(event) => {
                      const chosen = Array.from(event.target.files ?? [])
                      const invalid = chosen.find((file) =>
                        validateAdminMediaFile(file, selectedRoleType),
                      )
                      if (invalid) {
                        setFileError(
                          new Error(
                            validateAdminMediaFile(invalid, selectedRoleType) ??
                              'Kiểm tra lại tệp.',
                          ),
                        )
                        return
                      }
                      setFiles((previous) => {
                        const known = new Set(
                          previous.map((file) => `${file.name}:${file.size}:${file.lastModified}`),
                        )
                        return previous.concat(
                          chosen.filter((file) => {
                            const key = `${file.name}:${file.size}:${file.lastModified}`
                            if (known.has(key)) return false
                            known.add(key)
                            return true
                          }),
                        )
                      })
                      setFileError(undefined)
                    }}
                  />
                </label>
              )}
              {files.length > 0 && (
                <ul className="grid gap-2">
                  {files.map((file, index) => (
                    <li
                      key={`${file.name}-${file.size}-${file.lastModified}`}
                      className="flex items-center justify-between gap-3 rounded-xl border border-border-subtle bg-white p-3 text-sm"
                    >
                      <span className="min-w-0 truncate">{file.name}</span>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          setFiles((previous) => previous.filter((_, i) => i !== index))
                        }
                      >
                        Bỏ
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
              {uploadingFile && progress !== null && (
                <div className="text-sm" role="status">
                  <p>
                    Đang tải {uploadingFile} · {progress}%
                  </p>
                  <progress className="mt-2 block w-full" value={progress} max={100} />
                </div>
              )}
              {fileError && (
                <p
                  role="alert"
                  className="rounded-xl bg-danger-surface p-3 text-sm text-danger-foreground"
                >
                  {fileError.message}
                </p>
              )}
            </section>
          ) : (
            <section aria-label="Chọn tệp từ thư viện" className="grid gap-3">
              <label className="relative grid gap-1.5 text-sm font-semibold text-ink-primary">
                <span>Tìm tệp theo tên</span>
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
                  placeholder="Nhập tên tệp"
                />
              </label>
              {media.isPending ? (
                <AdminLoading label="Đang tìm tệp trong thư viện" />
              ) : media.isError ? (
                <AdminLoadError error={media.error} retry={() => void media.refetch()} />
              ) : media.data?.items.length ? (
                <div className="grid max-h-72 gap-2 overflow-y-auto pr-1">
                  {media.data.items.map((asset) => {
                    const linked = linkedAssets.some(
                      (item) => item.assetId === asset.id && item.assetRole === role,
                    )
                    return (
                      <div
                        key={asset.id}
                        className="flex min-w-0 flex-wrap items-center justify-between gap-3 rounded-xl border border-border-subtle bg-white p-3"
                      >
                        <span className="flex min-w-0 items-center gap-3">
                          {mediaIcon(asset.mediaType)}
                          <span className="min-w-0">
                            <strong className="block truncate text-sm">{asset.originalName}</strong>
                            <span className="text-xs text-ink-secondary">
                              {mediaTypeLabel(asset.mediaType)} ·{' '}
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
                              linkAsset.isPending && linkAsset.variables?.asset.id === asset.id
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
                  title="Chưa có tệp phù hợp"
                  description="Thư viện chưa có tệp loại này."
                />
              )}
              {media.data && media.data.total > media.data.pageSize && (
                <Pagination
                  page={media.data.page}
                  pages={Math.ceil(media.data.total / media.data.pageSize)}
                  onPageChange={setPage}
                />
              )}
              {fileError && (
                <p
                  role="alert"
                  className="rounded-xl bg-danger-surface p-3 text-sm text-danger-foreground"
                >
                  {fileError.message}
                </p>
              )}
            </section>
          )}
        </div>
      </BaseDialog>

      <BaseDialog
        open={preview !== null}
        onOpenChange={(open) => !open && setPreview(null)}
        title="Xem trước tệp"
        size="wide"
      >
        {preview && previewView && (
          <div className="grid gap-3">
            <p className="break-all text-sm font-semibold text-ink-primary">{preview.title}</p>
            {previewView.mediaType === 'PDF' ? (
              <PDFViewer media={previewView} />
            ) : previewView.mediaType === 'AUDIO' ? (
              <AudioPlayer media={previewView} />
            ) : previewView.mediaType === 'VIDEO' ? (
              <VideoPlayer media={previewView} />
            ) : (
              <img
                src={previewView.src}
                alt={preview.title}
                className="max-h-[70vh] rounded-xl object-contain"
              />
            )}
          </div>
        )}
      </BaseDialog>
    </>
  )
}

// Keep the previous name available while the admin routes transition to the broader manager.
export const AdminExercisePdfManager = AdminExerciseMediaManager
export const AdminExercisePdfPicker = AdminExerciseMediaPicker
export type ExercisePdfSelection = ExerciseMediaSelection
export const uploadAndAttachExercisePdf = uploadAndAttachExerciseMedia
