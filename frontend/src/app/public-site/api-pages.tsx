import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { ArrowLeft, ArrowRight, Check, LockKeyhole } from 'lucide-react'
import { Link, useLocation, useNavigate, useParams } from 'react-router'
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
  usePreviewExperience,
  usePublicPreviewManifest,
  usePublicSiteSettings,
} from '@/data/public-demo'
import { CourseOutline, CourseGrid } from '@/domains/catalog'
import { LessonOutlineAccordion, YouTubeLessonPlayer } from '@/domains/learning'
import { DomainState } from '@/domains/shared/presentation'
import { DecorativeHeading } from '@/domains/shared/decorative-heading'
import { PublicShell, StudentShell } from '@/shared/layouts/shells'
import {
  Badge,
  BaseDialog,
  Button,
  Card,
  Container,
  LinkButton,
  Pagination,
  Progress,
} from '@/shared/ui'
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
      menuDescription="Khám phá lộ trình học tiếng Đức"
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

  useLayoutEffect(() => {
    const homepage = homepageRef.current
    if (!homepage || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    if (!('IntersectionObserver' in window)) return

    const sections = Array.from(homepage.querySelectorAll<HTMLElement>('[data-homepage-reveal]'))
    sections.forEach((section) => section.setAttribute('data-homepage-revealed', 'false'))
    homepage.setAttribute('data-homepage-reveal-ready', 'true')
    const observer = new IntersectionObserver(
      (entries) => {
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
        <CourseOverviewVideo videoUrl={settings.data?.introVideo?.url ?? null} />
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
      <Container className="space-y-10 pt-5 pb-10 sm:pt-6 sm:pb-14">
        <header className="max-w-3xl space-y-4">
          <p
            lang="de"
            className="text-sm font-bold uppercase tracking-[0.14em] text-action-primary"
          >
            UNSERE DEUTSCHKURSE
          </p>
          <DecorativeHeading text="Chọn lộ trình phù hợp" level={1} size="md" />
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
  const previewManifest = usePublicPreviewManifest(slug)
  const [lockedSectionId, setLockedSectionId] = useState<string | null>(null)
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
  const previewAvailable =
    (course.previewChapterCount ?? 0) > 0 ||
    course.previewAvailable === true ||
    Boolean(previewManifest.data?.sectionIds?.length)
  const previewHref = `/courses/${encodeURIComponent(slug)}/preview`
  const secondaryBannerUrl =
    course.slug === 'niveau-a1-1' ? '/assets/homepage/course-banner-a11-v2.png' : undefined
  const openCheckout = () =>
    navigate(session ? checkout : `/login?returnTo=${encodeURIComponent(checkout)}`)
  return (
    <PublicLayout>
      <Container className="space-y-8 pt-5 pb-8 sm:pt-6 sm:pb-12">
        <Link
          to="/courses"
          className="inline-flex min-h-10 items-center gap-2 text-sm font-semibold text-action-primary underline-offset-4 hover:underline"
        >
          <ArrowLeft aria-hidden="true" className="size-4" />
          Danh sách khóa học
        </Link>
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_20rem]">
          <header className="overflow-hidden rounded-3xl bg-surface-blue">
            {course.thumbnailUrl && (
              <img
                src={course.thumbnailUrl}
                alt=""
                className="block aspect-[16/7] w-full object-cover object-center"
              />
            )}
            <div
              className="relative overflow-hidden bg-cover bg-center"
              style={
                secondaryBannerUrl ? { backgroundImage: `url(${secondaryBannerUrl})` } : undefined
              }
            >
              <div className="flex min-h-56 flex-col justify-center bg-surface-blue/80 p-6 sm:min-h-64 sm:p-9">
                {!course.title.toLowerCase().includes(course.level.toLowerCase()) && (
                  <p className="mb-3 text-sm font-bold uppercase tracking-[0.14em] text-action-primary">
                    Trình độ {course.level}
                  </p>
                )}
                <DecorativeHeading text={course.title} level={1} size="lg" />
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
              </div>
            </div>
          </header>
          <aside>
            <Card className="overflow-hidden border-action-primary/20 shadow-soft">
              <div className="bg-surface-lime p-5 sm:p-6">
                <p className="text-sm font-semibold text-pastel-lime-ink">Học phí trọn khóa</p>
                <p className="mt-1 font-display text-4xl font-extrabold tabular-nums tracking-tight text-ink-primary">
                  {course.priceVnd ? formatVnd(course.priceVnd) : 'Đang cập nhật'}
                </p>
                {course.accessDurationMonths !== undefined && (
                  <p className="mt-2 text-sm font-medium text-ink-secondary">
                    Truy cập trong {course.accessDurationMonths} tháng
                  </p>
                )}
              </div>
              <div className="grid gap-3 p-5 sm:p-6">
                <Button className="w-full" onClick={openCheckout}>
                  Đăng ký khóa học <ArrowRight aria-hidden="true" />
                </Button>
                {previewAvailable && (
                  <LinkButton to={previewHref} variant="outline" className="w-full">
                    Học thử chương 1 miễn phí <ArrowRight aria-hidden="true" />
                  </LinkButton>
                )}
                <p className="text-xs leading-5 text-ink-muted">
                  {previewAvailable
                    ? 'Trải nghiệm chương đầu miễn phí trước khi quyết định đăng ký.'
                    : session
                      ? 'Bài học sẽ mở sau khi đăng ký được xác nhận.'
                      : 'Đăng nhập hoặc tạo tài khoản để đăng ký khóa học.'}
                </p>
              </div>
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
              {previewAvailable
                ? 'Xem trước chương 1 miễn phí, sau đó đăng ký để mở toàn bộ lộ trình.'
                : 'Các chương và bài học được sắp xếp theo từng bước để bạn dễ theo dõi.'}
            </p>
          </div>
          <CourseOutline
            sections={course.sections}
            previewLabel="Học thử miễn phí"
            {...(previewManifest.data?.sectionIds
              ? { previewSectionIds: previewManifest.data.sectionIds }
              : {})}
            previewHref={previewHref}
            onPreviewLessonSelect={(sectionId, lessonId) =>
              navigate(
                `/courses/${encodeURIComponent(slug)}/preview?sectionId=${encodeURIComponent(sectionId)}&lessonId=${encodeURIComponent(lessonId)}`,
              )
            }
            onLockedSectionSelect={setLockedSectionId}
          />
        </section>
      </Container>
      {lockedSectionId && (
        <BaseDialog
          open
          onOpenChange={(open) => {
            if (!open) setLockedSectionId(null)
          }}
          title="Chương này cần đăng ký"
          description="Nội dung đầy đủ được mở sau khi đơn hàng được Admin xác nhận."
          tone="info"
          footer={
            <>
              <Button onClick={openCheckout} endIcon={<ArrowRight aria-hidden="true" />}>
                Đăng ký khóa học
              </Button>
              {!session && (
                <LinkButton
                  to={`/login?returnTo=${encodeURIComponent(checkout)}`}
                  variant="outline"
                >
                  Đăng nhập
                </LinkButton>
              )}
            </>
          }
        >
          <div className="grid gap-3 rounded-control bg-surface-blue p-4 text-sm leading-6 text-ink-secondary">
            <div className="flex items-center gap-2 font-semibold text-ink-primary">
              <LockKeyhole aria-hidden="true" className="size-5 text-action-primary" />
              <span>
                {(course.previewChapterCount ?? 0) > 0
                  ? `Học thử ${course.previewChapterCount ?? 0} chương đầu miễn phí`
                  : 'Khóa học này không có chương học thử'}
              </span>
            </div>
            <p>Đăng ký để mở toàn bộ chương, bài học và tài liệu của khóa học.</p>
          </div>
        </BaseDialog>
      )}
    </PublicLayout>
  )
}

export function ApiCoursePreviewPage() {
  const { slug = '' } = useParams()
  const location = useLocation()
  const navigate = useNavigate()
  const { session, logout } = useAuthSession()
  const params = new URLSearchParams(location.search)
  const experience = usePreviewExperience(
    slug,
    params.get('sectionId') ?? undefined,
    params.get('lessonId') ?? undefined,
  )
  const preview = experience.data?.kind === 'available' ? experience.data : null
  const previewCount =
    experience.data?.kind === 'available'
      ? experience.data.sections.length
      : experience.data && 'manifest' in experience.data
        ? experience.data.manifest.sectionIds.length
        : experience.data && experience.data.kind !== 'course-not-found'
          ? (experience.data.course.previewChapterCount ?? 0)
          : 0
  const previewLessonCount =
    preview?.sections.reduce((total, section) => total + section.lessons.length, 0) ?? 0
  const previewLessonPath = (lessonId: string) => {
    const sectionId =
      preview?.sections.find((section) => section.lessons.some((lesson) => lesson.id === lessonId))
        ?.id ?? preview?.section.id
    return `/courses/${encodeURIComponent(slug)}/preview?sectionId=${encodeURIComponent(sectionId ?? '')}&lessonId=${encodeURIComponent(lessonId)}`
  }
  const previewTree = preview
    ? {
        courseId: preview.course.id,
        courseTitle: preview.course.title,
        currentLessonId: preview.lesson.id,
        sections: preview.sections.map((section) => ({
          ...section,
          lessons: section.lessons.map((lesson) =>
            lesson.id === preview.lesson.id
              ? {
                  ...lesson,
                  hasVideo: Boolean(preview.content.video),
                  exercises: preview.content.exercises.map((exercise) => ({
                    id: exercise.id,
                    title: exercise.title,
                    sortOrder: exercise.sortOrder,
                  })),
                }
              : lesson,
          ),
        })),
      }
    : null
  usePageTitle(preview ? `${preview.course.title} · Học thử` : 'Học thử miễn phí')
  return (
    <StudentShell
      productMode
      displayName={session?.profile.displayName || session?.profile.email || 'Học viên xem thử'}
      {...(session ? { onLogout: logout } : {})}
    >
      <div className="grid min-w-0 gap-4">
        <Link
          to={`/courses/${encodeURIComponent(slug)}`}
          className="inline-flex min-h-10 items-center gap-2 text-sm font-semibold text-action-primary"
        >
          <ArrowLeft aria-hidden="true" className="size-4" /> Quay lại chi tiết khóa học
        </Link>
        {experience.isPending && <DomainState kind="loading" title="Đang tải bài học thử" />}
        {experience.isError && (
          <PageFailure
            title="Không tải được bài học thử"
            onRetry={() => void experience.refetch()}
          />
        )}
        {experience.data &&
          experience.data.kind !== 'available' &&
          experience.data.kind !== 'course-not-found' && (
            <Card className="grid gap-4 p-6">
              <p className="text-sm font-bold uppercase tracking-[0.14em] text-action-primary">
                Học thử miễn phí
              </p>
              <h1 className="font-display text-3xl font-extrabold">
                {experience.data.course.title}
              </h1>
              <p className="leading-7 text-ink-secondary">
                {previewCount > 0
                  ? `${previewCount} chương đầu được mở miễn phí. Chương đang chọn chưa được cấu hình để học thử.`
                  : 'Khóa học này chưa được cấu hình chương học thử. Hãy đăng ký để mở toàn bộ nội dung.'}
              </p>
              <Link
                to={`/courses/${encodeURIComponent(slug)}`}
                className="font-semibold text-action-primary"
              >
                Xem chương trình và đăng ký{' '}
                <ArrowRight aria-hidden="true" className="inline size-4" />
              </Link>
            </Card>
          )}
        {preview && (
          <div className="grid gap-5">
            <div className="rounded-2xl border border-brand-pink/70 bg-brand-pink/30 p-4 sm:p-5">
              <div className="mb-3 flex items-center justify-between gap-3 text-sm font-semibold text-ink-secondary">
                <span>{preview.course.title}</span>
                <Badge tone="preview">Học thử miễn phí</Badge>
              </div>
              <Progress
                value={0}
                label={`0/${previewLessonCount} bài học đã học`}
                indicatorClassName="bg-brand-lime"
              />
            </div>
            {previewTree && (
              <LessonOutlineAccordion
                tree={previewTree}
                currentLessonId={preview.lesson.id}
                onSelectLesson={(lessonId) => navigate(previewLessonPath(lessonId))}
                lessonHref={previewLessonPath}
                exerciseHref={(lessonId) => previewLessonPath(lessonId)}
              />
            )}
            <Card className="grid gap-5 p-6 sm:p-8">
              <div>
                <p className="text-sm font-bold uppercase tracking-[0.14em] text-action-primary">
                  {preview.section.title}
                </p>
                <h1 className="mt-2 font-display text-3xl font-extrabold">
                  {preview.lesson.title}
                </h1>
                <p className="mt-2 text-sm text-ink-secondary">
                  Nội dung học thử · không cần đăng nhập
                </p>
              </div>
              {preview.content.video && (
                <YouTubeLessonPlayer
                  video={preview.content.video}
                  title={preview.lesson.title}
                  eager
                />
              )}
              {preview.content.paragraphs.length > 0 && (
                <div className="grid gap-4 leading-7 text-ink-secondary">
                  {preview.content.paragraphs.map((paragraph) => (
                    <p key={paragraph}>{paragraph}</p>
                  ))}
                </div>
              )}
              {preview.content.exercises.length > 0 && (
                <section
                  className="grid gap-3 rounded-2xl border border-brand-pink bg-brand-pink/20 p-4 sm:p-5"
                  aria-label="Bài tập của bài học"
                >
                  <h2 className="font-display text-xl font-bold text-ink-primary">Bài tập</h2>
                  <div className="grid gap-3">
                    {preview.content.exercises.map((exercise) => (
                      <article
                        key={exercise.id}
                        className="rounded-xl border border-border-subtle bg-card-surface p-4"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <h3 className="font-semibold text-ink-primary">{exercise.title}</h3>
                          <Badge tone="info">
                            {exercise.exerciseType === 'QUIZ' ? 'Quiz' : 'Bài thực hành'}
                          </Badge>
                        </div>
                        {exercise.description && (
                          <p className="mt-2 text-sm leading-6 text-ink-secondary">
                            {exercise.description}
                          </p>
                        )}
                        <p className="mt-3 whitespace-pre-line text-sm leading-6 text-ink-secondary">
                          {exercise.instructions}
                        </p>
                      </article>
                    ))}
                  </div>
                </section>
              )}
              {!preview.content.video &&
                preview.content.paragraphs.length === 0 &&
                preview.content.exercises.length === 0 && (
                  <p className="rounded-xl bg-surface-muted p-4 text-sm text-ink-secondary">
                    Nội dung bài học đang được cập nhật.
                  </p>
                )}
              <div className="flex flex-wrap gap-3 border-t border-border-subtle pt-4">
                <LinkButton to={`/courses/${encodeURIComponent(slug)}`}>
                  Đăng ký để mở toàn bộ khóa học <ArrowRight aria-hidden="true" />
                </LinkButton>
              </div>
            </Card>
          </div>
        )}
      </div>
    </StudentShell>
  )
}
