import { useState } from 'react'
import { ArrowRight, CreditCard } from 'lucide-react'
import { Link, useLocation, useNavigate, useParams } from 'react-router'
import { useAuthSession } from '@/app/auth/auth-session'
import { DEMO_COURSE_ID, DEMO_COURSE_SLUG } from '@/data/student-demo/fixtures'
import { studentDemoRepositories } from '@/data/student-demo/repository'
import {
  useCreateOrder,
  useProductCheckout,
  useProductCourse,
  useProductOrder,
  useProductOrders,
  useProductRenewalPlans,
  useSimulatePayment,
} from '@/data/student-demo/product-queries'
import {
  CouponField,
  OrderHistoryItem,
  OrderSummary,
  PaymentPendingState,
  PaymentStatusPanel,
  PriceSummary,
  RenewalPlanCard,
} from '@/domains/commerce'
import { EnrollmentStatusCard } from '@/domains/commerce/components'
import { AccessStatePanel } from '@/domains/learning'
import { DomainState } from '@/domains/shared/presentation'
import { Badge, Button, Card, ErrorState, LinkButton, SectionHeader } from '@/shared/ui'
import { formatDateTimeInTimezone, formatVnd } from '@/shared/lib/format'
import { ProductError, ProductLoading, ProductNotFound, ProductPage } from './shared'

const PURCHASE_CONTEXT = `purchase-${DEMO_COURSE_ID}`
const RENEWAL_CONTEXT = `renewal-${DEMO_COURSE_ID}`

export function CheckoutPage() {
  const { orderContext = '' } = useParams()
  const { session } = useAuthSession()
  const location = useLocation()
  const navigate = useNavigate()
  const [couponCode, setCouponCode] = useState<string>()
  const params = new URLSearchParams(location.search)
  const planId = params.get('plan') ?? undefined
  const checkout = useProductCheckout(session?.id ?? '', orderContext, planId, couponCode)
  const createOrder = useCreateOrder(session?.id ?? '')
  const course = useProductCourse(session?.id ?? '', DEMO_COURSE_ID)

  return (
    <ProductPage
      title="Xác nhận đơn hàng"
      eyebrow="Thanh toán mô phỏng"
      backTo={`/courses/${DEMO_COURSE_SLUG}`}
    >
      {checkout.isPending ? (
        <ProductLoading title="Đang tải tóm tắt đơn hàng" />
      ) : checkout.isError ? (
        <div className="grid gap-4">
          <ErrorState
            title="Chưa thể tạo đơn hàng demo"
            description="Ngữ cảnh checkout không hợp lệ hoặc tài khoản đã có quyền học còn hạn. Trạng thái quyền truy cập vẫn do repository quyết định."
            onRetry={() => void checkout.refetch()}
          />
          {course.data?.access.kind === 'available' && (
            <Card className="grid gap-3 p-4">
              <AccessStatePanel access={course.data.access} />
              <LinkButton to={`/learn/courses/${DEMO_COURSE_ID}`}>Tiếp tục học</LinkButton>
            </Card>
          )}
          {orderContext === RENEWAL_CONTEXT && (
            <LinkButton to={`/student/courses/${DEMO_COURSE_ID}/renew`} variant="outline">
              Chọn lại gói gia hạn
            </LinkButton>
          )}
        </div>
      ) : !checkout.data ? (
        <ProductNotFound message="Không tìm thấy ngữ cảnh đơn hàng này." />
      ) : (
        <div className="grid min-w-0 gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
          <div className="grid min-w-0 gap-5">
            <Card className="grid gap-4 p-5 sm:p-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-action-primary">
                    {checkout.data.orderType === 'PURCHASE' ? 'Mua khóa học' : 'Gia hạn khóa học'}
                  </p>
                  <h2 className="mt-1 font-display text-2xl font-bold">
                    {checkout.data.courseTitle}
                  </h2>
                </div>
                <Badge tone="warning">Giả định demo</Badge>
              </div>
              {checkout.data.plan && (
                <p className="text-sm text-ink-secondary">
                  Gói đã chọn: {checkout.data.plan.title}
                </p>
              )}
              {checkout.data.currentExpiry && (
                <p className="text-sm text-ink-secondary">
                  Hạn hiện tại: {formatDateTimeInTimezone(checkout.data.currentExpiry)}
                </p>
              )}
              <p className="rounded-xl bg-surface-blue p-4 text-sm leading-6 text-ink-secondary">
                Giá và thời hạn này chỉ dùng để thử giao diện. Chưa phải học phí hoặc điều khoản
                chính thức; không có cổng thanh toán thật.
              </p>
            </Card>
            <Card className="grid gap-4 p-5 sm:p-6">
              <SectionHeader
                title="Mã ưu đãi"
                description="Mã DEMO10 là dữ liệu minh họa; repository trả về mức giảm."
              />
              <CouponField
                onValidate={(code) =>
                  studentDemoRepositories.commerce.validateCoupon(
                    session!.id,
                    orderContext,
                    code,
                    planId,
                  )
                }
                onCodeChange={() => setCouponCode(undefined)}
                onResult={(result) =>
                  setCouponCode(result.kind === 'valid' ? result.code : undefined)
                }
              />
            </Card>
          </div>
          <aside aria-label="Tóm tắt đơn hàng" className="grid content-start gap-4">
            <Card className="grid gap-4 p-5">
              <h2 className="font-display text-xl font-bold">Tóm tắt đơn hàng</h2>
              <PriceSummary
                items={[{ label: 'Giá demo', amountVnd: checkout.data.originalAmountVnd }]}
                {...(BigInt(checkout.data.discountAmountVnd) > 0n
                  ? { discountVnd: checkout.data.discountAmountVnd }
                  : {})}
                totalVnd={checkout.data.totalAmountVnd}
              />
              <p className="text-sm text-ink-secondary">
                Thời hạn giả định: {checkout.data.durationMonths} tháng
              </p>
              <Button
                loading={createOrder.isPending}
                disabled={createOrder.isPending}
                onClick={() =>
                  void createOrder
                    .mutateAsync({
                      context: orderContext,
                      ...(couponCode ? { couponCode } : {}),
                      ...(planId ? { planId } : {}),
                    })
                    .then((detail) => navigate(`/orders/${detail.order.id}/pending`))
                }
                startIcon={<CreditCard aria-hidden="true" />}
              >
                Tạo đơn demo · trạng thái chờ
              </Button>
              {createOrder.isError && (
                <ErrorState
                  title="Chưa tạo được đơn demo"
                  description="Dữ liệu không thay đổi. Thử tải lại hoặc kiểm tra quyền truy cập."
                  onRetry={() =>
                    void createOrder
                      .mutateAsync({
                        context: orderContext,
                        ...(couponCode ? { couponCode } : {}),
                        ...(planId ? { planId } : {}),
                      })
                      .then((detail) => navigate(`/orders/${detail.order.id}/pending`))
                  }
                />
              )}
              <p className="text-xs leading-5 text-ink-muted">
                Tạo đơn chỉ ghi nhận trạng thái PENDING. Quyền học không được cấp cho đến khi
                repository demo nhận một kết quả mô phỏng thành công.
              </p>
            </Card>
          </aside>
        </div>
      )}
    </ProductPage>
  )
}

function DemoGatewayPanel({
  orderId,
  onOutcome,
}: {
  orderId: string
  onOutcome: (outcome: 'success' | 'failure') => Promise<void>
}) {
  const [pending, setPending] = useState(false)
  const [error, setError] = useState(false)
  const [lastOutcome, setLastOutcome] = useState<'success' | 'failure'>('success')
  async function run(outcome: 'success' | 'failure') {
    setLastOutcome(outcome)
    setPending(true)
    setError(false)
    try {
      await onOutcome(outcome)
    } catch {
      setError(true)
    } finally {
      setPending(false)
    }
  }
  return (
    <Card className="grid gap-4 border-dashed border-action-primary/40 bg-surface-blue/60 p-5">
      <div className="flex items-center gap-2 font-semibold">
        <CreditCard aria-hidden="true" className="size-5 text-action-primary" />
        Cổng thanh toán demo
      </div>
      <p className="text-sm leading-6 text-ink-secondary">
        Các nút dưới đây chỉ gửi kết quả tổng hợp tới repository mô phỏng. Không nhập thẻ, không
        chuyển tiền và không gọi nhà cung cấp thanh toán.
      </p>
      <div className="flex flex-wrap gap-3">
        <Button loading={pending} disabled={pending} onClick={() => void run('success')}>
          Mô phỏng xác nhận thành công
        </Button>
        <Button variant="outline" disabled={pending} onClick={() => void run('failure')}>
          Mô phỏng thất bại
        </Button>
      </div>
      {error && (
        <ErrorState
          title="Chưa cập nhật được trạng thái đơn"
          description="Đơn vẫn giữ trạng thái hiện tại trong repository."
          onRetry={() => void run(lastOutcome)}
        />
      )}
      <span className="sr-only">Đơn đang xử lý: {orderId}</span>
    </Card>
  )
}

export function OrderPendingPage() {
  const { id = '' } = useParams()
  const { session } = useAuthSession()
  const order = useProductOrder(session?.id ?? '', id)
  const payment = useSimulatePayment(session?.id ?? '')
  const navigate = useNavigate()

  return (
    <ProductPage title="Đơn hàng đang chờ" backTo="/student/orders">
      {order.isPending ? (
        <ProductLoading title="Đang kiểm tra đơn hàng" />
      ) : order.isError ? (
        <ProductError onRetry={() => void order.refetch()} />
      ) : !order.data ? (
        <ProductNotFound message="Đơn hàng không thuộc tài khoản demo hiện tại." />
      ) : (
        <div className="mx-auto grid w-full max-w-3xl gap-5">
          <OrderSummary order={order.data.order} />
          {order.data.order.status === 'PENDING' ? (
            <>
              <PaymentPendingState order={order.data.order} />
              <DemoGatewayPanel
                orderId={id}
                onOutcome={async (outcome) => {
                  await payment.mutateAsync({ orderId: id, outcome })
                  navigate(`/orders/${id}/result`)
                }}
              />
            </>
          ) : (
            <Card className="grid gap-3 p-5">
              <p className="text-sm text-ink-secondary">
                Đơn đã có kết quả. Tải kết quả để xem quyền truy cập repository trả về.
              </p>
              <LinkButton to={`/orders/${id}/result`}>Xem kết quả đơn hàng</LinkButton>
            </Card>
          )}
          <LinkButton to="/student/orders" variant="outline">
            Về danh sách đơn hàng
          </LinkButton>
        </div>
      )}
    </ProductPage>
  )
}

export function OrderResultPage() {
  const { id = '' } = useParams()
  const { session } = useAuthSession()
  const order = useProductOrder(session?.id ?? '', id)
  const navigate = useNavigate()

  return (
    <ProductPage title="Kết quả đơn hàng" backTo="/student/orders">
      {order.isPending ? (
        <ProductLoading title="Đang tải kết quả" />
      ) : order.isError ? (
        <ProductError onRetry={() => void order.refetch()} />
      ) : !order.data ? (
        <ProductNotFound message="Đơn hàng không thuộc tài khoản demo hiện tại." />
      ) : (
        <div className="mx-auto grid w-full max-w-3xl gap-5">
          <PaymentStatusPanel
            order={order.data.order}
            canOpenCourse={order.data.access.kind === 'available' && Boolean(order.data.enrollment)}
            onOpenCourse={() => navigate(`/learn/courses/${order.data!.courseId}`)}
          />
          <OrderSummary order={order.data.order} />
          <AccessStatePanel access={order.data.access} />
          {order.data.enrollment && <EnrollmentStatusCard enrollment={order.data.enrollment} />}
          {order.data.order.status === 'FAILED' && (
            <LinkButton
              to={
                order.data.order.orderType === 'RENEWAL' && order.data.planId
                  ? `/checkout/${RENEWAL_CONTEXT}?plan=${encodeURIComponent(order.data.planId)}`
                  : `/checkout/${PURCHASE_CONTEXT}`
              }
            >
              Tạo đơn demo mới <ArrowRight aria-hidden="true" />
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
  const orders = useProductOrders(session?.id ?? '')
  return (
    <ProductPage
      title="Đơn hàng của tôi"
      description="Lịch sử giả lập theo tài khoản hiện tại. Không có giao dịch hoặc mã thanh toán thật."
      backTo="/student"
    >
      {orders.isPending ? (
        <ProductLoading title="Đang tải đơn hàng" />
      ) : orders.isError ? (
        <ProductError onRetry={() => void orders.refetch()} />
      ) : !orders.data?.length ? (
        <DomainState
          kind="empty"
          title="Chưa có đơn hàng"
          message="Khi bạn thử checkout, repository sẽ tạo một đơn demo ở trạng thái chờ."
        >
          <LinkButton to={`/courses/${DEMO_COURSE_SLUG}`} variant="outline">
            Xem khóa học
          </LinkButton>
        </DomainState>
      ) : (
        <section className="grid gap-4" aria-label="Lịch sử đơn hàng">
          {orders.data.map(({ order }) => (
            <OrderHistoryItem key={order.id} order={order} href={`/student/orders/${order.id}`} />
          ))}
        </section>
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
        <ProductNotFound message="Đơn hàng không thuộc tài khoản demo hiện tại." />
      ) : (
        <div className="mx-auto grid w-full max-w-3xl gap-5">
          <OrderSummary order={order.data.order} />
          <Card className="grid gap-3 p-5">
            <h2 className="font-display text-xl font-bold">Tóm tắt</h2>
            <p className="text-sm text-ink-secondary">
              Loại đơn: {order.data.order.orderType === 'PURCHASE' ? 'Mua khóa học' : 'Gia hạn'}
            </p>
            <p className="text-sm text-ink-secondary">
              Giá giả định ban đầu: {formatVnd(order.data.originalAmountVnd)}
            </p>
            {order.data.couponCode && (
              <p className="text-sm text-ink-secondary">Mã demo: {order.data.couponCode}</p>
            )}
            {BigInt(order.data.discountAmountVnd) > 0n && (
              <p className="text-sm text-ink-secondary">
                Giảm minh họa: {formatVnd(order.data.discountAmountVnd)}
              </p>
            )}
            <p className="text-sm text-ink-secondary">
              Tạo lúc: {formatDateTimeInTimezone(order.data.order.createdAt)}
            </p>
          </Card>
          <AccessStatePanel access={order.data.access} />
          {order.data.enrollment && <EnrollmentStatusCard enrollment={order.data.enrollment} />}
          <LinkButton
            to={`/orders/${id}/${order.data.order.status === 'PENDING' ? 'pending' : 'result'}`}
            variant="outline"
          >
            Mở trạng thái đơn hàng
          </LinkButton>
        </div>
      )}
    </ProductPage>
  )
}

export function CourseRenewalPage() {
  const { courseId = '' } = useParams()
  const { session } = useAuthSession()
  const course = useProductCourse(session?.id ?? '', courseId)
  const plans = useProductRenewalPlans(session?.id ?? '', courseId)
  const navigate = useNavigate()

  return (
    <ProductPage title="Gia hạn khóa học" backTo="/student/courses">
      {course.isPending || plans.isPending ? (
        <ProductLoading title="Đang tải gói gia hạn" />
      ) : course.isError || plans.isError ? (
        <ProductError
          onRetry={() => {
            void course.refetch()
            void plans.refetch()
          }}
        />
      ) : !course.data ? (
        <ProductNotFound message="Không tìm thấy khóa học cần gia hạn." />
      ) : (
        <div className="grid gap-5">
          <Card className="grid gap-3 p-5">
            <h2 className="font-display text-xl font-bold">{course.data.course.title}</h2>
            <AccessStatePanel access={course.data.access} />
            {course.data.access.kind === 'expired-display' && (
              <p className="text-sm text-ink-secondary">
                Hết hạn: {formatDateTimeInTimezone(course.data.access.expiresAt)}
              </p>
            )}
            <p className="rounded-xl bg-surface-blue p-4 text-sm leading-6 text-ink-secondary">
              Gói và giá bên dưới là giả định demo. Hạn mới do repository tính và trả về sau trạng
              thái thanh toán mô phỏng.
            </p>
          </Card>
          {plans.data?.length ? (
            <ul className="grid gap-4 md:grid-cols-3" aria-label="Gói gia hạn demo">
              {plans.data.map((plan) => (
                <li key={plan.id}>
                  <RenewalPlanCard
                    plan={plan}
                    onSelect={() =>
                      navigate(`/checkout/${RENEWAL_CONTEXT}?plan=${encodeURIComponent(plan.id)}`)
                    }
                  />
                </li>
              ))}
            </ul>
          ) : (
            <DomainState
              kind="empty"
              title="Chưa có gói gia hạn"
              message="Tài khoản này không có enrollment có thể gia hạn trong kịch bản demo."
            />
          )}
          <Link
            to={`/courses/${DEMO_COURSE_SLUG}`}
            className="min-h-11 self-start px-1 py-3 text-sm font-semibold text-action-primary"
          >
            Tìm hiểu lại khóa học
          </Link>
        </div>
      )}
    </ProductPage>
  )
}
