import { useEffect, type ReactNode } from 'react'
import { ArrowRight, BookOpenText, GraduationCap, Sparkles } from 'lucide-react'
import { DEMO_COURSE_SLUG } from '@/data/student-demo/fixtures'
import { useStudentCourses, useStudentDashboard } from '@/data/student-demo/queries'
import type { StudentCourseRecord } from '@/data/student-demo/types'
import { useAuthSession } from '@/app/auth/auth-session'
import { usePublicCourse } from '@/data/public-demo'
import { StudentShell } from '@/shared/layouts/shells'
import {
  AccessStatePanel,
  ContinueLearningCard,
  CourseCard,
  CourseProgressCard,
  EnrollmentStatusCard,
  LearningProgressSummary,
} from '@/domains'
import type { CourseAccessViewModel } from '@/domains/catalog/models'
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Container,
  EmptyState,
  ErrorState,
  LinkButton,
  PageHeader,
  SectionHeader,
  Skeleton,
} from '@/shared/ui'
import { formatDateTimeInTimezone } from '@/shared/lib/format'

function usePageTitle(title: string) {
  useEffect(() => {
    document.title = `${title} · Deutsch A1.1`
  }, [title])
}

function StudentLoading({ courses = false }: { courses?: boolean }) {
  return (
    <div
      className="grid gap-5"
      role="status"
      aria-live="polite"
      aria-label={courses ? 'Đang tải khóa học' : 'Đang tải tổng quan'}
    >
      <Skeleton className="h-28 w-full" />
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,0.8fr)]">
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    </div>
  )
}

function getAccessView(record: StudentCourseRecord): CourseAccessViewModel {
  if (record.enrollment.status === 'REVOKED' || record.enrollment.accessState === 'revoked') {
    return {
      kind: 'restricted',
      label: 'Enrollment đã bị thu hồi',
      reason: 'Bản demo không mở nội dung khóa học cho enrollment đã bị thu hồi.',
    }
  }
  if (record.enrollment.accessState === 'expired-display') {
    return {
      kind: 'expired-display',
      label: 'Quyền truy cập đã hết hạn',
      expiresAt: formatDateTimeInTimezone(record.enrollment.expiresAt),
    }
  }
  return { kind: 'available', label: 'Đang hoạt động · dữ liệu demo' }
}

function ProductStudentLayout({ children }: { children: ReactNode }) {
  const { session, logout } = useAuthSession()
  return (
    <StudentShell
      productMode
      displayName={session?.profile.displayName || session?.profile.email || 'Học viên demo'}
      onLogout={logout}
    >
      {children}
    </StudentShell>
  )
}

function StudentIntro({ displayName, courseCount }: { displayName: string; courseCount: number }) {
  return (
    <Card className="overflow-hidden border-transparent bg-[linear-gradient(112deg,var(--brand-blue),#f8fdfe_68%)] shadow-soft">
      <CardContent className="flex flex-col gap-5 p-5 sm:flex-row sm:items-end sm:justify-between sm:p-7">
        <div className="max-w-2xl space-y-3">
          <Badge tone="preview">Tài khoản demo</Badge>
          <h1 className="font-display text-3xl font-extrabold tracking-tight sm:text-4xl">
            Chào {displayName}, hôm nay mình học gì?
          </h1>
          <p className="max-w-xl leading-6 text-ink-secondary">
            {courseCount > 0
              ? `Bạn có ${courseCount} khóa học trong dữ liệu mẫu. Nội dung bài học đầy đủ chưa được mở trong phase này.`
              : 'Bạn có thể khám phá khóa A1.1 hoặc thử một chương học miễn phí ngay trên website.'}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2 rounded-2xl border border-white/80 bg-white/70 px-4 py-3 text-sm font-semibold text-ink-secondary">
          <GraduationCap aria-hidden="true" className="size-5 text-action-primary" />
          <span>{courseCount === 0 ? 'Chưa có khóa học' : `${courseCount} khóa học`}</span>
        </div>
      </CardContent>
    </Card>
  )
}

function CourseLoadingCard() {
  return <Skeleton className="h-72 w-full" />
}

export function StudentDashboardPage() {
  usePageTitle('Tổng quan học viên')
  const { session } = useAuthSession()
  const dashboard = useStudentDashboard(session?.id ?? '')
  const courseQuery = usePublicCourse(DEMO_COURSE_SLUG)
  const course = courseQuery.data
  const firstRecord = dashboard.data?.courses[0]

  return (
    <ProductStudentLayout>
      <Container className="grid gap-8 py-6 sm:py-9">
        {dashboard.isPending ? (
          <StudentLoading />
        ) : dashboard.isError ? (
          <>
            <PageHeader eyebrow="Không gian học demo" title="Tổng quan học tập" />
            <ErrorState
              title="Chưa tải được tổng quan học tập"
              description="Dịch vụ dữ liệu demo gặp sự cố. Hãy thử tải lại để khôi phục nội dung."
              onRetry={() => void dashboard.refetch()}
            />
          </>
        ) : dashboard.data ? (
          <>
            <StudentIntro
              displayName={dashboard.data.profile.displayName || dashboard.data.profile.email}
              courseCount={dashboard.data.courses.length}
            />

            <div className="grid gap-8 xl:grid-cols-[minmax(0,1.45fr)_minmax(18rem,0.75fr)]">
              <div className="grid content-start gap-8">
                {firstRecord && (
                  <section className="grid gap-4" aria-labelledby="continue-learning-title">
                    <SectionHeader
                      title="Tiếp tục làm quen"
                      description="Chỉ liên kết tới nội dung công khai đã có trong demo."
                    />
                    <ContinueLearningCard
                      courseTitle="Tiếng Đức A1.1"
                      lessonTitle="Mở chương học thử · Guten Tag!"
                      lastAccessedLabel="Bài học đầy đủ chưa được triển khai."
                      href={`/courses/${firstRecord.courseSlug}/preview`}
                    />
                    <InlineAccessNote record={firstRecord} />
                  </section>
                )}

                <section className="grid gap-4" aria-labelledby="dashboard-courses-title">
                  <SectionHeader
                    title="Khóa học của tôi"
                    description="Trạng thái enrollment và tiến độ được trả về từ repository demo."
                    action={
                      <LinkButton to="/student/courses" variant="outline" size="sm">
                        Xem tất cả <ArrowRight aria-hidden="true" />
                      </LinkButton>
                    }
                  />
                  {dashboard.data.courses.length === 0 ? (
                    <EmptyState
                      icon={<BookOpenText aria-hidden="true" className="size-6" />}
                      title="Chưa có khóa học được kích hoạt"
                      description="Tài khoản demo này chưa có enrollment. Thông tin học phí và đăng ký chưa được mở."
                      action={
                        <LinkButton to="/courses" variant="outline">
                          Khám phá khóa học
                        </LinkButton>
                      }
                    />
                  ) : courseQuery.isPending ? (
                    <CourseLoadingCard />
                  ) : courseQuery.isError || !course ? (
                    <ErrorState
                      title="Chưa tải được thông tin khóa học"
                      description="Bạn vẫn có thể thử tải lại thông tin khóa học công khai."
                      onRetry={() => void courseQuery.refetch()}
                    />
                  ) : (
                    dashboard.data.courses.map((record) => (
                      <div
                        key={record.enrollment.id}
                        className="grid gap-4 md:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]"
                      >
                        <CourseCard
                          course={course}
                          access={getAccessView(record)}
                          href={`/courses/${record.courseSlug}`}
                        />
                        <div className="grid content-start gap-4">
                          <AccessStatePanel access={getAccessView(record)} />
                          {record.progress ? (
                            <LearningProgressSummary progress={record.progress} />
                          ) : (
                            <p className="rounded-xl bg-surface-muted p-4 text-sm text-ink-secondary">
                              Chưa có tiến độ học tập được ghi nhận.
                            </p>
                          )}
                          <EnrollmentStatusCard enrollment={record.enrollment} />
                        </div>
                      </div>
                    ))
                  )}
                </section>
              </div>

              <aside className="grid content-start gap-4" aria-label="Gợi ý bước tiếp theo">
                <Card>
                  <CardHeader>
                    <p className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-action-primary">
                      <Sparkles aria-hidden="true" className="size-4" />
                      Bước tiếp theo
                    </p>
                    <CardTitle className="text-xl">
                      {firstRecord ? 'Khám phá một bài học mẫu' : 'Chọn nơi bắt đầu'}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="grid gap-3">
                    <p className="text-sm leading-6 text-ink-secondary">
                      {firstRecord
                        ? 'Bạn có thể xem lại chương công khai. Nội dung trả phí, video và bài học đầy đủ không nằm trong phase này.'
                        : 'Thử chương học miễn phí hoặc xem cấu trúc khóa A1.1 trước khi quyết định bước tiếp.'}
                    </p>
                    <LinkButton
                      to={
                        firstRecord
                          ? `/courses/${firstRecord.courseSlug}/preview`
                          : '/courses/tieng-duc-a1-1/preview'
                      }
                      className="w-full justify-center"
                    >
                      Mở bài học thử <ArrowRight aria-hidden="true" />
                    </LinkButton>
                    <LinkButton to="/courses" variant="outline" className="w-full justify-center">
                      Khám phá khóa học
                    </LinkButton>
                  </CardContent>
                </Card>
                <Card className="border-border-subtle bg-surface-blue/70">
                  <CardContent className="p-5">
                    <p className="text-sm font-semibold">Về dữ liệu này</p>
                    <p className="mt-1 text-sm leading-6 text-ink-secondary">
                      Đây là hồ sơ giả lập. Màn hình không cấp quyền nội dung trả phí và không tạo
                      giao dịch.
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

function InlineAccessNote({ record }: { record: StudentCourseRecord }) {
  if (record.enrollment.accessState === 'expired-display') {
    return (
      <Card className="border-warning-foreground/20 bg-warning-surface/40">
        <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
          <p className="text-sm leading-6 text-ink-secondary">
            Hạn truy cập mẫu: {formatDateTimeInTimezone(record.enrollment.expiresAt)}. Gia hạn chưa
            được triển khai.
          </p>
          <Button variant="outline" disabled>
            Gia hạn chưa khả dụng
          </Button>
        </CardContent>
      </Card>
    )
  }
  if (record.enrollment.status === 'REVOKED') {
    return (
      <Card className="border-danger-foreground/20 bg-danger-surface/40">
        <CardContent className="p-4 text-sm leading-6 text-ink-secondary">
          Enrollment demo đã bị thu hồi. Không có nội dung trả phí nào được mở từ màn hình này.
        </CardContent>
      </Card>
    )
  }
  return (
    <Card className="border-info-foreground/15 bg-info-surface/50">
      <CardContent className="p-4 text-sm leading-6 text-ink-secondary">
        Quyền học đầy đủ chưa có route trong phase này. Tiến độ bên dưới chỉ là dữ liệu mẫu từ
        repository.
      </CardContent>
    </Card>
  )
}

export function StudentCoursesPage() {
  usePageTitle('Khóa học của tôi')
  const { session } = useAuthSession()
  const coursesQuery = useStudentCourses(session?.id ?? '')
  const courseQuery = usePublicCourse(DEMO_COURSE_SLUG)
  const course = courseQuery.data

  return (
    <ProductStudentLayout>
      <Container className="grid gap-8 py-6 sm:py-9">
        <PageHeader
          eyebrow="Không gian học demo"
          title="Khóa học của tôi"
          description="Enrollment, hạn truy cập và tiến độ hiển thị từ dữ liệu demo có kiểu. Mở khóa học sẽ đưa bạn tới trang thông tin công khai."
          actions={
            <LinkButton to="/courses" variant="outline">
              Khám phá khóa học
            </LinkButton>
          }
        />
        <SectionHeader
          title="Khóa học đã đăng ký"
          description="Trạng thái quyền truy cập và tiến độ theo dữ liệu mô phỏng."
        />
        {coursesQuery.isPending ? (
          <StudentLoading courses />
        ) : coursesQuery.isError ? (
          <ErrorState
            title="Chưa tải được danh sách khóa học"
            description="Dịch vụ dữ liệu demo gặp sự cố. Thử lại để tải danh sách lần nữa."
            onRetry={() => void coursesQuery.refetch()}
          />
        ) : coursesQuery.data?.length === 0 ? (
          <EmptyState
            icon={<BookOpenText aria-hidden="true" className="size-6" />}
            title="Bạn chưa có khóa học nào"
            description="Tài khoản này chưa có enrollment demo. Bạn vẫn có thể xem khóa A1.1 và mở phần học thử miễn phí."
            action={
              <div className="flex flex-wrap justify-center gap-3">
                <LinkButton to="/courses" variant="outline">
                  Khám phá khóa học
                </LinkButton>
                <LinkButton to={`/courses/${DEMO_COURSE_SLUG}/preview`}>Mở bài học thử</LinkButton>
              </div>
            }
          />
        ) : courseQuery.isPending ? (
          <CourseLoadingCard />
        ) : courseQuery.isError || !course ? (
          <ErrorState
            title="Chưa tải được thông tin khóa học"
            description="Danh sách enrollment đã tải nhưng phần giới thiệu công khai chưa sẵn sàng."
            onRetry={() => void courseQuery.refetch()}
          />
        ) : (
          <div className="grid gap-5">
            {coursesQuery.data?.map((record) => (
              <section
                key={record.enrollment.id}
                className="grid min-w-0 gap-4 lg:grid-cols-[minmax(17rem,0.8fr)_minmax(0,1.2fr)]"
              >
                <CourseCard
                  course={course}
                  access={getAccessView(record)}
                  href={`/courses/${record.courseSlug}`}
                />
                <div className="grid content-start gap-4">
                  <AccessStatePanel access={getAccessView(record)} />
                  <EnrollmentStatusCard enrollment={record.enrollment} />
                  {record.progress ? (
                    <CourseProgressCard courseTitle={course.title} progress={record.progress} />
                  ) : (
                    <Card>
                      <CardContent className="p-5 text-sm text-ink-secondary">
                        Chưa có tiến độ học tập được ghi nhận.
                      </CardContent>
                    </Card>
                  )}
                  {record.enrollment.accessState === 'expired-display' && (
                    <p className="rounded-xl bg-warning-surface px-4 py-3 text-sm leading-6 text-ink-secondary">
                      Quyền truy cập hết hạn ngày{' '}
                      {formatDateTimeInTimezone(record.enrollment.expiresAt)}. Gia hạn chưa được
                      triển khai; nội dung trả phí vẫn không khả dụng.
                    </p>
                  )}
                  {record.enrollment.status === 'REVOKED' && (
                    <p className="rounded-xl bg-danger-surface px-4 py-3 text-sm leading-6 text-danger-foreground">
                      Enrollment có trạng thái REVOKED. Việc khóa học xuất hiện trong danh sách
                      không mở quyền truy cập nội dung.
                    </p>
                  )}
                  <div className="flex flex-wrap gap-3">
                    <LinkButton to={`/courses/${record.courseSlug}`} variant="outline">
                      Thông tin khóa học
                    </LinkButton>
                    <LinkButton to={`/courses/${record.courseSlug}/preview`} variant="ghost">
                      Xem học thử
                    </LinkButton>
                  </div>
                </div>
              </section>
            ))}
          </div>
        )}
        <p className="text-sm leading-6 text-ink-muted">
          Trạng thái này chỉ mô tả fixture demo. Backend sẽ là nguồn xác thực enrollment và quyền
          truy cập khi có hợp đồng API.
        </p>
      </Container>
    </ProductStudentLayout>
  )
}
