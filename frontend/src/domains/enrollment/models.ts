import type { EnrollmentStatus } from '@/domains/contracts/backend-enums'

/** Expiry display is derived by the mock repository and is not a backend enum. */
export interface EnrollmentSummaryViewModel {
  id: string
  courseId: string
  courseTitle: string
  status: EnrollmentStatus
  expiresAt: string
  accessState: 'available' | 'expired-display' | 'revoked'
}
