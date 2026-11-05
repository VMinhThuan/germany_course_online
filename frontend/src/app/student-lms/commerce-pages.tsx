import { useState, type FormEvent } from 'react'
import { ArrowRight, CheckCircle2, CircleAlert, CreditCard, QrCode, XCircle } from 'lucide-react'
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
import { useDialogs } from '@/shared/ui/dialogs'
import { Badge, Button, Card, ErrorState, LinkButton, Pagination, SectionHeader } from '@/shared/ui'
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
  discountSource,
  totalAmount,
}: {
  baseAmount: string
  discountAmount: string
  couponDiscountAmount?: string
  automaticDiscountAmount?: string
  discountSource?: 'NONE' | 'COUPON' | 'AUTOMATIC_5_PERCENT'
  totalAmount: string
}) {
  return (
    <dl className="grid gap-2 text-sm">
      <div className="flex justify-between gap-3">
        <dt>Giá gốc</dt>
        <dd className="font-semibold">{formatVnd(baseAmount)}</dd>
      </div>
      {couponDiscountAmount && BigInt(couponDiscountAmount) > 0n && (
        <div className="flex justify-between gap-3 text-success-foreground">
          <dt>Giảm từ coupon</dt>
          <dd>−{formatVnd(couponDiscountAmount)}</dd>
        </div>
      )}
      {automaticDiscountAmount && BigInt(automaticDiscountAmount) > 0n && (
        <div className="flex justify-between gap-3 text-success-foreground">
          <dt>Ưu đãi tự động</dt>
          <dd>−{formatVnd(automaticDiscountAmount)}</dd>
        </div>
      )}
      <div className="flex justify-between gap-3">
        <dt>Tổng giảm · {discountSource ?? 'NONE'}</dt>
        <dd>−{formatVnd(discountAmount)}</dd>
      </div>
      <div className="mt-1 flex justify-between gap-3 border-t border-border-subtle pt-3 text-base">
        <dt className="font-bold">Cần thanh toán</dt>
        <dd className="font-extrabold text-action-primary">{formatVnd(totalAmount)}</dd>
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
  const validateCoupon = useValidateStudentCoupon(session?.id ?? '')
  const createOrder = useCreateOrder(session?.id ?? '')

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
      title="Tạo đơn hàng"
      eyebrow="Báo giá từ máy chủ"
      backTo={orderType === 'RENEWAL' ? `/student/courses/${orderContext}/renew` : '/courses'}
    >
      {quote.isPending ? (
        <ProductLoading title="Đang lấy báo giá" />
      ) : quote.isError ? (
        <ProductError onRetry={() => void quote.refetch()} />
      ) : !quote.data ? (
        <ProductNotFound message="Không tìm thấy báo giá cho khóa học này." />
      ) : (
        <div className="mx-auto grid w-full max-w-5xl gap-5 lg:grid-cols-[minmax(0,1fr)_21rem]">
          <div className="grid content-start gap-5">
            <Card className="grid gap-3 p-5 sm:p-6">
              <Badge tone={quote.data.orderType === 'PURCHASE' ? 'brand' : 'info'}>
                {quote.data.orderType === 'PURCHASE' ? 'Mua khóa học' : 'Gia hạn khóa học'}
              </Badge>
              <h2 className="font-display text-2xl font-bold">{quote.data.courseTitle}</h2>
              {quote.data.plan && (
                <p className="text-sm text-ink-secondary">
                  Gói: {quote.data.plan.title} · {quote.data.plan.durationMonths} tháng
                </p>
              )}
              {quote.data.currentExpiry && (
                <p className="text-sm text-ink-secondary">
                  Hạn hiện tại: {formatDateTimeInTimezone(quote.data.currentExpiry)}
                </p>
              )}
              <p className="text-sm leading-6 text-ink-secondary">
                Báo giá và thời hạn này do backend tính. Tạo đơn sẽ ở trạng thái PENDING; quyền học
                chỉ được cập nhật sau khi Admin duyệt.
              </p>
            </Card>
            <Card className="grid gap-4 p-5 sm:p-6">
              <SectionHeader
                title="Mã ưu đãi"
                description="Backend kiểm tra điều kiện và quyết định coupon hay ưu đãi tự động có giá trị lớn hơn."
              />
              <form
                className="flex flex-col gap-3 sm:flex-row"
                onSubmit={(event) => void applyCoupon(event)}
              >
                <label className="grid flex-1 gap-1 text-sm font-semibold">
                  Mã coupon
                  <input
                    className="min-h-11 rounded-xl border border-border-subtle bg-white px-3 font-normal outline-none focus-visible:ring-2 focus-visible:ring-action-primary"
                    value={couponCode}
                    onChange={(event) => {
                      setCouponCode(event.target.value)
                      setAcceptedCoupon(undefined)
                      setCouponResult(undefined)
                    }}
                    autoComplete="off"
                  />
                </label>
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
          <aside className="grid content-start gap-4">
            <Card className="grid gap-4 p-5">
              <h2 className="font-display text-xl font-bold">Tóm tắt</h2>
              <DiscountSummary
                baseAmount={quote.data.originalAmountVnd}
                discountAmount={quote.data.discountAmountVnd}
                {...(quote.data.couponDiscountAmountVnd !== undefined
                  ? { couponDiscountAmount: quote.data.couponDiscountAmountVnd }
                  : {})}
                {...(quote.data.automaticDiscountAmountVnd !== undefined
                  ? { automaticDiscountAmount: quote.data.automaticDiscountAmountVnd }
                  : {})}
                {...(quote.data.discountSource !== undefined
                  ? { discountSource: quote.data.discountSource }
                  : {})}
                totalAmount={quote.data.totalAmountVnd}
              />
              <p className="text-sm text-ink-secondary">
                Thời hạn truy cập: {quote.data.durationMonths} tháng
              </p>
              <Button
                loading={createOrder.isPending}
                disabled={createOrder.isPending}
                onClick={() => void submitOrder()}
                startIcon={<CreditCard aria-hidden="true" className="size-4" />}
              >
                Tạo đơn PENDING
              </Button>
              {createOrder.isError && (
                <ErrorState
                  title="Chưa tạo được đơn"
                  description={
                    createOrder.error instanceof Error
                      ? createOrder.error.message
                      : 'Backend chưa xác nhận việc tạo đơn.'
                  }
                  onRetry={() => void submitOrder()}
                />
              )}
              <p className="text-xs leading-5 text-ink-muted">
                Không thực hiện giao dịch trong ứng dụng. Chuyển khoản thủ công theo hướng dẫn của
                Admin.
              </p>
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
      <div
        role="status"
        className="rounded-2xl border border-success-foreground/20 bg-success-surface p-4 text-success-foreground"
      >
        <p className="flex items-center gap-2 font-bold">
          <CheckCircle2 aria-hidden="true" className="size-5" />
          Đã thanh toán và được xác nhận
        </p>
        <p className="mt-1 text-sm leading-6">
          Enrollment do backend cấp hoặc gia hạn. Tải lại quyền học để tiếp tục.
        </p>
      </div>
    )
  if (status === 'CANCELLED' || status === 'FAILED' || status === 'EXPIRED')
    return (
      <div role="status" className="rounded-2xl border border-border-subtle bg-surface-muted p-4">
        <p className="flex items-center gap-2 font-bold">
          <XCircle aria-hidden="true" className="size-5" />
          Đơn {status}
        </p>
        <p className="mt-1 text-sm leading-6 text-ink-secondary">Đơn này không cấp quyền học.</p>
      </div>
    )
  return (
    <div
      role="status"
      className="rounded-2xl border border-warning-foreground/20 bg-warning-surface p-4 text-warning-foreground"
    >
      <p className="flex items-center gap-2 font-bold">
        <CircleAlert aria-hidden="true" className="size-5" />
        {reported ? 'Đã báo chuyển khoản · chờ Admin đối soát' : 'Đang chờ chuyển khoản'}
      </p>
      <p className="mt-1 text-sm leading-6">
        Nhấn xác nhận chỉ gửi thông báo tới Admin; đơn vẫn PENDING và chưa cấp quyền học.
      </p>
    </div>
  )
}

function PaymentInstructions({
  order,
}: {
  order: NonNullable<ReturnType<typeof useProductOrder>['data']>
}) {
  const instructions = order.paymentInstructions
  if (!instructions)
    return (
      <Card className="grid gap-2 border-dashed p-5">
        <h2 className="font-display text-lg font-bold">Chưa có cấu hình chuyển khoản</h2>
        <p className="text-sm leading-6 text-ink-secondary">
          Admin chưa cấu hình ngân hàng hoặc QR. Không có thông tin thanh toán mẫu để hiển thị.
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
      {instructions.qrUrl && (
        <img
          src={instructions.qrUrl}
          alt="Mã QR tĩnh do Admin cấu hình"
          className="mx-auto max-h-64 max-w-full rounded-xl border border-border-subtle object-contain"
          loading="lazy"
        />
      )}
      <dl className="grid gap-2 text-sm">
        <div className="flex justify-between gap-3">
          <dt>Ngân hàng</dt>
          <dd className="text-right font-semibold">{instructions.bankName}</dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt>Số tài khoản</dt>
          <dd className="text-right font-semibold">{instructions.accountNumber}</dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt>Chủ tài khoản</dt>
          <dd className="text-right font-semibold">{instructions.accountHolderName}</dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt>Số tiền</dt>
          <dd className="text-right font-extrabold text-action-primary">
            {formatVnd(order.totalAmountVnd)}
          </dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt>Nội dung</dt>
          <dd className="text-right font-mono font-bold">{order.order.orderCode}</dd>
        </div>
      </dl>
      <p className="whitespace-pre-line rounded-xl bg-surface-muted p-3 text-sm leading-6 text-ink-secondary">
        {instructions.transferInstructions}
      </p>
      <p className="text-xs leading-5 text-ink-muted">
        QR là ảnh tĩnh. Hãy kiểm tra số tiền và mã đơn ở trên trước khi chuyển khoản.
      </p>
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
  return (
    <ProductPage title="Thanh toán chuyển khoản" backTo="/student/orders">
      {order.isPending ? (
        <ProductLoading title="Đang tải hướng dẫn đơn hàng" />
      ) : order.isError ? (
        <ProductError onRetry={() => void order.refetch()} />
      ) : !order.data ? (
        <ProductNotFound message="Không tìm thấy đơn hàng thuộc tài khoản hiện tại." />
      ) : (
        <div className="mx-auto grid w-full max-w-3xl gap-5">
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
          {order.data.order.status === 'PENDING' && <PaymentInstructions order={order.data} />}
          {order.data.order.status === 'PENDING' && (
            <Card className="grid gap-3 p-5">
              <h2 className="font-display text-lg font-bold">Bạn đã chuyển khoản?</h2>
              <p className="text-sm leading-6 text-ink-secondary">
                Xác nhận chỉ cập nhật trạng thái báo chuyển khoản. Admin sẽ đối soát riêng; đơn vẫn
                PENDING cho đến khi được duyệt.
              </p>
              <Button
                loading={confirmTransfer.isPending}
                disabled={confirmTransfer.isPending || order.data.transferReported}
                onClick={() =>
                  void confirmTransfer
                    .mutateAsync(id)
                    .then(() => order.refetch())
                    .catch(() => undefined)
                }
              >
                {order.data.transferReported ? 'Đã gửi báo chuyển khoản' : 'Tôi đã chuyển khoản'}
              </Button>
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
              {!order.data.transferReported && (
                <Button
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
          )}
          <LinkButton to={`/student/orders/${id}`} variant="outline">
            Chi tiết đơn hàng
          </LinkButton>
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
      description="Trạng thái và số tiền được tải từ hệ thống."
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
                  {item.order.orderCode} · {item.order.status} ·{' '}
                  {formatDateTimeInTimezone(item.order.createdAt)}
                </span>
                {item.transferReported && item.order.status === 'PENDING' && (
                  <span className="mt-1 block text-xs text-warning-foreground">
                    Đã báo chuyển khoản · chờ Admin duyệt
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
              Mã đơn: <strong>{order.data.order.orderCode}</strong>
            </p>
            <p className="text-sm text-ink-secondary">
              Loại đơn: {order.data.order.orderType === 'PURCHASE' ? 'Mua khóa học' : 'Gia hạn'}
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
              Tạo lúc: {formatDateTimeInTimezone(order.data.order.createdAt)}
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
              Hạn enrollment hiện tại:{' '}
              {formatDateTimeInTimezone(renewals.data.course.enrollmentExpiresAt)}
            </p>
            <p className="text-sm leading-6 text-ink-secondary">
              Thời hạn mới được backend tính khi Admin duyệt đơn gia hạn. Progress, ghi chú và lịch
              sử quiz hiện có được giữ nguyên.
            </p>
          </Card>
          {course.data.access.kind === 'restricted' && (
            <Card className="p-4 text-sm leading-6 text-warning-foreground">
              Enrollment bị thu hồi cần Admin khôi phục trước; không thể gia hạn trực tiếp.
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
              message="Admin chưa cấu hình gói đang bán cho khóa học này."
            />
          )}
        </div>
      )}
    </ProductPage>
  )
}
