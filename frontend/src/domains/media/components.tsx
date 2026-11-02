import { ExternalLink, FileText, Headphones, Video } from 'lucide-react'
import { Card } from '@/shared/ui'
import { DomainState, safeMediaHref } from '@/domains/shared/presentation'
import type { MediaViewModel } from './models'

export function MediaLoadingState({
  label = 'Đang tải nội dung đa phương tiện',
}: {
  label?: string
}) {
  return <DomainState kind="loading" title={label} />
}

export function MediaErrorState({
  title = 'Không thể mở nội dung',
  message,
  onRetry,
}: {
  title?: string
  message: string
  onRetry?: () => void
}) {
  return (
    <DomainState kind="error" title={title} message={message}>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="mt-2 min-h-11 rounded-lg px-3 font-semibold text-action-primary underline-offset-4 hover:underline"
        >
          Thử lại
        </button>
      )}
    </DomainState>
  )
}

export function MediaUnavailableState({
  title = 'Nội dung chưa sẵn sàng',
  message = 'Hãy quay lại sau hoặc hỏi giáo viên về tài liệu này.',
}: {
  title?: string
  message?: string
}) {
  return <DomainState kind="empty" title={title} message={message} />
}

export function MediaFallbackLink({
  src,
  title,
  canDownload = false,
}: {
  src?: string
  title: string
  canDownload: boolean
}) {
  const href = safeMediaHref(src)
  if (!href)
    return <p className="text-sm text-ink-secondary">Không có liên kết tài liệu an toàn để mở.</p>
  const external = new URL(href).origin !== window.location.origin
  return (
    <a
      href={href}
      download={canDownload || undefined}
      target={external ? '_blank' : undefined}
      rel={external ? 'noopener noreferrer' : undefined}
      className="inline-flex min-h-11 items-center gap-2 rounded-lg px-2 font-semibold text-action-primary underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-action-focus"
    >
      <ExternalLink aria-hidden="true" className="size-4" />
      {canDownload ? `Tải ${title}` : `Mở ${title}`}
      {external && <span className="sr-only">(mở tab mới)</span>}
    </a>
  )
}

export function VideoPlayer({ media, className }: { media: MediaViewModel; className?: string }) {
  const src = safeMediaHref(media.src)
  if (media.availability === 'loading') return <MediaLoadingState />
  if (media.availability === 'error')
    return <MediaErrorState message={media.message ?? 'Đường dẫn video không hoạt động.'} />
  if (media.availability !== 'ready' || !src)
    return <MediaUnavailableState {...(media.message ? { message: media.message } : {})} />
  const captions = safeMediaHref(media.captionsSrc)
  return (
    <figure className={`grid min-w-0 gap-3 ${className ?? ''}`}>
      <div className="aspect-video overflow-hidden rounded-2xl bg-ink-primary">
        <video
          className="size-full"
          controls
          preload="metadata"
          playsInline
          aria-label={media.title}
        >
          <source src={src} type="video/mp4" />
          {captions && (
            <track kind="captions" src={captions} srcLang="de" label="Deutsch" default />
          )}
          Trình duyệt không hỗ trợ video.
        </video>
      </div>
      <figcaption className="text-sm font-medium text-ink-secondary">
        <Video aria-hidden="true" className="mr-2 inline size-4" />
        {media.title}
      </figcaption>
      {media.transcript && (
        <details className="rounded-xl bg-surface-muted p-3">
          <summary className="min-h-11 cursor-pointer py-2 font-semibold">Xem bản chép lời</summary>
          <p className="whitespace-pre-line text-sm leading-6 text-ink-secondary">
            {media.transcript}
          </p>
        </details>
      )}
    </figure>
  )
}

export function AudioPlayer({ media }: { media: MediaViewModel }) {
  const src = safeMediaHref(media.src)
  if (media.availability === 'loading') return <MediaLoadingState label="Đang tải âm thanh" />
  if (media.availability === 'error')
    return (
      <MediaErrorState
        title="Không thể phát âm thanh"
        message={media.message ?? 'Đường dẫn âm thanh không hoạt động.'}
      />
    )
  if (media.availability !== 'ready' || !src)
    return <MediaUnavailableState {...(media.message ? { message: media.message } : {})} />
  return (
    <Card className="grid gap-3 p-4">
      <div className="flex items-center gap-2 font-semibold">
        <Headphones aria-hidden="true" className="size-5 text-action-primary" />
        {media.title}
      </div>
      <audio controls preload="none" className="w-full" aria-label={media.title}>
        <source src={src} />
        Trình duyệt không hỗ trợ âm thanh.
      </audio>
      {media.transcript && (
        <details>
          <summary className="min-h-11 cursor-pointer py-2 text-sm font-semibold">
            Đọc bản chép lời
          </summary>
          <p className="whitespace-pre-line text-sm leading-6 text-ink-secondary">
            {media.transcript}
          </p>
        </details>
      )}
    </Card>
  )
}

export function PDFViewer({
  media,
  embeddedSupported = true,
}: {
  media: MediaViewModel
  embeddedSupported?: boolean
}) {
  const src = safeMediaHref(media.src)
  if (media.availability === 'loading') return <MediaLoadingState label="Đang tải tài liệu PDF" />
  if (media.availability === 'error')
    return (
      <MediaErrorState
        title="Không thể mở tài liệu"
        message={media.message ?? 'Đường dẫn PDF không hoạt động.'}
      />
    )
  if (media.availability !== 'ready' || !src)
    return <MediaUnavailableState {...(media.message ? { message: media.message } : {})} />
  return (
    <section aria-label={media.title} className="grid min-w-0 gap-3">
      <div className="flex items-center gap-2 font-semibold">
        <FileText aria-hidden="true" className="size-5 text-action-primary" />
        {media.title}
      </div>
      {embeddedSupported ? (
        <object
          data={src}
          type="application/pdf"
          aria-label={media.title}
          className="h-[min(72vh,52rem)] min-h-80 w-full rounded-xl border border-border-subtle bg-surface-muted"
        >
          <p className="p-4 text-sm text-ink-secondary">
            Trình duyệt này không hiển thị PDF nội tuyến.
          </p>
        </object>
      ) : (
        <Card className="grid min-h-48 place-items-center bg-surface-muted p-5 text-center">
          <p className="text-sm text-ink-secondary">
            PDF không được nhúng trong trình duyệt này. Mở bản thay thế để tiếp tục.
          </p>
        </Card>
      )}
      <MediaFallbackLink src={src} title={media.title} canDownload={media.canDownload} />
    </section>
  )
}
