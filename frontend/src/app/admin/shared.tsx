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
  FileText,
  GraduationCap,
  LayoutDashboard,
  Library,
  ListChecks,
  LockKeyhole,
  LogOut,
  Menu,
  MessageSquareText,
  RefreshCw,
  ScrollText,
  Settings2,
  ShoppingBag,
  TicketPercent,
  UsersRound,
  type LucideIcon,
} from 'lucide-react'
import { Link, NavLink, useLocation } from 'react-router'
import { useQueryClient, useMutation } from '@tanstack/react-query'
import { useAuthSession } from '@/app/auth/auth-session'
import { DecorativeHeading } from '@/domains/shared/decorative-heading'
import { Button, Card, DropdownSelect, ErrorState, Sheet, Skeleton } from '@/shared/ui'
import { useNotifications } from '@/shared/ui/notifications'
import { ApiError } from '@/lib/api/client'

type AdminNavigationLeaf = {
  to: string
  label: string
  icon: LucideIcon
}

type AdminNavigationGroup = {
  label: string
  icon: LucideIcon
  children: readonly AdminNavigationLeaf[]
}

type AdminNavigationItem = AdminNavigationLeaf | AdminNavigationGroup

const navigation: readonly AdminNavigationItem[] = [
  { to: '/admin', label: 'Tổng quan', icon: LayoutDashboard },
  {
    label: 'Quản lý khóa học',
    icon: BookOpenText,
    children: [
      { to: '/admin/courses', label: 'Khóa học', icon: GraduationCap },
      { to: '/admin/sections', label: 'Chương', icon: Library },
      { to: '/admin/lessons', label: 'Bài học', icon: FileText },
      { to: '/admin/exercises', label: 'Bài tập', icon: ListChecks },
    ],
  },
  { to: '/admin/media', label: 'Thư viện tệp', icon: Library },
  { to: '/admin/lesson-comments', label: 'Quản lý bình luận', icon: MessageSquareText },
  { to: '/admin/students', label: 'Học viên', icon: UsersRound },
  { to: '/admin/enrollments', label: 'Quyền học', icon: GraduationCap },
  { to: '/admin/orders', label: 'Đơn hàng', icon: ShoppingBag },
  { to: '/admin/renewal-plans', label: 'Gói gia hạn', icon: RefreshCw },
  { to: '/admin/coupons', label: 'Mã ưu đãi', icon: TicketPercent },
  { to: '/admin/settings', label: 'Cài đặt website', icon: Settings2 },
  { to: '/admin/audit-logs', label: 'Nhật ký quản trị', icon: ScrollText },
]

function isAdminChildActive(pathname: string, child: AdminNavigationLeaf) {
  const nestedSectionEditor = /^\/admin\/courses\/[^/]+\/sections\/[^/]+$/.test(pathname)
  const nestedLessonEditor = /^\/admin\/courses\/[^/]+\/sections\/[^/]+\/lessons\/[^/]+$/.test(
    pathname,
  )
  const nestedExerciseEditor =
    /^\/admin\/courses\/[^/]+\/sections\/[^/]+\/lessons\/[^/]+\/exercises\/[^/]+$/.test(pathname)

  return (
    pathname === child.to ||
    (pathname.startsWith(`${child.to}/`) &&
      !(
        child.to === '/admin/courses' &&
        (nestedSectionEditor || nestedLessonEditor || nestedExerciseEditor)
      )) ||
    (child.to === '/admin/sections' && nestedSectionEditor) ||
    (child.to === '/admin/lessons' && nestedLessonEditor) ||
    (child.to === '/admin/exercises' && nestedExerciseEditor)
  )
}

function AdminNavigation({ pathname, onNavigate }: { pathname: string; onNavigate?: () => void }) {
  return (
    <nav aria-label="Điều hướng quản trị" className="grid gap-1.5">
      <p className="px-3 pb-1 text-[0.68rem] font-bold uppercase tracking-[0.14em] text-ink-muted">
        Không gian quản trị
      </p>
      {navigation.map((item) => {
        if ('children' in item) {
          const GroupIcon = item.icon
          return (
            <div
              key={item.label}
              className="rounded-2xl border border-brand-pink/60 bg-gradient-to-b from-brand-pink/30 to-brand-pink/10 p-2"
            >
              <div className="flex items-center gap-2 px-2 pb-2 pt-1">
                <span className="grid size-8 shrink-0 place-items-center rounded-xl bg-white/80 text-action-primary shadow-sm">
                  <GroupIcon aria-hidden="true" className="size-4" />
                </span>
                <p className="truncate text-[0.68rem] font-bold uppercase tracking-[0.12em] text-ink-secondary">
                  {item.label}
                </p>
              </div>
              <div className="grid gap-1 border-l border-brand-pink/70 pl-2">
                {item.children.map((child) => {
                  const ChildIcon = child.icon
                  const active = isAdminChildActive(pathname, child)
                  return (
                    <NavLink
                      key={child.to}
                      to={child.to}
                      aria-current={active ? 'page' : undefined}
                      onClick={onNavigate}
                      className={`flex min-h-10 min-w-0 items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-action-primary ${active ? 'bg-white text-action-primary shadow-sm' : 'text-ink-secondary hover:bg-white/80 hover:text-ink-primary'}`}
                    >
                      <ChildIcon aria-hidden="true" className="size-4 shrink-0" />
                      <span className="truncate">{child.label}</span>
                    </NavLink>
                  )
                })}
              </div>
            </div>
          )
        }

        const ItemIcon = item.icon
        const active =
          pathname === item.to || (item.to !== '/admin' && pathname.startsWith(`${item.to}/`))
        return (
          <NavLink
            key={item.to}
            to={item.to}
            aria-current={active ? 'page' : undefined}
            onClick={onNavigate}
            className={`flex min-h-11 min-w-0 items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-action-primary ${active ? 'bg-surface-blue text-action-primary shadow-sm' : 'text-ink-secondary hover:bg-surface-muted hover:text-ink-primary'}`}
          >
            <ItemIcon aria-hidden="true" className="size-[1.1rem] shrink-0" />
            <span className="truncate">{item.label}</span>
          </NavLink>
        )
      })}
    </nav>
  )
}

export function AdminLayout({
  title,
  description,
  hidePageHeading = false,
  children,
}: {
  title: string
  description?: string
  hidePageHeading?: boolean
  children: ReactNode
}) {
  const { logout, session } = useAuthSession()
  const location = useLocation()
  const [menuOpen, setMenuOpen] = useState(false)
  return (
    <div className="min-h-screen bg-surface-muted text-ink-primary">
      <header className="sticky top-0 z-30 border-b border-border-subtle bg-white/95 shadow-sm backdrop-blur">
        <div className="mx-auto flex min-h-16 max-w-[1600px] items-center justify-between gap-4 px-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-2">
            <Button
              size="icon"
              variant="ghost"
              className="lg:hidden"
              aria-label="Mở điều hướng quản trị"
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen(true)}
            >
              <Menu aria-hidden="true" className="size-5" />
            </Button>
            <Link
              to="/admin"
              className="flex min-w-0 items-center gap-2 font-display text-lg font-extrabold text-action-primary"
            >
              <BookOpenText aria-hidden="true" className="size-5 shrink-0" />
              <span className="truncate">PAniverseDeutsch · Admin</span>
            </Link>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <span className="hidden max-w-52 truncate text-ink-secondary sm:inline">
              {session?.profile.displayName || session?.profile.email}
            </span>
            <Link
              to="/admin/security/password"
              aria-label="Đổi mật khẩu"
              className="inline-flex min-h-10 items-center gap-2 rounded-xl px-3 font-semibold text-action-primary hover:bg-surface-blue focus-visible:outline-2 focus-visible:outline-action-focus"
            >
              <LockKeyhole aria-hidden="true" className="size-4" />
              <span className="hidden sm:inline">Đổi mật khẩu</span>
            </Link>
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
      <div className="mx-auto grid max-w-[1600px] gap-5 px-4 pt-3 pb-5 sm:px-6 sm:pt-4 lg:grid-cols-[17rem_minmax(0,1fr)] lg:gap-6 lg:pt-5 lg:pb-8">
        <aside className="hidden min-w-0 lg:sticky lg:top-[5.5rem] lg:block lg:h-[calc(100vh-7rem)]">
          <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-3xl border border-border-subtle bg-white shadow-soft">
            <div className="border-b border-border-subtle bg-gradient-to-br from-surface-blue to-white px-4 py-4">
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-action-primary">
                Bảng điều khiển
              </p>
              <p className="mt-1 text-sm text-ink-secondary">Quản lý khóa học và học viên</p>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto p-3">
              <AdminNavigation pathname={location.pathname} />
            </div>
            <div className="border-t border-border-subtle p-3">
              <div className="rounded-2xl bg-surface-lime/60 px-3 py-2.5">
                <p className="text-[0.68rem] font-bold uppercase tracking-[0.1em] text-pastel-lime-ink">
                  Đang đăng nhập
                </p>
                <p className="mt-1 truncate text-sm font-semibold text-ink-primary">
                  {session?.profile.displayName || session?.profile.email}
                </p>
              </div>
            </div>
          </div>
        </aside>
        <main className="min-w-0">
          {!hidePageHeading && (
            <div className="mb-6 flex flex-wrap items-end justify-between gap-3 border-b border-border-subtle pb-5">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.15em] text-action-primary">
                  Khu vực quản trị
                </p>
                <DecorativeHeading text={title} level={1} size="md" className="mt-1" />
                {description && (
                  <p className="mt-2 max-w-3xl text-sm leading-6 text-ink-secondary">
                    {description}
                  </p>
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
          )}
          {children}
        </main>
      </div>
      <Sheet
        open={menuOpen}
        onOpenChange={setMenuOpen}
        side="left"
        title="Điều hướng quản trị"
        description="Quản lý nội dung, học viên và đơn hàng"
      >
        <AdminNavigation pathname={location.pathname} onNavigate={() => setMenuOpen(false)} />
      </Sheet>
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
      <DropdownSelect
        value={value}
        onValueChange={onChange}
        options={options}
        disabled={disabled}
        aria-label={label}
      />
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
        <thead className="bg-brand-pink/35 text-xs uppercase tracking-wide text-ink-secondary">
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
