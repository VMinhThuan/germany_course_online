import { useEffect, type ReactNode } from 'react'
import { ArrowLeft, ArrowRight, BookOpenText } from 'lucide-react'
import { setBrandPageTitle } from '@/config/brand'
import { useAuthSession } from '@/app/auth/auth-session'
import { PublicShell } from '@/shared/layouts/shells'
import { Card, Container, LinkButton } from '@/shared/ui'

function usePageTitle(title: string) {
  useEffect(() => setBrandPageTitle(title), [title])
}

function HelpLayout({ children }: { children: ReactNode }) {
  const { session, logout } = useAuthSession()
  return (
    <PublicShell
      showPreviewNotice={false}
      menuDescription="Thông tin học tiếng Đức"
      showRegister
      {...(session
        ? {
            authState: {
              displayName: session.profile.displayName || session.profile.email,
              role: session.role,
              onLogout: logout,
            },
          }
        : {})}
    >
      {children}
    </PublicShell>
  )
}

export function PublicNotFoundPage() {
  usePageTitle('Không tìm thấy trang')
  return (
    <HelpLayout>
      <Container className="grid min-h-[60vh] place-items-center py-12">
        <Card className="grid max-w-xl justify-items-center gap-4 p-7 text-center sm:p-10">
          <BookOpenText aria-hidden="true" className="size-10 text-action-primary" />
          <p className="text-sm font-bold uppercase tracking-[0.16em] text-action-primary">404</p>
          <h1 className="font-display text-3xl font-extrabold">Không tìm thấy trang</h1>
          <p className="leading-7 text-ink-secondary">
            Đường dẫn có thể đã thay đổi hoặc không thuộc website khóa học.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <LinkButton to="/" startIcon={<ArrowLeft aria-hidden="true" />}>
              Về trang chủ
            </LinkButton>
            <LinkButton to="/courses" variant="outline" endIcon={<ArrowRight aria-hidden="true" />}>
              Xem khóa học
            </LinkButton>
          </div>
        </Card>
      </Container>
    </HelpLayout>
  )
}

export function PublicHelpPage() {
  usePageTitle('Trợ giúp')
  return (
    <HelpLayout>
      <Container className="grid gap-8 pt-5 pb-8 sm:pt-6 sm:pb-12">
        <header className="max-w-3xl space-y-3">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-action-primary">
            HỖ TRỢ
          </p>
          <h1 className="font-display text-3xl font-extrabold tracking-tight sm:text-4xl">
            Trợ giúp và câu hỏi thường gặp
          </h1>
          <p className="text-base leading-7 text-ink-secondary">
            Thông tin về khóa học, tài khoản, quyền truy cập và chuyển khoản.
          </p>
        </header>
        <div className="grid gap-4 md:grid-cols-2">
          <article className="rounded-2xl border border-border-subtle bg-card-surface p-5">
            <h2 className="font-display text-lg font-bold">Làm sao xem nội dung học?</h2>
            <p className="mt-2 text-sm leading-6 text-ink-secondary">
              Mô tả và đề cương đã xuất bản có thể xem công khai. Bài học riêng chỉ mở khi backend
              xác nhận enrollment còn hiệu lực.
            </p>
          </article>
          <article className="rounded-2xl border border-border-subtle bg-card-surface p-5">
            <h2 className="font-display text-lg font-bold">
              Đăng ký tài khoản có tự đăng nhập không?
            </h2>
            <p className="mt-2 text-sm leading-6 text-ink-secondary">
              Không. Sau khi tạo tài khoản học viên, hãy đăng nhập bằng email và mật khẩu vừa đăng
              ký.
            </p>
          </article>
          <article className="rounded-2xl border border-border-subtle bg-card-surface p-5">
            <h2 className="font-display text-lg font-bold">Đơn chuyển khoản hoạt động thế nào?</h2>
            <p className="mt-2 text-sm leading-6 text-ink-secondary">
              Đơn ở trạng thái PENDING. Sau khi chuyển khoản, gửi thông báo trong trang đơn; Admin
              đối soát riêng trước khi duyệt và cập nhật quyền học.
            </p>
          </article>
          <article className="rounded-2xl border border-border-subtle bg-card-surface p-5">
            <h2 className="font-display text-lg font-bold">Video hoặc PDF chưa mở được?</h2>
            <p className="mt-2 text-sm leading-6 text-ink-secondary">
              Một số tệp cần nhà cung cấp lưu trữ media. Nếu dịch vụ chưa sẵn sàng, website sẽ báo
              trạng thái unavailable và không thay bằng đường dẫn giả.
            </p>
          </article>
        </div>
        <div className="flex flex-wrap gap-3">
          <LinkButton to="/courses">Xem danh mục khóa học</LinkButton>
          <LinkButton to="/login" variant="outline">
            Đăng nhập
          </LinkButton>
        </div>
      </Container>
    </HelpLayout>
  )
}
