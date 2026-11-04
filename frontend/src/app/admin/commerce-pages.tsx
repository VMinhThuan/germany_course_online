import { useState, type FormEvent } from 'react'
import { Link } from 'react-router'
import { useQuery } from '@tanstack/react-query'
import { ChevronRight, CircleCheck } from 'lucide-react'
import { adminRepository } from '@/data/api/admin-repository'
import type { ApiRenewalPlan } from '@/lib/api/types'
import { formatDateTimeInTimezone, formatVnd } from '@/shared/lib/format'
import { Button, EmptyState, Pagination } from '@/shared/ui'
import {
  AdminCard,
  AdminField,
  AdminFeedback,
  AdminLoadError,
  AdminLoading,
  AdminSelect,
  AdminTextArea,
  useAdminMutation,
  useStableIdempotencyKey,
} from './shared'

export function AdminOrdersPage({ orderId }: { orderId?: string }) {
  const [page, setPage] = useState(1)
  const [status, setStatus] = useState('')
  const [transferSubmitted, setTransferSubmitted] = useState('')
  const [note, setNote] = useState('')
  const [reason, setReason] = useState('')
  const [reconciliation, setReconciliation] = useState<
    'NO_FUNDS_RECEIVED' | 'REFUND_CONFIRMED_EXTERNALLY'
  >('NO_FUNDS_RECEIVED')
  const [success, setSuccess] = useState('')
  const list = useQuery({
    queryKey: ['admin', 'orders', status, transferSubmitted, page],
    queryFn: () =>
      adminRepository.listOrders({
        page,
        pageSize: 20,
        ...(status ? { status } : {}),
        ...(transferSubmitted ? { paymentSubmitted: transferSubmitted === 'true' } : {}),
      }),
    enabled: !orderId,
    retry: false,
  })
  const detail = useQuery({
    queryKey: ['admin', 'order', orderId],
    queryFn: () => adminRepository.getOrder(orderId!),
    enabled: Boolean(orderId),
    retry: false,
  })
  const approve = useAdminMutation(({ id, reviewNote }: { id: string; reviewNote: string }) =>
    adminRepository.approveOrder(id, reviewNote),
  )
  const cancel = useAdminMutation(
    ({
      id,
      input,
    }: {
      id: string
      input: {
        reason: string
        reconciliationOutcome: 'NO_FUNDS_RECEIVED' | 'REFUND_CONFIRMED_EXTERNALLY'
      }
    }) => adminRepository.cancelOrder(id, input),
  )

  if (orderId) {
    if (detail.isPending) return <AdminLoading />
    if (detail.isError || !detail.data)
      return (
        <AdminLoadError
          error={detail.error ?? new Error('Không tìm thấy đơn hàng.')}
          retry={() => void detail.refetch()}
        />
      )
    const { order, student, course, couponReservation, existingEnrollment } = detail.data
    async function approveFunds() {
      if (order.status !== 'PENDING' || !order.paymentSubmittedAt) return
      if (
        !window.confirm(
          'Bạn đã đối soát và xác nhận khoản tiền này thực sự vào tài khoản ngân hàng? Thao tác sẽ đánh dấu PAID và cấp/gia hạn Enrollment.',
        )
      )
        return
      try {
        await approve.mutateAsync({ id: order.id, reviewNote: note.trim() })
        setSuccess('Backend đã duyệt đơn và cập nhật quyền học.')
      } catch {
        /* API error below */
      }
    }
    async function cancelOrder(event: FormEvent) {
      event.preventDefault()
      if (order.status !== 'PENDING' || !reason.trim()) return
      const confirmation =
        reconciliation === 'REFUND_CONFIRMED_EXTERNALLY'
          ? 'Bạn xác nhận đã tự xử lý hoàn tiền bên ngoài ứng dụng?'
          : 'Bạn đã đối soát và xác nhận không nhận được tiền?'
      if (!window.confirm(`${confirmation} API chỉ ghi nhận xác nhận, không thực hiện hoàn tiền.`))
        return
      try {
        await cancel.mutateAsync({
          id: order.id,
          input: { reason: reason.trim(), reconciliationOutcome: reconciliation },
        })
        setSuccess('Đã cập nhật hủy đơn theo kết quả đối soát bạn xác nhận.')
      } catch {
        /* API error below */
      }
    }
    return (
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(19rem,0.75fr)]">
        <div className="grid content-start gap-5">
          <AdminCard
            title={`Đơn ${order.orderCode}`}
            description={`${order.orderType} · ${course.title} · ${student?.fullName ?? student?.email ?? 'Tài khoản không còn tồn tại'}`}
          >
            <dl className="grid gap-3 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-ink-secondary">Trạng thái</dt>
                <dd className="font-semibold">
                  {order.status}
                  {order.paymentSubmittedAt
                    ? ' · Đã báo chuyển khoản'
                    : order.status === 'PENDING'
                      ? ' · Chưa báo chuyển khoản'
                      : ''}
                </dd>
              </div>
              <div>
                <dt className="text-ink-secondary">Số tiền</dt>
                <dd className="font-semibold">{formatVnd(order.totalAmount)}</dd>
              </div>
              <div>
                <dt className="text-ink-secondary">Giá cơ sở</dt>
                <dd>{formatVnd(order.baseAmount)}</dd>
              </div>
              <div>
                <dt className="text-ink-secondary">Giảm giá</dt>
                <dd>
                  {formatVnd(order.discountAmount)} · {order.discountSource}
                </dd>
              </div>
              <div>
                <dt className="text-ink-secondary">Thời hạn</dt>
                <dd>{order.durationMonthsSnapshot} tháng</dd>
              </div>
              <div>
                <dt className="text-ink-secondary">Tạo lúc</dt>
                <dd>{formatDateTimeInTimezone(order.createdAt)}</dd>
              </div>
              <div>
                <dt className="text-ink-secondary">Mã coupon</dt>
                <dd>{couponReservation?.code ?? 'Không áp dụng'}</dd>
              </div>
              <div>
                <dt className="text-ink-secondary">Coupon reservation</dt>
                <dd>{couponReservation?.status ?? 'Không có'}</dd>
              </div>
              <div>
                <dt className="text-ink-secondary">Enrollment hiện tại</dt>
                <dd>
                  {existingEnrollment
                    ? `${existingEnrollment.status} · ${existingEnrollment.expiresAt ? formatDateTimeInTimezone(existingEnrollment.expiresAt) : '—'}`
                    : 'Chưa có'}
                </dd>
              </div>
              <div>
                <dt className="text-ink-secondary">Báo chuyển khoản</dt>
                <dd>
                  {order.paymentSubmittedAt
                    ? formatDateTimeInTimezone(order.paymentSubmittedAt)
                    : 'Chưa báo'}
                </dd>
              </div>
            </dl>
            <Link to="/admin/orders" className="text-sm font-semibold text-action-primary">
              Quay lại danh sách
            </Link>
          </AdminCard>
          <AdminCard title="Dấu vết kiểm duyệt">
            <p className="text-sm text-ink-secondary">
              Người xử lý: {order.reviewedById ?? 'Chưa có'}
            </p>
            <p className="text-sm text-ink-secondary">
              Thời điểm: {order.reviewedAt ? formatDateTimeInTimezone(order.reviewedAt) : 'Chưa có'}
            </p>
            <p className="text-sm text-ink-secondary">Ghi chú: {order.reviewNote ?? '—'}</p>
            <p className="text-sm text-ink-secondary">
              Lý do hủy: {order.cancellationReason ?? '—'}
            </p>
            <p className="text-sm text-ink-secondary">
              Kết quả đối soát: {order.reconciliationOutcome ?? '—'}
            </p>
          </AdminCard>
        </div>
        <div className="grid content-start gap-5">
          <AdminCard
            title="Duyệt chuyển khoản"
            description="Chỉ duyệt sau khi đối soát ngoài ngân hàng. Đây là thao tác cấp quyền học hoặc gia hạn."
          >
            {!order.paymentSubmittedAt && order.status === 'PENDING' && (
              <p className="rounded-xl bg-warning-surface p-3 text-sm leading-6 text-warning-foreground">
                Học viên chưa báo chuyển khoản. Chờ báo hoặc xác minh theo quy trình nội bộ.
              </p>
            )}
            <AdminTextArea
              label="Ghi chú kiểm duyệt (không bắt buộc)"
              value={note}
              onChange={setNote}
              rows={3}
            />
            <Button
              disabled={order.status !== 'PENDING' || !order.paymentSubmittedAt}
              loading={approve.isPending}
              onClick={() => void approveFunds()}
              startIcon={<CircleCheck aria-hidden="true" className="size-4" />}
            >
              Duyệt đã nhận tiền
            </Button>
            <AdminFeedback error={approve.error} success={success} />
          </AdminCard>
          <AdminCard
            title="Hủy đơn PENDING"
            description="Lý do và kết quả đối soát là xác nhận của Admin. API không thực hiện hoàn tiền."
          >
            <form className="grid gap-3" onSubmit={(event) => void cancelOrder(event)}>
              <AdminTextArea
                label="Lý do bắt buộc"
                value={reason}
                onChange={setReason}
                rows={3}
                required
              />
              <AdminSelect
                label="Kết quả đối soát bên ngoài"
                value={reconciliation}
                onChange={(value) => setReconciliation(value as typeof reconciliation)}
                options={[
                  { value: 'NO_FUNDS_RECEIVED', label: 'Không nhận được tiền' },
                  {
                    value: 'REFUND_CONFIRMED_EXTERNALLY',
                    label: 'Đã hoàn tiền bên ngoài và xác nhận',
                  },
                ]}
              />
              <p className="text-xs leading-5 text-ink-secondary">
                Chỉ chọn “đã hoàn tiền” khi việc hoàn tiền thực tế đã hoàn tất ngoài ứng dụng.
              </p>
              <Button
                type="submit"
                variant="outline"
                disabled={order.status !== 'PENDING' || !reason.trim()}
                loading={cancel.isPending}
              >
                Hủy đơn sau đối soát
              </Button>
              <AdminFeedback error={cancel.error} success={success} />
            </form>
          </AdminCard>
        </div>
      </div>
    )
  }

  return (
    <AdminCard
      title="Đơn hàng"
      description="Xem riêng trạng thái đơn và việc học viên đã báo chuyển khoản hay chưa."
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <AdminSelect
          label="Trạng thái đơn"
          value={status}
          onChange={(value) => {
            setStatus(value)
            setPage(1)
          }}
          options={[
            { value: '', label: 'Tất cả' },
            ...['PENDING', 'PAID', 'CANCELLED', 'FAILED', 'EXPIRED'].map((value) => ({
              value,
              label: value,
            })),
          ]}
        />
        <AdminSelect
          label="Báo chuyển khoản"
          value={transferSubmitted}
          onChange={(value) => {
            setTransferSubmitted(value)
            setPage(1)
          }}
          options={[
            { value: '', label: 'Tất cả' },
            { value: 'true', label: 'Đã báo' },
            { value: 'false', label: 'Chưa báo' },
          ]}
        />
      </div>
      {list.isPending ? (
        <AdminLoading />
      ) : list.isError ? (
        <AdminLoadError error={list.error} retry={() => void list.refetch()} />
      ) : list.data?.items.length ? (
        <div className="overflow-x-auto rounded-xl border border-border-subtle">
          <table className="w-full min-w-[780px] text-left text-sm">
            <thead className="bg-surface-muted text-xs uppercase text-ink-secondary">
              <tr>
                <th className="p-3">Mã đơn</th>
                <th className="p-3">Học viên</th>
                <th className="p-3">Khóa học</th>
                <th className="p-3">Số tiền</th>
                <th className="p-3">Trạng thái</th>
                <th className="p-3">Chuyển khoản</th>
                <th className="p-3">Chi tiết</th>
              </tr>
            </thead>
            <tbody>
              {list.data.items.map(({ order, student, course }) => (
                <tr key={order.id} className="border-t border-border-subtle bg-white">
                  <td className="p-3 font-semibold">{order.orderCode}</td>
                  <td className="p-3">{student?.email ?? '—'}</td>
                  <td className="p-3">{course.title}</td>
                  <td className="p-3">{formatVnd(order.totalAmount)}</td>
                  <td className="p-3">{order.status}</td>
                  <td className="p-3">
                    {order.paymentSubmittedAt
                      ? `Đã báo ${formatDateTimeInTimezone(order.paymentSubmittedAt)}`
                      : 'Chưa báo'}
                  </td>
                  <td className="p-3">
                    <Link
                      to={`/admin/orders/${order.id}`}
                      className="font-semibold text-action-primary"
                    >
                      Mở <ChevronRight aria-hidden="true" className="inline size-4" />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <EmptyState title="Không có đơn hàng" />
      )}
      {list.data && <p className="text-xs text-ink-muted">Tổng số: {list.data.total}</p>}
      {list.data && list.data.total > list.data.pageSize && (
        <Pagination
          page={list.data.page}
          pages={Math.ceil(list.data.total / list.data.pageSize)}
          onPageChange={setPage}
        />
      )}
    </AdminCard>
  )
}

export function AdminRenewalPlansPage() {
  const courses = useQuery({
    queryKey: ['admin', 'courses'],
    queryFn: () => adminRepository.listCourses(),
    retry: false,
  })
  const [courseId, setCourseId] = useState('')
  const [page, setPage] = useState(1)
  const [planId, setPlanId] = useState('')
  const [title, setTitle] = useState('')
  const [months, setMonths] = useState('12')
  const [price, setPrice] = useState('')
  const [status, setStatus] = useState<'ACTIVE' | 'INACTIVE'>('ACTIVE')
  const [sortOrder, setSortOrder] = useState('0')
  const [success, setSuccess] = useState('')
  const plans = useQuery({
    queryKey: ['admin', 'renewal-plans', courseId, page],
    queryFn: () => adminRepository.listRenewalPlans(courseId, { page, pageSize: 20 }),
    enabled: Boolean(courseId),
    retry: false,
  })
  const create = useAdminMutation(
    ({ input, key }: { input: Record<string, unknown>; key: string }) =>
      adminRepository.createRenewalPlan(courseId, input, key),
  )
  const update = useAdminMutation(({ id, input }: { id: string; input: Record<string, unknown> }) =>
    adminRepository.updateRenewalPlan(id, input),
  )
  const deactivate = useAdminMutation((id: string) => adminRepository.deactivateRenewalPlan(id))
  const keys = useStableIdempotencyKey()

  function beginEdit(plan: ApiRenewalPlan) {
    setPlanId(plan.id)
    setTitle(plan.title)
    setMonths(String(plan.durationMonths))
    setPrice(plan.price)
    setStatus(plan.status)
    setSortOrder(String(plan.sortOrder ?? 0))
    setSuccess('')
  }
  function clearForm() {
    setPlanId('')
    setTitle('')
    setMonths('12')
    setPrice('')
    setStatus('ACTIVE')
    setSortOrder('0')
  }
  async function submit(event: FormEvent) {
    event.preventDefault()
    setSuccess('')
    const input = {
      title: title.trim(),
      durationMonths: Number(months),
      price: price.trim(),
      status,
      sortOrder: Number(sortOrder),
    }
    try {
      if (planId) {
        await update.mutateAsync({ id: planId, input })
        setSuccess('Đã cập nhật gói gia hạn.')
      } else {
        await create.mutateAsync({ input, key: keys.get({ courseId, ...input }) })
        keys.clear()
        setSuccess('Đã tạo gói gia hạn.')
      }
      clearForm()
    } catch {
      /* errors shown */
    }
  }
  async function turnOff(plan: ApiRenewalPlan) {
    if (!window.confirm(`Ngừng bán gói “${plan.title}”?`)) return
    try {
      await deactivate.mutateAsync(plan.id)
      setSuccess('Đã ngừng bán gói.')
    } catch {
      /* API error below */
    }
  }

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(20rem,0.75fr)]">
      <AdminCard
        title="Gói gia hạn"
        description="Danh sách phụ thuộc khóa học được chọn. Đơn renewal dùng giá và thời hạn do backend trả."
      >
        {courses.isError ? (
          <AdminLoadError error={courses.error} retry={() => void courses.refetch()} />
        ) : (
          <AdminSelect
            label="Khóa học"
            value={courseId}
            onChange={(value) => {
              setCourseId(value)
              setPage(1)
              clearForm()
            }}
            options={[
              { value: '', label: 'Chọn khóa học' },
              ...(courses.data?.items ?? []).map((course) => ({
                value: course.id,
                label: `${course.code} · ${course.title}`,
              })),
            ]}
          />
        )}
        {courseId &&
          (plans.isPending ? (
            <AdminLoading />
          ) : plans.isError ? (
            <AdminLoadError error={plans.error} retry={() => void plans.refetch()} />
          ) : plans.data?.items.length ? (
            <div className="grid gap-2">
              {plans.data.items.map((plan) => (
                <div
                  key={plan.id}
                  className="grid gap-3 rounded-xl border border-border-subtle bg-white p-3 sm:grid-cols-[minmax(0,1fr)_auto]"
                >
                  <div>
                    <strong>{plan.title}</strong>
                    <p className="mt-1 text-xs text-ink-secondary">
                      {plan.durationMonths} tháng · {formatVnd(plan.price)} · {plan.status} · thứ tự{' '}
                      {plan.sortOrder ?? 0}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => beginEdit(plan)}>
                      Chỉnh sửa
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={plan.status === 'INACTIVE'}
                      loading={deactivate.isPending}
                      onClick={() => void turnOff(plan)}
                    >
                      Ngừng bán
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState title="Chưa có gói gia hạn" description="Tạo gói bên cạnh." />
          ))}
        {plans.data && plans.data.total > plans.data.pageSize && (
          <Pagination
            page={plans.data.page}
            pages={Math.ceil(plans.data.total / plans.data.pageSize)}
            onPageChange={setPage}
          />
        )}
      </AdminCard>
      <AdminCard title={planId ? 'Cập nhật gói' : 'Thêm gói gia hạn'}>
        <form className="grid gap-3" onSubmit={(event) => void submit(event)}>
          <AdminField label="Tên gói" value={title} onChange={setTitle} required />
          <div className="grid gap-3 sm:grid-cols-2">
            <AdminField
              label="Số tháng"
              value={months}
              onChange={setMonths}
              type="number"
              min={1}
              max={120}
              required
            />
            <AdminField
              label="Giá (VND nguyên)"
              value={price}
              onChange={setPrice}
              type="number"
              min={1}
              required
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <AdminSelect
              label="Trạng thái"
              value={status}
              onChange={(value) => setStatus(value as typeof status)}
              options={[
                { value: 'ACTIVE', label: 'Đang bán' },
                { value: 'INACTIVE', label: 'Ngừng bán' },
              ]}
            />
            <AdminField
              label="Thứ tự"
              value={sortOrder}
              onChange={setSortOrder}
              type="number"
              min={0}
            />
          </div>
          <AdminFeedback error={create.error ?? update.error} success={success} />
          <Button type="submit" loading={create.isPending || update.isPending} disabled={!courseId}>
            {planId ? 'Lưu thay đổi' : 'Tạo gói'}
          </Button>
          {planId && (
            <Button variant="outline" onClick={clearForm}>
              Hủy chỉnh sửa
            </Button>
          )}
        </form>
      </AdminCard>
    </div>
  )
}

export function AdminCouponsPage() {
  const [page, setPage] = useState(1)
  const [filter, setFilter] = useState('')
  const [couponId, setCouponId] = useState('')
  const [code, setCode] = useState('')
  const [discountType, setDiscountType] = useState<'PERCENT' | 'FIXED'>('PERCENT')
  const [discountValue, setDiscountValue] = useState('')
  const [maxDiscount, setMaxDiscount] = useState('')
  const [usageLimit, setUsageLimit] = useState('')
  const [startsAt, setStartsAt] = useState('')
  const [expiresAt, setExpiresAt] = useState('')
  const [status, setStatus] = useState<'ACTIVE' | 'INACTIVE'>('ACTIVE')
  const [success, setSuccess] = useState('')
  const coupons = useQuery({
    queryKey: ['admin', 'coupons', filter, page],
    queryFn: () =>
      adminRepository.listCoupons({ page, pageSize: 20, ...(filter ? { status: filter } : {}) }),
    retry: false,
  })
  const create = useAdminMutation((input: Record<string, unknown>) =>
    adminRepository.createCoupon(input),
  )
  const update = useAdminMutation(({ id, input }: { id: string; input: Record<string, unknown> }) =>
    adminRepository.updateCoupon(id, input),
  )
  const deactivate = useAdminMutation((id: string) => adminRepository.deactivateCoupon(id))
  function edit(coupon: NonNullable<typeof coupons.data>['items'][number]) {
    setCouponId(coupon.id)
    setCode(coupon.code)
    setDiscountType(coupon.discountType)
    setDiscountValue(coupon.discountValue)
    setMaxDiscount(coupon.maxDiscount ?? '')
    setUsageLimit(coupon.usageLimit == null ? '' : String(coupon.usageLimit))
    setStartsAt(coupon.startsAt?.slice(0, 16) ?? '')
    setExpiresAt(coupon.expiresAt?.slice(0, 16) ?? '')
    setStatus(coupon.status)
    setSuccess('')
  }
  function reset() {
    setCouponId('')
    setCode('')
    setDiscountType('PERCENT')
    setDiscountValue('')
    setMaxDiscount('')
    setUsageLimit('')
    setStartsAt('')
    setExpiresAt('')
    setStatus('ACTIVE')
  }
  function dateValue(value: string) {
    return value ? new Date(value).toISOString() : null
  }
  async function submit(event: FormEvent) {
    event.preventDefault()
    setSuccess('')
    const input = {
      code: code.trim().toUpperCase(),
      discountType,
      discountValue: discountValue.trim(),
      maxDiscount: maxDiscount ? maxDiscount.trim() : null,
      usageLimit: usageLimit ? Number(usageLimit) : null,
      startsAt: dateValue(startsAt),
      expiresAt: dateValue(expiresAt),
      status,
    }
    try {
      if (couponId) {
        await update.mutateAsync({ id: couponId, input })
        setSuccess('Đã cập nhật coupon.')
      } else {
        await create.mutateAsync(input)
        setSuccess('Đã tạo coupon.')
      }
      reset()
    } catch {
      /* API error below */
    }
  }
  async function deactivateCoupon(id: string) {
    if (!window.confirm('Ngừng sử dụng coupon này? Reservations hiện có được xử lý theo backend.'))
      return
    try {
      await deactivate.mutateAsync(id)
      setSuccess('Đã ngừng sử dụng coupon.')
    } catch {
      /* API error below */
    }
  }
  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(20rem,0.72fr)]">
      <AdminCard
        title="Mã ưu đãi"
        description="Theo dõi số lượt giữ chỗ và đã dùng do server ghi nhận. Không tự giải phóng reservation đang chờ."
      >
        <AdminSelect
          label="Lọc trạng thái"
          value={filter}
          onChange={(value) => {
            setFilter(value)
            setPage(1)
          }}
          options={[
            { value: '', label: 'Tất cả' },
            { value: 'ACTIVE', label: 'ACTIVE' },
            { value: 'INACTIVE', label: 'INACTIVE' },
          ]}
        />
        {coupons.isPending ? (
          <AdminLoading />
        ) : coupons.isError ? (
          <AdminLoadError error={coupons.error} retry={() => void coupons.refetch()} />
        ) : coupons.data?.items.length ? (
          <div className="grid gap-3">
            {coupons.data.items.map((coupon) => (
              <div
                key={coupon.id}
                className="grid gap-3 rounded-xl border border-border-subtle bg-white p-3"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <strong>{coupon.code}</strong>
                    <p className="mt-1 text-xs text-ink-secondary">
                      {coupon.discountType} · {coupon.discountValue}
                      {coupon.discountType === 'PERCENT' ? '%' : ' VND'} · {coupon.status}
                    </p>
                  </div>
                  <div className="text-right text-xs text-ink-secondary">
                    Đã giữ {coupon.reservedCount} · đã dùng {coupon.redemptionCount}
                    {coupon.usageLimit ? ` / ${coupon.usageLimit}` : ''}
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" onClick={() => edit(coupon)}>
                    Chỉnh sửa
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={coupon.status === 'INACTIVE'}
                    loading={deactivate.isPending}
                    onClick={() => void deactivateCoupon(coupon.id)}
                  >
                    Ngừng hoạt động
                  </Button>
                </div>
                {coupon.outstandingReservations?.length ? (
                  <details>
                    <summary className="min-h-10 cursor-pointer text-sm font-semibold">
                      Đơn đang giữ chỗ ({coupon.outstandingReservations.length})
                    </summary>
                    <ul className="grid gap-1 text-xs text-ink-secondary">
                      {coupon.outstandingReservations.map((reservation) => (
                        <li key={reservation.orderId}>
                          <Link
                            className="text-action-primary"
                            to={`/admin/orders/${reservation.orderId}`}
                          >
                            {reservation.orderCode}
                          </Link>{' '}
                          · {reservation.courseTitle} · {formatVnd(reservation.totalAmount)} ·{' '}
                          {reservation.paymentSubmittedAt ? 'đã báo chuyển khoản' : 'chưa báo'}
                        </li>
                      ))}
                    </ul>
                  </details>
                ) : null}
              </div>
            ))}
          </div>
        ) : (
          <EmptyState title="Chưa có mã ưu đãi" />
        )}
        {coupons.data && coupons.data.total > coupons.data.pageSize && (
          <Pagination
            page={coupons.data.page}
            pages={Math.ceil(coupons.data.total / coupons.data.pageSize)}
            onPageChange={setPage}
          />
        )}
      </AdminCard>
      <AdminCard
        title={couponId ? 'Chỉnh sửa coupon' : 'Tạo coupon'}
        description="PERCENT từ 0–100; FIXED là số VND nguyên. Server quyết định discount nào thắng."
      >
        <form className="grid gap-3" onSubmit={(event) => void submit(event)}>
          <AdminField label="Mã" value={code} onChange={setCode} required />
          <div className="grid gap-3 sm:grid-cols-2">
            <AdminSelect
              label="Loại giảm"
              value={discountType}
              onChange={(value) => setDiscountType(value as typeof discountType)}
              options={[
                { value: 'PERCENT', label: 'PERCENT' },
                { value: 'FIXED', label: 'FIXED' },
              ]}
            />
            <AdminField
              label={discountType === 'PERCENT' ? 'Phần trăm' : 'Số tiền VND'}
              value={discountValue}
              onChange={setDiscountValue}
              type="number"
              min={0}
              {...(discountType === 'PERCENT' ? { max: 100 } : {})}
              step={discountType === 'PERCENT' ? 0.01 : 1}
              required
            />
          </div>
          <AdminField
            label="Mức giảm tối đa (để trống nếu không giới hạn)"
            value={maxDiscount}
            onChange={setMaxDiscount}
            type="number"
            min={0}
          />
          <AdminField
            label="Giới hạn sử dụng (để trống nếu không giới hạn)"
            value={usageLimit}
            onChange={setUsageLimit}
            type="number"
            min={1}
          />
          <div className="grid gap-3 sm:grid-cols-2">
            <AdminField
              label="Bắt đầu"
              value={startsAt}
              onChange={setStartsAt}
              type="datetime-local"
            />
            <AdminField
              label="Kết thúc"
              value={expiresAt}
              onChange={setExpiresAt}
              type="datetime-local"
            />
          </div>
          <AdminSelect
            label="Trạng thái"
            value={status}
            onChange={(value) => setStatus(value as typeof status)}
            options={[
              { value: 'ACTIVE', label: 'Đang hoạt động' },
              { value: 'INACTIVE', label: 'Ngừng hoạt động' },
            ]}
          />
          <AdminFeedback error={create.error ?? update.error} success={success} />
          <Button type="submit" loading={create.isPending || update.isPending}>
            {couponId ? 'Lưu coupon' : 'Tạo coupon'}
          </Button>
          {couponId && (
            <Button variant="outline" onClick={reset}>
              Hủy chỉnh sửa
            </Button>
          )}
        </form>
      </AdminCard>
    </div>
  )
}
