import { CheckCircle2, Clock3, CreditCard, RotateCcw, TriangleAlert } from 'lucide-react'
import { useId, useState, type ReactNode } from 'react'
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  FormField,
  InlineAlert,
  TextInput,
} from '@/shared/ui'
import { formatDateTimeInTimezone, formatVnd } from '@/shared/lib/format'
import type { EnrollmentSummaryViewModel } from '@/domains/enrollment/models'
import type {
  CouponValidationViewModel,
  OrderSummaryViewModel,
  RenewalPlanViewModel,
} from './models'

export function PricingCard({
  title,
  priceVnd,
  durationMonths,
  description,
  selected = false,
  onSelect,
}: {
  title: string
  priceVnd: string
  durationMonths: number
  description?: string
  selected?: boolean
  onSelect?: () => void
}) {
  return (
    <Card
      className={`grid gap-4 p-5 ${selected ? 'border-action-primary ring-2 ring-action-primary/20' : ''}`}
    >
      <div>
        <h3 className="font-display text-lg font-bold">{title}</h3>
        {description && <p className="mt-1 text-sm leading-6 text-ink-secondary">{description}</p>}
      </div>
      <p className="font-display text-3xl font-extrabold tabular-nums">{formatVnd(priceVnd)}</p>
      <p className="text-sm text-ink-secondary">Thời hạn {durationMonths} tháng</p>
      {onSelect && (
        <Button variant={selected ? 'secondary' : 'outline'} onClick={onSelect}>
          {selected ? 'Đã chọn' : 'Chọn gói này'}
        </Button>
      )}
    </Card>
  )
}

export function PriceSummary({
  items,
  discountVnd,
  totalVnd,
}: {
  items: readonly { label: string; amountVnd: string }[]
  discountVnd?: string
  totalVnd: string
}) {
  return (
    <dl className="grid gap-3">
      {items.map((item) => (
        <div key={item.label} className="flex justify-between gap-4 text-sm">
          <dt className="text-ink-secondary">{item.label}</dt>
          <dd className="font-medium tabular-nums">{formatVnd(item.amountVnd)}</dd>
        </div>
      ))}
      {discountVnd && (
        <div className="flex justify-between gap-4 border-t border-border-subtle pt-3 text-sm">
          <dt className="text-ink-secondary">Ưu đãi</dt>
          <dd className="font-medium tabular-nums text-success-foreground">
            −{formatVnd(discountVnd)}
          </dd>
        </div>
      )}
      <div className="flex justify-between gap-4 border-t border-border-subtle pt-3 font-bold">
        <dt>Tổng cộng</dt>
        <dd className="font-display text-lg tabular-nums">{formatVnd(totalVnd)}</dd>
      </div>
    </dl>
  )
}

export function EnrollmentStatusCard({
  enrollment,
  onRenew,
}: {
  enrollment: EnrollmentSummaryViewModel
  onRenew?: () => void
}) {
  const expired = enrollment.accessState === 'expired-display'
  const revoked = enrollment.accessState === 'revoked' || enrollment.status === 'REVOKED'
  return (
    <Card className="grid gap-3 p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm text-ink-secondary">Quyền truy cập khóa học</p>
          <h2 className="mt-1 font-display text-lg font-bold">{enrollment.courseTitle}</h2>
        </div>
        <Badge tone={revoked ? 'danger' : expired ? 'warning' : 'success'}>
          {revoked ? 'Đã thu hồi' : expired ? 'Đã hết hạn' : 'Đang hoạt động'}
        </Badge>
      </div>
      <p className="text-sm text-ink-secondary">
        Hạn truy cập: {formatDateTimeInTimezone(enrollment.expiresAt)}
      </p>
      {expired && onRenew && (
        <Button variant="outline" onClick={onRenew}>
          Xem lựa chọn gia hạn
        </Button>
      )}
    </Card>
  )
}

export function RenewalPlanCard({
  plan,
  selected = false,
  onSelect,
}: {
  plan: RenewalPlanViewModel
  selected?: boolean
  onSelect?: () => void
}) {
  return (
    <PricingCard
      title={plan.title}
      priceVnd={plan.priceVnd}
      durationMonths={plan.durationMonths}
      selected={selected}
      {...(plan.status === 'ACTIVE' && onSelect ? { onSelect } : {})}
    />
  )
}

export function CouponField({
  onValidate,
  onResult,
  onCodeChange,
}: {
  onValidate: (code: string) => Promise<CouponValidationViewModel>
  onResult?: (result: CouponValidationViewModel) => void
  onCodeChange?: (code: string) => void
}) {
  const fieldId = `coupon-code-${useId().replaceAll(':', '')}`
  const [code, setCode] = useState('')
  const [pending, setPending] = useState(false)
  const [result, setResult] = useState<CouponValidationViewModel>()
  const [error, setError] = useState<string>()
  async function validate() {
    if (!code.trim() || pending) return
    setPending(true)
    setError(undefined)
    try {
      const next = await onValidate(code.trim())
      setResult(next)
      onResult?.(next)
    } catch {
      setError('Không thể kiểm tra mã ưu đãi lúc này. Hãy thử lại.')
    } finally {
      setPending(false)
    }
  }
  return (
    <div className="grid gap-2">
      <FormField id={fieldId} label="Mã ưu đãi">
        {(describedBy, invalid) => (
          <div className="flex flex-col gap-2 sm:flex-row">
            <TextInput
              id={fieldId}
              value={code}
              onChange={(event) => {
                setCode(event.target.value)
                setResult(undefined)
                onCodeChange?.(event.target.value)
              }}
              autoComplete="off"
              aria-invalid={invalid || undefined}
              aria-describedby={describedBy}
              placeholder="Nhập mã ưu đãi"
            />
            <Button
              loading={pending}
              disabled={!code.trim()}
              variant="outline"
              onClick={() => void validate()}
            >
              Kiểm tra mã
            </Button>
          </div>
        )}
      </FormField>
      {result && (
        <p
          role="status"
          className={`text-sm ${result.kind === 'valid' ? 'text-success-foreground' : 'text-danger-foreground'}`}
        >
          {result.message}
        </p>
      )}
      {error && (
        <InlineAlert tone="danger" title={error}>
          Kiểm tra kết nối rồi thử lại.
        </InlineAlert>
      )}
    </div>
  )
}

export function OrderSummary({ order }: { order: OrderSummaryViewModel }) {
  const statusLabel =
    order.status === 'PENDING'
      ? 'Đang chờ thanh toán'
      : order.status === 'PAID'
        ? 'Đã thanh toán'
        : order.status === 'FAILED'
          ? 'Thanh toán thất bại'
          : order.status === 'CANCELLED'
            ? 'Đã hủy'
            : 'Đã hết hạn'
  const tone =
    order.status === 'PAID' ? 'success' : order.status === 'PENDING' ? 'warning' : 'danger'
  return (
    <Card className="grid gap-4 p-5">
      <CardHeader className="p-0">
        <p className="text-sm text-ink-secondary">Đơn hàng {order.orderCode}</p>
        <h2 className="font-display text-lg font-semibold tracking-tight">{order.itemTitle}</h2>
      </CardHeader>
      <CardContent className="grid gap-3 p-0">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Badge tone={tone}>{statusLabel}</Badge>
          <span className="font-display text-xl font-bold tabular-nums">
            {formatVnd(order.amountVnd)}
          </span>
        </div>
        <p className="text-sm text-ink-secondary">
          Tạo lúc {formatDateTimeInTimezone(order.createdAt)}
        </p>
        <p className="text-xs text-ink-muted">Trạng thái giao dịch: {order.paymentStatus}</p>
      </CardContent>
    </Card>
  )
}

export function CheckoutInformationPanel({ children }: { children: ReactNode }) {
  return (
    <section className="grid gap-3 rounded-2xl border border-border-subtle bg-card-surface p-5">
      <h2 className="flex items-center gap-2 font-display text-lg font-bold">
        <CreditCard aria-hidden="true" className="size-5 text-action-primary" />
        Thông tin thanh toán
      </h2>
      <p className="text-sm leading-6 text-ink-secondary">
        Đơn hàng chỉ cập nhật sau khi hệ thống xác nhận trạng thái thanh toán.
      </p>
      {children}
    </section>
  )
}

export function PaymentStatusPanel({
  order,
  canOpenCourse = false,
  onOpenCourse,
}: {
  order: OrderSummaryViewModel
  canOpenCourse?: boolean
  onOpenCourse?: () => void
}) {
  if (order.status === 'PENDING' || order.paymentStatus === 'PENDING')
    return <PaymentPendingState order={order} />
  if (order.status !== 'PAID' || order.paymentStatus !== 'SUCCESS')
    return <PaymentFailureState order={order} />
  return (
    <PaymentSuccessState
      order={order}
      canOpenCourse={canOpenCourse}
      {...(onOpenCourse ? { onOpenCourse } : {})}
    />
  )
}

export function PaymentPendingState({ order }: { order: OrderSummaryViewModel }) {
  return (
    <Card
      role="status"
      className="grid gap-3 border-warning-foreground/20 bg-warning-surface/40 p-5"
    >
      <h2 className="flex items-center gap-2 font-display text-xl font-bold">
        <Clock3 aria-hidden="true" className="size-5 text-warning-foreground" />
        Đang chờ xác nhận thanh toán
      </h2>
      <p className="text-sm leading-6 text-ink-secondary">
        Đơn {order.orderCode} đang được xử lý. Quyền truy cập khóa học chưa được cấp.
      </p>
    </Card>
  )
}

export function PaymentFailureState({
  order,
  onRetry,
}: {
  order: OrderSummaryViewModel
  onRetry?: () => void
}) {
  return (
    <Card role="status" className="grid gap-3 border-danger-foreground/20 bg-danger-surface/40 p-5">
      <h2 className="flex items-center gap-2 font-display text-xl font-bold">
        <TriangleAlert aria-hidden="true" className="size-5 text-danger-foreground" />
        Chưa hoàn tất thanh toán
      </h2>
      <p className="text-sm leading-6 text-ink-secondary">
        Đơn {order.orderCode} chưa được xác nhận thành công.
      </p>
      {onRetry && (
        <Button variant="outline" onClick={onRetry} startIcon={<RotateCcw aria-hidden="true" />}>
          Xem lại đơn hàng
        </Button>
      )}
    </Card>
  )
}

export function PaymentSuccessState({
  order,
  canOpenCourse,
  onOpenCourse,
}: {
  order: OrderSummaryViewModel
  canOpenCourse: boolean
  onOpenCourse?: () => void
}) {
  return (
    <Card
      role="status"
      className="grid gap-3 border-success-foreground/20 bg-success-surface/50 p-5"
    >
      <h2 className="flex items-center gap-2 font-display text-xl font-bold">
        <CheckCircle2 aria-hidden="true" className="size-5 text-success-foreground" />
        Thanh toán đã được xác nhận
      </h2>
      <p className="text-sm leading-6 text-ink-secondary">
        Đơn {order.orderCode} · {formatVnd(order.amountVnd)}
      </p>
      {canOpenCourse && onOpenCourse && <Button onClick={onOpenCourse}>Mở khóa học</Button>}
    </Card>
  )
}

export function OrderHistoryItem({ order, href }: { order: OrderSummaryViewModel; href?: string }) {
  return (
    <li className="flex flex-col gap-3 rounded-xl border border-border-subtle p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <p className="font-semibold">{order.itemTitle}</p>
        <p className="mt-1 text-xs text-ink-secondary">
          {order.orderCode} · {formatDateTimeInTimezone(order.createdAt)}
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <p className="font-semibold tabular-nums">{formatVnd(order.amountVnd)}</p>
        {href && (
          <a
            href={href}
            className="inline-flex min-h-11 items-center rounded-lg px-2 font-semibold text-action-primary underline-offset-4 hover:underline"
          >
            Chi tiết
          </a>
        )}
      </div>
    </li>
  )
}
