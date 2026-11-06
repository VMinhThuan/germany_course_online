import { ArrowRight, BookOpenText, Clock3, ListChecks } from 'lucide-react'
import { Link } from 'react-router'
import type { CourseSummaryModel } from '@/domains/catalog/models'
import { DomainState } from '@/domains/shared/presentation'
import { formatVnd } from '@/shared/lib/format'
import { Button, Container, LinkButton } from '@/shared/ui'
import { BilingualSectionHeading } from '../components/BilingualSectionHeading'
import { homepageContent } from '../content/homepage-content'

export function CoursePricingSection({
  courses,
  loading = false,
  error,
  onRetry,
}: {
  courses: readonly CourseSummaryModel[]
  loading?: boolean
  error?: string
  onRetry?: () => void
}) {
  const { pricing } = homepageContent

  return (
    <section
      id="pricing"
      aria-labelledby="pricing-title"
      data-homepage-reveal
      className="homepage-section homepage-section--pricing scroll-mt-24 py-14 sm:py-18 lg:py-20"
    >
      <Container>
        <header className="mx-auto mb-8 max-w-2xl text-center sm:mb-10">
          <BilingualSectionHeading
            id="pricing-title"
            german={pricing.eyebrow}
            title={pricing.title}
          />
        </header>

        {loading ? (
          <DomainState kind="loading" title="Đang tải khóa học" />
        ) : error ? (
          <DomainState kind="error" title="Không tải được khóa học" message={error}>
            {onRetry && (
              <Button variant="outline" onClick={onRetry} className="mt-2">
                Thử tải lại
              </Button>
            )}
          </DomainState>
        ) : courses.length === 0 ? (
          <DomainState
            kind="empty"
            title="Chưa có khóa học"
            message="Danh mục khóa học hiện chưa có nội dung để hiển thị."
          />
        ) : (
          <div className="mx-auto grid max-w-5xl items-stretch gap-5 md:grid-cols-2">
            {courses.map((course) => {
              const priceValue = course.priceVnd?.trim()
              const hasCourseBanner = Boolean(course.thumbnailUrl)
              return (
                <article
                  key={course.id}
                  className="flex h-full flex-col overflow-hidden rounded-[1.5rem] border border-border-subtle bg-card-surface shadow-soft"
                >
                  {hasCourseBanner ? (
                    <Link
                      to={`/courses/${course.slug}`}
                      aria-label={`Xem khóa học ${course.title}`}
                      className="block focus-visible:outline-2 focus-visible:outline-action-focus"
                    >
                      <img
                        src={course.thumbnailUrl}
                        alt=""
                        loading="lazy"
                        decoding="async"
                        className="block h-auto w-full"
                      />
                    </Link>
                  ) : (
                    <div className="homepage-course-banner relative isolate overflow-hidden bg-surface-blue">
                      <img
                        src="/assets/homepage/paniverse-hero.webp"
                        alt=""
                        width="1600"
                        height="896"
                        loading="lazy"
                        className="absolute inset-0 size-full object-cover"
                      />
                      <div aria-hidden="true" className="absolute inset-0 bg-ink-primary/15" />
                      <div className="absolute inset-x-0 bottom-0 flex flex-wrap items-end justify-between gap-3 bg-gradient-to-t from-ink-primary/85 via-ink-primary/35 to-transparent px-5 pb-5 pt-14 text-white sm:px-7 sm:pb-6">
                        <div className="min-w-0">
                          <span className="mb-2 inline-flex rounded-full bg-card-surface px-3 py-1 text-sm font-bold text-action-primary">
                            {course.level}
                          </span>
                          <h3 className="font-display text-2xl font-extrabold tracking-tight text-white sm:text-3xl">
                            <Link
                              to={`/courses/${course.slug}`}
                              className="rounded-sm text-white underline-offset-4 hover:text-white hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                            >
                              {course.title}
                            </Link>
                          </h3>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="flex flex-1 flex-col gap-5 p-5 sm:p-6">
                    <div>
                      {hasCourseBanner && (
                        <div className="mb-3 flex items-start justify-between gap-3">
                          <h3 className="font-display text-xl font-bold tracking-tight text-ink-primary">
                            <Link
                              to={`/courses/${course.slug}`}
                              className="rounded-sm underline-offset-4 hover:text-action-primary hover:underline focus-visible:outline-2 focus-visible:outline-action-focus"
                            >
                              {course.title}
                            </Link>
                          </h3>
                          {!course.title.toLowerCase().includes(course.level.toLowerCase()) && (
                            <span className="shrink-0 rounded-full bg-brand-lime px-3 py-1 text-sm font-bold text-pastel-lime-ink">
                              {course.level}
                            </span>
                          )}
                        </div>
                      )}
                      <p className="max-w-2xl leading-7 text-ink-secondary">
                        {course.shortDescription}
                      </p>
                      {(course.chapterCount !== undefined || course.lessonCount !== undefined) && (
                        <ul className="mt-4 flex flex-wrap gap-2">
                          {course.chapterCount !== undefined && (
                            <li className="inline-flex min-h-9 items-center gap-2 rounded-full bg-surface-blue px-3 py-1.5 text-sm font-semibold text-ink-secondary">
                              <BookOpenText
                                aria-hidden="true"
                                className="size-4 text-action-primary"
                              />
                              {course.chapterCount} chương
                            </li>
                          )}
                          {course.lessonCount !== undefined && (
                            <li className="inline-flex min-h-9 items-center gap-2 rounded-full bg-brand-pink/45 px-3 py-1.5 text-sm font-semibold text-ink-secondary">
                              <ListChecks
                                aria-hidden="true"
                                className="size-4 text-action-primary"
                              />
                              {course.lessonCount} bài học
                            </li>
                          )}
                        </ul>
                      )}
                    </div>

                    <div className="mt-auto flex flex-col gap-4 border-t border-border-subtle pt-4 sm:flex-row sm:items-end sm:justify-between">
                      <div>
                        <p className="text-sm font-semibold text-ink-secondary">Học phí</p>
                        <p className="mt-0.5 font-display text-xl font-extrabold text-ink-primary">
                          {priceValue ? formatVnd(priceValue) : 'Đang cập nhật'}
                        </p>
                        {course.accessDurationMonths !== undefined && (
                          <p className="mt-1 flex items-center gap-1.5 text-sm text-ink-secondary">
                            <Clock3 aria-hidden="true" className="size-4" />
                            {course.accessDurationMonths} tháng truy cập
                          </p>
                        )}
                      </div>
                      <LinkButton
                        to={`/courses/${course.slug}`}
                        aria-label={`Xem nội dung khóa ${course.title}`}
                        endIcon={<ArrowRight aria-hidden="true" />}
                        className="w-full justify-center sm:w-auto"
                      >
                        Xem nội dung khóa
                      </LinkButton>
                    </div>
                  </div>
                </article>
              )
            })}
          </div>
        )}
        <div className="mt-8 flex justify-center">
          <LinkButton to="/courses" endIcon={<ArrowRight aria-hidden="true" />}>
            Xem tất cả khóa học
          </LinkButton>
        </div>
      </Container>
    </section>
  )
}
