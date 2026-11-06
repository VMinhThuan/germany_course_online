import { BriefcaseBusiness, GraduationCap, House } from 'lucide-react'
import { Container } from '@/shared/ui'
import { BilingualSectionHeading } from '../components/BilingualSectionHeading'
import { homepageContent } from '../content/homepage-content'

export function CourseIntroduction() {
  const { courseIntro } = homepageContent
  const opportunityIcons = [BriefcaseBusiness, GraduationCap, House] as const

  return (
    <section
      id="course-intro"
      aria-labelledby="course-intro-title"
      data-homepage-reveal
      className="homepage-section homepage-section--intro scroll-mt-24 py-14 sm:py-18 lg:py-20"
    >
      <Container className="grid items-center gap-8 lg:grid-cols-[0.95fr_1.05fr] lg:gap-12">
        <BilingualSectionHeading
          id="course-intro-title"
          title={courseIntro.title}
          german={courseIntro.german}
          align="left"
          className="max-w-2xl lg:pr-6"
        />
        <figure className="homepage-opportunities-visual relative isolate min-w-0 overflow-hidden rounded-[1.75rem] border border-white/70 shadow-raised">
          <img
            src={courseIntro.image}
            alt={courseIntro.imageAlt}
            width="1500"
            height="1000"
            loading="lazy"
            decoding="async"
            className="aspect-[1.3] size-full object-cover sm:aspect-[1.55] lg:aspect-[1.25]"
          />
          <figcaption className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-ink-primary/90 via-ink-primary/35 to-transparent px-5 pb-5 pt-16 text-white sm:px-7 sm:pb-7">
            <span
              lang="de"
              className="text-xs font-bold uppercase tracking-[0.16em] text-brand-pink"
            >
              Deutsch öffnet Türen
            </span>
            <p className="mt-1 font-display text-xl font-extrabold sm:text-2xl">
              Một ngôn ngữ mới. Thêm nhiều lựa chọn.
            </p>
          </figcaption>
        </figure>
        <ul className="grid gap-3 sm:grid-cols-3 lg:col-span-2 lg:gap-4">
          {courseIntro.opportunities.map((item, index) => {
            const Icon = opportunityIcons[index]
            return (
              <li
                key={item.title}
                className={`rounded-2xl border border-border-subtle/80 p-5 sm:p-6 ${index === 1 ? 'bg-white/90' : 'bg-white/70'}`}
              >
                <span className="mb-4 grid size-11 place-items-center rounded-2xl bg-brand-pink/75 text-ink-primary">
                  {Icon && <Icon aria-hidden="true" className="size-5" strokeWidth={2} />}
                </span>
                <h3 className="font-display text-lg font-extrabold text-ink-primary">
                  {item.title}
                </h3>
                <p className="mt-2 text-sm leading-6 text-ink-secondary sm:text-base">
                  {item.description}
                </p>
              </li>
            )
          })}
        </ul>
      </Container>
    </section>
  )
}
