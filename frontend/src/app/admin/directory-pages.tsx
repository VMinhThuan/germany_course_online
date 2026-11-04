import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router'
import { useQuery } from '@tanstack/react-query'
import { ChevronRight, ShieldAlert, ShieldCheck } from 'lucide-react'
import { adminRepository } from '@/data/api/admin-repository'
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

export function AdminStudentsPage({ userId }: { userId?: string }) {
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [status, setStatus] = useState('')
  const [success, setSuccess] = useState('')
  const list = useQuery({
    queryKey: ['admin', 'students', search, status, page],
    queryFn: () =>
      adminRepository.listStudents({
        page,
        pageSize: 20,
        ...(search ? { q: search } : {}),
        ...(status ? { status } : {}),
      }),
    enabled: !userId,
    retry: false,
  })
  const detail = useQuery({
    queryKey: ['admin', 'student', userId],
    queryFn: () => adminRepository.getStudent(userId!),
    enabled: Boolean(userId),
    retry: false,
  })
  const setStudentStatus = useAdminMutation(
    ({ userId: id, status: value }: { userId: string; status: 'ACTIVE' | 'BLOCKED' }) =>
      adminRepository.setStudentStatus(id, value),
  )
  if (userId) {
    if (detail.isPending) return <AdminLoading />
    if (detail.isError || !detail.data)
      return (
        <AdminLoadError
          error={detail.error ?? new Error('Không tìm thấy học viên.')}
          retry={() => void detail.refetch()}
        />
      )
    const student = detail.data.user
    async function changeStatus() {
      const next = student.status === 'ACTIVE' ? 'BLOCKED' : 'ACTIVE'
      if (
        !window.confirm(
          next === 'BLOCKED'
            ? 'Khóa tài khoản này? Backend sẽ thu hồi các phiên hoạt động.'
            : 'Mở lại tài khoản học viên này?',
        )
      )
        return
      try {
        await setStudentStatus.mutateAsync({ userId: student.id, status: next })
        setSuccess(
          next === 'BLOCKED'
            ? 'Đã khóa tài khoản; backend đã áp dụng quy tắc thu hồi phiên.'
            : 'Đã mở lại tài khoản.',
        )
      } catch {
        /* API error below */
      }
    }
    return (
      <div className="grid gap-5">
        <AdminCard
          title={student.fullName}
          description={`${student.email} · ${student.phone ?? 'Chưa có số điện thoại'} · tạo ${formatDateTimeInTimezone(student.createdAt)}`}
        >
          <div className="flex flex-wrap items-center gap-3">
            <p
              className={`font-semibold ${student.status === 'ACTIVE' ? 'text-success-foreground' : 'text-danger-foreground'}`}
            >
              {student.status}
            </p>
            <Button
              variant="outline"
              loading={setStudentStatus.isPending}
              onClick={() => void changeStatus()}
              startIcon={
                student.status === 'ACTIVE' ? (
                  <ShieldAlert aria-hidden="true" className="size-4" />
                ) : (
                  <ShieldCheck aria-hidden="true" className="size-4" />
                )
              }
            >
              {student.status === 'ACTIVE' ? 'Khóa tài khoản' : 'Mở lại tài khoản'}
            </Button>
            <Link to="/admin/students" className="text-sm font-semibold text-action-primary">
              Quay lại danh sách
            </Link>
          </div>
          <AdminFeedback error={setStudentStatus.error} success={success} />
        </AdminCard>
        <div className="grid gap-5 xl:grid-cols-2">
          <AdminCard
            title="Enrollment"
            description="Quyền học được kiểm tra từ Enrollment; đơn hàng không cấp quyền trước khi duyệt."
          >
            {detail.data.enrollments.length ? (
              detail.data.enrollments.map((enrollment) => (
                <Link
                  key={enrollment.id}
                  to={`/admin/enrollments/${enrollment.id}`}
                  className="flex justify-between gap-3 rounded-xl border border-border-subtle bg-white p-3"
                >
                  <span>
                    <strong>{enrollment.courseTitle}</strong>
                    <span className="mt-1 block text-xs text-ink-secondary">
                      {enrollment.status} · hết hạn {formatDateTimeInTimezone(enrollment.expiresAt)}
                    </span>
                  </span>
                  <ChevronRight aria-hidden="true" className="size-4" />
                </Link>
              ))
            ) : (
              <EmptyState title="Chưa có enrollment" />
            )}
          </AdminCard>
          <AdminCard title="Đơn hàng gần đây">
            {detail.data.orders.length ? (
              detail.data.orders.map((order) => (
                <Link
                  key={order.id}
                  to={`/admin/orders/${order.id}`}
                  className="flex justify-between gap-3 rounded-xl border border-border-subtle bg-white p-3"
                >
                  <span>
                    <strong>{order.orderCode}</strong>
                    <span className="mt-1 block text-xs text-ink-secondary">
                      {order.courseTitle} · {order.status} ·{' '}
                      {formatDateTimeInTimezone(order.createdAt)}
                    </span>
                  </span>
                  <strong className="text-sm">{formatVnd(order.totalAmount)}</strong>
                </Link>
              ))
            ) : (
              <EmptyState title="Chưa có đơn hàng" />
            )}
          </AdminCard>
        </div>
      </div>
    )
  }

  return (
    <AdminCard
      title="Danh sách học viên"
      description="Tìm theo thông tin tài khoản và xem hồ sơ, quyền học, đơn hàng."
    >
      <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_14rem]">
        <AdminField
          label="Tìm kiếm"
          value={search}
          onChange={(value) => {
            setSearch(value)
            setPage(1)
          }}
          placeholder="Tên hoặc email"
        />
        <AdminSelect
          label="Trạng thái"
          value={status}
          onChange={(value) => {
            setStatus(value)
            setPage(1)
          }}
          options={[
            { value: '', label: 'Tất cả' },
            { value: 'ACTIVE', label: 'Đang hoạt động' },
            { value: 'BLOCKED', label: 'Đã khóa' },
          ]}
        />
      </div>
      {list.isPending ? (
        <AdminLoading />
      ) : list.isError ? (
        <AdminLoadError error={list.error} retry={() => void list.refetch()} />
      ) : list.data?.items.length ? (
        <div className="overflow-x-auto rounded-xl border border-border-subtle">
          <table className="w-full min-w-[680px] text-left text-sm">
            <thead className="bg-surface-muted text-xs uppercase text-ink-secondary">
              <tr>
                <th className="p-3">Học viên</th>
                <th className="p-3">Email</th>
                <th className="p-3">Trạng thái</th>
                <th className="p-3">Ngày tạo</th>
                <th className="p-3">Chi tiết</th>
              </tr>
            </thead>
            <tbody>
              {list.data.items.map((student) => (
                <tr key={student.id} className="border-t border-border-subtle bg-white">
                  <td className="p-3 font-semibold">{student.fullName}</td>
                  <td className="p-3">{student.email}</td>
                  <td className="p-3">{student.status}</td>
                  <td className="p-3">{formatDateTimeInTimezone(student.createdAt)}</td>
                  <td className="p-3">
                    <Link
                      className="font-semibold text-action-primary"
                      to={`/admin/students/${student.id}`}
                    >
                      Mở hồ sơ <ChevronRight aria-hidden="true" className="inline size-4" />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <EmptyState title="Không tìm thấy học viên" />
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

export function AdminEnrollmentsPage({ enrollmentId }: { enrollmentId?: string }) {
  const [now] = useState(() => Date.now())
  const [status, setStatus] = useState('')
  const [page, setPage] = useState(1)
  const [userId, setUserId] = useState('')
  const [courseId, setCourseId] = useState('')
  const [duration, setDuration] = useState('12')
  const [reason, setReason] = useState('')
  const [extension, setExtension] = useState('')
  const [success, setSuccess] = useState('')
  const list = useQuery({
    queryKey: ['admin', 'enrollments', status, page],
    queryFn: () =>
      adminRepository.listEnrollments({ page, pageSize: 20, ...(status ? { status } : {}) }),
    enabled: !enrollmentId,
    retry: false,
  })
  const detail = useQuery({
    queryKey: ['admin', 'enrollment', enrollmentId],
    queryFn: () => adminRepository.getEnrollment(enrollmentId!),
    enabled: Boolean(enrollmentId),
    retry: false,
  })
  const courses = useQuery({
    queryKey: ['admin', 'courses'],
    queryFn: () => adminRepository.listCourses({ status: 'PUBLISHED' }),
    enabled: !enrollmentId,
    retry: false,
  })
  const grant = useAdminMutation(
    ({
      input,
      key,
    }: {
      input: { userId: string; courseId: string; durationMonths: number; reason: string }
      key: string
    }) => adminRepository.grantEnrollment(input, key),
  )
  const revoke = useAdminMutation(
    ({ id, reason: actionReason, key }: { id: string; reason: string; key: string }) =>
      adminRepository.revokeEnrollment(id, actionReason, key),
  )
  const restore = useAdminMutation(
    ({
      id,
      input,
      key,
    }: {
      id: string
      input: { reason: string; extensionMonths?: number }
      key: string
    }) => adminRepository.restoreEnrollment(id, input, key),
  )
  const extend = useAdminMutation(
    ({
      id,
      input,
      key,
    }: {
      id: string
      input: { reason: string; durationMonths: number }
      key: string
    }) => adminRepository.extendEnrollment(id, input, key),
  )
  const idempotency = useStableIdempotencyKey()
  const navigate = useNavigate()

  async function grantAccess(event: FormEvent) {
    event.preventDefault()
    setSuccess('')
    const input = {
      userId: userId.trim(),
      courseId,
      durationMonths: Number(duration),
      reason: reason.trim(),
    }
    try {
      const result = await grant.mutateAsync({ input, key: idempotency.get(input) })
      idempotency.clear()
      setSuccess('Đã cấp enrollment thủ công và ghi audit.')
      navigate(`/admin/enrollments/${result.enrollment.id}`)
    } catch {
      /* API error below */
    }
  }

  if (enrollmentId) {
    if (detail.isPending) return <AdminLoading />
    if (detail.isError || !detail.data)
      return (
        <AdminLoadError
          error={detail.error ?? new Error('Không tìm thấy enrollment.')}
          retry={() => void detail.refetch()}
        />
      )
    const enrollment = detail.data.enrollment
    const expired = enrollment.expiresAt ? Date.parse(enrollment.expiresAt) <= now : true
    async function runAction(kind: 'revoke' | 'restore' | 'extend') {
      if (!reason.trim()) return
      if (
        !window.confirm(
          kind === 'revoke'
            ? 'Thu hồi quyền học này?'
            : kind === 'restore'
              ? 'Khôi phục quyền học này?'
              : 'Gia hạn quyền học này?',
        )
      )
        return
      try {
        if (kind === 'revoke') {
          const input = { id: enrollment.id, reason: reason.trim() }
          await revoke.mutateAsync({ ...input, key: idempotency.get(input) })
          setSuccess('Đã thu hồi quyền học.')
        }
        if (kind === 'restore') {
          const input = {
            reason: reason.trim(),
            ...(expired && extension ? { extensionMonths: Number(extension) } : {}),
          }
          await restore.mutateAsync({ id: enrollment.id, input, key: idempotency.get(input) })
          setSuccess('Đã khôi phục quyền học.')
        }
        if (kind === 'extend') {
          const input = { reason: reason.trim(), durationMonths: Number(duration) }
          await extend.mutateAsync({ id: enrollment.id, input, key: idempotency.get(input) })
          setSuccess('Đã gia hạn quyền học.')
        }
        idempotency.clear()
      } catch {
        /* API error below */
      }
    }
    const actionError = revoke.error ?? restore.error ?? extend.error
    return (
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(20rem,0.7fr)]">
        <AdminCard
          title={`${enrollment.course?.title ?? 'Khóa học'} · enrollment`}
          description={`Học viên ${enrollment.student?.fullName ?? 'không còn hồ sơ'} (${enrollment.student?.email ?? '—'})`}
        >
          <dl className="grid gap-3 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-ink-secondary">Trạng thái</dt>
              <dd className="font-semibold">{enrollment.status}</dd>
            </div>
            <div>
              <dt className="text-ink-secondary">Ngày kích hoạt</dt>
              <dd>
                {enrollment.activatedAt ? formatDateTimeInTimezone(enrollment.activatedAt) : '—'}
              </dd>
            </div>
            <div>
              <dt className="text-ink-secondary">Ngày hết hạn</dt>
              <dd>{enrollment.expiresAt ? formatDateTimeInTimezone(enrollment.expiresAt) : '—'}</dd>
            </div>
            <div>
              <dt className="text-ink-secondary">Đơn nguồn</dt>
              <dd>{enrollment.sourceOrder?.orderCode ?? 'Cấp thủ công'}</dd>
            </div>
          </dl>
          <Link to="/admin/enrollments" className="text-sm font-semibold text-action-primary">
            Quay lại danh sách
          </Link>
        </AdminCard>
        <AdminCard
          title="Điều chỉnh quyền học"
          description="Mọi thao tác cần lý do và ghi vào audit log. Tiến độ hiện có được giữ nguyên."
        >
          <AdminTextArea
            label="Lý do bắt buộc"
            value={reason}
            onChange={setReason}
            rows={3}
            required
          />
          {(enrollment.status === 'REVOKED' || enrollment.status === 'EXPIRED') && expired && (
            <AdminField
              label="Số tháng gia hạn khi khôi phục enrollment đã hết hạn"
              value={extension}
              onChange={setExtension}
              type="number"
              min={1}
              max={120}
              required
            />
          )}
          {enrollment.status !== 'REVOKED' && (
            <AdminField
              label="Số tháng gia hạn"
              value={duration}
              onChange={setDuration}
              type="number"
              min={1}
              max={120}
              required
            />
          )}
          <div className="flex flex-wrap gap-2">
            {enrollment.status === 'ACTIVE' && (
              <Button
                variant="outline"
                loading={revoke.isPending}
                disabled={!reason.trim()}
                onClick={() => void runAction('revoke')}
              >
                Thu hồi
              </Button>
            )}
            {(enrollment.status === 'REVOKED' || enrollment.status === 'EXPIRED') && (
              <Button
                loading={restore.isPending}
                disabled={!reason.trim() || (expired && !extension)}
                onClick={() => void runAction('restore')}
              >
                Khôi phục
              </Button>
            )}
            {enrollment.status === 'ACTIVE' && (
              <Button
                loading={extend.isPending}
                disabled={!reason.trim() || !duration}
                onClick={() => void runAction('extend')}
              >
                Gia hạn
              </Button>
            )}
          </div>
          <AdminFeedback error={actionError} success={success} />
        </AdminCard>
        <AdminCard title="Lịch sử điều chỉnh" className="xl:col-span-2">
          {detail.data.adjustments.length ? (
            <div className="grid gap-2">
              {detail.data.adjustments.map((item) => (
                <div
                  key={item.id}
                  className="grid gap-1 rounded-xl border border-border-subtle bg-white p-3 sm:grid-cols-[12rem_1fr_14rem]"
                >
                  <strong>{item.adjustmentType}</strong>
                  <span className="text-sm text-ink-secondary">
                    {item.reason ?? 'Không có lý do'}
                    {item.durationMonths ? ` · ${item.durationMonths} tháng` : ''}
                  </span>
                  <time className="text-xs text-ink-muted">
                    {item.createdAt ? formatDateTimeInTimezone(item.createdAt) : '—'}
                  </time>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState title="Chưa có lịch sử điều chỉnh" />
          )}
        </AdminCard>
      </div>
    )
  }

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(20rem,0.7fr)]">
      <AdminCard
        title="Enrollment"
        description="Phân biệt trạng thái lưu trong DB và ngày hết hạn hiệu lực; không suy quyền từ đơn hàng."
      >
        <AdminSelect
          label="Lọc trạng thái"
          value={status}
          onChange={(value) => {
            setStatus(value)
            setPage(1)
          }}
          options={[
            { value: '', label: 'Tất cả' },
            { value: 'ACTIVE', label: 'ACTIVE' },
            { value: 'REVOKED', label: 'REVOKED' },
            { value: 'EXPIRED', label: 'EXPIRED' },
          ]}
        />
        {list.isPending ? (
          <AdminLoading />
        ) : list.isError ? (
          <AdminLoadError error={list.error} retry={() => void list.refetch()} />
        ) : list.data?.items.length ? (
          <div className="grid gap-2">
            {list.data.items.map((item) => (
              <Link
                key={item.id}
                to={`/admin/enrollments/${item.id}`}
                className="flex items-center justify-between gap-3 rounded-xl border border-border-subtle bg-white p-3 hover:border-action-primary"
              >
                <span>
                  <strong>
                    {item.student?.fullName ?? item.student?.email ?? 'Học viên không còn tồn tại'}
                  </strong>
                  <span className="mt-1 block text-xs text-ink-secondary">
                    {item.course?.title ?? 'Khóa học không còn tồn tại'} · {item.status} ·{' '}
                    {item.expiresAt ? formatDateTimeInTimezone(item.expiresAt) : '—'}
                  </span>
                </span>
                <ChevronRight aria-hidden="true" className="size-4" />
              </Link>
            ))}
          </div>
        ) : (
          <EmptyState title="Không có enrollment" />
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
      <AdminCard
        title="Cấp quyền học thủ công"
        description="Tạo enrollment trực tiếp; không tạo đơn hàng đã thanh toán giả."
      >
        <form className="grid gap-3" onSubmit={(event) => void grantAccess(event)}>
          <AdminField label="Student User ID" value={userId} onChange={setUserId} required />
          <AdminSelect
            label="Khóa học"
            value={courseId}
            onChange={setCourseId}
            options={[
              { value: '', label: 'Chọn khóa học' },
              ...(courses.data?.items ?? []).map((course) => ({
                value: course.id,
                label: `${course.code} · ${course.title}`,
              })),
            ]}
          />
          <AdminField
            label="Thời hạn (tháng)"
            value={duration}
            onChange={setDuration}
            type="number"
            min={1}
            max={120}
            required
          />
          <AdminTextArea
            label="Lý do bắt buộc"
            value={reason}
            onChange={setReason}
            rows={3}
            required
          />
          <AdminFeedback error={grant.error} success={success} />
          <Button type="submit" loading={grant.isPending} disabled={!courseId}>
            Cấp enrollment
          </Button>
        </form>
        {courses.isError && <AdminFeedback error={courses.error} />}
      </AdminCard>
    </div>
  )
}
