import type { SessionStatus, UserStatus } from '@/domains/contracts/backend-enums'

/** Safe presentation subset; never includes password/token hashes, IP, or raw user agent. */
export interface StudentProfileViewModel {
  displayName?: string
  email: string
  status: UserStatus
}

export interface SessionSummaryViewModel {
  id: string
  deviceName?: string
  status: SessionStatus
  lastActiveAt: string
  isCurrent: boolean
}
