import { ArrowRight, Play } from 'lucide-react'
import { Container, LinkButton } from '@/shared/ui'
import { homepageContent } from '../content/homepage-content'

export function LearningIntroSection() {
  const { learningIntro } = homepageContent

  return (
    <section
      id="learning-preview"
      aria-labelledby="learning-preview-title"
      className="bg-surface-blue/55 py-16 sm:py-20 lg:py-24"
    >
      <Container>
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-xs font-bold uppercase tracking-[0.17em] text-action-primary">
            {learningIntro.eyebrow}
          </p>
          <h2
            id="learning-preview-title"
            className="mt-3 font-display text-2xl font-extrabold tracking-tight text-ink-primary sm:text-4xl"
          >
            {learningIntro.title}
          </h2>
          <p className="mx-auto mt-4 max-w-xl leading-7 text-ink-secondary">
            {learningIntro.description}
          </p>
        </div>

        <figure className="mx-auto mt-9 max-w-5xl">
          <div className="relative overflow-hidden rounded-2xl border border-white bg-card-surface p-1.5 shadow-raised sm:rounded-[1.6rem] sm:p-2">
            <img
              src={learningIntro.image}
              alt={learningIntro.imageAlt}
              width="1440"
              height="860"
              loading="lazy"
              className="aspect-[1.58] w-full rounded-xl object-cover object-top sm:aspect-[1.65] sm:rounded-[1.2rem]"
            />
            <span className="absolute bottom-4 left-4 inline-flex items-center gap-2 rounded-full bg-card-surface/95 px-3 py-2 text-xs font-bold text-ink-primary shadow-soft sm:bottom-6 sm:left-6 sm:text-sm">
              <span className="grid size-7 place-items-center rounded-full bg-action-primary text-white">
                <Play aria-hidden="true" className="size-3 fill-current" />
              </span>
              Bài học mẫu · Guten Tag!
            </span>
          </div>
          <figcaption className="mt-3 text-center text-sm text-ink-muted">
            {learningIntro.caption}
          </figcaption>
        </figure>

        <div className="mt-6 flex justify-center">
          <LinkButton
            to="/courses/tieng-duc-a1-1/preview"
            variant="outline"
            endIcon={<ArrowRight aria-hidden="true" />}
          >
            Tự mình mở bài học thử
          </LinkButton>
        </div>
      </Container>
    </section>
  )
}
