import { BookOpen, ChartNoAxesColumnIncreasing, LaptopMinimal, PencilLine } from 'lucide-react'
import { Container } from '@/shared/ui'
import { BilingualSectionHeading } from '../components/BilingualSectionHeading'
import { homepageContent } from '../content/homepage-content'

export function LearningBenefitsSection() {
  const { benefits } = homepageContent

  return (
    <section
      id="learning-benefits"
      aria-labelledby="learning-benefits-title"
      data-homepage-reveal
      className="homepage-section homepage-section--benefits py-14 sm:py-18 lg:py-20"
    >
      <Container>
        <header className="mb-8 sm:mb-10">
          <BilingualSectionHeading
            id="learning-benefits-title"
            german={benefits.eyebrow}
            title={benefits.title}
            className="max-w-2xl"
          />
        </header>
        <ul className="mx-auto grid max-w-5xl gap-px overflow-hidden rounded-2xl border border-border-subtle bg-border-subtle sm:grid-cols-2">
          {benefits.items.map((item, index) => {
            const Icon = [BookOpen, PencilLine, ChartNoAxesColumnIncreasing, LaptopMinimal][index]
            return (
              <li
                key={item.title}
                className={`bg-card-surface p-5 sm:p-7 ${index === 0 ? 'sm:bg-surface-blue/55' : ''} ${index === 2 ? 'bg-brand-pink/40' : ''} ${index === 3 ? 'sm:bg-surface-lime/40' : ''}`}
              >
                <span className="mb-4 grid size-11 place-items-center rounded-2xl bg-card-surface text-action-primary shadow-soft">
                  {Icon && <Icon aria-hidden="true" className="size-5" />}
                </span>
                <h3 className="font-display text-lg font-extrabold text-ink-primary sm:text-xl">
                  {item.title}
                </h3>
                <p className="mt-2 max-w-md leading-6 text-ink-secondary">{item.description}</p>
              </li>
            )
          })}
        </ul>
      </Container>
    </section>
  )
}
