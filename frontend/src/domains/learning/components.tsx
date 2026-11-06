import { BookOpenText, Check, ChevronLeft, ChevronRight, FileLock, Clock3 } from 'lucide-react'
import type { PropsWithChildren } from 'react'
import { Badge, Button, Card, CardContent, CardHeader, Progress } from '@/shared/ui'
import type {
  CourseAccessViewModel,
  CourseSectionModel,
  LessonSummaryModel,
} from '@/domains/catalog/models'
import type { CourseProgressViewModel } from '@/domains/progress/models'
import type {
  CourseTreeViewModel,
  LessonCompletionPresentation,
  LessonContentViewModel,
  LessonNavigationItem,
} from './models'
import { SemanticHeading, type HeadingLevel } from '@/domains/shared/heading'

export function LearningCourseHeader({
  title,
  level,
  access,
  onBack,
  headingLevel = 1,
}: {
  title: string
  level: string
  access: CourseAccessViewModel
  onBack?: () => void
  headingLevel?: HeadingLevel
}) {
  return (
    <header className="flex flex-wrap items-start justify-between gap-4 border-b border-border-subtle pb-5">
      {' '}
      <div className="flex w-full min-w-0 items-start gap-3 sm:w-auto sm:flex-1">
        {onBack && (
          <Button aria-label="Quay lại khóa học" variant="ghost" size="icon" onClick={onBack}>
            <ChevronLeft aria-hidden="true" />
          </Button>
        )}
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-action-primary">
            {level} · Không gian học
          </p>
          <SemanticHeading
            level={headingLevel}
            className="mt-1 truncate font-display text-2xl font-bold sm:text-3xl"
          >
            {title}
          </SemanticHeading>
        </div>
      </div>
      <AccessStatePanel access={access} compact />
    </header>
  )
}

export function ChapterItem({
  section,
  currentLessonId,
  onSelectLesson,
  onSelectSection,
  preview = false,
  headingLevel = 2,
}: {
  section: CourseSectionModel
  currentLessonId?: string
  onSelectLesson?: (id: string) => void
  onSelectSection?: (id: string) => void
  preview?: boolean
  headingLevel?: HeadingLevel
}) {
  return (
    <section
      aria-labelledby={`section-${section.id}`}
      className="border-b border-border-subtle py-3 last:border-b-0"
    >
      <SemanticHeading
        level={headingLevel}
        id={`section-${section.id}`}
        className="flex flex-wrap items-center gap-2 px-3 py-2 font-semibold text-ink-primary"
      >
        <BookOpenText aria-hidden="true" className="size-4 text-action-primary" />
        {section.title}
        {preview && <Badge tone="info">Học thử</Badge>}
        {onSelectSection && (
          <button
            type="button"
            className="ml-auto inline-flex min-h-10 items-center rounded-lg px-3 text-sm font-semibold text-action-primary hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-action-focus"
            onClick={() => onSelectSection(section.id)}
          >
            Mở chương
          </button>
        )}
      </SemanticHeading>
      <div className="overflow-x-auto px-2 pb-2">
        <table className="w-full min-w-[34rem] border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-border-subtle text-xs font-semibold text-ink-muted">
              <th scope="col" className="w-12 px-3 py-2">
                #
              </th>
              <th scope="col" className="px-3 py-2">
                Bài học
              </th>
              <th scope="col" className="w-36 px-3 py-2">
                Trạng thái
              </th>
              <th scope="col" className="hidden w-32 px-3 py-2 md:table-cell">
                Nội dung
              </th>
            </tr>
          </thead>
          <tbody>
            {section.lessons.map((lesson, index) => {
              const current = currentLessonId === lesson.id
              const lessonLink = onSelectLesson ? (
                <button
                  type="button"
                  aria-current={current ? 'page' : undefined}
                  onClick={() => onSelectLesson(lesson.id)}
                  className="min-h-10 text-left font-semibold text-ink-primary hover:text-action-primary"
                >
                  {lesson.title}
                </button>
              ) : (
                <span className="font-semibold text-ink-primary">{lesson.title}</span>
              )
              return (
                <tr
                  key={lesson.id}
                  className={`border-b border-border-subtle last:border-b-0 ${current ? 'bg-surface-blue/70' : 'hover:bg-surface-muted/60'}`}
                >
                  <td className="px-3 py-2.5 tabular-nums text-ink-muted">{index + 1}</td>
                  <td className="px-3 py-2.5">{lessonLink}</td>
                  <td className="px-3 py-2.5">
                    <LessonStatusIndicator
                      status={
                        lesson.progressStatus
                          .toLowerCase()
                          .replace('_', '-') as LessonCompletionPresentation
                      }
                    />
                  </td>
                  <td className="hidden px-3 py-2.5 text-xs text-ink-secondary md:table-cell">
                    {lesson.estimatedMinutes
                      ? `${lesson.estimatedMinutes} phút`
                      : lesson.lessonType === 'LECTURE'
                        ? 'Bài giảng'
                        : 'Thực hành'}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </section>
  )
}

export function CourseTree({
  tree,
  previewSectionIds = [],
  onSelectLesson,
  onSelectSection,
  headingLevel = 2,
}: {
  tree: CourseTreeViewModel
  previewSectionIds?: readonly string[]
  onSelectLesson?: (id: string) => void
  onSelectSection?: (id: string) => void
  headingLevel?: HeadingLevel
}) {
  if (tree.sections.length === 0)
    return (
      <Card className="p-5 text-sm text-ink-secondary">Chương trình học đang được chuẩn bị.</Card>
    )
  return (
    <nav
      aria-label={`Nội dung khóa học ${tree.courseTitle}`}
      className="overflow-hidden rounded-2xl border border-border-subtle bg-card-surface"
    >
      {tree.sections.map((section) => (
        <ChapterItem
          key={section.id}
          section={section}
          {...(tree.currentLessonId ? { currentLessonId: tree.currentLessonId } : {})}
          {...(onSelectLesson ? { onSelectLesson } : {})}
          {...(onSelectSection ? { onSelectSection } : {})}
          headingLevel={(headingLevel + 1) as HeadingLevel}
          preview={section.sectionType === 'CHAPTER' && previewSectionIds.includes(section.id)}
        />
      ))}
    </nav>
  )
}

export function LessonStatusIndicator({
  status,
  label,
}: {
  status: LessonCompletionPresentation
  label?: string
}) {
  const text =
    label ??
    (status === 'completed' ? 'Hoàn thành' : status === 'in-progress' ? 'Đang học' : 'Chưa bắt đầu')
  return (
    <span
      className="inline-flex items-center gap-1.5 text-xs font-medium text-ink-secondary"
      aria-label={`Trạng thái bài học: ${text}`}
    >
      <span
        aria-hidden="true"
        className={`grid size-5 place-items-center rounded-full border ${status === 'completed' ? 'border-action-primary bg-action-primary text-white' : status === 'in-progress' ? 'border-action-primary bg-surface-blue' : 'border-border-strong bg-card-surface'}`}
      >
        {status === 'completed' ? (
          <Check className="size-3" />
        ) : (
          <span className="size-1.5 rounded-full bg-current" />
        )}
      </span>
      {text}
    </span>
  )
}

export function LessonRow({
  lesson,
  current = false,
  href,
  onSelect,
  restricted = false,
}: {
  lesson: LessonSummaryModel
  current?: boolean
  href?: string
  onSelect?: (id: string) => void
  restricted?: boolean
}) {
  const content = (
    <>
      <span className="min-w-0 flex-1">
        <span className="block truncate font-medium">{lesson.title}</span>
        <span className="mt-1 flex flex-wrap items-center gap-2 text-xs text-ink-secondary">
          <LessonStatusIndicator
            status={
              lesson.progressStatus.toLowerCase().replace('_', '-') as LessonCompletionPresentation
            }
          />
          <span className="inline-flex items-center gap-1">
            <Clock3 aria-hidden="true" className="size-3" />
            {lesson.estimatedMinutes
              ? `${lesson.estimatedMinutes} phút`
              : lesson.lessonType === 'LECTURE'
                ? 'Bài giảng'
                : 'Thực hành'}
          </span>
        </span>
      </span>
      {restricted && <FileLock aria-hidden="true" className="size-4 shrink-0 text-ink-muted" />}
    </>
  )
  const className = `flex min-h-14 w-full items-center gap-3 rounded-xl px-3 py-2 text-left transition-colors focus-visible:outline-2 focus-visible:outline-action-focus ${current ? 'bg-surface-blue text-ink-primary' : 'text-ink-secondary hover:bg-surface-muted'} ${restricted ? 'cursor-not-allowed opacity-70' : ''}`
  if (href && !restricted)
    return (
      <a href={href} aria-current={current ? 'page' : undefined} className={className}>
        {content}
      </a>
    )
  return (
    <button
      type="button"
      aria-current={current ? 'page' : undefined}
      disabled={restricted}
      onClick={() => onSelect?.(lesson.id)}
      className={className}
    >
      {content}
    </button>
  )
}

export function LessonNavigation({
  items,
  currentId,
  onNavigate,
}: {
  items: readonly LessonNavigationItem[]
  currentId?: string
  onNavigate: (id: string) => void
}) {
  return (
    <nav aria-label="Điều hướng bài học">
      <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {items.map((item, index) => (
          <li key={item.id} className="min-w-0">
            <Button
              variant={item.id === currentId ? 'secondary' : 'outline'}
              className="w-full justify-start whitespace-normal text-left"
              onClick={() => onNavigate(item.id)}
              disabled={item.access.kind === 'restricted' || item.access.kind === 'expired-display'}
              startIcon={index > 0 ? <ChevronLeft aria-hidden="true" /> : undefined}
              endIcon={index < items.length - 1 ? <ChevronRight aria-hidden="true" /> : undefined}
            >
              {item.title}
            </Button>
          </li>
        ))}
      </ul>
    </nav>
  )
}

export function LessonContent({
  content,
  children,
  headingLevel = 1,
  fullWidth = false,
  showLessonType = true,
}: PropsWithChildren<{
  content: LessonContentViewModel
  headingLevel?: HeadingLevel
  fullWidth?: boolean
  showLessonType?: boolean
}>) {
  if (content.access.kind === 'restricted' || content.access.kind === 'expired-display')
    return <LockedContentPanel access={content.access} />
  return (
    <article className={fullWidth ? 'w-full space-y-7' : 'mx-auto w-full max-w-3xl space-y-7'}>
      <header className="space-y-3">
        {showLessonType && (
          <p className="text-sm font-semibold text-action-primary">
            {content.lesson.lessonType === 'LECTURE' ? 'Bài giảng' : 'Thực hành'}
            {content.lesson.estimatedMinutes ? ` · ${content.lesson.estimatedMinutes} phút` : ''}
          </p>
        )}
        <SemanticHeading
          level={headingLevel}
          className="font-display text-3xl font-extrabold tracking-tight sm:text-4xl"
        >
          {content.lesson.title}
        </SemanticHeading>
      </header>
      <div className="space-y-5">
        {content.paragraphs.map((paragraph, index) => (
          <p
            key={`${index}-${paragraph.slice(0, 12)}`}
            className="text-base leading-8 text-ink-secondary"
          >
            {paragraph}
          </p>
        ))}
      </div>
      {content.media.map((item) => (
        <div key={item.id} className="grid gap-3 rounded-2xl border border-border-subtle p-4">
          <p className="font-semibold">{item.title}</p>
          {item.availability !== 'ready' ? (
            <p className="text-sm text-ink-secondary">
              {item.message ?? 'Nội dung đa phương tiện chưa sẵn sàng.'}
            </p>
          ) : (
            children
          )}
        </div>
      ))}
    </article>
  )
}

export function LearningProgressSummary({
  progress,
  headingLevel = 3,
}: {
  progress: CourseProgressViewModel
  headingLevel?: HeadingLevel
}) {
  return (
    <Card>
      <CardHeader>
        <SemanticHeading
          level={headingLevel}
          className="font-display text-lg font-semibold tracking-tight"
        >
          Tiến độ khóa học
        </SemanticHeading>
      </CardHeader>
      <CardContent>
        <Progress
          value={progress.percent}
          label={
            progress.completedLabel ??
            `${progress.completedLessons} / ${progress.totalLessons} bài hoàn thành`
          }
        />
      </CardContent>
    </Card>
  )
}

export function AccessStatePanel({
  access,
  compact = false,
}: {
  access: CourseAccessViewModel
  compact?: boolean
}) {
  const config = {
    available: { tone: 'success' as const, title: access.label },
    'customer-preview': { tone: 'info' as const, title: access.label },
    restricted: { tone: 'warning' as const, title: access.label },
    'expired-display': { tone: 'warning' as const, title: access.label },
    loading: { tone: 'neutral' as const, title: access.label ?? 'Đang kiểm tra quyền truy cập' },
    error: { tone: 'danger' as const, title: access.label },
  }[access.kind]
  return (
    <div
      role={access.kind === 'error' ? 'alert' : 'status'}
      className={`flex items-start gap-2 rounded-xl border border-border-subtle bg-card-surface ${compact ? 'max-w-sm p-2.5' : 'p-4'}`}
    >
      <Badge tone={config.tone}>{config.title}</Badge>
      {!compact && access.kind === 'restricted' && (
        <p className="text-sm leading-6 text-ink-secondary">{access.reason}</p>
      )}
      {!compact && access.kind === 'expired-display' && (
        <p className="text-sm leading-6 text-ink-secondary">Hạn truy cập: {access.expiresAt}</p>
      )}
      {!compact && access.kind === 'error' && (
        <p className="text-sm leading-6 text-ink-secondary">{access.message}</p>
      )}
    </div>
  )
}

export function LockedContentPanel({
  access,
  onExplore,
}: {
  access: Extract<CourseAccessViewModel, { kind: 'restricted' | 'expired-display' }>
  onExplore?: () => void
}) {
  return (
    <Card className="mx-auto max-w-2xl border-warning-foreground/20 bg-warning-surface/40 p-6 sm:p-8">
      <div className="flex items-start gap-4">
        <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-card-surface">
          <FileLock aria-hidden="true" className="size-5 text-warning-foreground" />
        </span>
        <div className="space-y-2">
          <h2 className="font-display text-xl font-bold">{access.label}</h2>
          <p className="text-sm leading-6 text-ink-secondary">
            {access.kind === 'restricted'
              ? access.reason
              : `Quyền truy cập kết thúc vào ${access.expiresAt}.`}
          </p>
          {onExplore && (
            <Button variant="outline" onClick={onExplore}>
              Xem lựa chọn khóa học
            </Button>
          )}
        </div>
      </div>
    </Card>
  )
}

export function LessonCompletionIndicator({
  completed,
  label = 'Bài học đã hoàn thành',
}: {
  completed: boolean
  label?: string
}) {
  return (
    <div
      role="status"
      className={`inline-flex min-h-10 items-center gap-2 rounded-xl px-3 text-sm font-bold ${completed ? 'bg-success-surface text-success-foreground' : 'bg-surface-muted text-ink-secondary'}`}
    >
      {completed ? (
        <span className="grid size-6 place-items-center rounded-full bg-white/70">
          <Check aria-hidden="true" className="size-4" />
        </span>
      ) : (
        <span aria-hidden="true" className="size-5 rounded-full border-2 border-current/50" />
      )}
      {completed ? label : 'Chưa hoàn thành'}
    </div>
  )
}
