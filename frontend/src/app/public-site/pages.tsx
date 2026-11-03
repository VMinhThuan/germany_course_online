import { useEffect } from 'react'
import { ArrowDown, ArrowLeft, ArrowRight, LockKeyhole } from 'lucide-react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router'
import {
  Badge,
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
  Button,
  Card,
  Container,
  LinkButton,
} from '@/shared/ui'
import { PublicShell } from '@/shared/layouts/shells'
import { setBrandPageTitle } from '@/config/brand'
import type { ReactNode } from 'react'
import { useDialogs } from '@/shared/ui/dialogs'
import {
  CourseDetailHero,
  CourseGrid,
  CourseObjectives,
  CourseOutline,
  CourseOverview,
} from '@/domains/catalog'
import { VideoPlayer } from '@/domains/media'
import { DomainState } from '@/domains/shared/presentation'
import {
  usePreviewExperience,
  usePublicCourse,
  usePublicCourseCatalog,
  usePublicPreviewManifest,
} from '@/data/public-demo'
import { getPreviewSections } from '@/data/public-demo/use-cases'
import { useAuthSession } from '@/app/auth/auth-session'
import {
  FAQSection,
  CourseIntroduction,
  CourseOverviewVideo,
  CoursePricingSection,
  HomepageFooter,
  LearningBenefitsSection,
  LearningFeaturesGrid,
  PhotographicHero,
} from '@/features/homepage'
import '@/features/homepage/homepage.css'

const courseSlug = 'tieng-duc-a1-1'

const publicShellProps = {
  navItems: [
    { label: 'Trang chủ', href: '/' },
    { label: 'Khóa học', href: '/courses' },
    { label: 'Giới thiệu', href: '/#course-intro' },
    { label: 'Học thử', href: `/courses/${courseSlug}/preview` },
    { label: 'Liên hệ', href: '/#footer-contact' },
  ],
  brandHref: '/',
  showPreviewNotice: false,
  showLogin: true,
  showRegister: false,
  primaryAction: { label: 'Xem khóa học', href: '/courses' },
  footerLink: { label: 'Câu hỏi thường gặp', href: '/#faq' },
  menuDescription: 'Khám phá khóa học và nội dung học thử',
} as const

function usePageTitle(title: string) {
  useEffect(() => {
    setBrandPageTitle(title)
  }, [title])
}

function SitePage({ children, homepage = false }: { children: ReactNode; homepage?: boolean }) {
  const { session, logout } = useAuthSession()
  return (
    <PublicShell
      {...publicShellProps}
      {...(homepage
        ? {
            primaryAction: { label: 'Học thử miễn phí', href: `/courses/${courseSlug}/preview` },
            wideNavigation: true,
            footerContent: <HomepageFooter signedIn={Boolean(session)} />,
          }
        : {})}
      {...(session
        ? {
            authState: {
              displayName: session.profile.displayName || session.profile.email,
              onLogout: logout,
            },
          }
        : {})}
    >
      {children}
    </PublicShell>
  )
}

function PageError({ title, retry }: { title: string; retry?: () => void }) {
  return (
    <DomainState
      kind="error"
      title={title}
      message="Dữ liệu bản demo chưa tải được. Bạn có thể thử lại sau ít phút."
    >
      {retry && (
        <Button variant="outline" onClick={retry} className="mt-2">
          Thử tải lại
        </Button>
      )}
    </DomainState>
  )
}

export function PublicLandingPage() {
  const catalog = usePublicCourseCatalog()
  usePageTitle('Học tiếng Đức A1.1')

  return (
    <SitePage homepage>
      <>
        <PhotographicHero />
        <CourseIntroduction />
        <CourseOverviewVideo />
        <LearningFeaturesGrid />
        <CoursePricingSection
          courses={catalog.data ?? []}
          loading={catalog.isPending}
          {...(catalog.isError
            ? { error: 'Dữ liệu bản demo chưa tải được. Bạn có thể thử lại sau ít phút.' }
            : {})}
          onRetry={() => void catalog.refetch()}
        />
        <LearningBenefitsSection />
        <FAQSection />
      </>
    </SitePage>
  )
}

export function CourseCatalogPage() {
  const catalog = usePublicCourseCatalog()
  usePageTitle('Khóa học')

  return (
    <SitePage>
      <Container className="space-y-10 py-10 sm:py-14">
        <header className="max-w-3xl space-y-4">
          <p
            lang="de"
            className="text-sm font-bold uppercase tracking-[0.14em] text-action-primary"
          >
            UNSERE DEUTSCHKURSE
          </p>
          <h1 className="font-display text-3xl font-extrabold tracking-tight sm:text-4xl">
            Chọn điểm bắt đầu của bạn
          </h1>
          <p className="text-lg leading-7 text-ink-secondary">
            Chọn lộ trình phù hợp với trình độ hiện tại. Các mức giá và thời hạn hiển thị chỉ dùng
            để minh họa trong bản demo.
          </p>
        </header>
        {catalog.isError ? (
          <PageError
            title="Không tải được danh mục khóa học"
            retry={() => void catalog.refetch()}
          />
        ) : (
          <CourseGrid courses={catalog.data ?? []} loading={catalog.isPending} />
        )}
        <p className="max-w-xl text-sm leading-6 text-ink-muted">
          Chương trình A1.2 đang hoàn thiện. Nội dung học thử chỉ mở cho A1.1; thông tin chính thức
          về học phí và thời hạn sẽ được công bố sau khi xác nhận.
        </p>
      </Container>
    </SitePage>
  )
}

export function CourseDetailPage() {
  const { slug = '' } = useParams()
  const navigate = useNavigate()
  const dialogs = useDialogs()
  const { session } = useAuthSession()
  const courseQuery = usePublicCourse(slug)
  const manifestQuery = usePublicPreviewManifest(slug)
  usePageTitle(courseQuery.data?.title ?? 'Chi tiết khóa học')

  if (courseQuery.isPending || manifestQuery.isPending) {
    return (
      <SitePage>
        <Container className="py-12">
          <DomainState kind="loading" title="Đang tải thông tin khóa học" />
        </Container>
      </SitePage>
    )
  }
  if (courseQuery.isError || manifestQuery.isError) {
    return (
      <SitePage>
        <Container className="py-12">
          <PageError
            title="Không tải được thông tin khóa học"
            retry={() => {
              void courseQuery.refetch()
              void manifestQuery.refetch()
            }}
          />
        </Container>
      </SitePage>
    )
  }
  if (!courseQuery.data) return <PublicNotFoundPage />

  const course = courseQuery.data
  const manifest = manifestQuery.data
  const previewSections = manifest ? getPreviewSections(course, manifest) : null
  const previewSectionIds = previewSections?.map((section) => section.id) ?? []
  const hasPreview = previewSectionIds.length > 0
  const detailPreviewHref = `/courses/${course.slug}/preview`
  const checkoutHref = `/checkout/purchase-course-a11-demo`
  const openDemoCheckout = () =>
    navigate(session ? checkoutHref : `/login?returnTo=${encodeURIComponent(checkoutHref)}`)
  const showUnavailablePurchase = () =>
    dialogs.info(
      'Đăng ký khóa học chưa mở',
      'Bản demo chưa nhận đăng ký hoặc thanh toán. Học phí và thời hạn truy cập sẽ được công bố khi chương trình chính thức sẵn sàng.',
    )

  return (
    <SitePage>
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
          access={
            hasPreview
              ? {
                  kind: 'customer-preview',
                  label: `Có ${previewSectionIds.length} chương học thử miễn phí`,
                  source: 'customer-requested-demo',
                }
              : {
                  kind: 'restricted',
                  label: 'Nội dung học thử đang được chuẩn bị',
                  reason: 'Khóa học chưa có chương học thử được cấu hình.',
                }
          }
          primaryAction={{
            label: hasPreview ? 'Học thử miễn phí' : 'Xem chương trình học',
            onClick: () =>
              hasPreview
                ? navigate(detailPreviewHref)
                : document
                    .getElementById('course-outline-heading')
                    ?.scrollIntoView({ behavior: 'smooth', block: 'start' }),
          }}
          {...(course.slug === 'tieng-duc-a1-1'
            ? { secondaryAction: { label: 'Thử quy trình mua demo', onClick: openDemoCheckout } }
            : {})}
          accessNote="Giá và thời hạn trên danh mục chỉ là số liệu minh họa trong bản demo."
        />

        <div className="grid gap-12 lg:grid-cols-[minmax(0,1.2fr)_minmax(17rem,0.8fr)] lg:items-start">
          <div className="min-w-0 space-y-12">
            <CourseOverview description={course.description} />
            <CourseObjectives
              title="Mục tiêu minh họa trong bản demo"
              objectives={course.objectives}
            />
            <section aria-labelledby="course-outline-heading" className="space-y-4">
              <div className="space-y-2">
                <h2 id="course-outline-heading" className="font-display text-2xl font-bold">
                  Chương trình học
                </h2>
                <p className="text-sm leading-6 text-ink-secondary">
                  Mở một chương để xem danh sách bài. Chỉ các chương được đánh dấu mới có nội dung
                  học thử.
                </p>
              </div>
              <CourseOutline
                sections={course.sections}
                previewSectionIds={previewSectionIds}
                previewLabel="Học thử miễn phí"
                {...(previewSections ? { previewHref: detailPreviewHref } : {})}
                onLessonSelect={(lessonId) => {
                  const section = course.sections.find((item) =>
                    item.lessons.some((lesson) => lesson.id === lessonId),
                  )
                  if (!section) return
                  if (!previewSectionIds.includes(section.id)) {
                    showUnavailablePurchase()
                    return
                  }
                  navigate(
                    `${detailPreviewHref}?sectionId=${encodeURIComponent(section.id)}&lessonId=${encodeURIComponent(lessonId)}`,
                  )
                }}
              />
            </section>
          </div>

          <aside className="space-y-4 lg:sticky lg:top-28">
            <Card className="p-5 sm:p-6">
              <div className="flex items-center gap-2">
                <LockKeyhole aria-hidden="true" className="size-5 text-action-primary" />
                <h2 className="font-display text-lg font-bold">Quyền truy cập</h2>
              </div>
              <p className="mt-3 text-sm leading-6 text-ink-secondary">
                {hasPreview
                  ? `${previewSectionIds.length} chương đầu được mở học thử. Các chương và phần ôn tập còn lại thuộc khóa học đầy đủ và cần quyền truy cập.`
                  : 'Chương trình A1.2 đang được hoàn thiện; hiện chưa có nội dung học thử.'}
              </p>
              <p className="mt-3 text-sm leading-6 text-ink-muted">
                Giá và thời hạn trong checkout là giả định; đây không phải giao dịch thật.
              </p>
              <Button className="mt-5 w-full" variant="outline" onClick={openDemoCheckout}>
                Thử checkout demo
              </Button>
            </Card>
            <Card className="bg-surface-blue p-5">
              <p className="text-sm font-semibold text-pastel-blue-ink">Nội dung demo</p>
              <p className="mt-2 text-sm leading-6 text-ink-secondary">
                Tên chương và bài học đang chờ xác nhận. Video chưa được kết nối.
              </p>
            </Card>
          </aside>
        </div>

        <div className="flex flex-wrap items-center gap-3 border-t border-border-subtle pt-6">
          {course.slug === 'tieng-duc-a1-1' && (
            <LinkButton
              to={checkoutHref}
              variant="outline"
              endIcon={<ArrowRight aria-hidden="true" />}
            >
              Thử quy trình mua demo
            </LinkButton>
          )}
          {hasPreview && (
            <LinkButton to={detailPreviewHref} endIcon={<ArrowRight aria-hidden="true" />}>
              Mở chương học thử
            </LinkButton>
          )}
          <Link
            to="/courses"
            className="inline-flex min-h-11 items-center gap-2 px-2 font-semibold text-ink-secondary hover:text-action-primary"
          >
            <ArrowLeft aria-hidden="true" className="size-4" />
            Về danh mục
          </Link>
        </div>
      </Container>
    </SitePage>
  )
}

function previewHref(slug: string, sectionId: string, lessonId?: string) {
  const query = new URLSearchParams({ sectionId })
  if (lessonId) query.set('lessonId', lessonId)
  return `/courses/${slug}/preview?${query.toString()}`
}

function PreviewStateMessage({
  title,
  message,
  courseSlug,
}: {
  title: string
  message: string
  courseSlug: string
}) {
  return (
    <div className="space-y-4">
      <DomainState kind="empty" title={title} message={message} />
      <LinkButton
        to={`/courses/${courseSlug}`}
        variant="outline"
        startIcon={<ArrowLeft aria-hidden="true" />}
      >
        Về thông tin khóa học
      </LinkButton>
    </div>
  )
}

export function FreePreviewPage() {
  const { slug = '' } = useParams()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const sectionId = searchParams.get('sectionId') ?? undefined
  const lessonId = searchParams.get('lessonId') ?? undefined
  const experienceQuery = usePreviewExperience(slug, sectionId, lessonId)
  const experience = experienceQuery.data
  const course = experience && experience.kind !== 'course-not-found' ? experience.course : null
  usePageTitle(course ? `Học thử · ${course.title}` : 'Học thử miễn phí')

  useEffect(() => {
    if (!experience || experience.kind !== 'available') return
    if (!sectionId || !lessonId) {
      const next = new URLSearchParams(searchParams)
      next.set('sectionId', experience.section.id)
      next.set('lessonId', experience.lesson.id)
      setSearchParams(next, { replace: true })
    }
  }, [experience, lessonId, searchParams, sectionId, setSearchParams])

  const selectSection = (nextSectionId: string) => {
    const nextSection =
      experience && 'sections' in experience
        ? experience.sections.find((section) => section.id === nextSectionId)
        : undefined
    const nextLessonId = nextSection?.lessons[0]?.id
    if (nextLessonId) navigate(previewHref(slug, nextSectionId, nextLessonId))
    else navigate(previewHref(slug, nextSectionId))
  }

  if (experienceQuery.isPending) {
    return (
      <SitePage>
        <Container className="py-12">
          <DomainState kind="loading" title="Đang mở nội dung học thử" />
        </Container>
      </SitePage>
    )
  }
  if (experienceQuery.isError) {
    return (
      <SitePage>
        <Container className="py-12">
          <PageError
            title="Không tải được nội dung học thử"
            retry={() => void experienceQuery.refetch()}
          />
        </Container>
      </SitePage>
    )
  }
  if (!experience || experience.kind === 'course-not-found') return <PublicNotFoundPage />

  if (
    experience.kind === 'preview-not-configured' ||
    experience.kind === 'invalid-preview-manifest'
  ) {
    return (
      <SitePage>
        <Container className="py-12">
          <PreviewStateMessage
            title="Chưa có nội dung học thử"
            message="Khóa học hiện chưa có chương học thử được cấu hình."
            courseSlug={experience.course.slug}
          />
        </Container>
      </SitePage>
    )
  }

  const sections = experience.sections
  const activeSection =
    experience.kind === 'available' ||
    experience.kind === 'empty-section' ||
    experience.kind === 'lesson-not-found' ||
    experience.kind === 'content-missing'
      ? experience.section
      : experience.kind === 'restricted-section'
        ? {
            id: experience.requestedSection.id,
            title: experience.requestedSection.title,
            lessons: experience.requestedSection.lessons,
          }
        : undefined
  const currentLessonId =
    experience.kind === 'available' || experience.kind === 'content-missing'
      ? experience.lesson.id
      : undefined

  return (
    <SitePage>
      <Container className="space-y-6 py-8 sm:py-10">
        <nav
          aria-label="Đường dẫn"
          className="flex flex-wrap items-center gap-2 text-sm text-ink-secondary"
        >
          <Link
            to="/courses"
            className="underline-offset-4 hover:text-action-primary hover:underline"
          >
            Khóa học
          </Link>
          <span aria-hidden="true">/</span>
          <Link
            to={`/courses/${experience.course.slug}`}
            className="underline-offset-4 hover:text-action-primary hover:underline"
          >
            {experience.course.level}
          </Link>
          <span aria-hidden="true">/</span>
          <span aria-current="page" className="text-ink-primary">
            Học thử
          </span>
        </nav>

        <header className="flex flex-col gap-4 border-b border-border-subtle pb-6 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-2">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-action-primary">
              Học thử miễn phí · Không cần đăng nhập
            </p>
            <h1 className="font-display text-2xl font-extrabold tracking-tight sm:text-3xl">
              {experience.course.title}
            </h1>
            <p className="max-w-2xl text-sm leading-6 text-ink-secondary">
              {experience.manifest.notice}
            </p>
          </div>
          <Link
            to={`/courses/${experience.course.slug}`}
            className="inline-flex min-h-11 shrink-0 items-center gap-2 font-semibold text-action-primary underline-offset-4 hover:underline"
          >
            <ArrowLeft aria-hidden="true" className="size-4" />
            Thông tin khóa học
          </Link>
        </header>

        <div className="lg:hidden">
          <label
            htmlFor="preview-chapter-select"
            className="mb-2 block text-sm font-semibold text-ink-primary"
          >
            Chọn chương học thử
          </label>
          <select
            id="preview-chapter-select"
            value={
              sections.some((section) => section.id === activeSection?.id) ? activeSection?.id : ''
            }
            onChange={(event) => selectSection(event.currentTarget.value)}
            className="min-h-12 w-full rounded-control border border-border-strong bg-card-surface px-3 text-ink-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-action-focus"
          >
            <option value="">Chọn một trong ba chương miễn phí</option>
            {sections.map((section, index) => (
              <option
                key={section.id}
                value={section.id}
              >{`${index + 1}. ${section.title}`}</option>
            ))}
          </select>
        </div>

        <div className="grid min-w-0 gap-6 lg:grid-cols-[17rem_minmax(0,1fr)] lg:gap-8">
          <aside className="hidden min-w-0 lg:block">
            <div className="sticky top-28 rounded-2xl border border-border-subtle bg-card-surface p-4">
              <h2 className="px-2 pb-3 font-display text-base font-bold">Chương học thử</h2>
              <nav aria-label="Chương học thử" className="grid gap-1">
                {sections.map((section, index) => (
                  <Link
                    key={section.id}
                    to={previewHref(experience.course.slug, section.id, section.lessons[0]?.id)}
                    aria-current={activeSection?.id === section.id ? 'page' : undefined}
                    className={`flex min-h-11 items-start gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors hover:bg-surface-muted ${activeSection?.id === section.id ? 'bg-surface-blue font-semibold text-pastel-blue-ink' : 'text-ink-secondary'}`}
                  >
                    <span
                      aria-hidden="true"
                      className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-full bg-card-surface text-xs font-bold text-action-primary"
                    >
                      {index + 1}
                    </span>
                    <span className="min-w-0 leading-5">{section.title}</span>
                  </Link>
                ))}
              </nav>
            </div>
          </aside>

          <div className="min-w-0 space-y-6">
            {activeSection && sections.some((section) => section.id === activeSection.id) && (
              <section
                aria-labelledby="preview-lessons-heading"
                className="rounded-2xl border border-border-subtle bg-card-surface p-4 sm:p-5"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.12em] text-action-primary">
                      Chương học thử
                    </p>
                    <h2
                      id="preview-lessons-heading"
                      className="mt-1 font-display text-lg font-bold"
                    >
                      {activeSection.title}
                    </h2>
                  </div>
                  <Badge tone="preview">Miễn phí</Badge>
                </div>
                <nav aria-label="Bài học trong chương" className="mt-4 grid gap-2 sm:grid-cols-2">
                  {activeSection.lessons.map((lesson) => (
                    <Link
                      key={lesson.id}
                      to={previewHref(experience.course.slug, activeSection.id, lesson.id)}
                      aria-current={currentLessonId === lesson.id ? 'page' : undefined}
                      className={`flex min-h-12 items-center justify-between gap-3 rounded-xl border px-3 py-2 text-sm transition-colors hover:border-action-primary/50 hover:bg-surface-muted ${currentLessonId === lesson.id ? 'border-action-primary/40 bg-surface-blue font-semibold text-pastel-blue-ink' : 'border-border-subtle text-ink-secondary'}`}
                    >
                      <span className="min-w-0">{lesson.title}</span>
                      <span className="shrink-0 text-xs text-ink-secondary">
                        {lesson.estimatedMinutes
                          ? `${lesson.estimatedMinutes} phút`
                          : lesson.lessonType}
                      </span>
                    </Link>
                  ))}
                </nav>
              </section>
            )}

            {experience.kind === 'available' ? (
              <article className="min-w-0 space-y-6 rounded-2xl border border-border-subtle bg-card-surface p-5 sm:p-8">
                <div className="space-y-2">
                  <p className="text-xs font-bold uppercase tracking-[0.14em] text-action-primary">
                    Bài học mẫu
                  </p>
                  <h2 className="font-display text-2xl font-bold tracking-tight">
                    {experience.lesson.title}
                  </h2>
                </div>
                <div className="space-y-4 leading-7 text-ink-secondary">
                  {experience.content.paragraphs.map((paragraph) => (
                    <p key={paragraph}>{paragraph}</p>
                  ))}
                </div>
                {experience.content.keyPhrases.length > 0 && (
                  <section
                    aria-labelledby="preview-phrases-heading"
                    className="rounded-2xl bg-surface-lime p-4 sm:p-5"
                  >
                    <h3 id="preview-phrases-heading" className="font-display font-bold">
                      Cụm từ trong bài
                    </h3>
                    <dl className="mt-3 divide-y divide-ink-primary/10">
                      {experience.content.keyPhrases.map((phrase) => (
                        <div
                          key={phrase.german}
                          className="grid gap-1 py-3 sm:grid-cols-2 sm:gap-4"
                        >
                          <dt lang="de" className="font-semibold text-ink-primary">
                            {phrase.german}
                          </dt>
                          <dd className="text-sm text-ink-secondary">{phrase.vietnamese}</dd>
                        </div>
                      ))}
                    </dl>
                  </section>
                )}
                <section aria-label="Video bài học" className="space-y-3">
                  {experience.content.media.length > 0 ? (
                    experience.content.media.map((media) => (
                      <VideoPlayer key={media.id} media={media} />
                    ))
                  ) : (
                    <DomainState kind="empty" title="Video học thử đang được cập nhật" />
                  )}
                </section>
                <p className="border-t border-border-subtle pt-4 text-xs leading-5 text-ink-muted">
                  Nội dung minh họa cho giao diện demo; chưa phải phiên bản bài giảng chính thức.
                </p>
              </article>
            ) : experience.kind === 'restricted-section' ? (
              <div className="space-y-4">
                <DomainState
                  kind="empty"
                  title="Chương này thuộc khóa học đầy đủ"
                  message="Chỉ ba chương được đánh dấu học thử có thể mở miễn phí. Truy cập nội dung khác chưa được bật trong bản demo."
                >
                  <LockKeyhole aria-hidden="true" className="size-5 text-ink-muted" />
                </DomainState>
                <LinkButton to={`/courses/${experience.course.slug}`} variant="outline">
                  Xem thông tin khóa học
                </LinkButton>
              </div>
            ) : experience.kind === 'invalid-section' ? (
              <div className="space-y-4">
                <DomainState
                  kind="error"
                  title="Không tìm thấy chương học thử"
                  message="Đường dẫn chương không hợp lệ. Hãy chọn một trong ba chương được mở miễn phí."
                />
                <LinkButton
                  to={previewHref(
                    experience.course.slug,
                    sections[0]!.id,
                    sections[0]!.lessons[0]?.id,
                  )}
                >
                  Mở chương đầu tiên
                </LinkButton>
              </div>
            ) : experience.kind === 'empty-section' ? (
              <PreviewStateMessage
                title="Chương này chưa có bài học"
                message="Danh sách bài học đang được cập nhật."
                courseSlug={experience.course.slug}
              />
            ) : experience.kind === 'lesson-not-found' ? (
              <PreviewStateMessage
                title="Không tìm thấy bài học"
                message="Bài học này không thuộc chương đã chọn."
                courseSlug={experience.course.slug}
              />
            ) : (
              <PreviewStateMessage
                title="Nội dung bài học đang được chuẩn bị"
                message="Bài này nằm trong chương học thử nhưng nội dung chưa sẵn sàng. Bạn vẫn có thể chọn bài khác hoặc chuyển chương."
                courseSlug={experience.course.slug}
              />
            )}

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border-subtle pt-4">
              <Link
                to={`/courses/${experience.course.slug}`}
                className="inline-flex min-h-11 items-center gap-2 px-2 font-semibold text-ink-secondary hover:text-action-primary"
              >
                <ArrowLeft aria-hidden="true" className="size-4" />
                Về thông tin khóa học
              </Link>
              <a
                href="#main-content"
                className="inline-flex min-h-11 items-center gap-2 px-2 text-sm font-semibold text-action-primary hover:underline"
              >
                Lên đầu trang <ArrowDown aria-hidden="true" className="size-4 rotate-180" />
              </a>
            </div>
          </div>
        </div>
      </Container>
    </SitePage>
  )
}

export function PublicNotFoundPage() {
  usePageTitle('Không tìm thấy trang')
  return (
    <SitePage>
      <Container className="grid min-h-[60vh] place-items-center py-12">
        <div className="max-w-xl space-y-5 text-center">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-action-primary">
            404 · Trang không tồn tại
          </p>
          <h1 className="font-display text-3xl font-extrabold tracking-tight">
            Không tìm thấy nội dung này
          </h1>
          <p className="leading-7 text-ink-secondary">
            Đường dẫn có thể đã thay đổi hoặc không thuộc website khóa học.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <LinkButton to="/" startIcon={<ArrowLeft aria-hidden="true" />}>
              Về trang chủ
            </LinkButton>
            <LinkButton to="/courses" variant="outline" endIcon={<ArrowRight aria-hidden="true" />}>
              Xem khóa học
            </LinkButton>
          </div>
        </div>
      </Container>
    </SitePage>
  )
}

export function PublicHelpPage() {
  usePageTitle('Trợ giúp và câu hỏi thường gặp')
  return (
    <SitePage>
      <Container className="grid gap-8 py-8 sm:py-12">
        <header className="max-w-3xl space-y-3">
          <Badge tone="info">Hỗ trợ sử dụng bản demo</Badge>
          <h1 className="font-display text-3xl font-extrabold tracking-tight sm:text-4xl">
            Trợ giúp & câu hỏi thường gặp
          </h1>
          <p className="text-base leading-7 text-ink-secondary">
            Hướng dẫn điều hướng website, phần học thử, tài khoản và các giới hạn của mô phỏng hiện
            tại.
          </p>
        </header>
        <Accordion type="single" collapsible className="grid gap-3">
          <AccordionItem
            value="navigation"
            className="rounded-2xl border border-border-subtle bg-card-surface px-4"
          >
            <AccordionTrigger headingLevel={2}>Điều hướng website như thế nào?</AccordionTrigger>
            <AccordionContent>
              Mở Khóa học để xem mô tả và cấu trúc A1.1. Chọn Học thử để vào các bài được manifest
              demo cho phép. Sau khi đăng nhập, thanh điều hướng học viên dẫn tới khóa học, tiến độ,
              đơn hàng và tài khoản.
            </AccordionContent>
          </AccordionItem>
          <AccordionItem
            value="preview"
            className="rounded-2xl border border-border-subtle bg-card-surface px-4"
          >
            <AccordionTrigger headingLevel={2}>Phần học thử có nội dung gì?</AccordionTrigger>
            <AccordionContent>
              Bản demo hiển thị những mục được đánh dấu trong preview manifest. Đây là dữ liệu trình
              diễn của website; nội dung, chương trình và quyền học chính thức cần được xác nhận
              riêng.
            </AccordionContent>
          </AccordionItem>
          <AccordionItem
            value="account"
            className="rounded-2xl border border-border-subtle bg-card-surface px-4"
          >
            <AccordionTrigger headingLevel={2}>
              Tôi có thể thử khu vực học viên bằng cách nào?
            </AccordionTrigger>
            <AccordionContent>
              Tạo tài khoản demo bằng địa chỉ giả lập kết thúc bằng .test hoặc dùng một trong các
              persona demo ở trang đăng nhập. Đây không phải tài khoản dịch vụ thật và mật khẩu demo
              không được lưu trong browser storage.
            </AccordionContent>
          </AccordionItem>
          <AccordionItem
            value="payment"
            className="rounded-2xl border border-border-subtle bg-card-surface px-4"
          >
            <AccordionTrigger headingLevel={2}>
              Checkout và thanh toán có thu tiền không?
            </AccordionTrigger>
            <AccordionContent>
              Không. Giá và thời hạn trong checkout được ghi rõ là giả định demo. Cổng thanh toán
              demo chỉ tạo kết quả mô phỏng để thử trạng thái đơn và quyền học; không nhập thông tin
              thẻ hoặc chuyển tiền.
            </AccordionContent>
          </AccordionItem>
          <AccordionItem
            value="media"
            className="rounded-2xl border border-border-subtle bg-card-surface px-4"
          >
            <AccordionTrigger headingLevel={2}>
              Vì sao video hoặc audio chưa phát được?
            </AccordionTrigger>
            <AccordionContent>
              Media chưa có nguồn được cấp quyền sẽ hiển thị trạng thái chưa sẵn sàng. Một số PDF
              mẫu nội bộ được dùng để kiểm tra bố cục; không có nội dung private hoặc tài sản được
              sao chép từ bên thứ ba.
            </AccordionContent>
          </AccordionItem>
        </Accordion>
        <div className="flex flex-wrap gap-3">
          <LinkButton to="/courses" variant="outline">
            Xem khóa học
          </LinkButton>
          <LinkButton to={`/courses/${courseSlug}/preview`}>Mở phần học thử</LinkButton>
          <LinkButton to="/login" variant="outline">
            Đăng nhập demo
          </LinkButton>
        </div>
      </Container>
    </SitePage>
  )
}
