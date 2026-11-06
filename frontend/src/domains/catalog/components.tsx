import { ArrowRight, BookOpenText, Clock3, ImageOff, Target } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { Link } from 'react-router'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
  Badge,
  Button,
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
  Container,
  LinkButton,
  Progress,
} from '@/shared/ui'
import { formatVnd } from '@/shared/lib/format'
import { DomainState } from '@/domains/shared/presentation'
import { SemanticHeading, type HeadingLevel } from '@/domains/shared/heading'
import type {
  CourseAccessViewModel,
  CourseDetailModel,
  CourseSectionModel,
  CourseSummaryModel,
  MockPreviewManifest,
} from './models'
import { isMockPreviewSection } from './models'

export function LandingHero({
  eyebrow = 'Deutsch · A1.1',
  title,
  description,
  imageUrl,
  primaryAction,
  secondaryAction,
  headingLevel = 1,
}: {
  eyebrow?: string
  title: string
  description: string
  imageUrl?: string
  primaryAction: { label: string; onClick: () => void }
  secondaryAction?: { label: string; onClick: () => void }
  headingLevel?: HeadingLevel
}) {
  const [imageFailed, setImageFailed] = useState(false)
  return (
    <section className="relative overflow-hidden rounded-[1.75rem] border border-brand-blue bg-brand-blue text-ink-primary shadow-soft">
      <div
        className="absolute inset-y-0 right-0 hidden w-[44%] bg-white/35 md:block"
        aria-hidden="true"
      />
      <Container className="relative grid gap-8 py-12 sm:py-16 md:grid-cols-[minmax(0,1fr)_0.82fr] md:items-center md:py-20">
        <div className="max-w-2xl space-y-5">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-action-primary">
            {eyebrow}
          </p>
          <SemanticHeading
            level={headingLevel}
            className="font-display text-4xl font-extrabold leading-tight tracking-tight text-ink-primary sm:text-5xl"
          >
            {title}
          </SemanticHeading>
          <p className="max-w-xl text-lg leading-7 text-ink-secondary">{description}</p>
          <div className="flex flex-wrap gap-3 pt-1">
            <Button onClick={primaryAction.onClick} variant="primary">
              {primaryAction.label}
              <ArrowRight aria-hidden="true" />
            </Button>
            {secondaryAction && (
              <Button
                onClick={secondaryAction.onClick}
                variant="outline"
                className="border-action-primary/30 bg-white/60 text-ink-primary hover:bg-white"
              >
                {secondaryAction.label}
              </Button>
            )}
          </div>
        </div>
        <div className="relative min-h-56 overflow-hidden rounded-3xl border border-white/70 bg-white/55 shadow-soft sm:min-h-64">
          {imageUrl && !imageFailed ? (
            <img
              src={imageUrl}
              alt="Minh họa khóa học A1.1 với lời chào Guten Tag!"
              onError={() => setImageFailed(true)}
              className="absolute inset-0 size-full object-cover"
            />
          ) : (
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_75%_25%,rgb(255_255_255_/_0.9),transparent_42%),linear-gradient(145deg,rgb(209_246_133_/_0.52),transparent_62%)]">
              <div className="relative flex h-full min-h-48 flex-col justify-between p-5 sm:min-h-64">
                <span className="inline-flex size-12 items-center justify-center rounded-2xl bg-white text-action-primary shadow-soft">
                  <BookOpenText aria-hidden="true" className="size-6" />
                </span>
                <div>
                  <p className="text-sm font-semibold text-ink-secondary">
                    Ein kleiner Schritt, jeden Tag
                  </p>
                  <p className="mt-1 font-display text-xl font-bold leading-tight text-ink-primary sm:text-2xl">
                    Học từng chương, dùng được ngay
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </Container>
    </section>
  )
}

export function LearningBenefits({
  benefits,
}: {
  benefits: readonly { title: string; description: string }[]
}) {
  return (
    <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {benefits.map((benefit) => (
        <li
          key={benefit.title}
          className="rounded-2xl border-l-4 border-brand-lime bg-card-surface p-5"
        >
          <h3 className="font-display font-bold">{benefit.title}</h3>
          <p className="mt-2 text-sm leading-6 text-ink-secondary">{benefit.description}</p>
        </li>
      ))}
    </ul>
  )
}

export function CourseLevelBadge({ level }: { level: string }) {
  return <Badge tone="brand">{level}</Badge>
}

export function FreePreviewBadge({ label = 'Học thử theo yêu cầu' }: { label?: string }) {
  return (
    <Badge tone="preview">
      <BookOpenText aria-hidden="true" className="size-3.5" />
      {label}
    </Badge>
  )
}

export function CourseCard({
  course,
  access,
  href,
  onOpen,
}: {
  course: CourseSummaryModel
  access?: CourseAccessViewModel
  href?: string
  onOpen?: () => void
}) {
  const [imageFailed, setImageFailed] = useState(false)
  const hasCourseImage = Boolean(course.thumbnailUrl && !imageFailed)
  return (
    <Card className="flex min-w-0 flex-col overflow-hidden shadow-soft">
      <div
        className={
          hasCourseImage
            ? 'overflow-hidden bg-surface-blue'
            : 'relative aspect-[16/9] overflow-hidden bg-surface-blue'
        }
      >
        {hasCourseImage && course.thumbnailUrl ? (
          <img
            src={course.thumbnailUrl}
            alt=""
            onError={() => setImageFailed(true)}
            className="block h-auto w-full"
          />
        ) : (
          <div className="grid size-full place-items-center text-pastel-blue-ink">
            <ImageOff aria-hidden="true" className="size-7" />
            <span className="sr-only">Ảnh khóa học chưa có</span>
          </div>
        )}
      </div>
      <CardHeader className="flex-1">
        <div className="flex items-start justify-between gap-3">
          <CardTitle className="min-w-0">
            {href ? (
              <Link
                className="rounded-sm underline-offset-4 hover:text-action-primary hover:underline focus-visible:outline-2 focus-visible:outline-action-focus"
                to={href}
              >
                {course.title}
              </Link>
            ) : (
              course.title
            )}
          </CardTitle>
          {!course.title.toLowerCase().includes(course.level.toLowerCase()) && (
            <CourseLevelBadge level={course.level} />
          )}
        </div>
        <p className="text-sm leading-6 text-ink-secondary">{course.shortDescription}</p>
        {access?.kind === 'customer-preview' && (
          <div className="pt-2">
            <FreePreviewBadge />
          </div>
        )}
      </CardHeader>
      <CardContent className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-ink-secondary">
        {course.chapterCount !== undefined && <span>{course.chapterCount} chương</span>}
        {course.lessonCount !== undefined && <span>{course.lessonCount} bài học</span>}
        {course.accessDurationMonths !== undefined && (
          <span className="inline-flex items-center gap-1.5">
            <Clock3 aria-hidden="true" className="size-4" />
            {course.accessDurationMonths} tháng truy cập
          </span>
        )}
        {course.priceVnd ? (
          <span className="ml-auto font-bold text-ink-primary">{formatVnd(course.priceVnd)}</span>
        ) : (
          <span className="ml-auto text-sm text-ink-muted">Học phí đang cập nhật</span>
        )}
      </CardContent>
      <CardFooter className="border-t border-border-subtle pt-4">
        {href ? (
          <Link
            to={href}
            className="inline-flex min-h-11 items-center gap-2 font-semibold text-action-primary underline-offset-4 hover:underline"
          >
            Xem khóa học <ArrowRight aria-hidden="true" className="size-4" />
          </Link>
        ) : (
          <Button variant="outline" onClick={onOpen}>
            Xem khóa học <ArrowRight aria-hidden="true" />
          </Button>
        )}
      </CardFooter>
    </Card>
  )
}

export function CourseGrid({
  courses,
  loading = false,
  error,
  emptyMessage = 'Chưa có khóa học phù hợp.',
  onOpenCourse,
  singleColumn = false,
}: {
  courses: readonly CourseSummaryModel[]
  loading?: boolean
  error?: string
  emptyMessage?: string
  onOpenCourse?: (course: CourseSummaryModel) => void
  singleColumn?: boolean
}) {
  if (loading) return <DomainState kind="loading" title="Đang tải khóa học" />
  if (error) return <DomainState kind="error" title="Không tải được khóa học" message={error} />
  if (courses.length === 0)
    return <DomainState kind="empty" title="Chưa có khóa học" message={emptyMessage} />
  return (
    <div
      className={`grid min-w-0 gap-5 ${singleColumn ? 'grid-cols-1' : 'sm:grid-cols-2 xl:grid-cols-3'}`}
    >
      {courses.map((course) => (
        <CourseCard
          key={course.id}
          course={course}
          {...(onOpenCourse
            ? { onOpen: () => onOpenCourse(course) }
            : { href: `/courses/${course.slug}` })}
        />
      ))}
    </div>
  )
}

export function CourseDetailHero({
  course,
  access,
  primaryAction,
  secondaryAction,
  accessNote,
  headingLevel = 1,
}: {
  course: CourseDetailModel
  access: CourseAccessViewModel
  primaryAction: { label: string; onClick: () => void }
  secondaryAction?: { label: string; onClick: () => void }
  accessNote?: string
  headingLevel?: HeadingLevel
}) {
  return (
    <section className="grid gap-6 rounded-3xl bg-surface-blue p-6 sm:p-9 lg:grid-cols-[minmax(0,1fr)_17rem] lg:items-end">
      <div className="space-y-4">
        <CourseLevelBadge level={course.level} />
        <SemanticHeading
          level={headingLevel}
          className="font-display text-3xl font-extrabold tracking-tight sm:text-4xl"
        >
          {course.title}
        </SemanticHeading>
        <p className="max-w-2xl leading-7 text-ink-secondary">{course.shortDescription}</p>
        {(accessNote || course.accessDurationMonths !== undefined) && (
          <p className="flex items-center gap-2 text-sm text-ink-secondary">
            <Clock3 aria-hidden="true" className="size-4" />
            {accessNote ?? `Truy cập ${course.accessDurationMonths} tháng sau khi được cấp quyền`}
          </p>
        )}
      </div>
      <div className="grid gap-3 rounded-2xl bg-card-surface p-4">
        <CourseAccessLabel access={access} />
        <Button onClick={primaryAction.onClick}>{primaryAction.label}</Button>
        {secondaryAction && (
          <Button variant="outline" onClick={secondaryAction.onClick}>
            {secondaryAction.label}
          </Button>
        )}
      </div>
    </section>
  )
}

function CourseAccessLabel({ access }: { access: CourseAccessViewModel }) {
  return <p className="text-sm font-semibold text-ink-secondary">{access.label}</p>
}

export function CourseOverview({
  title = 'Tổng quan khóa học',
  description,
}: {
  title?: string
  description: string
}) {
  return (
    <section className="max-w-3xl space-y-3">
      <h2 className="font-display text-2xl font-bold">{title}</h2>
      <p className="whitespace-pre-line leading-7 text-ink-secondary">{description}</p>
    </section>
  )
}

export function CourseObjectives({
  objectives,
  title = 'Sau khóa học, bạn có thể',
}: {
  objectives: readonly string[]
  title?: string
}) {
  return (
    <section
      aria-labelledby="course-objectives-heading"
      className="rounded-2xl bg-surface-lime p-5 sm:p-6"
    >
      <h2
        id="course-objectives-heading"
        className="flex items-center gap-2 font-display text-xl font-bold"
      >
        <Target aria-hidden="true" className="size-5" />
        {title}
      </h2>
      <ul className="mt-4 grid gap-3 sm:grid-cols-2">
        {objectives.map((objective) => (
          <li key={objective} className="flex gap-2 text-sm leading-6 text-ink-primary">
            <span
              aria-hidden="true"
              className="mt-2 size-1.5 shrink-0 rounded-full bg-action-primary"
            />
            {objective}
          </li>
        ))}
      </ul>
    </section>
  )
}

export function CourseSectionAccordion({
  section,
  preview = false,
  previewLabel = 'Học thử theo yêu cầu',
  action,
}: {
  section: CourseSectionModel
  preview?: boolean
  previewLabel?: string
  action?: (lessonId: string) => void
}) {
  return (
    <Accordion type="single" collapsible className="min-w-0 border-b border-border-subtle">
      <AccordionItem value={section.id} className="min-w-0">
        <AccordionTrigger className="min-w-0 gap-3">
          <span className="flex min-w-0 flex-1 items-start justify-between gap-3 text-left">
            <span className="min-w-0">
              <span className="block truncate">{section.title}</span>
              <span className="mt-1 block text-xs font-normal text-ink-muted">
                {section.sectionType === 'CHAPTER' ? 'Chương' : 'Ôn tập'} · {section.lessons.length}{' '}
                bài
              </span>
            </span>
            {preview && <FreePreviewBadge label={previewLabel} />}
          </span>
        </AccordionTrigger>
        <AccordionContent>
          {section.description && <p className="mb-3 leading-6">{section.description}</p>}
          <ul className="grid gap-1">
            {section.lessons.map((lesson) => (
              <li key={lesson.id}>
                <button
                  type="button"
                  onClick={() => action?.(lesson.id)}
                  className="flex min-h-11 w-full items-center justify-between gap-3 rounded-lg px-3 text-left hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-action-focus"
                >
                  <span className="min-w-0 truncate text-ink-primary">{lesson.title}</span>
                  <span className="shrink-0 text-xs text-ink-secondary">
                    {lesson.estimatedMinutes
                      ? `${lesson.estimatedMinutes} phút`
                      : lesson.lessonType}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  )
}

export function CourseOutline({
  sections,
  previewManifest,
  previewSectionIds,
  previewHref,
  previewLabel = 'Học thử theo yêu cầu',
  onLessonSelect,
}: {
  sections: readonly CourseSectionModel[]
  previewManifest?: MockPreviewManifest
  previewSectionIds?: readonly string[]
  previewHref?: string
  previewLabel?: string
  onLessonSelect?: (lessonId: string) => void
}) {
  if (sections.length === 0)
    return <DomainState kind="empty" title="Chương trình đang được chuẩn bị" />
  return (
    <div className="min-w-0 divide-y divide-border-subtle rounded-2xl border border-border-subtle bg-card-surface">
      {sections.map((section) => (
        <div key={section.id} className="px-4 sm:px-5">
          <CourseSectionAccordion
            section={section}
            previewLabel={previewLabel}
            preview={Boolean(
              (previewManifest && isMockPreviewSection(section, previewManifest)) ||
              (section.sectionType === 'CHAPTER' && previewSectionIds?.includes(section.id)),
            )}
            {...(onLessonSelect ? { action: onLessonSelect } : {})}
          />
          {previewHref &&
            section.sectionType === 'CHAPTER' &&
            (previewSectionIds?.includes(section.id) ||
              (previewManifest && isMockPreviewSection(section, previewManifest))) && (
              <LinkButton
                to={`${previewHref}?sectionId=${encodeURIComponent(section.id)}`}
                variant="link"
                className="mb-3 ml-3 min-h-10"
              >
                Học thử miễn phí <ArrowRight aria-hidden="true" />
              </LinkButton>
            )}
          {previewHref &&
            !(
              previewSectionIds?.includes(section.id) ||
              (previewManifest && isMockPreviewSection(section, previewManifest))
            ) && (
              <p className="mb-3 ml-3 text-xs font-medium text-ink-muted">
                Nội dung đầy đủ · cần quyền truy cập
              </p>
            )}
        </div>
      ))}
    </div>
  )
}

export function CoursePricingSummary({
  priceVnd,
  currency = 'VND',
  durationMonths,
  note,
}: {
  priceVnd: string
  currency?: 'VND'
  durationMonths: number
  note?: string
}) {
  return (
    <Card className="p-5 sm:p-6">
      <p className="text-sm font-semibold text-ink-secondary">Học phí khóa học</p>
      <p className="mt-2 font-display text-3xl font-extrabold tabular-nums">
        {formatVnd(priceVnd)} <span className="sr-only">{currency}</span>
      </p>
      <p className="mt-2 text-sm text-ink-secondary">Thời hạn truy cập: {durationMonths} tháng</p>
      {note && <p className="mt-3 text-sm leading-6 text-ink-muted">{note}</p>}
    </Card>
  )
}

export function FreePreviewSection({
  section,
  manifest,
  children,
}: {
  section: CourseSectionModel
  manifest: MockPreviewManifest
  children: ReactNode
}) {
  if (!isMockPreviewSection(section, manifest)) return null
  return (
    <section
      className="min-w-0 space-y-3 rounded-2xl border border-action-primary/25 bg-surface-blue p-4 sm:p-5"
      data-preview-mode="mock-only"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="min-w-0 font-display text-xl font-bold">{section.title}</h2>
        <FreePreviewBadge />
      </div>
      <p className="text-sm leading-6 text-ink-secondary">{manifest.notice}</p>
      {children}
    </section>
  )
}

export function CourseProgressStrip({ label, value }: { label: string; value: number }) {
  return <Progress label={label} value={value} />
}
