import { Container } from '@/shared/ui'
import { BilingualSectionHeading } from '../components/BilingualSectionHeading'
import { homepageContent } from '../content/homepage-content'

export function CourseIntroduction() {
  const { courseIntro } = homepageContent

  return (
    <section
      id="course-intro"
      aria-labelledby="course-intro-title"
      className="scroll-mt-24 bg-surface-pink py-14 sm:py-18 lg:py-20"
    >
      <Container>
        <BilingualSectionHeading
          id="course-intro-title"
          title={courseIntro.title}
          german={courseIntro.german}
          description={courseIntro.description}
          className="max-w-3xl"
        />
      </Container>
    </section>
  )
}
