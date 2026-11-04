import type { StudentProfileViewModel } from '@/domains/account/models'
import type { EnrollmentSummaryViewModel } from '@/domains/enrollment/models'
import type { CourseProgressViewModel } from '@/domains/progress/models'
import type { StudentProductRepositories } from './product-types'

export const demoPersonas = [
  'registered-without-enrollment',
  'active-student',
  'partially-completed-student',
  'expired-entitlement',
  'revoked-enrollment',
] as const

export type DemoPersona = (typeof demoPersonas)[number]

export interface DemoAccountOption {
  persona: DemoPersona
  email: string
  displayName: string
  description: string
}

export interface DemoSession {
  /** A local demo identifier. It is not a JWT, API token, or authorization credential. */
  id: string
  userId: string
  persona: DemoPersona | 'registered-account'
  profile: StudentProfileViewModel
}

export interface StudentCourseRecord {
  courseId: string
  courseSlug?: string
  enrollment: EnrollmentSummaryViewModel
  progress?: CourseProgressViewModel
  continueLessonId?: string
}

export interface StudentDashboardViewModel {
  profile: StudentProfileViewModel
  courses: readonly StudentCourseRecord[]
}

export interface RegisterDemoInput {
  displayName: string
  email: string
  password: string
}

export type DemoResetTokenState = 'invalid' | 'expired' | 'used' | 'valid'

export interface AuthRepository {
  listDemoAccounts(): readonly DemoAccountOption[]
  restoreSession(): Promise<DemoSession | null>
  signInWithDemoAccount(persona: DemoPersona): Promise<DemoSession>
  signInWithCredentials(email: string, password: string): Promise<DemoSession>
  registerDemoAccount(input: RegisterDemoInput): Promise<void>
  requestPasswordReset(email: string): Promise<{ token: string }>
  getResetTokenState(token: string): Promise<DemoResetTokenState>
  resetDemoPassword(token: string, password: string): Promise<void>
  logout(): Promise<void>
  clearSession(): void
}

export interface StudentRepository {
  getDashboard(sessionId: string): Promise<StudentDashboardViewModel>
  listCourses(sessionId: string): Promise<readonly StudentCourseRecord[]>
}

export interface StudentDemoRepositories extends StudentProductRepositories {
  auth: AuthRepository
  student: StudentRepository
}

export type DemoFailureKind = 'network' | 'service'

export class DemoRepositoryError extends Error {
  readonly status: number | undefined
  readonly code: string | undefined
  readonly kind: DemoFailureKind | 'api'

  constructor(input: {
    message: string
    status?: number
    code?: string
    kind?: DemoFailureKind | 'api'
  }) {
    super(input.message)
    this.name = 'DemoRepositoryError'
    this.status = input.status
    this.code = input.code
    this.kind = input.kind ?? 'api'
  }
}
