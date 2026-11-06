import { useEffect, useRef } from 'react'
import { cn } from '@/shared/ui/cn'

export function HomepageVideoPlayer({
  url,
  title,
  className,
}: {
  url: string | null
  title: string
  className?: string
}) {
  const videoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    const video = videoRef.current
    if (!url || !video || !('IntersectionObserver' in window)) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting && entry.intersectionRatio >= 0.35) {
          void video.play().catch(() => undefined)
        } else {
          video.pause()
        }
      },
      { threshold: 0.35 },
    )
    observer.observe(video)

    return () => {
      observer.disconnect()
      video.pause()
    }
  }, [url])

  if (!url) {
    return (
      <div
        role="group"
        aria-label={title}
        className={cn(
          'homepage-video-embed grid place-items-center rounded-[1.35rem] bg-ink-primary px-5 text-center text-sm font-semibold text-white',
          className,
        )}
      >
        Video giới thiệu hiện chưa sẵn sàng.
      </div>
    )
  }

  return (
    <figure className={cn('min-w-0', className)}>
      <div className="homepage-video-embed relative isolate overflow-hidden rounded-[1.35rem] bg-ink-primary shadow-soft">
        <video
          ref={videoRef}
          aria-label={title}
          controls
          muted
          playsInline
          preload="metadata"
          className="absolute inset-0 size-full bg-ink-primary object-contain"
        >
          <source src={url} />
          Trình duyệt của bạn không hỗ trợ định dạng video này.
        </video>
      </div>
    </figure>
  )
}
