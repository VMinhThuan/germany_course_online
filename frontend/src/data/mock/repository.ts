import type {
  CourseAccessViewModel,
  CourseDetailModel,
  CourseSummaryModel,
} from '@/domains/catalog/models'
import type { StudentProfileViewModel, SessionSummaryViewModel } from '@/domains/account/models'
import type { CouponValidationViewModel, OrderSummaryViewModel } from '@/domains/commerce/models'
import type { ExerciseViewModel } from '@/domains/exercises/models'
import type { EnrollmentSummaryViewModel } from '@/domains/enrollment/models'
import type { LessonContentViewModel, CourseTreeViewModel } from '@/domains/learning/models'
import type { QuizAttemptViewModel, QuizResultViewModel } from '@/domains/quizzes/models'
import type { CourseProgressViewModel } from '@/domains/progress/models'
import {
  A11_COURSE,
  MOCK_EXERCISE,
  MOCK_MEDIA,
  MOCK_QUIZ_ATTEMPT,
  MOCK_QUIZ_RESULT,
  MOCK_SCENARIO_FIXTURES,
} from './fixtures'
import {
  genericApiMessage,
  mapApiFailure,
  type KnownApiErrorEnvelope,
  type RepositoryError,
} from './errors'
import { DEFAULT_SCENARIO_CLOCK, type ScenarioClock } from './scenario-clock'
import type {
  MockFailureConfig,
  MockResponseMode,
  MockScenarioId,
  SupportedMockStatus,
} from './scenario-types'

export interface LmsRepository {
  getCourseCatalog(): Promise<readonly CourseSummaryModel[]>
  getCourseDetails(courseId: string): Promise<CourseDetailModel>
  getCourseAccess(): Promise<CourseAccessViewModel>
  getCourseTree(): Promise<CourseTreeViewModel>
  getLessonContent(lessonId: string): Promise<LessonContentViewModel>
  getExercise(exerciseId: string): Promise<ExerciseViewModel>
  completeExercise(exerciseId: string): Promise<ExerciseViewModel>
  getQuizAttempt(attemptId: string): Promise<QuizAttemptViewModel>
  submitQuiz(
    attemptId: string,
    answers: Readonly<Record<string, string>>,
  ): Promise<QuizResultViewModel>
  getCourseProgress(): Promise<CourseProgressViewModel>
  getLessonNote(lessonId: string): Promise<string>
  saveLessonNote(lessonId: string, value: string): Promise<string>
  validateCoupon(code: string): Promise<CouponValidationViewModel>
  getOrders(): Promise<readonly OrderSummaryViewModel[]>
  getEnrollment(courseId: string): Promise<EnrollmentSummaryViewModel | null>
  getProfile(): Promise<StudentProfileViewModel | null>
  saveProfile(displayName: string): Promise<StudentProfileViewModel>
  getSessions(): Promise<readonly SessionSummaryViewModel[]>
}

export interface MockRepositoryOptions {
  clock?: ScenarioClock
  responseMode?: MockResponseMode
  failure?: MockFailureConfig
  latencyMs?: number
}

export class MockRepositoryFailure extends Error {
  readonly failure: RepositoryError

  constructor(failure: RepositoryError) {
    super(failure.message)
    this.name = 'MockRepositoryFailure'
    this.failure = failure
  }
}

const allowedStatuses = new Set<SupportedMockStatus>([401, 403, 404, 409, 422, 429, 500])

function clone<T>(value: T): T {
  return structuredClone(value)
}

export function createMockRepository(
  scenario: MockScenarioId,
  options: MockRepositoryOptions = {},
): LmsRepository {
  const fixture = clone(MOCK_SCENARIO_FIXTURES[scenario])
  const clock = options.clock ?? DEFAULT_SCENARIO_CLOCK
  const responseMode = options.responseMode ?? 'success'
  const latencyMs = Math.max(0, options.latencyMs ?? 0)
  let exerciseStatus = fixture.exerciseStatus
  let exerciseCapabilities = { ...fixture.exerciseCapabilities }
  let note = fixture.note
  let profile = fixture.profile ? { ...fixture.profile } : undefined

  async function request<T>(operation: () => T): Promise<T> {
    if (latencyMs) await new Promise((resolve) => setTimeout(resolve, latencyMs))
    const failure =
      options.failure ??
      (responseMode === 'network-error' ? { mode: 'network-error' as const } : undefined)
    if (failure?.mode === 'network-error') {
      throw new MockRepositoryFailure({
        kind: 'network',
        message: failure.message ?? 'Không thể kết nối tới mock repository.',
      })
    }
    if (failure?.mode === 'api-error' || responseMode === 'api-error') {
      const status = failure?.status ?? 500
      if (!allowedStatuses.has(status as SupportedMockStatus))
        throw new Error(`Unsupported mock HTTP status: ${status}`)
      const envelope: KnownApiErrorEnvelope = {
        success: false,
        error: {
          code: failure?.code ?? '',
          message: failure?.message ?? genericApiMessage(status),
          details: null,
        },
      }
      throw new MockRepositoryFailure(mapApiFailure(status, envelope))
    }
    return operation()
  }

  return {
    getCourseCatalog: () =>
      request(() => {
        if (responseMode === 'empty') return []
        const course = clone(A11_COURSE)
        const summary: CourseSummaryModel = {
          id: course.id,
          code: course.code,
          slug: course.slug,
          title: course.title,
          level: course.level,
          shortDescription: course.shortDescription,
          ...(course.thumbnailUrl ? { thumbnailUrl: course.thumbnailUrl } : {}),
          ...(course.priceVnd !== undefined ? { priceVnd: course.priceVnd } : {}),
          ...(course.accessDurationMonths !== undefined
            ? { accessDurationMonths: course.accessDurationMonths }
            : {}),
          status: course.status,
          ...(course.chapterCount !== undefined ? { chapterCount: course.chapterCount } : {}),
          ...(course.lessonCount !== undefined ? { lessonCount: course.lessonCount } : {}),
        }
        return [summary]
      }),
    getCourseDetails: (courseId) =>
      request(() => {
        if (courseId !== A11_COURSE.id && courseId !== A11_COURSE.slug) {
          const envelope: KnownApiErrorEnvelope = {
            success: false,
            error: { code: '', message: 'Không tìm thấy khóa học trong fixture.', details: null },
          }
          throw new MockRepositoryFailure(mapApiFailure(404, envelope))
        }
        return clone(A11_COURSE)
      }),
    getCourseAccess: () => request(() => clone(fixture.access)),
    getCourseTree: () =>
      request(() => ({
        courseId: A11_COURSE.id,
        courseTitle: A11_COURSE.title,
        sections: clone(A11_COURSE.sections).map((section) => ({
          ...section,
          lessons: section.lessons.map((lesson) => ({
            ...lesson,
            progressStatus: fixture.lessonProgress[lesson.id] ?? 'NOT_STARTED',
          })),
        })),
      })),
    getLessonContent: (lessonId) =>
      request(() => {
        const lesson = A11_COURSE.sections
          .flatMap((section) => section.lessons)
          .find((item) => item.id === lessonId)
        if (!lesson) {
          const envelope: KnownApiErrorEnvelope = {
            success: false,
            error: { code: '', message: 'Không tìm thấy bài học trong fixture.', details: null },
          }
          throw new MockRepositoryFailure(mapApiFailure(404, envelope))
        }
        return {
          lesson: {
            ...clone(lesson),
            progressStatus: fixture.lessonProgress[lesson.id] ?? 'NOT_STARTED',
          },
          paragraphs: [
            'Lời chào thường đi cùng bối cảnh và thời điểm trong ngày.',
            'Hãy nghe mẫu, lặp lại thành tiếng và ghi lại cụm từ bạn muốn ôn.',
          ],
          media: clone(MOCK_MEDIA),
          access: clone(fixture.access),
        }
      }),
    getExercise: (exerciseId) =>
      request(() => {
        if (exerciseId !== MOCK_EXERCISE.id) {
          const envelope: KnownApiErrorEnvelope = {
            success: false,
            error: { code: '', message: 'Không tìm thấy bài tập trong fixture.', details: null },
          }
          throw new MockRepositoryFailure(mapApiFailure(404, envelope))
        }
        return {
          ...clone(MOCK_EXERCISE),
          status: exerciseStatus,
          capabilities: { ...exerciseCapabilities },
        }
      }),
    completeExercise: (exerciseId) =>
      request(() => {
        if (exerciseId !== MOCK_EXERCISE.id) {
          const envelope: KnownApiErrorEnvelope = {
            success: false,
            error: { code: '', message: 'Không tìm thấy bài tập trong fixture.', details: null },
          }
          throw new MockRepositoryFailure(mapApiFailure(404, envelope))
        }
        if (!exerciseCapabilities.canMarkComplete) {
          const envelope: KnownApiErrorEnvelope = {
            success: false,
            error: {
              code: '',
              message: 'Mock repository không cho phép hoàn thành bài tập này.',
              details: null,
            },
          }
          throw new MockRepositoryFailure(mapApiFailure(403, envelope))
        }
        exerciseStatus = 'COMPLETED'
        // This mock server response explicitly returns the capability after completion.
        exerciseCapabilities = { canMarkComplete: false, canViewSolutions: true }
        return {
          ...clone(MOCK_EXERCISE),
          status: exerciseStatus,
          capabilities: { ...exerciseCapabilities },
        }
      }),
    getQuizAttempt: (attemptId) =>
      request(() => {
        if (attemptId !== MOCK_QUIZ_ATTEMPT.id) {
          const envelope: KnownApiErrorEnvelope = {
            success: false,
            error: { code: '', message: 'Không tìm thấy bài làm trong fixture.', details: null },
          }
          throw new MockRepositoryFailure(mapApiFailure(404, envelope))
        }
        const selectedAnswers =
          fixture.quizResult?.review?.reduce<Record<string, string | undefined>>(
            (answers, item) => {
              answers[item.questionId] = item.selectedOptionId
              return answers
            },
            {},
          ) ?? MOCK_QUIZ_ATTEMPT.selectedAnswers
        return {
          ...clone(MOCK_QUIZ_ATTEMPT),
          status: fixture.quizStatus,
          selectedAnswers,
          capabilities: { canSubmit: fixture.canSubmitQuiz },
        }
      }),
    submitQuiz: (attemptId, answers) =>
      request(() => {
        void answers // Answers are accepted as user input; the mock repository returns its separate result fixture.
        if (attemptId !== MOCK_QUIZ_ATTEMPT.id) {
          const envelope: KnownApiErrorEnvelope = {
            success: false,
            error: { code: '', message: 'Không tìm thấy bài làm trong fixture.', details: null },
          }
          throw new MockRepositoryFailure(mapApiFailure(404, envelope))
        }
        if (!fixture.canSubmitQuiz) {
          const envelope: KnownApiErrorEnvelope = {
            success: false,
            error: { code: '', message: 'Bài làm không thể nộp trong fixture này.', details: null },
          }
          throw new MockRepositoryFailure(mapApiFailure(409, envelope))
        }
        return clone(fixture.quizResult ?? MOCK_QUIZ_RESULT)
      }),
    getCourseProgress: () => request(() => clone(fixture.progress)),
    getLessonNote: (lessonId) =>
      request(() => {
        if (lessonId !== 'a11-lesson-01') {
          const envelope: KnownApiErrorEnvelope = {
            success: false,
            error: { code: '', message: 'Không tìm thấy ghi chú trong fixture.', details: null },
          }
          throw new MockRepositoryFailure(mapApiFailure(404, envelope))
        }
        return note
      }),
    saveLessonNote: (lessonId, value) =>
      request(() => {
        if (lessonId !== 'a11-lesson-01') {
          const envelope: KnownApiErrorEnvelope = {
            success: false,
            error: { code: '', message: 'Không tìm thấy ghi chú trong fixture.', details: null },
          }
          throw new MockRepositoryFailure(mapApiFailure(404, envelope))
        }
        note = value
        return note
      }),
    validateCoupon: (code) =>
      request(() => {
        if (fixture.couponResult?.kind === 'invalid')
          return { ...clone(fixture.couponResult), code }
        return {
          kind: 'valid',
          code,
          discountAmountVnd: '100000',
          message: 'Mã demo được chấp nhận theo fixture mock.',
        }
      }),
    getOrders: () =>
      request(() => (responseMode === 'empty' || !fixture.order ? [] : [clone(fixture.order)])),
    getEnrollment: (courseId) =>
      request(() => {
        if (
          responseMode === 'empty' ||
          !fixture.enrollment ||
          courseId !== fixture.enrollment.courseId
        )
          return null
        const enrollment = clone(fixture.enrollment)
        if (enrollment.status === 'REVOKED') return { ...enrollment, accessState: 'revoked' }
        const expired = new Date(enrollment.expiresAt).getTime() <= clock.now().getTime()
        return { ...enrollment, accessState: expired ? 'expired-display' : 'available' }
      }),
    getProfile: () =>
      request(() => (responseMode === 'empty' ? null : profile ? { ...profile } : null)),
    saveProfile: (displayName) =>
      request(() => {
        if (!profile) {
          const envelope: KnownApiErrorEnvelope = {
            success: false,
            error: { code: '', message: 'Không có hồ sơ trong fixture.', details: null },
          }
          throw new MockRepositoryFailure(mapApiFailure(401, envelope))
        }
        profile = { ...profile, displayName }
        return { ...profile }
      }),
    getSessions: () => request(() => (responseMode === 'empty' ? [] : clone(fixture.sessions))),
  }
}

export function accessFromEnrollment(
  enrollment: EnrollmentSummaryViewModel | null,
): CourseAccessViewModel {
  if (!enrollment)
    return {
      kind: 'restricted',
      label: 'Chưa có quyền truy cập khóa học',
      reason: 'Enrollment chưa được trả về từ repository.',
    }
  if (enrollment.status === 'REVOKED' || enrollment.accessState === 'revoked')
    return {
      kind: 'restricted',
      label: 'Quyền truy cập đã thu hồi',
      reason: 'Enrollment status do repository cung cấp là REVOKED.',
    }
  if (enrollment.accessState === 'expired-display')
    return {
      kind: 'expired-display',
      label: 'Quyền truy cập đã hết hạn',
      expiresAt: enrollment.expiresAt,
    }
  return { kind: 'available', label: 'Quyền truy cập đang hoạt động.' }
}
