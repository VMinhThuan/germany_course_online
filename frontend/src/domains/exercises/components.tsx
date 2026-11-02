import { CheckCircle2, FileQuestion, LockKeyhole } from 'lucide-react'
import { useState } from 'react'
import { Badge, Button, Card, CardHeader, InlineAlert } from '@/shared/ui'
import { MediaFallbackLink } from '@/domains/media/components'
import type { ExerciseViewModel } from './models'
import { SemanticHeading, type HeadingLevel } from '@/domains/shared/heading'

export function ExerciseHeader({
  exercise,
  headingLevel = 1,
}: {
  exercise: ExerciseViewModel
  headingLevel?: HeadingLevel
}) {
  return (
    <header className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <p className="text-sm font-semibold text-action-primary">
          {exercise.exerciseType === 'FILE_BASED' ? 'Bài tập tài liệu' : 'Bài tập quiz'}
          {exercise.isRequired ? ' · Bắt buộc' : ' · Tùy chọn'}
        </p>
        <SemanticHeading level={headingLevel} className="mt-1 font-display text-2xl font-bold">
          {exercise.title}
        </SemanticHeading>
      </div>
      <ExerciseStatusBadge status={exercise.status} />
    </header>
  )
}

export function ExerciseInstruction({
  title = 'Hướng dẫn',
  children,
}: {
  title?: string
  children: string
}) {
  return (
    <section className="rounded-2xl bg-surface-blue p-5">
      <h2 className="font-semibold text-ink-primary">{title}</h2>
      <p className="mt-2 whitespace-pre-line text-sm leading-7 text-ink-secondary">{children}</p>
    </section>
  )
}

export function ExerciseAssetList({ exercise }: { exercise: ExerciseViewModel }) {
  const questionAssets = exercise.assets.filter(
    (asset) => asset.role === 'QUESTION_PDF' || asset.role === 'QUESTION_AUDIO',
  )
  if (questionAssets.length === 0)
    return (
      <p className="rounded-xl bg-surface-muted p-4 text-sm text-ink-secondary">
        Chưa có tài liệu đính kèm.
      </p>
    )
  return (
    <ul aria-label="Tài liệu bài tập" className="grid gap-2">
      {questionAssets.map((asset) => (
        <li
          key={asset.id}
          className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border-subtle p-3"
        >
          <span className="flex min-w-0 items-center gap-2 font-medium">
            <FileQuestion aria-hidden="true" className="size-4 shrink-0 text-action-primary" />
            {asset.title}
          </span>
          <MediaFallbackLink
            {...(asset.src ? { src: asset.src } : {})}
            title={asset.title}
            canDownload={asset.canDownload}
          />
        </li>
      ))}
    </ul>
  )
}

export function FileExercisePanel({
  exercise,
  onComplete,
}: {
  exercise: ExerciseViewModel
  onComplete?: () => Promise<void> | void
}) {
  return (
    <Card className="grid gap-5 p-5 sm:p-6">
      <CardHeader className="p-0">
        <h2 className="font-display text-lg font-semibold tracking-tight">{exercise.title}</h2>
        <p className="text-sm leading-6 text-ink-secondary">{exercise.description}</p>
      </CardHeader>
      <ExerciseInstruction>{exercise.instructions}</ExerciseInstruction>
      <ExerciseAssetList exercise={exercise} />
      <ExerciseCompletionAction exercise={exercise} {...(onComplete ? { onComplete } : {})} />
      <ExerciseSolutionPanel exercise={exercise} />
    </Card>
  )
}

export function ExerciseCompletionAction({
  exercise,
  onComplete,
}: {
  exercise: ExerciseViewModel
  onComplete?: () => Promise<void> | void
}) {
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string>()
  async function complete() {
    if (!exercise.capabilities.canMarkComplete || !onComplete) return
    setError(undefined)
    setPending(true)
    try {
      await onComplete()
    } catch {
      setError('Chưa lưu được trạng thái hoàn thành. Hãy thử lại.')
    } finally {
      setPending(false)
    }
  }
  if (exercise.status === 'COMPLETED')
    return (
      <p
        role="status"
        className="flex min-h-11 items-center gap-2 font-semibold text-success-foreground"
      >
        <CheckCircle2 aria-hidden="true" className="size-5" />
        Bài tập đã hoàn thành
      </p>
    )
  return (
    <div className="grid justify-items-start gap-2">
      {error && (
        <InlineAlert tone="danger" title={error}>
          Kiểm tra kết nối rồi thử lại.
        </InlineAlert>
      )}
      {exercise.capabilities.canMarkComplete && (
        <Button loading={pending} onClick={() => void complete()}>
          Đánh dấu hoàn thành
        </Button>
      )}
    </div>
  )
}

export function ExerciseStatusBadge({ status }: { status: ExerciseViewModel['status'] }) {
  const display =
    status === 'COMPLETED' ? 'Hoàn thành' : status === 'IN_PROGRESS' ? 'Đang làm' : 'Chưa bắt đầu'
  const tone = status === 'COMPLETED' ? 'success' : status === 'IN_PROGRESS' ? 'info' : 'neutral'
  return <Badge tone={tone}>{display}</Badge>
}

export function ExerciseSolutionPanel({ exercise }: { exercise: ExerciseViewModel }) {
  const solutions = exercise.assets.filter(
    (asset) => asset.role === 'ANSWER_PDF' || asset.role === 'SOLUTION_VIDEO',
  )
  if (!exercise.capabilities.canViewSolutions)
    return (
      <section className="flex items-start gap-3 rounded-xl border border-border-subtle bg-surface-muted p-4">
        <LockKeyhole aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-ink-muted" />
        <div>
          <h2 className="font-semibold">Đáp án</h2>
          <p className="mt-1 text-sm text-ink-secondary">
            Đáp án chỉ hiển thị khi hệ thống cho phép.
          </p>
        </div>
      </section>
    )
  return (
    <section className="grid gap-2 rounded-xl border border-success-foreground/20 bg-success-surface/50 p-4">
      <h2 className="font-semibold">Lời giải của bài tập này</h2>
      {solutions.length ? (
        <ul className="grid gap-2">
          {solutions.map((asset) => (
            <li key={asset.id}>
              <MediaFallbackLink
                {...(asset.src ? { src: asset.src } : {})}
                title={asset.title}
                canDownload={asset.canDownload}
              />
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-ink-secondary">Chưa có lời giải cho bài tập này.</p>
      )}
    </section>
  )
}
