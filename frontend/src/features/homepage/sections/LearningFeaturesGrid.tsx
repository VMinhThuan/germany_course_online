import { Container } from '@/shared/ui'
import { BilingualSectionHeading } from '../components/BilingualSectionHeading'
import { PhotographicFeatureTile } from '../components/PhotographicFeatureTile'
import { homepageContent } from '../content/homepage-content'

export function LearningFeaturesGrid() {
  const { features } = homepageContent

  return (
    <section
      id="learning-features"
      aria-labelledby="learning-features-title"
      data-homepage-reveal
      className="homepage-section homepage-section--features py-14 sm:py-18 lg:py-20"
    >
      <Container>
        <BilingualSectionHeading
          id="learning-features-title"
          german={features.eyebrow}
          title={features.title}
          className="mb-7 max-w-2xl sm:mb-9"
        />
        <div className="mx-auto grid max-w-6xl gap-4 sm:grid-cols-2 sm:gap-5">
          {features.items.map((feature) => (
            <PhotographicFeatureTile key={feature.title} {...feature} />
          ))}
        </div>
      </Container>
    </section>
  )
}
