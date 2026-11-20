import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router'
import { useAuthSession } from '@/app/auth/auth-session'
import { adminRepository } from '@/data/api/admin-repository'
import { Button, Card, FormField, PasswordInput } from '@/shared/ui'
import { useNotifications } from '@/shared/ui/notifications'
import { AdminFeedback, useAdminMutation } from './shared'

export function AdminPasswordPage() {
  const { logout } = useAuthSession()
  const navigate = useNavigate()
  const notifications = useNotifications()
  const changePassword = useAdminMutation(
    (input: { currentPassword: string; newPassword: string }) =>
      adminRepository.changePassword(input.currentPassword, input.newPassword),
  )
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [validation, setValidation] = useState('')

  async function submit(event: FormEvent) {
    event.preventDefault()
    setValidation('')
    if (newPassword.length < 12) {
      setValidation('Mật khẩu mới cần ít nhất 12 ký tự.')
      return
    }
    if (newPassword !== confirmPassword) {
      setValidation('Hai mật khẩu mới chưa khớp.')
      return
    }
    try {
      await changePassword.mutateAsync({ currentPassword, newPassword })
      notifications.success('Đã đổi mật khẩu. Vui lòng đăng nhập lại.')
      await logout('revoked')
      navigate('/login?sessionRevoked=1', { replace: true })
    } catch {
      setValidation('Không đổi được mật khẩu. Kiểm tra mật khẩu hiện tại rồi thử lại.')
    }
  }

  return (
    <div className="grid max-w-4xl gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(17rem,0.72fr)]">
      <Card className="p-5 sm:p-6">
        <form className="grid gap-4" onSubmit={(event) => void submit(event)}>
          <div>
            <h2 className="font-display text-xl font-bold">Mật khẩu đăng nhập</h2>
            <p className="mt-1 text-sm leading-6 text-ink-secondary">
              Dùng mật khẩu mới dài ít nhất 12 ký tự để bảo vệ tài khoản quản trị.
            </p>
          </div>
          <FormField id="admin-current-password" label="Mật khẩu hiện tại">
            {(describedBy, invalid) => (
              <PasswordInput
                id="admin-current-password"
                required
                value={currentPassword}
                onChange={(event) => setCurrentPassword(event.target.value)}
                aria-describedby={describedBy}
                aria-invalid={invalid || undefined}
                autoComplete="current-password"
              />
            )}
          </FormField>
          <FormField id="admin-new-password" label="Mật khẩu mới">
            {(describedBy, invalid) => (
              <PasswordInput
                id="admin-new-password"
                required
                minLength={12}
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                aria-describedby={describedBy}
                aria-invalid={invalid || undefined}
                autoComplete="new-password"
              />
            )}
          </FormField>
          <FormField id="admin-confirm-password" label="Xác nhận mật khẩu mới">
            {(describedBy, invalid) => (
              <PasswordInput
                id="admin-confirm-password"
                required
                minLength={12}
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                aria-describedby={describedBy}
                aria-invalid={invalid || undefined}
                autoComplete="new-password"
              />
            )}
          </FormField>
          {validation && (
            <p
              role="alert"
              className="rounded-xl border border-danger-foreground/20 bg-danger-surface p-3 text-sm leading-6 text-danger-foreground"
            >
              {validation}
            </p>
          )}
          <AdminFeedback error={changePassword.error} />
          <Button type="submit" loading={changePassword.isPending}>
            Đổi mật khẩu
          </Button>
        </form>
      </Card>
      <Card className="h-fit bg-surface-blue/50 p-5 text-sm leading-6 text-ink-secondary">
        Sau khi đổi mật khẩu, tất cả phiên đăng nhập hiện tại sẽ kết thúc. Bạn sẽ được đưa về trang
        đăng nhập để xác thực lại.
      </Card>
    </div>
  )
}
