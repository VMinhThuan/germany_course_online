/** Confirmed V3 enum vocabulary from docs/ui-research/06. */
export const UserRole = ['STUDENT', 'ADMIN'] as const
export type UserRole = (typeof UserRole)[number]
export const UserStatus = ['ACTIVE', 'BLOCKED'] as const
export type UserStatus = (typeof UserStatus)[number]
export const SessionStatus = ['ACTIVE', 'REVOKED', 'EXPIRED'] as const
export type SessionStatus = (typeof SessionStatus)[number]
export const SessionRevokeReason = [
  'NEW_LOGIN',
  'LOGOUT',
  'ADMIN_REVOKE',
  'PASSWORD_CHANGED',
  'ACCOUNT_BLOCKED',
  'REFRESH_REUSE',
] as const
export type SessionRevokeReason = (typeof SessionRevokeReason)[number]
export const CourseStatus = ['DRAFT', 'PUBLISHED', 'ARCHIVED'] as const
export type CourseStatus = (typeof CourseStatus)[number]
export const SectionType = ['CHAPTER', 'EXAM_PREP'] as const
export type SectionType = (typeof SectionType)[number]
export const ContentStatus = ['DRAFT', 'PUBLISHED', 'HIDDEN'] as const
export type ContentStatus = (typeof ContentStatus)[number]
export const LessonType = ['LECTURE', 'PRACTICE'] as const
export type LessonType = (typeof LessonType)[number]
export const ExerciseType = ['FILE_BASED', 'QUIZ'] as const
export type ExerciseType = (typeof ExerciseType)[number]
export const CompletionMode = ['MANUAL', 'QUIZ_SUBMISSION'] as const
export type CompletionMode = (typeof CompletionMode)[number]
export const ProgressStatus = ['NOT_STARTED', 'IN_PROGRESS', 'COMPLETED'] as const
export type ProgressStatus = (typeof ProgressStatus)[number]
export const CompletionSource = ['MANUAL', 'QUIZ'] as const
export type CompletionSource = (typeof CompletionSource)[number]
export const MediaType = ['IMAGE', 'VIDEO', 'AUDIO', 'PDF'] as const
export type MediaType = (typeof MediaType)[number]
export const LessonAssetRole = ['LECTURE_VIDEO', 'LECTURE_PDF', 'ATTACHMENT'] as const
export type LessonAssetRole = (typeof LessonAssetRole)[number]
export const ExerciseAssetRole = [
  'QUESTION_PDF',
  'QUESTION_AUDIO',
  'ANSWER_PDF',
  'SOLUTION_VIDEO',
] as const
export type ExerciseAssetRole = (typeof ExerciseAssetRole)[number]
export const QuestionType = ['SINGLE_CHOICE'] as const
export type QuestionType = (typeof QuestionType)[number]
export const QuizAttemptStatus = ['IN_PROGRESS', 'SUBMITTED'] as const
export type QuizAttemptStatus = (typeof QuizAttemptStatus)[number]
export const OrderType = ['PURCHASE', 'RENEWAL'] as const
export type OrderType = (typeof OrderType)[number]
export const OrderStatus = ['PENDING', 'PAID', 'FAILED', 'CANCELLED', 'EXPIRED'] as const
export type OrderStatus = (typeof OrderStatus)[number]
export const PaymentStatus = ['PENDING', 'SUCCESS', 'FAILED'] as const
export type PaymentStatus = (typeof PaymentStatus)[number]
export const EnrollmentStatus = ['ACTIVE', 'REVOKED'] as const
export type EnrollmentStatus = (typeof EnrollmentStatus)[number]
export const EnrollmentAdjustmentType = ['GRANT', 'RENEW', 'REVOKE', 'RESTORE'] as const
export type EnrollmentAdjustmentType = (typeof EnrollmentAdjustmentType)[number]
export const DiscountType = ['PERCENT', 'FIXED'] as const
export type DiscountType = (typeof DiscountType)[number]
export const CouponStatus = ['ACTIVE', 'INACTIVE'] as const
export type CouponStatus = (typeof CouponStatus)[number]
export const RenewalPlanStatus = ['ACTIVE', 'INACTIVE'] as const
export type RenewalPlanStatus = (typeof RenewalPlanStatus)[number]
export const EmailStatus = ['PENDING', 'PROCESSING', 'SENT', 'FAILED'] as const
export type EmailStatus = (typeof EmailStatus)[number]
export const EmailTemplateType = [
  'PURCHASE',
  'RENEWAL',
  'EXPIRY_REMINDER',
  'RESET_PASSWORD',
] as const
export type EmailTemplateType = (typeof EmailTemplateType)[number]
export const WebhookProcessingStatus = ['RECEIVED', 'PROCESSED', 'FAILED', 'IGNORED'] as const
export type WebhookProcessingStatus = (typeof WebhookProcessingStatus)[number]
