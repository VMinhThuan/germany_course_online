import type { StudentProfileViewModel, SessionSummaryViewModel } from '@/domains/account/models'
import type {
  CourseAccessViewModel,
  CourseSectionModel,
  LessonSummaryModel,
} from '@/domains/catalog/models'
import type { OrderSummaryViewModel, RenewalPlanViewModel } from '@/domains/commerce/models'
import type { ExerciseViewModel } from '@/domains/exercises/models'
import type { EnrollmentSummaryViewModel } from '@/domains/enrollment/models'
import type { LessonContentViewModel } from '@/domains/learning/models'
import type { CourseProgressViewModel } from '@/domains/progress/models'
import type { QuizResultViewModel } from '@/domains/quizzes/models'
import { A11_COURSE, MOCK_EXERCISE, MOCK_MEDIA, MOCK_QUIZ_ATTEMPT } from '@/data/mock/fixtures'
import { DEMO_COURSE_BY_PERSONA, DEMO_NOW } from './fixtures'
import {
  DemoRepositoryError,
  type DemoPersona,
  type DemoSession,
  type StudentCourseRecord,
  type StudentRepository,
} from './types'
import type {
  StudentAccountRepository,
  StudentCheckoutContextViewModel,
  StudentExerciseSummaryViewModel,
  StudentLearningRepository,
  StudentOrderDetailViewModel,
  StudentProductRepositories,
  StudentCommerceRepository,
} from './product-types'

const STORE_VERSION = 1
const STORE_PREFIX = 'deutsch-a11.demo-product-state.v1:'
const DEMO_PASSWORD = 'DemoPass123!'
const COURSE_ID = A11_COURSE.id
const FILE_EXERCISE_ID = MOCK_EXERCISE.id
const OPTIONAL_EXERCISE_ID = 'exercise-a11-vocabulary-review'
const QUIZ_EXERCISE_ID = 'exercise-a11-greeting-quiz'
const FILE_EXERCISE_LESSON_ID = 'a11-lesson-01'
const VALID_COUPON = 'DEMO10'
const RENEWAL_PLANS: readonly RenewalPlanViewModel[] = [
  {
    id: 'renewal-a11-1m',
    title: 'Gia hạn 1 tháng · giả định',
    durationMonths: 1,
    priceVnd: '100000',
    status: 'ACTIVE',
  },
  {
    id: 'renewal-a11-3m',
    title: 'Gia hạn 3 tháng · giả định',
    durationMonths: 3,
    priceVnd: '250000',
    status: 'ACTIVE',
  },
  {
    id: 'renewal-a11-12m',
    title: 'Gia hạn 12 tháng · giả định',
    durationMonths: 12,
    priceVnd: '800000',
    status: 'ACTIVE',
  },
]

const quizAnswerKey: Readonly<Record<string, string>> = {
  'question-greeting-01': 'option-guten-morgen',
  'question-name-01': 'option-ich-heisse',
}

interface StoredAttempt {
  id: string
  exerciseId: string
  status: 'IN_PROGRESS' | 'SUBMITTED'
  selectedAnswers: Record<string, string | undefined>
  result?: QuizResultViewModel
}

interface StoredOrder {
  order: OrderSummaryViewModel
  courseId: string
  originalAmountVnd: string
  discountAmountVnd: string
  couponCode?: string
  durationMonths: number
  planId?: string
  grantedEnrollmentId?: string
}

interface StudentProductState {
  profile: StudentProfileViewModel
  enrollment: EnrollmentSummaryViewModel | null
  lessonProgress: Record<string, 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED'>
  exerciseProgress: Record<string, 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED'>
  notes: Record<string, string>
  attempts: Record<string, StoredAttempt>
  orders: StoredOrder[]
  lastLessonId?: string
  nextAttemptNumber: number
  nextOrderNumber: number
}

interface PersistedEnvelope {
  version: typeof STORE_VERSION
  state: StudentProductState
}

interface ProductRepositoryDependencies {
  sessionForId: (sessionId: string) => DemoSession
  onProfileUpdated: (userId: string, profile: StudentProfileViewModel) => void
  getPassword: (email: string) => string | undefined
  setPassword: (email: string, password: string) => void
  revokeSession: (sessionId: string) => void
  storage?: Storage
  now?: string
  latencyMs?: number
  devScenarios?: boolean
}

type ProductFailureMode =
  'invalid' | 'forbidden' | 'conflict' | 'unprocessable' | 'rate-limit' | 'network' | 'service'

type ProductOperation = 'learning' | 'commerce' | 'account'
type ProductFailureOperation = ProductOperation | 'student'

function clone<T>(value: T): T {
  return structuredClone(value)
}

function apiFailure(status: number, message: string, code?: string): never {
  throw new DemoRepositoryError({ status, message, ...(code ? { code } : {}) })
}

function normalizeMoney(value: string) {
  if (!/^\d+$/.test(value)) throw new Error('VND demo amounts must be integer strings.')
  return BigInt(value)
}

function formatMoney(value: bigint) {
  return value.toString()
}

function deriveAccess(
  enrollment: EnrollmentSummaryViewModel | null,
  now: string,
): CourseAccessViewModel {
  if (!enrollment) {
    return {
      kind: 'restricted',
      label: 'Chưa có quyền truy cập khóa học',
      reason: 'Bản demo chưa có enrollment được repository trả về cho tài khoản này.',
    }
  }
  if (enrollment.status === 'REVOKED' || enrollment.accessState === 'revoked') {
    return {
      kind: 'restricted',
      label: 'Quyền truy cập đã bị thu hồi',
      reason: 'Lịch sử học được giữ lại; nội dung trả phí không được mở.',
    }
  }
  if (new Date(enrollment.expiresAt).getTime() <= new Date(now).getTime()) {
    return {
      kind: 'expired-display',
      label: 'Quyền truy cập đã hết hạn',
      expiresAt: enrollment.expiresAt,
    }
  }
  return { kind: 'available', label: 'Đang học · quyền truy cập demo còn hạn' }
}

function enrollmentAccessState(enrollment: EnrollmentSummaryViewModel, now: string) {
  if (enrollment.status === 'REVOKED') return 'revoked' as const
  return new Date(enrollment.expiresAt).getTime() <= new Date(now).getTime()
    ? ('expired-display' as const)
    : ('available' as const)
}

function safeInitialState(session: DemoSession): StudentProductState {
  const records =
    session.persona === 'registered-account'
      ? []
      : DEMO_COURSE_BY_PERSONA[session.persona as DemoPersona]
  const courseRecord = records[0]
  const lessonProgress: StudentProductState['lessonProgress'] = {}
  const eligibleLessons = A11_COURSE.sections
    .flatMap((section) => section.lessons)
    .filter((lesson) => lesson.countsTowardProgress)
  const completedCount = courseRecord?.progress?.completedLessons ?? 0
  eligibleLessons.slice(0, completedCount).forEach((lesson) => {
    lessonProgress[lesson.id] = 'COMPLETED'
  })
  const exerciseProgress: StudentProductState['exerciseProgress'] = {}
  if (completedCount > 0) {
    exerciseProgress[FILE_EXERCISE_ID] = 'COMPLETED'
    exerciseProgress[QUIZ_EXERCISE_ID] = 'COMPLETED'
  }
  const state: StudentProductState = {
    profile: clone(session.profile),
    enrollment: courseRecord ? clone(courseRecord.enrollment) : null,
    lessonProgress,
    exerciseProgress,
    notes: {},
    attempts: {},
    orders: [],
    nextAttemptNumber: 1,
    nextOrderNumber: 1,
  }
  if (session.persona === 'active-student')
    state.notes[FILE_EXERCISE_LESSON_ID] = 'Guten Tag! là lời chào lịch sự dùng ban ngày.'
  if (session.persona === 'partially-completed-student')
    state.notes['a11-lesson-02'] = 'Ôn lại cách hỏi tên.'
  return state
}

function isPersistedState(value: unknown): value is StudentProductState {
  if (!value || typeof value !== 'object') return false
  const state = value as Partial<StudentProductState>
  return Boolean(
    state.profile &&
    typeof state.profile.email === 'string' &&
    (state.enrollment === null || typeof state.enrollment === 'object') &&
    state.lessonProgress &&
    typeof state.lessonProgress === 'object' &&
    state.exerciseProgress &&
    typeof state.exerciseProgress === 'object' &&
    state.notes &&
    typeof state.notes === 'object' &&
    state.attempts &&
    typeof state.attempts === 'object' &&
    Array.isArray(state.orders) &&
    Number.isInteger(state.nextAttemptNumber) &&
    Number.isInteger(state.nextOrderNumber),
  )
}

export function getPersistedDemoProfile(
  storage: Storage | undefined,
  userId: string,
): StudentProfileViewModel | undefined {
  try {
    const raw = storage?.getItem(`${STORE_PREFIX}${encodeURIComponent(userId)}`)
    const parsed = raw ? (JSON.parse(raw) as Partial<PersistedEnvelope>) : undefined
    if (parsed?.version === STORE_VERSION && isPersistedState(parsed.state)) {
      return clone(parsed.state.profile)
    }
  } catch {
    // Malformed or blocked storage is treated as an unavailable mock session.
  }
  return undefined
}

function addCalendarMonths(instant: string, months: number) {
  const date = new Date(instant)
  const day = date.getUTCDate()
  date.setUTCDate(1)
  date.setUTCMonth(date.getUTCMonth() + months)
  const lastDay = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0)).getUTCDate()
  date.setUTCDate(Math.min(day, lastDay))
  return date.toISOString()
}

function listLessons() {
  return A11_COURSE.sections.flatMap((section) =>
    section.lessons.map((lesson) => ({ section, lesson })),
  )
}

function exerciseDefinitions(lessonId: string): readonly ExerciseViewModel[] {
  if (lessonId !== FILE_EXERCISE_LESSON_ID) return []
  const base = clone(MOCK_EXERCISE)
  const optional: ExerciseViewModel = {
    ...clone(MOCK_EXERCISE),
    id: OPTIONAL_EXERCISE_ID,
    title: 'Ôn lại cụm từ chào hỏi',
    description: 'Bài tập mở rộng không tính vào điều kiện hoàn thành bài.',
    instructions: 'Đọc lại các cụm từ trong bài và tự ghi chú điều bạn muốn nhớ.',
    isRequired: false,
    status: 'NOT_STARTED',
    assets: base.assets.map((asset) => ({
      ...asset,
      id: `${asset.id}-optional`,
      title: asset.title.replace('luyện nghe', 'ôn tập'),
    })),
    capabilities: { canMarkComplete: true, canViewSolutions: false },
  }
  const quiz: ExerciseViewModel = {
    id: QUIZ_EXERCISE_ID,
    title: 'Bài kiểm tra lời chào',
    description: 'Câu hỏi trắc nghiệm một lựa chọn cho bài học.',
    instructions: 'Chọn đáp án phù hợp rồi gửi bài để repository demo trả kết quả.',
    exerciseType: 'QUIZ',
    completionMode: 'QUIZ_SUBMISSION',
    isRequired: true,
    status: 'NOT_STARTED',
    assets: [],
    capabilities: { canMarkComplete: false, canViewSolutions: false },
  }
  return [base, optional, quiz]
}

function progressFor(state: StudentProductState): CourseProgressViewModel {
  const eligible = listLessons().filter(({ lesson }) => lesson.countsTowardProgress)
  const completed = eligible.filter(
    ({ lesson }) => state.lessonProgress[lesson.id] === 'COMPLETED',
  ).length
  return {
    courseId: COURSE_ID,
    percent: eligible.length === 0 ? 0 : Math.round((completed / eligible.length) * 100),
    completedLessons: completed,
    totalLessons: eligible.length,
    completedLabel: `${completed} / ${eligible.length} bài đã hoàn thành`,
  }
}

function recordLessonProgress(state: StudentProductState, lessonId: string) {
  const required = exerciseDefinitions(lessonId).filter((exercise) => exercise.isRequired)
  if (required.length > 0) {
    const allDone = required.every(
      (exercise) => state.exerciseProgress[exercise.id] === 'COMPLETED',
    )
    if (allDone) state.lessonProgress[lessonId] = 'COMPLETED'
    else if (
      required.some(
        (exercise) =>
          state.exerciseProgress[exercise.id] === 'IN_PROGRESS' ||
          state.exerciseProgress[exercise.id] === 'COMPLETED',
      )
    ) {
      state.lessonProgress[lessonId] = 'IN_PROGRESS'
    }
    return
  }
  if (state.lessonProgress[lessonId] !== 'COMPLETED') state.lessonProgress[lessonId] = 'IN_PROGRESS'
}

function makeOrderDetail(
  state: StudentProductState,
  stored: StoredOrder,
  now: string,
): StudentOrderDetailViewModel {
  const access = deriveAccess(state.enrollment, now)
  const enrollment =
    stored.grantedEnrollmentId && state.enrollment?.id === stored.grantedEnrollmentId
      ? clone(state.enrollment)
      : undefined
  return {
    order: clone(stored.order),
    courseId: stored.courseId,
    originalAmountVnd: stored.originalAmountVnd,
    discountAmountVnd: stored.discountAmountVnd,
    totalAmountVnd: stored.order.amountVnd,
    ...(stored.couponCode ? { couponCode: stored.couponCode } : {}),
    durationMonths: stored.durationMonths,
    ...(stored.planId ? { planId: stored.planId } : {}),
    ...(enrollment ? { enrollment } : {}),
    access,
  }
}

export function createStudentProductRepositories(
  deps: ProductRepositoryDependencies,
): StudentProductRepositories {
  const now = deps.now ?? DEMO_NOW
  const latencyMs = Math.max(0, deps.latencyMs ?? 120)
  const states = new Map<string, StudentProductState>()
  const failures = new Map<ProductFailureOperation, ProductFailureMode>()

  const storeKey = (userId: string) => `${STORE_PREFIX}${encodeURIComponent(userId)}`
  function persist(userId: string, state: StudentProductState) {
    try {
      deps.storage?.setItem(
        storeKey(userId),
        JSON.stringify({ version: STORE_VERSION, state } satisfies PersistedEnvelope),
      )
    } catch {
      // Browser storage is optional in the demo; in-memory state remains usable.
    }
  }
  function stateFor(session: DemoSession) {
    const existing = states.get(session.userId)
    if (existing) return existing
    let initial = safeInitialState(session)
    try {
      const raw = deps.storage?.getItem(storeKey(session.userId))
      const parsed = raw ? (JSON.parse(raw) as Partial<PersistedEnvelope>) : undefined
      if (parsed?.version === STORE_VERSION && isPersistedState(parsed.state))
        initial = clone(parsed.state)
    } catch {
      // Invalid or unavailable local demo data falls back to the typed persona fixture.
    }
    states.set(session.userId, initial)
    if (!deps.storage?.getItem(storeKey(session.userId))) persist(session.userId, initial)
    return initial
  }
  const resolve = (sessionId: string) => {
    const session = deps.sessionForId(sessionId)
    return { session, state: stateFor(session) }
  }
  const request = async <T>(operation: ProductOperation, run: () => T | Promise<T>): Promise<T> => {
    if (latencyMs > 0 && typeof window !== 'undefined')
      await new Promise((done) => window.setTimeout(done, latencyMs))
    const failureKey = failures.has(operation)
      ? operation
      : operation === 'learning' && failures.has('student')
        ? 'student'
        : undefined
    const mode = failureKey ? failures.get(failureKey) : undefined
    if (mode) {
      failures.delete(failureKey!)
      if (mode === 'network')
        throw new DemoRepositoryError({
          kind: 'network',
          message: 'Không thể kết nối dịch vụ demo.',
        })
      const status =
        mode === 'invalid'
          ? 401
          : mode === 'forbidden'
            ? 403
            : mode === 'conflict'
              ? 409
              : mode === 'unprocessable'
                ? 422
                : mode === 'rate-limit'
                  ? 429
                  : 500
      throw new DemoRepositoryError({ status, message: 'Yêu cầu demo chưa thể hoàn tất.' })
    }
    return clone(await run())
  }

  if (import.meta.env.DEV && deps.devScenarios && typeof window !== 'undefined') {
    window.addEventListener('student-demo:scenario', (event) => {
      const detail = (
        event as CustomEvent<{ operation?: ProductFailureOperation; mode?: ProductFailureMode }>
      ).detail
      if (detail?.operation && detail.mode) failures.set(detail.operation, detail.mode)
    })
  }

  function findLesson(lessonId: string) {
    const index = listLessons().findIndex(({ lesson }) => lesson.id === lessonId)
    return index < 0 ? undefined : { ...listLessons()[index]!, index }
  }

  function ensureCourse(courseId: string) {
    if (courseId !== COURSE_ID && courseId !== A11_COURSE.slug)
      apiFailure(404, 'Không tìm thấy khóa học demo.')
  }

  function courseTree(state: StudentProductState) {
    return {
      courseId: COURSE_ID,
      courseTitle: A11_COURSE.title,
      sections: A11_COURSE.sections.map((section) => ({
        ...clone(section),
        lessons: section.lessons.map((lesson) => ({
          ...clone(lesson),
          progressStatus: state.lessonProgress[lesson.id] ?? 'NOT_STARTED',
        })),
      })),
    }
  }

  function lessonStatus(state: StudentProductState, lesson: LessonSummaryModel) {
    return state.lessonProgress[lesson.id] ?? 'NOT_STARTED'
  }

  function accessAllowed(state: StudentProductState) {
    return deriveAccess(state.enrollment, now).kind === 'available'
  }

  function updateEnrollmentState(
    state: StudentProductState,
    enrollment: EnrollmentSummaryViewModel,
  ) {
    state.enrollment = { ...enrollment, accessState: enrollmentAccessState(enrollment, now) }
  }

  function findStoredOrder(state: StudentProductState, orderId: string) {
    const found = state.orders.find((item) => item.order.id === orderId)
    if (!found) apiFailure(404, 'Không tìm thấy đơn hàng trong dữ liệu tài khoản demo.')
    return found
  }

  function checkoutContext(
    state: StudentProductState,
    context: string,
    planId?: string,
  ): StudentCheckoutContextViewModel {
    const isPurchase = context === `purchase-${COURSE_ID}`
    const isRenewal = context === `renewal-${COURSE_ID}`
    if (!isPurchase && !isRenewal) apiFailure(404, 'Ngữ cảnh checkout demo không hợp lệ.')
    if (isPurchase) {
      if (
        state.enrollment?.status === 'ACTIVE' &&
        deriveAccess(state.enrollment, now).kind === 'available'
      ) {
        apiFailure(409, 'Tài khoản đã có quyền học còn hạn. Mở khóa học để tiếp tục.')
      }
      if (
        state.enrollment?.status === 'ACTIVE' &&
        deriveAccess(state.enrollment, now).kind === 'expired-display'
      ) {
        apiFailure(409, 'Enrollment hiện có đã hết hạn. Hãy chọn gói gia hạn demo.')
      }
      const result: StudentCheckoutContextViewModel = {
        context,
        orderType: 'PURCHASE',
        courseId: COURSE_ID,
        courseTitle: A11_COURSE.title,
        originalAmountVnd: A11_COURSE.priceVnd ?? '1290000',
        discountAmountVnd: '0',
        totalAmountVnd: A11_COURSE.priceVnd ?? '1290000',
        durationMonths: A11_COURSE.accessDurationMonths ?? 12,
        hypotheticalPrice: true,
      }
      return result
    }
    if (!state.enrollment || state.enrollment.status === 'REVOKED') {
      apiFailure(403, 'Tài khoản demo chưa có enrollment có thể gia hạn.')
    }
    const plan = RENEWAL_PLANS.find((item) => item.id === planId && item.status === 'ACTIVE')
    if (!plan) apiFailure(422, 'Hãy chọn một gói gia hạn demo đang khả dụng.')
    return {
      context,
      orderType: 'RENEWAL',
      courseId: COURSE_ID,
      courseTitle: A11_COURSE.title,
      originalAmountVnd: plan.priceVnd,
      discountAmountVnd: '0',
      totalAmountVnd: plan.priceVnd,
      durationMonths: plan.durationMonths,
      plan,
      currentExpiry: state.enrollment.expiresAt,
      hypotheticalPrice: true,
    }
  }

  function checkoutQuote(
    state: StudentProductState,
    context: string,
    planId?: string,
    couponCode?: string,
  ) {
    const base = checkoutContext(state, context, planId)
    const normalizedCode = couponCode?.trim().toUpperCase()
    if (!normalizedCode) return base
    if (normalizedCode !== VALID_COUPON)
      apiFailure(422, 'Mã ưu đãi không được chấp nhận trong kịch bản demo.')
    const original = normalizeMoney(base.originalAmountVnd)
    const discount = original / 10n
    return {
      ...base,
      couponCode: normalizedCode,
      discountAmountVnd: formatMoney(discount),
      totalAmountVnd: formatMoney(original - discount),
    }
  }

  const student: StudentRepository = {
    async getDashboard(sessionId) {
      return request('learning', () => {
        const { session, state } = resolve(sessionId)
        const enrollment = state.enrollment
        const continueLessonId =
          state.lastLessonId ??
          listLessons().find(({ lesson }) => lessonStatus(state, lesson) !== 'COMPLETED')?.lesson.id
        const courses: StudentCourseRecord[] = enrollment
          ? [
              {
                courseId: COURSE_ID,
                courseSlug: A11_COURSE.slug,
                enrollment: { ...enrollment, accessState: enrollmentAccessState(enrollment, now) },
                progress: progressFor(state),
                ...(continueLessonId ? { continueLessonId } : {}),
              },
            ]
          : []
        return { profile: clone(state.profile ?? session.profile), courses }
      })
    },
    async listCourses(sessionId) {
      const dashboard = await student.getDashboard(sessionId)
      return dashboard.courses
    },
  }

  const learning: StudentLearningRepository = {
    async getCourseOverview(sessionId, courseId) {
      return request('learning', () => {
        ensureCourse(courseId)
        const { state } = resolve(sessionId)
        const sections = courseTree(state).sections
        const continueLessonId =
          state.lastLessonId ??
          listLessons().find(({ lesson }) => lessonStatus(state, lesson) !== 'COMPLETED')?.lesson.id
        return {
          course: {
            id: COURSE_ID,
            slug: A11_COURSE.slug,
            title: A11_COURSE.title,
            level: A11_COURSE.level,
          },
          tree: {
            courseId: COURSE_ID,
            courseTitle: A11_COURSE.title,
            sections,
            ...(continueLessonId ? { currentLessonId: continueLessonId } : {}),
          },
          access: deriveAccess(state.enrollment, now),
          progress: progressFor(state),
          ...(continueLessonId ? { continueLessonId } : {}),
        }
      })
    },
    async getSection(sessionId, courseId, sectionId) {
      return request('learning', () => {
        ensureCourse(courseId)
        const { state } = resolve(sessionId)
        const section = courseTree(state).sections.find((item) => item.id === sectionId)
        if (!section) apiFailure(404, 'Không tìm thấy chương học trong khóa demo.')
        return {
          courseId: COURSE_ID,
          courseTitle: A11_COURSE.title,
          courseLevel: A11_COURSE.level,
          section,
          access: deriveAccess(state.enrollment, now),
        }
      })
    },
    async getLesson(sessionId, lessonId) {
      return request('learning', () => {
        const { session, state } = resolve(sessionId)
        const found = findLesson(lessonId)
        if (!found) apiFailure(404, 'Không tìm thấy bài học trong khóa demo.')
        const { section, lesson, index } = found
        const access = deriveAccess(state.enrollment, now)
        const unlocked = access.kind === 'available'
        const exercises = unlocked
          ? exerciseDefinitions(lessonId).map((exercise) => ({
              id: exercise.id,
              lessonId,
              title: exercise.title,
              exerciseType: exercise.exerciseType,
              status: state.exerciseProgress[exercise.id] ?? 'NOT_STARTED',
              isRequired: exercise.isRequired,
              href:
                exercise.exerciseType === 'QUIZ'
                  ? `/learn/exercises/${exercise.id}`
                  : `/learn/exercises/${exercise.id}`,
            }))
          : []
        const required = exerciseDefinitions(lessonId).filter((exercise) => exercise.isRequired)
        const status = lessonStatus(state, lesson)
        const flatLessons = listLessons()
        const previous = flatLessons[index - 1]?.lesson.id
        const next = flatLessons[index + 1]?.lesson.id
        const content: LessonContentViewModel = {
          lesson: { ...clone(lesson), progressStatus: status },
          paragraphs: unlocked
            ? [
                'Bắt đầu bằng cách nghe mẫu và chú ý cách người nói chào nhau trong tình huống ban ngày.',
                'Lặp lại “Guten Tag” thành tiếng, sau đó thử dùng câu hỏi “Wie geht es Ihnen?” trong một đoạn hội thoại ngắn.',
              ]
            : [],
          video: null,
          media: unlocked ? clone(MOCK_MEDIA) : [],
          access,
        }
        state.lastLessonId = lessonId
        persist(session.userId, state)
        return {
          ...content,
          courseId: COURSE_ID,
          courseTitle: A11_COURSE.title,
          sectionId: section.id,
          exercises,
          progressItems: flatLessons.map(({ lesson: item }) => ({
            lessonId: item.id,
            title: item.title,
            status: lessonStatus(state, item),
            href: `/learn/lessons/${item.id}`,
          })),
          canCompleteLesson: unlocked && required.length === 0 && status !== 'COMPLETED',
          isCompleted: status === 'COMPLETED',
          ...(previous ? { previousLessonId: previous } : {}),
          ...(next ? { nextLessonId: next } : {}),
        }
      })
    },
    async getExercise(sessionId, exerciseId) {
      return request('learning', () => {
        const { state } = resolve(sessionId)
        const template = exerciseDefinitions(FILE_EXERCISE_LESSON_ID).find(
          (item) => item.id === exerciseId,
        )
        if (!template) apiFailure(404, 'Không tìm thấy bài tập trong khóa demo.')
        if (!accessAllowed(state)) {
          return {
            ...clone(template),
            instructions: 'Enrollment hiện không cấp quyền xem nội dung bài tập trả phí.',
            assets: [],
            status: state.exerciseProgress[exerciseId] ?? 'NOT_STARTED',
            capabilities: { canMarkComplete: false, canViewSolutions: false },
          }
        }
        const status = state.exerciseProgress[exerciseId] ?? 'NOT_STARTED'
        const canViewSolutions = status === 'COMPLETED'
        const assets = clone(template.assets).filter((asset) => {
          if (asset.role === 'ANSWER_PDF' || asset.role === 'SOLUTION_VIDEO')
            return canViewSolutions
          return true
        })
        return {
          ...clone(template),
          status,
          assets,
          capabilities: {
            canMarkComplete: template.exerciseType === 'FILE_BASED' && status !== 'COMPLETED',
            canViewSolutions,
          },
        }
      })
    },
    async completeExercise(sessionId, exerciseId) {
      return request('learning', () => {
        const { session, state } = resolve(sessionId)
        if (!accessAllowed(state)) apiFailure(403, 'Enrollment chưa cấp quyền hoàn thành bài tập.')
        const found = exerciseDefinitions(FILE_EXERCISE_LESSON_ID).find(
          (item) => item.id === exerciseId,
        )
        if (!found) apiFailure(404, 'Không tìm thấy bài tập trong khóa demo.')
        if (found.exerciseType !== 'FILE_BASED')
          apiFailure(422, 'Bài kiểm tra chỉ hoàn thành sau khi repository nhận kết quả nộp bài.')
        state.exerciseProgress[exerciseId] = 'COMPLETED'
        recordLessonProgress(state, FILE_EXERCISE_LESSON_ID)
        persist(session.userId, state)
        const assets = clone(found.assets)
        return {
          ...clone(found),
          status: 'COMPLETED',
          assets,
          capabilities: { canMarkComplete: false, canViewSolutions: true },
        }
      })
    },
    async startQuiz(sessionId, exerciseId) {
      return request('learning', () => {
        const { session, state } = resolve(sessionId)
        if (!accessAllowed(state))
          apiFailure(403, 'Enrollment chưa cấp quyền bắt đầu bài kiểm tra.')
        if (exerciseId !== QUIZ_EXERCISE_ID)
          apiFailure(404, 'Không tìm thấy bài kiểm tra trong khóa demo.')
        const id = `demo-attempt-${session.userId}-${state.nextAttemptNumber++}`
        const stored: StoredAttempt = { id, exerciseId, status: 'IN_PROGRESS', selectedAnswers: {} }
        state.attempts[id] = stored
        const hasSubmittedAttempt = Object.values(state.attempts).some(
          (item) => item.exerciseId === exerciseId && item.status === 'SUBMITTED',
        )
        if (!hasSubmittedAttempt) state.exerciseProgress[exerciseId] = 'IN_PROGRESS'
        recordLessonProgress(state, FILE_EXERCISE_LESSON_ID)
        persist(session.userId, state)
        return {
          ...clone(MOCK_QUIZ_ATTEMPT),
          id,
          status: stored.status,
          selectedAnswers: {},
          capabilities: { canSubmit: true },
        }
      })
    },
    async getQuizAttempt(sessionId, attemptId) {
      return request('learning', () => {
        const { state } = resolve(sessionId)
        if (!accessAllowed(state)) apiFailure(403, 'Enrollment chưa cấp quyền xem bài kiểm tra.')
        const attempt = state.attempts[attemptId]
        if (!attempt) apiFailure(404, 'Không tìm thấy lượt làm bài trong tài khoản demo.')
        return {
          ...clone(MOCK_QUIZ_ATTEMPT),
          id: attempt.id,
          status: attempt.status,
          selectedAnswers: clone(attempt.selectedAnswers),
          capabilities: { canSubmit: attempt.status === 'IN_PROGRESS' },
        }
      })
    },
    async selectQuizAnswer(sessionId, attemptId, questionId, optionId) {
      return request('learning', () => {
        const { session, state } = resolve(sessionId)
        if (!accessAllowed(state)) apiFailure(403, 'Enrollment chưa cấp quyền làm bài.')
        const attempt = state.attempts[attemptId]
        if (!attempt) apiFailure(404, 'Không tìm thấy lượt làm bài trong tài khoản demo.')
        if (attempt.status !== 'IN_PROGRESS') apiFailure(409, 'Lượt làm bài này đã được nộp.')
        const question = MOCK_QUIZ_ATTEMPT.questions.find((item) => item.id === questionId)
        if (!question || !question.options.some((option) => option.id === optionId))
          apiFailure(422, 'Lựa chọn câu trả lời không hợp lệ.')
        attempt.selectedAnswers[questionId] = optionId
        persist(session.userId, state)
        return {
          ...clone(MOCK_QUIZ_ATTEMPT),
          id: attempt.id,
          selectedAnswers: clone(attempt.selectedAnswers),
          capabilities: { canSubmit: true },
        }
      })
    },
    async submitQuiz(sessionId, attemptId) {
      return request('learning', () => {
        const { session, state } = resolve(sessionId)
        if (!accessAllowed(state)) apiFailure(403, 'Enrollment chưa cấp quyền nộp bài.')
        const attempt = state.attempts[attemptId]
        if (!attempt) apiFailure(404, 'Không tìm thấy lượt làm bài trong tài khoản demo.')
        if (attempt.status !== 'IN_PROGRESS') apiFailure(409, 'Lượt làm bài này đã được nộp.')
        const review = MOCK_QUIZ_ATTEMPT.questions.map((question) => ({
          questionId: question.id,
          ...(attempt.selectedAnswers[question.id]
            ? { selectedOptionId: attempt.selectedAnswers[question.id]! }
            : {}),
          ...(quizAnswerKey[question.id] ? { correctOptionId: quizAnswerKey[question.id] } : {}),
          explanation:
            question.id === 'question-greeting-01'
              ? '“Guten Morgen” là lời chào buổi sáng.'
              : '“Ich heiße …” dùng để giới thiệu tên.',
        }))
        const correctCount = review.filter(
          (item) => item.selectedOptionId === item.correctOptionId,
        ).length
        const result: QuizResultViewModel = {
          attemptId,
          score: String(correctCount),
          maxScore: String(MOCK_QUIZ_ATTEMPT.questions.length),
          correctCount,
          totalQuestions: MOCK_QUIZ_ATTEMPT.questions.length,
          review,
          capabilities: { canReviewAnswers: true, canRetry: true },
        }
        attempt.status = 'SUBMITTED'
        attempt.result = result
        state.exerciseProgress[attempt.exerciseId] = 'COMPLETED'
        recordLessonProgress(state, FILE_EXERCISE_LESSON_ID)
        persist(session.userId, state)
        return result
      })
    },
    async getQuizResult(sessionId, attemptId) {
      return request('learning', () => {
        const { state } = resolve(sessionId)
        const attempt = state.attempts[attemptId]
        if (!attempt) apiFailure(404, 'Không tìm thấy lượt làm bài trong tài khoản demo.')
        if (attempt.status !== 'SUBMITTED' || !attempt.result)
          apiFailure(409, 'Kết quả chưa được repository trả về.')
        return attempt.result
      })
    },
    async retryQuiz(sessionId, attemptId) {
      const { session, state } = resolve(sessionId)
      const previous = state.attempts[attemptId]
      if (!previous?.result?.capabilities.canRetry)
        apiFailure(409, 'Kịch bản demo chưa cho phép làm lượt mới.')
      return learning.startQuiz(session.id, previous.exerciseId)
    },
    async completeLesson(sessionId, lessonId) {
      return request('learning', () => {
        const { session, state } = resolve(sessionId)
        if (!accessAllowed(state)) apiFailure(403, 'Enrollment chưa cấp quyền hoàn thành bài học.')
        const found = findLesson(lessonId)
        if (!found) apiFailure(404, 'Không tìm thấy bài học trong khóa demo.')
        const required = exerciseDefinitions(lessonId).filter((exercise) => exercise.isRequired)
        if (
          required.length > 0 &&
          !required.every((exercise) => state.exerciseProgress[exercise.id] === 'COMPLETED')
        ) {
          apiFailure(422, 'Hãy hoàn thành toàn bộ bài tập bắt buộc trước khi hoàn thành bài học.')
        }
        state.lessonProgress[lessonId] = 'COMPLETED'
        state.lastLessonId =
          listLessons().find(({ lesson }) => state.lessonProgress[lesson.id] !== 'COMPLETED')
            ?.lesson.id ?? lessonId
        persist(session.userId, state)
        return { ...clone(found.lesson), progressStatus: 'COMPLETED' }
      })
    },
    async getProgress(sessionId, courseId) {
      return request('learning', () => {
        ensureCourse(courseId)
        const { state } = resolve(sessionId)
        return progressFor(state)
      })
    },
    async getLessonNote(sessionId, lessonId) {
      return request('learning', () => {
        if (!findLesson(lessonId)) apiFailure(404, 'Không tìm thấy bài học cho ghi chú.')
        const { state } = resolve(sessionId)
        return state.notes[lessonId] ?? ''
      })
    },
    async saveLessonNote(sessionId, lessonId, value) {
      return request('learning', () => {
        const { session, state } = resolve(sessionId)
        if (!findLesson(lessonId)) apiFailure(404, 'Không tìm thấy bài học cho ghi chú.')
        state.notes[lessonId] = value
        persist(session.userId, state)
        return value
      })
    },
  }

  const commerce: StudentCommerceRepository = {
    async getCheckoutContext(sessionId, context, planId, couponCode) {
      return request('commerce', () => {
        const { state } = resolve(sessionId)
        return checkoutQuote(state, context, planId, couponCode)
      })
    },
    async validateCoupon(sessionId, context, code, planId) {
      return request('commerce', () => {
        const { state } = resolve(sessionId)
        const checkout = checkoutContext(state, context, planId)
        const cleanCode = code.trim().toUpperCase()
        if (cleanCode !== VALID_COUPON) {
          return {
            kind: 'invalid',
            code: cleanCode,
            message: 'Mã này chưa được chấp nhận trong kịch bản demo.',
          }
        }
        const amount = normalizeMoney(checkout.originalAmountVnd)
        const discount = amount / 10n
        return {
          kind: 'valid',
          code: cleanCode,
          discountAmountVnd: formatMoney(discount),
          message: 'Mã demo được chấp nhận; mức giảm này chỉ dùng để minh họa.',
        }
      })
    },
    async createOrder(sessionId, context, input = {}) {
      return request('commerce', () => {
        const { session, state } = resolve(sessionId)
        const checkout = checkoutQuote(state, context, input.planId, input.couponCode)
        const original = normalizeMoney(checkout.originalAmountVnd)
        const coupon = normalizeMoney(checkout.discountAmountVnd)
        const total = normalizeMoney(checkout.totalAmountVnd)
        const sequence = state.nextOrderNumber++
        const id = `demo-order-${session.userId}-${sequence}`
        const order: OrderSummaryViewModel = {
          id,
          orderCode: `DEMO-A11-${String(sequence).padStart(3, '0')}`,
          orderType: checkout.orderType,
          status: 'PENDING',
          itemTitle:
            checkout.orderType === 'RENEWAL'
              ? `${checkout.courseTitle} · ${checkout.plan?.title ?? 'Gia hạn demo'}`
              : checkout.courseTitle,
          amountVnd: formatMoney(total),
          createdAt: new Date(new Date(now).getTime() + sequence * 1000).toISOString(),
          paymentStatus: 'PENDING',
        }
        const stored: StoredOrder = {
          order,
          courseId: COURSE_ID,
          originalAmountVnd: formatMoney(original),
          discountAmountVnd: formatMoney(coupon),
          ...(input.couponCode ? { couponCode: input.couponCode.trim().toUpperCase() } : {}),
          durationMonths: checkout.durationMonths,
          ...(checkout.plan ? { planId: checkout.plan.id } : {}),
        }
        state.orders.unshift(stored)
        persist(session.userId, state)
        return makeOrderDetail(state, stored, now)
      })
    },
    async listOrders(sessionId) {
      return request('commerce', () => {
        const { state } = resolve(sessionId)
        return state.orders.map((stored) => makeOrderDetail(state, stored, now))
      })
    },
    async getOrder(sessionId, orderId) {
      return request('commerce', () => {
        const { state } = resolve(sessionId)
        return makeOrderDetail(state, findStoredOrder(state, orderId), now)
      })
    },
    async getRenewalPlans(sessionId, courseId) {
      return request('commerce', () => {
        ensureCourse(courseId)
        const { state } = resolve(sessionId)
        if (!state.enrollment || state.enrollment.status === 'REVOKED') {
          throw new DemoRepositoryError({ message: 'Không tìm thấy quyền học cần gia hạn.' })
        }
        return {
          course: {
            id: COURSE_ID,
            title: A11_COURSE.title,
            enrollmentExpiresAt: state.enrollment.expiresAt,
          },
          plans: RENEWAL_PLANS.filter((plan) => plan.status === 'ACTIVE'),
        }
      })
    },
    async simulateDemoPayment(sessionId, orderId, outcome) {
      return request('commerce', () => {
        const { session, state } = resolve(sessionId)
        const stored = findStoredOrder(state, orderId)
        if (stored.order.status !== 'PENDING' || stored.order.paymentStatus !== 'PENDING')
          apiFailure(409, 'Đơn demo này không còn chờ xử lý.')
        if (outcome === 'failure') {
          stored.order = { ...stored.order, status: 'FAILED', paymentStatus: 'FAILED' }
          persist(session.userId, state)
          return { order: stored.order, access: deriveAccess(state.enrollment, now) }
        }
        const paidAt = new Date(now).toISOString()
        const previousExpiry = state.enrollment?.expiresAt
        const currentAccess = deriveAccess(state.enrollment, now)
        const base =
          stored.order.orderType === 'RENEWAL' &&
          currentAccess.kind === 'available' &&
          previousExpiry
            ? previousExpiry
            : paidAt
        const expiresAt = addCalendarMonths(base, stored.durationMonths)
        const enrollment: EnrollmentSummaryViewModel = {
          id: `demo-enrollment-${session.userId}-${stored.order.id}`,
          courseId: COURSE_ID,
          courseTitle: A11_COURSE.title,
          status: 'ACTIVE',
          expiresAt,
          accessState: 'available',
        }
        updateEnrollmentState(state, enrollment)
        stored.order = { ...stored.order, status: 'PAID', paymentStatus: 'SUCCESS' }
        stored.grantedEnrollmentId = enrollment.id
        persist(session.userId, state)
        return {
          order: stored.order,
          enrollment: clone(enrollment),
          access: deriveAccess(state.enrollment, now),
        }
      })
    },
  }

  const account: StudentAccountRepository = {
    async getProfile(sessionId) {
      return request('account', () => {
        const { state } = resolve(sessionId)
        return state.profile
      })
    },
    async updateProfile(sessionId, input) {
      return request('account', () => {
        const { session, state } = resolve(sessionId)
        const displayName = input.displayName?.trim() ?? ''
        if (!displayName || displayName.length > 80)
          apiFailure(422, 'Nhập tên hiển thị từ 1 đến 80 ký tự.')
        state.profile = { ...state.profile, displayName }
        persist(session.userId, state)
        deps.onProfileUpdated(session.userId, state.profile)
        return state.profile
      })
    },
    async changePassword(sessionId, currentPassword, newPassword) {
      await request('account', () => {
        const { session } = resolve(sessionId)
        const storedPassword = deps.getPassword(session.profile.email) ?? DEMO_PASSWORD
        if (storedPassword !== currentPassword)
          apiFailure(401, 'Mật khẩu hiện tại không khớp với tài khoản demo.')
        if (newPassword.length < 8) apiFailure(422, 'Dùng ít nhất 8 ký tự trong kịch bản demo.')
        deps.setPassword(session.profile.email, newPassword)
      })
      // V3 requires a password-change session invalidation; this mock callback revokes only the current local session.
      const session = deps.sessionForId(sessionId)
      deps.revokeSession(session.id)
    },
    async listSessions(sessionId) {
      return request('account', () => {
        const { session } = resolve(sessionId)
        const current: SessionSummaryViewModel = {
          id: session.id,
          deviceName: 'Trình duyệt hiện tại · dữ liệu demo',
          status: 'ACTIVE',
          lastActiveAt: now,
          isCurrent: true,
        }
        return [current]
      })
    },
    async revokeSession(sessionId, targetSessionId) {
      await request('account', () => {
        const { session } = resolve(sessionId)
        if (targetSessionId !== session.id)
          apiFailure(404, 'Không tìm thấy phiên thuộc tài khoản demo này.')
        deps.revokeSession(targetSessionId)
      })
    },
  }

  return { student, learning, commerce, account }
}

export function getDemoPlans() {
  return clone(RENEWAL_PLANS)
}

export function getDemoCourseSection(sectionId: string): CourseSectionModel | undefined {
  const section = A11_COURSE.sections.find((item) => item.id === sectionId)
  return section ? clone(section) : undefined
}

export function getMockExerciseSummaries(
  lessonId: string,
): readonly StudentExerciseSummaryViewModel[] {
  return exerciseDefinitions(lessonId).map((exercise) => ({
    id: exercise.id,
    lessonId,
    title: exercise.title,
    exerciseType: exercise.exerciseType,
    status: exercise.status,
    isRequired: exercise.isRequired,
    href: `/learn/exercises/${exercise.id}`,
  }))
}
