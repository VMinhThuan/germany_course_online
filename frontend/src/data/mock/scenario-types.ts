export const MOCK_SCENARIOS = [
  'anonymous_guest',
  'registered_without_enrollment',
  'active_student',
  'partially_completed_student',
  'expired_enrollment',
  'payment_pending',
  'payment_failed',
  'payment_confirmed',
  'session_revoked',
  'invalid_coupon',
  'quiz_in_progress',
  'quiz_submitted',
] as const

export type MockScenarioId = (typeof MOCK_SCENARIOS)[number]

export const MOCK_SCENARIO_LABELS: Record<MockScenarioId, string> = {
  anonymous_guest: 'Khách chưa đăng nhập',
  registered_without_enrollment: 'Tài khoản chưa ghi danh',
  active_student: 'Học viên đang học',
  partially_completed_student: 'Học viên đã học một phần',
  expired_enrollment: 'Quyền truy cập đã hết hạn',
  payment_pending: 'Đơn đang chờ thanh toán',
  payment_failed: 'Đơn thanh toán thất bại',
  payment_confirmed: 'Đơn đã được xác nhận',
  session_revoked: 'Phiên đăng nhập bị thu hồi',
  invalid_coupon: 'Mã ưu đãi không hợp lệ',
  quiz_in_progress: 'Bài kiểm tra đang làm',
  quiz_submitted: 'Bài kiểm tra đã nộp',
}

export type MockResponseMode = 'success' | 'empty' | 'network-error' | 'api-error'

export type SupportedMockStatus = 401 | 403 | 404 | 409 | 422 | 429 | 500

export interface MockFailureConfig {
  mode: 'network-error' | 'api-error'
  status?: SupportedMockStatus
  /** Pass through a code supplied by the caller; the foundation invents none. */
  code?: string
  message?: string
}
