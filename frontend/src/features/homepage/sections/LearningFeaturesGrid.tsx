import { Container } from '@/shared/ui'
import { PhotographicFeatureTile } from '../components/PhotographicFeatureTile'
import { homepageContent } from '../content/homepage-content'

export function LearningFeaturesGrid() {
  const { features } = homepageContent

  return (
    <section
      id="learning-features"
      aria-labelledby="learning-features-title"
      className="bg-card-surface py-14 sm:py-18 lg:py-20"
    >
      <Container>
        <h2
          id="learning-features-title"
          className="mx-auto mb-7 max-w-2xl text-center font-display text-3xl font-extrabold tracking-tight text-ink-primary sm:mb-9 sm:text-4xl"
        >
          {features.title}
        </h2>
        <div className="mx-auto grid max-w-6xl gap-4 sm:grid-cols-2 sm:gap-5">
          {features.items.map((feature) => (
            <PhotographicFeatureTile key={feature.title} {...feature} />
          ))}
        </div>
      </Container>
    </section>
  )
}
