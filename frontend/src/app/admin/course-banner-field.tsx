import { useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ImagePlus, Image as ImageIcon, RotateCcw, X } from 'lucide-react'
import { adminRepository } from '@/data/api/admin-repository'
import { Button } from '@/shared/ui'
import { AdminLoading } from './shared'
import { mediaAccept, uploadAdminMedia, validateAdminMediaFile } from './media-upload'

const BANNER_ACCEPT = mediaAccept('IMAGE')

export function CourseBannerField({
  assetId,
  file,
  onFileChange,
  onRemoveCurrent,
  disabled = false,
}: {
  assetId: string | null | undefined
  file: File | null
  onFileChange: (file: File | null) => void
  onRemoveCurrent?: () => void
  disabled?: boolean
}) {
  const [error, setError] = useState('')
  const capabilities = useQuery({
    queryKey: ['admin', 'media-capabilities'],
    queryFn: () => adminRepository.getMediaCapabilities(),
    retry: false,
  })
  const currentPreview = useQuery({
    queryKey: ['admin', 'media-preview', assetId],
    queryFn: () => adminRepository.createMediaPreviewAccess(assetId!),
    enabled: Boolean(assetId) && !file,
    retry: false,
  })
  const localPreviewUrl = useMemo(() => (file ? URL.createObjectURL(file) : null), [file])
  const [localPreviewError, setLocalPreviewError] = useState(false)

  useEffect(() => {
    return () => {
      if (localPreviewUrl) URL.revokeObjectURL(localPreviewUrl)
    }
  }, [localPreviewUrl])

  const imageUrl = file ? (localPreviewError ? null : localPreviewUrl) : currentPreview.data?.url

  return (
    <section className="grid gap-3 rounded-2xl border border-border-subtle bg-surface-muted p-4">
      <div>
        <h3 className="font-semibold text-ink-primary">Ảnh bìa khóa học</h3>
        <p className="mt-1 text-sm leading-6 text-ink-secondary">
          Chọn ảnh JPG, PNG hoặc WebP, dung lượng tối đa 20 MB.
        </p>
      </div>

      {imageUrl ? (
        <img
          src={imageUrl}
          alt={file ? `Xem trước ảnh ${file.name}` : 'Ảnh bìa khóa học hiện tại'}
          className="max-h-64 w-full rounded-xl border border-border-subtle bg-white object-cover"
          onError={() => file && setLocalPreviewError(true)}
        />
      ) : assetId && currentPreview.isPending && !file ? (
        <AdminLoading label="Đang tải ảnh bìa hiện tại" />
      ) : assetId && !file ? (
        <p className="rounded-xl border border-border-subtle bg-white p-3 text-sm text-ink-secondary">
          Chưa xem được ảnh bìa hiện tại. Bạn vẫn có thể chọn ảnh mới.
        </p>
      ) : (
        <div className="grid min-h-28 place-items-center rounded-xl border border-dashed border-border-subtle bg-white p-4 text-center">
          <span className="grid justify-items-center gap-2 text-sm text-ink-secondary">
            <ImageIcon aria-hidden="true" className="size-7 text-ink-muted" />
            Chưa chọn ảnh bìa
          </span>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <label className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-xl border border-border-subtle bg-white px-4 text-sm font-semibold text-ink-primary transition-colors hover:border-action-primary hover:text-action-primary focus-within:ring-2 focus-within:ring-action-primary">
          <ImagePlus aria-hidden="true" className="size-4" />
          {assetId ? 'Chọn ảnh khác' : 'Chọn ảnh từ máy'}
          <input
            className="sr-only"
            type="file"
            accept={BANNER_ACCEPT}
            disabled={disabled}
            aria-label="Ảnh bìa khóa học"
            onChange={(event) => {
              const selected = event.target.files?.[0] ?? null
              if (!selected) return
              const validation = validateAdminMediaFile(selected, 'IMAGE')
              if (validation) {
                setError(validation)
                event.currentTarget.value = ''
                return
              }
              setError('')
              setLocalPreviewError(false)
              onFileChange(selected)
            }}
          />
        </label>

        {file && (
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={disabled}
            onClick={() => {
              onFileChange(null)
              setError('')
            }}
            startIcon={<RotateCcw aria-hidden="true" className="size-4" />}
          >
            Dùng lại ảnh hiện tại
          </Button>
        )}

        {assetId && onRemoveCurrent && !file && (
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={disabled}
            onClick={onRemoveCurrent}
            startIcon={<X aria-hidden="true" className="size-4" />}
          >
            Gỡ ảnh bìa
          </Button>
        )}
      </div>

      {file && (
        <p className="break-all text-sm text-ink-secondary">
          Ảnh mới: <strong className="text-ink-primary">{file.name}</strong> ·{' '}
          {(file.size / 1024 / 1024).toFixed(2)} MB
        </p>
      )}
      {capabilities.isError && (
        <p role="status" className="text-sm text-warning-foreground">
          Chưa kiểm tra được khả năng tải ảnh. Thử tải lại trang rồi chọn ảnh.
        </p>
      )}
      {capabilities.data && !capabilities.data.supportedMediaTypes.includes('IMAGE') && (
        <p role="status" className="text-sm text-warning-foreground">
          Hiện chưa thể tải ảnh bìa lên. Hãy thử lại sau.
        </p>
      )}
      {error && (
        <p role="alert" className="rounded-xl bg-danger-surface p-3 text-sm text-danger-foreground">
          {error}
        </p>
      )}
    </section>
  )
}

export async function uploadCourseBanner(file: File, onProgress: (progress: number) => void) {
  return uploadAdminMedia(file, 'IMAGE', 'PUBLIC', {
    preferredFolderEnding: 'course-banner',
    onProgress,
  })
}
