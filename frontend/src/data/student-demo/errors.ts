import { DemoRepositoryError } from './types'

export interface DemoErrorPresentation {
  title: string
  message: string
}

/** Presentation mapping only; endpoint-specific V3 error codes are not available. */
export function getDemoErrorPresentation(error: unknown): DemoErrorPresentation {
  if (error instanceof DemoRepositoryError) {
    if (error.code === 'SESSION_REVOKED') {
      return {
        title: 'Phiên demo đã kết thúc',
        message: 'Phiên này đã bị thu hồi trong mô phỏng. Hãy đăng nhập lại để tiếp tục.',
      }
    }
    if (error.kind === 'network') {
      return {
        title: 'Không kết nối được dịch vụ demo',
        message: 'Kiểm tra kết nối rồi thử lại. Dữ liệu demo vẫn được giữ nguyên.',
      }
    }
    if (error.status === 401) {
      return { title: 'Không đăng nhập được', message: 'Email hoặc mật khẩu demo chưa khớp.' }
    }
    if (error.status === 403) {
      return {
        title: 'Tài khoản demo chưa thể truy cập',
        message: 'Hãy chọn một tài khoản demo khác.',
      }
    }
    if (error.status === 409) {
      return {
        title: 'Email demo đã được sử dụng',
        message: 'Hãy dùng email .test khác hoặc đăng nhập.',
      }
    }
    if (error.status === 429) {
      return {
        title: 'Bạn đã thử quá nhiều lần',
        message: 'Đây là trạng thái giới hạn mẫu. Hãy chờ một lúc rồi thử lại.',
      }
    }
    if (error.status === 422) {
      return { title: 'Thông tin chưa hợp lệ', message: error.message }
    }
    if (error.status === 500) {
      return {
        title: 'Dịch vụ demo đang gặp sự cố',
        message: 'Thử lại sau. Đây là lỗi mô phỏng, không phải phản hồi từ backend.',
      }
    }
  }

  return {
    title: 'Không thể hoàn tất yêu cầu',
    message: 'Dịch vụ demo chưa phản hồi như mong đợi. Bạn có thể thử lại.',
  }
}

export function isSessionRevokedError(error: unknown): error is DemoRepositoryError {
  return error instanceof DemoRepositoryError && error.code === 'SESSION_REVOKED'
}

export function isAuthenticatedSessionError(error: unknown): error is DemoRepositoryError {
  return (
    error instanceof DemoRepositoryError &&
    (error.code === 'SESSION_REVOKED' || error.code === 'DEMO_SESSION_INVALID')
  )
}
