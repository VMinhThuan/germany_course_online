import { CircleUserRound, Star } from 'lucide-react'
import { Container } from '@/shared/ui'
import { BilingualSectionHeading } from '../components/BilingualSectionHeading'
import { homepageContent } from '../content/homepage-content'

const avatarTones = [
  'bg-brand-pink/75 text-ink-primary',
  'bg-surface-blue text-action-primary',
  'bg-surface-lime text-ink-primary',
  'bg-info-surface text-info-foreground',
] as const

export function StudentTestimonialsSection() {
  const { testimonials } = homepageContent

  const renderReviews = (duplicate = false) =>
    testimonials.items.map((item, index) => (
      <article
        key={`${item.name}-${duplicate ? 'loop' : 'review'}`}
        className="homepage-testimonial-card flex min-h-56 shrink-0 flex-col rounded-2xl border border-border-subtle bg-white/95 p-4 shadow-soft transition duration-300 ease-out hover:z-10 hover:-translate-y-1 hover:scale-[1.025] hover:border-action-primary/35 hover:shadow-raised sm:p-5"
      >
        <div className="flex items-center gap-3">
          <span
            aria-hidden="true"
            className={`grid size-11 shrink-0 place-items-center rounded-full ${avatarTones[index % avatarTones.length]}`}
          >
            <CircleUserRound className="size-6" strokeWidth={1.8} />
          </span>
          <div className="min-w-0">
            <p className="truncate font-display text-sm font-extrabold text-ink-primary sm:text-base">
              {item.name}
            </p>
            <span
              title="Nội dung đánh giá mẫu, chưa phải nhận xét thật của học viên."
              className="mt-0.5 inline-flex rounded-full bg-surface-muted px-2 py-0.5 text-[0.65rem] font-bold uppercase tracking-[0.08em] text-ink-muted"
            >
              Nội dung mẫu
            </span>
          </div>
        </div>
        <div
          role="img"
          aria-label={`${item.rating} trên 5 sao`}
          className="mt-4 flex gap-0.5 text-amber-500"
        >
          {Array.from({ length: 5 }, (_, starIndex) => (
            <Star
              key={starIndex}
              aria-hidden="true"
              className={`size-4 ${starIndex < item.rating ? 'fill-current' : 'text-border-strong'}`}
            />
          ))}
        </div>
        <blockquote className="mt-3 flex-1 text-sm leading-6 text-ink-secondary sm:text-base">
          “{item.review}”
        </blockquote>
      </article>
    ))

  return (
    <section
      id="student-stories"
      aria-labelledby="student-stories-title"
      data-homepage-reveal
      className="homepage-section homepage-section--testimonials homepage-testimonials scroll-mt-24 py-14 sm:py-18 lg:py-20"
    >
      <Container>
        <header className="mx-auto mb-7 max-w-2xl text-center sm:mb-9">
          <BilingualSectionHeading
            id="student-stories-title"
            german={testimonials.eyebrow}
            title={testimonials.title}
          />
        </header>

        <div
          className="homepage-testimonials-viewport"
          role="region"
          aria-roledescription="carousel"
          aria-label="Chia sẻ về hành trình học tiếng Đức"
          tabIndex={0}
        >
          <div className="homepage-testimonials-track">
            <div className="homepage-testimonial-group">{renderReviews()}</div>
            <div className="homepage-testimonial-group" aria-hidden="true">
              {renderReviews(true)}
            </div>
          </div>
        </div>
      </Container>
    </section>
  )
}
