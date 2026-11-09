import { useEffect, useState, type ReactNode } from 'react'
import { ArrowRight, BookOpenText } from 'lucide-react'
import { Link } from 'react-router'
import { useAuthSession } from '@/app/auth/auth-session'
import { useStudentCourses, useStudentDashboard } from '@/data/student-demo/queries'
import { useProductCourse } from '@/data/student-demo/product-queries'
import type { StudentLearningCourseViewModel } from '@/data/student-demo/product-types'
import type { StudentCourseRecord } from '@/data/student-demo/types'
import { StudentShell } from '@/shared/layouts/shells'
import { formatDateInTimezone } from '@/shared/lib/format'
import { setBrandPageTitle } from '@/config/brand'
import type { CourseAccessViewModel } from '@/domains/catalog/models'
import { DecorativeHeading } from '@/domains/shared/decorative-heading'
import {
  Card,
  CardContent,
  Container,
  EmptyState,
  ErrorState,
  LinkButton,
  PageHeader,
  Pagination,
  Progress,
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

function courseLearningSummary(course: StudentLearningCourseViewModel) {
  const lessons = course.tree.sections
    .flatMap((section) => section.lessons)
    .filter((lesson) => lesson.countsTowardProgress)
  const completed = lessons.filter((lesson) => lesson.progressStatus === 'COMPLETED').length
  const currentLesson =
    lessons.find((lesson) => lesson.progressStatus === 'IN_PROGRESS') ??
    lessons.find((lesson) => lesson.progressStatus !== 'COMPLETED')
  return {
    lessons,
    completed,
    currentLesson,
    percent: lessons.length ? (completed / lessons.length) * 100 : 0,
  }
}

function StudentCourseCard({ record }: { record: StudentCourseRecord }) {
  const { session } = useAuthSession()
  const access = accessView(record)
  const enrollment = record.enrollment
  const canLearn = access.kind === 'available'
  const canRenew = enrollment.status === 'ACTIVE' && access.kind === 'expired-display'
  const course = useProductCourse(session?.id ?? '', enrollment.courseId)
  const summary = course.data ? courseLearningSummary(course.data) : undefined
  const currentLesson = summary?.currentLesson
  return (
    <Card>
      <CardContent className="grid gap-4 p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="font-display text-xl font-bold">
              {course.data?.course.title ?? enrollment.courseTitle}
            </h3>
            <p className="mt-1 text-sm text-ink-secondary">
              Hết hạn: {formatDateInTimezone(enrollment.expiresAt)}
            </p>
          </div>
          {canRenew && (
            <LinkButton
              to={`/student/courses/${enrollment.courseId}/renew`}
              variant="outline"
              size="sm"
            >
              Gia hạn
            </LinkButton>
          )}
        </div>
        {course.isPending ? (
          <Skeleton className="h-10 w-full" />
        ) : summary ? (
          <div className="grid gap-3">
            {summary.lessons.length > 0 && (
              <Progress
                value={summary.percent}
                label={`${summary.completed}/${summary.lessons.length} bài đã hoàn thành`}
              />
            )}
            <p className="text-sm text-ink-secondary">
              {currentLesson
                ? `Bài đang học: ${currentLesson.title}`
                : summary.lessons.length
                  ? 'Đã hoàn thành khóa học'
                  : 'Chưa có bài học'}
            </p>
          </div>
        ) : (
          <p className="text-sm text-ink-muted">Chưa tải được tiến độ bài học.</p>
        )}
        {canLearn && (
          <div>
            <LinkButton
              to={
                currentLesson
                  ? `/learn/lessons/${currentLesson.id}`
                  : `/learn/courses/${enrollment.courseId}`
              }
            >
              {currentLesson ? 'Tiếp tục học' : 'Xem lộ trình'} <ArrowRight aria-hidden="true" />
            </LinkButton>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function EmptyCourses() {
  return (
    <EmptyState
      icon={<BookOpenText aria-hidden="true" className="size-6" />}
      title="Chưa có khóa học"
      description="Khám phá các khóa học để bắt đầu lộ trình tiếng Đức của bạn."
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
      <Container className="grid gap-8 pt-2 pb-6 sm:pt-3 sm:pb-9">
        {dashboard.isPending ? (
          <Loading />
        ) : dashboard.isError ? (
          <>
            <PageHeader
              eyebrow=""
              title="Tổng quan học tập"
              heading={<DecorativeHeading text="Tổng quan học tập" level={1} size="md" />}
            />
            <ErrorState
              title="Chưa tải được tổng quan"
              description="Hãy thử tải lại sau ít phút."
              onRetry={() => void dashboard.refetch()}
            />
          </>
        ) : dashboard.data ? (
          <>
            <PageHeader
              eyebrow=""
              title="Tổng quan học tập"
              heading={<DecorativeHeading text="Tổng quan học tập" level={1} size="md" />}
            />
            <SectionHeader
              title="Khóa học của tôi"
              action={
                <LinkButton to="/student/courses" variant="outline" size="sm">
                  Xem tất cả <ArrowRight aria-hidden="true" />
                </LinkButton>
              }
            />
            {dashboard.data.courses.length ? (
              <div className="grid gap-4 xl:grid-cols-2">
                {dashboard.data.courses.map((record) => (
                  <StudentCourseCard key={record.enrollment.id} record={record} />
                ))}
              </div>
            ) : (
              <EmptyCourses />
            )}
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
      <Container className="grid gap-8 pt-2 pb-6 sm:pt-3 sm:pb-9">
        <PageHeader
          eyebrow=""
          title="Khóa học của tôi"
          heading={<DecorativeHeading text="Khóa học của tôi" level={1} size="md" />}
          actions={
            <LinkButton to="/courses" variant="outline">
              Khám phá khóa học
            </LinkButton>
          }
        />
        {courses.isPending ? (
          <Loading />
        ) : courses.isError ? (
          <ErrorState
            title="Chưa tải được khóa học"
            description="Hãy thử tải lại sau ít phút."
            onRetry={() => void courses.refetch()}
          />
        ) : courses.data?.items.length ? (
          <div className="grid gap-5">
            {courses.data.items.map((record) => (
              <StudentCourseCard key={record.enrollment.id} record={record} />
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
