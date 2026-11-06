import { Container } from '@/shared/ui'
import { BilingualSectionHeading } from '../components/BilingualSectionHeading'
import { YouTubeEmbed } from '../components/YouTubeEmbed'
import { homepageContent } from '../content/homepage-content'

export function CourseOverviewVideo() {
  const { courseOverview } = homepageContent

  return (
    <section
      id="course-overview"
      aria-labelledby="course-overview-title"
      data-homepage-reveal
      className="homepage-section homepage-section--overview py-14 sm:py-18 lg:py-20"
    >
      <Container>
        <header className="mx-auto mb-7 max-w-2xl text-center sm:mb-9">
          <BilingualSectionHeading
            id="course-overview-title"
            title={courseOverview.title}
            german={courseOverview.eyebrow}
          />
        </header>
        <YouTubeEmbed
          url={courseOverview.videoUrl}
          title={courseOverview.videoTitle}
          className="mx-auto max-w-4xl"
        />
      </Container>
    </section>
  )
}
