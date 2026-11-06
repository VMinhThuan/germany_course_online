import { Container } from '@/shared/ui'
import { homepageContent } from '../content/homepage-content'

export function LearningBenefitsSection() {
  const { benefits } = homepageContent

  return (
    <section
      id="learning-benefits"
      aria-labelledby="learning-benefits-title"
      className="bg-card-surface py-14 sm:py-18 lg:py-20"
    >
      <Container>
        <header className="mx-auto mb-8 max-w-2xl text-center sm:mb-10">
          <p
            lang="de"
            className="text-sm font-bold uppercase tracking-[0.14em] text-action-primary"
          >
            {benefits.eyebrow}
          </p>
          <h2
            id="learning-benefits-title"
            className="mt-3 font-display text-3xl font-extrabold tracking-tight text-ink-primary sm:text-4xl"
          >
            {benefits.title}
          </h2>
        </header>
        <ul className="mx-auto grid max-w-5xl gap-px overflow-hidden rounded-2xl border border-border-subtle bg-border-subtle sm:grid-cols-2">
          {benefits.items.map((item, index) => (
            <li
              key={item.title}
              className={`bg-card-surface p-5 sm:p-7 ${index === 0 ? 'sm:bg-surface-blue/55' : ''} ${index === 2 ? 'bg-surface-pink' : ''} ${index === 3 ? 'sm:bg-surface-lime/40' : ''}`}
            >
              <span
                aria-hidden="true"
                className="mb-4 block h-1 w-10 rounded-full bg-action-primary"
              />
              <h3 className="font-display text-lg font-extrabold text-ink-primary sm:text-xl">
                {item.title}
              </h3>
              <p className="mt-2 max-w-md leading-6 text-ink-secondary">{item.description}</p>
            </li>
          ))}
        </ul>
      </Container>
    </section>
  )
}
