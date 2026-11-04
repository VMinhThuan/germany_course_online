import { useEffect, useState, type ReactNode } from 'react'
import { ArrowRight, BookOpenText, GraduationCap } from 'lucide-react'
import { Link } from 'react-router'
import { useAuthSession } from '@/app/auth/auth-session'
import { useStudentCourses, useStudentDashboard } from '@/data/student-demo/queries'
import type { StudentCourseRecord } from '@/data/student-demo/types'
import { StudentShell } from '@/shared/layouts/shells'
import { formatDateTimeInTimezone } from '@/shared/lib/format'
import { setBrandPageTitle } from '@/config/brand'
import { AccessStatePanel, EnrollmentStatusCard, CourseProgressStrip } from '@/domains'
import type { CourseAccessViewModel } from '@/domains/catalog/models'
import {
  Badge,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Container,
  EmptyState,
  ErrorState,
  LinkButton,
  PageHeader,
  Pagination,
  SectionHeader,
  Skeleton,
} from '@/shared/ui'

function usePageTitle(title: string) {
  useEffect(() => setBrandPageTitle(title), [title])
}

function accessView(record: StudentCourseRecord): CourseAccessViewModel {
  if (record.enrollment.status === 'REVOKED' || record.enrollment.accessState === 'revoked') {
    return {
      kind: 'restricted',
      label: 'Quyền học đã bị thu hồi',
      reason: 'Enrollment bị thu hồi cần Admin khôi phục trước khi học tiếp.',
    }
  }
  if (record.enrollment.accessState === 'expired-display') {
    return {
      kind: 'expired-display',
      label: 'Enrollment còn lưu nhưng đã hết hạn',
      expiresAt: record.enrollment.expiresAt,
    }
  }
  return { kind: 'available', label: 'Quyền học đang hoạt động' }
}

export function ProductStudentLayout({ children }: { children: ReactNode }) {
  const { session, logout } = useAuthSession()
  return (
    <StudentShell
      productMode
      displayName={session?.profile.displayName || session?.profile.email || 'Học viên'}
      onLogout={logout}
    >
      {children}
    </StudentShell>
  )
}

function Loading() {
  return (
    <div role="status" aria-label="Đang tải dữ liệu học viên" className="grid gap-5">
      <Skeleton className="h-28 w-full" />
      <Skeleton className="h-64 w-full" />
    </div>
  )
}

function CourseAccessCard({ record }: { record: StudentCourseRecord }) {
  const access = accessView(record)
  const enrollment = record.enrollment
  const canLearn = access.kind === 'available'
  const canRenew = enrollment.status === 'ACTIVE' && access.kind === 'expired-display'
  return (
    <Card>
      <CardContent className="grid gap-4 p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.12em] text-action-primary">
              {enrollment.status === 'REVOKED'
                ? 'Đã thu hồi'
                : access.kind === 'expired-display'
                  ? 'Đã hết hạn'
                  : 'Đang hoạt động'}
            </p>
            <h3 className="mt-1 font-display text-xl font-bold">{enrollment.courseTitle}</h3>
            <p className="mt-1 text-sm text-ink-secondary">
              Hết hạn: {formatDateTimeInTimezone(enrollment.expiresAt)}
            </p>
          </div>
          <Badge
            tone={canLearn ? 'success' : enrollment.status === 'REVOKED' ? 'danger' : 'warning'}
          >
            {canLearn
              ? 'Có thể học'
              : enrollment.status === 'REVOKED'
                ? 'Cần Admin khôi phục'
                : 'Cần gia hạn'}
          </Badge>
        </div>
        <AccessStatePanel access={access} />
        {record.progress && (
          <CourseProgressStrip label="Tiến độ do máy chủ tính" value={record.progress.percent} />
        )}
        <EnrollmentStatusCard enrollment={enrollment} />
        <div className="flex flex-wrap gap-3">
          {canLearn && (
            <LinkButton to={`/learn/courses/${enrollment.courseId}`}>
              Tiếp tục học <ArrowRight aria-hidden="true" />
            </LinkButton>
          )}
          {canRenew && (
            <LinkButton to={`/student/courses/${enrollment.courseId}/renew`} variant="outline">
              Xem gói gia hạn
            </LinkButton>
          )}
          {enrollment.status === 'REVOKED' && (
            <p className="self-center text-sm text-ink-secondary">
              Liên hệ Admin để khôi phục enrollment.
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

function EmptyCourses() {
  return (
    <EmptyState
      icon={<BookOpenText aria-hidden="true" className="size-6" />}
      title="Chưa có khóa học được kích hoạt"
      description="Sau khi Admin duyệt đơn, khóa học sẽ xuất hiện tại đây. Bạn có thể xem các khóa học đang mở."
      action={
        <LinkButton to="/courses" variant="outline">
          Khám phá khóa học
        </LinkButton>
      }
    />
  )
}

export function StudentDashboardPage() {
  usePageTitle('Tổng quan học viên')
  const { session } = useAuthSession()
  const dashboard = useStudentDashboard(session?.id ?? '')
  return (
    <ProductStudentLayout>
      <Container className="grid gap-8 py-6 sm:py-9">
        {dashboard.isPending ? (
          <Loading />
        ) : dashboard.isError ? (
          <>
            <PageHeader eyebrow="Không gian học viên" title="Tổng quan học tập" />
            <ErrorState
              title="Chưa tải được tổng quan"
              description="Máy chủ chưa trả về dữ liệu học viên. Kiểm tra API rồi thử lại."
              onRetry={() => void dashboard.refetch()}
            />
          </>
        ) : dashboard.data ? (
          <>
            <Card className="overflow-hidden border-transparent bg-[linear-gradient(112deg,var(--brand-blue),#f8fdfe_68%)] shadow-soft">
              <CardContent className="flex flex-col gap-5 p-5 sm:flex-row sm:items-end sm:justify-between sm:p-7">
                <div className="max-w-2xl space-y-3">
                  <Badge tone="brand">Không gian học viên</Badge>
                  <h1 className="font-display text-3xl font-extrabold tracking-tight sm:text-4xl">
                    Chào {dashboard.data.profile.displayName || dashboard.data.profile.email}
                  </h1>
                  <p className="max-w-xl leading-6 text-ink-secondary">
                    Theo dõi quyền truy cập, tiến độ và các khóa học đã được kích hoạt.
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2 rounded-2xl border border-white/80 bg-white/70 px-4 py-3 text-sm font-semibold text-ink-secondary">
                  <GraduationCap aria-hidden="true" className="size-5 text-action-primary" />
                  <span>{dashboard.data.courses.length} khóa học</span>
                </div>
              </CardContent>
            </Card>
            <div className="grid gap-8 xl:grid-cols-[minmax(0,1.4fr)_minmax(18rem,0.7fr)]">
              <div className="grid content-start gap-4">
                <SectionHeader
                  title="Khóa học của tôi"
                  description="Enrollment và phần trăm tiến độ lấy từ backend."
                  action={
                    <LinkButton to="/student/courses" variant="outline" size="sm">
                      Xem tất cả <ArrowRight aria-hidden="true" />
                    </LinkButton>
                  }
                />
                {dashboard.data.courses.length ? (
                  dashboard.data.courses.map((record) => (
                    <CourseAccessCard key={record.enrollment.id} record={record} />
                  ))
                ) : (
                  <EmptyCourses />
                )}
              </div>
              <aside className="grid content-start gap-4">
                <Card>
                  <CardHeader>
                    <p className="text-xs font-bold uppercase tracking-[0.14em] text-action-primary">
                      Bắt đầu
                    </p>
                    <CardTitle className="text-xl">Khám phá lộ trình</CardTitle>
                  </CardHeader>
                  <CardContent className="grid gap-3">
                    <p className="text-sm leading-6 text-ink-secondary">
                      Thông tin công khai có thể xem trước. Bài học riêng chỉ mở sau khi máy chủ xác
                      nhận enrollment còn hiệu lực.
                    </p>
                    <LinkButton to="/courses" className="w-full justify-center">
                      Xem khóa học <ArrowRight aria-hidden="true" />
                    </LinkButton>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-5">
                    <p className="text-sm font-semibold">Tiến độ được đồng bộ</p>
                    <p className="mt-1 text-sm leading-6 text-ink-secondary">
                      Hoàn thành bài học, bài tập và quiz sẽ cập nhật từ dữ liệu máy chủ.
                    </p>
                  </CardContent>
                </Card>
              </aside>
            </div>
          </>
        ) : null}
      </Container>
    </ProductStudentLayout>
  )
}

export function StudentCoursesPage() {
  usePageTitle('Khóa học của tôi')
  const { session } = useAuthSession()
  const [page, setPage] = useState(1)
  const courses = useStudentCourses(session?.id ?? '', page)
  return (
    <ProductStudentLayout>
      <Container className="grid gap-8 py-6 sm:py-9">
        <PageHeader
          eyebrow="Không gian học viên"
          title="Khóa học của tôi"
          description="Theo dõi trạng thái enrollment, thời hạn và tiến độ do máy chủ trả về."
          actions={
            <LinkButton to="/courses" variant="outline">
              Khám phá khóa học
            </LinkButton>
          }
        />
        <SectionHeader title="Enrollment" description="Đơn hàng chờ duyệt không cấp quyền học." />
        {courses.isPending ? (
          <Loading />
        ) : courses.isError ? (
          <ErrorState
            title="Chưa tải được khóa học"
            description="Máy chủ chưa trả về danh sách enrollment."
            onRetry={() => void courses.refetch()}
          />
        ) : courses.data?.items.length ? (
          <div className="grid gap-5">
            {courses.data.items.map((record) => (
              <CourseAccessCard key={record.enrollment.id} record={record} />
            ))}
          </div>
        ) : (
          <EmptyCourses />
        )}
        {courses.data && courses.data.total > courses.data.pageSize && (
          <Pagination
            page={courses.data.page}
            pages={Math.ceil(courses.data.total / courses.data.pageSize)}
            onPageChange={setPage}
          />
        )}
        <div className="flex justify-start">
          <Link
            to="/student"
            className="inline-flex min-h-10 items-center text-sm font-semibold text-action-primary"
          >
            Về tổng quan <ArrowRight aria-hidden="true" className="ml-1 size-4" />
          </Link>
        </div>
      </Container>
    </ProductStudentLayout>
  )
}
