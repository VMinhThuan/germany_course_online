import { ArrowRight, Check, Clock3 } from 'lucide-react'
import { Link } from 'react-router'
import type { CourseSummaryModel } from '@/domains/catalog/models'
import { DomainState } from '@/domains/shared/presentation'
import { formatVnd } from '@/shared/lib/format'
import { Button, Container, LinkButton } from '@/shared/ui'
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
      className="scroll-mt-24 bg-surface-muted py-14 sm:py-18 lg:py-20"
    >
      <Container>
        <header className="mx-auto mb-8 max-w-2xl text-center sm:mb-10">
          <p
            lang="de"
            className="text-sm font-bold uppercase tracking-[0.14em] text-action-primary"
          >
            {pricing.eyebrow}
          </p>
          <h2
            id="pricing-title"
            className="mt-3 font-display text-3xl font-extrabold tracking-tight text-ink-primary sm:text-4xl"
          >
            {pricing.title}
          </h2>
          <p className="mt-3 leading-7 text-ink-secondary">{pricing.description}</p>
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
              const benefits =
                course.slug === 'tieng-duc-a1-1'
                  ? pricing.benefits
                  : [
                      'Tiếp nối kiến thức nền tảng A1.1',
                      'Chủ đề sinh hoạt và giao tiếp quen thuộc',
                      'Bài tập minh họa theo từng chương',
                    ]

              return (
                <article
                  key={course.id}
                  className="flex h-full flex-col overflow-hidden rounded-[1.5rem] border border-border-subtle bg-card-surface shadow-soft"
                >
                  <div className="homepage-course-banner relative isolate overflow-hidden bg-surface-blue">
                    <img
                      src={course.thumbnailUrl ?? '/assets/homepage/course-banner-a11.webp'}
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

                  <div className="flex flex-1 flex-col gap-5 p-5 sm:p-6">
                    <div>
                      <p className="max-w-2xl leading-7 text-ink-secondary">
                        {course.shortDescription}
                      </p>
                      <ul className="mt-4 grid gap-2.5">
                        {benefits.map((benefit) => (
                          <li
                            key={benefit}
                            className="flex items-start gap-2.5 text-sm leading-5 text-ink-secondary"
                          >
                            <Check
                              aria-hidden="true"
                              className="mt-1 size-4 shrink-0 text-action-primary"
                              strokeWidth={2.5}
                            />
                            <span>{benefit}</span>
                          </li>
                        ))}
                        {(course.chapterCount !== undefined ||
                          course.lessonCount !== undefined) && (
                          <li className="flex items-start gap-2.5 text-sm leading-6 text-ink-secondary">
                            <Check
                              aria-hidden="true"
                              className="mt-1 size-4 shrink-0 text-action-primary"
                              strokeWidth={2.5}
                            />
                            <span>
                              {course.chapterCount !== undefined && `${course.chapterCount} chương`}
                              {course.chapterCount !== undefined &&
                                course.lessonCount !== undefined &&
                                ' · '}
                              {course.lessonCount !== undefined && `${course.lessonCount} bài học`}
                            </span>
                          </li>
                        )}
                      </ul>
                    </div>

                    {course.previewAvailable ? (
                      <LinkButton
                        to={`/courses/${course.slug}/preview`}
                        variant="outline"
                        endIcon={<ArrowRight aria-hidden="true" />}
                        className="w-full justify-center sm:w-auto"
                      >
                        Học thử miễn phí
                      </LinkButton>
                    ) : (
                      <p className="text-sm font-medium text-ink-muted">
                        Nội dung A1.2 đang được hoàn thiện.
                      </p>
                    )}

                    <div className="mt-auto flex flex-col gap-4 border-t border-border-subtle pt-4 sm:flex-row sm:items-end sm:justify-between">
                      <div>
                        <p className="text-sm font-semibold text-ink-secondary">Học phí minh họa</p>
                        <p className="mt-0.5 font-display text-xl font-extrabold text-ink-primary">
                          {priceValue ? formatVnd(priceValue) : 'Đang cập nhật'}
                        </p>
                        {course.accessDurationMonths !== undefined && (
                          <p className="mt-1 flex items-center gap-1.5 text-sm text-ink-secondary">
                            <Clock3 aria-hidden="true" className="size-4" />
                            {course.accessDurationMonths} tháng truy cập · demo
                          </p>
                        )}
                      </div>
                      <LinkButton
                        to={`/courses/${course.slug}`}
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
      </Container>
    </section>
  )
}
