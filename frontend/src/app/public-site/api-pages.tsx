import { useEffect, useRef, useState, type ReactNode } from 'react'
import { ArrowLeft, ArrowRight, Check } from 'lucide-react'
import { Link, useNavigate, useParams } from 'react-router'
import { useAuthSession } from '@/app/auth/auth-session'
import { CoursePricingSection } from '@/features/homepage/sections/CoursePricingSection'
import { PhotographicHero } from '@/features/homepage/sections/PhotographicHero'
import { CourseIntroduction } from '@/features/homepage/sections/CourseIntroduction'
import { CourseOverviewVideo } from '@/features/homepage/sections/CourseOverviewVideo'
import { LearningFeaturesGrid } from '@/features/homepage/sections/LearningFeaturesGrid'
import { LearningBenefitsSection } from '@/features/homepage/sections/LearningBenefitsSection'
import { StudentTestimonialsSection } from '@/features/homepage/sections/StudentTestimonialsSection'
import { FAQSection } from '@/features/homepage/sections/FAQSection'
import { HomepageFooter } from '@/features/homepage/sections/HomepageFooter'
import {
  usePublicCourse,
  usePublicCourseCatalog,
  usePublicCourseCatalogPage,
  usePublicSiteSettings,
} from '@/data/public-demo'
import { CourseOutline, CourseGrid } from '@/domains/catalog'
import { DomainState } from '@/domains/shared/presentation'
import { PublicShell } from '@/shared/layouts/shells'
import { Button, Card, Container, Pagination } from '@/shared/ui'
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
  const homepageRef = useRef<HTMLDivElement>(null)
  usePageTitle(settings.data?.siteName || 'Học tiếng Đức')

  useEffect(() => {
    const homepage = homepageRef.current
    const root = document.documentElement
    root.classList.add('homepage-scroll-guard')

    const cleanup = () => root.classList.remove('homepage-scroll-guard')
    if (!homepage || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return cleanup
    if (!('IntersectionObserver' in window)) return cleanup

    const sections = Array.from(homepage.querySelectorAll<HTMLElement>('[data-homepage-reveal]'))
    let initialized = false
    const observer = new IntersectionObserver(
      (entries) => {
        if (!initialized) {
          sections.forEach((section) => section.setAttribute('data-homepage-revealed', 'false'))
          initialized = true
          homepage.setAttribute('data-homepage-reveal-ready', 'true')
        }

        entries.forEach((entry) => {
          ;(entry.target as HTMLElement).setAttribute(
            'data-homepage-revealed',
            entry.isIntersecting ? 'true' : 'false',
          )
        })
      },
      { rootMargin: '-32px 0px -40px 0px', threshold: 0.08 },
    )

    sections.forEach((section) => observer.observe(section))
    return () => {
      observer.disconnect()
      homepage.removeAttribute('data-homepage-reveal-ready')
      sections.forEach((section) => section.removeAttribute('data-homepage-revealed'))
      cleanup()
    }
  }, [])

  return (
    <PublicLayout homepage>
      <div ref={homepageRef} className="homepage-content">
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
        <StudentTestimonialsSection />
        <FAQSection />
      </div>
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
  const courseInformationCount = [
    course.description.trim().length > 0,
    course.objectives.length > 0,
    course.requirements.length > 0,
  ].filter(Boolean).length
  const courseInformationGridClass =
    courseInformationCount === 1
      ? 'grid gap-4'
      : courseInformationCount === 2
        ? 'grid gap-4 sm:grid-cols-2'
        : 'grid gap-4 sm:grid-cols-2 lg:grid-cols-3'
  const checkout = `/checkout/${encodeURIComponent(course.id)}`
  const openCheckout = () =>
    navigate(session ? checkout : `/login?returnTo=${encodeURIComponent(checkout)}`)
  const openLesson = (lessonId: string) => {
    const destination = `/learn/lessons/${encodeURIComponent(lessonId)}`
    navigate(session ? destination : `/login?returnTo=${encodeURIComponent(destination)}`)
  }

  return (
    <PublicLayout>
      <Container className="space-y-8 py-8 sm:py-12">
        <Link
          to="/courses"
          className="inline-flex min-h-10 items-center gap-2 text-sm font-semibold text-action-primary underline-offset-4 hover:underline"
        >
          <ArrowLeft aria-hidden="true" className="size-4" />
          Danh sách khóa học
        </Link>
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_20rem]">
          <header className="flex flex-col justify-center rounded-3xl bg-surface-blue p-6 sm:p-9">
            {!course.title.toLowerCase().includes(course.level.toLowerCase()) && (
              <p className="mb-3 text-sm font-bold uppercase tracking-[0.14em] text-action-primary">
                Trình độ {course.level}
              </p>
            )}
            <h1 className="font-display text-3xl font-extrabold tracking-tight text-ink-primary sm:text-4xl">
              {course.title}
            </h1>
            <div className="mt-4 flex flex-wrap gap-2 text-sm text-ink-secondary">
              {course.chapterCount !== undefined && (
                <span className="rounded-full bg-card-surface px-3 py-1">
                  {course.chapterCount} chương
                </span>
              )}
              {course.lessonCount !== undefined && (
                <span className="rounded-full bg-card-surface px-3 py-1">
                  {course.lessonCount} bài học
                </span>
              )}
            </div>
          </header>
          <aside>
            <Card className="p-5 sm:p-6">
              <p className="text-sm font-semibold text-ink-secondary">Học phí</p>
              <p className="mt-1 font-display text-3xl font-extrabold tabular-nums text-ink-primary">
                {course.priceVnd ? formatVnd(course.priceVnd) : 'Đang cập nhật'}
              </p>
              {course.accessDurationMonths !== undefined && (
                <p className="mt-2 text-sm text-ink-secondary">
                  Truy cập trong {course.accessDurationMonths} tháng
                </p>
              )}
              <Button className="mt-5 w-full" onClick={openCheckout}>
                Đăng ký khóa học <ArrowRight aria-hidden="true" />
              </Button>
              <p className="mt-3 text-xs leading-5 text-ink-muted">
                {session
                  ? 'Bài học sẽ mở sau khi đăng ký được xác nhận.'
                  : 'Đăng nhập hoặc tạo tài khoản để đăng ký khóa học.'}
              </p>
            </Card>
          </aside>
        </div>
        {courseInformationCount > 0 && (
          <div className={courseInformationGridClass}>
            {course.description.trim() && (
              <section className="rounded-2xl border border-border-subtle bg-card-surface p-5 sm:p-6">
                <h2 className="font-display text-xl font-bold">Bạn sẽ học gì?</h2>
                <p className="mt-3 whitespace-pre-line leading-7 text-ink-secondary">
                  {course.description}
                </p>
              </section>
            )}
            {course.objectives.length > 0 && (
              <section className="rounded-2xl bg-surface-lime p-5 sm:p-6">
                <h2 className="font-display text-xl font-bold">Sau khóa học, bạn có thể</h2>
                <ul className="mt-3 grid gap-3">
                  {course.objectives.map((objective) => (
                    <li key={objective} className="flex gap-2.5 leading-6 text-ink-primary">
                      <Check
                        aria-hidden="true"
                        className="mt-1 size-4 shrink-0 text-action-primary"
                        strokeWidth={2.5}
                      />
                      <span>{objective}</span>
                    </li>
                  ))}
                </ul>
              </section>
            )}
            {course.requirements.length > 0 && (
              <section className="rounded-2xl border border-border-subtle bg-card-surface p-5 sm:p-6">
                <h2 className="font-display text-xl font-bold">Bạn cần chuẩn bị gì?</h2>
                <ul className="mt-3 grid gap-3">
                  {course.requirements.map((requirement) => (
                    <li key={requirement} className="flex gap-2.5 leading-6 text-ink-secondary">
                      <Check
                        aria-hidden="true"
                        className="mt-1 size-4 shrink-0 text-action-primary"
                        strokeWidth={2.5}
                      />
                      <span>{requirement}</span>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </div>
        )}
        <section aria-labelledby="course-outline-heading" className="space-y-4">
          <div className="space-y-2">
            <h2 id="course-outline-heading" className="font-display text-2xl font-bold">
              Nội dung khóa học
            </h2>
            <p className="text-sm leading-6 text-ink-secondary">
              Các chương và bài học được sắp xếp theo từng bước để bạn dễ theo dõi.
            </p>
          </div>
          <CourseOutline sections={course.sections} onLessonSelect={openLesson} />
        </section>
      </Container>
    </PublicLayout>
  )
}
