import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from 'react'
import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  ArrowUpDown,
  BookOpenText,
  LogOut,
  Settings2,
} from 'lucide-react'
import { Link, NavLink, useLocation } from 'react-router'
import { useQueryClient, useMutation } from '@tanstack/react-query'
import { useAuthSession } from '@/app/auth/auth-session'
import { Button, Card, ErrorState, Skeleton } from '@/shared/ui'
import { useNotifications } from '@/shared/ui/notifications'
import { ApiError } from '@/lib/api/client'

const navigation = [
  { to: '/admin', label: 'Tổng quan' },
  {
    label: 'Quản lý khóa học',
    children: [
      { to: '/admin/courses', label: 'Khóa học' },
      { to: '/admin/sections', label: 'Chương' },
      { to: '/admin/lessons', label: 'Bài học' },
      { to: '/admin/exercises', label: 'Bài tập' },
    ],
  },
  { to: '/admin/media', label: 'Thư viện tệp' },
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
      <div className="mx-auto grid max-w-[1600px] gap-5 px-4 pt-3 pb-5 sm:px-6 sm:pt-4 lg:grid-cols-[15rem_minmax(0,1fr)] lg:gap-8 lg:pt-5 lg:pb-8">
        <aside className="min-w-0 lg:sticky lg:top-24 lg:h-[calc(100vh-7rem)]">
          <nav
            aria-label="Điều hướng quản trị"
            className="flex gap-2 overflow-x-auto rounded-2xl border border-border-subtle bg-white p-2 lg:grid lg:content-start lg:gap-1 lg:overflow-visible"
          >
            {navigation.map((item) => {
              if ('children' in item) {
                return (
                  <div
                    key={item.label}
                    className="min-w-[13rem] rounded-xl bg-surface-muted p-2 lg:min-w-0"
                  >
                    <p className="px-2 pb-1 pt-0.5 text-[0.65rem] font-bold uppercase tracking-[0.12em] text-ink-muted">
                      {item.label}
                    </p>
                    <div className="grid grid-cols-2 gap-1 lg:grid-cols-1">
                      {item.children.map((child) => {
                        const nestedSectionEditor =
                          /^\/admin\/courses\/[^/]+\/sections\/[^/]+$/.test(location.pathname)
                        const nestedLessonEditor =
                          /^\/admin\/courses\/[^/]+\/sections\/[^/]+\/lessons\/[^/]+$/.test(
                            location.pathname,
                          )
                        const nestedExerciseEditor =
                          /^\/admin\/courses\/[^/]+\/sections\/[^/]+\/lessons\/[^/]+\/exercises\/[^/]+$/.test(
                            location.pathname,
                          )
                        const active =
                          location.pathname === child.to ||
                          (location.pathname.startsWith(`${child.to}/`) &&
                            !(
                              child.to === '/admin/courses' &&
                              (nestedSectionEditor || nestedLessonEditor || nestedExerciseEditor)
                            )) ||
                          (child.to === '/admin/sections' && nestedSectionEditor) ||
                          (child.to === '/admin/lessons' && nestedLessonEditor) ||
                          (child.to === '/admin/exercises' && nestedExerciseEditor)
                        return (
                          <NavLink
                            key={child.to}
                            to={child.to}
                            aria-current={active ? 'page' : undefined}
                            className={`min-h-10 rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${active ? 'bg-white text-action-primary shadow-sm' : 'text-ink-secondary hover:bg-white/80 hover:text-ink-primary'}`}
                          >
                            {child.label}
                          </NavLink>
                        )
                      })}
                    </div>
                  </div>
                )
              }
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
            <p className="font-semibold text-ink-primary">Quản lý nội dung học</p>
            <p className="mt-1 leading-6">
              Chọn khóa học, chương, bài học hoặc bài tập để bắt đầu chỉnh sửa.
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

export type AdminTableColumn<T> = {
  key: string
  label: string
  render: (row: T) => ReactNode
  sortValue?: (row: T) => string | number | null
  className?: string
}

export function AdminSortableTable<T>({
  rows,
  columns,
  rowKey,
  emptyContent,
}: {
  rows: readonly T[]
  columns: readonly AdminTableColumn<T>[]
  rowKey: (row: T) => string
  emptyContent: ReactNode
}) {
  const initialSortKey = columns.find((column) => column.sortValue)?.key ?? ''
  const [sortKey, setSortKey] = useState(initialSortKey)
  const [direction, setDirection] = useState<'asc' | 'desc'>('asc')
  const sortedRows = useMemo(() => {
    const column = columns.find((item) => item.key === sortKey && item.sortValue)
    if (!column?.sortValue) return [...rows]
    const collator = new Intl.Collator('vi', { numeric: true, sensitivity: 'base' })
    return [...rows].sort((left, right) => {
      const leftValue = column.sortValue!(left)
      const rightValue = column.sortValue!(right)
      const comparison =
        typeof leftValue === 'number' && typeof rightValue === 'number'
          ? leftValue - rightValue
          : collator.compare(String(leftValue ?? ''), String(rightValue ?? ''))
      return direction === 'asc' ? comparison : -comparison
    })
  }, [columns, direction, rows, sortKey])

  function setSort(column: AdminTableColumn<T>) {
    if (!column.sortValue) return
    if (column.key === sortKey) setDirection((current) => (current === 'asc' ? 'desc' : 'asc'))
    else {
      setSortKey(column.key)
      setDirection('asc')
    }
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-border-subtle bg-white">
      <table className="w-full min-w-[44rem] border-collapse text-left text-sm">
        <thead className="bg-surface-muted text-xs uppercase tracking-wide text-ink-secondary">
          <tr>
            {columns.map((column) => {
              const active = sortKey === column.key
              const SortIcon = column.sortValue
                ? !active
                  ? ArrowUpDown
                  : direction === 'asc'
                    ? ArrowUp
                    : ArrowDown
                : null
              return (
                <th
                  key={column.key}
                  scope="col"
                  aria-sort={active ? (direction === 'asc' ? 'ascending' : 'descending') : 'none'}
                  className={`border-b border-border-subtle px-4 py-3 font-semibold ${column.className ?? ''}`}
                >
                  <button
                    type="button"
                    disabled={!column.sortValue}
                    onClick={() => setSort(column)}
                    className="inline-flex min-h-8 items-center gap-2 rounded-md text-left hover:text-ink-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-action-primary disabled:cursor-default"
                  >
                    {column.label}
                    {SortIcon && <SortIcon aria-hidden="true" className="size-3.5 shrink-0" />}
                  </button>
                </th>
              )
            })}
          </tr>
        </thead>
        <tbody className="divide-y divide-border-subtle">
          {sortedRows.length ? (
            sortedRows.map((row) => (
              <tr key={rowKey(row)} className="align-middle hover:bg-surface-muted/60">
                {columns.map((column) => (
                  <td key={column.key} className={`px-4 py-3 ${column.className ?? ''}`}>
                    {column.render(row)}
                  </td>
                ))}
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={columns.length} className="px-4 py-8 text-center">
                {emptyContent}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}

function normalizeAdminSearch(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[đĐ]/g, 'd')
    .toLocaleLowerCase('vi')
    .trim()
}

export function AdminSearchSelect({
  label,
  value,
  onChange,
  options,
  placeholder = 'Gõ để tìm tên…',
  disabled = false,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  options: readonly { value: string; label: string; description?: string }[]
  placeholder?: string
  disabled?: boolean
}) {
  const id = useId()
  const listId = `${id}-options`
  const selected = options.find((option) => option.value === value)
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const filtered = options
    .filter((option) =>
      normalizeAdminSearch(`${option.label} ${option.description ?? ''}`).includes(
        normalizeAdminSearch(search),
      ),
    )
    .slice(0, 80)

  function choose(option: (typeof options)[number]) {
    onChange(option.value)
    setSearch('')
    setOpen(false)
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Escape') {
      setOpen(false)
      setSearch('')
    } else if (event.key === 'Enter' && open && filtered[0]) {
      event.preventDefault()
      choose(filtered[0])
    } else if (event.key === 'ArrowDown') {
      setOpen(true)
    }
  }

  return (
    <div className="relative grid min-w-0 gap-1.5 text-sm font-semibold text-ink-primary">
      <label htmlFor={id}>{label}</label>
      <input
        id={id}
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={open}
        aria-controls={listId}
        autoComplete="off"
        className="min-h-11 w-full rounded-xl border border-border-subtle bg-white px-3 font-normal outline-none focus-visible:ring-2 focus-visible:ring-action-primary disabled:bg-surface-muted"
        value={open ? search : (selected?.label ?? '')}
        placeholder={options.length ? placeholder : 'Chưa có mục nào để chọn'}
        disabled={disabled || options.length === 0}
        onFocus={() => {
          setSearch(selected?.label ?? '')
          setOpen(true)
        }}
        onBlur={() => setOpen(false)}
        onKeyDown={handleKeyDown}
        onChange={(event) => {
          setSearch(event.target.value)
          setOpen(true)
          if (value) onChange('')
        }}
      />
      {open && (
        <div
          id={listId}
          role="listbox"
          aria-label={label}
          className="absolute inset-x-0 top-full z-20 mt-1 max-h-64 overflow-y-auto rounded-xl border border-border-subtle bg-white p-1 shadow-raised"
        >
          {filtered.length ? (
            filtered.map((option) => (
              <button
                key={option.value}
                type="button"
                role="option"
                aria-selected={option.value === value}
                className="grid min-h-10 w-full gap-0.5 rounded-lg px-3 py-2 text-left font-normal hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-action-primary"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => choose(option)}
              >
                <span className="truncate font-semibold">{option.label}</span>
                {option.description && (
                  <span className="truncate text-xs text-ink-secondary">{option.description}</span>
                )}
              </button>
            ))
          ) : (
            <p className="px-3 py-2 text-sm font-normal text-ink-secondary">
              Không tìm thấy kết quả phù hợp.
            </p>
          )}
        </div>
      )}
    </div>
  )
}

export function useDebouncedValue<T>(value: T, delay = 250) {
  const [debouncedValue, setDebouncedValue] = useState(value)
  useEffect(() => {
    const timeout = window.setTimeout(() => setDebouncedValue(value), delay)
    return () => window.clearTimeout(timeout)
  }, [delay, value])
  return debouncedValue
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
      description={error instanceof Error ? error.message : 'Kiểm tra kết nối rồi thử lại.'}
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
