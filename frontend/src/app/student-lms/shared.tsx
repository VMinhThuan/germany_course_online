import { useEffect, type PropsWithChildren, type ReactNode } from 'react'
import { ArrowLeft } from 'lucide-react'
import { DomainState } from '@/domains/shared/presentation'
import { DecorativeHeading } from '@/domains/shared/decorative-heading'
import { Container, ErrorState, LinkButton, PageHeader, Skeleton } from '@/shared/ui'
import { ProductStudentLayout } from '@/app/student/pages'
import { setBrandPageTitle } from '@/config/brand'

export function ProductPage({
  title,
  heading,
  eyebrow = 'Không gian học tập',
  description,
  children,
  backTo = '/student',
  wide = false,
}: PropsWithChildren<{
  title: string
  heading?: ReactNode
  eyebrow?: string
  description?: string
  backTo?: string
  wide?: boolean
}>) {
  useEffect(() => {
    setBrandPageTitle(title)
  }, [title])

  return (
    <ProductStudentLayout>
      <Container
        className={`grid min-w-0 gap-7 pt-2 pb-6 sm:pt-3 sm:pb-9 ${wide ? 'max-w-none px-0 sm:px-0 lg:px-0' : ''}`}
      >
        <div className="flex flex-wrap items-start justify-between gap-4">
          <PageHeader
            className="min-w-0 flex-1 basis-full sm:basis-auto"
            eyebrow={eyebrow}
            title={title}
            heading={heading ?? <DecorativeHeading text={title} level={1} size="md" />}
            {...(description ? { description } : {})}
          />
          <LinkButton to={backTo} variant="outline" className="ml-auto shrink-0">
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
