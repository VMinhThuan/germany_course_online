import { ExternalLink } from 'lucide-react'
import type { ApiLessonVideo } from '@/lib/api/types'

const YOUTUBE_VIDEO_ID = /^[A-Za-z0-9_-]{11}$/

const YOUTUBE_HOSTS = new Set([
  'youtu.be',
  'www.youtu.be',
  'youtube.com',
  'www.youtube.com',
  'm.youtube.com',
  'music.youtube.com',
  'youtube-nocookie.com',
  'www.youtube-nocookie.com',
])

export function parseYouTubeVideoId(input: string): string | null {
  const value = input.trim()
  if (YOUTUBE_VIDEO_ID.test(value)) return value
  if (!value) return null

  let url: URL
  try {
    url = new URL(/^[a-z][a-z\d+.-]*:\/\//i.test(value) ? value : `https://${value}`)
  } catch {
    return null
  }
  if (!YOUTUBE_HOSTS.has(url.hostname.toLowerCase())) return null

  const segments = url.pathname.split('/').filter(Boolean)
  const candidate = url.hostname.toLowerCase().endsWith('youtu.be')
    ? segments[0]
    : url.pathname === '/watch'
      ? url.searchParams.get('v')
      : ['embed', 'shorts', 'live', 'v'].includes(segments[0] ?? '')
        ? segments[1]
        : null
  return candidate && YOUTUBE_VIDEO_ID.test(candidate) ? candidate : null
}

export function YouTubeLessonPlayer({
  video,
  title,
  eager = false,
}: {
  video: ApiLessonVideo | null
  title: string
  eager?: boolean
}) {
  const videoId =
    video?.provider === 'YOUTUBE' && YOUTUBE_VIDEO_ID.test(video.videoId) ? video.videoId : null

  if (!videoId) return null

  return (
    <figure className="grid min-w-0 gap-3">
      <div className="relative isolate aspect-video overflow-hidden rounded-2xl bg-ink-primary shadow-soft">
        <iframe
          src={`https://www.youtube-nocookie.com/embed/${videoId}?rel=0`}
          title={title}
          loading={eager ? 'eager' : 'lazy'}
          referrerPolicy="strict-origin-when-cross-origin"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          tabIndex={0}
          className="absolute inset-0 size-full border-0"
        />
      </div>
      <figcaption className="flex flex-wrap items-center justify-between gap-3 text-sm text-ink-secondary">
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
