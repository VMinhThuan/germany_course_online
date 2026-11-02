import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { beforeEach, describe, expect, it } from 'vitest'
import { AuthSessionProvider } from './auth-session'
import { ForgotPasswordPage, LoginPage, RegisterPage, ResetPasswordPage } from './pages'
import { studentDemoRepositories } from '@/data/student-demo/repository'
import { NotificationProvider } from '@/shared/ui/notifications'
import { DialogProvider } from '@/shared/ui/dialogs'

function renderAuthPage(element: React.ReactNode, path: string) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <NotificationProvider>
        <DialogProvider>
          <AuthSessionProvider>
            <MemoryRouter initialEntries={[path]}>{element}</MemoryRouter>
          </AuthSessionProvider>
        </DialogProvider>
      </NotificationProvider>
    </QueryClientProvider>,
  )
}

describe('authentication screens', () => {
  beforeEach(() => {
    window.sessionStorage.clear()
    studentDemoRepositories.auth.clearSession()
  })

  it('shows login required-field validation beside its fields', async () => {
    renderAuthPage(<LoginPage />, '/login')
    const submit = await screen.findByRole('button', { name: /đăng nhập bằng thông tin demo/i })
    fireEvent.click(submit)
    expect(await screen.findByText('Nhập email của bạn.')).toBeInTheDocument()
    expect(screen.getByText('Nhập mật khẩu demo.')).toBeInTheDocument()
  })

  it('validates registration and does not create an account on empty submit', async () => {
    renderAuthPage(<RegisterPage />, '/register')
    fireEvent.click(await screen.findByRole('button', { name: 'Tạo tài khoản demo' }))
    expect(await screen.findByText('Nhập tên hiển thị.')).toBeInTheDocument()
    expect(screen.getByText('Nhập email demo.')).toBeInTheDocument()
  })

  it('describes the forgot-password response as simulated and provides a controlled reset path', async () => {
    renderAuthPage(<ForgotPasswordPage />, '/forgot-password')
    fireEvent.change(await screen.findByLabelText(/Email demo/), {
      target: { value: 'linh.demo@learn.test' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Tạo yêu cầu mô phỏng' }))
    expect(await screen.findByText(/Không có email thực tế được gửi/i)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Tiếp tục đến trang đặt lại demo' })).toHaveAttribute(
      'href',
      '/reset-password?token=demo-reset-token-v1',
    )
  })

  it('renders the no-token reset state without revealing a working reset form', async () => {
    renderAuthPage(<ResetPasswordPage />, '/reset-password')
    await waitFor(() =>
      expect(screen.getByText(/Liên kết demo chưa có mã đặt lại/)).toBeInTheDocument(),
    )
    expect(screen.queryByRole('button', { name: 'Đặt lại mật khẩu demo' })).not.toBeInTheDocument()
  })
})
