import type {
  CourseAccessViewModel,
  CourseDetailModel,
  MockPreviewManifest,
} from '@/domains/catalog/models'
import type { MediaViewModel } from '@/domains/media/models'
import type { ExerciseViewModel } from '@/domains/exercises/models'
import type { QuizAttemptViewModel, QuizResultViewModel } from '@/domains/quizzes/models'
import type { CourseProgressViewModel } from '@/domains/progress/models'
import type { ProgressStatus } from '@/domains/contracts/backend-enums'
import type { EnrollmentSummaryViewModel } from '@/domains/enrollment/models'
import type { CouponValidationViewModel, OrderSummaryViewModel } from '@/domains/commerce/models'
import type { SessionSummaryViewModel, StudentProfileViewModel } from '@/domains/account/models'
import type { MockScenarioId } from './scenario-types'

export const MOCK_PREVIEW_MANIFEST: MockPreviewManifest = {
  mode: 'MOCK_ONLY',
  source: 'customer-requested-demo',
  courseCode: 'A1.1',
  sectionIds: ['a11-chapter-01', 'a11-chapter-02', 'a11-chapter-03'],
  notice:
    'Bản demo theo yêu cầu khách hàng. Đây là cấu hình xem trước mock, chưa phải chính sách cấp quyền production.',
}

export const A11_COURSE: CourseDetailModel = {
  id: 'course-a11-demo',
  code: 'A1.1',
  slug: 'tieng-duc-a1-1',
  title: 'Tiếng Đức A1.1 · Bắt đầu giao tiếp',
  level: 'A1.1',
  shortDescription:
    'Làm quen cách chào hỏi, giới thiệu bản thân và những cuộc hội thoại đầu tiên bằng tiếng Đức.',
  thumbnailUrl: '/demo-assets/a11-course-card.svg',
  description:
    'Một bộ nội dung minh họa để kiểm tra cách trình bày khóa học. Tên chương, bài và tài liệu trong fixture chỉ phục vụ giao diện demo.',
  objectives: [
    'Chào hỏi và tạm biệt trong tình huống quen thuộc.',
    'Giới thiệu tên, quê quán và ngôn ngữ.',
    'Nhận biết câu hỏi và câu trả lời ngắn trong hội thoại.',
  ],
  requirements: [
    'Không cần kiến thức tiếng Đức trước đó.',
    'Có thể học bằng điện thoại hoặc máy tính.',
  ],
  priceVnd: '1290000',
  accessDurationMonths: 12,
  status: 'PUBLISHED',
  chapterCount: 4,
  lessonCount: 7,
  sections: [
    {
      id: 'a11-chapter-01',
      courseId: 'course-a11-demo',
      title: 'Hallo! · Chào hỏi',
      description: 'Cụm từ chào hỏi thông dụng.',
      sectionType: 'CHAPTER',
      contentStatus: 'PUBLISHED',
      sortOrder: 10,
      lessons: [
        {
          id: 'a11-lesson-01',
          title: 'Guten Tag!',
          lessonType: 'LECTURE',
          contentStatus: 'PUBLISHED',
          estimatedMinutes: 12,
          countsTowardProgress: true,
          progressStatus: 'NOT_STARTED',
        },
        {
          id: 'a11-lesson-02',
          title: 'Wie geht es Ihnen?',
          lessonType: 'PRACTICE',
          contentStatus: 'PUBLISHED',
          estimatedMinutes: 9,
          countsTowardProgress: true,
          progressStatus: 'NOT_STARTED',
        },
      ],
    },
    {
      id: 'a11-chapter-02',
      courseId: 'course-a11-demo',
      title: 'Ich heiße … · Tên và cách xưng hô',
      sectionType: 'CHAPTER',
      contentStatus: 'PUBLISHED',
      sortOrder: 20,
      lessons: [
        {
          id: 'a11-lesson-03',
          title: 'Tên của tôi là …',
          lessonType: 'LECTURE',
          contentStatus: 'PUBLISHED',
          estimatedMinutes: 10,
          countsTowardProgress: true,
          progressStatus: 'NOT_STARTED',
        },
        {
          id: 'a11-lesson-04',
          title: 'Hỏi và đánh vần tên',
          lessonType: 'PRACTICE',
          contentStatus: 'PUBLISHED',
          estimatedMinutes: 8,
          countsTowardProgress: true,
          progressStatus: 'NOT_STARTED',
        },
      ],
    },
    {
      id: 'a11-chapter-03',
      courseId: 'course-a11-demo',
      title: 'Woher kommen Sie? · Nguồn gốc',
      sectionType: 'CHAPTER',
      contentStatus: 'PUBLISHED',
      sortOrder: 30,
      lessons: [
        {
          id: 'a11-lesson-05',
          title: 'Quê quán và quốc tịch',
          lessonType: 'LECTURE',
          contentStatus: 'PUBLISHED',
          estimatedMinutes: 11,
          countsTowardProgress: true,
          progressStatus: 'NOT_STARTED',
        },
      ],
    },
    {
      id: 'a11-chapter-04',
      courseId: 'course-a11-demo',
      title: 'Sprachen · Ngôn ngữ',
      sectionType: 'CHAPTER',
      contentStatus: 'PUBLISHED',
      sortOrder: 40,
      lessons: [
        {
          id: 'a11-lesson-06',
          title: 'Bạn nói tiếng gì?',
          lessonType: 'LECTURE',
          contentStatus: 'PUBLISHED',
          estimatedMinutes: 13,
          countsTowardProgress: true,
          progressStatus: 'NOT_STARTED',
        },
      ],
    },
    {
      id: 'a11-exam-prep-01',
      courseId: 'course-a11-demo',
      title: 'Ôn tập · Chào hỏi và giới thiệu',
      sectionType: 'EXAM_PREP',
      contentStatus: 'PUBLISHED',
      sortOrder: 50,
      lessons: [
        {
          id: 'a11-lesson-07',
          title: 'Ôn tập chương đầu',
          lessonType: 'PRACTICE',
          contentStatus: 'PUBLISHED',
          estimatedMinutes: 15,
          countsTowardProgress: true,
          progressStatus: 'NOT_STARTED',
        },
      ],
    },
  ],
}

export const MOCK_MEDIA: readonly MediaViewModel[] = [
  {
    id: 'media-video-greeting',
    title: 'Video hội thoại mẫu',
    mediaType: 'VIDEO',
    availability: 'unavailable',
    canDownload: false,
    message: 'Video demo chưa được nối với URL media được cấp quyền.',
  },
  {
    id: 'media-audio-greeting',
    title: 'Nghe cách phát âm',
    mediaType: 'AUDIO',
    availability: 'unavailable',
    canDownload: false,
    transcript: 'Guten Tag.\nWie geht es Ihnen?',
    message: 'Âm thanh demo chưa được nối với URL media được cấp quyền.',
  },
  {
    id: 'media-pdf-worksheet',
    title: 'Phiếu bài tập mẫu',
    mediaType: 'PDF',
    src: '/demo-assets/a11-worksheet.pdf',
    availability: 'ready',
    canDownload: false,
  },
]

export const MOCK_EXERCISE: ExerciseViewModel = {
  id: 'exercise-a11-greeting',
  title: 'Luyện nghe lời chào',
  description: 'Bài tập tệp minh họa cho chương Hallo!',
  instructions:
    'Nghe đoạn hội thoại rồi ghi lại cách chào phù hợp. Sau khi hoàn thành, gửi trạng thái để repository demo xử lý.',
  exerciseType: 'FILE_BASED',
  completionMode: 'MANUAL',
  isRequired: true,
  status: 'IN_PROGRESS',
  assets: [
    {
      id: 'exercise-question-pdf-a11',
      title: 'Phiếu câu hỏi',
      role: 'QUESTION_PDF',
      src: '/demo-assets/a11-worksheet.pdf',
      canDownload: false,
    },
    {
      id: 'exercise-answer-pdf-a11',
      title: 'Lời giải bài luyện nghe',
      role: 'ANSWER_PDF',
      src: '/demo-assets/a11-worksheet.pdf',
      canDownload: true,
    },
  ],
  capabilities: { canMarkComplete: true, canViewSolutions: false },
}

export const MOCK_QUIZ_ATTEMPT: QuizAttemptViewModel = {
  id: 'quiz-attempt-a11-demo',
  status: 'IN_PROGRESS',
  questions: [
    {
      id: 'question-greeting-01',
      prompt: 'Bạn gặp người đối diện vào buổi sáng. Câu chào nào phù hợp?',
      questionType: 'SINGLE_CHOICE',
      options: [
        { id: 'option-guten-morgen', label: 'Guten Morgen!' },
        { id: 'option-gute-nacht', label: 'Gute Nacht!' },
        { id: 'option-tschuess', label: 'Tschüss!' },
      ],
    },
    {
      id: 'question-name-01',
      prompt: 'Câu nào dùng để giới thiệu tên?',
      questionType: 'SINGLE_CHOICE',
      options: [
        { id: 'option-ich-heisse', label: 'Ich heiße …' },
        { id: 'option-ich-wohne', label: 'Ich wohne …' },
        { id: 'option-ich-bin-muede', label: 'Ich bin müde.' },
      ],
    },
  ],
  selectedAnswers: {},
  capabilities: { canSubmit: true },
}

export const MOCK_QUIZ_RESULT: QuizResultViewModel = {
  attemptId: 'quiz-attempt-a11-demo',
  score: '8',
  maxScore: '10',
  correctCount: 1,
  totalQuestions: 2,
  review: [
    {
      questionId: 'question-greeting-01',
      prompt: 'Bạn gặp người đối diện vào buổi sáng. Câu chào nào phù hợp?',
      isCorrect: true,
      selectedOptionId: 'option-guten-morgen',
      correctOptionId: 'option-guten-morgen',
      explanation: '“Guten Morgen” là lời chào buổi sáng.',
    },
    {
      questionId: 'question-name-01',
      prompt: 'Câu nào dùng để giới thiệu tên?',
      isCorrect: false,
      selectedOptionId: 'option-ich-wohne',
      correctOptionId: 'option-ich-heisse',
      explanation: '“Ich heiße” dùng để giới thiệu tên.',
    },
  ],
  capabilities: { canReviewAnswers: true, canRetry: true },
}

const activeEnrollment: EnrollmentSummaryViewModel = {
  id: 'enrollment-a11-demo',
  courseId: 'course-a11-demo',
  courseTitle: A11_COURSE.title,
  status: 'ACTIVE',
  expiresAt: '2027-11-02T08:00:00.000Z',
  accessState: 'available',
}
const expiredEnrollment: EnrollmentSummaryViewModel = {
  id: 'enrollment-a11-expired',
  courseId: 'course-a11-demo',
  courseTitle: A11_COURSE.title,
  status: 'ACTIVE',
  expiresAt: '2026-10-01T08:00:00.000Z',
  accessState: 'expired-display',
}
const revokedEnrollment: EnrollmentSummaryViewModel = {
  id: 'enrollment-a11-revoked',
  courseId: 'course-a11-demo',
  courseTitle: A11_COURSE.title,
  status: 'REVOKED',
  expiresAt: '2027-11-02T08:00:00.000Z',
  accessState: 'revoked',
}
const paidOrder: OrderSummaryViewModel = {
  id: 'order-a11-paid',
  orderCode: 'DEMO-A11-PAID',
  orderType: 'PURCHASE',
  status: 'PAID',
  itemTitle: A11_COURSE.title,
  amountVnd: '1290000',
  createdAt: '2026-10-30T03:00:00.000Z',
  paymentStatus: 'SUCCESS',
}
const pendingOrder: OrderSummaryViewModel = {
  ...paidOrder,
  id: 'order-a11-pending',
  orderCode: 'DEMO-A11-PENDING',
  status: 'PENDING',
  paymentStatus: 'PENDING',
}
const failedOrder: OrderSummaryViewModel = {
  ...paidOrder,
  id: 'order-a11-failed',
  orderCode: 'DEMO-A11-FAILED',
  status: 'FAILED',
  paymentStatus: 'FAILED',
}
const profile: StudentProfileViewModel = {
  displayName: 'Linh Nguyễn',
  email: 'linh.demo@example.test',
  status: 'ACTIVE',
}
const session: SessionSummaryViewModel = {
  id: 'session-current-demo',
  deviceName: 'Trình duyệt hiện tại',
  status: 'ACTIVE',
  lastActiveAt: '2026-11-02T07:45:00.000Z',
  isCurrent: true,
}
const revokedSession: SessionSummaryViewModel = {
  id: 'session-revoked-demo',
  deviceName: 'Phiên trình duyệt cũ',
  status: 'REVOKED',
  lastActiveAt: '2026-11-01T10:00:00.000Z',
  isCurrent: false,
}
const progressEmpty: CourseProgressViewModel = {
  courseId: 'course-a11-demo',
  percent: 0,
  completedLessons: 0,
  totalLessons: 7,
}
const progressPartial: CourseProgressViewModel = {
  courseId: 'course-a11-demo',
  percent: 29,
  completedLessons: 2,
  totalLessons: 7,
}
const noLessonProgress: Readonly<Record<string, ProgressStatus>> = {}
const partialLessonProgress: Readonly<Record<string, ProgressStatus>> = {
  'a11-lesson-01': 'COMPLETED',
  'a11-lesson-02': 'COMPLETED',
  'a11-lesson-03': 'IN_PROGRESS',
}

export interface MockScenarioFixture {
  id: MockScenarioId
  profile?: StudentProfileViewModel
  sessions: readonly SessionSummaryViewModel[]
  enrollment?: EnrollmentSummaryViewModel
  order?: OrderSummaryViewModel
  access: CourseAccessViewModel
  progress: CourseProgressViewModel
  lessonProgress: Readonly<Record<string, ProgressStatus>>
  exerciseStatus: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED'
  exerciseCapabilities: { canMarkComplete: boolean; canViewSolutions: boolean }
  quizStatus: 'IN_PROGRESS' | 'SUBMITTED'
  canSubmitQuiz: boolean
  quizResult?: QuizResultViewModel
  couponResult?: CouponValidationViewModel
  note: string
}

export const MOCK_SCENARIO_FIXTURES: Record<MockScenarioId, MockScenarioFixture> = {
  anonymous_guest: {
    id: 'anonymous_guest',
    sessions: [],
    access: {
      kind: 'customer-preview',
      label: 'Một số chương được giới thiệu theo cấu hình demo.',
      source: 'customer-requested-demo',
    },
    progress: progressEmpty,
    lessonProgress: noLessonProgress,
    exerciseStatus: 'NOT_STARTED',
    exerciseCapabilities: { canMarkComplete: false, canViewSolutions: false },
    quizStatus: 'IN_PROGRESS',
    canSubmitQuiz: false,
    note: '',
  },
  registered_without_enrollment: {
    id: 'registered_without_enrollment',
    profile,
    sessions: [session],
    access: {
      kind: 'restricted',
      label: 'Chưa có quyền truy cập khóa học',
      reason: 'Tài khoản demo chưa có enrollment cho khóa học này.',
    },
    progress: progressEmpty,
    lessonProgress: noLessonProgress,
    exerciseStatus: 'NOT_STARTED',
    exerciseCapabilities: { canMarkComplete: false, canViewSolutions: false },
    quizStatus: 'IN_PROGRESS',
    canSubmitQuiz: false,
    note: '',
  },
  active_student: {
    id: 'active_student',
    profile,
    sessions: [session],
    enrollment: activeEnrollment,
    order: paidOrder,
    access: { kind: 'available', label: 'Quyền truy cập đang hoạt động.' },
    progress: progressEmpty,
    lessonProgress: noLessonProgress,
    exerciseStatus: 'IN_PROGRESS',
    exerciseCapabilities: { canMarkComplete: true, canViewSolutions: false },
    quizStatus: 'IN_PROGRESS',
    canSubmitQuiz: true,
    note: 'Guten Tag = Chào buổi sáng / ban ngày.',
  },
  partially_completed_student: {
    id: 'partially_completed_student',
    profile,
    sessions: [session],
    enrollment: activeEnrollment,
    order: paidOrder,
    access: { kind: 'available', label: 'Quyền truy cập đang hoạt động.' },
    progress: progressPartial,
    lessonProgress: partialLessonProgress,
    exerciseStatus: 'COMPLETED',
    exerciseCapabilities: { canMarkComplete: false, canViewSolutions: true },
    quizStatus: 'IN_PROGRESS',
    canSubmitQuiz: true,
    note: 'Ôn lại cách hỏi tên.',
  },
  expired_enrollment: {
    id: 'expired_enrollment',
    profile,
    sessions: [session],
    enrollment: expiredEnrollment,
    access: {
      kind: 'expired-display',
      label: 'Quyền truy cập đã hết hạn',
      expiresAt: expiredEnrollment.expiresAt,
    },
    progress: progressPartial,
    lessonProgress: partialLessonProgress,
    exerciseStatus: 'IN_PROGRESS',
    exerciseCapabilities: { canMarkComplete: false, canViewSolutions: false },
    quizStatus: 'IN_PROGRESS',
    canSubmitQuiz: false,
    note: 'Ghi chú được giữ lại sau khi quyền học kết thúc.',
  },
  payment_pending: {
    id: 'payment_pending',
    profile,
    sessions: [session],
    order: pendingOrder,
    access: {
      kind: 'restricted',
      label: 'Đang chờ thanh toán',
      reason: 'Đơn PENDING chưa cấp quyền học.',
    },
    progress: progressEmpty,
    lessonProgress: noLessonProgress,
    exerciseStatus: 'NOT_STARTED',
    exerciseCapabilities: { canMarkComplete: false, canViewSolutions: false },
    quizStatus: 'IN_PROGRESS',
    canSubmitQuiz: false,
    note: '',
  },
  payment_failed: {
    id: 'payment_failed',
    profile,
    sessions: [session],
    order: failedOrder,
    access: {
      kind: 'restricted',
      label: 'Chưa có quyền truy cập khóa học',
      reason: 'Mock payment chưa được xác nhận thành công.',
    },
    progress: progressEmpty,
    lessonProgress: noLessonProgress,
    exerciseStatus: 'NOT_STARTED',
    exerciseCapabilities: { canMarkComplete: false, canViewSolutions: false },
    quizStatus: 'IN_PROGRESS',
    canSubmitQuiz: false,
    note: '',
  },
  payment_confirmed: {
    id: 'payment_confirmed',
    profile,
    sessions: [session],
    enrollment: activeEnrollment,
    order: paidOrder,
    access: {
      kind: 'available',
      label: 'Mock repository đã trả về quyền truy cập đang hoạt động.',
    },
    progress: progressEmpty,
    lessonProgress: noLessonProgress,
    exerciseStatus: 'IN_PROGRESS',
    exerciseCapabilities: { canMarkComplete: true, canViewSolutions: false },
    quizStatus: 'IN_PROGRESS',
    canSubmitQuiz: true,
    note: '',
  },
  session_revoked: {
    id: 'session_revoked',
    profile,
    sessions: [revokedSession],
    enrollment: revokedEnrollment,
    access: {
      kind: 'error',
      label: 'Phiên đăng nhập không còn hợp lệ',
      message: 'Mock repository trả về trạng thái phiên REVOKED.',
    },
    progress: progressPartial,
    lessonProgress: partialLessonProgress,
    exerciseStatus: 'IN_PROGRESS',
    exerciseCapabilities: { canMarkComplete: false, canViewSolutions: false },
    quizStatus: 'IN_PROGRESS',
    canSubmitQuiz: false,
    note: '',
  },
  invalid_coupon: {
    id: 'invalid_coupon',
    profile,
    sessions: [session],
    access: {
      kind: 'restricted',
      label: 'Chưa có quyền truy cập khóa học',
      reason: 'Mã ưu đãi trong fixture bị từ chối.',
    },
    progress: progressEmpty,
    lessonProgress: noLessonProgress,
    exerciseStatus: 'NOT_STARTED',
    exerciseCapabilities: { canMarkComplete: false, canViewSolutions: false },
    quizStatus: 'IN_PROGRESS',
    canSubmitQuiz: false,
    couponResult: {
      kind: 'invalid',
      code: 'A11-DEMO',
      message: 'Mã ưu đãi không được chấp nhận trong fixture.',
      status: 422,
    },
    note: '',
  },
  quiz_in_progress: {
    id: 'quiz_in_progress',
    profile,
    sessions: [session],
    enrollment: activeEnrollment,
    access: { kind: 'available', label: 'Quyền truy cập đang hoạt động.' },
    progress: progressPartial,
    lessonProgress: partialLessonProgress,
    exerciseStatus: 'IN_PROGRESS',
    exerciseCapabilities: { canMarkComplete: true, canViewSolutions: false },
    quizStatus: 'IN_PROGRESS',
    canSubmitQuiz: true,
    note: '',
  },
  quiz_submitted: {
    id: 'quiz_submitted',
    profile,
    sessions: [session],
    enrollment: activeEnrollment,
    access: { kind: 'available', label: 'Quyền truy cập đang hoạt động.' },
    progress: progressPartial,
    lessonProgress: partialLessonProgress,
    exerciseStatus: 'COMPLETED',
    exerciseCapabilities: { canMarkComplete: false, canViewSolutions: true },
    quizStatus: 'SUBMITTED',
    canSubmitQuiz: false,
    quizResult: MOCK_QUIZ_RESULT,
    note: '',
  },
}
