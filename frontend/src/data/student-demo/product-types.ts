import type { StudentProfileViewModel, SessionSummaryViewModel } from '@/domains/account/models'
import type {
  CourseAccessViewModel,
  CourseDetailModel,
  CourseSectionModel,
} from '@/domains/catalog/models'
import type {
  CouponValidationViewModel,
  OrderSummaryViewModel,
  RenewalPlanViewModel,
} from '@/domains/commerce/models'
import type { ExerciseViewModel } from '@/domains/exercises/models'
import type { EnrollmentSummaryViewModel } from '@/domains/enrollment/models'
import type { LessonContentViewModel, CourseTreeViewModel } from '@/domains/learning/models'
import type {
  CourseProgressViewModel,
  LessonProgressItemViewModel,
} from '@/domains/progress/models'
import type { QuizAttemptViewModel, QuizResultViewModel } from '@/domains/quizzes/models'
import type { StudentRepository } from './types'

export interface StudentLearningCourseViewModel {
  course: Pick<CourseDetailModel, 'id' | 'slug' | 'title' | 'level'>
  tree: CourseTreeViewModel
  access: CourseAccessViewModel
  progress: CourseProgressViewModel
  continueLessonId?: string
}

export interface StudentLearningSectionViewModel {
  courseId: string
  courseTitle: string
  section: CourseSectionModel
  access: CourseAccessViewModel
}

export interface StudentExerciseSummaryViewModel {
  id: string
  lessonId: string
  title: string
  exerciseType: ExerciseViewModel['exerciseType']
  status: ExerciseViewModel['status']
  isRequired: boolean
  href: string
}

export interface StudentLessonWorkspaceViewModel extends LessonContentViewModel {
  courseId: string
  courseTitle: string
  sectionId: string
  exercises: readonly StudentExerciseSummaryViewModel[]
  progressItems: readonly LessonProgressItemViewModel[]
  canCompleteLesson: boolean
  isCompleted: boolean
  previousLessonId?: string
  nextLessonId?: string
}

export interface StudentCheckoutContextViewModel {
  context: string
  orderType: 'PURCHASE' | 'RENEWAL'
  courseId: string
  courseTitle: string
  originalAmountVnd: string
  discountAmountVnd: string
  totalAmountVnd: string
  couponCode?: string
  durationMonths: number
  plan?: RenewalPlanViewModel
  currentExpiry?: string
  hypotheticalPrice: true
}

export interface StudentOrderDetailViewModel {
  order: OrderSummaryViewModel
  courseId: string
  originalAmountVnd: string
  discountAmountVnd: string
  totalAmountVnd: string
  couponCode?: string
  durationMonths: number
  planId?: string
  enrollment?: EnrollmentSummaryViewModel
  access: CourseAccessViewModel
}

export interface DemoPaymentResultViewModel {
  order: OrderSummaryViewModel
  enrollment?: EnrollmentSummaryViewModel
  access: CourseAccessViewModel
}

export interface StudentLearningRepository {
  getCourseOverview(sessionId: string, courseId: string): Promise<StudentLearningCourseViewModel>
  getSection(
    sessionId: string,
    courseId: string,
    sectionId: string,
  ): Promise<StudentLearningSectionViewModel>
  getLesson(sessionId: string, lessonId: string): Promise<StudentLessonWorkspaceViewModel>
  getExercise(sessionId: string, exerciseId: string): Promise<ExerciseViewModel>
  completeExercise(sessionId: string, exerciseId: string): Promise<ExerciseViewModel>
  startQuiz(sessionId: string, exerciseId: string): Promise<QuizAttemptViewModel>
  getQuizAttempt(sessionId: string, attemptId: string): Promise<QuizAttemptViewModel>
  selectQuizAnswer(
    sessionId: string,
    attemptId: string,
    questionId: string,
    optionId: string,
  ): Promise<QuizAttemptViewModel>
  submitQuiz(sessionId: string, attemptId: string): Promise<QuizResultViewModel>
  getQuizResult(sessionId: string, attemptId: string): Promise<QuizResultViewModel>
  retryQuiz(sessionId: string, attemptId: string): Promise<QuizAttemptViewModel>
  completeLesson(sessionId: string, lessonId: string): Promise<LessonContentViewModel['lesson']>
  getProgress(sessionId: string, courseId: string): Promise<CourseProgressViewModel>
  getLessonNote(sessionId: string, lessonId: string): Promise<string>
  saveLessonNote(sessionId: string, lessonId: string, value: string): Promise<string>
}

export interface StudentCommerceRepository {
  getCheckoutContext(
    sessionId: string,
    context: string,
    planId?: string,
    couponCode?: string,
  ): Promise<StudentCheckoutContextViewModel>
  validateCoupon(
    sessionId: string,
    context: string,
    code: string,
    planId?: string,
  ): Promise<CouponValidationViewModel>
  createOrder(
    sessionId: string,
    context: string,
    input?: { couponCode?: string; planId?: string },
  ): Promise<StudentOrderDetailViewModel>
  listOrders(sessionId: string): Promise<readonly StudentOrderDetailViewModel[]>
  getOrder(sessionId: string, orderId: string): Promise<StudentOrderDetailViewModel>
  getRenewalPlans(sessionId: string, courseId: string): Promise<readonly RenewalPlanViewModel[]>
  simulateDemoPayment(
    sessionId: string,
    orderId: string,
    outcome: 'success' | 'failure',
  ): Promise<DemoPaymentResultViewModel>
}

export interface StudentAccountRepository {
  getProfile(sessionId: string): Promise<StudentProfileViewModel>
  updateProfile(
    sessionId: string,
    profile: Pick<StudentProfileViewModel, 'displayName'>,
  ): Promise<StudentProfileViewModel>
  changePassword(sessionId: string, currentPassword: string, newPassword: string): Promise<void>
  listSessions(sessionId: string): Promise<readonly SessionSummaryViewModel[]>
  revokeSession(sessionId: string, targetSessionId: string): Promise<void>
}

export interface StudentProductRepositories {
  student: StudentRepository
  learning: StudentLearningRepository
  commerce: StudentCommerceRepository
  account: StudentAccountRepository
}
