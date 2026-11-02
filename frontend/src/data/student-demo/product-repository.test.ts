import { describe, expect, it } from 'vitest'
import { createStudentDemoRepositories } from './repository'
import { DEMO_COURSE_ID, DEMO_NOW } from './fixtures'

class MemoryStorage implements Storage {
  private values = new Map<string, string>()
  get length() {
    return this.values.size
  }
  clear() {
    this.values.clear()
  }
  getItem(key: string) {
    return this.values.get(key) ?? null
  }
  key(index: number) {
    return [...this.values.keys()][index] ?? null
  }
  removeItem(key: string) {
    this.values.delete(key)
  }
  setItem(key: string, value: string) {
    this.values.set(key, String(value))
  }
}

function makeRepositories(storage = new MemoryStorage(), now = DEMO_NOW) {
  return createStudentDemoRepositories({ latencyMs: 0, storage, now })
}

describe('student product repository', () => {
  it('gates lesson and exercise content from repository entitlement', async () => {
    const repositories = makeRepositories()
    const session = await repositories.auth.signInWithDemoAccount('expired-entitlement')
    const lesson = await repositories.learning.getLesson(session.id, 'a11-lesson-01')
    const exercise = await repositories.learning.getExercise(session.id, 'exercise-a11-greeting')

    expect(lesson.access.kind).toBe('expired-display')
    expect(lesson.paragraphs).toEqual([])
    expect(lesson.media).toEqual([])
    expect(exercise.assets).toEqual([])
    await expect(
      repositories.learning.completeExercise(session.id, exercise.id),
    ).rejects.toMatchObject({ status: 403 })
  })

  it('unlocks only the completed file exercise solutions and keeps progress synchronized', async () => {
    const repositories = makeRepositories()
    const session = await repositories.auth.signInWithDemoAccount('active-student')
    const file = await repositories.learning.getExercise(session.id, 'exercise-a11-greeting')
    const optional = await repositories.learning.getExercise(
      session.id,
      'exercise-a11-vocabulary-review',
    )
    expect(file.capabilities.canViewSolutions).toBe(false)
    expect(file.assets.some((asset) => asset.role === 'ANSWER_PDF')).toBe(false)

    await repositories.learning.completeExercise(session.id, file.id)
    const solvedFile = await repositories.learning.getExercise(session.id, file.id)
    const unchangedOptional = await repositories.learning.getExercise(session.id, optional.id)
    expect(solvedFile.capabilities.canViewSolutions).toBe(true)
    expect(solvedFile.assets.some((asset) => asset.role === 'ANSWER_PDF')).toBe(true)
    expect(unchangedOptional.capabilities.canViewSolutions).toBe(false)
  })

  it('keeps quiz keys out of attempts, preserves old results, and creates a new retry attempt', async () => {
    const repositories = makeRepositories()
    const session = await repositories.auth.signInWithDemoAccount('active-student')
    await repositories.learning.completeExercise(session.id, 'exercise-a11-greeting')
    const attempt = await repositories.learning.startQuiz(session.id, 'exercise-a11-greeting-quiz')
    expect(JSON.stringify(attempt)).not.toMatch(/correctOption|answerKey|isCorrect/i)
    await repositories.learning.selectQuizAnswer(
      session.id,
      attempt.id,
      'question-greeting-01',
      'option-guten-morgen',
    )
    await repositories.learning.selectQuizAnswer(
      session.id,
      attempt.id,
      'question-name-01',
      'option-ich-heisse',
    )
    const result = await repositories.learning.submitQuiz(session.id, attempt.id)
    const retry = await repositories.learning.retryQuiz(session.id, attempt.id)

    expect(result.correctCount).toBe(2)
    expect(retry.id).not.toBe(attempt.id)
    expect((await repositories.learning.getQuizResult(session.id, attempt.id)).correctCount).toBe(2)
    expect((await repositories.learning.getQuizAttempt(session.id, attempt.id)).status).toBe(
      'SUBMITTED',
    )
    expect((await repositories.learning.getQuizAttempt(session.id, retry.id)).status).toBe(
      'IN_PROGRESS',
    )
    expect(
      (await repositories.learning.getProgress(session.id, DEMO_COURSE_ID)).completedLessons,
    ).toBe(1)
  })

  it('uses one repository-derived progress value for lesson, course and dashboard', async () => {
    const repositories = makeRepositories()
    const session = await repositories.auth.signInWithDemoAccount('active-student')
    await repositories.learning.completeExercise(session.id, 'exercise-a11-greeting')
    const attempt = await repositories.learning.startQuiz(session.id, 'exercise-a11-greeting-quiz')
    await repositories.learning.submitQuiz(session.id, attempt.id)
    const progress = await repositories.learning.getProgress(session.id, DEMO_COURSE_ID)
    const overview = await repositories.learning.getCourseOverview(session.id, DEMO_COURSE_ID)
    const dashboard = await repositories.student.getDashboard(session.id)

    expect(progress).toEqual(overview.progress)
    expect(dashboard.courses[0]?.progress).toEqual(progress)
    expect(
      overview.tree.sections
        .flatMap((section) => section.lessons)
        .find((lesson) => lesson.id === 'a11-lesson-01')?.progressStatus,
    ).toBe('COMPLETED')
  })

  it('scopes lesson notes to the account and restores persisted state after reload', async () => {
    const storage = new MemoryStorage()
    const first = makeRepositories(storage)
    const session = await first.auth.signInWithDemoAccount('active-student')
    await first.learning.saveLessonNote(session.id, 'a11-lesson-01', 'Mein eigener Lernhinweis.')

    const restoredRepositories = makeRepositories(storage)
    const restored = await restoredRepositories.auth.restoreSession()
    expect(restored?.userId).toBe(session.userId)
    expect(await restoredRepositories.learning.getLessonNote(restored!.id, 'a11-lesson-01')).toBe(
      'Mein eigener Lernhinweis.',
    )

    const otherAccount = makeRepositories(storage)
    const other = await otherAccount.auth.signInWithDemoAccount('partially-completed-student')
    expect(await otherAccount.learning.getLessonNote(other.id, 'a11-lesson-01')).toBe('')
  })

  it('keeps pending and failed orders locked; only a successful mock transition grants enrollment', async () => {
    const repositories = makeRepositories()
    const session = await repositories.auth.signInWithDemoAccount('registered-without-enrollment')
    const pending = await repositories.commerce.createOrder(
      session.id,
      `purchase-${DEMO_COURSE_ID}`,
    )
    expect(pending.order.status).toBe('PENDING')
    expect(pending.enrollment).toBeUndefined()
    expect(pending.access.kind).toBe('restricted')

    const failed = await repositories.commerce.simulateDemoPayment(
      session.id,
      pending.order.id,
      'failure',
    )
    expect(failed.order.status).toBe('FAILED')
    expect(failed.enrollment).toBeUndefined()
    await expect(
      repositories.learning
        .getLesson(session.id, 'a11-lesson-01')
        .then((lesson) => lesson.access.kind),
    ).resolves.toBe('restricted')

    const nextOrder = await repositories.commerce.createOrder(
      session.id,
      `purchase-${DEMO_COURSE_ID}`,
    )
    const paid = await repositories.commerce.simulateDemoPayment(
      session.id,
      nextOrder.order.id,
      'success',
    )
    expect(paid.order.status).toBe('PAID')
    expect(paid.order.paymentStatus).toBe('SUCCESS')
    expect(paid.enrollment?.status).toBe('ACTIVE')
    expect(paid.access.kind).toBe('available')
    expect((await repositories.student.getDashboard(session.id)).courses[0]?.enrollment.id).toBe(
      paid.enrollment?.id,
    )
  })

  it('quotes integer-string VND in the repository and validates coupon failures', async () => {
    const repositories = makeRepositories()
    const session = await repositories.auth.signInWithDemoAccount('registered-without-enrollment')
    const context = `purchase-${DEMO_COURSE_ID}`
    const quote = await repositories.commerce.getCheckoutContext(
      session.id,
      context,
      undefined,
      'DEMO10',
    )
    const amount = BigInt(quote.originalAmountVnd)
    expect(quote.discountAmountVnd).toBe((amount / 10n).toString())
    expect(quote.totalAmountVnd).toBe((amount - amount / 10n).toString())
    expect(quote.couponCode).toBe('DEMO10')
    expect(
      await repositories.commerce.validateCoupon(session.id, context, 'BADCODE'),
    ).toMatchObject({ kind: 'invalid' })
  })

  it('extends an expired enrollment from the mock payment time on successful renewal', async () => {
    const repositories = makeRepositories()
    const session = await repositories.auth.signInWithDemoAccount('expired-entitlement')
    const plan = (await repositories.commerce.getRenewalPlans(session.id, DEMO_COURSE_ID))[0]!
    const context = `renewal-${DEMO_COURSE_ID}`
    const order = await repositories.commerce.createOrder(session.id, context, { planId: plan.id })
    const result = await repositories.commerce.simulateDemoPayment(
      session.id,
      order.order.id,
      'success',
    )
    expect(result.enrollment?.expiresAt).toBe('2026-12-02T08:00:00.000Z')
    expect(result.access.kind).toBe('available')
  })

  it('updates profile and invalidates the active session after password change', async () => {
    const repositories = makeRepositories()
    const session = await repositories.auth.signInWithDemoAccount('active-student')
    const updated = await repositories.account.updateProfile(session.id, {
      displayName: 'An learner',
    })
    expect(updated.displayName).toBe('An learner')
    await repositories.account.changePassword(session.id, 'DemoPass123!', 'new-password-123')
    await expect(repositories.student.getDashboard(session.id)).rejects.toMatchObject({
      code: 'SESSION_REVOKED',
    })
  })
})
