import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router'
import { useAuthSession } from '@/app/auth/auth-session'
import {
  useChangeDemoPassword,
  useProductProfile,
  useProductSessions,
  useRevokeDemoSession,
  useUpdateProfile,
} from '@/data/student-demo/product-queries'
import {
  AccountNavigation,
  ProfileForm,
  SecurityNotice,
  SessionList,
  StudentProfileCard,
} from '@/domains/account'
import { Button, Card, ErrorState, FormField, PasswordInput } from '@/shared/ui'
import { useDialogs } from '@/shared/ui/dialogs'
import { ProductError, ProductLoading, ProductPage } from './shared'

export function StudentProfilePage() {
  const { session, acceptSession } = useAuthSession()
  const profile = useProductProfile(session?.id ?? '')
  const updateProfile = useUpdateProfile(session?.id ?? '')

  return (
    <ProductPage
      title="Tài khoản học viên"
      description="Tên hiển thị và email demo; trạng thái, quyền và vai trò chỉ đọc."
      backTo="/student"
    >
      <AccountNavigation current="profile" />
      {profile.isPending ? (
        <ProductLoading title="Đang tải hồ sơ" />
      ) : profile.isError || !profile.data ? (
        <ProductError onRetry={() => void profile.refetch()} />
      ) : (
        <div className="grid gap-5 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
          <div className="grid content-start gap-4">
            <StudentProfileCard profile={profile.data} />
            <SecurityNotice>
              Hồ sơ chỉ chứa tên hiển thị, email .test và trạng thái tài khoản. Bản demo không có
              mật khẩu hoặc token trong hồ sơ.
            </SecurityNotice>
          </div>
          <div className="grid content-start gap-4">
            <ProfileForm
              key={profile.data.email}
              profile={profile.data}
              onSave={async ({ displayName }) => {
                const updated = await updateProfile.mutateAsync(displayName)
                if (session) acceptSession({ ...session, profile: updated })
              }}
            />
            {updateProfile.isError && (
              <ErrorState
                title="Chưa lưu được hồ sơ"
                description="Bạn vẫn có thể thử lại; trạng thái tài khoản không bị thay đổi."
                onRetry={() => void updateProfile.mutate(profile.data.displayName ?? '')}
              />
            )}
          </div>
        </div>
      )}
    </ProductPage>
  )
}

export function StudentPasswordPage() {
  const { session, logout } = useAuthSession()
  const changePassword = useChangeDemoPassword(session?.id ?? '')
  const navigate = useNavigate()
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [validation, setValidation] = useState<string>()

  async function submit(event: FormEvent) {
    event.preventDefault()
    setValidation(undefined)
    if (newPassword.length < 8) {
      setValidation('Dùng ít nhất 8 ký tự trong kịch bản demo.')
      return
    }
    if (newPassword !== confirmPassword) {
      setValidation('Hai mật khẩu mới chưa khớp.')
      return
    }
    try {
      await changePassword.mutateAsync({ currentPassword, newPassword })
      await logout('revoked')
      navigate('/login?sessionRevoked=1', { replace: true })
    } catch {
      setValidation('Không đổi được mật khẩu demo. Kiểm tra mật khẩu hiện tại rồi thử lại.')
    }
  }

  return (
    <ProductPage title="Đổi mật khẩu demo" backTo="/student/profile">
      <AccountNavigation current="security" />
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(17rem,0.8fr)]">
        <form
          onSubmit={(event) => void submit(event)}
          className="grid gap-4 rounded-2xl border border-border-subtle bg-card-surface p-5 sm:p-6"
        >
          <h2 className="font-display text-xl font-bold">Thay đổi mật khẩu</h2>
          <FormField id="current-password" label="Mật khẩu hiện tại">
            {(describedBy, invalid) => (
              <PasswordInput
                id="current-password"
                required
                value={currentPassword}
                onChange={(event) => setCurrentPassword(event.target.value)}
                aria-describedby={describedBy}
                aria-invalid={invalid || undefined}
                autoComplete="current-password"
              />
            )}
          </FormField>
          <FormField id="new-password" label="Mật khẩu mới">
            {(describedBy, invalid) => (
              <PasswordInput
                id="new-password"
                required
                minLength={8}
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                aria-describedby={describedBy}
                aria-invalid={invalid || undefined}
                autoComplete="new-password"
              />
            )}
          </FormField>
          <FormField id="confirm-password" label="Xác nhận mật khẩu mới">
            {(describedBy, invalid) => (
              <PasswordInput
                id="confirm-password"
                required
                minLength={8}
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
              className="rounded-xl bg-danger-surface p-3 text-sm text-danger-foreground"
            >
              {validation}
            </p>
          )}
          <Button type="submit" loading={changePassword.isPending}>
            Đổi mật khẩu và kết thúc phiên
          </Button>
        </form>
        <div className="grid content-start gap-4">
          <SecurityNotice>
            Quy tắc độ dài tối thiểu 8 ký tự chỉ là xác nhận demo. Không lưu mật khẩu vào browser
            storage.
          </SecurityNotice>
          <Card className="p-4 text-sm leading-6 text-ink-secondary">
            Đổi mật khẩu sẽ kết thúc phiên hiện tại theo mô phỏng. Đăng nhập lại bằng tài khoản demo
            sau khi đổi.
          </Card>
        </div>
      </div>
    </ProductPage>
  )
}

export function StudentSessionsPage() {
  const { session, logout } = useAuthSession()
  const sessions = useProductSessions(session?.id ?? '')
  const revoke = useRevokeDemoSession(session?.id ?? '')
  const dialogs = useDialogs()
  const navigate = useNavigate()

  function endCurrentSession() {
    if (!session) return
    dialogs.confirm({
      title: 'Kết thúc phiên hiện tại?',
      description: 'Thao tác này sẽ đăng xuất tài khoản demo trên trình duyệt này.',
      confirmLabel: 'Kết thúc phiên',
      destructive: true,
      onConfirm: async () => {
        await revoke.mutateAsync(session.id)
        await logout()
        navigate('/login?sessionRevoked=1', { replace: true })
      },
    })
  }

  return (
    <ProductPage title="Phiên đăng nhập" backTo="/student/profile">
      <AccountNavigation current="sessions" />
      {sessions.isPending ? (
        <ProductLoading title="Đang tải phiên đăng nhập" />
      ) : sessions.isError ? (
        <ProductError onRetry={() => void sessions.refetch()} />
      ) : (
        <div className="grid gap-5">
          <SecurityNotice>
            V3 giới hạn một phiên hoạt động trong bản này. Chỉ thông tin an toàn về thiết bị và thời
            gian hoạt động được hiển thị.
          </SecurityNotice>
          <SessionList sessions={sessions.data ?? []} />
          {sessions.data?.some((item) => item.isCurrent && item.status === 'ACTIVE') && (
            <Card className="grid gap-3 p-5">
              <h2 className="font-display text-lg font-bold">Phiên hiện tại</h2>
              <p className="text-sm leading-6 text-ink-secondary">
                Có thể kết thúc phiên này để xóa dữ liệu bảo vệ khỏi trạng thái đăng nhập hiện tại.
              </p>
              <Button variant="outline" onClick={endCurrentSession}>
                Kết thúc phiên hiện tại
              </Button>
              {revoke.isError && (
                <p role="alert" className="text-sm text-danger-foreground">
                  Không kết thúc được phiên demo. Thử lại.
                </p>
              )}
            </Card>
          )}
        </div>
      )}
    </ProductPage>
  )
}
