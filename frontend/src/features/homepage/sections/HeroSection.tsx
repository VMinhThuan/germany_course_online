import { ArrowDown, ArrowRight, BookOpenText } from 'lucide-react'
import { LinkButton } from '@/shared/ui'
import { homepageContent } from '../content/homepage-content'

export function HeroSection() {
  const { hero } = homepageContent

  return (
    <section
      id="hero"
      aria-labelledby="homepage-hero-title"
      className="homepage-hero relative overflow-hidden bg-surface-blue"
    >
      <div className="homepage-hero__shape" aria-hidden="true" />
      <div className="relative mx-auto grid w-full max-w-7xl items-center gap-10 px-4 py-12 sm:px-6 sm:py-16 md:grid-cols-[minmax(0,0.95fr)_minmax(22rem,1.05fr)] md:gap-8 md:py-20 lg:px-8 lg:py-24">
        <div className="relative z-10 max-w-2xl">
          <p className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/80 bg-card-surface/75 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.16em] text-action-primary shadow-soft">
            <span className="size-2 rounded-full bg-brand-lime" aria-hidden="true" />
            {hero.eyebrow}
          </p>
          <h1
            id="homepage-hero-title"
            className="max-w-[13ch] font-display text-[2.6rem] font-extrabold leading-[1.08] tracking-[-0.045em] text-ink-primary sm:text-5xl lg:text-[3.75rem]"
          >
            {hero.title}
          </h1>
          <p className="mt-5 max-w-xl text-lg leading-7 text-ink-secondary sm:text-xl sm:leading-8">
            {hero.description}
          </p>
          <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <LinkButton
              to="/courses/tieng-duc-a1-1/preview"
              size="lg"
              endIcon={<ArrowRight aria-hidden="true" />}
              className="w-full shadow-soft sm:w-auto"
            >
              Học thử miễn phí
            </LinkButton>
            <LinkButton
              to="/courses/tieng-duc-a1-1"
              variant="outline"
              size="lg"
              className="w-full border-action-primary/25 bg-card-surface/85 sm:w-auto"
            >
              Khám phá khóa A1.1
            </LinkButton>
          </div>
          <p className="mt-5 flex items-center gap-2 text-sm font-semibold text-ink-secondary">
            <BookOpenText aria-hidden="true" className="size-4 text-action-primary" />
            {hero.note}
          </p>
        </div>

        <div className="homepage-hero-art relative mx-auto w-full max-w-[39rem] md:ml-auto">
          <div className="homepage-hero-art__backdrop" aria-hidden="true" />
          <div className="relative overflow-hidden rounded-[1.65rem] border-[0.45rem] border-white bg-card-surface shadow-raised sm:rounded-[2rem] sm:border-[0.65rem]">
            <img
              src="/demo-assets/a11-course-card.svg"
              alt="Minh họa bài học tiếng Đức A1.1 với cụm từ Guten Tag!"
              width="960"
              height="540"
              fetchPriority="high"
              className="aspect-[16/9] w-full object-cover"
            />
          </div>
          <div className="homepage-hero-float absolute -left-1 bottom-5 flex max-w-[13rem] items-center gap-3 rounded-2xl border border-border-subtle bg-card-surface p-3 shadow-raised sm:-left-4 sm:bottom-7 sm:p-4">
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-surface-lime text-action-primary">
              <BookOpenText aria-hidden="true" className="size-5" />
            </span>
            <span>
              <span className="block text-[0.68rem] font-bold uppercase tracking-[0.12em] text-ink-muted">
                Bài học mẫu
              </span>
              <span className="mt-0.5 block font-display font-extrabold text-ink-primary">
                Guten Tag!
              </span>
            </span>
          </div>
          <div className="homepage-hero-float absolute -right-1 top-5 rounded-xl bg-ink-primary px-4 py-2 text-sm font-bold text-white shadow-raised sm:-right-3 sm:top-8">
            Học thử · 3 chương
          </div>
          <a
            href="#quick-entry"
            className="absolute bottom-0 right-2 hidden items-center gap-2 text-sm font-bold text-action-primary underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-action-focus sm:inline-flex"
          >
            Khám phá lộ trình <ArrowDown aria-hidden="true" className="size-4" />
          </a>
        </div>
      </div>
    </section>
  )
}
