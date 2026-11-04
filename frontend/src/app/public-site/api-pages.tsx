import { useEffect, useState, type ReactNode } from 'react'
import { ArrowLeft, ArrowRight, BookOpenText, LockKeyhole } from 'lucide-react'
import { Link, useNavigate, useParams } from 'react-router'
import { useAuthSession } from '@/app/auth/auth-session'
import { CoursePricingSection } from '@/features/homepage/sections/CoursePricingSection'
import { PhotographicHero } from '@/features/homepage/sections/PhotographicHero'
import { CourseIntroduction } from '@/features/homepage/sections/CourseIntroduction'
import { CourseOverviewVideo } from '@/features/homepage/sections/CourseOverviewVideo'
import { LearningFeaturesGrid } from '@/features/homepage/sections/LearningFeaturesGrid'
import { LearningBenefitsSection } from '@/features/homepage/sections/LearningBenefitsSection'
import { FAQSection } from '@/features/homepage/sections/FAQSection'
import { HomepageFooter } from '@/features/homepage/sections/HomepageFooter'
import {
  usePublicCourse,
  usePublicCourseCatalog,
  usePublicCourseCatalogPage,
  usePublicSiteSettings,
} from '@/data/public-demo'
import {
  CourseDetailHero,
  CourseObjectives,
  CourseOutline,
  CourseOverview,
  CoursePricingSummary,
  CourseGrid,
} from '@/domains/catalog'
import { DomainState } from '@/domains/shared/presentation'
import { PublicShell } from '@/shared/layouts/shells'
import { Button, Card, Container, LinkButton, Pagination } from '@/shared/ui'
import { formatVnd } from '@/shared/lib/format'
import { setBrandPageTitle } from '@/config/brand'
import '@/features/homepage/homepage.css'

function usePageTitle(title: string) {
  useEffect(() => setBrandPageTitle(title), [title])
}

function PublicLayout({ children, homepage = false }: { children: ReactNode; homepage?: boolean }) {
  const { session, logout } = useAuthSession()
  return (
    <PublicShell
      showPreviewNotice={false}
      navItems={[
        { label: 'Trang chủ', href: '/' },
        { label: 'Khóa học', href: '/courses' },
        { label: 'Giới thiệu', href: '/#course-intro' },
        { label: 'Liên hệ', href: '/#footer-contact' },
      ]}
      menuDescription="Khám phá lộ trình học tiếng Đức"
      primaryAction={{ label: homepage ? 'Xem khóa học' : 'Chọn khóa học', href: '/courses' }}
      showRegister
      {...(session
        ? {
            authState: {
              displayName: session.profile.displayName || session.profile.email,
              role: session.role,
              onLogout: logout,
            },
          }
        : {})}
      {...(homepage ? { footerContent: <HomepageFooter signedIn={Boolean(session)} /> } : {})}
    >
      {children}
    </PublicShell>
  )
}

function PageFailure({ title, onRetry }: { title: string; onRetry: () => void }) {
  return (
    <DomainState
      kind="error"
      title={title}
      message="Không tải được dữ liệu từ máy chủ. Kiểm tra kết nối API rồi thử lại."
    >
      <Button className="mt-3" variant="outline" onClick={onRetry}>
        Thử tải lại
      </Button>
    </DomainState>
  )
}

export function ApiPublicLandingPage() {
  const catalog = usePublicCourseCatalog()
  const settings = usePublicSiteSettings()
  usePageTitle(settings.data?.siteName || 'Học tiếng Đức')
  return (
    <PublicLayout homepage>
      <>
        <PhotographicHero
          {...(settings.data?.heroTitle ? { title: settings.data.heroTitle } : {})}
          {...(settings.data?.heroDescription
            ? { description: settings.data.heroDescription }
            : {})}
          {...(settings.data?.heroMedia?.url ? { imageUrl: settings.data.heroMedia.url } : {})}
        />
        {settings.isError && (
          <Container className="pt-5">
            <p role="status" className="text-sm text-ink-secondary">
              Chưa tải được nội dung giới thiệu website từ máy chủ.
            </p>
          </Container>
        )}
        <CourseIntroduction />
        <CourseOverviewVideo />
        <LearningFeaturesGrid />
        <CoursePricingSection
          courses={catalog.data ?? []}
          loading={catalog.isPending}
          {...(catalog.isError ? { error: 'Không tải được danh mục khóa học từ máy chủ.' } : {})}
          onRetry={() => void catalog.refetch()}
        />
        <LearningBenefitsSection />
        <FAQSection />
      </>
    </PublicLayout>
  )
}

export function ApiCourseCatalogPage() {
  const [page, setPage] = useState(1)
  const catalog = usePublicCourseCatalogPage(page)
  usePageTitle('Khóa học')
  return (
    <PublicLayout>
      <Container className="space-y-10 py-10 sm:py-14">
        <header className="max-w-3xl space-y-4">
          <p
            lang="de"
            className="text-sm font-bold uppercase tracking-[0.14em] text-action-primary"
          >
            UNSERE DEUTSCHKURSE
          </p>
          <h1 className="font-display text-3xl font-extrabold tracking-tight sm:text-4xl">
            Chọn lộ trình phù hợp
          </h1>
          <p className="text-lg leading-7 text-ink-secondary">
            Thông tin khóa học, học phí và thời hạn được tải trực tiếp từ hệ thống.
          </p>
        </header>
        {catalog.isError ? (
          <PageFailure
            title="Không tải được danh mục khóa học"
            onRetry={() => void catalog.refetch()}
          />
        ) : (
          <CourseGrid courses={catalog.data?.items ?? []} loading={catalog.isPending} />
        )}
        {catalog.data && catalog.data.total > catalog.data.pageSize && (
          <Pagination
            page={catalog.data.page}
            pages={Math.ceil(catalog.data.total / catalog.data.pageSize)}
            onPageChange={setPage}
          />
        )}
      </Container>
    </PublicLayout>
  )
}

export function ApiCourseDetailPage() {
  const { slug = '' } = useParams()
  const navigate = useNavigate()
  const { session } = useAuthSession()
  const courseQuery = usePublicCourse(slug)
  usePageTitle(courseQuery.data?.title ?? 'Chi tiết khóa học')

  if (courseQuery.isPending)
    return (
      <PublicLayout>
        <Container className="py-12">
          <DomainState kind="loading" title="Đang tải khóa học" />
        </Container>
      </PublicLayout>
    )
  if (courseQuery.isError)
    return (
      <PublicLayout>
        <Container className="py-12">
          <PageFailure
            title="Không tải được thông tin khóa học"
            onRetry={() => void courseQuery.refetch()}
          />
        </Container>
      </PublicLayout>
    )
  if (!courseQuery.data)
    return (
      <PublicLayout>
        <Container className="py-12">
          <DomainState kind="empty" title="Không tìm thấy khóa học" />
        </Container>
      </PublicLayout>
    )

  const course = courseQuery.data
  const checkout = `/checkout/${encodeURIComponent(course.id)}`
  const openCheckout = () =>
    navigate(session ? checkout : `/login?returnTo=${encodeURIComponent(checkout)}`)
  const openLesson = (lessonId: string) => {
    const destination = `/learn/lessons/${encodeURIComponent(lessonId)}`
    navigate(session ? destination : `/login?returnTo=${encodeURIComponent(destination)}`)
  }

  return (
    <PublicLayout>
      <Container className="space-y-12 py-8 sm:py-12">
        <nav aria-label="Đường dẫn" className="flex items-center gap-2 text-sm text-ink-secondary">
          <Link
            to="/courses"
            className="underline-offset-4 hover:text-action-primary hover:underline"
          >
            Khóa học
          </Link>
          <span aria-hidden="true">/</span>
          <span aria-current="page" className="truncate text-ink-primary">
            {course.level}
          </span>
        </nav>
        <CourseDetailHero
          course={course}
          access={{
            kind: 'restricted',
            label: 'Nội dung bài học được kiểm tra theo quyền enrollment.',
            reason: 'Đăng nhập để tiếp tục.',
          }}
          primaryAction={{ label: 'Đăng ký khóa học', onClick: openCheckout }}
          accessNote={`${formatVnd(course.priceVnd ?? '0')} · ${course.accessDurationMonths ?? 0} tháng truy cập`}
        />
        <div className="grid gap-12 lg:grid-cols-[minmax(0,1.2fr)_minmax(17rem,0.8fr)] lg:items-start">
          <div className="min-w-0 space-y-10">
            <CourseOverview description={course.description} />
            {course.objectives.length > 0 && <CourseObjectives objectives={course.objectives} />}
            {course.requirements.length > 0 && (
              <section className="space-y-3">
                <h2 className="font-display text-2xl font-bold">Yêu cầu đầu vào</h2>
                <ul className="list-disc space-y-2 pl-5 text-ink-secondary">
                  {course.requirements.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </section>
            )}
            <section aria-labelledby="course-outline-heading" className="space-y-4">
              <div className="space-y-2">
                <h2 id="course-outline-heading" className="font-display text-2xl font-bold">
                  Chương trình học
                </h2>
                <p className="text-sm leading-6 text-ink-secondary">
                  Danh sách chương và bài học công khai. Nội dung học chỉ mở khi máy chủ xác nhận
                  enrollment.
                </p>
              </div>
              <CourseOutline sections={course.sections} onLessonSelect={openLesson} />
            </section>
          </div>
          <aside className="space-y-4 lg:sticky lg:top-28">
            <CoursePricingSummary
              priceVnd={course.priceVnd ?? '0'}
              durationMonths={course.accessDurationMonths ?? 0}
              note="Hệ thống xác nhận giá và quyền truy cập khi tạo đơn."
            />
            <Card className="p-5">
              <div className="flex items-center gap-2">
                <LockKeyhole aria-hidden="true" className="size-5 text-action-primary" />
                <h2 className="font-display text-lg font-bold">Quyền học</h2>
              </div>
              <p className="mt-3 text-sm leading-6 text-ink-secondary">
                Đăng nhập để mua khóa học hoặc tiếp tục bài học. Đơn hàng chờ duyệt không tự cấp
                quyền.
              </p>
              <Button className="mt-5 w-full" onClick={openCheckout}>
                <BookOpenText aria-hidden="true" />
                Tiếp tục
              </Button>
            </Card>
          </aside>
        </div>
        <div className="flex flex-wrap items-center gap-3 border-t border-border-subtle pt-6">
          <LinkButton to="/courses" variant="outline" startIcon={<ArrowLeft aria-hidden="true" />}>
            Về danh mục
          </LinkButton>
          <Button onClick={openCheckout}>
            Đăng ký khóa học <ArrowRight aria-hidden="true" />
          </Button>
        </div>
      </Container>
    </PublicLayout>
  )
}
