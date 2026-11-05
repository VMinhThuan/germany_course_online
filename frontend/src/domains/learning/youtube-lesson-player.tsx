import { useEffect, useRef, useState } from 'react'
import { ExternalLink, Play } from 'lucide-react'
import type { ApiLessonVideo } from '@/lib/api/types'

const YOUTUBE_VIDEO_ID = /^[A-Za-z0-9_-]{11}$/

export function YouTubeLessonPlayer({
  video,
  title,
}: {
  video: ApiLessonVideo | null
  title: string
}) {
  const [loaded, setLoaded] = useState(false)
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const videoId =
    video?.provider === 'YOUTUBE' && YOUTUBE_VIDEO_ID.test(video.videoId) ? video.videoId : null

  useEffect(() => {
    if (loaded) iframeRef.current?.focus()
  }, [loaded])

  if (!videoId) return null

  return (
    <figure className="grid min-w-0 gap-3">
      <div className="relative isolate aspect-video overflow-hidden rounded-2xl bg-ink-primary shadow-soft">
        {!loaded ? (
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
        ) : (
          <iframe
            ref={iframeRef}
            src={`https://www.youtube-nocookie.com/embed/${videoId}?rel=0`}
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
