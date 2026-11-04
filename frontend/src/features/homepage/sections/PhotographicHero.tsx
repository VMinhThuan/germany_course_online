import { ArrowRight } from 'lucide-react'
import { LinkButton } from '@/shared/ui'
import { BilingualSectionHeading } from '../components/BilingualSectionHeading'
import { homepageContent } from '../content/homepage-content'

export function PhotographicHero({
  title,
  description,
  imageUrl,
}: {
  title?: string
  description?: string
  imageUrl?: string | null
}) {
  const { hero } = homepageContent

  return (
    <section
      id="hero"
      aria-labelledby="homepage-hero-title"
      className="homepage-hero relative overflow-hidden bg-page-surface"
    >
      <div className="homepage-hero__shape" aria-hidden="true" />
      <div className="relative mx-auto grid w-full max-w-7xl items-center gap-8 px-4 py-10 sm:px-6 sm:py-14 md:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)] md:gap-8 md:py-16 lg:px-8 lg:py-20">
        <div className="relative z-10 max-w-2xl">
          <BilingualSectionHeading
            as="h1"
            align="left"
            id="homepage-hero-title"
            className="max-w-xl"
            title={title || hero.title}
            german={hero.german}
            description={description || hero.description}
          />
          <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <LinkButton
              to="/courses"
              size="lg"
              endIcon={<ArrowRight aria-hidden="true" />}
              className="w-full shadow-soft sm:w-auto"
            >
              Xem khóa học
            </LinkButton>
            <LinkButton
              to="/courses"
              variant="outline"
              size="lg"
              className="w-full border-action-primary/25 bg-card-surface/90 sm:w-auto"
            >
              Tìm lộ trình phù hợp
            </LinkButton>
          </div>
        </div>

        <figure className="homepage-hero__media relative mx-auto w-full max-w-[39rem] md:ml-auto">
          <img
            src={imageUrl || '/assets/homepage/paniverse-hero.webp'}
            alt="Người học đang xem bài học tiếng Đức và ghi chú tại bàn học."
            width="1500"
            height="1000"
            fetchPriority="high"
            className="homepage-hero__image size-full object-cover"
          />
        </figure>
      </div>
    </section>
  )
}
