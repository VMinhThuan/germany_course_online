import { useCallback, useEffect, useRef, type ReactNode } from 'react'
import { ArrowLeft, BookOpenText, LogOut, Settings2 } from 'lucide-react'
import { Link, NavLink, useLocation } from 'react-router'
import { useQueryClient, useMutation } from '@tanstack/react-query'
import { useAuthSession } from '@/app/auth/auth-session'
import { Button, Card, ErrorState, Skeleton } from '@/shared/ui'
import { useNotifications } from '@/shared/ui/notifications'
import { ApiError } from '@/lib/api/client'

const navigation = [
  { to: '/admin', label: 'Tổng quan' },
  { to: '/admin/courses', label: 'Khóa học' },
  { to: '/admin/media', label: 'Thư viện media' },
  { to: '/admin/students', label: 'Học viên' },
  { to: '/admin/enrollments', label: 'Quyền học' },
  { to: '/admin/orders', label: 'Đơn hàng' },
  { to: '/admin/renewal-plans', label: 'Gói gia hạn' },
  { to: '/admin/coupons', label: 'Mã ưu đãi' },
  { to: '/admin/settings', label: 'Cài đặt website' },
  { to: '/admin/audit-logs', label: 'Nhật ký quản trị' },
]

export function AdminLayout({
  title,
  description,
  children,
}: {
  title: string
  description?: string
  children: ReactNode
}) {
  const { logout, session } = useAuthSession()
  const location = useLocation()
  return (
    <div className="min-h-screen bg-surface-muted text-ink-primary">
      <header className="sticky top-0 z-30 border-b border-border-subtle bg-white/95 shadow-sm backdrop-blur">
        <div className="mx-auto flex min-h-16 max-w-[1600px] items-center justify-between gap-4 px-4 sm:px-6">
          <Link
            to="/admin"
            className="flex items-center gap-2 font-display text-lg font-extrabold text-action-primary"
          >
            <BookOpenText aria-hidden="true" className="size-5" /> PAniverseDeutsch · Admin
          </Link>
          <div className="flex items-center gap-3 text-sm">
            <span className="hidden max-w-52 truncate text-ink-secondary sm:inline">
              {session?.profile.displayName || session?.profile.email}
            </span>
            <Button
              size="sm"
              variant="outline"
              onClick={() => void logout()}
              startIcon={<LogOut aria-hidden="true" className="size-4" />}
            >
              Đăng xuất
            </Button>
          </div>
        </div>
      </header>
      <div className="mx-auto grid max-w-[1600px] gap-5 px-4 py-5 sm:px-6 lg:grid-cols-[15rem_minmax(0,1fr)] lg:gap-8 lg:py-8">
        <aside className="min-w-0 lg:sticky lg:top-24 lg:h-[calc(100vh-7rem)]">
          <nav
            aria-label="Điều hướng quản trị"
            className="flex gap-2 overflow-x-auto rounded-2xl border border-border-subtle bg-white p-2 lg:grid lg:content-start lg:gap-1 lg:overflow-visible"
          >
            {navigation.map((item) => {
              const active =
                location.pathname === item.to ||
                (item.to !== '/admin' && location.pathname.startsWith(`${item.to}/`))
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  aria-current={active ? 'page' : undefined}
                  className={`min-h-10 shrink-0 rounded-xl px-3 py-2 text-sm font-semibold transition-colors ${active ? 'bg-surface-blue text-action-primary' : 'text-ink-secondary hover:bg-surface-muted hover:text-ink-primary'}`}
                >
                  {item.label}
                </NavLink>
              )
            })}
          </nav>
          <div className="mt-4 hidden rounded-2xl border border-border-subtle bg-white p-4 text-sm text-ink-secondary lg:block">
            <Settings2 aria-hidden="true" className="mb-2 size-5 text-action-primary" />
            <p className="font-semibold text-ink-primary">Quản trị qua API</p>
            <p className="mt-1 leading-6">
              Mọi thao tác ghi đều được máy chủ phân quyền và ghi nhật ký.
            </p>
          </div>
        </aside>
        <main className="min-w-0">
          <div className="mb-6 flex flex-wrap items-end justify-between gap-3 border-b border-border-subtle pb-5">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.15em] text-action-primary">
                Khu vực quản trị
              </p>
              <h1 className="mt-1 font-display text-2xl font-extrabold tracking-tight sm:text-3xl">
                {title}
              </h1>
              {description && (
                <p className="mt-2 max-w-3xl text-sm leading-6 text-ink-secondary">{description}</p>
              )}
            </div>
            {location.pathname !== '/admin' && (
              <Link
                to="/admin"
                className="inline-flex min-h-10 items-center gap-2 rounded-xl px-3 text-sm font-semibold text-action-primary hover:bg-white"
              >
                <ArrowLeft aria-hidden="true" className="size-4" />
                Tổng quan
              </Link>
            )}
          </div>
          {children}
        </main>
      </div>
    </div>
  )
}

export function AdminCard({
  title,
  description,
  children,
  className = '',
}: {
  title?: string
  description?: string
  children: ReactNode
  className?: string
}) {
  return (
    <Card className={`grid content-start gap-4 p-4 sm:p-5 ${className}`}>
      {(title || description) && (
        <div>
          {title && <h2 className="font-display text-lg font-bold">{title}</h2>}
          {description && (
            <p className="mt-1 text-sm leading-6 text-ink-secondary">{description}</p>
          )}
        </div>
      )}
      {children}
    </Card>
  )
}

export function AdminField({
  label,
  value,
  onChange,
  type = 'text',
  required = false,
  placeholder,
  min,
  max,
  step,
  maxLength,
  disabled = false,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  type?: string
  required?: boolean
  placeholder?: string
  min?: number
  max?: number
  step?: number
  maxLength?: number
  disabled?: boolean
}) {
  return (
    <label className="grid min-w-0 gap-1.5 text-sm font-semibold text-ink-primary">
      <span>{label}</span>
      <input
        className="min-h-11 w-full rounded-xl border border-border-subtle bg-white px-3 font-normal outline-none focus-visible:ring-2 focus-visible:ring-action-primary disabled:bg-surface-muted"
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        required={required}
        placeholder={placeholder}
        min={min}
        max={max}
        step={step}
        maxLength={maxLength}
        disabled={disabled}
      />
    </label>
  )
}

export function AdminSelect({
  label,
  value,
  onChange,
  options,
  disabled = false,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  options: readonly { value: string; label: string }[]
  disabled?: boolean
}) {
  return (
    <label className="grid min-w-0 gap-1.5 text-sm font-semibold text-ink-primary">
      <span>{label}</span>
      <select
        className="min-h-11 w-full rounded-xl border border-border-subtle bg-white px-3 font-normal outline-none focus-visible:ring-2 focus-visible:ring-action-primary disabled:bg-surface-muted"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        disabled={disabled}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  )
}

export function AdminTextArea({
  label,
  value,
  onChange,
  rows = 4,
  required = false,
  placeholder,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  rows?: number
  required?: boolean
  placeholder?: string
}) {
  return (
    <label className="grid min-w-0 gap-1.5 text-sm font-semibold text-ink-primary">
      <span>{label}</span>
      <textarea
        className="min-h-24 w-full rounded-xl border border-border-subtle bg-white p-3 font-normal leading-6 outline-none focus-visible:ring-2 focus-visible:ring-action-primary"
        rows={rows}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        required={required}
        placeholder={placeholder}
      />
    </label>
  )
}

export function AdminFeedback({ error, success }: { error?: unknown; success?: string }) {
  const { notify } = useNotifications()
  const errorMessage = error
    ? error instanceof ApiError
      ? error.message
      : error instanceof Error
        ? error.message
        : typeof error === 'string'
          ? error
          : 'Thao tác chưa hoàn tất. Thử lại sau.'
    : undefined

  useEffect(() => {
    if (errorMessage) {
      notify({
        kind: 'error',
        title: 'Thao tác chưa hoàn tất',
        description: errorMessage,
        duration: 0,
      })
    } else if (success) {
      notify({ kind: 'success', title: success })
    }
  }, [errorMessage, notify, success])

  return null
}

export function AdminLoading({ label = 'Đang tải dữ liệu quản trị' }: { label?: string }) {
  return (
    <div role="status" aria-label={label} className="grid gap-3">
      <Skeleton className="h-16 w-full" />
      <Skeleton className="h-48 w-full" />
    </div>
  )
}

export function AdminLoadError({ error, retry }: { error: unknown; retry: () => void }) {
  return (
    <ErrorState
      title="Không tải được dữ liệu"
      description={error instanceof Error ? error.message : 'Kiểm tra kết nối API rồi thử lại.'}
      onRetry={retry}
    />
  )
}

export function useAdminMutation<TInput, TOutput>(mutationFn: (input: TInput) => Promise<TOutput>) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn,
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['admin'] }),
        queryClient.invalidateQueries({ queryKey: ['student'] }),
        queryClient.invalidateQueries({ queryKey: ['public'] }),
      ])
    },
  })
}

export function useStableIdempotencyKey() {
  const state = useRef<{ scope: string; key: string } | null>(null)
  const get = useCallback((scope: unknown) => {
    const serialized = JSON.stringify(scope)
    if (state.current?.scope !== serialized) {
      state.current = {
        scope: serialized,
        key:
          globalThis.crypto?.randomUUID?.() ??
          `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      }
    }
    return state.current.key
  }, [])
  const clear = useCallback(() => {
    state.current = null
  }, [])
  return { get, clear }
}
