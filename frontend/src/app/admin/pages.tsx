import { Link, useLocation } from 'react-router'
import { useQuery } from '@tanstack/react-query'
import {
  Activity,
  BookOpenText,
  CircleDollarSign,
  GraduationCap,
  PackageCheck,
  UsersRound,
} from 'lucide-react'
import { adminRepository } from '@/data/api/admin-repository'
import { formatVnd } from '@/shared/lib/format'
import { Card, EmptyState } from '@/shared/ui'
import { AdminCard, AdminLayout, AdminLoadError, AdminLoading } from './shared'
import { AdminCoursesPage, AdminExerciseEditorPage } from './catalog-pages'
import {
  AdminCourseEditorPage,
  AdminExercisesPage,
  AdminLessonDetailPage,
  AdminLessonsPage,
  AdminSectionEditorPage,
  AdminSectionsPage,
} from './content-management-pages'
import { AdminEnrollmentsPage, AdminStudentsPage } from './directory-pages'
import { AdminCouponsPage, AdminOrdersPage, AdminRenewalPlansPage } from './commerce-pages'
import { AdminAuditLogsPage, AdminMediaPage, AdminSettingsPage } from './media-settings-pages'

function Metric({ label, value, icon }: { label: string; value: number; icon: React.ReactNode }) {
  return (
    <Card className="flex items-center gap-4 p-5">
      <span className="grid size-11 place-items-center rounded-2xl bg-surface-blue text-action-primary">
        {icon}
      </span>
      <span>
        <span className="block text-2xl font-extrabold">{value.toLocaleString('vi-VN')}</span>
        <span className="text-sm text-ink-secondary">{label}</span>
      </span>
    </Card>
  )
}

export function AdminDashboardPage() {
  const summary = useQuery({
    queryKey: ['admin', 'dashboard-summary'],
    queryFn: async () => {
      const [courses, students, enrollments, pendingOrders, recentOrders] = await Promise.all([
        adminRepository.listCourses(),
        adminRepository.listStudents(),
        adminRepository.listEnrollments(),
        adminRepository.listOrders({ status: 'PENDING' }),
        adminRepository.listOrders({ pageSize: 8 }),
      ])
      return { courses, students, enrollments, pendingOrders, recentOrders }
    },
    retry: false,
  })
  return (
    <AdminLayout
      title="Tổng quan"
      description="Xem nhanh tình hình khóa học, học viên và đơn hàng."
    >
      {summary.isPending ? (
        <AdminLoading />
      ) : summary.isError ? (
        <AdminLoadError error={summary.error} retry={() => void summary.refetch()} />
      ) : (
        <div className="grid gap-5">
          <section
            aria-label="Số liệu quản trị"
            className="grid gap-3 sm:grid-cols-2 2xl:grid-cols-4"
          >
            <Metric
              label="Khóa học"
              value={summary.data.courses.total}
              icon={<BookOpenText aria-hidden="true" className="size-5" />}
            />
            <Metric
              label="Học viên"
              value={summary.data.students.total}
              icon={<UsersRound aria-hidden="true" className="size-5" />}
            />
            <Metric
              label="Enrollment"
              value={summary.data.enrollments.total}
              icon={<GraduationCap aria-hidden="true" className="size-5" />}
            />
            <Metric
              label="Đơn PENDING"
              value={summary.data.pendingOrders.total}
              icon={<CircleDollarSign aria-hidden="true" className="size-5" />}
            />
          </section>
          <div className="grid gap-5 xl:grid-cols-[minmax(0,1.2fr)_minmax(18rem,0.8fr)]">
            <AdminCard
              title="Đơn hàng gần đây"
              description="Tình trạng báo chuyển khoản chỉ là tín hiệu của học viên; Admin cần tự đối soát tiền thật ngoài ngân hàng."
            >
              {summary.data.recentOrders.items.length ? (
                <div className="grid gap-2">
                  {summary.data.recentOrders.items.map(({ order, student, course }) => (
                    <Link
                      key={order.id}
                      to={`/admin/orders/${order.id}`}
                      className="grid gap-2 rounded-xl border border-border-subtle bg-white p-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center"
                    >
                      <span>
                        <strong>{order.orderCode}</strong>
                        <span className="mt-1 block text-xs text-ink-secondary">
                          {student?.email ?? '—'} · {course.title} · {order.status} ·{' '}
                          {order.paymentSubmittedAt ? 'đã báo chuyển khoản' : 'chưa báo'}
                        </span>
                      </span>
                      <span className="text-sm font-semibold">{formatVnd(order.totalAmount)}</span>
                    </Link>
                  ))}
                </div>
              ) : (
                <EmptyState title="Chưa có đơn hàng" />
              )}
            </AdminCard>
            <AdminCard title="Lối tắt" description="Mở nhanh những việc quản lý thường dùng.">
              <div className="grid gap-2">
                <Link
                  to="/admin/courses"
                  className="flex min-h-12 items-center gap-3 rounded-xl bg-surface-muted p-3 text-sm font-semibold hover:bg-surface-blue"
                >
                  <BookOpenText aria-hidden="true" className="size-4 text-action-primary" />
                  Quản lý khóa học
                </Link>
                <Link
                  to="/admin/orders"
                  className="flex min-h-12 items-center gap-3 rounded-xl bg-surface-muted p-3 text-sm font-semibold hover:bg-surface-blue"
                >
                  <PackageCheck aria-hidden="true" className="size-4 text-action-primary" />
                  Đối soát đơn hàng
                </Link>
                <Link
                  to="/admin/audit-logs"
                  className="flex min-h-12 items-center gap-3 rounded-xl bg-surface-muted p-3 text-sm font-semibold hover:bg-surface-blue"
                >
                  <Activity aria-hidden="true" className="size-4 text-action-primary" />
                  Audit log
                </Link>
              </div>
            </AdminCard>
          </div>
        </div>
      )}
    </AdminLayout>
  )
}

function titleFor(path: string) {
  if (path.startsWith('/admin/courses')) return 'Khóa học'
  if (path.startsWith('/admin/sections')) return 'Chương'
  if (path.startsWith('/admin/lessons')) return 'Bài học'
  if (path.startsWith('/admin/exercises')) return 'Bài tập'
  if (path.startsWith('/admin/media')) return 'Thư viện tệp'
  if (path.startsWith('/admin/students')) return 'Quản lý học viên'
  if (path.startsWith('/admin/enrollments')) return 'Quản lý quyền học'
  if (path.startsWith('/admin/orders')) return 'Kiểm duyệt đơn hàng'
  if (path.startsWith('/admin/renewal-plans')) return 'Gói gia hạn'
  if (path.startsWith('/admin/coupons')) return 'Mã ưu đãi'
  if (path.startsWith('/admin/settings')) return 'Cài đặt website'
  if (path.startsWith('/admin/audit-logs')) return 'Nhật ký quản trị'
  return 'Không tìm thấy trang'
}

export function AdminWorkspacePage() {
  const location = useLocation()
  const parts = location.pathname.split('/').filter(Boolean)
  const segment = parts[1]
  const title = titleFor(location.pathname)
  let content: React.ReactNode

  if (segment === 'courses') {
    if (parts.length === 2) content = <AdminCoursesPage />
    else if (parts.length === 3) content = <AdminCourseEditorPage courseId={parts[2]!} />
    else if (parts.length === 5 && parts[3] === 'sections')
      content = <AdminSectionEditorPage courseId={parts[2]!} sectionId={parts[4]!} />
    else if (parts.length === 7 && parts[3] === 'sections' && parts[5] === 'lessons')
      content = (
        <AdminLessonDetailPage courseId={parts[2]!} sectionId={parts[4]!} lessonId={parts[6]!} />
      )
    else if (
      parts.length === 9 &&
      parts[3] === 'sections' &&
      parts[5] === 'lessons' &&
      parts[7] === 'exercises'
    )
      content = (
        <AdminExerciseEditorPage
          courseId={parts[2]!}
          sectionId={parts[4]!}
          lessonId={parts[6]!}
          exerciseId={parts[8]!}
        />
      )
  } else if (segment === 'sections' && parts.length === 2) content = <AdminSectionsPage />
  else if (segment === 'lessons' && parts.length === 2) content = <AdminLessonsPage />
  else if (segment === 'exercises' && parts.length === 2) content = <AdminExercisesPage />
  else if (segment === 'media' && parts.length === 2) content = <AdminMediaPage />
  else if (segment === 'students')
    content = <AdminStudentsPage {...(parts[2] ? { userId: parts[2] } : {})} />
  else if (segment === 'enrollments')
    content = <AdminEnrollmentsPage {...(parts[2] ? { enrollmentId: parts[2] } : {})} />
  else if (segment === 'orders')
    content = <AdminOrdersPage {...(parts[2] ? { orderId: parts[2] } : {})} />
  else if (segment === 'renewal-plans' && parts.length === 2) content = <AdminRenewalPlansPage />
  else if (segment === 'coupons' && parts.length === 2) content = <AdminCouponsPage />
  else if (segment === 'settings' && parts.length === 2) content = <AdminSettingsPage />
  else if (segment === 'audit-logs' && parts.length === 2) content = <AdminAuditLogsPage />

  return (
    <AdminLayout
      title={title}
      {...(['courses', 'sections', 'lessons', 'exercises'].includes(segment ?? '')
        ? { description: 'Quản lý nội dung theo thứ tự khóa học → chương → bài học → bài tập.' }
        : {})}
    >
      {content ?? (
        <AdminCard title="Không tìm thấy trang quản trị">
          <p className="text-sm text-ink-secondary">Đường dẫn Admin này chưa được hỗ trợ.</p>
          <Link to="/admin" className="font-semibold text-action-primary">
            Về tổng quan
          </Link>
        </AdminCard>
      )}
    </AdminLayout>
  )
}
