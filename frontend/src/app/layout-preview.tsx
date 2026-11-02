import { useParams } from 'react-router'
import {
  LayoutPreviewIntro,
  AuthShell,
  CheckoutShell,
  CheckoutSummaryPlaceholder,
  LearningShell,
  PublicShell,
  ShellPlaceholder,
  StudentShell,
} from '@/shared/layouts/shells'
import { Badge, Card, LearningPath, LearningPathStep, Progress } from '@/shared/ui'

const layouts = {
  public: { title: 'Public shell', detail: 'Khung trang giới thiệu và điều hướng công khai' },
  auth: { title: 'Auth shell', detail: 'Khung căn giữa cho biểu mẫu xác thực' },
  checkout: { title: 'Checkout shell', detail: 'Khung nội dung và vùng tóm tắt cạnh nhau' },
  student: { title: 'Student shell', detail: 'Khung không gian học viên có điều hướng bên' },
  learning: { title: 'Learning shell', detail: 'Khung bài học với mục lục và vùng nội dung' },
} as const

type LayoutKey = keyof typeof layouts

function PreviewContent({ layout }: { layout: LayoutKey }) {
  if (layout === 'public') {
    return (
      <PublicShell
        navItems={[
          { label: 'Lộ trình', href: '#dev-outline' },
          { label: 'Từ vựng', href: '#dev-vocabulary' },
          { label: 'Cách học', href: '#dev-method' },
          { label: 'Bắt đầu xem', href: '/__dev/layouts/learning' },
        ]}
      >
        <div className="mx-auto grid w-full max-w-6xl gap-12 px-4 py-12 sm:px-6 sm:py-20 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:gap-16 lg:px-8">
          <div className="space-y-6">
            <Badge tone="info">Bố cục công khai · mẫu</Badge>
            <h1 className="max-w-xl text-4xl font-extrabold tracking-tight sm:text-5xl">
              Một lộ trình học tiếng Đức rõ ràng, từng bước.
            </h1>
            <p className="max-w-xl text-lg leading-8 text-ink-secondary">
              Vùng này dùng để kiểm tra nhịp điệu tiêu đề, đoạn giới thiệu và nút hành động ở nhiều
              kích thước màn hình.
            </p>
            <div className="flex flex-wrap gap-3">
              <a
                href="#dev-outline"
                className="inline-flex min-h-11 items-center rounded-control bg-action-primary px-5 font-semibold text-white hover:bg-action-primary-hover"
              >
                Xem cấu trúc mẫu
              </a>
              <a
                href="#dev-method"
                className="inline-flex min-h-11 items-center rounded-control border border-border-strong bg-card-surface px-5 font-semibold text-ink-primary hover:bg-surface-muted"
              >
                Cách bố trí
              </a>
            </div>
            <p className="text-sm text-ink-muted">
              Nội dung chỉ phục vụ xem trước giao diện; không đại diện nội dung khóa học.
            </p>
          </div>
          <Card className="overflow-hidden bg-surface-blue p-5 sm:p-8">
            <div className="mb-7 flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-bold uppercase tracking-[0.14em] text-action-primary">
                  Lernspur · A1.1
                </p>
                <h2 className="mt-2 text-2xl font-bold">Một đường học mẫu</h2>
              </div>
              <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-brand-lime text-pastel-lime-ink">
                01
              </span>
            </div>
            <LearningPath>
              <LearningPathStep title="Hallo!" detail="Lời chào đầu tiên" done />
              <LearningPathStep title="Guten Tag!" detail="Chọn lời chào theo ngữ cảnh" active />
              <LearningPathStep title="Wie heißt du?" detail="Luyện hội thoại ngắn" />
            </LearningPath>
          </Card>
        </div>
        <section
          id="dev-outline"
          className="border-y border-border-subtle bg-card-surface py-12 sm:py-16"
        >
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <h2 className="text-2xl font-bold">Lộ trình xem trước</h2>
            <p className="mt-2 max-w-2xl text-ink-secondary">
              Các khối nội dung mẫu giúp kiểm tra độ rộng, căn chỉnh và khoảng trắng của trang công
              khai.
            </p>
          </div>
        </section>
        <section id="dev-vocabulary" className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
          <h2 className="mb-4 text-2xl font-bold">Thẻ nội dung</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <Card className="p-5">
              <p className="text-sm text-ink-muted">Từ mẫu</p>
              <p className="mt-1 text-2xl font-bold">der Morgen</p>
              <p className="text-ink-secondary">buổi sáng</p>
            </Card>
            <Card className="p-5">
              <p className="text-sm text-ink-muted">Câu mẫu</p>
              <p className="mt-1 text-xl font-semibold">Guten Morgen!</p>
              <p className="text-ink-secondary">Chào buổi sáng!</p>
            </Card>
          </div>
        </section>
        <section id="dev-method" className="bg-surface-lime py-12">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <h2 className="text-2xl font-bold">Cách trình bày nội dung</h2>
            <p className="mt-2 max-w-2xl text-ink-secondary">
              Dải màu pastel làm nền cho nhóm nội dung; chữ luôn dùng màu mực có độ tương phản cao.
            </p>
          </div>
        </section>
      </PublicShell>
    )
  }

  if (layout === 'auth') {
    return (
      <AuthShell>
        <LayoutPreviewIntro {...layouts.auth} />
        <ShellPlaceholder title="Vùng biểu mẫu xác thực">
          <Card className="mt-4 p-5">
            <p className="text-sm text-ink-secondary">
              Kiểm tra căn giữa, chiều rộng tối đa và khoảng cách quanh biểu mẫu.
            </p>
            <div className="mt-5 grid gap-3">
              <div
                className="h-11 rounded-control border border-border-subtle bg-card-surface"
                aria-hidden="true"
              />
              <div
                className="h-11 rounded-control border border-border-subtle bg-card-surface"
                aria-hidden="true"
              />
              <div className="h-11 rounded-control bg-action-primary" aria-hidden="true" />
            </div>
          </Card>
        </ShellPlaceholder>
      </AuthShell>
    )
  }

  if (layout === 'checkout') {
    return (
      <CheckoutShell
        summary={
          <CheckoutSummaryPlaceholder>
            <p className="text-sm text-ink-secondary">
              Vùng tóm tắt nội dung mẫu. Chưa có giá, đơn hàng hoặc quy tắc thanh toán.
            </p>
            <div className="mt-4 h-24 rounded-xl bg-surface-muted" aria-hidden="true" />
          </CheckoutSummaryPlaceholder>
        }
      >
        <LayoutPreviewIntro {...layouts.checkout} />
        <ShellPlaceholder title="Vùng nội dung chính">
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div
              className="h-12 rounded-control border border-border-subtle bg-card-surface"
              aria-hidden="true"
            />
            <div
              className="h-12 rounded-control border border-border-subtle bg-card-surface"
              aria-hidden="true"
            />
          </div>
          <div
            className="mt-4 h-12 rounded-control bg-action-primary sm:max-w-48"
            aria-hidden="true"
          />
        </ShellPlaceholder>
      </CheckoutShell>
    )
  }

  if (layout === 'student') {
    return (
      <StudentShell>
        <LayoutPreviewIntro {...layouts.student} />
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1.2fr)_minmax(18rem,0.8fr)]">
          <ShellPlaceholder title="Vùng tổng quan">
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <div className="h-24 rounded-xl bg-surface-blue" />
              <div className="h-24 rounded-xl bg-surface-lime" />
              <div className="h-24 rounded-xl bg-surface-muted" />
            </div>
          </ShellPlaceholder>
          <Card className="p-5">
            <h2 className="font-display text-lg font-bold">Tiến độ mẫu</h2>
            <p className="mt-1 text-sm text-ink-secondary">
              Thành phần tiến độ trong vùng nội dung phụ
            </p>
            <Progress value={42} label="Tiến độ xem trước" className="mt-5" />
          </Card>
        </div>
        <div className="mt-5 grid gap-5 md:grid-cols-2">
          <ShellPlaceholder title="Vùng nội dung học" />
          <ShellPlaceholder title="Vùng thông tin phụ" />
        </div>
      </StudentShell>
    )
  }

  return (
    <LearningShell>
      <LayoutPreviewIntro {...layouts.learning} headingLevel="h2" />
      <div className="mx-auto max-w-3xl space-y-5">
        <Card className="p-5 sm:p-8">
          <Badge tone="success">Bài học · mẫu</Badge>
          <h1 id="learning-greeting" className="mt-4 text-3xl font-extrabold">
            Guten Tag!
          </h1>
          <p id="learning-guten-tag" className="mt-3 text-lg leading-8 text-ink-secondary">
            Vùng nội dung chính cho văn bản, âm thanh hoặc hình ảnh trong tương lai.
          </p>
          <div
            className="mt-7 aspect-video rounded-2xl border border-dashed border-border-strong bg-surface-muted"
            role="img"
            aria-label="Vùng media mẫu chưa có nội dung"
          />
        </Card>
        <Card id="learning-exercise" className="p-5 sm:p-7">
          <h2 className="text-xl font-bold">Vùng tương tác bài học</h2>
          <p className="mt-2 text-ink-secondary">
            Bố trí cho bài tập được hiển thị dưới nội dung chính.
          </p>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <div className="h-12 rounded-control border border-border-subtle bg-card-surface" />
            <div className="h-12 rounded-control border border-border-subtle bg-card-surface" />
          </div>
        </Card>
      </div>
    </LearningShell>
  )
}

export function LayoutPreviewPage() {
  const { layout } = useParams()
  const key = layout && layout in layouts ? (layout as LayoutKey) : 'public'
  return <PreviewContent layout={key} />
}
