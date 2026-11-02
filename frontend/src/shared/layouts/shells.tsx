import {
  BookOpenText,
  ChevronLeft,
  CircleHelp,
  ClipboardList,
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
import { Container, DropdownMenu, IconButton, LinkButton, Sheet, SkipLink } from '@/shared/ui'
import { cn } from '@/shared/ui/cn'

type ShellProps = PropsWithChildren<{ className?: string }>

const publicItems = [
  { label: 'Lộ trình', href: '#dev-outline' },
  { label: 'Từ vựng', href: '#dev-vocabulary' },
  { label: 'Cách học', href: '#dev-method' },
]

function BrandMark({
  compact = false,
  to = '/',
  subtitle = 'Bản xem trước nền tảng',
}: {
  compact?: boolean
  to?: string
  subtitle?: string | undefined
}) {
  return (
    <Link to={to} className="group inline-flex min-w-0 items-center gap-2.5 rounded-lg">
      {compact && <span className="sr-only sm:hidden">Deutsch · A1.1</span>}
      <span className="relative grid size-10 shrink-0 place-items-center overflow-hidden rounded-[0.9rem] bg-brand-blue text-pastel-blue-ink">
        <BookOpenText aria-hidden="true" className="size-5" />
        <span className="absolute bottom-1 right-1 size-1.5 rounded-full bg-action-primary" />
      </span>
      <span className={cn('min-w-0', compact && 'hidden sm:block')}>
        <span className="block truncate font-display text-sm font-extrabold tracking-tight text-ink-primary">
          Deutsch · A1.1
        </span>
        <span className="block text-[0.7rem] leading-4 text-ink-secondary">{subtitle}</span>
      </span>
    </Link>
  )
}

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

type PublicNavItem = { label: string; href: string }

function PublicMenu({
  items = publicItems,
  onNavigate,
}: {
  items?: readonly PublicNavItem[]
  onNavigate?: () => void
}) {
  return (
    <nav aria-label="Điều hướng chính" className="grid gap-1 sm:flex sm:items-center sm:gap-5">
      {items.map((item) => (
        <Link
          key={item.href}
          to={item.href}
          onClick={onNavigate}
          className="flex min-h-11 items-center rounded-lg px-3 text-sm font-semibold text-ink-secondary underline-offset-4 hover:bg-surface-muted hover:text-ink-primary hover:underline sm:min-h-10 sm:px-0 sm:hover:bg-transparent"
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
  navItems = publicItems,
  brandHref = '/',
  brandSubtitle = 'Khóa học tiếng Đức trực tuyến',
  previewNotice = 'Bản demo sản phẩm · Nội dung minh họa, chưa kết nối dữ liệu thật',
  showPreviewNotice = true,
  showLogin = true,
  primaryAction = { label: 'Xem khóa học', href: '/courses' },
  footerLink = { label: 'Câu hỏi thường gặp', href: '/#faq' },
  menuDescription = 'Bản xem trước A1.1',
  authState,
}: ShellProps & {
  navItems?: readonly PublicNavItem[]
  brandHref?: string
  brandSubtitle?: string
  previewNotice?: string
  showPreviewNotice?: boolean
  showLogin?: boolean
  primaryAction?: { label: string; href: string }
  footerLink?: { label: string; href: string }
  menuDescription?: string
  authState?: { displayName: string; onLogout: () => void | Promise<void> }
}) {
  const [menuOpen, setMenuOpen] = useState(false)
  const navigate = useNavigate()
  return (
    <div className="min-h-screen bg-page-surface">
      <SkipLink />
      <header className="sticky top-0 z-header border-b border-border-subtle/80 bg-card-surface/95 backdrop-blur-sm">
        {showPreviewNotice && <PreviewNotice text={previewNotice} />}
        <Container className="flex h-[4.25rem] items-center justify-between gap-4">
          <BrandMark to={brandHref} subtitle={brandSubtitle} />
          <div className="hidden items-center gap-7 md:flex">
            <PublicMenu items={navItems} />
            {authState ? (
              <>
                <Link
                  to="/student/courses"
                  className="text-sm font-semibold text-ink-secondary underline-offset-4 hover:text-ink-primary hover:underline"
                >
                  Học của tôi
                </Link>
                <DropdownMenu
                  label={authState.displayName}
                  items={[
                    { label: 'Bảng điều khiển học viên', onSelect: () => navigate('/student') },
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
                <Link
                  to="/login"
                  className="text-sm font-semibold text-ink-secondary underline-offset-4 hover:text-ink-primary hover:underline"
                >
                  Đăng nhập
                </Link>
              )
            )}
            <LinkButton to={primaryAction.href} size="sm">
              {primaryAction.label}
            </LinkButton>
          </div>
          <div className="md:hidden">
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
        </Container>
      </header>
      <Sheet
        open={menuOpen}
        onOpenChange={setMenuOpen}
        title="Điều hướng"
        description={menuDescription}
      >
        <div className="grid gap-5">
          <PublicMenu items={navItems} onNavigate={() => setMenuOpen(false)} />
          <div className="grid gap-2 border-t border-border-subtle pt-4">
            {authState ? (
              <>
                <Link
                  to="/student/courses"
                  onClick={() => setMenuOpen(false)}
                  className="flex min-h-11 items-center px-3 font-semibold text-ink-secondary"
                >
                  Học của tôi
                </Link>
                <DropdownMenu
                  label={authState.displayName}
                  items={[
                    {
                      label: 'Bảng điều khiển học viên',
                      onSelect: () => {
                        setMenuOpen(false)
                        navigate('/student')
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
                <Link
                  to="/login"
                  onClick={() => setMenuOpen(false)}
                  className="flex min-h-11 items-center px-3 font-semibold text-ink-secondary"
                >
                  Đăng nhập
                </Link>
              )
            )}
            <LinkButton
              to={primaryAction.href}
              size="md"
              className="w-full"
              onClick={() => setMenuOpen(false)}
            >
              {primaryAction.label}
            </LinkButton>
          </div>
        </div>
      </Sheet>
      <main id="main-content" tabIndex={-1} className={cn('outline-none', className)}>
        {children}
      </main>
      <footer className="border-t border-border-subtle bg-card-surface py-8">
        <Container className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <BrandMark compact to={brandHref} subtitle={brandSubtitle} />
          <p className="text-sm text-ink-secondary">Tiếng Đức, từng bước rõ ràng.</p>
          <Link
            to={footerLink.href}
            className="inline-flex min-h-10 items-center rounded-lg text-sm font-semibold underline-offset-4 hover:underline"
          >
            {footerLink.label}
          </Link>
        </Container>
      </footer>
    </div>
  )
}

export function AuthShell({
  children,
  className,
  brandHref = '/',
  brandSubtitle = 'Khóa học tiếng Đức trực tuyến',
  backHref = '/',
  backLabel = 'Về trang chủ',
  previewNotice = 'Bản demo sản phẩm · Không gửi dữ liệu đăng nhập đến máy chủ',
  footerMessage = 'Luồng xác thực mô phỏng · Không dùng mật khẩu thật',
}: ShellProps & {
  brandHref?: string
  brandSubtitle?: string
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
          <BrandMark to={brandHref} subtitle={brandSubtitle} />
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
          <BrandMark compact />
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
  href: '/student' | '/student/courses'
  icon: LucideIcon
}

const productStudentItems: ProductStudentNavItem[] = [
  { label: 'Tổng quan', href: '/student', icon: LayoutDashboard },
  { label: 'Khóa học của tôi', href: '/student/courses', icon: GraduationCap },
]

const studentItems: StudentNavItem[] = [
  { label: 'Tổng quan', id: 'preview-dashboard', icon: LayoutDashboard },
  { label: 'Khóa học', id: 'preview-courses', icon: GraduationCap },
  { label: 'Tiến độ', id: 'preview-progress', icon: ClipboardList },
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

  return (
    <div className="min-h-screen bg-page-surface">
      <SkipLink />
      <div className="min-h-[calc(100vh-2rem)] lg:grid lg:grid-cols-[15.5rem_minmax(0,1fr)]">
        <header className="lg:col-span-2">
          <PreviewNotice
            text={
              productMode ? 'Khu vực học viên demo · Tài khoản và tiến độ được mô phỏng' : undefined
            }
          />
        </header>
        <aside className="sticky top-0 hidden h-screen flex-col border-r border-border-subtle bg-card-surface lg:flex">
          <div className="flex h-[4.75rem] items-center border-b border-border-subtle px-5">
            <BrandMark
              compact
              to={productMode ? '/student' : '/__dev/layouts/student'}
              subtitle={productMode ? 'Không gian học demo' : undefined}
            />
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
              <p className="text-xs font-bold text-pastel-lime-ink">
                {productMode ? 'Bản demo · A1.1' : 'Lernspur · A1.1'}
              </p>
              <p className="mt-1 text-xs leading-5 text-ink-secondary">
                {productMode
                  ? 'Bài học đầy đủ và thanh toán chưa được triển khai.'
                  : 'Một lối đi gọn cho bài học, ghi chú và tiến độ.'}
              </p>
            </div>
          </div>
        </aside>
        <div className="min-w-0">
          <div
            role="region"
            aria-label="Điều khiển học viên"
            className="sticky top-0 z-header flex h-[4.25rem] items-center justify-between gap-3 border-b border-border-subtle bg-card-surface/95 px-4 backdrop-blur-sm sm:px-6 lg:px-8"
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
              <p className="truncate text-sm font-semibold text-ink-secondary">
                {productMode ? `Xin chào, ${displayName}` : 'Bản xem trước học viên'}
              </p>
            </div>
            {productMode ? (
              <DropdownMenu
                label={displayName}
                items={[
                  { label: 'Bảng điều khiển', onSelect: () => navigate('/student') },
                  { label: 'Khóa học của tôi', onSelect: () => navigate('/student/courses') },
                  { label: 'Đăng xuất', onSelect: () => void onLogout?.(), destructive: true },
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
                'mx-auto w-full max-w-[88rem] px-4 py-8 outline-none sm:px-6 sm:py-10 lg:px-8',
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
        description={productMode ? 'Điều hướng học viên demo' : 'Điều hướng bản xem trước'}
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
        const active = activeHref === item.href
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
            <BrandMark compact />
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
