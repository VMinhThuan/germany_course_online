import { BookOpenText, CheckCircle2, Clock3, RotateCcw } from 'lucide-react'
import { useState } from 'react'
import { Button, Card, CardHeader, CardTitle, InlineAlert, Progress, Textarea } from '@/shared/ui'
import type { CourseProgressViewModel, LessonProgressItemViewModel, NoteSaveState } from './models'

export function ProgressRing({
  value,
  label,
  size = 112,
}: {
  value: number
  label: string
  size?: number
}) {
  const safeValue = Number.isFinite(value) ? Math.min(100, Math.max(0, value)) : 0
  const radius = 44
  const circumference = 2 * Math.PI * radius
  return (
    <div
      className="relative grid shrink-0 place-items-center"
      style={{ width: size, height: size }}
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(safeValue)}
    >
      <svg
        aria-hidden="true"
        viewBox="0 0 100 100"
        className="absolute inset-0 size-full -rotate-90"
      >
        <circle
          cx="50"
          cy="50"
          r={radius}
          fill="none"
          stroke="var(--surface-muted)"
          strokeWidth="8"
        />
        <circle
          cx="50"
          cy="50"
          r={radius}
          fill="none"
          stroke="var(--action-primary)"
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - safeValue / 100)}
        />
      </svg>
      <span className="font-display text-xl font-extrabold tabular-nums">
        {Math.round(safeValue)}%
      </span>
      <span className="sr-only">{label}</span>
    </div>
  )
}

export function CourseProgressCard({
  courseTitle,
  progress,
  href,
  onContinue,
}: {
  courseTitle: string
  progress: CourseProgressViewModel
  href?: string
  onContinue?: () => void
}) {
  return (
    <Card className="flex min-w-0 flex-col gap-4 p-5 sm:flex-row sm:items-center">
      <ProgressRing
        value={progress.percent}
        label={`${courseTitle}: ${Math.round(progress.percent)}% hoàn thành`}
      />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-action-primary">Tiến độ khóa học</p>
        <h2 className="mt-1 truncate font-display text-xl font-bold">{courseTitle}</h2>
        <p className="mt-1 text-sm text-ink-secondary">
          {progress.completedLabel ??
            `${progress.completedLessons} / ${progress.totalLessons} bài đã hoàn thành`}
        </p>
        <Progress value={progress.percent} label="Tiến độ hiện tại" className="mt-4" />
        {href && (
          <a
            href={href}
            className="mt-4 inline-flex min-h-11 items-center font-semibold text-action-primary underline-offset-4 hover:underline"
          >
            Xem tiến độ chi tiết
          </a>
        )}
        {onContinue && (
          <Button className="mt-4 sm:ml-3" onClick={onContinue}>
            Tiếp tục học
          </Button>
        )}
      </div>
    </Card>
  )
}

export function LearningStatsSummary({
  completedLessons,
  activeDaysLabel,
  coursesInProgress,
}: {
  completedLessons: number
  activeDaysLabel: string
  coursesInProgress: number
}) {
  const stats = [
    { label: 'Bài đã hoàn thành', value: String(completedLessons) },
    { label: 'Thời gian học', value: activeDaysLabel },
    { label: 'Khóa đang học', value: String(coursesInProgress) },
  ]
  return (
    <dl className="grid gap-3 sm:grid-cols-3">
      {stats.map((stat) => (
        <div
          key={stat.label}
          className="rounded-2xl border border-border-subtle bg-card-surface p-4"
        >
          <dt className="text-sm text-ink-secondary">{stat.label}</dt>
          <dd className="mt-1 font-display text-2xl font-extrabold tabular-nums">{stat.value}</dd>
        </div>
      ))}
    </dl>
  )
}

export function ContinueLearningCard({
  lessonTitle,
  courseTitle,
  lastAccessedLabel,
  href,
  onContinue,
}: {
  lessonTitle: string
  courseTitle: string
  lastAccessedLabel?: string
  href?: string
  onContinue?: () => void
}) {
  return (
    <Card className="grid min-w-0 gap-4 p-5 sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:items-center">
      <span className="grid size-12 place-items-center rounded-2xl bg-surface-lime text-pastel-lime-ink">
        <BookOpenText aria-hidden="true" className="size-6" />
      </span>
      <div className="min-w-0">
        <p className="text-sm text-ink-secondary">Tiếp tục {courseTitle}</p>
        <h2 className="mt-1 truncate font-display text-lg font-bold">{lessonTitle}</h2>
        {lastAccessedLabel && (
          <p className="mt-1 inline-flex items-center gap-1 text-xs text-ink-muted">
            <Clock3 aria-hidden="true" className="size-3" />
            {lastAccessedLabel}
          </p>
        )}
      </div>
      {href ? (
        <a
          href={href}
          className="inline-flex min-h-11 items-center justify-center rounded-control bg-action-primary px-4 font-semibold text-white hover:bg-action-primary-hover"
        >
          Tiếp tục
        </a>
      ) : (
        <Button onClick={onContinue}>Tiếp tục</Button>
      )}
    </Card>
  )
}

export function LessonProgressList({
  lessons,
}: {
  lessons: readonly LessonProgressItemViewModel[]
}) {
  if (lessons.length === 0)
    return (
      <p className="rounded-xl bg-surface-muted p-4 text-sm text-ink-secondary">
        Chưa có hoạt động học tập.
      </p>
    )
  return (
    <ol
      aria-label="Tiến độ từng bài học"
      className="divide-y divide-border-subtle rounded-2xl border border-border-subtle bg-card-surface"
    >
      {lessons.map((lesson) => (
        <li
          key={lesson.lessonId}
          className="flex min-h-14 items-center justify-between gap-3 px-4 py-3"
        >
          <div className="min-w-0">
            <p className="truncate font-medium">{lesson.title}</p>
            <p className="mt-1 text-xs text-ink-muted">
              {lesson.status === 'COMPLETED'
                ? 'Hoàn thành'
                : lesson.status === 'IN_PROGRESS'
                  ? 'Đang học'
                  : 'Chưa bắt đầu'}
            </p>
          </div>
          {lesson.href && (
            <a
              href={lesson.href}
              className="min-h-11 shrink-0 px-2 py-3 text-sm font-semibold text-action-primary underline-offset-4 hover:underline"
            >
              Mở bài
            </a>
          )}
        </li>
      ))}
    </ol>
  )
}

export function NoteSaveStatus({ state }: { state: NoteSaveState }) {
  const labels: Record<NoteSaveState, string> = {
    idle: 'Chưa chỉnh sửa',
    dirty: 'Có thay đổi chưa lưu',
    saving: 'Đang lưu ghi chú',
    saved: 'Đã lưu',
    error: 'Lưu thất bại',
  }
  return (
    <p
      role={state === 'error' ? 'alert' : 'status'}
      className={`inline-flex min-h-6 items-center gap-2 text-sm ${state === 'error' ? 'text-danger-foreground' : 'text-ink-secondary'}`}
    >
      {state === 'saved' && (
        <CheckCircle2 aria-hidden="true" className="size-4 text-success-foreground" />
      )}
      {labels[state]}
    </p>
  )
}

export function LessonNotesEditor({
  initialValue,
  value,
  onChange,
  onSave,
}: {
  initialValue: string
  value: string
  onChange: (value: string) => void
  onSave: (value: string) => Promise<void> | void
}) {
  const [savedValue, setSavedValue] = useState(initialValue)
  const [state, setState] = useState<NoteSaveState>(value === initialValue ? 'idle' : 'dirty')
  const [error, setError] = useState(false)
  const [pending, setPending] = useState(false)
  const dirty = value !== savedValue
  async function save() {
    if (!dirty || pending) return
    setPending(true)
    setState('saving')
    setError(false)
    try {
      await onSave(value)
      setSavedValue(value)
      setState('saved')
    } catch {
      setState('error')
      setError(true)
    } finally {
      setPending(false)
    }
  }
  return (
    <Card className="grid gap-4 p-5">
      <CardHeader className="p-0">
        <CardTitle>Ghi chú của bạn</CardTitle>
      </CardHeader>
      <label className="grid gap-2">
        <span className="text-sm font-semibold">Nội dung ghi chú</span>
        <Textarea
          value={value}
          onChange={(event) => {
            onChange(event.target.value)
            if (!pending) setState('dirty')
          }}
          aria-describedby="lesson-note-status"
        />
      </label>
      {error && (
        <InlineAlert tone="danger" title="Chưa lưu được ghi chú">
          Kiểm tra kết nối rồi thử lưu lại.
        </InlineAlert>
      )}
      {state === 'dirty' && !dirty && <span className="sr-only">Không có thay đổi mới.</span>}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span id="lesson-note-status">
          <NoteSaveStatus state={pending ? 'saving' : error ? 'error' : dirty ? 'dirty' : state} />
        </span>
        <Button
          loading={pending}
          disabled={!dirty}
          onClick={() => void save()}
          startIcon={error ? <RotateCcw aria-hidden="true" /> : undefined}
        >
          {error ? 'Thử lưu lại' : 'Lưu ghi chú'}
        </Button>
      </div>
    </Card>
  )
}
