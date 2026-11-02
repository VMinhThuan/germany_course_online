import type { EnrollmentSummaryViewModel } from '@/domains/enrollment/models'
import type { CourseProgressViewModel } from '@/domains/progress/models'
import type { DemoAccountOption, DemoPersona, StudentCourseRecord } from './types'

/** Fictional .test identities only. These are UI fixtures, not V3 user records. */
export const DEMO_ACCOUNTS: readonly DemoAccountOption[] = [
  {
    persona: 'registered-without-enrollment',
    email: 'linh.demo@learn.test',
    displayName: 'Linh Nguyễn',
    description: 'Tài khoản mới, chưa có khóa học được kích hoạt.',
  },
  {
    persona: 'active-student',
    email: 'an.demo@learn.test',
    displayName: 'An Trần',
    description: 'Có quyền truy cập khóa A1.1 còn hạn.',
  },
  {
    persona: 'partially-completed-student',
    email: 'minh.demo@learn.test',
    displayName: 'Minh Phạm',
    description: 'Có tiến độ mẫu do repository cung cấp.',
  },
  {
    persona: 'expired-entitlement',
    email: 'mai.demo@learn.test',
    displayName: 'Mai Lê',
    description: 'Quyền truy cập đã hết hạn theo ngày mẫu.',
  },
  {
    persona: 'revoked-enrollment',
    email: 'binh.demo@learn.test',
    displayName: 'Bình Võ',
    description: 'Enrollment mẫu đã bị thu hồi.',
  },
]

export const DEMO_NOW = '2026-11-02T08:00:00.000Z'
export const DEMO_COURSE_ID = 'public-demo-a11'
export const DEMO_COURSE_SLUG = 'tieng-duc-a1-1'

const enrollment = (
  id: string,
  status: EnrollmentSummaryViewModel['status'],
  expiresAt: string,
  accessState: EnrollmentSummaryViewModel['accessState'],
): EnrollmentSummaryViewModel => ({
  id,
  courseId: DEMO_COURSE_ID,
  courseTitle: 'Tiếng Đức A1.1 · Bắt đầu giao tiếp',
  status,
  expiresAt,
  accessState,
})

const progress = (percent: number, completedLessons: number): CourseProgressViewModel => ({
  courseId: DEMO_COURSE_ID,
  percent,
  completedLessons,
  totalLessons: 7,
})

const courseRecord = (
  id: string,
  status: EnrollmentSummaryViewModel['status'],
  expiresAt: string,
  accessState: EnrollmentSummaryViewModel['accessState'],
  progressValue?: CourseProgressViewModel,
): StudentCourseRecord => ({
  courseId: DEMO_COURSE_ID,
  courseSlug: DEMO_COURSE_SLUG,
  enrollment: enrollment(id, status, expiresAt, accessState),
  ...(progressValue ? { progress: progressValue } : {}),
})

export const DEMO_COURSE_BY_PERSONA: Record<DemoPersona, readonly StudentCourseRecord[]> = {
  'registered-without-enrollment': [],
  'active-student': [
    courseRecord(
      'demo-enrollment-active',
      'ACTIVE',
      '2027-11-02T08:00:00.000Z',
      'available',
      progress(0, 0),
    ),
  ],
  'partially-completed-student': [
    courseRecord(
      'demo-enrollment-partial',
      'ACTIVE',
      '2027-11-02T08:00:00.000Z',
      'available',
      progress(29, 2),
    ),
  ],
  'expired-entitlement': [
    courseRecord(
      'demo-enrollment-expired',
      'ACTIVE',
      '2026-10-01T08:00:00.000Z',
      'expired-display',
      progress(29, 2),
    ),
  ],
  'revoked-enrollment': [
    courseRecord(
      'demo-enrollment-revoked',
      'REVOKED',
      '2027-11-02T08:00:00.000Z',
      'revoked',
      progress(0, 0),
    ),
  ],
}
