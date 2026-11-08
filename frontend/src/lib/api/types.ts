export interface ApiPage<T> {
  items: T[]
  page: number
  pageSize: number
  total: number
  hasMore: boolean
}

export interface ApiUserProfile {
  id: string
  fullName: string
  email: string
  phone: string | null
  avatarUrl: string | null
  role: 'STUDENT' | 'ADMIN'
  status: 'ACTIVE' | 'BLOCKED'
}

export interface ApiAuthResult {
  accessToken: string
  expiresIn: number
  user: ApiUserProfile
}

export interface ApiPublicMedia {
  id: string
  title?: string
  mediaType: 'IMAGE' | 'VIDEO' | 'AUDIO' | 'PDF'
  mimeType: string
  url?: string
}

export interface ApiCourseSummary {
  id: string
  code: string
  slug: string
  title: string
  level: string
  shortDescription: string
  thumbnailUrl: string | null
  price: string
  accessDurationMonths: number
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED'
  chapterCount: number
  lessonCount: number
}

export interface ApiPublicLesson {
  id: string
  title: string
  description?: string
  lessonType: 'LECTURE' | 'PRACTICE'
  estimatedMinutes: number | null
  sortOrder: number
}

export interface ApiPublicSection {
  id: string
  title: string
  description?: string
  sortOrder: number
  lessonCount: number
  lessons: ApiPublicLesson[]
}

export interface ApiCourseDetail {
  id: string
  code: string
  slug: string
  title: string
  level: string
  price: string
  accessDurationMonths: number
  description: string
  objectives: string[]
  requirements: string[]
  shortDescription: string
  thumbnail?: ApiPublicMedia | null
  banner?: ApiPublicMedia | null
  introMedia?: ApiPublicMedia | null
  sections: ApiPublicSection[]
}

export interface ApiPublicSiteSettings {
  siteName: string
  logoUrl: string | null
  heroTitle: string
  heroDescription: string
  contactEmail: string | null
  contactPhone: string | null
  facebookUrl: string | null
  zaloUrl: string | null
  footerDescription: string
  heroMedia: ApiPublicMedia | null
  introVideo: ApiPublicMedia | null
}

export interface ApiEnrollment {
  id: string
  courseId: string
  courseTitle: string
  status: 'ACTIVE' | 'REVOKED' | 'EXPIRED'
  activatedAt: string | null
  expiresAt: string
  progressPercent: number
}

export interface ApiStudentDashboard {
  profile: ApiUserProfile
  courses: ApiEnrollment[]
}

export interface ApiCourseProgress {
  courseId: string
  percent: number
  completedLessons: number
  totalLessons: number
}

export interface ApiLessonProgress {
  lessonId: string
  status: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED'
  completedAt: string | null
}

export interface ApiStudentCourseLesson {
  id: string
  title: string
  description: string
  lessonType: 'LECTURE' | 'PRACTICE'
  estimatedMinutes: number | null
  countsTowardProgress: boolean
  sortOrder: number
  hasVideo: boolean
  progress: ApiLessonProgress
  exercises: { id: string; title: string; sortOrder: number }[]
}

export interface ApiStudentCourseSection {
  id: string
  title: string
  description: string
  sectionType: 'CHAPTER' | 'EXAM_PREP'
  sortOrder: number
  lessons: ApiStudentCourseLesson[]
}

export interface ApiStudentCourseOverview {
  course: ApiCourseSummary
  sections: ApiStudentCourseSection[]
  access: string
  progress: ApiCourseProgress
}

export interface ApiLearningSection extends Omit<ApiStudentCourseSection, 'lessons'> {
  lessons: ApiStudentCourseLesson[]
}

export interface ApiStudentSection {
  courseId: string
  section: ApiLearningSection
  access: 'ACTIVE'
}

export interface ApiLessonAsset {
  lessonId: string
  assetId: string
  role: 'LECTURE_VIDEO' | 'LECTURE_PDF' | 'ATTACHMENT'
  title: string | null
  mediaType: 'IMAGE' | 'VIDEO' | 'AUDIO' | 'PDF'
  mimeType: string
  fileSize: number
  durationSeconds: number | null
}

export interface ApiExerciseAsset {
  assetId: string
  role: 'QUESTION_PDF' | 'QUESTION_AUDIO' | 'ANSWER_PDF' | 'SOLUTION_VIDEO'
  title: string | null
  mediaType: 'IMAGE' | 'VIDEO' | 'AUDIO' | 'PDF'
  mimeType: string
  fileSize: number
  durationSeconds: number | null
}

export interface ApiExercise {
  id: string
  lessonId: string
  title: string
  description?: string | null
  instructions: string
  exerciseType: 'FILE_BASED' | 'QUIZ'
  completionMode: 'MANUAL' | 'QUIZ_SUBMISSION'
  isRequired: boolean
  sortOrder: number
  assets: ApiExerciseAsset[]
  progress: {
    exerciseId: string
    status: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED'
    completionSource: 'MANUAL' | 'QUIZ' | null
    completedAt: string | null
  } | null
  capabilities: { canMarkComplete: boolean; canViewSolutions: boolean }
}

export interface ApiLessonWorkspace {
  id: string
  courseId: string
  sectionId: string
  title: string
  description: string
  content: unknown
  video: ApiLessonVideo | null
  solutionVideo: ApiLessonVideo | null
  lessonType: 'LECTURE' | 'PRACTICE'
  estimatedMinutes: number | null
  countsTowardProgress: boolean
  assets: ApiLessonAsset[]
  media: ApiLessonAsset[]
  exercises: ApiExercise[]
  canCompleteLesson: boolean
  outstandingRequiredCount: number
}

export interface ApiLessonVideo {
  provider: 'YOUTUBE'
  videoId: string
}

export interface ApiMediaAccess {
  assetId: string
  url: string
  expiresAt: string
  mediaType: string
}

export interface ApiQuizAttempt {
  id: string
  status: 'IN_PROGRESS' | 'SUBMITTED'
  questions: Array<{
    id: string
    prompt: string
    options: Array<{ id: string; label: string }>
  }>
  selectedAnswers: Record<string, string | null>
}

export interface ApiQuizReviewItem {
  questionId: string
  prompt: string
  selectedOptionId: string | null
  selectedOption: string | null
  isCorrect: boolean
  correctOptionId: string | null
  correctOption: string | null
  explanation: string | null
  awardedPoints: string
  points: string
}

export interface ApiQuizResult {
  attemptId: string
  score: string
  maxScore: string
  correctCount: number
  totalQuestions: number
  passed: boolean | null
  review: ApiQuizReviewItem[]
}

export interface ApiLessonNote {
  lessonId: string
  content: string
  updatedAt: string
}

export interface ApiOrderQuote {
  courseId: string
  orderType: 'PURCHASE' | 'RENEWAL'
  renewalPlanId: string | null
  renewalPlanTitle: string | null
  renewalPlanPrice: string | null
  courseTitle: string
  coursePrice: string
  baseAmount: string
  discountAmount: string
  couponDiscountAmount: string
  automaticDiscountAmount: string
  discountSource: 'NONE' | 'COUPON' | 'AUTOMATIC_5_PERCENT'
  couponCode: string | null
  totalAmount: string
  currency: 'VND'
  durationMonths: number
}

export interface ApiPaymentInstructions {
  bankName: string
  accountNumber: string
  accountHolderName: string
  qrUrl: string
  transferInstructions: string
}

export interface ApiOrder {
  id: string
  orderCode: string
  orderType: 'PURCHASE' | 'RENEWAL'
  status: 'PENDING' | 'PAID' | 'FAILED' | 'CANCELLED' | 'EXPIRED'
  courseId: string
  renewalPlanId: string | null
  renewalPlanTitleSnapshot: string | null
  renewalPlanPriceSnapshot: string | null
  courseTitleSnapshot: string
  coursePriceSnapshot: string
  baseAmount: string
  discountAmount: string
  discountSource: 'NONE' | 'COUPON' | 'AUTOMATIC_5_PERCENT'
  totalAmount: string
  couponId: string | null
  durationMonthsSnapshot: number
  paymentSubmittedAt: string | null
  paidAt: string | null
  expiresAt: string | null
  cancelledAt: string | null
  cancellationReason: string | null
  reconciliationOutcome: 'NO_FUNDS_RECEIVED' | 'REFUND_CONFIRMED_EXTERNALLY' | null
  createdAt: string
}

export interface ApiOrderDetail {
  order: ApiOrder
  paymentInstructions: ApiPaymentInstructions | null
  enrollment?: ApiEnrollment | null
}

export interface ApiCouponValidation {
  valid: boolean
  code: string
  discountType: 'PERCENT' | 'FIXED' | null
  potentialDiscountAmount: string
  automaticDiscountAmount: string
  discountSource: 'NONE' | 'COUPON' | 'AUTOMATIC_5_PERCENT'
  discountAmount: string
  totalAmount: string
  currency: 'VND'
  message: string
}

export interface ApiRenewalPlan {
  id: string
  courseId: string
  title: string
  durationMonths: number
  price: string
  status: 'ACTIVE' | 'INACTIVE'
  sortOrder?: number
  createdAt?: string
  updatedAt?: string
}

export interface ApiRenewalPlanList {
  course: { id: string; title: string; enrollmentExpiresAt: string }
  items: Array<Pick<ApiRenewalPlan, 'id' | 'courseId' | 'title' | 'durationMonths' | 'price'>>
}

export interface ApiAdminCourse {
  id: string
  code: string
  slug: string
  title: string
  description: string
  shortDescription: string
  objectives: string[]
  requirements: string[]
  level: string
  thumbnailAssetId: string | null
  bannerAssetId: string | null
  introVideoAssetId: string | null
  price: string
  accessDurationMonths: number
  sortOrder: number
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED'
  createdAt: string
  updatedAt: string
  deletedAt: string | null
}

export interface ApiAdminSection {
  id: string
  courseId: string
  title: string
  description: string | null
  sectionType: 'CHAPTER' | 'EXAM_PREP'
  sortOrder: number
  status: 'DRAFT' | 'PUBLISHED' | 'HIDDEN'
  createdAt: string
  updatedAt: string
  deletedAt: string | null
}

export interface ApiAdminLesson {
  id: string
  sectionId: string
  title: string
  description: string | null
  content: { version: number; paragraphs: string[] } | null
  video: ApiLessonVideo | null
  solutionVideo: ApiLessonVideo | null
  lessonType: 'LECTURE' | 'PRACTICE'
  estimatedMinutes: number | null
  countsTowardProgress: boolean
  sortOrder: number
  status: 'DRAFT' | 'PUBLISHED' | 'HIDDEN'
  createdAt: string
  updatedAt: string
  deletedAt: string | null
}

export interface ApiAdminExercise {
  id: string
  lessonId: string
  title: string
  description: string | null
  instructions: string
  exerciseType: 'FILE_BASED' | 'QUIZ'
  completionMode: 'MANUAL' | 'QUIZ_SUBMISSION'
  isRequired: boolean
  sortOrder: number
  status: 'DRAFT' | 'PUBLISHED' | 'HIDDEN'
  createdAt: string
  updatedAt: string
  deletedAt: string | null
}

export interface ApiAdminQuiz {
  exerciseId: string
  title: string
  description: string | null
  passScorePercent: number | null
  showCorrectAnswers: boolean
  questions: Array<{
    id: string
    questionText: string
    questionType: 'SINGLE_CHOICE'
    explanation: string | null
    points: string
    sortOrder: number
    options: Array<{ id: string; optionText: string; isCorrect: boolean; sortOrder: number }>
  }>
}

export interface ApiAdminStudent {
  id: string
  fullName: string
  email: string
  phone: string | null
  avatarAssetId: string | null
  role: 'STUDENT'
  status: 'ACTIVE' | 'BLOCKED'
  emailVerifiedAt: string | null
  createdAt: string
  updatedAt: string
}

export interface ApiAdminStudentDetail {
  user: ApiAdminStudent
  enrollments: Array<{
    id: string
    courseId: string
    courseTitle: string
    status: 'ACTIVE' | 'REVOKED' | 'EXPIRED'
    activatedAt: string | null
    expiresAt: string
    sourceOrderId: string | null
  }>
  orders: Array<{
    id: string
    orderCode: string
    orderType: 'PURCHASE' | 'RENEWAL'
    status: 'PENDING' | 'PAID' | 'FAILED' | 'CANCELLED' | 'EXPIRED'
    courseId: string
    courseTitle: string
    totalAmount: string
    durationMonths: number
    paymentSubmittedAt: string | null
    paidAt: string | null
    createdAt: string
  }>
}

export interface ApiAdminEnrollment {
  id: string
  student: { id: string; fullName: string; email: string; status: string } | null
  course: { id: string; code: string; slug: string; title: string } | null
  status: 'ACTIVE' | 'REVOKED' | 'EXPIRED'
  activatedAt: string | null
  expiresAt: string
  sourceOrder: {
    id: string
    orderCode: string
    status: string
    totalAmount: string
    createdAt: string
  } | null
  createdAt: string | null
}

export interface ApiAdminEnrollmentDetail {
  enrollment: ApiAdminEnrollment
  adjustments: Array<{
    id: string
    adjustmentType: 'GRANT' | 'RENEW' | 'REVOKE' | 'RESTORE'
    previousExpiresAt: string | null
    newExpiresAt: string | null
    durationMonths: number | null
    orderId: string | null
    performedById: string | null
    reason: string | null
    createdAt: string | null
  }>
}

export interface ApiAdminOrderSummary {
  order: ApiOrder & {
    reviewedById?: string | null
    reviewedAt?: string | null
    reviewNote?: string | null
  }
  student: { id: string; fullName: string; email: string } | null
  course: { id: string; code: string | null; title: string; status: string; deleted: boolean }
  existingEnrollment: {
    id: string
    status: 'ACTIVE' | 'REVOKED'
    activatedAt: string | null
    expiresAt: string | null
  } | null
}

export interface ApiAdminOrderDetail extends ApiAdminOrderSummary {
  couponReservation?: {
    code: string | null
    status: 'RESERVED' | 'REDEEMED' | 'RELEASED'
    discountAmount: string
    reservedAt: string | null
    redeemedAt: string | null
    releasedAt: string | null
  } | null
}

export interface ApiAdminCoupon {
  id: string
  code: string
  discountType: 'PERCENT' | 'FIXED'
  discountValue: string
  maxDiscount: string | null
  usageLimit: number | null
  reservedCount: number
  redemptionCount: number
  startsAt: string | null
  expiresAt: string | null
  status: 'ACTIVE' | 'INACTIVE'
  createdAt: string
  updatedAt: string
  outstandingReservations?: Array<{
    orderId: string
    orderCode: string
    orderType: 'PURCHASE' | 'RENEWAL'
    status: 'PENDING'
    courseTitle: string
    totalAmount: string
    createdAt: string
    paymentSubmittedAt: string | null
  }>
}

export interface ApiBankTransferSettings {
  enabled: boolean
  bankName: string | null
  accountNumber: string | null
  accountHolderName: string | null
  qrUrl: string | null
  transferInstructions: string | null
}

export interface ApiAdminSiteSettings {
  siteName: string
  logoAssetId: string | null
  heroTitle: string
  heroDescription: string
  heroAssetId: string | null
  contactEmail: string | null
  contactPhone: string | null
  facebookUrl: string | null
  zaloUrl: string | null
  footerDescription: string
  payment: ApiBankTransferSettings | null
  updatedAt: string
}

export interface ApiAdminMediaAsset {
  id: string
  originalName: string
  mediaType: 'IMAGE' | 'VIDEO' | 'AUDIO' | 'PDF' | 'FILE'
  mimeType: string
  fileSize: number
  durationSeconds: number | null
  visibility: 'PUBLIC' | 'ENROLLED'
  uploadedById: string | null
  createdAt: string
  provider?: 'S3_COMPATIBLE' | 'CLOUDINARY' | 'UNKNOWN'
  publicId?: string | null
  resourceType?: 'image' | 'video' | 'raw' | null
  deliveryType?: 'upload' | 'private' | 'authenticated' | null
  format?: string | null
  uploadStatus?: 'PENDING' | 'READY' | 'DELETING' | 'DELETED'
  uploadExpiresAt?: string | null
  usageCount?: number
}

export interface ApiAssetAssociation {
  id: string
  lessonId?: string
  exerciseId?: string
  assetId: string
  assetRole: string
  title: string | null
  sortOrder: number
  media: ApiAdminMediaAsset
}

export interface ApiAuditLog {
  id: string
  actorUserId: string | null
  action: string
  entityType: string
  entityId: string
  changedFields: unknown[]
  createdAt: string
}

export interface ApiMediaUploadIntent {
  assetId: string
  provider: 'S3_COMPATIBLE' | 'CLOUDINARY'
  uploadUrl: string
  uploadMethod: 'PUT' | 'POST'
  uploadHeaders: Record<string, string>
  uploadFields: Record<string, string>
  expiresAt: string
}

export interface ApiAdminMediaDetail {
  media: ApiAdminMediaAsset
  references: Array<{
    kind: 'LESSON' | 'EXERCISE' | 'COURSE' | 'USER_PROFILE' | 'SITE_SETTINGS'
    parentId: string
    role: string
    title: string | null
  }>
}

export interface ApiMediaPreviewAccess {
  assetId: string
  url: string
  expiresAt: string
  mediaType: 'IMAGE' | 'VIDEO' | 'AUDIO' | 'PDF' | 'FILE'
  mimeType: string
}

export interface ApiMediaCapabilities {
  activeProvider: 'S3_COMPATIBLE' | 'CLOUDINARY' | null
  supportedMediaTypes: Array<'IMAGE' | 'VIDEO' | 'AUDIO' | 'PDF' | 'FILE'>
  uploadFoldersByMediaType?: Partial<Record<'IMAGE' | 'AUDIO' | 'PDF' | 'FILE', string[]>>
}
