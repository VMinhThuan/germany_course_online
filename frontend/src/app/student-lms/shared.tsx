import { useEffect, type PropsWithChildren } from 'react'
import { ArrowLeft } from 'lucide-react'
import { DomainState } from '@/domains/shared/presentation'
import { Container, ErrorState, LinkButton, PageHeader, Skeleton } from '@/shared/ui'
import { ProductStudentLayout } from '@/app/student/pages'
import { setBrandPageTitle } from '@/config/brand'

export function ProductPage({
  title,
  eyebrow = 'Không gian học tập',
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
    setBrandPageTitle(title)
  }, [title])

  return (
    <ProductStudentLayout>
      <Container className="grid min-w-0 gap-7 py-6 sm:py-9">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <PageHeader eyebrow={eyebrow} title={title} {...(description ? { description } : {})} />
          <LinkButton to={backTo} variant="outline" className="shrink-0">
            <ArrowLeft aria-hidden="true" className="size-4" />
            Quay lại
          </LinkButton>
        </div>
        {children}
      </Container>
    </ProductStudentLayout>
  )
}

export function ProductLoading({ title = 'Đang tải dữ liệu' }: { title?: string }) {
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
      title="Chưa tải được dữ liệu"
      description="Không thể kết nối hoặc tải dữ liệu từ máy chủ. Kiểm tra kết nối rồi thử lại."
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
