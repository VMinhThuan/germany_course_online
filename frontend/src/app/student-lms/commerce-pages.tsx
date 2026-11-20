import { useEffect, useState, type FormEvent } from 'react'
import {
  ArrowRight,
  Check,
  CheckCircle2,
  CircleAlert,
  Copy,
  CreditCard,
  Download,
  QrCode,
  RefreshCw,
  XCircle,
} from 'lucide-react'
import { Link, useLocation, useNavigate, useParams } from 'react-router'
import { useAuthSession } from '@/app/auth/auth-session'
import {
  useCancelStudentOrder,
  useConfirmTransfer,
  useCreateOrder,
  useProductCheckout,
  useProductCourse,
  useProductOrder,
  useProductOrders,
  useProductRenewalPlans,
  useValidateStudentCoupon,
} from '@/data/student-demo/product-queries'
import type { CouponValidationViewModel } from '@/domains/commerce/models'
import { AccessStatePanel, EnrollmentStatusCard } from '@/domains'
import { DomainState } from '@/domains/shared/presentation'
import { ApiError } from '@/lib/api/client'
import { useDialogs } from '@/shared/ui/dialogs'
import {
  Badge,
  Button,
  Card,
  ErrorState,
  FormField,
  InlineAlert,
  LinkButton,
  Pagination,
  SectionHeader,
  TextInput,
  useNotifications,
} from '@/shared/ui'
import { formatDateTimeInTimezone, formatVnd } from '@/shared/lib/format'
import { ProductError, ProductLoading, ProductNotFound, ProductPage } from './shared'

function checkoutContext(courseId: string, orderType: 'PURCHASE' | 'RENEWAL') {
  return `${orderType}:${courseId}`
}

function DiscountSummary({
  baseAmount,
  discountAmount,
  couponDiscountAmount,
  automaticDiscountAmount,
  totalAmount,
}: {
  baseAmount: string
  discountAmount: string
  couponDiscountAmount?: string
  automaticDiscountAmount?: string
  totalAmount: string
}) {
  const hasDiscount = BigInt(discountAmount) > 0n

  return (
    <dl className="grid gap-2 text-sm">
      <div className="flex items-center justify-between gap-3">
        <dt className="text-ink-secondary">Giá gốc</dt>
        <dd className="font-semibold tabular-nums">{formatVnd(baseAmount)}</dd>
      </div>
      {couponDiscountAmount && BigInt(couponDiscountAmount) > 0n && (
        <div className="flex items-center justify-between gap-3 text-success-foreground">
          <dt>Giảm từ mã ưu đãi</dt>
          <dd className="tabular-nums">−{formatVnd(couponDiscountAmount)}</dd>
        </div>
      )}
      {automaticDiscountAmount && BigInt(automaticDiscountAmount) > 0n && (
        <div className="flex items-center justify-between gap-3 text-success-foreground">
          <dt>Ưu đãi tự động</dt>
          <dd className="tabular-nums">−{formatVnd(automaticDiscountAmount)}</dd>
        </div>
      )}
      {hasDiscount && (
        <div className="flex items-center justify-between gap-3 text-success-foreground">
          <dt>Ưu đãi</dt>
          <dd className="tabular-nums">−{formatVnd(discountAmount)}</dd>
        </div>
      )}
      <div className="mt-3 flex items-end justify-between gap-3 rounded-2xl border border-action-primary/15 bg-surface-blue p-4">
        <dt className="font-bold text-ink-primary">Tổng thanh toán</dt>
        <dd className="text-right font-display text-2xl font-extrabold tabular-nums text-action-primary sm:text-3xl">
          {formatVnd(totalAmount)}
        </dd>
      </div>
    </dl>
  )
}

export function CheckoutPage() {
  const { orderContext = '' } = useParams()
  const { session } = useAuthSession()
  const location = useLocation()
  const navigate = useNavigate()
  const params = new URLSearchParams(location.search)
  const orderType = params.get('type') === 'RENEWAL' ? 'RENEWAL' : 'PURCHASE'
  const context = checkoutContext(orderContext, orderType)
  const planId = params.get('plan') ?? undefined
  const [couponCode, setCouponCode] = useState('')
  const [acceptedCoupon, setAcceptedCoupon] = useState<string>()
  const [couponResult, setCouponResult] = useState<CouponValidationViewModel>()
  const quote = useProductCheckout(session?.id ?? '', context, planId, acceptedCoupon)
  const orders = useProductOrders(session?.id ?? '')
  const validateCoupon = useValidateStudentCoupon(session?.id ?? '')
  const createOrder = useCreateOrder(session?.id ?? '')
  const pendingOrder = orders.data?.items.find(
    (item) =>
      item.courseId === orderContext &&
      item.order.orderType === orderType &&
      item.order.status === 'PENDING',
  )
  const duplicatePendingOrder =
    quote.error instanceof ApiError &&
    ['PENDING_PURCHASE_EXISTS', 'PENDING_RENEWAL_EXISTS'].includes(quote.error.code)

  async function applyCoupon(event: FormEvent) {
    event.preventDefault()
    setCouponResult(undefined)
    if (!couponCode.trim()) {
      setAcceptedCoupon(undefined)
      return
    }
    try {
      const result = await validateCoupon.mutateAsync({
        context,
        code: couponCode.trim(),
        ...(planId ? { planId } : {}),
      })
      setCouponResult(result)
      setAcceptedCoupon(result.kind === 'valid' ? result.code : undefined)
    } catch (error) {
      setCouponResult({
        kind: 'invalid',
        code: couponCode.trim().toUpperCase(),
        message: error instanceof Error ? error.message : 'Không xác minh được mã.',
      })
      setAcceptedCoupon(undefined)
    }
  }
  async function submitOrder() {
    if (!quote.data) return
    try {
      const order = await createOrder.mutateAsync({
        context,
        ...(acceptedCoupon ? { couponCode: acceptedCoupon } : {}),
        ...(planId ? { planId } : {}),
      })
      navigate(`/orders/${order.order.id}/pending`)
    } catch {
      /* API error is shown below. */
    }
  }

  return (
    <ProductPage
      title={orderType === 'PURCHASE' ? 'Mua khóa học' : 'Gia hạn khóa học'}
      eyebrow=""
      heading={
        <h1 className="font-display text-3xl font-extrabold tracking-tight text-ink-primary sm:text-4xl">
          {orderType === 'PURCHASE' ? 'Mua khóa học' : 'Gia hạn khóa học'}
        </h1>
      }
      description={
        orderType === 'PURCHASE'
          ? 'Xác nhận thông tin khóa học và tạo đơn đăng ký để nhận hướng dẫn thanh toán.'
          : 'Kiểm tra gói gia hạn và tạo đơn để tiếp tục quyền truy cập khóa học.'
      }
      backTo={orderType === 'RENEWAL' ? `/student/courses/${orderContext}/renew` : '/courses'}
    >
      {quote.isPending ? (
        <ProductLoading title="Đang chuẩn bị thông tin đăng ký" />
      ) : quote.isError ? (
        duplicatePendingOrder ? (
          <ErrorState
            title="Bạn đã có đơn đang chờ thanh toán"
            description="Khóa học này đã có một đơn đang chờ xử lý. Mở đơn hiện tại để tiếp tục thanh toán hoặc hủy đơn trước khi tạo đơn mới."
            action={
              pendingOrder ? (
                <LinkButton to={`/orders/${pendingOrder.order.id}/pending`} variant="outline">
                  Mở đơn đang chờ
                </LinkButton>
              ) : (
                <LinkButton to="/student/orders" variant="outline">
                  Xem đơn hàng
                </LinkButton>
              )
            }
          />
        ) : (
          <ProductError onRetry={() => void quote.refetch()} />
        )
      ) : !quote.data ? (
        <ProductNotFound message="Không tìm thấy thông tin đăng ký cho khóa học này." />
      ) : (
        <div className="mx-auto grid w-full max-w-6xl gap-5 lg:grid-cols-[minmax(0,1fr)_23rem] lg:items-start">
          <div className="grid content-start gap-5">
            <Card className="overflow-hidden border-brand-pink/60 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-brand-pink/40 bg-gradient-to-r from-brand-pink/45 via-card-surface to-brand-blue/30 px-5 py-4 sm:px-6">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.14em] text-action-primary">
                    Khóa học đã chọn
                  </p>
                  <h2 className="mt-1 font-display text-2xl font-extrabold text-ink-primary">
                    {quote.data.courseTitle}
                  </h2>
                </div>
                <Badge tone={quote.data.orderType === 'PURCHASE' ? 'brand' : 'info'}>
                  {quote.data.orderType === 'PURCHASE' ? 'Đăng ký mới' : 'Gia hạn'}
                </Badge>
              </div>
              <div className="grid gap-4 p-5 sm:p-6">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-xl bg-surface-muted px-4 py-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-ink-secondary">
                      Thời hạn truy cập
                    </p>
                    <p className="mt-1 font-semibold text-ink-primary">
                      {quote.data.durationMonths} tháng
                    </p>
                  </div>
                  {quote.data.plan && (
                    <div className="rounded-xl bg-surface-muted px-4 py-3">
                      <p className="text-xs font-semibold uppercase tracking-wide text-ink-secondary">
                        Gói đã chọn
                      </p>
                      <p className="mt-1 font-semibold text-ink-primary">{quote.data.plan.title}</p>
                    </div>
                  )}
                </div>
                {quote.data.currentExpiry && (
                  <p className="text-sm text-ink-secondary">
                    Hạn hiện tại:{' '}
                    <span className="font-semibold">
                      {formatDateTimeInTimezone(quote.data.currentExpiry)}
                    </span>
                  </p>
                )}
                <p className="text-sm leading-6 text-ink-secondary">
                  Sau khi tạo đơn, bạn sẽ nhận hướng dẫn chuyển khoản. Quyền học được mở sau khi
                  thanh toán được xác nhận.
                </p>
              </div>
            </Card>
            <Card className="grid gap-4 p-5 sm:p-6">
              <SectionHeader title="Mã ưu đãi" description="Bạn có thể nhập mã để nhận ưu đãi." />
              <form
                className="flex flex-col gap-3 sm:flex-row"
                onSubmit={(event) => void applyCoupon(event)}
              >
                <FormField id="checkout-coupon-code" label="Mã ưu đãi" className="min-w-0 flex-1">
                  {(describedBy, invalid) => (
                    <TextInput
                      id="checkout-coupon-code"
                      value={couponCode}
                      onChange={(event) => {
                        setCouponCode(event.target.value)
                        setAcceptedCoupon(undefined)
                        setCouponResult(undefined)
                      }}
                      autoComplete="off"
                      aria-invalid={invalid || undefined}
                      aria-describedby={describedBy}
                    />
                  )}
                </FormField>
                <Button
                  type="submit"
                  variant="outline"
                  loading={validateCoupon.isPending}
                  className="self-end"
                >
                  Áp dụng
                </Button>
              </form>
              {couponResult && (
                <p
                  role={couponResult.kind === 'valid' ? 'status' : 'alert'}
                  className={`rounded-xl p-3 text-sm ${couponResult.kind === 'valid' ? 'bg-success-surface text-success-foreground' : 'bg-danger-surface text-danger-foreground'}`}
                >
                  {couponResult.message}
                </p>
              )}
            </Card>
          </div>
          <aside className="grid content-start gap-4 lg:sticky lg:top-6">
            <Card className="overflow-hidden border-action-primary/25 shadow-md">
              <div className="border-b border-action-primary/15 bg-surface-blue/60 px-5 py-4 sm:px-6">
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-action-primary">
                  Tóm tắt thanh toán
                </p>
                <h2 className="mt-1 font-display text-xl font-extrabold">Chi phí khóa học</h2>
              </div>
              <div className="grid gap-4 p-5 sm:p-6">
                <DiscountSummary
                  baseAmount={quote.data.originalAmountVnd}
                  discountAmount={quote.data.discountAmountVnd}
                  {...(quote.data.couponDiscountAmountVnd !== undefined
                    ? { couponDiscountAmount: quote.data.couponDiscountAmountVnd }
                    : {})}
                  {...(quote.data.automaticDiscountAmountVnd !== undefined
                    ? { automaticDiscountAmount: quote.data.automaticDiscountAmountVnd }
                    : {})}
                  totalAmount={quote.data.totalAmountVnd}
                />
                <Button
                  className="w-full"
                  loading={createOrder.isPending}
                  disabled={createOrder.isPending}
                  onClick={() => void submitOrder()}
                  startIcon={<CreditCard aria-hidden="true" className="size-4" />}
                >
                  {orderType === 'PURCHASE' ? 'Tiếp tục thanh toán' : 'Tiếp tục gia hạn'}
                </Button>
                {createOrder.isError && (
                  <ErrorState
                    title="Chưa tạo được đơn"
                    description={
                      createOrder.error instanceof Error
                        ? createOrder.error.message
                        : 'Chưa thể tạo đăng ký lúc này.'
                    }
                    onRetry={() => void submitOrder()}
                  />
                )}
                <p className="text-center text-xs leading-5 text-ink-muted">
                  Bạn chỉ được cấp quyền học sau khi thanh toán được xác nhận.
                </p>
              </div>
            </Card>
          </aside>
        </div>
      )}
    </ProductPage>
  )
}

function OrderState({ order }: { order: NonNullable<ReturnType<typeof useProductOrder>['data']> }) {
  const status = order.order.status
  const reported = order.transferReported
  if (status === 'PAID')
    return (
      <InlineAlert tone="success" title="Thanh toán thành công" role="status">
        <span className="inline-flex items-center gap-2">
          <CheckCircle2 aria-hidden="true" className="size-4" />
          Khóa học đã sẵn sàng. Bạn có thể bắt đầu học ngay.
        </span>
      </InlineAlert>
    )
  if (
    status === 'CANCELLED' ||
    status === 'REJECTED' ||
    status === 'FAILED' ||
    status === 'EXPIRED'
  )
    return (
      <InlineAlert
        tone="danger"
        title={
          status === 'REJECTED'
            ? 'Thanh toán cần được kiểm tra lại'
            : status === 'CANCELLED'
              ? 'Đơn hàng đã hủy'
              : status === 'FAILED'
                ? 'Thanh toán chưa hoàn tất'
                : 'Đơn hàng đã hết hạn'
        }
        role="status"
      >
        <span className="inline-flex items-center gap-2">
          <XCircle aria-hidden="true" className="size-4" />
          <span>
            {status === 'REJECTED'
              ? 'Giao dịch chưa được xác nhận. Bạn có thể kiểm tra thông tin và gửi lại xác nhận thanh toán.'
              : 'Bạn có thể tạo một đơn hàng mới để tiếp tục.'}
            {order.order.rejectionReason ? ` Lý do: ${order.order.rejectionReason}` : ''}
          </span>
        </span>
      </InlineAlert>
    )
  return (
    <InlineAlert
      tone="warning"
      title={reported ? 'Đã nhận xác nhận thanh toán' : 'Chờ bạn hoàn tất thanh toán'}
      role="status"
    >
      <span className="inline-flex items-center gap-2">
        <CircleAlert aria-hidden="true" className="size-4" />
        {reported
          ? 'Chúng tôi đang kiểm tra giao dịch. Khóa học sẽ được mở ngay sau khi thanh toán được xác nhận.'
          : 'Vui lòng chuyển khoản theo hướng dẫn, sau đó xác nhận để chúng tôi kiểm tra giao dịch.'}
      </span>
    </InlineAlert>
  )
}

function formatRemaining(milliseconds: number) {
  const totalSeconds = Math.max(0, Math.floor(milliseconds / 1000))
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
}

function CopyButton({ value, label }: { value: string; label: string }) {
  const notifications = useNotifications()
  const [copied, setCopied] = useState(false)
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className="min-h-8 shrink-0 px-2"
      aria-label={`Sao chép ${label}`}
      onClick={() => {
        if (!navigator.clipboard) {
          notifications.error(`Không thể sao chép ${label}`)
          return
        }
        void navigator.clipboard
          .writeText(value)
          .then(() => {
            setCopied(true)
            notifications.success(`Đã sao chép ${label}`)
            window.setTimeout(() => setCopied(false), 1500)
          })
          .catch(() => notifications.error(`Không thể sao chép ${label}`))
      }}
    >
      {copied ? (
        <Check aria-hidden="true" className="size-4" />
      ) : (
        <Copy aria-hidden="true" className="size-4" />
      )}
      <span className="sr-only">{copied ? 'Đã sao chép' : 'Sao chép'}</span>
    </Button>
  )
}

function PaymentInstructions({
  order,
}: {
  order: NonNullable<ReturnType<typeof useProductOrder>['data']>
}) {
  const instructions = order.paymentInstructions
  const expiresAt = order.order.expiresAt
  const [now, setNow] = useState(() => Date.now())
  const [qrFailed, setQrFailed] = useState(false)
  const [qrRetry, setQrRetry] = useState(0)
  useEffect(() => {
    if (order.transferReported || !expiresAt) return
    const timer = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(timer)
  }, [expiresAt, order.transferReported])
  const remaining = expiresAt ? new Date(expiresAt).getTime() - now : null
  if (!instructions)
    return (
      <Card className="grid gap-2 border-dashed p-5">
        <h2 className="font-display text-lg font-bold">Thông tin thanh toán chưa sẵn sàng</h2>
        <p className="text-sm leading-6 text-ink-secondary">
          Hiện chưa có thông tin chuyển khoản. Vui lòng thử lại sau hoặc liên hệ hỗ trợ để được
          hướng dẫn.
        </p>
        <p className="text-sm">
          Mã đơn: <strong>{order.order.orderCode}</strong>
        </p>
        <p className="text-sm">
          Số tiền theo đơn: <strong>{formatVnd(order.totalAmountVnd)}</strong>
        </p>
      </Card>
    )
  return (
    <Card className="grid gap-4 p-5">
      <div className="flex items-center gap-2">
        <QrCode aria-hidden="true" className="size-5 text-action-primary" />
        <h2 className="font-display text-lg font-bold">Hướng dẫn chuyển khoản</h2>
      </div>
      {expiresAt && !order.transferReported && remaining !== null && remaining > 0 && (
        <InlineAlert tone="warning" title="Thời gian giữ đơn còn lại">
          <span className="font-mono text-lg font-bold">{formatRemaining(remaining)}</span>
        </InlineAlert>
      )}
      {order.transferReported && (
        <InlineAlert tone="info" title="Đang kiểm tra thanh toán">
          Chúng tôi đã nhận được xác nhận của bạn. Thời gian giữ đơn được tạm dừng trong lúc kiểm
          tra giao dịch.
        </InlineAlert>
      )}
      {expiresAt && !order.transferReported && remaining !== null && remaining <= 0 && (
        <InlineAlert tone="danger" title="Đơn đã hết hạn">
          Hãy tạo đơn mới để nhận mã QR và mã chuyển khoản mới.
        </InlineAlert>
      )}
      <div className="grid gap-5 md:grid-cols-[minmax(16rem,0.8fr)_minmax(0,1.2fr)] md:items-start">
        <div className="grid justify-items-center gap-3">
          {instructions.qrUrl && !qrFailed && (
            <img
              key={`${instructions.qrUrl}-${qrRetry}`}
              src={instructions.qrUrl}
              alt="Mã QR VietQR cho đơn hàng"
              className="max-h-72 w-full max-w-sm rounded-control border border-border-subtle object-contain"
              loading="lazy"
              onError={() => setQrFailed(true)}
            />
          )}
          {instructions.qrUrl && qrFailed && (
            <InlineAlert tone="danger" title="Không tải được mã QR">
              Bạn vẫn có thể chuyển khoản thủ công theo thông tin bên dưới.
              <div className="mt-2">
                <Button
                  variant="outline"
                  size="sm"
                  startIcon={<RefreshCw aria-hidden="true" className="size-4" />}
                  onClick={() => {
                    setQrFailed(false)
                    setQrRetry((value) => value + 1)
                  }}
                >
                  Thử tải lại QR
                </Button>
              </div>
            </InlineAlert>
          )}
          {instructions.qrUrl && (
            <a
              href={instructions.qrUrl}
              download={`vietqr-${order.order.orderCode}.png`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 text-sm font-semibold text-action-primary hover:underline"
            >
              <Download aria-hidden="true" className="size-4" /> Tải ảnh QR
            </a>
          )}
        </div>
        <div className="grid gap-4">
          <dl className="grid gap-2 text-sm">
            <div className="flex justify-between gap-3">
              <dt>Ngân hàng</dt>
              <dd className="text-right font-semibold">{instructions.bankName}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt>Số tài khoản</dt>
              <dd className="flex items-center justify-end gap-1 text-right font-semibold">
                {instructions.accountNumber}
                <CopyButton value={instructions.accountNumber} label="số tài khoản" />
              </dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt>Chủ tài khoản</dt>
              <dd className="text-right font-semibold">{instructions.accountHolderName}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt>Số tiền</dt>
              <dd className="flex items-center justify-end gap-1 text-right font-extrabold text-action-primary">
                {formatVnd(order.totalAmountVnd)}
                <CopyButton value={order.totalAmountVnd} label="số tiền" />
              </dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt>Nội dung</dt>
              <dd className="flex items-center justify-end gap-1 text-right font-mono font-bold">
                {order.order.orderCode}
                <CopyButton value={order.order.orderCode} label="mã đơn" />
              </dd>
            </div>
          </dl>
          <p className="whitespace-pre-line rounded-xl bg-surface-muted p-3 text-sm leading-6 text-ink-secondary">
            {instructions.transferInstructions}
          </p>
          <p className="text-xs leading-5 text-ink-muted">
            QR là ảnh tĩnh. Hãy kiểm tra số tiền và mã đơn ở trên trước khi chuyển khoản.
          </p>
        </div>
      </div>
    </Card>
  )
}

export function OrderPendingPage() {
  const { id = '' } = useParams()
  const { session } = useAuthSession()
  const dialogs = useDialogs()
  const order = useProductOrder(session?.id ?? '', id)
  const confirmTransfer = useConfirmTransfer(session?.id ?? '')
  const cancelOrder = useCancelStudentOrder(session?.id ?? '')
  const navigate = useNavigate()
  const showPendingActions =
    order.data?.order.status === 'PENDING' || order.data?.order.status === 'REJECTED'
  const canCancelOrder = order.data?.order.status === 'PENDING' && !order.data.transferReported
  return (
    <ProductPage title="Thanh toán chuyển khoản" backTo="/student/orders">
      {order.isPending ? (
        <ProductLoading title="Đang tải hướng dẫn đơn hàng" />
      ) : order.isError ? (
        <ProductError onRetry={() => void order.refetch()} />
      ) : !order.data ? (
        <ProductNotFound message="Không tìm thấy đơn hàng thuộc tài khoản hiện tại." />
      ) : (
        <div className="mx-auto grid w-full max-w-6xl gap-5">
          <Card className="flex flex-wrap items-center justify-between gap-3 p-5">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-action-primary">
                Mã đơn
              </p>
              <h2 className="mt-1 font-mono text-xl font-bold">{order.data.order.orderCode}</h2>
            </div>
            <div className="text-right">
              <p className="text-sm text-ink-secondary">Số tiền</p>
              <p className="font-display text-xl font-extrabold">
                {formatVnd(order.data.totalAmountVnd)}
              </p>
            </div>
          </Card>
          <OrderState order={order.data} />
          {showPendingActions && (
            <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(20rem,0.55fr)] lg:items-start">
              <PaymentInstructions order={order.data} />
              <Card className="grid gap-4 p-5 sm:p-6 lg:sticky lg:top-6">
                <h2 className="font-display text-lg font-bold">Bạn đã chuyển khoản?</h2>
                <p className="text-sm leading-6 text-ink-secondary">
                  Hãy xác nhận sau khi chuyển khoản thành công để chúng tôi kiểm tra và kích hoạt
                  khóa học cho bạn.
                </p>
                <div className="grid gap-3">
                  <Button
                    className="w-full min-w-0 px-3 text-sm sm:px-4 sm:text-base"
                    loading={confirmTransfer.isPending}
                    disabled={
                      confirmTransfer.isPending ||
                      (order.data.transferReported && order.data.order.status === 'PENDING')
                    }
                    onClick={() =>
                      void confirmTransfer
                        .mutateAsync(id)
                        .then(() => order.refetch())
                        .catch(() => undefined)
                    }
                  >
                    {order.data.order.status === 'REJECTED'
                      ? 'Gửi lại báo chuyển khoản'
                      : order.data.transferReported
                        ? 'Đã gửi báo chuyển khoản'
                        : 'Tôi đã chuyển khoản'}
                  </Button>
                  <div className={`grid gap-3 ${canCancelOrder ? 'sm:grid-cols-2' : ''}`}>
                    <LinkButton
                      to={`/student/orders/${id}`}
                      variant="outline"
                      className="w-full min-w-0 px-3 text-sm sm:text-base"
                    >
                      Chi tiết đơn hàng
                    </LinkButton>
                    {canCancelOrder && (
                      <Button
                        className="w-full min-w-0 px-3 text-sm sm:text-base"
                        variant="outline"
                        disabled={cancelOrder.isPending}
                        loading={cancelOrder.isPending}
                        onClick={() =>
                          dialogs.confirm({
                            title: 'Hủy đơn hàng này?',
                            description: 'Bạn có thể hủy đơn trước khi báo chuyển khoản.',
                            confirmLabel: 'Hủy đơn',
                            destructive: true,
                            onConfirm: async () => {
                              try {
                                await cancelOrder.mutateAsync(id)
                                navigate(`/orders/${id}/result`)
                              } catch {
                                /* Error is shown with the order actions. */
                              }
                            },
                          })
                        }
                      >
                        Hủy đơn
                      </Button>
                    )}
                  </div>
                </div>
                {confirmTransfer.isError && (
                  <ErrorState
                    title="Chưa gửi được thông báo"
                    description={
                      confirmTransfer.error instanceof Error
                        ? confirmTransfer.error.message
                        : 'Đơn vẫn giữ trạng thái hiện tại.'
                    }
                    onRetry={() =>
                      void confirmTransfer
                        .mutateAsync(id)
                        .then(() => order.refetch())
                        .catch(() => undefined)
                    }
                  />
                )}
                {cancelOrder.isError && (
                  <AdminlessError
                    error={cancelOrder.error}
                    retry={() =>
                      void cancelOrder
                        .mutateAsync(id)
                        .then(() => navigate(`/orders/${id}/result`))
                        .catch(() => undefined)
                    }
                  />
                )}
              </Card>
            </div>
          )}
          {!showPendingActions && (
            <LinkButton to={`/student/orders/${id}`} variant="outline">
              Chi tiết đơn hàng
            </LinkButton>
          )}
        </div>
      )}
    </ProductPage>
  )
}

function AdminlessError({ error, retry }: { error: unknown; retry: () => void }) {
  return (
    <ErrorState
      title="Chưa cập nhật được đơn"
      description={error instanceof Error ? error.message : 'Hãy thử lại.'}
      onRetry={retry}
    />
  )
}

export function OrderResultPage() {
  const { id = '' } = useParams()
  const { session } = useAuthSession()
  const order = useProductOrder(session?.id ?? '', id)
  return (
    <ProductPage title="Trạng thái đơn hàng" backTo="/student/orders">
      {order.isPending ? (
        <ProductLoading title="Đang tải trạng thái" />
      ) : order.isError ? (
        <ProductError onRetry={() => void order.refetch()} />
      ) : !order.data ? (
        <ProductNotFound message="Không tìm thấy đơn hàng thuộc tài khoản hiện tại." />
      ) : (
        <div className="mx-auto grid w-full max-w-3xl gap-4">
          <OrderState order={order.data} />
          <Card className="grid gap-2 p-5">
            <h2 className="font-display text-lg font-bold">{order.data.order.itemTitle}</h2>
            <p className="text-sm text-ink-secondary">Mã: {order.data.order.orderCode}</p>
            <p className="text-sm text-ink-secondary">
              Số tiền: {formatVnd(order.data.totalAmountVnd)}
            </p>
            <p className="text-sm text-ink-secondary">
              Tạo lúc: {formatDateTimeInTimezone(order.data.order.createdAt)}
            </p>
          </Card>
          <AccessStatePanel access={order.data.access} />
          {order.data.enrollment && <EnrollmentStatusCard enrollment={order.data.enrollment} />}
          {order.data.access.kind === 'available' && order.data.enrollment && (
            <LinkButton to={`/learn/courses/${order.data.courseId}`}>Mở khóa học</LinkButton>
          )}
          {order.data.order.status === 'PENDING' && (
            <LinkButton to={`/orders/${id}/pending`} variant="outline">
              Mở hướng dẫn chuyển khoản
            </LinkButton>
          )}
          <LinkButton to={`/student/orders/${id}`} variant="outline">
            Chi tiết đơn hàng
          </LinkButton>
        </div>
      )}
    </ProductPage>
  )
}

export function StudentOrdersPage() {
  const { session } = useAuthSession()
  const [page, setPage] = useState(1)
  const orders = useProductOrders(session?.id ?? '', page)
  return (
    <ProductPage
      title="Đơn hàng của tôi"
      description="Theo dõi các khóa học bạn đã đăng ký và thanh toán."
      backTo="/student"
    >
      {orders.isPending ? (
        <ProductLoading title="Đang tải đơn hàng" />
      ) : orders.isError ? (
        <ProductError onRetry={() => void orders.refetch()} />
      ) : !orders.data?.items.length ? (
        <DomainState
          kind="empty"
          title="Chưa có đơn hàng"
          message="Đơn mua khóa học hoặc gia hạn sẽ xuất hiện tại đây."
        >
          <LinkButton to="/courses" variant="outline">
            Xem khóa học
          </LinkButton>
        </DomainState>
      ) : (
        <div className="grid gap-3">
          {orders.data.items.map((item) => (
            <Link
              key={item.order.id}
              to={`/student/orders/${item.order.id}`}
              className="grid gap-2 rounded-2xl border border-border-subtle bg-card-surface p-4 hover:border-action-primary sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center"
            >
              <span>
                <strong className="block">{item.order.itemTitle}</strong>
                <span className="mt-1 block text-sm text-ink-secondary">
                  Mã đơn {item.order.orderCode} · {customerOrderStatusLabel(item.order.status)} ·{' '}
                  {formatDateTimeInTimezone(item.order.createdAt)}
                </span>
                {item.transferReported && item.order.status === 'PENDING' && (
                  <span className="mt-1 block text-xs text-warning-foreground">
                    Đã gửi xác nhận thanh toán · đang kiểm tra
                  </span>
                )}
              </span>
              <span className="font-semibold">
                {formatVnd(item.totalAmountVnd)}{' '}
                <ArrowRight aria-hidden="true" className="inline size-4" />
              </span>
            </Link>
          ))}
        </div>
      )}
      {orders.data && orders.data.total > orders.data.pageSize && (
        <Pagination
          page={orders.data.page}
          pages={Math.ceil(orders.data.total / orders.data.pageSize)}
          onPageChange={setPage}
        />
      )}
    </ProductPage>
  )
}

function customerOrderStatusLabel(status: string) {
  switch (status) {
    case 'PAID':
      return 'Đã thanh toán'
    case 'CANCELLED':
      return 'Đã hủy'
    case 'REJECTED':
      return 'Cần kiểm tra lại'
    case 'FAILED':
      return 'Thanh toán chưa hoàn tất'
    case 'EXPIRED':
      return 'Đã hết hạn'
    default:
      return 'Chờ thanh toán'
  }
}

export function StudentOrderDetailPage() {
  const { id = '' } = useParams()
  const { session } = useAuthSession()
  const order = useProductOrder(session?.id ?? '', id)
  return (
    <ProductPage title="Chi tiết đơn hàng" backTo="/student/orders">
      {order.isPending ? (
        <ProductLoading title="Đang tải chi tiết" />
      ) : order.isError ? (
        <ProductError onRetry={() => void order.refetch()} />
      ) : !order.data ? (
        <ProductNotFound message="Không tìm thấy đơn hàng thuộc tài khoản hiện tại." />
      ) : (
        <div className="mx-auto grid w-full max-w-3xl gap-5">
          <Card className="grid gap-3 p-5">
            <h2 className="font-display text-xl font-bold">{order.data.order.itemTitle}</h2>
            <p className="text-sm text-ink-secondary">
              Mã đơn hàng: <strong>{order.data.order.orderCode}</strong>
            </p>
            <p className="text-sm text-ink-secondary">
              Hình thức: {order.data.order.orderType === 'PURCHASE' ? 'Mua khóa học' : 'Gia hạn'}
            </p>
            <p className="text-sm text-ink-secondary">
              Giá gốc: {formatVnd(order.data.originalAmountVnd)}
            </p>
            <p className="text-sm text-ink-secondary">
              Giảm giá: {formatVnd(order.data.discountAmountVnd)}
            </p>
            <p className="text-sm text-ink-secondary">
              Thời hạn: {order.data.durationMonths} tháng
            </p>
            <p className="text-sm text-ink-secondary">
              Ngày đặt: {formatDateTimeInTimezone(order.data.order.createdAt)}
            </p>
          </Card>
          <OrderState order={order.data} />
          {order.data.order.status === 'PENDING' && (
            <LinkButton to={`/orders/${id}/pending`}>Xem hướng dẫn chuyển khoản</LinkButton>
          )}
          <AccessStatePanel access={order.data.access} />
          {order.data.enrollment && <EnrollmentStatusCard enrollment={order.data.enrollment} />}
        </div>
      )}
    </ProductPage>
  )
}

export function CourseRenewalPage() {
  const { courseId = '' } = useParams()
  const { session } = useAuthSession()
  const course = useProductCourse(session?.id ?? '', courseId)
  const renewals = useProductRenewalPlans(session?.id ?? '', courseId)
  return (
    <ProductPage title="Gia hạn khóa học" backTo="/student/courses">
      {course.isPending || renewals.isPending ? (
        <ProductLoading title="Đang tải quyền học và gói gia hạn" />
      ) : course.isError || renewals.isError ? (
        <ProductError
          onRetry={() => {
            void course.refetch()
            void renewals.refetch()
          }}
        />
      ) : !course.data || !renewals.data ? (
        <ProductNotFound message="Không tìm thấy quyền học hoặc gói gia hạn." />
      ) : (
        <div className="grid gap-5">
          <Card className="grid gap-3 p-5">
            <h2 className="font-display text-xl font-bold">{course.data.course.title}</h2>
            <AccessStatePanel access={course.data.access} />
            <p className="text-sm text-ink-secondary">
              Hạn truy cập hiện tại:{' '}
              {formatDateTimeInTimezone(renewals.data.course.enrollmentExpiresAt)}
            </p>
            <p className="text-sm leading-6 text-ink-secondary">
              Thời hạn mới sẽ được cập nhật sau khi đơn gia hạn được xác nhận. Tiến độ, ghi chú và
              lịch sử quiz hiện có được giữ nguyên.
            </p>
          </Card>
          {course.data.access.kind === 'restricted' && (
            <Card className="p-4 text-sm leading-6 text-warning-foreground">
              Quyền học hiện chưa khả dụng. Vui lòng liên hệ hỗ trợ trước khi gia hạn.
            </Card>
          )}
          {renewals.data.plans.length ? (
            <ul className="grid gap-4 md:grid-cols-2">
              {renewals.data.plans.map((plan) => (
                <li key={plan.id}>
                  <Card className="grid h-full gap-3 p-5">
                    <Badge tone="info">Gia hạn</Badge>
                    <h3 className="font-display text-lg font-bold">{plan.title}</h3>
                    <p className="text-sm text-ink-secondary">{plan.durationMonths} tháng</p>
                    <p className="font-display text-2xl font-extrabold text-action-primary">
                      {formatVnd(plan.priceVnd)}
                    </p>
                    <LinkButton
                      to={`/checkout/${encodeURIComponent(courseId)}?type=RENEWAL&plan=${encodeURIComponent(plan.id)}`}
                    >
                      Tiếp tục <ArrowRight aria-hidden="true" />
                    </LinkButton>
                  </Card>
                </li>
              ))}
            </ul>
          ) : (
            <DomainState
              kind="empty"
              title="Chưa có gói gia hạn"
              message="Hiện chưa có gói gia hạn phù hợp cho khóa học này. Vui lòng thử lại sau."
            />
          )}
        </div>
      )}
    </ProductPage>
  )
}
