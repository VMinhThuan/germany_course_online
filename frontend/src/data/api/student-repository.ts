import { ApiError, apiRequest } from '@/lib/api/client'
import { publishSessionRevoked } from '@/data/student-demo/session-events'
import type {
  ApiCourseProgress,
  ApiCouponValidation,
  ApiEnrollment,
  ApiExercise,
  ApiLessonAsset,
  ApiLessonNote,
  ApiLessonWorkspace,
  ApiMediaAccess,
  ApiOrder,
  ApiOrderDetail,
  ApiOrderQuote,
  ApiPage,
  ApiQuizAttempt,
  ApiQuizResult,
  ApiRenewalPlanList,
  ApiStudentCourseOverview,
  ApiStudentDashboard,
  ApiStudentSection,
  ApiUserProfile,
} from '@/lib/api/types'
import type {
  CourseAccessViewModel,
  CourseSectionModel,
  LessonSummaryModel,
} from '@/domains/catalog/models'
import type { StudentProfileViewModel, SessionSummaryViewModel } from '@/domains/account/models'
import type { EnrollmentSummaryViewModel } from '@/domains/enrollment/models'
import type { MediaViewModel } from '@/domains/media/models'
import type { QuizAttemptViewModel, QuizResultViewModel } from '@/domains/quizzes/models'
import type { OrderSummaryViewModel } from '@/domains/commerce/models'
import type { CourseProgressViewModel } from '@/domains/progress/models'
import type { StudentCourseRecord, StudentRepository } from '@/data/student-demo/types'
import type {
  StudentAccountRepository,
  StudentExerciseSummaryViewModel,
  StudentLearningRepository,
  StudentOrderDetailViewModel,
  StudentProductRepositories,
  StudentCommerceRepository,
} from '@/data/student-demo/product-types'

function toProfile(user: ApiUserProfile): StudentProfileViewModel {
  return {
    id: user.id,
    displayName: user.fullName,
    email: user.email,
    status: user.status,
    phone: user.phone,
    avatarUrl: user.avatarUrl,
  }
}

function effectiveAccess(enrollment: ApiEnrollment): EnrollmentSummaryViewModel['accessState'] {
  if (enrollment.status === 'REVOKED') return 'revoked'
  // This is a display label only. Every protected API request is still authorized by the backend.
  return Date.parse(enrollment.expiresAt) <= Date.now() ? 'expired-display' : 'available'
}

function toEnrollment(enrollment: ApiEnrollment): EnrollmentSummaryViewModel {
  return {
    id: enrollment.id,
    courseId: enrollment.courseId,
    courseTitle: enrollment.courseTitle,
    status: enrollment.status === 'REVOKED' ? 'REVOKED' : 'ACTIVE',
    expiresAt: enrollment.expiresAt,
    accessState: effectiveAccess(enrollment),
  }
}

function toCourseRecord(enrollment: ApiEnrollment): StudentCourseRecord {
  return {
    courseId: enrollment.courseId,
    enrollment: toEnrollment(enrollment),
    progress: {
      courseId: enrollment.courseId,
      percent: enrollment.progressPercent,
      completedLessons: 0,
      totalLessons: 0,
      completedLabel: 'Tiến độ do máy chủ cung cấp',
    },
  }
}

function toProgress(progress: ApiCourseProgress): CourseProgressViewModel {
  return {
    courseId: progress.courseId,
    percent: progress.percent,
    completedLessons: progress.completedLessons,
    totalLessons: progress.totalLessons,
    completedLabel: `${progress.completedLessons}/${progress.totalLessons} bài hoàn thành`,
  }
}

function lessonStatus(status?: string): LessonSummaryModel['progressStatus'] {
  return status === 'COMPLETED' || status === 'IN_PROGRESS' ? status : 'NOT_STARTED'
}

function toLessonSummary(lesson: {
  id: string
  title: string
  lessonType: 'LECTURE' | 'PRACTICE'
  estimatedMinutes: number | null
  countsTowardProgress: boolean
  progress?: { status: string }
}): LessonSummaryModel {
  return {
    id: lesson.id,
    title: lesson.title,
    lessonType: lesson.lessonType,
    contentStatus: 'PUBLISHED',
    ...(lesson.estimatedMinutes !== null ? { estimatedMinutes: lesson.estimatedMinutes } : {}),
    countsTowardProgress: lesson.countsTowardProgress,
    progressStatus: lessonStatus(lesson.progress?.status),
  }
}

function toSection(
  section: ApiStudentCourseOverview['sections'][number],
  courseId: string,
): CourseSectionModel {
  return {
    id: section.id,
    courseId,
    title: section.title,
    description: section.description,
    sectionType: section.sectionType,
    contentStatus: 'PUBLISHED',
    sortOrder: section.sortOrder,
    lessons: section.lessons.map(toLessonSummary),
  }
}

function toAccess(access: string, enrollment?: ApiEnrollment): CourseAccessViewModel {
  if (enrollment?.status === 'REVOKED' || access === 'REVOKED') {
    return {
      kind: 'restricted',
      label: 'Quyền học đã bị thu hồi',
      reason: 'Liên hệ quản trị viên để được hỗ trợ khôi phục.',
    }
  }
  if (enrollment && effectiveAccess(enrollment) === 'expired-display') {
    return {
      kind: 'expired-display',
      label: 'Quyền học đã hết hạn',
      expiresAt: enrollment.expiresAt,
    }
  }
  if (access === 'ACTIVE' || access === 'AVAILABLE')
    return { kind: 'available', label: 'Quyền học đang hoạt động' }
  return {
    kind: 'restricted',
    label: 'Chưa có quyền học',
    reason: 'Máy chủ chưa xác nhận enrollment đang hoạt động.',
  }
}

function extractParagraphs(content: unknown): string[] {
  if (typeof content === 'string')
    return content
      .split(/\n{2,}/)
      .map((part) => part.trim())
      .filter(Boolean)
  if (Array.isArray(content))
    return content.filter((value): value is string => typeof value === 'string')
  if (content && typeof content === 'object' && 'paragraphs' in content) {
    const paragraphs = (content as { paragraphs?: unknown }).paragraphs
    if (Array.isArray(paragraphs))
      return paragraphs.filter((value): value is string => typeof value === 'string')
  }
  return []
}

function idempotencyKey() {
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`
}

function mapOrderSummary(order: ApiOrder): OrderSummaryViewModel {
  const orderTitle =
    order.orderType === 'RENEWAL' && order.renewalPlanTitleSnapshot
      ? `${order.courseTitleSnapshot} · ${order.renewalPlanTitleSnapshot}`
      : order.courseTitleSnapshot
  return {
    id: order.id,
    orderCode: order.orderCode,
    orderType: order.orderType,
    status: order.status,
    itemTitle: orderTitle,
    amountVnd: order.totalAmount,
    createdAt: order.createdAt,
    paymentStatus:
      order.status === 'PAID' ? 'SUCCESS' : order.status === 'PENDING' ? 'PENDING' : 'FAILED',
  }
}

function toOrderDetail(detail: ApiOrderDetail): StudentOrderDetailViewModel {
  const order = detail.order
  const enrollment = detail.enrollment ? toEnrollment(detail.enrollment) : undefined
  return {
    order: mapOrderSummary(order),
    courseId: order.courseId,
    originalAmountVnd: order.baseAmount,
    discountAmountVnd: order.discountAmount,
    totalAmountVnd: order.totalAmount,
    durationMonths: order.durationMonthsSnapshot,
    ...(order.renewalPlanId ? { planId: order.renewalPlanId } : {}),
    paymentInstructions: detail.paymentInstructions,
    transferReported: Boolean(order.paymentSubmittedAt),
    ...(enrollment ? { enrollment } : {}),
    access: enrollment
      ? toAccess(enrollment.status, detail.enrollment ?? undefined)
      : {
          kind: 'restricted',
          label:
            order.status === 'PAID' ? 'Đang cập nhật quyền học' : 'Đơn hàng chưa cấp quyền học',
          reason: 'Chỉ thao tác duyệt của Admin mới cập nhật enrollment.',
        },
  }
}

function contextDetails(context: string): { orderType: 'PURCHASE' | 'RENEWAL'; courseId: string } {
  const [type, ...parts] = context.split(':')
  if (type === 'RENEWAL' || type === 'PURCHASE')
    return { orderType: type, courseId: parts.join(':') }
  return { orderType: 'PURCHASE' as const, courseId: context }
}

async function getSignedMedia(
  asset: ApiLessonAsset | ApiExercise['assets'][number],
  owner: { lessonId: string } | { exerciseId: string },
): Promise<MediaViewModel> {
  const id = asset.assetId
  try {
    const access = await apiRequest<ApiMediaAccess>('/learn/media-access', {
      method: 'POST',
      body: { assetId: id, ...owner },
    })
    return {
      id,
      title: asset.title || asset.role,
      mediaType: asset.mediaType,
      src: access.url,
      signedUrlExpiresAt: access.expiresAt,
      canDownload: asset.mediaType === 'PDF' || asset.mediaType === 'AUDIO',
      availability: 'ready',
    }
  } catch (error) {
    const unavailable =
      error instanceof ApiError &&
      error.status === 503 &&
      error.code === 'MEDIA_STORAGE_UNAVAILABLE'
    return {
      id,
      title: asset.title || asset.role,
      mediaType: asset.mediaType,
      canDownload: false,
      availability: unavailable ? 'unavailable' : 'error',
      message: unavailable
        ? 'Kho lưu trữ media chưa được cấu hình. Nội dung chữ và bài quiz vẫn sử dụng được.'
        : error instanceof Error
          ? error.message
          : 'Không tải được media.',
    }
  }
}

function toExerciseSummary(exercise: ApiExercise): StudentExerciseSummaryViewModel {
  return {
    id: exercise.id,
    lessonId: exercise.lessonId,
    title: exercise.title,
    exerciseType: exercise.exerciseType,
    status: exercise.progress?.status ?? 'NOT_STARTED',
    isRequired: exercise.isRequired,
    href: `/learn/exercises/${exercise.id}`,
  }
}

const student: StudentRepository & {
  listCoursesPage(page: number, pageSize: number): Promise<ApiPage<StudentCourseRecord>>
} = {
  async getDashboard() {
    const dashboard = await apiRequest<ApiStudentDashboard>('/me/dashboard')
    return {
      profile: toProfile(dashboard.profile),
      courses: dashboard.courses.map(toCourseRecord),
    }
  },
  async listCourses() {
    const result = await this.listCoursesPage(1, 100)
    return result.items
  },
  async listCoursesPage(page, pageSize) {
    const result = await apiRequest<ApiPage<ApiEnrollment>>(
      `/me/courses?page=${page}&pageSize=${pageSize}`,
    )
    return { ...result, items: result.items.map(toCourseRecord) }
  },
}

const learning: StudentLearningRepository = {
  async getCourseOverview(_sessionId, courseId) {
    const overview = await apiRequest<ApiStudentCourseOverview>(
      `/me/courses/${encodeURIComponent(courseId)}`,
    )
    const sections = overview.sections.map((section) => toSection(section, overview.course.id))
    const firstIncomplete = overview.sections
      .flatMap((section) => section.lessons)
      .find((lesson) => lesson.countsTowardProgress && lesson.progress.status !== 'COMPLETED')
    return {
      course: {
        id: overview.course.id,
        slug: overview.course.slug,
        title: overview.course.title,
        level: overview.course.level,
      },
      tree: {
        courseId: overview.course.id,
        courseTitle: overview.course.title,
        sections,
        ...(firstIncomplete ? { currentLessonId: firstIncomplete.id } : {}),
      },
      access: toAccess(overview.access),
      progress: toProgress(overview.progress),
      ...(firstIncomplete ? { continueLessonId: firstIncomplete.id } : {}),
    }
  },
  async getSection(_sessionId, courseId, sectionId) {
    const [section, course] = await Promise.all([
      apiRequest<ApiStudentSection>(
        `/learn/courses/${encodeURIComponent(courseId)}/sections/${encodeURIComponent(sectionId)}`,
      ),
      apiRequest<ApiStudentCourseOverview>(`/me/courses/${encodeURIComponent(courseId)}`),
    ])
    return {
      courseId: section.courseId,
      courseTitle: course.course.title,
      courseLevel: course.course.level,
      section: toSection(section.section, courseId),
      access: toAccess(section.access),
    }
  },
  async getLesson(_sessionId, lessonId) {
    const workspace = await apiRequest<ApiLessonWorkspace>(
      `/learn/lessons/${encodeURIComponent(lessonId)}`,
    )
    const [course, media, solutionVideos] = await Promise.all([
      apiRequest<ApiStudentCourseOverview>(`/me/courses/${encodeURIComponent(workspace.courseId)}`),
      Promise.all(
        (workspace.media.length ? workspace.media : workspace.assets).map((asset) =>
          getSignedMedia(asset, { lessonId: workspace.id }),
        ),
      ),
      Promise.all(
        workspace.exercises.flatMap((exercise) =>
          exercise.capabilities.canViewSolutions
            ? exercise.assets
                .filter((asset) => asset.role === 'SOLUTION_VIDEO')
                .map(async (asset) => ({
                  exerciseId: exercise.id,
                  exerciseTitle: exercise.title,
                  media: {
                    ...(await getSignedMedia(asset, { exerciseId: exercise.id })),
                    title: asset.title || `Video chữa bài · ${exercise.title}`,
                  },
                }))
            : [],
        ),
      ),
    ])
    const courseLessons = course.sections.flatMap((section) =>
      section.lessons.map((item, index) => ({
        ...item,
        sectionId: section.id,
        sectionTitle: section.title,
        lessonNumber: index + 1,
      })),
    )
    const lessonProgress = courseLessons.find((item) => item.id === workspace.id)?.progress
    const section = course.sections.find((item) => item.id === workspace.sectionId)
    const currentLessonIndex = courseLessons.findIndex((item) => item.id === workspace.id)
    const progressStatus = lessonProgress?.status ?? 'NOT_STARTED'
    const lesson: LessonSummaryModel = {
      id: workspace.id,
      title: workspace.title,
      lessonType: workspace.lessonType,
      contentStatus: 'PUBLISHED',
      ...(workspace.estimatedMinutes !== null
        ? { estimatedMinutes: workspace.estimatedMinutes }
        : {}),
      countsTowardProgress: workspace.countsTowardProgress,
      progressStatus,
    }
    return {
      lesson,
      courseId: workspace.courseId,
      courseTitle: course.course.title,
      sectionId: workspace.sectionId,
      ...(section ? { sectionTitle: section.title } : {}),
      ...(currentLessonIndex >= 0
        ? { lessonNumber: courseLessons[currentLessonIndex]!.lessonNumber }
        : {}),
      paragraphs: extractParagraphs(workspace.content),
      video: workspace.video,
      solutionVideo: workspace.solutionVideo,
      media,
      access: toAccess(course.access),
      exercises: workspace.exercises.map(toExerciseSummary),
      solutionVideos,
      hasRestrictedSolutionVideos: workspace.exercises.some(
        (exercise) =>
          !exercise.capabilities.canViewSolutions &&
          exercise.assets.some((asset) => asset.role === 'SOLUTION_VIDEO'),
      ),
      progressItems: courseLessons.map((item) => ({
        lessonId: item.id,
        title: item.title,
        status: item.progress.status,
        href: `/learn/lessons/${item.id}`,
        sectionId: item.sectionId,
        sectionTitle: item.sectionTitle,
        lessonNumber: item.lessonNumber,
      })),
      canCompleteLesson: workspace.canCompleteLesson,
      isCompleted: progressStatus === 'COMPLETED',
      ...(currentLessonIndex > 0
        ? { previousLessonId: courseLessons[currentLessonIndex - 1]!.id }
        : {}),
      ...(currentLessonIndex >= 0 && currentLessonIndex < courseLessons.length - 1
        ? { nextLessonId: courseLessons[currentLessonIndex + 1]!.id }
        : {}),
    }
  },
  async getExercise(_sessionId, exerciseId) {
    const exercise = await apiRequest<ApiExercise>(
      `/learn/exercises/${encodeURIComponent(exerciseId)}`,
    )
    const assets = await Promise.all(
      exercise.assets.map((asset) => getSignedMedia(asset, { exerciseId: exercise.id })),
    )
    return {
      id: exercise.id,
      lessonId: exercise.lessonId,
      title: exercise.title,
      ...(exercise.description ? { description: exercise.description } : {}),
      instructions: exercise.instructions,
      exerciseType: exercise.exerciseType,
      completionMode: exercise.completionMode,
      isRequired: exercise.isRequired,
      status: exercise.progress?.status ?? 'NOT_STARTED',
      assets: exercise.assets.map((asset, index) => ({
        id: asset.assetId,
        title: asset.title || asset.role,
        role: asset.role,
        mediaType: asset.mediaType,
        ...(assets[index]?.src ? { src: assets[index].src } : {}),
        canDownload:
          Boolean(assets[index]?.src) && (asset.mediaType === 'PDF' || asset.mediaType === 'AUDIO'),
        ...(assets[index]
          ? {
              availability: assets[index].availability,
              ...(assets[index].signedUrlExpiresAt
                ? { signedUrlExpiresAt: assets[index].signedUrlExpiresAt }
                : {}),
              ...(assets[index].message ? { message: assets[index].message } : {}),
            }
          : {}),
      })),
      capabilities: exercise.capabilities,
    }
  },
  async completeExercise(_sessionId, exerciseId) {
    const exercise = await apiRequest<ApiExercise>(
      `/learn/exercises/${encodeURIComponent(exerciseId)}/complete`,
      { method: 'POST', body: {} },
    )
    return {
      id: exercise.id,
      lessonId: exercise.lessonId,
      title: exercise.title,
      ...(exercise.description ? { description: exercise.description } : {}),
      instructions: exercise.instructions,
      exerciseType: exercise.exerciseType,
      completionMode: exercise.completionMode,
      isRequired: exercise.isRequired,
      status: exercise.progress?.status ?? 'COMPLETED',
      assets: [],
      capabilities: exercise.capabilities,
    }
  },
  async startQuiz(_sessionId, exerciseId, key) {
    const attempt = await apiRequest<ApiQuizAttempt>(
      `/learn/exercises/${encodeURIComponent(exerciseId)}/quiz-attempts`,
      { method: 'POST', body: {}, idempotencyKey: key ?? idempotencyKey() },
    )
    return mapQuizAttempt(attempt)
  },
  async getQuizAttempt(_sessionId, attemptId) {
    return mapQuizAttempt(
      await apiRequest<ApiQuizAttempt>(`/learn/quiz-attempts/${encodeURIComponent(attemptId)}`),
    )
  },
  async selectQuizAnswer(_sessionId, attemptId, questionId, optionId) {
    const attempt = await apiRequest<ApiQuizAttempt>(
      `/learn/quiz-attempts/${encodeURIComponent(attemptId)}/answers/${encodeURIComponent(questionId)}`,
      { method: 'PUT', body: { selectedOptionId: optionId } },
    )
    return mapQuizAttempt(attempt)
  },
  async submitQuiz(_sessionId, attemptId) {
    return mapQuizResult(
      await apiRequest<ApiQuizResult>(
        `/learn/quiz-attempts/${encodeURIComponent(attemptId)}/submit`,
        { method: 'POST', body: {} },
      ),
    )
  },
  async getQuizResult(_sessionId, attemptId) {
    return mapQuizResult(
      await apiRequest<ApiQuizResult>(
        `/learn/quiz-attempts/${encodeURIComponent(attemptId)}/result`,
      ),
    )
  },
  async retryQuiz(_sessionId, attemptId, key) {
    const attempt = await apiRequest<ApiQuizAttempt>(
      `/learn/quiz-attempts/${encodeURIComponent(attemptId)}/retry`,
      { method: 'POST', body: {}, idempotencyKey: key ?? idempotencyKey() },
    )
    return mapQuizAttempt(attempt)
  },
  async completeLesson(_sessionId, lessonId) {
    const [workspace, completion] = await Promise.all([
      apiRequest<ApiLessonWorkspace>(`/learn/lessons/${encodeURIComponent(lessonId)}`),
      apiRequest<{ lessonId: string; status: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED' }>(
        `/learn/lessons/${encodeURIComponent(lessonId)}/complete`,
        { method: 'POST', body: {} },
      ),
    ])
    return {
      id: completion.lessonId,
      title: workspace.title,
      lessonType: workspace.lessonType,
      contentStatus: 'PUBLISHED',
      ...(workspace.estimatedMinutes !== null
        ? { estimatedMinutes: workspace.estimatedMinutes }
        : {}),
      countsTowardProgress: workspace.countsTowardProgress,
      progressStatus: completion.status,
    }
  },
  async getProgress(_sessionId, courseId) {
    return toProgress(
      await apiRequest<ApiCourseProgress>(
        `/learn/courses/${encodeURIComponent(courseId)}/progress`,
      ),
    )
  },
  async getLessonNote(_sessionId, lessonId) {
    const note = await apiRequest<ApiLessonNote>(
      `/learn/lessons/${encodeURIComponent(lessonId)}/notes`,
    )
    return note.content
  },
  async saveLessonNote(_sessionId, lessonId, value) {
    const note = await apiRequest<ApiLessonNote>(
      `/learn/lessons/${encodeURIComponent(lessonId)}/notes`,
      { method: 'PUT', body: { content: value } },
    )
    return note.content
  },
}

function mapQuizAttempt(attempt: ApiQuizAttempt): QuizAttemptViewModel {
  return {
    id: attempt.id,
    status: attempt.status,
    questions: attempt.questions.map((question) => ({
      id: question.id,
      prompt: question.prompt,
      questionType: 'SINGLE_CHOICE',
      options: question.options,
    })),
    selectedAnswers: Object.fromEntries(
      Object.entries(attempt.selectedAnswers).flatMap(([key, value]) =>
        value ? [[key, value]] : [],
      ),
    ),
    capabilities: { canSubmit: attempt.status === 'IN_PROGRESS' },
  }
}

function mapQuizResult(result: ApiQuizResult): QuizResultViewModel {
  return {
    attemptId: result.attemptId,
    score: result.score,
    maxScore: result.maxScore,
    correctCount: result.correctCount,
    totalQuestions: result.totalQuestions,
    review: result.review.map((item) => ({
      questionId: item.questionId,
      ...(item.selectedOptionId ? { selectedOptionId: item.selectedOptionId } : {}),
      ...(item.selectedOption ? { selectedOption: item.selectedOption } : {}),
      ...(item.correctOptionId ? { correctOptionId: item.correctOptionId } : {}),
      ...(item.correctOption ? { correctOption: item.correctOption } : {}),
      ...(item.explanation ? { explanation: item.explanation } : {}),
    })),
    capabilities: { canReviewAnswers: result.review.length > 0, canRetry: true },
  }
}

const commerce: StudentCommerceRepository & {
  listOrdersPage(page: number, pageSize: number): Promise<ApiPage<StudentOrderDetailViewModel>>
} = {
  async getCheckoutContext(_sessionId, context, planId, couponCode) {
    const { courseId, orderType } = contextDetails(context)
    const params = new URLSearchParams({ courseId, orderType })
    if (planId) params.set('renewalPlanId', planId)
    if (couponCode) params.set('couponCode', couponCode.trim().toUpperCase())
    const quote = await apiRequest<ApiOrderQuote>(`/checkout/quote?${params.toString()}`)
    const renewal =
      orderType === 'RENEWAL'
        ? await apiRequest<ApiRenewalPlanList>(
            `/renewals/courses/${encodeURIComponent(courseId)}/plans`,
          )
        : null
    const selectedPlan = renewal?.items.find((plan) => plan.id === planId)
    return {
      context,
      orderType,
      courseId,
      courseTitle: quote.courseTitle,
      originalAmountVnd: quote.baseAmount,
      discountAmountVnd: quote.discountAmount,
      couponDiscountAmountVnd: quote.couponDiscountAmount,
      automaticDiscountAmountVnd: quote.automaticDiscountAmount,
      discountSource: quote.discountSource,
      totalAmountVnd: quote.totalAmount,
      ...(quote.couponCode ? { couponCode: quote.couponCode } : {}),
      durationMonths: quote.durationMonths,
      ...(selectedPlan
        ? {
            plan: {
              id: selectedPlan.id,
              title: selectedPlan.title,
              durationMonths: selectedPlan.durationMonths,
              priceVnd: selectedPlan.price,
              status: 'ACTIVE' as const,
            },
          }
        : {}),
      ...(renewal?.course.enrollmentExpiresAt
        ? { currentExpiry: renewal.course.enrollmentExpiresAt }
        : {}),
    }
  },
  async validateCoupon(_sessionId, context, code, planId) {
    const { courseId, orderType } = contextDetails(context)
    try {
      const result = await apiRequest<ApiCouponValidation>('/coupons/validate', {
        method: 'POST',
        body: {
          courseId,
          orderType,
          ...(planId ? { renewalPlanId: planId } : {}),
          code: code.trim().toUpperCase(),
        },
      })
      return result.valid
        ? {
            kind: 'valid',
            code: result.code,
            discountAmountVnd: result.discountSource === 'COUPON' ? result.discountAmount : '0',
            message: result.message,
          }
        : { kind: 'invalid', code: result.code, message: result.message }
    } catch (error) {
      if (error instanceof ApiError && error.status === 422)
        return {
          kind: 'invalid',
          code: code.trim().toUpperCase(),
          message: error.message,
          status: error.status,
        }
      throw error
    }
  },
  async createOrder(_sessionId, context, input = {}) {
    const { courseId, orderType } = contextDetails(context)
    const detail = await apiRequest<ApiOrderDetail>('/orders', {
      method: 'POST',
      body: {
        courseId,
        orderType,
        ...(orderType === 'RENEWAL' && input.planId ? { renewalPlanId: input.planId } : {}),
        ...(input.couponCode ? { couponCode: input.couponCode.trim().toUpperCase() } : {}),
      },
      idempotencyKey: input.idempotencyKey ?? idempotencyKey(),
    })
    return toOrderDetail(detail)
  },
  async listOrders() {
    const result = await this.listOrdersPage(1, 100)
    return result.items
  },
  async listOrdersPage(page, pageSize) {
    const result = await apiRequest<ApiPage<ApiOrder>>(`/orders?page=${page}&pageSize=${pageSize}`)
    return {
      ...result,
      items: result.items.map((order) => toOrderDetail({ order, paymentInstructions: null })),
    }
  },
  async getOrder(_sessionId, orderId) {
    return toOrderDetail(await apiRequest<ApiOrderDetail>(`/orders/${encodeURIComponent(orderId)}`))
  },
  async getRenewalPlans(_sessionId, courseId) {
    const result = await apiRequest<ApiRenewalPlanList>(
      `/renewals/courses/${encodeURIComponent(courseId)}/plans`,
    )
    return {
      course: result.course,
      plans: result.items.map((plan) => ({
        id: plan.id,
        title: plan.title,
        durationMonths: plan.durationMonths,
        priceVnd: plan.price,
        status: 'ACTIVE',
      })),
    }
  },
  async simulateDemoPayment() {
    throw new ApiError({
      status: 410,
      code: 'PAYMENT_SIMULATION_REMOVED',
      message: 'Xác nhận thanh toán giả đã bị gỡ. Hãy báo đã chuyển khoản và chờ Admin duyệt.',
    })
  },
  async confirmTransfer(_sessionId, orderId) {
    const detail = await apiRequest<ApiOrderDetail>(
      `/orders/${encodeURIComponent(orderId)}/confirm-transfer`,
      { method: 'POST', body: {} },
    )
    return toOrderDetail(detail)
  },
  async cancelOrder(_sessionId, orderId) {
    const detail = await apiRequest<ApiOrderDetail>(
      `/orders/${encodeURIComponent(orderId)}/cancel`,
      { method: 'POST', body: {} },
    )
    return toOrderDetail(detail)
  },
}

const account: StudentAccountRepository = {
  async getProfile() {
    return toProfile(await apiRequest<ApiUserProfile>('/me/profile'))
  },
  async updateProfile(_sessionId, profile) {
    return toProfile(
      await apiRequest<ApiUserProfile>('/me/profile', {
        method: 'PATCH',
        body: { fullName: profile.displayName },
      }),
    )
  },
  async changePassword(_sessionId, currentPassword, newPassword) {
    await apiRequest<Record<string, never>>('/me/password', {
      method: 'PUT',
      body: { currentPassword, newPassword },
    })
    publishSessionRevoked('revoked')
  },
  async listSessions() {
    const page = await apiRequest<{
      items: Array<{
        id: string
        deviceName: string | null
        status: 'ACTIVE' | 'REVOKED' | 'EXPIRED'
        lastActiveAt: string
        isCurrent: boolean
      }>
    }>('/me/sessions?page=1&pageSize=100')
    return page.items.map((session): SessionSummaryViewModel => ({
      id: session.id,
      ...(session.deviceName ? { deviceName: session.deviceName } : {}),
      status: session.status,
      lastActiveAt: session.lastActiveAt,
      isCurrent: session.isCurrent,
    }))
  },
  async revokeSession(_sessionId, targetSessionId) {
    await apiRequest<Record<string, never>>(`/me/sessions/${encodeURIComponent(targetSessionId)}`, {
      method: 'DELETE',
    })
  },
}

export const apiStudentRepositories: StudentProductRepositories & {
  student: typeof student
  commerce: typeof commerce
} = {
  student,
  learning,
  commerce,
  account,
}
