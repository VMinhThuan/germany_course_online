import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react'
import { ArrowLeft, ArrowRight, MailCheck, ShieldCheck } from 'lucide-react'
import { Navigate, useNavigate, useSearchParams } from 'react-router'
import { ApiError } from '@/lib/api/client'
import { apiAuth } from '@/lib/auth/api-auth'
import { useAuthSession } from '@/app/auth/auth-session'
import { DecorativeHeading } from '@/domains/shared/decorative-heading'
import { setBrandPageTitle } from '@/config/brand'
import { BrandLogo } from '@/shared/brand/BrandLogo'
import { AuthShell } from '@/shared/layouts/shells'
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  EmailInput,
  FormField,
  InlineAlert,
  LinkButton,
  PasswordInput,
  TextInput,
} from '@/shared/ui'
import { AuthChecking, InlineProductLink } from './shared'
import { getReturnToFromSearch } from './redirects'

type Fields = Record<string, string | undefined>

function usePageTitle(title: string) {
  useEffect(() => setBrandPageTitle(title), [title])
}

function authError(error: unknown) {
  if (error instanceof ApiError) return error.message
  return error instanceof Error ? error.message : 'Yêu cầu chưa hoàn tất. Hãy thử lại.'
}

function AuthPageFrame({ title, children }: { title: string; children: ReactNode }) {
  return (
    <AuthShell showBrand={false} showPreviewNotice={false} showFooter={false}>
      <div role="region" aria-label={title} className="mx-auto grid w-full max-w-3xl gap-4">
        <BrandLogo className="mx-auto" />
        {children}
      </div>
    </AuthShell>
  )
}

function AuthFormCard({
  title,
  description,
  children,
}: {
  title?: string
  description: string
  children: ReactNode
}) {
  return (
    <Card className="border-border-subtle/90 shadow-soft">
      <CardHeader className="space-y-3 pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-2">
            {title && (
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-action-primary">
                {title}
              </p>
            )}
            <DecorativeHeading text={description} level={1} size="sm" />
          </div>
          <span className="grid size-10 shrink-0 place-items-center rounded-2xl bg-surface-lime text-pastel-lime-ink">
            <ShieldCheck aria-hidden="true" className="size-5" />
          </span>
        </div>
      </CardHeader>
      <CardContent className="grid gap-5">{children}</CardContent>
    </Card>
  )
}

function validEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())
}

export function ApiLoginPage() {
  usePageTitle('Đăng nhập')
  const navigate = useNavigate()
  const [search] = useSearchParams()
  const returnTo = useMemo(() => getReturnToFromSearch(search.toString()), [search])
  const { status, session, acceptSession } = useAuthSession()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errors, setErrors] = useState<Fields>({})
  const [requestError, setRequestError] = useState('')
  const [pending, setPending] = useState(false)
  if (status === 'checking') return <AuthChecking />
  if (session) return <Navigate replace to={session.role === 'ADMIN' ? '/admin' : returnTo} />

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const next: Fields = {}
    if (!validEmail(email)) next['email'] = 'Nhập địa chỉ email hợp lệ.'
    if (!password) next['password'] = 'Nhập mật khẩu.'
    setErrors(next)
    setRequestError('')
    if (Object.keys(next).length) return
    setPending(true)
    try {
      const restored = await apiAuth.login(email, password)
      acceptSession(restored)
      navigate(restored.role === 'ADMIN' ? '/admin' : returnTo, { replace: true })
    } catch (error) {
      setRequestError(authError(error))
      if (error instanceof ApiError) setErrors(error.fieldErrors)
    } finally {
      setPending(false)
    }
  }

  return (
    <AuthPageFrame title="Đăng nhập">
      <AuthFormCard description="Đăng nhập">
        {search.get('registered') === '1' && (
          <InlineAlert tone="success" title="Tạo tài khoản thành công">
            Đăng nhập bằng email và mật khẩu vừa đăng ký. Tài khoản chưa được đăng nhập tự động.
          </InlineAlert>
        )}
        {search.get('sessionRevoked') === '1' && (
          <InlineAlert tone="warning" title="Phiên đăng nhập đã bị thay thế hoặc thu hồi">
            Hãy đăng nhập lại để tiếp tục.
          </InlineAlert>
        )}
        {search.get('sessionInvalid') === '1' && (
          <InlineAlert tone="warning" title="Phiên đăng nhập không còn hợp lệ">
            Hãy đăng nhập lại để tiếp tục.
          </InlineAlert>
        )}
        {status === 'error' && (
          <InlineAlert tone="warning" title="Không khôi phục được phiên trước đó">
            Bạn vẫn có thể thử đăng nhập lại. Nếu API chưa sẵn sàng, hãy thử sau.
          </InlineAlert>
        )}
        {requestError && (
          <InlineAlert tone="danger" title="Chưa đăng nhập được">
            {requestError}
          </InlineAlert>
        )}
        <form className="grid gap-4" noValidate onSubmit={(event) => void submit(event)}>
          <FormField id="login-email" label="Email" required error={errors['email']}>
            {(describedBy, invalid) => (
              <EmailInput
                id="login-email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                autoComplete="email"
                placeholder="ban@example.com"
                aria-invalid={invalid || undefined}
                aria-describedby={describedBy}
              />
            )}
          </FormField>
          <FormField id="login-password" label="Mật khẩu" required error={errors['password']}>
            {(describedBy, invalid) => (
              <PasswordInput
                id="login-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="current-password"
                aria-invalid={invalid || undefined}
                aria-describedby={describedBy}
              />
            )}
          </FormField>
          <div className="flex justify-end">
            <InlineProductLink to="/forgot-password">Quên mật khẩu?</InlineProductLink>
          </div>
          <Button type="submit" loading={pending} className="w-full">
            Đăng nhập <ArrowRight aria-hidden="true" />
          </Button>
        </form>
        <p className="text-center text-sm text-ink-secondary">
          Chưa có tài khoản? <InlineProductLink to="/register">Tạo tài khoản</InlineProductLink>
        </p>
      </AuthFormCard>
    </AuthPageFrame>
  )
}

export function ApiRegisterPage() {
  usePageTitle('Tạo tài khoản')
  const navigate = useNavigate()
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [fields, setFields] = useState<Fields>({})
  const [requestError, setRequestError] = useState('')
  const [pending, setPending] = useState(false)
  const [complete, setComplete] = useState(false)
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const next: Fields = {}
    if (!fullName.trim()) next['fullName'] = 'Nhập họ và tên.'
    if (!validEmail(email)) next['email'] = 'Nhập địa chỉ email hợp lệ.'
    if (password.length < 12) next['password'] = 'Mật khẩu cần ít nhất 12 ký tự.'
    if (confirmation !== password) next['confirmation'] = 'Hai mật khẩu chưa khớp.'
    setFields(next)
    setRequestError('')
    if (Object.keys(next).length) return
    setPending(true)
    try {
      await apiAuth.register({ fullName, email, password })
      setComplete(true)
    } catch (error) {
      setRequestError(authError(error))
      if (error instanceof ApiError) setFields(error.fieldErrors)
    } finally {
      setPending(false)
    }
  }
  return (
    <AuthPageFrame title="Tạo tài khoản">
      <AuthFormCard title="Bắt đầu học" description="Tạo tài khoản học viên">
        {complete ? (
          <div className="grid gap-4">
            <InlineAlert tone="success" title="Tài khoản đã được tạo">
              Tài khoản Student đã được lưu. Đăng nhập để bắt đầu; đăng ký không tự tạo phiên.
            </InlineAlert>
            <Button
              className="w-full"
              onClick={() => navigate('/login?registered=1', { replace: true })}
            >
              Đến đăng nhập
            </Button>
          </div>
        ) : (
          <>
            {requestError && (
              <InlineAlert tone="danger" title="Chưa tạo được tài khoản">
                {requestError}
              </InlineAlert>
            )}
            <form className="grid gap-4" noValidate onSubmit={(event) => void submit(event)}>
              <FormField id="register-name" label="Họ và tên" required error={fields['fullName']}>
                {(describedBy, invalid) => (
                  <TextInput
                    id="register-name"
                    value={fullName}
                    onChange={(event) => setFullName(event.target.value)}
                    autoComplete="name"
                    aria-invalid={invalid || undefined}
                    aria-describedby={describedBy}
                  />
                )}
              </FormField>
              <FormField id="register-email" label="Email" required error={fields['email']}>
                {(describedBy, invalid) => (
                  <EmailInput
                    id="register-email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    autoComplete="email"
                    placeholder="ban@example.com"
                    aria-invalid={invalid || undefined}
                    aria-describedby={describedBy}
                  />
                )}
              </FormField>
              <FormField
                id="register-password"
                label="Mật khẩu"
                required
                description="Ít nhất 12 ký tự."
                error={fields['password']}
              >
                {(describedBy, invalid) => (
                  <PasswordInput
                    id="register-password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    autoComplete="new-password"
                    aria-invalid={invalid || undefined}
                    aria-describedby={describedBy}
                  />
                )}
              </FormField>
              <FormField
                id="register-confirm"
                label="Nhập lại mật khẩu"
                required
                error={fields['confirmation']}
              >
                {(describedBy, invalid) => (
                  <PasswordInput
                    id="register-confirm"
                    value={confirmation}
                    onChange={(event) => setConfirmation(event.target.value)}
                    autoComplete="new-password"
                    aria-invalid={invalid || undefined}
                    aria-describedby={describedBy}
                  />
                )}
              </FormField>
              <Button type="submit" loading={pending} className="w-full">
                Tạo tài khoản
              </Button>
            </form>
          </>
        )}
        <p className="text-center text-sm text-ink-secondary">
          Đã có tài khoản? <InlineProductLink to="/login">Đăng nhập</InlineProductLink>
        </p>
      </AuthFormCard>
    </AuthPageFrame>
  )
}

export function ApiForgotPasswordPage() {
  usePageTitle('Quên mật khẩu')
  const [email, setEmail] = useState('')
  const [fieldError, setFieldError] = useState('')
  const [requestError, setRequestError] = useState('')
  const [accepted, setAccepted] = useState(false)
  const [pending, setPending] = useState(false)
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!validEmail(email)) {
      setFieldError('Nhập địa chỉ email hợp lệ.')
      return
    }
    setFieldError('')
    setRequestError('')
    setPending(true)
    try {
      await apiAuth.requestPasswordReset(email)
      setAccepted(true)
    } catch (error) {
      setRequestError(authError(error))
    } finally {
      setPending(false)
    }
  }
  return (
    <AuthPageFrame title="Quên mật khẩu">
      <AuthFormCard title="Khôi phục truy cập" description="Đặt lại mật khẩu">
        <p className="text-sm leading-6 text-ink-secondary">
          Nếu email khớp với tài khoản, hệ thống sẽ gửi hướng dẫn khi dịch vụ email được cấu hình.
          Phản hồi không tiết lộ tài khoản có tồn tại hay không.
        </p>
        {accepted && (
          <InlineAlert tone="success" title="Đã tiếp nhận yêu cầu">
            Kiểm tra email nếu dịch vụ gửi thư đã được cấu hình. Liên kết đặt lại sẽ chứa mã dùng
            một lần.
          </InlineAlert>
        )}
        {requestError && (
          <InlineAlert tone="danger" title="Chưa gửi được yêu cầu">
            {requestError}
          </InlineAlert>
        )}
        {!accepted && (
          <form className="grid gap-4" noValidate onSubmit={(event) => void submit(event)}>
            <FormField id="forgot-email" label="Email" required error={fieldError}>
              {(describedBy, invalid) => (
                <EmailInput
                  id="forgot-email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  autoComplete="email"
                  aria-invalid={invalid || undefined}
                  aria-describedby={describedBy}
                />
              )}
            </FormField>
            <Button type="submit" loading={pending} className="w-full">
              Gửi hướng dẫn
            </Button>
          </form>
        )}
        <InlineProductLink to="/login">Quay lại đăng nhập</InlineProductLink>
      </AuthFormCard>
    </AuthPageFrame>
  )
}

export function ApiResetPasswordPage() {
  usePageTitle('Đặt lại mật khẩu')
  const [search] = useSearchParams()
  const token = search.get('token') ?? ''
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [error, setError] = useState('')
  const [requestError, setRequestError] = useState('')
  const [complete, setComplete] = useState(false)
  const [pending, setPending] = useState(false)
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!token) {
      setError('Liên kết không có mã đặt lại. Hãy yêu cầu email mới.')
      return
    }
    if (password.length < 12) {
      setError('Mật khẩu cần ít nhất 12 ký tự.')
      return
    }
    if (password !== confirmation) {
      setError('Hai mật khẩu chưa khớp.')
      return
    }
    setError('')
    setRequestError('')
    setPending(true)
    try {
      await apiAuth.resetPassword(token, password)
      setComplete(true)
    } catch (cause) {
      setRequestError(authError(cause))
    } finally {
      setPending(false)
    }
  }
  return (
    <AuthPageFrame title="Đặt lại mật khẩu">
      <AuthFormCard title="Liên kết bảo mật" description="Tạo mật khẩu mới">
        {complete ? (
          <div className="grid gap-4">
            <InlineAlert tone="success" title="Mật khẩu đã được cập nhật">
              Tất cả phiên hiện tại đã bị thu hồi. Đăng nhập lại bằng mật khẩu mới.
            </InlineAlert>
            <LinkButton to="/login" className="w-full justify-center">
              Quay lại đăng nhập
            </LinkButton>
          </div>
        ) : (
          <>
            {!token && (
              <InlineAlert tone="warning" title="Thiếu mã đặt lại">
                Mở liên kết trong email hoặc yêu cầu hướng dẫn mới.
              </InlineAlert>
            )}
            {requestError && (
              <InlineAlert tone="danger" title="Không thể đặt lại mật khẩu">
                {requestError}
              </InlineAlert>
            )}
            {error && (
              <p role="alert" className="text-sm text-danger-foreground">
                {error}
              </p>
            )}
            <form className="grid gap-4" noValidate onSubmit={(event) => void submit(event)}>
              <FormField id="reset-password" label="Mật khẩu mới" required>
                {(describedBy, invalid) => (
                  <PasswordInput
                    id="reset-password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    autoComplete="new-password"
                    aria-invalid={invalid || undefined}
                    aria-describedby={describedBy}
                  />
                )}
              </FormField>
              <FormField id="reset-confirm" label="Nhập lại mật khẩu" required>
                {(describedBy, invalid) => (
                  <PasswordInput
                    id="reset-confirm"
                    value={confirmation}
                    onChange={(event) => setConfirmation(event.target.value)}
                    autoComplete="new-password"
                    aria-invalid={invalid || undefined}
                    aria-describedby={describedBy}
                  />
                )}
              </FormField>
              <Button type="submit" disabled={!token} loading={pending} className="w-full">
                Cập nhật mật khẩu
              </Button>
            </form>
          </>
        )}
        <p className="inline-flex items-center gap-2 text-xs leading-5 text-ink-muted">
          <MailCheck aria-hidden="true" className="size-4 shrink-0" />
          Mã đặt lại được xác minh phía máy chủ và chỉ dùng một lần.
        </p>
        <InlineProductLink to="/forgot-password">
          <span className="inline-flex items-center gap-1">
            <ArrowLeft aria-hidden="true" className="size-4" />
            Yêu cầu liên kết mới
          </span>
        </InlineProductLink>
      </AuthFormCard>
    </AuthPageFrame>
  )
}
