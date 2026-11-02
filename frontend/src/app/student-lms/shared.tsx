import { useEffect, type PropsWithChildren } from 'react'
import { ArrowLeft } from 'lucide-react'
import { Link } from 'react-router'
import { DomainState } from '@/domains/shared/presentation'
import { Container, ErrorState, LinkButton, PageHeader, Skeleton } from '@/shared/ui'
import { ProductStudentLayout } from '@/app/student/pages'

export function ProductPage({
  title,
  eyebrow = 'Không gian học demo',
  description,
  children,
  backTo = '/student',
}: PropsWithChildren<{
  title: string
  eyebrow?: string
  description?: string
  backTo?: string
}>) {
  useEffect(() => {
    document.title = `${title} · Deutsch A1.1`
  }, [title])

  return (
    <ProductStudentLayout>
      <Container className="grid min-w-0 gap-7 py-6 sm:py-9">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <PageHeader eyebrow={eyebrow} title={title} {...(description ? { description } : {})} />
          <Link
            to={backTo}
            className="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-lg px-3 font-semibold text-ink-secondary hover:bg-surface-muted"
          >
            <ArrowLeft aria-hidden="true" className="size-4" />
            Quay lại
          </Link>
        </div>
        {children}
      </Container>
    </ProductStudentLayout>
  )
}

export function ProductLoading({ title = 'Đang tải dữ liệu demo' }: { title?: string }) {
  return (
    <div className="grid gap-4" role="status" aria-live="polite" aria-label={title}>
      <Skeleton className="h-24 w-full" />
      <Skeleton className="h-56 w-full" />
    </div>
  )
}

export function ProductError({ onRetry }: { onRetry: () => void }) {
  return (
    <ErrorState
      title="Chưa tải được dữ liệu demo"
      description="Dịch vụ dữ liệu mô phỏng đang gặp sự cố. Thử tải lại để tiếp tục."
      onRetry={onRetry}
    />
  )
}

export function ProductNotFound({ message }: { message: string }) {
  return (
    <DomainState kind="empty" title="Không tìm thấy nội dung" message={message}>
      <LinkButton to="/student/courses" variant="outline">
        Về khóa học của tôi
      </LinkButton>
    </DomainState>
  )
}
