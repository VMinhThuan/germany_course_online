import { useEffect, useRef, useState } from 'react'
import { ExternalLink, Play } from 'lucide-react'
import { cn } from '@/shared/ui/cn'

const YOUTUBE_VIDEO_ID = /^[A-Za-z0-9_-]{11}$/
const YOUTUBE_HOSTS = new Set([
  'youtube.com',
  'www.youtube.com',
  'm.youtube.com',
  'youtube-nocookie.com',
  'www.youtube-nocookie.com',
  'youtu.be',
])

export function getYouTubeVideoId(url: string): string | null {
  try {
    const parsed = new URL(url)
    const host = parsed.hostname.toLowerCase()
    if (!['http:', 'https:'].includes(parsed.protocol) || !YOUTUBE_HOSTS.has(host)) return null

    const segments = parsed.pathname.split('/').filter(Boolean)
    const candidate =
      host === 'youtu.be'
        ? segments[0]
        : parsed.pathname === '/watch'
          ? parsed.searchParams.get('v')
          : ['embed', 'shorts', 'live'].includes(segments[0] ?? '')
            ? segments[1]
            : undefined

    return candidate && YOUTUBE_VIDEO_ID.test(candidate) ? candidate : null
  } catch {
    return null
  }
}

export function getYouTubeEmbedUrl(videoId: string): string | null {
  return YOUTUBE_VIDEO_ID.test(videoId)
    ? `https://www.youtube-nocookie.com/embed/${videoId}?rel=0`
    : null
}

export function YouTubeEmbed({
  url,
  title,
  poster,
  className,
}: {
  url: string
  title: string
  poster?: string
  className?: string
}) {
  const videoId = getYouTubeVideoId(url)
  const [loaded, setLoaded] = useState(false)
  const embedUrl = videoId ? getYouTubeEmbedUrl(videoId) : null
  const iframeRef = useRef<HTMLIFrameElement>(null)

  useEffect(() => {
    if (loaded) iframeRef.current?.focus()
  }, [loaded])

  if (!videoId || !embedUrl) {
    return (
      <div
        role="group"
        aria-label={title}
        className={cn('homepage-video-embed bg-surface-muted', className)}
      >
        <p className="px-5 text-center text-sm font-semibold text-ink-secondary">
          Video giới thiệu hiện chưa sẵn sàng.
        </p>
      </div>
    )
  }

  return (
    <figure className={cn('min-w-0', className)}>
      <div className="homepage-video-embed relative isolate overflow-hidden rounded-[1.35rem] bg-ink-primary shadow-soft">
        {!loaded ? (
          <>
            {poster ? (
              <img
                src={poster}
                alt=""
                width="1500"
                height="1000"
                loading="lazy"
                className="absolute inset-0 size-full object-cover"
              />
            ) : (
              <div aria-hidden="true" className="absolute inset-0 bg-ink-primary" />
            )}
            <div aria-hidden="true" className="absolute inset-0 bg-ink-primary/30" />
            <button
              type="button"
              aria-label={`Tải video: ${title}`}
              onClick={() => setLoaded(true)}
              className="absolute inset-0 z-10 grid size-full place-items-center text-white outline-none focus-visible:ring-4 focus-visible:ring-inset focus-visible:ring-brand-lime"
            >
              <span className="grid size-16 place-items-center rounded-full bg-action-primary shadow-raised transition-transform hover:scale-105 sm:size-20">
                <Play aria-hidden="true" className="ml-1 size-7 fill-current sm:size-8" />
              </span>
            </button>
          </>
        ) : (
          <iframe
            ref={iframeRef}
            src={embedUrl}
            title={title}
            loading="lazy"
            referrerPolicy="strict-origin-when-cross-origin"
            allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
            tabIndex={0}
            className="absolute inset-0 size-full border-0"
          />
        )}
      </div>
      <figcaption className="mt-3 flex flex-wrap items-center justify-between gap-3 text-sm text-ink-secondary">
        <span>{title}</span>
        <a
          href={`https://www.youtube.com/watch?v=${videoId}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-h-10 items-center gap-1.5 rounded-md font-semibold text-action-primary underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-action-focus"
        >
          Xem trên YouTube
          <ExternalLink aria-hidden="true" className="size-4" />
        </a>
      </figcaption>
    </figure>
  )
}
