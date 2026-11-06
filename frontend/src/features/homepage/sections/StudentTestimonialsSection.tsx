import { useCallback, useEffect, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight, Pause, Play, Star } from 'lucide-react'
import { Container } from '@/shared/ui'
import { BilingualSectionHeading } from '../components/BilingualSectionHeading'
import { homepageContent } from '../content/homepage-content'

const AUTOPLAY_INTERVAL_MS = 5000

export function StudentTestimonialsSection() {
  const { testimonials } = homepageContent
  const viewportRef = useRef<HTMLDivElement>(null)
  const [isPaused, setIsPaused] = useState(false)
  const [isHovered, setIsHovered] = useState(false)
  const [isFocused, setIsFocused] = useState(false)

  const scrollByCard = useCallback((direction: -1 | 1) => {
    const viewport = viewportRef.current
    const firstCard = viewport?.querySelector<HTMLElement>('[data-review-card]')
    if (!viewport || !firstCard) return

    const track = firstCard.parentElement
    const gap = track ? Number.parseFloat(window.getComputedStyle(track).columnGap) || 16 : 16
    const distance = firstCard.getBoundingClientRect().width + gap
    const maxScroll = viewport.scrollWidth - viewport.clientWidth
    const nextScroll = viewport.scrollLeft + distance * direction

    viewport.scrollTo({
      left: direction > 0 && nextScroll >= maxScroll - 2 ? 0 : Math.max(0, nextScroll),
      behavior: window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
        ? 'instant'
        : 'smooth',
    })
  }, [])

  useEffect(() => {
    if (isPaused || isHovered || isFocused) return
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return

    const interval = window.setInterval(() => scrollByCard(1), AUTOPLAY_INTERVAL_MS)
    return () => window.clearInterval(interval)
  }, [isFocused, isHovered, isPaused, scrollByCard])

  return (
    <section
      id="student-stories"
      aria-labelledby="student-stories-title"
      data-homepage-reveal
      className="homepage-section homepage-section--testimonials scroll-mt-24 py-14 sm:py-18 lg:py-20"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onFocus={() => setIsFocused(true)}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setIsFocused(false)
      }}
    >
      <Container>
        <header className="mx-auto mb-7 max-w-2xl text-center sm:mb-9">
          <BilingualSectionHeading
            id="student-stories-title"
            german={testimonials.eyebrow}
            title={testimonials.title}
          />
        </header>

        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <p className="inline-flex min-h-9 items-center rounded-full border border-ink-primary/10 bg-white/75 px-3.5 py-1.5 text-sm font-bold text-ink-secondary">
            Đánh giá minh họa · sẽ thay bằng chia sẻ đã xác nhận
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              aria-label={isPaused ? 'Tiếp tục tự chạy đánh giá' : 'Tạm dừng tự chạy đánh giá'}
              aria-pressed={isPaused}
              onClick={() => setIsPaused((paused) => !paused)}
              className="inline-flex size-10 items-center justify-center rounded-full border border-border-subtle bg-white text-ink-primary transition-colors hover:bg-brand-pink/50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-action-focus"
            >
              {isPaused ? (
                <Play aria-hidden="true" className="size-4 fill-current" />
              ) : (
                <Pause aria-hidden="true" className="size-4 fill-current" />
              )}
            </button>
            <button
              type="button"
              aria-label="Đánh giá trước"
              onClick={() => scrollByCard(-1)}
              className="inline-flex size-10 items-center justify-center rounded-full border border-border-subtle bg-white text-ink-primary transition-colors hover:bg-brand-pink/50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-action-focus"
            >
              <ChevronLeft aria-hidden="true" className="size-5" />
            </button>
            <button
              type="button"
              aria-label="Đánh giá tiếp theo"
              onClick={() => scrollByCard(1)}
              className="inline-flex size-10 items-center justify-center rounded-full border border-border-subtle bg-white text-ink-primary transition-colors hover:bg-brand-pink/50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-action-focus"
            >
              <ChevronRight aria-hidden="true" className="size-5" />
            </button>
          </div>
        </div>

        <div
          ref={viewportRef}
          role="region"
          aria-roledescription="carousel"
          aria-label="Các đánh giá minh họa của học viên"
          className="homepage-testimonials-viewport overflow-x-auto overflow-y-hidden py-2"
        >
          <div className="flex snap-x snap-mandatory gap-4">
            {testimonials.items.map((item) => (
              <article
                key={item.name}
                data-review-card
                className="homepage-testimonial-card flex min-h-56 shrink-0 snap-start basis-[calc(50%-0.5rem)] flex-col rounded-2xl border border-border-subtle bg-white/95 p-4 shadow-soft transition duration-300 ease-out hover:z-10 hover:-translate-y-1 hover:scale-[1.025] hover:border-action-primary/35 hover:shadow-raised focus-within:border-action-primary/35 md:basis-[calc(25%-0.75rem)] sm:p-5"
              >
                <div
                  role="img"
                  aria-label={`${item.rating} trên 5 sao`}
                  className="flex gap-0.5 text-amber-500"
                >
                  {Array.from({ length: 5 }, (_, index) => (
                    <Star
                      key={index}
                      aria-hidden="true"
                      className={`size-4 ${index < item.rating ? 'fill-current' : 'text-border-strong'}`}
                    />
                  ))}
                </div>
                <blockquote className="mt-4 flex-1 text-sm leading-6 text-ink-secondary sm:text-base">
                  “{item.review}”
                </blockquote>
                <p className="mt-5 border-t border-border-subtle pt-3 font-display text-sm font-extrabold text-ink-primary">
                  {item.name}
                </p>
              </article>
            ))}
          </div>
        </div>
      </Container>
    </section>
  )
}
