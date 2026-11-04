import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react'
import { ArrowLeft, ArrowRight, BookOpenText, MailCheck, ShieldCheck } from 'lucide-react'
import { Navigate, useNavigate, useSearchParams } from 'react-router'
import { studentDemoRepositories } from '@/data/student-demo/repository'
import { useAuthSession } from '@/app/auth/auth-session'
import { brandConfig, setBrandPageTitle } from '@/config/brand'
import { getDemoErrorPresentation } from '@/data/student-demo/errors'
import { useQuery } from '@tanstack/react-query'
import { AuthShell } from '@/shared/layouts/shells'
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  EmailInput,
  FormField,
  InlineAlert,
  LinkButton,
  PasswordInput,
  SelectField,
  TextInput,
} from '@/shared/ui'
import { AuthChecking, InlineProductLink } from './shared'
import { getReturnToFromSearch } from './redirects'
import type { DemoPersona, DemoSession } from '@/data/student-demo/types'
import type { AppSession } from '@/lib/auth/api-auth'

type FormErrors = {
  email?: string
  password?: string
  persona?: string
  name?: string
  confirm?: string
}

function toLegacyDemoSession(session: DemoSession): AppSession {
  return {
    id: session.id,
    userId: session.userId,
    role: 'STUDENT',
    profile: {
      id: session.profile.id ?? session.userId,
      displayName: session.profile.displayName ?? '',
      email: session.profile.email,
      status: session.profile.status,
      phone: session.profile.phone ?? null,
      avatarUrl: session.profile.avatarUrl ?? null,
    },
  }
}

function usePageTitle(title: string) {
  useEffect(() => {
    setBrandPageTitle(title)
  }, [title])
}

function AuthPageFrame({
  children,
  title,
  eyebrow = brandConfig.name,
}: {
  children: ReactNode
  title: string
  eyebrow?: string
}) {
  return (
    <AuthShell className="max-w-5xl">
      <div
        role="region"
        aria-label={title}
        className="grid items-stretch gap-4 md:grid-cols-[minmax(0,0.86fr)_minmax(0,1.14fr)] md:gap-6"
      >
        <aside className="relative flex min-h-36 flex-col justify-between overflow-hidden rounded-[1.75rem] bg-brand-blue p-5 sm:p-7 md:min-h-[32rem] md:p-8">
          <div
            aria-hidden="true"
            className="absolute -right-12 -top-12 size-48 rounded-full border-[26px] border-white/40"
          />
          <div className="relative flex items-center gap-2">
            <span className="grid size-10 place-items-center rounded-2xl bg-white/80 text-action-primary">
              <BookOpenText aria-hidden="true" className="size-5" />
            </span>
            <Badge tone="preview">Bản demo tương tác</Badge>
          </div>
          <div className="relative mt-6 space-y-3 md:mt-0">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-action-primary">
              {eyebrow}
            </p>
            <h2 className="max-w-sm font-display text-2xl font-extrabold leading-tight tracking-tight sm:text-3xl">
              Một khởi đầu nhẹ nhàng cho tiếng Đức.
            </h2>
            <p className="max-w-sm leading-6 text-ink-secondary">
              Tài khoản, phiên đăng nhập và tiến độ ở đây chỉ là dữ liệu mô phỏng trong trình duyệt.
            </p>
          </div>
          <p className="relative mt-5 hidden text-sm font-semibold text-pastel-blue-ink md:block">
            "Ein Schritt nach dem anderen." · Từng bước một.
          </p>
        </aside>
        <div className="min-w-0">{children}</div>
      </div>
    </AuthShell>
  )
}

function AuthFormCard({
  title,
  description,
  children,
}: {
  title: string
  description: string
  children: ReactNode
}) {
  return (
    <Card className="h-full border-border-subtle/90 shadow-soft">
      <CardHeader className="space-y-3 pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-2">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-action-primary">
              {title}
            </p>
            <h1 className="font-display text-2xl font-extrabold tracking-tight sm:text-3xl">
              {description}
            </h1>
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

function useSafeLoginRedirect() {
  const [search] = useSearchParams()
  return useMemo(() => getReturnToFromSearch(search.toString()), [search])
}

export function LoginPage() {
  usePageTitle('Đăng nhập')
  const navigate = useNavigate()
  const { status, session, acceptSession } = useAuthSession()
  const [search] = useSearchParams()
  const returnTo = useSafeLoginRedirect()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [persona, setPersona] = useState('')
  const [errors, setErrors] = useState<FormErrors>({})
  const [requestError, setRequestError] = useState('')
  const [pending, setPending] = useState(false)
  const accounts = studentDemoRepositories.auth.listDemoAccounts()

  if (status === 'checking') return <AuthChecking />
  if (session) return <Navigate replace to={returnTo} />

  const continueWithPersona = async () => {
    if (!persona) {
      setErrors({ persona: 'Chọn một tài khoản demo để tiếp tục.' })
      return
    }
    setPending(true)
    setRequestError('')
    setErrors({})
    try {
      const next = await studentDemoRepositories.auth.signInWithDemoAccount(persona as DemoPersona)
      acceptSession(toLegacyDemoSession(next))
      navigate(returnTo, { replace: true })
    } catch (error) {
      setRequestError(getDemoErrorPresentation(error).message)
    } finally {
      setPending(false)
    }
  }

  const submitCredentials = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const nextErrors: FormErrors = {}
    if (!email.trim()) nextErrors.email = 'Nhập email của bạn.'
    else if (!validEmail(email)) nextErrors.email = 'Email chưa đúng định dạng.'
    if (!password) nextErrors.password = 'Nhập mật khẩu demo.'
    setErrors(nextErrors)
    setRequestError('')
    if (Object.keys(nextErrors).length > 0) return

    setPending(true)
    try {
      const next = await studentDemoRepositories.auth.signInWithCredentials(email, password)
      acceptSession(toLegacyDemoSession(next))
      navigate(returnTo, { replace: true })
    } catch (error) {
      setRequestError(getDemoErrorPresentation(error).message)
    } finally {
      setPending(false)
    }
  }

  return (
    <AuthPageFrame title="Đăng nhập" eyebrow="Khu vực học viên">
      <AuthFormCard title="Chào mừng trở lại" description="Đăng nhập">
        {search.get('sessionRevoked') === '1' && (
          <InlineAlert tone="warning" title="Phiên demo đã bị thu hồi">
            Một yêu cầu học viên nhận trạng thái SESSION_REVOKED. Dữ liệu riêng đã được xóa; hãy
            chọn tài khoản demo để tiếp tục.
          </InlineAlert>
        )}
        {search.get('sessionInvalid') === '1' && (
          <InlineAlert tone="warning" title="Phiên demo không còn hợp lệ">
            Yêu cầu học viên không xác nhận được phiên này. Bộ nhớ học viên đã được xóa; hãy chọn
            tài khoản demo để đăng nhập lại.
          </InlineAlert>
        )}
        {requestError && (
          <InlineAlert tone="danger" title="Chưa đăng nhập được">
            {requestError}
          </InlineAlert>
        )}
        <form className="grid gap-4" noValidate onSubmit={(event) => void submitCredentials(event)}>
          <FormField id="login-email" label="Email" required error={errors.email}>
            {(describedBy, invalid) => (
              <EmailInput
                id="login-email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                autoComplete="email"
                placeholder="ban@example.test"
                aria-invalid={invalid || undefined}
                aria-describedby={describedBy}
              />
            )}
          </FormField>
          <FormField id="login-password" label="Mật khẩu" required error={errors.password}>
            {(describedBy, invalid) => (
              <PasswordInput
                id="login-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="current-password"
                placeholder="Chỉ dùng mật khẩu demo"
                aria-invalid={invalid || undefined}
                aria-describedby={describedBy}
              />
            )}
          </FormField>
          <div className="flex justify-end">
            <InlineProductLink to="/forgot-password">Quên mật khẩu?</InlineProductLink>
          </div>
          <Button type="submit" loading={pending} className="w-full">
            Đăng nhập bằng thông tin demo
            <ArrowRight aria-hidden="true" />
          </Button>
        </form>
        <div className="relative py-1 text-center text-xs text-ink-muted before:absolute before:left-0 before:right-0 before:top-1/2 before:border-t before:border-border-subtle">
          <span className="relative bg-card-surface px-3">hoặc</span>
        </div>
        <div className="grid gap-3">
          <SelectField
            id="demo-account"
            label="Tài khoản demo"
            placeholder="Chọn một trạng thái học viên"
            value={persona}
            onValueChange={(value) => {
              setPersona(value)
              setErrors((current) => ({ ...current, persona: '' }))
            }}
            options={accounts.map((account) => ({
              value: account.persona,
              label: `${account.displayName} · ${account.description}`,
            }))}
            description="Không cần nhập email hoặc mật khẩu cho lựa chọn này."
            error={errors.persona}
          />
          <Button
            type="button"
            variant="secondary"
            loading={pending}
            onClick={() => void continueWithPersona()}
          >
            Tiếp tục với tài khoản demo
          </Button>
        </div>
        <p className="text-center text-sm text-ink-secondary">
          Chưa có tài khoản?{' '}
          <InlineProductLink to="/register">Tạo tài khoản demo</InlineProductLink>
        </p>
        <p className="rounded-xl bg-surface-muted px-3 py-2.5 text-xs leading-5 text-ink-secondary">
          Chỉ dùng email kết thúc bằng <strong>.test</strong>. Không nhập mật khẩu bạn dùng ở dịch
          vụ khác; đây không phải đăng nhập bảo mật thật.
        </p>
      </AuthFormCard>
    </AuthPageFrame>
  )
}

export function RegisterPage() {
  usePageTitle('Tạo tài khoản demo')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [errors, setErrors] = useState<FormErrors>({})
  const [requestError, setRequestError] = useState('')
  const [complete, setComplete] = useState(false)
  const [pending, setPending] = useState(false)

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const nextErrors: FormErrors = {}
    if (!name.trim()) nextErrors.name = 'Nhập tên hiển thị.'
    if (!email.trim()) nextErrors.email = 'Nhập email demo.'
    else if (!validEmail(email)) nextErrors.email = 'Email chưa đúng định dạng.'
    else if (!email.trim().toLowerCase().endsWith('.test'))
      nextErrors.email = 'Chỉ dùng email giả lập kết thúc bằng .test.'
    if (!password) nextErrors.password = 'Nhập mật khẩu demo.'
    if (!confirmPassword) nextErrors.confirm = 'Nhập lại mật khẩu demo.'
    else if (confirmPassword !== password) nextErrors.confirm = 'Hai mật khẩu chưa khớp.'
    setErrors(nextErrors)
    setRequestError('')
    if (Object.keys(nextErrors).length > 0) return

    setPending(true)
    try {
      await studentDemoRepositories.auth.registerDemoAccount({ displayName: name, email, password })
      setComplete(true)
    } catch (error) {
      setRequestError(getDemoErrorPresentation(error).message)
    } finally {
      setPending(false)
    }
  }

  return (
    <AuthPageFrame title="Tạo tài khoản" eyebrow="Bắt đầu học">
      <AuthFormCard title="Tạo tài khoản demo" description="Đăng ký">
        {complete ? (
          <div className="grid gap-4">
            <InlineAlert tone="success" title="Tài khoản demo đã được tạo">
              Đây là tài khoản mô phỏng trong bộ nhớ hiện tại. Không có email xác minh nào được gửi
              và bạn chưa được đăng nhập tự động.
            </InlineAlert>
            <LinkButton to="/login" className="w-full justify-center">
              Đến trang đăng nhập
            </LinkButton>
          </div>
        ) : (
          <>
            {requestError && (
              <InlineAlert tone="danger" title="Chưa tạo được tài khoản">
                {requestError}
              </InlineAlert>
            )}
            <form className="grid gap-4" noValidate onSubmit={(event) => void submit(event)}>
              <FormField id="register-name" label="Tên hiển thị" required error={errors.name}>
                {(describedBy, invalid) => (
                  <TextInput
                    id="register-name"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    autoComplete="name"
                    placeholder="Tên của bạn"
                    aria-invalid={invalid || undefined}
                    aria-describedby={describedBy}
                  />
                )}
              </FormField>
              <FormField id="register-email" label="Email demo" required error={errors.email}>
                {(describedBy, invalid) => (
                  <EmailInput
                    id="register-email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    autoComplete="email"
                    placeholder="ban@example.test"
                    aria-invalid={invalid || undefined}
                    aria-describedby={describedBy}
                  />
                )}
              </FormField>
              <FormField
                id="register-password"
                label="Mật khẩu demo"
                required
                description="Chỉ lưu tạm trong bộ nhớ của bản demo; không dùng mật khẩu thật."
                error={errors.password}
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
                error={errors.confirm}
              >
                {(describedBy, invalid) => (
                  <PasswordInput
                    id="register-confirm"
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    autoComplete="new-password"
                    aria-invalid={invalid || undefined}
                    aria-describedby={describedBy}
                  />
                )}
              </FormField>
              <Button type="submit" loading={pending} className="w-full">
                Tạo tài khoản demo
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

export function ForgotPasswordPage() {
  usePageTitle('Quên mật khẩu')
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [requestError, setRequestError] = useState('')
  const [token, setToken] = useState('')
  const [pending, setPending] = useState(false)

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(
      !email.trim() ? 'Nhập email demo.' : !validEmail(email) ? 'Email chưa đúng định dạng.' : '',
    )
    setRequestError('')
    if (!email.trim() || !validEmail(email)) return
    setPending(true)
    try {
      const result = await studentDemoRepositories.auth.requestPasswordReset(email)
      setToken(result.token)
    } catch (cause) {
      setRequestError(getDemoErrorPresentation(cause).message)
    } finally {
      setPending(false)
    }
  }

  return (
    <AuthPageFrame title="Quên mật khẩu" eyebrow="Khôi phục truy cập">
      <AuthFormCard title="Đặt lại mật khẩu" description="Quên mật khẩu?">
        <p className="text-sm leading-6 text-ink-secondary">
          Nhập email .test để mở luồng đặt lại trong bản demo. Phản hồi giống nhau cho mọi địa chỉ
          để không tiết lộ tài khoản có tồn tại hay không.
        </p>
        {requestError && (
          <InlineAlert tone="danger" title="Chưa tạo được yêu cầu">
            {requestError}
          </InlineAlert>
        )}
        {token ? (
          <div className="grid gap-4">
            <InlineAlert tone="info" title="Yêu cầu mô phỏng đã sẵn sàng">
              Đây là luồng mô phỏng. Không có email thực tế được gửi và không có thay đổi bảo mật
              nào được thực hiện.
            </InlineAlert>
            <LinkButton
              to={`/reset-password?token=${encodeURIComponent(token)}`}
              className="w-full justify-center"
              endIcon={<ArrowRight aria-hidden="true" />}
            >
              Tiếp tục đến trang đặt lại demo
            </LinkButton>
          </div>
        ) : (
          <form className="grid gap-4" noValidate onSubmit={(event) => void submit(event)}>
            <FormField id="forgot-email" label="Email demo" required error={error}>
              {(describedBy, invalid) => (
                <EmailInput
                  id="forgot-email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  autoComplete="email"
                  placeholder="ban@example.test"
                  aria-invalid={invalid || undefined}
                  aria-describedby={describedBy}
                />
              )}
            </FormField>
            <Button type="submit" loading={pending} className="w-full">
              Tạo yêu cầu mô phỏng
            </Button>
          </form>
        )}
        <InlineProductLink to="/login">Quay lại đăng nhập</InlineProductLink>
      </AuthFormCard>
    </AuthPageFrame>
  )
}

export function ResetPasswordPage() {
  usePageTitle('Đặt lại mật khẩu')
  const [search] = useSearchParams()
  const token = search.get('token') ?? ''
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [requestError, setRequestError] = useState('')
  const [complete, setComplete] = useState(false)
  const [pending, setPending] = useState(false)
  const tokenQuery = useQuery({
    queryKey: ['auth', 'reset-token', token],
    queryFn: () => studentDemoRepositories.auth.getResetTokenState(token),
    enabled: Boolean(token),
    retry: false,
  })
  const { status, session } = useAuthSession()

  useEffect(() => {
    if (session && status === 'authenticated') navigate('/student', { replace: true })
  }, [navigate, session, status])

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const message = !password
      ? 'Nhập mật khẩu demo mới.'
      : !confirmPassword
        ? 'Nhập lại mật khẩu.'
        : confirmPassword !== password
          ? 'Hai mật khẩu chưa khớp.'
          : ''
    setError(message)
    setRequestError('')
    if (message) return
    setPending(true)
    try {
      await studentDemoRepositories.auth.resetDemoPassword(token, password)
      setComplete(true)
      await tokenQuery.refetch()
    } catch (cause) {
      setRequestError(getDemoErrorPresentation(cause).message)
    } finally {
      setPending(false)
    }
  }

  let tokenMessage = ''
  if (!token) tokenMessage = 'Liên kết demo chưa có mã đặt lại.'
  else if (tokenQuery.data === 'invalid') tokenMessage = 'Mã mô phỏng không hợp lệ.'
  else if (tokenQuery.data === 'expired') tokenMessage = 'Mã mô phỏng đã hết hạn.'
  else if (tokenQuery.data === 'used') tokenMessage = 'Mã mô phỏng đã được sử dụng.'

  return (
    <AuthPageFrame title="Đặt lại mật khẩu" eyebrow="Luồng demo">
      <AuthFormCard title="Mã đặt lại demo" description="Tạo mật khẩu mới">
        {tokenQuery.isPending && token ? (
          <p role="status" className="text-sm text-ink-secondary">
            Đang kiểm tra mã mô phỏng…
          </p>
        ) : complete ? (
          <div className="grid gap-4">
            <InlineAlert tone="success" title="Mật khẩu demo đã được cập nhật">
              Thay đổi chỉ nằm trong bộ nhớ demo hiện tại. Không có email, backend hoặc tài khoản
              thật nào bị tác động.
            </InlineAlert>
            <LinkButton to="/login" className="w-full justify-center">
              Quay lại đăng nhập
            </LinkButton>
          </div>
        ) : tokenMessage ? (
          <div className="grid gap-4">
            <InlineAlert
              tone={
                tokenQuery.data === 'expired' || tokenQuery.data === 'used' ? 'warning' : 'info'
              }
              title="Không thể dùng mã này"
            >
              {tokenMessage} Hãy yêu cầu một luồng đặt lại demo mới.
            </InlineAlert>
            <LinkButton to="/forgot-password" className="w-full justify-center">
              Tạo yêu cầu demo mới
            </LinkButton>
          </div>
        ) : (
          <>
            {requestError && (
              <InlineAlert tone="danger" title="Chưa đặt lại được">
                {requestError}
              </InlineAlert>
            )}
            <form className="grid gap-4" noValidate onSubmit={(event) => void submit(event)}>
              <FormField id="reset-password" label="Mật khẩu demo mới" required error={error}>
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
              <FormField
                id="reset-confirm"
                label="Nhập lại mật khẩu"
                required
                error={
                  error && (error.includes('khớp') || error.includes('lại') ? error : undefined)
                }
              >
                {(describedBy, invalid) => (
                  <PasswordInput
                    id="reset-confirm"
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    autoComplete="new-password"
                    aria-invalid={invalid || undefined}
                    aria-describedby={describedBy}
                  />
                )}
              </FormField>
              <Button type="submit" loading={pending} className="w-full">
                Đặt lại mật khẩu demo
              </Button>
            </form>
          </>
        )}
        <p className="inline-flex items-center gap-2 text-xs leading-5 text-ink-muted">
          <MailCheck aria-hidden="true" className="size-4 shrink-0" />
          Mã này chỉ thuộc luồng mô phỏng và không thay thế reset token của backend.
        </p>
        <InlineProductLink to="/login">
          <span className="inline-flex items-center gap-1">
            <ArrowLeft aria-hidden="true" className="size-4" />
            Về đăng nhập
          </span>
        </InlineProductLink>
      </AuthFormCard>
    </AuthPageFrame>
  )
}
