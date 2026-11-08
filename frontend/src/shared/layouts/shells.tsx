import {
  ChevronLeft,
  CircleHelp,
  GraduationCap,
  LayoutDashboard,
  Menu,
  NotebookPen,
  Settings2,
  ShoppingBag,
  UserRound,
  type LucideIcon,
} from 'lucide-react'
import { useState, type PropsWithChildren, type ReactNode } from 'react'
import { Link, useLocation, useNavigate } from 'react-router'
import { BrandLogo } from '@/shared/brand/BrandLogo'
import { brandConfig } from '@/config/brand'
import { Container, DropdownMenu, IconButton, LinkButton, Sheet, SkipLink } from '@/shared/ui'
import { cn } from '@/shared/ui/cn'

type ShellProps = PropsWithChildren<{ className?: string }>

type PublicNavItem = { label: string; href: string }

const publicItems: readonly PublicNavItem[] = [
  { label: 'Trang chủ', href: '/' },
  { label: 'Khóa học', href: '/courses' },
  { label: 'Giới thiệu', href: '/#course-intro' },
  { label: 'Liên hệ', href: '/#footer-contact' },
]

function PreviewNotice({
  text = 'Bản xem trước bố cục · Nội dung minh họa, chưa kết nối dữ liệu thật',
}: {
  text?: string | undefined
}) {
  return (
    <div className="border-b border-border-subtle bg-surface-blue px-4 py-1.5 text-center text-xs font-medium text-pastel-blue-ink">
      {text}
    </div>
  )
}

function PublicMenu({
  onNavigate,
  desktop = false,
}: {
  onNavigate?: () => void
  desktop?: boolean
}) {
  return (
    <nav
      aria-label="Điều hướng chính"
      className={cn('grid gap-1', desktop && 'flex items-center justify-center gap-4')}
    >
      {publicItems.map((item) => (
        <Link
          key={item.href}
          to={item.href}
          onClick={onNavigate}
          className={cn(
            'flex min-h-11 items-center rounded-lg px-3 text-base font-semibold text-ink-secondary underline-offset-4 hover:bg-surface-muted hover:text-ink-primary hover:underline',
            desktop && 'justify-center px-2 hover:bg-transparent',
          )}
        >
          {item.label}
        </Link>
      ))}
    </nav>
  )
}

export function PublicShell({
  children,
  className,
  brandHref = '/',
  previewNotice = 'PAniverseDeutsch · Học tiếng Đức theo lộ trình',
  showPreviewNotice = true,
  showLogin = true,
  showRegister = true,
  primaryAction = { label: 'Xem khóa học', href: '/courses' },
  footerLink = { label: 'Câu hỏi thường gặp', href: '/#faq' },
  footerNavItems,
  footerCopyright,
  footerContent,
  menuDescription = 'Khám phá lộ trình học tiếng Đức',
  authState,
}: ShellProps & {
  brandHref?: string
  previewNotice?: string
  showPreviewNotice?: boolean
  showLogin?: boolean
  showRegister?: boolean
  primaryAction?: { label: string; href: string }
  footerLink?: { label: string; href: string }
  footerNavItems?: readonly PublicNavItem[]
  footerCopyright?: string
  footerContent?: ReactNode
  menuDescription?: string
  authState?: {
    displayName: string
    role?: 'STUDENT' | 'ADMIN'
    onLogout: () => void | Promise<void>
  }
}) {
  const [menuOpen, setMenuOpen] = useState(false)
  const navigate = useNavigate()
  return (
    <div className="flex min-h-screen flex-col bg-page-surface">
      <SkipLink />
      <header className="sticky top-0 z-header border-b border-border-subtle/80 bg-card-surface/95 backdrop-blur-sm">
        {showPreviewNotice && <PreviewNotice text={previewNotice} />}
        <div className="grid h-[4.25rem] w-full grid-cols-[minmax(max-content,1fr)_auto_minmax(max-content,1fr)] items-center gap-4 px-5 sm:px-8 lg:px-10 xl:px-12">
          <Link
            to={brandHref}
            aria-label={brandConfig.name}
            className="inline-flex min-h-11 items-center justify-self-start rounded-lg font-display text-lg font-extrabold tracking-tight text-action-primary hover:text-action-primary-hover sm:text-xl"
          >
            {brandConfig.name}
          </Link>
          <div className="hidden justify-self-center xl:block">
            <PublicMenu desktop />
          </div>
          <div className="hidden items-center justify-self-end gap-4 xl:flex">
            {authState ? (
              <>
                {authState.role === 'ADMIN' ? (
                  <Link
                    to="/admin"
                    className="text-base font-semibold text-ink-secondary underline-offset-4 hover:text-ink-primary hover:underline"
                  >
                    Khu vực quản trị
                  </Link>
                ) : (
                  <LinkButton to="/student/courses" size="md">
                    Khóa học của tôi
                  </LinkButton>
                )}
                <DropdownMenu
                  label={authState.displayName}
                  items={[
                    {
                      label:
                        authState.role === 'ADMIN'
                          ? 'Bảng điều khiển quản trị'
                          : 'Bảng điều khiển học viên',
                      onSelect: () => navigate(authState.role === 'ADMIN' ? '/admin' : '/student'),
                    },
                    {
                      label: 'Đăng xuất',
                      onSelect: () => void authState.onLogout(),
                      destructive: true,
                    },
                  ]}
                />
              </>
            ) : (
              showLogin && (
                <>
                  <Link
                    to="/login"
                    className="text-base font-semibold text-ink-secondary underline-offset-4 hover:text-ink-primary hover:underline"
                  >
                    Đăng nhập
                  </Link>
                  {showRegister && (
                    <Link
                      to="/register"
                      className="text-base font-semibold text-ink-secondary underline-offset-4 hover:text-ink-primary hover:underline"
                    >
                      Tạo tài khoản
                    </Link>
                  )}
                </>
              )
            )}
          </div>
          <div className={cn('col-start-3 justify-self-end', 'xl:hidden')}>
            <IconButton
              label={menuOpen ? 'Đóng điều hướng chính' : 'Mở điều hướng chính'}
              icon={
                menuOpen ? (
                  <span aria-hidden="true" className="text-lg leading-none">
                    ×
                  </span>
                ) : (
                  <Menu aria-hidden="true" />
                )
              }
              variant="ghost"
              onClick={() => setMenuOpen(true)}
              aria-expanded={menuOpen}
              aria-haspopup="dialog"
            />
          </div>
        </div>
      </header>
      <Sheet
        open={menuOpen}
        onOpenChange={setMenuOpen}
        title="Điều hướng"
        description={menuDescription}
      >
        <div className="grid gap-5">
          <PublicMenu onNavigate={() => setMenuOpen(false)} />
          <div className="grid gap-2 border-t border-border-subtle pt-4">
            {authState ? (
              <>
                {authState.role === 'ADMIN' ? (
                  <Link
                    to="/admin"
                    onClick={() => setMenuOpen(false)}
                    className="flex min-h-11 items-center px-3 font-semibold text-ink-secondary"
                  >
                    Khu vực quản trị
                  </Link>
                ) : (
                  <LinkButton
                    to="/student/courses"
                    size="md"
                    className="w-full"
                    onClick={() => setMenuOpen(false)}
                  >
                    Khóa học của tôi
                  </LinkButton>
                )}
                <DropdownMenu
                  label={authState.displayName}
                  items={[
                    {
                      label:
                        authState.role === 'ADMIN'
                          ? 'Bảng điều khiển quản trị'
                          : 'Bảng điều khiển học viên',
                      onSelect: () => {
                        setMenuOpen(false)
                        navigate(authState.role === 'ADMIN' ? '/admin' : '/student')
                      },
                    },
                    {
                      label: 'Đăng xuất',
                      onSelect: () => void authState.onLogout(),
                      destructive: true,
                    },
                  ]}
                />
              </>
            ) : (
              showLogin && (
                <>
                  <Link
                    to="/login"
                    onClick={() => setMenuOpen(false)}
                    className="flex min-h-11 items-center px-3 font-semibold text-ink-secondary"
                  >
                    Đăng nhập
                  </Link>
                  {showRegister && (
                    <Link
                      to="/register"
                      onClick={() => setMenuOpen(false)}
                      className="flex min-h-11 items-center px-3 font-semibold text-ink-secondary"
                    >
                      Tạo tài khoản
                    </Link>
                  )}
                </>
              )
            )}
          </div>
        </div>
      </Sheet>
      <main id="main-content" tabIndex={-1} className={cn('flex-1 outline-none', className)}>
        {children}
      </main>
      {footerContent ?? (
        <footer className="border-t border-border-subtle bg-card-surface py-8 sm:py-10">
          {footerNavItems ? (
            <>
              <Container className="grid gap-6 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
                <div>
                  <BrandLogo to={brandHref} />
                  <p className="mt-3 max-w-sm text-sm leading-6 text-ink-secondary">
                    Làm quen với {brandConfig.courseName} qua lộ trình và bài học mẫu.
                  </p>
                </div>
                <div className="grid gap-4 sm:justify-items-end">
                  <nav
                    aria-label="Điều hướng cuối trang"
                    className="flex flex-wrap gap-x-5 gap-y-2"
                  >
                    {footerNavItems.map((item) => (
                      <Link
                        key={item.href}
                        to={item.href}
                        className="inline-flex min-h-10 items-center rounded-sm text-sm font-semibold text-ink-secondary underline-offset-4 hover:text-ink-primary hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-action-focus"
                      >
                        {item.label}
                      </Link>
                    ))}
                    <Link
                      to={authState ? '/student/courses' : '/login'}
                      className="inline-flex min-h-10 items-center rounded-sm text-sm font-semibold text-ink-secondary underline-offset-4 hover:text-ink-primary hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-action-focus"
                    >
                      {authState ? 'Khu vực học viên' : 'Đăng nhập'}
                    </Link>
                  </nav>
                  <LinkButton to={primaryAction.href} size="sm">
                    {primaryAction.label}
                  </LinkButton>
                </div>
              </Container>
              {footerCopyright && (
                <Container className="mt-6 border-t border-border-subtle pt-4 text-xs text-ink-muted">
                  {footerCopyright}
                </Container>
              )}
            </>
          ) : (
            <Container className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <BrandLogo to={brandHref} />
              <p className="text-sm text-ink-secondary">{brandConfig.tagline}.</p>
              <Link
                to={footerLink.href}
                className="inline-flex min-h-10 items-center rounded-lg text-sm font-semibold underline-offset-4 hover:underline"
              >
                {footerLink.label}
              </Link>
            </Container>
          )}
        </footer>
      )}
    </div>
  )
}

export function AuthShell({
  children,
  className,
  brandHref = '/',
  backHref = '/',
  backLabel = 'Về trang chủ',
  previewNotice = 'Kết nối bảo mật tới PAniverseDeutsch',
  footerMessage = 'Thông tin được gửi trực tiếp tới máy chủ xác thực.',
}: ShellProps & {
  brandHref?: string
  backHref?: string
  backLabel?: string
  previewNotice?: string
  footerMessage?: string
}) {
  return (
    <div className="min-h-screen bg-page-surface">
      <SkipLink />
      <header>
        <PreviewNotice text={previewNotice} />
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-4 py-5 sm:px-6">
          <BrandLogo to={brandHref} />
          <Link
            to={backHref}
            className="inline-flex min-h-11 items-center gap-2 rounded-lg px-3 text-sm font-semibold text-ink-secondary hover:bg-surface-muted hover:text-ink-primary"
          >
            <ChevronLeft aria-hidden="true" className="size-4" />
            {backLabel}
          </Link>
        </div>
      </header>
      <main
        id="main-content"
        tabIndex={-1}
        className="grid min-h-[calc(100svh-6.5rem)] place-items-center px-4 pb-12 outline-none sm:px-6"
      >
        <div className={cn('w-full max-w-md', className)}>{children}</div>
      </main>
      <footer className="pb-5 text-center text-xs text-ink-muted">{footerMessage}</footer>
    </div>
  )
}

export function CheckoutShell({
  children,
  summary,
  className,
}: ShellProps & { summary?: ReactNode }) {
  return (
    <div className="min-h-screen bg-page-surface">
      <SkipLink />
      <header className="border-b border-border-subtle bg-card-surface">
        <PreviewNotice />
        <Container className="flex h-16 items-center justify-between gap-4">
          <Link
            to="/__dev/layouts/public"
            className="inline-flex min-h-11 items-center gap-2 rounded-lg px-2 font-semibold text-ink-secondary hover:bg-surface-muted"
          >
            <ChevronLeft aria-hidden="true" className="size-4" />
            Quay lại
          </Link>
          <BrandLogo compact />
        </Container>
      </header>
      <main
        id="main-content"
        tabIndex={-1}
        className="mx-auto grid w-full max-w-6xl gap-6 px-4 py-8 outline-none sm:px-6 sm:py-12 lg:grid-cols-[minmax(0,1fr)_minmax(17rem,22rem)] lg:gap-10 lg:px-8"
      >
        <div className={cn('min-w-0', className)}>{children}</div>
        {summary && (
          <aside
            aria-label="Tóm tắt đơn hàng"
            className="min-w-0 lg:sticky lg:top-24 lg:self-start"
          >
            {summary}
          </aside>
        )}
      </main>
    </div>
  )
}

type StudentNavItem = { label: string; id: string; icon: LucideIcon }
type ProductStudentNavItem = {
  label: string
  href: '/student' | '/student/courses' | '/student/orders' | '/student/profile'
  icon: LucideIcon
}

const productStudentItems: ProductStudentNavItem[] = [
  { label: 'Tổng quan', href: '/student', icon: LayoutDashboard },
  { label: 'Khóa học của tôi', href: '/student/courses', icon: GraduationCap },
  { label: 'Đơn hàng', href: '/student/orders', icon: ShoppingBag },
  { label: 'Tài khoản', href: '/student/profile', icon: UserRound },
]

const studentItems: StudentNavItem[] = [
  { label: 'Tổng quan', id: 'preview-dashboard', icon: LayoutDashboard },
  { label: 'Khóa học', id: 'preview-courses', icon: GraduationCap },
  { label: 'Đơn hàng', id: 'preview-orders', icon: ShoppingBag },
  { label: 'Tài khoản', id: 'preview-account', icon: UserRound },
]

function StudentNavigation({
  active,
  onSelect,
  className,
}: {
  active: string
  onSelect: (id: string) => void
  className?: string
}) {
  return (
    <nav aria-label="Khu vực học viên" className={cn('grid gap-1', className)}>
      {studentItems.map((item) => {
        const Icon = item.icon
        return (
          <a
            key={item.id}
            href={`#${item.id}`}
            aria-current={active === item.id ? 'location' : undefined}
            onClick={() => onSelect(item.id)}
            className={cn(
              'flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-semibold text-ink-secondary transition-colors hover:bg-surface-muted hover:text-ink-primary',
              active === item.id && 'bg-surface-blue text-pastel-blue-ink hover:bg-surface-blue',
            )}
          >
            <Icon aria-hidden="true" className="size-[1.125rem] shrink-0" />
            {item.label}
          </a>
        )
      })}
    </nav>
  )
}

export function StudentShell({
  children,
  className,
  productMode = false,
  displayName = 'Học viên mẫu',
  onLogout,
}: ShellProps & {
  productMode?: boolean
  displayName?: string
  onLogout?: () => void | Promise<void>
}) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [active, setActive] = useState('preview-dashboard')
  const location = useLocation()
  const navigate = useNavigate()
  const currentRoute = location.pathname
  const isLessonWorkspace = productMode && currentRoute.startsWith('/learn/lessons/')

  return (
    <div className="min-h-screen bg-page-surface">
      <SkipLink />
      <div className="min-h-screen lg:grid lg:grid-cols-[15.5rem_minmax(0,1fr)]">
        <aside
          aria-label="Điều hướng học viên chính"
          className="sticky top-0 hidden h-screen flex-col border-r border-border-subtle bg-card-surface lg:flex"
        >
          <div className="flex h-16 items-center border-b border-border-subtle px-5">
            <BrandLogo compact to={productMode ? '/student' : '/__dev/layouts/student'} />
          </div>
          <div className="flex-1 overflow-y-auto px-3 py-6">
            <p className="mb-3 px-3 text-[0.68rem] font-bold uppercase tracking-[0.14em] text-ink-muted">
              Không gian học
            </p>
            {productMode ? (
              <ProductStudentNavigation
                activeHref={currentRoute}
                onNavigate={() => setMenuOpen(false)}
              />
            ) : (
              <StudentNavigation active={active} onSelect={setActive} />
            )}
          </div>
          <div className="border-t border-border-subtle p-4">
            <div className="rounded-xl bg-surface-lime p-3">
              <p className="text-xs font-bold text-pastel-lime-ink">{brandConfig.name}</p>
              {!productMode && (
                <p className="mt-1 text-xs leading-5 text-ink-secondary">
                  Một lối đi gọn cho bài học, ghi chú và tiến độ.
                </p>
              )}
            </div>
          </div>
        </aside>
        <div className="min-w-0">
          <div
            role="region"
            aria-label="Điều khiển học viên"
            className="sticky top-0 z-header flex h-16 items-center justify-between gap-3 border-b border-border-subtle bg-card-surface/95 px-4 backdrop-blur-sm sm:px-6 lg:px-8"
          >
            <div className="flex min-w-0 items-center gap-3">
              <div className="lg:hidden">
                <IconButton
                  label="Mở điều hướng học viên"
                  icon={<Menu aria-hidden="true" />}
                  variant="ghost"
                  onClick={() => setMenuOpen(true)}
                  aria-haspopup="dialog"
                />
              </div>
              {productMode ? (
                <p className="flex min-w-0 items-baseline gap-1 text-sm text-ink-secondary sm:text-base">
                  <span className="shrink-0">Xin chào,</span>
                  <span className="truncate font-bold text-ink-primary">{displayName}</span>
                </p>
              ) : (
                <p className="truncate text-sm font-semibold text-ink-secondary">
                  Bản xem trước học viên
                </p>
              )}
            </div>
            {productMode ? (
              <DropdownMenu
                label="Tài khoản"
                items={[
                  { label: 'Bảng điều khiển', onSelect: () => navigate('/student') },
                  { label: 'Khóa học của tôi', onSelect: () => navigate('/student/courses') },
                  { label: 'Đơn hàng', onSelect: () => navigate('/student/orders') },
                  { label: 'Tài khoản', onSelect: () => navigate('/student/profile') },
                  { label: 'Trợ giúp', onSelect: () => navigate('/help') },
                  {
                    label: 'Đăng xuất',
                    onSelect: () =>
                      void Promise.resolve(onLogout?.()).then(() =>
                        navigate(`/login?returnTo=${encodeURIComponent(currentRoute)}`),
                      ),
                    destructive: true,
                  },
                ]}
              />
            ) : (
              <DropdownMenu
                label="Học viên mẫu"
                items={[
                  {
                    label: 'Xem tài khoản',
                    onSelect: () => {
                      window.location.hash = '#preview-account'
                    },
                  },
                  {
                    label: 'Xem trợ giúp',
                    onSelect: () => {
                      window.location.hash = '#preview-help'
                    },
                  },
                ]}
              />
            )}
          </div>
          <div className="min-w-0">
            <main
              id="main-content"
              tabIndex={-1}
              data-layout-route={currentRoute}
              className={cn(
                'mx-auto w-full max-w-[88rem] px-4 pt-3 pb-8 outline-none sm:px-6 sm:pt-4 sm:pb-10 lg:px-8 lg:pt-5 lg:pb-12',
                isLessonWorkspace && 'max-w-none lg:px-5',
                className,
              )}
            >
              {children}
            </main>
          </div>
        </div>
      </div>
      <Sheet
        open={menuOpen}
        onOpenChange={setMenuOpen}
        side="left"
        title="Khu vực học viên"
        description={productMode ? 'Điều hướng học viên' : 'Điều hướng bản xem trước'}
      >
        {productMode ? (
          <ProductStudentNavigation
            activeHref={currentRoute}
            onNavigate={() => setMenuOpen(false)}
          />
        ) : (
          <StudentNavigation
            active={active}
            onSelect={(id) => {
              setActive(id)
              setMenuOpen(false)
            }}
          />
        )}
      </Sheet>
    </div>
  )
}

function ProductStudentNavigation({
  activeHref,
  onNavigate,
  className,
}: {
  activeHref: string
  onNavigate?: () => void
  className?: string
}) {
  return (
    <nav aria-label="Khu vực học viên" className={cn('grid gap-1', className)}>
      {productStudentItems.map((item) => {
        const Icon = item.icon
        const active =
          activeHref === item.href ||
          (item.href === '/student/orders' && activeHref.startsWith('/student/orders/')) ||
          (item.href === '/student/profile' && activeHref.startsWith('/student/security/'))
        return (
          <Link
            key={item.href}
            to={item.href}
            onClick={onNavigate}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-semibold text-ink-secondary transition-colors hover:bg-surface-muted hover:text-ink-primary',
              active && 'bg-surface-blue text-pastel-blue-ink hover:bg-surface-blue',
            )}
          >
            <Icon aria-hidden="true" className="size-[1.125rem] shrink-0" />
            {item.label}
          </Link>
        )
      })}
    </nav>
  )
}

const learningItems = [
  { label: 'Chương: Chào hỏi', id: 'learning-greeting' },
  { label: 'Bài: Guten Tag!', id: 'learning-guten-tag' },
  { label: 'Bài tập: Nghe và chọn', id: 'learning-exercise' },
]

export function LearningShell({ children, className }: ShellProps) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [active, setActive] = useState(learningItems[0]?.id ?? '')
  return (
    <div className="min-h-screen bg-page-surface">
      <SkipLink />
      <header className="sticky top-0 z-header border-b border-border-subtle bg-card-surface/95 backdrop-blur-sm">
        <PreviewNotice />
        <div className="flex h-[4.25rem] items-center justify-between gap-3 px-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <div className="lg:hidden">
              <IconButton
                label="Mở mục lục khóa học"
                icon={<Menu aria-hidden="true" />}
                variant="ghost"
                onClick={() => setMenuOpen(true)}
                aria-haspopup="dialog"
              />
            </div>
            <Link
              to="/__dev/layouts/student"
              className="inline-flex min-h-10 items-center gap-2 rounded-lg px-2 text-sm font-semibold text-ink-secondary hover:bg-surface-muted"
            >
              <ChevronLeft aria-hidden="true" className="size-4" />
              <span className="hidden sm:inline">Khóa học</span>
            </Link>
            <span aria-hidden="true" className="h-5 w-px bg-border-subtle" />
            <BrandLogo compact />
          </div>
          <div className="hidden items-center gap-3 sm:flex">
            <span className="text-xs text-ink-secondary">Lộ trình demo</span>
            <span className="size-2 rounded-full bg-brand-lime ring-4 ring-surface-lime" />
          </div>
        </div>
      </header>
      <div className="mx-auto grid min-h-[calc(100vh-6.25rem)] max-w-[90rem] lg:grid-cols-[18rem_minmax(0,1fr)]">
        <aside className="hidden border-r border-border-subtle bg-card-surface px-4 py-7 lg:block">
          <div className="mb-6 space-y-2 px-3">
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-action-primary">
              A1.1 · Alltag
            </p>
            <h2 className="font-display text-lg font-bold">Bắt đầu giao tiếp</h2>
            <p className="text-sm leading-5 text-ink-secondary">Chương và bài học mẫu</p>
          </div>
          <LearningNavigation active={active} onSelect={setActive} />
        </aside>
        <main
          id="main-content"
          tabIndex={-1}
          className={cn('min-w-0 px-4 py-8 outline-none sm:px-6 lg:px-10 lg:py-12', className)}
        >
          {children}
        </main>
      </div>
      <Sheet
        open={menuOpen}
        onOpenChange={setMenuOpen}
        side="left"
        title="Mục lục khóa học"
        description="A1.1 · Bắt đầu giao tiếp"
      >
        <LearningNavigation
          active={active}
          onSelect={(id) => {
            setActive(id)
            setMenuOpen(false)
          }}
        />
      </Sheet>
    </div>
  )
}

function LearningNavigation({
  active,
  onSelect,
}: {
  active: string
  onSelect: (id: string) => void
}) {
  return (
    <nav aria-label="Mục lục khóa học" className="grid gap-1">
      {learningItems.map((item, index) => (
        <a
          key={item.id}
          href={`#${item.id}`}
          aria-current={active === item.id ? 'location' : undefined}
          onClick={() => onSelect(item.id)}
          className={cn(
            'flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm text-ink-secondary transition-colors hover:bg-surface-muted hover:text-ink-primary',
            active === item.id &&
              'bg-surface-blue font-semibold text-pastel-blue-ink hover:bg-surface-blue',
          )}
        >
          <span
            aria-hidden="true"
            className={cn(
              'grid size-6 shrink-0 place-items-center rounded-full border border-border-subtle text-xs font-bold',
              active === item.id && 'border-action-primary bg-action-primary text-white',
            )}
          >
            {index + 1}
          </span>
          <span className="min-w-0 truncate">{item.label}</span>
        </a>
      ))}
    </nav>
  )
}

export function LayoutPreviewIntro({
  title,
  detail,
  headingLevel = 'h1',
}: {
  title: string
  detail: string
  headingLevel?: 'h1' | 'h2'
}) {
  const Title = headingLevel
  return (
    <div className="mb-8 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-border-subtle bg-card-surface px-4 py-3 shadow-soft sm:px-5">
      <div className="flex min-w-0 items-center gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-brand-lime text-pastel-lime-ink">
          <NotebookPen aria-hidden="true" className="size-5" />
        </span>
        <div className="min-w-0">
          <Title className="font-display text-sm font-semibold text-ink-primary">{title}</Title>
          <p className="truncate text-sm text-ink-secondary">{detail}</p>
        </div>
      </div>
      <Link
        to="/__dev/ui-kit#layouts"
        className="inline-flex min-h-10 shrink-0 items-center gap-2 rounded-lg px-2 text-sm font-semibold text-action-primary hover:bg-surface-muted"
      >
        <CircleHelp aria-hidden="true" className="size-4" />
        UI kit
      </Link>
    </div>
  )
}

export function ShellPlaceholder({ children, title }: { title: string; children?: ReactNode }) {
  return (
    <section className="space-y-4 rounded-2xl border border-dashed border-border-strong bg-card-surface/60 p-5 sm:p-7">
      <div className="flex items-start gap-3">
        <span className="mt-1 grid size-7 shrink-0 place-items-center rounded-full bg-surface-lime text-pastel-lime-ink">
          <Settings2 aria-hidden="true" className="size-4" />
        </span>
        <div className="min-w-0 space-y-1">
          <h2 className="font-display text-lg font-bold">{title}</h2>
          <p className="text-sm leading-6 text-ink-secondary">
            Vùng nội dung minh họa để kiểm tra bố cục. Chưa có nghiệp vụ hoặc dữ liệu thật.
          </p>
        </div>
      </div>
      {children}
    </section>
  )
}

export function CheckoutSummaryPlaceholder({ children }: PropsWithChildren) {
  return (
    <div className="rounded-card border border-border-subtle bg-card-surface p-5 shadow-soft sm:p-6">
      <div className="mb-4 flex items-center gap-2">
        <ShoppingBag aria-hidden="true" className="size-5 text-action-primary" />
        <h2 className="font-display text-lg font-bold">Tóm tắt mẫu</h2>
      </div>
      {children}
    </div>
  )
}
