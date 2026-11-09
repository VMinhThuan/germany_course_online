import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { CouponField, EnrollmentStatusCard, PaymentStatusPanel } from '@/domains/commerce'
import { LessonNotesEditor, NoteSaveStatus, ProgressRing } from '@/domains/progress'
import { QuizIntro, QuizOption, QuizResult, QuizReview, QuizRunner } from '@/domains/quizzes'
import { MOCK_QUIZ_ATTEMPT, MOCK_QUIZ_RESULT } from '@/data/mock'

function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (reason?: unknown) => void
  const promise = new Promise<T>((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

describe('quiz components', () => {
  it('selects one option using the native radio interaction', async () => {
    const user = userEvent.setup()
    const onSelect = vi.fn()
    render(
      <QuizOption
        option={MOCK_QUIZ_ATTEMPT.questions[0]!.options[0]!}
        name="question-one"
        checked={false}
        onSelect={onSelect}
      />,
    )
    await user.click(screen.getByRole('radio', { name: 'Guten Morgen!' }))
    expect(onSelect).toHaveBeenCalledWith('option-guten-morgen')
  })

  it('keeps grading outside quiz start data and displays answers only when permitted', () => {
    const attemptJson = JSON.stringify(MOCK_QUIZ_ATTEMPT)
    expect(attemptJson).not.toContain('isCorrect')
    expect(attemptJson).not.toContain('correctOptionId')
    const { rerender } = render(
      <QuizResult
        result={{ ...MOCK_QUIZ_RESULT, capabilities: { canReviewAnswers: false, canRetry: false } }}
      />,
    )
    expect(screen.getByText('Hệ thống chưa cho phép xem đáp án.')).toBeVisible()
    expect(screen.queryByText(/Đáp án đúng:/)).not.toBeInTheDocument()
    rerender(<QuizResult result={MOCK_QUIZ_RESULT} onRetry={() => undefined} />)
    expect(screen.getAllByText(/Đáp án đúng:/)).toHaveLength(2)
    expect(screen.getByRole('button', { name: 'Làm bài mới' })).toBeVisible()
  })

  it('shows loading and error feedback when quiz submission rejects', async () => {
    const user = userEvent.setup()
    const submission = deferred<typeof MOCK_QUIZ_RESULT>()
    render(
      <QuizRunner
        attempt={MOCK_QUIZ_ATTEMPT}
        currentQuestionIndex={0}
        onNavigate={() => undefined}
        onAnswer={() => undefined}
        onSubmit={() => submission.promise}
      />,
    )
    await user.click(screen.getByRole('button', { name: 'Nộp bài' }))
    expect(screen.getByRole('alertdialog')).toHaveTextContent('Còn 2 câu chưa trả lời')
    await user.click(screen.getByRole('button', { name: 'Vẫn nộp bài' }))
    expect(screen.getByRole('button', { name: 'Vẫn nộp bài' })).toBeDisabled()
    submission.reject(new Error('Network unavailable'))
    expect(await screen.findByRole('alert')).toHaveTextContent('Không gửi được bài kiểm tra')
    await waitFor(() => expect(screen.getByRole('button', { name: 'Nộp bài' })).toBeEnabled())
  })

  it('shows the right-side navigator and keeps blank-answer feedback free of answer keys', () => {
    const unansweredResult = {
      ...MOCK_QUIZ_RESULT,
      review: [
        {
          questionId: 'question-blank',
          prompt: 'Câu hỏi chưa làm',
          isCorrect: false,
        },
      ],
    }
    const { rerender } = render(
      <QuizRunner
        attempt={MOCK_QUIZ_ATTEMPT}
        currentQuestionIndex={0}
        onNavigate={() => undefined}
        onAnswer={() => undefined}
        onSubmit={async () => MOCK_QUIZ_RESULT}
      />,
    )
    expect(screen.getByRole('region', { name: 'Nội dung câu hỏi' })).toBeVisible()
    expect(screen.getByRole('navigation', { name: 'Câu hỏi trong bài kiểm tra' })).toBeVisible()

    rerender(<QuizReview result={unansweredResult} />)
    expect(screen.getByText('Bạn chưa chọn đáp án. Hãy chọn đáp án để xem kết quả.')).toBeVisible()
    expect(screen.queryByText(/Đáp án đúng:/)).not.toBeInTheDocument()
  })

  it('shows a persisted attempt status and disables answer controls while saving', () => {
    const onStart = vi.fn()
    const { rerender } = render(
      <QuizIntro
        title="Verbkonjugation"
        description="Chọn một đáp án."
        questionCount={20}
        status="IN_PROGRESS"
        onStart={onStart}
      />,
    )
    expect(screen.getByText('· Đang làm')).toBeVisible()
    expect(screen.getByRole('button', { name: 'Tiếp tục làm bài' })).toBeVisible()

    rerender(
      <QuizRunner
        attempt={MOCK_QUIZ_ATTEMPT}
        currentQuestionIndex={0}
        onNavigate={() => undefined}
        onAnswer={() => undefined}
        onSubmit={async () => MOCK_QUIZ_RESULT}
        answerSaving
      />,
    )
    expect(screen.getByRole('status')).toHaveTextContent('Đang lưu lựa chọn')
    expect(screen.getByRole('radio', { name: 'Guten Morgen!' })).toBeDisabled()
  })
})

describe('progress and notes', () => {
  it('presents the repository supplied progress percentage', () => {
    render(<ProgressRing value={29} label="Khóa A1.1" />)
    expect(screen.getByRole('progressbar', { name: 'Khóa A1.1' })).toHaveAttribute(
      'aria-valuenow',
      '29',
    )
    expect(screen.getByText('29%')).toBeVisible()
  })

  it('retries a failed note save and then shows the saved state', async () => {
    const user = userEvent.setup()
    const onSave = vi
      .fn()
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValueOnce(undefined)
    render(
      <LessonNotesEditor
        initialValue="old note"
        value="new note"
        onChange={() => undefined}
        onSave={onSave}
      />,
    )
    await user.click(screen.getByRole('button', { name: 'Lưu ghi chú' }))
    expect(await screen.findByText('Lưu thất bại')).toBeVisible()
    await user.click(screen.getByRole('button', { name: 'Thử lưu lại' }))
    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(2))
    expect(await screen.findByText('Đã lưu')).toBeVisible()
  })

  it('announces each note save status', () => {
    render(<NoteSaveStatus state="saved" />)
    expect(screen.getByRole('status')).toHaveTextContent('Đã lưu')
  })
})

describe('commerce and enrollment states', () => {
  it('keeps pending payment from showing a course access action', () => {
    const pendingOrder = {
      id: 'pending',
      orderCode: 'PENDING',
      orderType: 'PURCHASE' as const,
      status: 'PENDING' as const,
      itemTitle: 'A1.1',
      amountVnd: '1290000',
      createdAt: '2026-11-02T08:00:00.000Z',
      paymentStatus: 'PENDING' as const,
    }
    render(<PaymentStatusPanel order={pendingOrder} canOpenCourse onOpenCourse={() => undefined} />)
    expect(screen.getByRole('status')).toHaveTextContent('Quyền truy cập khóa học chưa được cấp')
    expect(screen.queryByRole('button', { name: 'Mở khóa học' })).not.toBeInTheDocument()
  })

  it('shows enrollment expiry as a derived display while preserving ACTIVE status', () => {
    render(
      <EnrollmentStatusCard
        enrollment={{
          id: 'enr',
          courseId: 'a11',
          courseTitle: 'A1.1',
          status: 'ACTIVE',
          expiresAt: '2026-10-01T08:00:00.000Z',
          accessState: 'expired-display',
        }}
      />,
    )
    expect(screen.getByText('Đã hết hạn')).toBeVisible()
    expect(screen.queryByText('EXPIRED')).not.toBeInTheDocument()
  })

  it('handles coupon pending, a returned invalid result, and network error', async () => {
    const user = userEvent.setup()
    const response = deferred<{ kind: 'invalid'; code: string; message: string; status: number }>()
    const onValidate = vi.fn(() => response.promise)
    render(<CouponField onValidate={onValidate} />)
    await user.type(screen.getByRole('textbox', { name: 'Mã ưu đãi' }), 'A11-DEMO')
    await user.click(screen.getByRole('button', { name: 'Kiểm tra mã' }))
    expect(screen.getByRole('button', { name: 'Kiểm tra mã' })).toBeDisabled()
    response.resolve({
      kind: 'invalid',
      code: 'A11-DEMO',
      message: 'Mã không hợp lệ.',
      status: 422,
    })
    expect(await screen.findByRole('status')).toHaveTextContent('Mã không hợp lệ.')

    const { rerender } = render(
      <CouponField
        onValidate={async () => {
          throw new Error('offline')
        }}
      />,
    )
    await user.type(screen.getAllByRole('textbox', { name: 'Mã ưu đãi' })[1]!, 'A11-DEMO')
    await user.click(screen.getAllByRole('button', { name: 'Kiểm tra mã' })[1]!)
    expect(await screen.findByRole('alert')).toHaveTextContent('Không thể kiểm tra mã ưu đãi')
    rerender(
      <CouponField
        onValidate={async () => ({
          kind: 'invalid',
          code: 'A11-DEMO',
          message: 'Mã không hợp lệ.',
          status: 422,
        })}
      />,
    )
  })
})
