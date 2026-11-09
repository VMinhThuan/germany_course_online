import {
  ArrowRight,
  Check,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  RotateCcw,
  Send,
} from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router'
import { Button, Card, ConfirmDialog, InlineAlert, Progress } from '@/shared/ui'
import type { DialogRequest } from '@/shared/ui'
import { DomainState } from '@/domains/shared/presentation'
import type { ExerciseViewModel } from '@/domains/exercises/models'
import type {
  QuizAttemptViewModel,
  QuizOptionViewModel,
  QuizQuestionViewModel,
  QuizResultViewModel,
} from './models'
import { SemanticHeading, type HeadingLevel } from '@/domains/shared/heading'

export function QuizIntro({
  title,
  description,
  questionCount,
  maxScore,
  status = 'NOT_STARTED',
  onStart,
  headingLevel = 1,
}: {
  title: string
  description: string
  questionCount?: number
  maxScore?: string
  status?: 'NOT_STARTED' | 'IN_PROGRESS' | 'SUBMITTED'
  onStart?: () => void
  headingLevel?: HeadingLevel
}) {
  return (
    <Card className="grid gap-4 p-5 sm:p-7">
      <div>
        <div className="flex flex-wrap gap-2 text-sm font-semibold text-action-primary">
          {questionCount !== undefined && <span>{questionCount} câu hỏi</span>}
          {maxScore !== undefined && <span>· {maxScore} điểm</span>}
          {status === 'IN_PROGRESS' && <span>· Đang làm</span>}
          {status === 'SUBMITTED' && <span>· Đã nộp</span>}
        </div>
        <SemanticHeading level={headingLevel} className="mt-1 font-display text-2xl font-bold">
          {title}
        </SemanticHeading>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-ink-secondary">{description}</p>
      </div>
      {onStart && (
        <Button onClick={onStart}>
          {status === 'IN_PROGRESS'
            ? 'Tiếp tục làm bài'
            : status === 'SUBMITTED'
              ? 'Xem kết quả'
              : 'Bắt đầu làm bài'}
        </Button>
      )}
    </Card>
  )
}

export function QuizExerciseCard({ exercise }: { exercise: ExerciseViewModel & { href: string } }) {
  const title = exercise.quiz?.title ?? exercise.title
  const description = exercise.quiz?.description || exercise.description
  const status =
    exercise.status === 'COMPLETED'
      ? 'Đã hoàn thành'
      : exercise.status === 'IN_PROGRESS'
        ? 'Đang làm'
        : exercise.isRequired
          ? 'Bắt buộc'
          : 'Tùy chọn'

  return (
    <Link
      to={exercise.href}
      className="group grid min-w-0 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-2xl border border-brand-pink/80 bg-card-surface p-4 transition hover:-translate-y-0.5 hover:border-action-primary/50 hover:shadow-soft focus-visible:outline-2 focus-visible:outline-action-focus"
    >
      <span className="grid size-11 place-items-center rounded-xl bg-surface-pink text-action-primary">
        <ClipboardCheck aria-hidden="true" className="size-5" />
      </span>
      <span className="grid min-w-0 gap-1">
        <span className="text-xs font-bold uppercase tracking-wide text-action-primary">
          Bài kiểm tra
          {exercise.quiz ? ` · ${exercise.quiz.questionCount} câu` : ''}
        </span>
        <span className="truncate font-semibold text-ink-primary">{title}</span>
        {description ? (
          <span className="line-clamp-2 text-sm leading-5 text-ink-secondary">{description}</span>
        ) : null}
      </span>
      <span className="flex shrink-0 items-center gap-2 text-right text-xs font-semibold text-ink-secondary">
        <span className="hidden sm:inline">{status}</span>
        <ArrowRight
          aria-hidden="true"
          className="size-4 text-action-primary transition-transform group-hover:translate-x-0.5"
        />
      </span>
    </Link>
  )
}

export function QuizOption({
  option,
  name,
  checked,
  disabled,
  onSelect,
}: {
  option: QuizOptionViewModel
  name: string
  checked: boolean
  disabled?: boolean
  onSelect: (id: string) => void
}) {
  return (
    <label
      className={`flex min-h-12 cursor-pointer items-start gap-3 rounded-xl border p-3 transition-colors focus-within:ring-2 focus-within:ring-action-primary ${checked ? 'border-action-primary bg-surface-blue' : 'border-border-subtle hover:bg-surface-muted'} ${disabled ? 'cursor-not-allowed opacity-60' : ''}`}
    >
      <input
        className="mt-1 size-4 accent-[var(--action-primary)]"
        type="radio"
        name={name}
        value={option.id}
        checked={checked}
        disabled={disabled}
        onChange={() => onSelect(option.id)}
      />
      <span className="text-sm leading-6 text-ink-primary">{option.label}</span>
    </label>
  )
}

export function QuizQuestion({
  question,
  selectedOptionId,
  onSelect,
  disabled = false,
}: {
  question: QuizQuestionViewModel
  selectedOptionId?: string
  onSelect: (questionId: string, optionId: string) => void
  disabled?: boolean
}) {
  return (
    <fieldset className="grid gap-3">
      <legend className="mb-2 text-lg font-semibold leading-7 text-ink-primary">
        {question.prompt}
      </legend>
      {question.options.map((option) => (
        <QuizOption
          key={option.id}
          option={option}
          name={`question-${question.id}`}
          checked={selectedOptionId === option.id}
          disabled={disabled}
          onSelect={(optionId) => onSelect(question.id, optionId)}
        />
      ))}
    </fieldset>
  )
}

export function QuizQuestionNavigator({
  questions,
  selectedAnswers,
  currentId,
  onNavigate,
}: {
  questions: readonly QuizQuestionViewModel[]
  selectedAnswers: Readonly<Record<string, string | undefined>>
  currentId?: string
  onNavigate: (questionId: string) => void
}) {
  return (
    <nav
      aria-label="Câu hỏi trong bài kiểm tra"
      className="grid grid-cols-5 gap-2 sm:grid-cols-8 lg:grid-cols-4"
    >
      {questions.map((question, index) => (
        <Button
          key={question.id}
          size="sm"
          variant={currentId === question.id ? 'primary' : 'outline'}
          aria-current={currentId === question.id ? 'step' : undefined}
          aria-label={`Câu ${index + 1}${selectedAnswers[question.id] ? ', đã chọn đáp án' : ', chưa trả lời'}`}
          onClick={() => onNavigate(question.id)}
        >
          {selectedAnswers[question.id] ? <Check aria-hidden="true" /> : index + 1}
        </Button>
      ))}
    </nav>
  )
}

export function QuizProgress({ answered, total }: { answered: number; total: number }) {
  const percent = total > 0 ? (answered / total) * 100 : 0
  return <Progress value={percent} label={`${answered} / ${total} câu đã trả lời`} />
}

export function QuizSubmissionPanel({
  loading = false,
  disabled = false,
  onSubmit,
}: {
  loading?: boolean
  disabled?: boolean
  onSubmit: () => void
}) {
  return (
    <div className="border-t border-border-subtle pt-4">
      <Button
        className="w-full"
        loading={loading}
        disabled={disabled}
        onClick={onSubmit}
        endIcon={<Send aria-hidden="true" />}
      >
        Nộp bài
      </Button>
    </div>
  )
}

export function QuizRunner({
  attempt,
  currentQuestionIndex,
  onNavigate,
  onAnswer,
  onSubmit,
  onRetry,
  confirmBeforeSubmit = true,
  answerSaving = false,
}: {
  attempt: QuizAttemptViewModel
  currentQuestionIndex: number
  onNavigate: (index: number) => void
  onAnswer: (questionId: string, optionId: string) => void
  onSubmit: () => Promise<QuizResultViewModel>
  onRetry?: () => void
  confirmBeforeSubmit?: boolean
  answerSaving?: boolean
}) {
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string>()
  const [result, setResult] = useState<QuizResultViewModel>()
  const [confirmOpen, setConfirmOpen] = useState(false)
  const currentIndex = Math.max(0, Math.min(currentQuestionIndex, attempt.questions.length - 1))
  const question = attempt.questions[currentIndex]
  const selectedOptionId = question ? attempt.selectedAnswers[question.id] : undefined
  const answeredCount = attempt.questions.filter((item) =>
    Boolean(attempt.selectedAnswers[item.id]),
  ).length
  const unansweredCount = attempt.questions.length - answeredCount
  if (!question && attempt.questions.length === 0)
    return (
      <DomainState kind="empty" title="Chưa có câu hỏi" message="Bài kiểm tra chưa có nội dung." />
    )
  async function submit() {
    if (!attempt.capabilities.canSubmit || pending) return
    setError(undefined)
    setPending(true)
    try {
      setResult(await onSubmit())
    } catch {
      setError('Không gửi được bài kiểm tra. Hãy thử lại.')
    } finally {
      setPending(false)
    }
  }
  const confirmation: DialogRequest = {
    kind: 'confirm',
    title: unansweredCount > 0 ? `Còn ${unansweredCount} câu chưa trả lời` : 'Nộp bài kiểm tra?',
    description:
      unansweredCount > 0
        ? 'Bạn vẫn có thể nộp bài ngay. Câu chưa chọn đáp án sẽ không có phần xem kết quả.'
        : 'Sau khi nộp, lượt làm này sẽ kết thúc và kết quả được lưu.',
    confirmLabel: 'Vẫn nộp bài',
    cancelLabel: 'Quay lại làm tiếp',
    onConfirm: submit,
  }
  if (result) return <QuizResult result={result} {...(onRetry ? { onRetry } : {})} />
  return (
    <>
      <div className="grid min-w-0 items-start gap-4 lg:grid-cols-[minmax(0,1fr)_18rem]">
        <Card role="region" aria-label="Nội dung câu hỏi" className="grid min-w-0 gap-5 p-5 sm:p-7">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="font-semibold">
              Câu {currentIndex + 1} / {attempt.questions.length}
            </p>
            <p className="text-sm text-ink-secondary">Đã chọn {answeredCount} câu</p>
          </div>
          {question && (
            <QuizQuestion
              question={question}
              {...(selectedOptionId ? { selectedOptionId } : {})}
              onSelect={onAnswer}
              disabled={pending || answerSaving || attempt.status === 'SUBMITTED'}
            />
          )}
          {answerSaving && (
            <p role="status" aria-live="polite" className="text-sm text-ink-secondary">
              Đang lưu lựa chọn…
            </p>
          )}
          <div className="flex justify-between gap-3 border-t border-border-subtle pt-4">
            <Button
              variant="outline"
              disabled={currentIndex === 0}
              onClick={() => onNavigate(currentIndex - 1)}
              startIcon={<ChevronLeft aria-hidden="true" />}
            >
              Câu trước
            </Button>
            <Button
              variant="outline"
              disabled={currentIndex >= attempt.questions.length - 1}
              onClick={() => onNavigate(currentIndex + 1)}
              endIcon={<ChevronRight aria-hidden="true" />}
            >
              Câu tiếp
            </Button>
          </div>
          {error && (
            <InlineAlert tone="danger" title={error}>
              Kiểm tra kết nối rồi thử lại.
            </InlineAlert>
          )}
        </Card>
        <aside className="lg:sticky lg:top-24">
          <Card className="grid gap-4 p-4 sm:p-5">
            <div className="grid gap-2">
              <h2 className="font-semibold text-ink-primary">Danh sách câu</h2>
              <QuizProgress answered={answeredCount} total={attempt.questions.length} />
            </div>
            <QuizQuestionNavigator
              questions={attempt.questions}
              selectedAnswers={attempt.selectedAnswers}
              {...(question ? { currentId: question.id } : {})}
              onNavigate={(id) => onNavigate(attempt.questions.findIndex((item) => item.id === id))}
            />
            {unansweredCount > 0 && (
              <p className="text-sm text-ink-secondary">Còn {unansweredCount} câu chưa chọn.</p>
            )}
            {attempt.capabilities.canSubmit && attempt.status === 'IN_PROGRESS' && (
              <QuizSubmissionPanel
                loading={pending}
                disabled={answerSaving}
                onSubmit={() => (confirmBeforeSubmit ? setConfirmOpen(true) : void submit())}
              />
            )}
          </Card>
        </aside>
      </div>
      {confirmBeforeSubmit && (
        <ConfirmDialog open={confirmOpen} request={confirmation} onOpenChange={setConfirmOpen} />
      )}
    </>
  )
}

export function QuizResult({
  result,
  onRetry,
}: {
  result: QuizResultViewModel
  onRetry?: () => void
}) {
  return (
    <Card className="mx-auto grid w-full max-w-3xl gap-4 p-5 sm:p-7">
      <p className="text-sm font-semibold text-success-foreground">Đã nhận kết quả</p>
      <h2 className="font-display text-2xl font-bold">Kết quả bài làm</h2>
      {result.score !== undefined && (
        <div className="grid gap-1">
          <p className="text-lg tabular-nums">
            Điểm: {result.score}
            {result.maxScore !== undefined ? ` / ${result.maxScore}` : ''}
          </p>
          {result.maxScore && Number(result.maxScore) > 0 && (
            <p className="text-sm text-ink-secondary">
              Tỷ lệ: {((Number(result.score) / Number(result.maxScore)) * 100).toFixed(1)}%
            </p>
          )}
        </div>
      )}
      {result.correctCount !== undefined && (
        <p className="text-sm text-ink-secondary">
          {result.correctCount} / {result.totalQuestions} câu đúng
        </p>
      )}
      {result.passed !== undefined && result.passed !== null && (
        <p
          className={`w-fit rounded-full px-3 py-1 text-sm font-semibold ${result.passed ? 'bg-pastel-lime text-pastel-lime-ink' : 'bg-surface-pink text-ink-primary'}`}
        >
          {result.passed ? 'Đạt yêu cầu' : 'Chưa đạt yêu cầu'}
        </p>
      )}
      <QuizReview result={result} />
      <QuizRetryAction allowed={result.capabilities.canRetry} {...(onRetry ? { onRetry } : {})} />
    </Card>
  )
}

export function QuizReview({ result }: { result: QuizResultViewModel }) {
  if (!result.capabilities.canReviewAnswers)
    return (
      <p className="rounded-xl bg-surface-muted p-4 text-sm text-ink-secondary">
        Hệ thống chưa cho phép xem đáp án.
      </p>
    )
  if (!result.review?.length)
    return <p className="text-sm text-ink-secondary">Không có phần giải thích cho kết quả này.</p>
  return (
    <ol aria-label="Đáp án bài kiểm tra" className="grid gap-3">
      {result.review.map((item, index) => (
        <li key={item.questionId} className="rounded-xl border border-border-subtle p-4">
          <p className="font-semibold">
            Câu {index + 1}. {item.prompt}
          </p>
          {item.selectedOption || item.selectedOptionId ? (
            <>
              <p
                className={`mt-2 text-sm font-semibold ${item.isCorrect ? 'text-success-foreground' : 'text-danger-foreground'}`}
              >
                {item.isCorrect ? 'Bạn đã trả lời đúng.' : 'Bạn chưa trả lời đúng câu này.'}
              </p>
              {(item.correctOption || item.correctOptionId) && (
                <p className="mt-2 text-sm text-success-foreground">
                  Đáp án đúng: {item.correctOption ?? item.correctOptionId}
                </p>
              )}
              {item.explanation && (
                <p className="mt-2 text-sm leading-6 text-ink-secondary">{item.explanation}</p>
              )}
            </>
          ) : (
            <p className="mt-2 text-sm text-ink-secondary">
              Bạn chưa chọn đáp án. Hãy chọn đáp án để xem kết quả.
            </p>
          )}
        </li>
      ))}
    </ol>
  )
}

export function QuizRetryAction({ allowed, onRetry }: { allowed: boolean; onRetry?: () => void }) {
  if (!allowed || !onRetry) return null
  return (
    <Button variant="outline" onClick={onRetry} startIcon={<RotateCcw aria-hidden="true" />}>
      Làm bài mới
    </Button>
  )
}
