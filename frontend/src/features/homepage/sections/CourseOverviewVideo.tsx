import { Container } from '@/shared/ui'
import { YouTubeEmbed } from '../components/YouTubeEmbed'
import { homepageContent } from '../content/homepage-content'

export function CourseOverviewVideo() {
  const { courseOverview } = homepageContent

  return (
    <section
      id="course-overview"
      aria-labelledby="course-overview-title"
      className="bg-surface-blue/35 py-14 sm:py-18 lg:py-20"
    >
      <Container>
        <header className="mx-auto mb-7 max-w-2xl text-center sm:mb-9">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-action-primary">
            Giới thiệu khóa học
          </p>
          <h2
            id="course-overview-title"
            className="mt-3 font-display text-3xl font-extrabold tracking-tight text-ink-primary sm:text-4xl"
          >
            {courseOverview.title}
          </h2>
          <p className="mt-3 text-base leading-7 text-ink-secondary">
            {courseOverview.description}
          </p>
        </header>
        <YouTubeEmbed
          url={courseOverview.videoUrl}
          title={courseOverview.videoTitle}
          poster={courseOverview.poster}
          className="mx-auto max-w-4xl"
        />
      </Container>
    </section>
  )
}
