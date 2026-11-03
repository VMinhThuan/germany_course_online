import { ArrowRight, Check, Clock3 } from 'lucide-react'
import { Link } from 'react-router'
import { DomainState } from '@/domains/shared/presentation'
import type { CourseSummaryModel } from '@/domains/catalog/models'
import { formatVnd } from '@/shared/lib/format'
import { Button, Container, LinkButton } from '@/shared/ui'
import { homepageContent } from '../content/homepage-content'

export function PricingSection({
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
      className="scroll-mt-24 bg-surface-muted py-16 sm:py-20 lg:py-24"
    >
      <Container>
        <header className="mx-auto mb-9 max-w-2xl text-center">
          <p className="text-xs font-bold uppercase tracking-[0.17em] text-action-primary">
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
          <div
            className={`mx-auto grid gap-5 ${courses.length === 1 ? 'max-w-xl grid-cols-1' : courses.length === 2 ? 'max-w-5xl grid-cols-1 xl:grid-cols-2' : 'grid-cols-1 md:grid-cols-2 xl:grid-cols-3'}`}
          >
            {courses.map((course) => {
              const hasPrice = Boolean(course.priceVnd?.trim())
              const singleCourse = courses.length === 1
              const benefits =
                course.slug === 'tieng-duc-a1-1'
                  ? pricing.benefits
                  : [
                      ...(course.chapterCount !== undefined
                        ? [`Xem nội dung theo ${course.chapterCount} chương`]
                        : []),
                      ...(course.lessonCount !== undefined
                        ? [`Khám phá ${course.lessonCount} bài học`]
                        : []),
                      'Xem thông tin khóa học hiện có',
                    ]
              return (
                <article
                  key={course.id}
                  className="grid grid-rows-[auto_1fr] overflow-hidden rounded-[1.6rem] border border-border-subtle bg-card-surface shadow-raised"
                >
                  <div className="relative aspect-[16/9] overflow-hidden bg-surface-blue">
                    {course.thumbnailUrl ? (
                      <img
                        src={course.thumbnailUrl}
                        alt=""
                        width="960"
                        height="540"
                        loading="lazy"
                        className="size-full object-cover"
                      />
                    ) : (
                      <div className="absolute inset-0 grid place-items-center bg-brand-blue p-8 text-center">
                        <span className="font-display text-6xl font-extrabold text-ink-primary">
                          {course.level}
                        </span>
                      </div>
                    )}
                    <span className="absolute left-4 top-4 rounded-full bg-card-surface px-3 py-1.5 text-sm font-bold text-action-primary shadow-soft">
                      {course.level}
                    </span>
                    <span className="absolute bottom-4 right-4 rounded-xl bg-ink-primary px-3 py-2 text-sm font-bold text-white shadow-soft">
                      Học thử · 3 chương
                    </span>
                  </div>

                  <div className="flex min-w-0 flex-col p-5 sm:p-7">
                    <p className="text-xs font-bold uppercase tracking-[0.14em] text-action-primary">
                      Lộ trình hiện có
                    </p>
                    <h3 className="mt-2 font-display text-2xl font-extrabold tracking-tight text-ink-primary sm:text-3xl">
                      <Link
                        to={`/courses/${course.slug}`}
                        className="rounded-sm underline-offset-4 hover:text-action-primary hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-action-focus"
                      >
                        {course.title}
                      </Link>
                    </h3>
                    <p className="mt-3 max-w-xl leading-6 text-ink-secondary">
                      {course.shortDescription}
                    </p>

                    <ul
                      className={`mt-5 grid gap-3 text-sm leading-5 text-ink-secondary ${singleCourse ? 'sm:grid-cols-2' : ''}`}
                    >
                      {benefits.map((benefit) => (
                        <li key={benefit} className="flex items-start gap-2">
                          <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-surface-lime text-action-primary">
                            <Check aria-hidden="true" className="size-3.5" strokeWidth={3} />
                          </span>
                          <span>{benefit}</span>
                        </li>
                      ))}
                      {course.chapterCount !== undefined && (
                        <li className="flex items-start gap-2">
                          <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-surface-blue text-action-primary">
                            <Check aria-hidden="true" className="size-3.5" strokeWidth={3} />
                          </span>
                          <span>
                            {course.chapterCount} chương · {course.lessonCount ?? '—'} bài học
                          </span>
                        </li>
                      )}
                    </ul>

                    <div className="mt-6 flex flex-col gap-4 border-t border-border-subtle pt-5 sm:flex-row sm:items-end sm:justify-between">
                      <div>
                        <p className="text-xs font-bold uppercase tracking-[0.12em] text-ink-muted">
                          Học phí
                        </p>
                        <p className="mt-1 font-display text-xl font-extrabold text-ink-primary">
                          {course.priceVnd?.trim()
                            ? formatVnd(course.priceVnd)
                            : 'Học phí đang cập nhật'}
                        </p>
                        {course.accessDurationMonths !== undefined && (
                          <p className="mt-1 flex items-center gap-1.5 text-sm text-ink-secondary">
                            <Clock3 aria-hidden="true" className="size-4" />
                            {course.accessDurationMonths} tháng truy cập
                          </p>
                        )}
                        {!hasPrice && course.accessDurationMonths === undefined && (
                          <p className="mt-1 text-sm text-ink-muted">
                            Thời hạn truy cập đang được cập nhật
                          </p>
                        )}
                      </div>
                      <LinkButton
                        to={`/courses/${course.slug}`}
                        endIcon={<ArrowRight aria-hidden="true" />}
                        className="w-full sm:w-auto"
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
