import { BookOpenText, CircleHelp, ExternalLink, ShieldAlert, TriangleAlert } from 'lucide-react'
import { brandConfig } from '@/config/brand'
import { useEffect, useMemo, useRef, useState } from 'react'
import { BaseDialog } from '@/shared/ui/dialogs'
import { useNotifications } from '@/shared/ui/notifications'
import { Badge, Button, Card, Container, PageHeader, SelectField } from '@/shared/ui'
import {
  AccountEmptyState,
  AccountNavigation,
  AccountSecurityLinks,
  ProfileForm,
  SecurityNotice,
  SessionList,
  StudentProfileCard,
} from '@/domains/account'
import {
  CourseDetailHero,
  CourseGrid,
  CourseObjectives,
  CourseOutline,
  CourseOverview,
  CoursePricingSummary,
  FreePreviewBadge,
  FreePreviewSection,
  LandingHero,
  LearningBenefits,
} from '@/domains/catalog'
import {
  CheckoutInformationPanel,
  CouponField,
  EnrollmentStatusCard,
  OrderHistoryItem,
  OrderSummary,
  PaymentFailureState,
  PaymentPendingState,
  PaymentStatusPanel,
  PaymentSuccessState,
  PriceSummary,
  PricingCard,
  RenewalPlanCard,
} from '@/domains/commerce'
import { EnrollmentAccessPanel } from '@/domains/enrollment'
import { ExerciseCompletionAction, ExerciseHeader, FileExercisePanel } from '@/domains/exercises'
import {
  AccessStatePanel,
  CourseTree,
  LearningCourseHeader,
  LearningProgressSummary,
  LessonCompletionIndicator,
  LessonContent,
  LessonNavigation,
  LockedContentPanel,
} from '@/domains/learning'
import {
  AudioPlayer,
  MediaErrorState,
  MediaLoadingState,
  MediaUnavailableState,
  PDFViewer,
  VideoPlayer,
} from '@/domains/media'
import {
  ContinueLearningCard,
  CourseProgressCard,
  LearningStatsSummary,
  LessonNotesEditor,
  LessonProgressList,
  NoteSaveStatus,
} from '@/domains/progress'
import { QuizIntro, QuizResult, QuizRunner } from '@/domains/quizzes'
import {
  A11_COURSE,
  MOCK_EXERCISE,
  MOCK_MEDIA,
  MOCK_PREVIEW_MANIFEST,
  MOCK_QUIZ_ATTEMPT,
  MOCK_QUIZ_RESULT,
  createMockRepository,
  MOCK_SCENARIOS,
  MOCK_SCENARIO_LABELS,
  MockRepositoryFailure,
  type LmsRepository,
  type MockResponseMode,
  type MockScenarioId,
  type SupportedMockStatus,
} from '@/data/mock'
import type { CourseAccessViewModel, CourseSummaryModel } from '@/domains/catalog/models'
import type { CourseTreeViewModel, LessonContentViewModel } from '@/domains/learning/models'
import type { CourseProgressViewModel } from '@/domains/progress/models'
import type { ExerciseViewModel } from '@/domains/exercises/models'
import type { QuizAttemptViewModel, QuizResultViewModel } from '@/domains/quizzes/models'
import type { EnrollmentSummaryViewModel } from '@/domains/enrollment/models'
import type { OrderSummaryViewModel } from '@/domains/commerce/models'
import type { SessionSummaryViewModel, StudentProfileViewModel } from '@/domains/account/models'
import type { RepositoryError } from '@/data/mock/errors'

const sectionLinks = [
  ['course-discovery', 'Khám phá'],
  ['course-tree', 'Bài học'],
  ['media', 'Media'],
  ['file-exercises', 'Bài tập'],
  ['quizzes', 'Quiz'],
  ['progress-notes', 'Tiến độ'],
  ['commerce', 'Đơn hàng'],
  ['enrollment', 'Truy cập'],
  ['profile', 'Tài khoản'],
  ['mock-scenarios', 'Mock'],
] as const

const httpStatuses: readonly SupportedMockStatus[] = [401, 403, 404, 409, 422, 429, 500]

interface DemoData {
  requestKey: string
  courses: readonly CourseSummaryModel[]
  tree?: CourseTreeViewModel
  access?: CourseAccessViewModel
  lesson?: LessonContentViewModel
  progress?: CourseProgressViewModel
  exercise?: ExerciseViewModel
  order?: OrderSummaryViewModel | null
  enrollment?: EnrollmentSummaryViewModel | null
  profile?: StudentProfileViewModel | null
  sessions: readonly SessionSummaryViewModel[]
  note: string
  error?: RepositoryError
}

const emptyDemoData: Omit<DemoData, 'requestKey'> = { courses: [], sessions: [], note: '' }

function repositoryError(reason: unknown): RepositoryError {
  if (reason instanceof MockRepositoryFailure) return reason.failure
  return {
    kind: 'network',
    message: reason instanceof Error ? reason.message : 'Không thể tải mock data.',
  }
}

function jumpTo(id: string) {
  document.getElementById(id)?.scrollIntoView({ block: 'start', behavior: 'auto' })
}

export function LmsKitPage() {
  const [scenario, setScenario] = useState<MockScenarioId>('active_student')
  const [responseMode, setResponseMode] = useState<MockResponseMode>('success')
  const [errorStatus, setErrorStatus] = useState<SupportedMockStatus>(422)
  const [selectedLessonId, setSelectedLessonId] = useState('a11-lesson-01')
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [storedData, setData] = useState<DemoData | undefined>()
  const [attempt, setAttempt] = useState<QuizAttemptViewModel>()
  const [noteValue, setNoteValue] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const requestSequence = useRef(0)
  const notifications = useNotifications()

  const repository: LmsRepository = useMemo(
    () =>
      createMockRepository(scenario, {
        latencyMs: 160,
        responseMode,
        ...(responseMode === 'api-error'
          ? { failure: { mode: 'api-error' as const, status: errorStatus } }
          : {}),
      }),
    [scenario, responseMode, errorStatus],
  )
  const requestKey = `${scenario}:${responseMode}:${errorStatus}:${selectedLessonId}`
  const isLoading = storedData?.requestKey !== requestKey
  const data = !isLoading && storedData ? storedData : emptyDemoData
  const visibleAttempt = isLoading ? undefined : attempt

  useEffect(() => {
    const currentRequest = ++requestSequence.current
    void Promise.all([
      repository.getCourseCatalog(),
      repository.getCourseTree(),
      repository.getCourseAccess(),
      repository.getLessonContent(selectedLessonId),
      repository.getCourseProgress(),
      repository.getExercise(MOCK_EXERCISE.id),
      repository.getOrders(),
      repository.getEnrollment(A11_COURSE.id),
      repository.getProfile(),
      repository.getSessions(),
      repository.getLessonNote('a11-lesson-01'),
      repository.getQuizAttempt(MOCK_QUIZ_ATTEMPT.id),
    ])
      .then(
        ([
          courses,
          tree,
          access,
          lesson,
          progress,
          exercise,
          orders,
          enrollment,
          profile,
          sessions,
          note,
          quizAttempt,
        ]) => {
          if (requestSequence.current !== currentRequest) return
          const next: DemoData = {
            requestKey,
            courses,
            tree,
            access,
            lesson,
            progress,
            exercise,
            order: orders[0] ?? null,
            enrollment,
            profile,
            sessions,
            note,
          }
          setData(next)
          setAttempt(quizAttempt)
          setNoteValue(note)
          setCurrentQuestionIndex(0)
        },
      )
      .catch((reason: unknown) => {
        if (requestSequence.current !== currentRequest) return
        setData({ ...emptyDemoData, requestKey, error: repositoryError(reason) })
        setAttempt(undefined)
      })
    return () => {
      requestSequence.current += 1
    }
  }, [repository, requestKey, selectedLessonId])

  const access: CourseAccessViewModel = data.access ?? {
    kind: 'loading',
    label: 'Đang tải quyền truy cập',
  }
  const progress = data.progress ?? {
    courseId: A11_COURSE.id,
    percent: 0,
    completedLessons: 0,
    totalLessons: 0,
  }
  const lessonTree = data.tree ? { ...data.tree, currentLessonId: selectedLessonId } : undefined
  const learningItems =
    lessonTree?.sections.flatMap((section) =>
      section.lessons.map((lesson) => ({ id: lesson.id, title: lesson.title, access })),
    ) ?? []
  const selectedAnswers = visibleAttempt?.selectedAnswers ?? {}

  async function submitQuiz(): Promise<QuizResultViewModel> {
    if (!attempt) throw new Error('Quiz attempt is unavailable.')
    const answers = Object.fromEntries(
      Object.entries(attempt.selectedAnswers).filter((entry): entry is [string, string] =>
        Boolean(entry[1]),
      ),
    )
    return repository.submitQuiz(attempt.id, answers)
  }

  return (
    <div className="min-h-screen bg-page-surface text-ink-primary">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-lg focus:bg-card-surface focus:px-4 focus:py-3"
      >
        Bỏ qua điều hướng
      </a>
      <header className="border-b border-border-subtle bg-card-surface">
        <Container className="flex flex-wrap items-center justify-between gap-4 py-5">
          <div className="flex min-w-0 items-center gap-3">
            <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-brand-blue text-action-primary">
              <BookOpenText aria-hidden="true" className="size-5" />
            </span>
            <div className="min-w-0">
              <p className="text-xs font-bold uppercase tracking-[0.15em] text-action-primary">
                {brandConfig.name}
              </p>
              <p className="truncate font-display text-lg font-extrabold">LMS domain kit</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="warning">CHỈ DÀNH CHO DEV</Badge>
            <a
              href="/__dev/ui-kit"
              className="inline-flex min-h-11 items-center gap-2 rounded-lg px-3 text-sm font-semibold text-action-primary hover:bg-surface-muted"
            >
              UI Kit <ExternalLink aria-hidden="true" className="size-4" />
            </a>
          </div>
        </Container>
      </header>

      <main id="main-content" tabIndex={-1} className="scroll-mt-6 outline-none">
        <Container className="space-y-8 py-7 sm:py-10">
          <PageHeader
            eyebrow="Phase 1B · Development showcase"
            title="Thư viện giao diện học tập"
            description="Các component nhận presentation model và callback. Dữ liệu, quyền truy cập và kết quả quiz đến từ repository demo."
            actions={
              <Button variant="outline" onClick={() => setDialogOpen(true)}>
                <CircleHelp aria-hidden="true" />
                Giới thiệu demo
              </Button>
            }
          />
          <nav
            aria-label="Các nhóm component LMS"
            className="rounded-2xl border border-border-subtle bg-card-surface p-3 sm:p-4"
          >
            <ul className="grid grid-cols-2 gap-2 sm:grid-cols-5 xl:grid-cols-10">
              {sectionLinks.map(([id, label]) => (
                <li key={id}>
                  <a
                    href={`#${id}`}
                    className="flex min-h-11 items-center justify-center rounded-xl px-2 text-center text-xs font-semibold text-ink-secondary hover:bg-surface-muted hover:text-ink-primary focus-visible:outline-2 focus-visible:outline-action-focus sm:text-sm"
                  >
                    {label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>

          <section id="course-discovery" className="scroll-mt-6 space-y-7">
            <SectionHeading
              index="01"
              title="Khám phá khóa học"
              description="Landing, course card, outline và cấu hình preview mock theo đúng ba section ID."
            />
            <LandingHero
              headingLevel={3}
              title="Bắt đầu nói tiếng Đức từ những câu quen thuộc"
              description="Học qua tình huống giao tiếp ngắn, từng bài một. Nội dung ở showcase là fixture minh họa."
              imageUrl="/demo-assets/a11-course-card.svg"
              primaryAction={{ label: 'Xem khóa A1.1', onClick: () => jumpTo('course-grid') }}
              secondaryAction={{ label: 'Mở mục lục', onClick: () => jumpTo('course-outline') }}
            />
            <LearningBenefits
              benefits={[
                {
                  title: 'Bài học ngắn',
                  description: 'Mỗi nội dung chia thành các bước nhỏ để dễ quay lại.',
                },
                {
                  title: 'Nghe và thực hành',
                  description:
                    'Player và bài tập giữ nguyên trạng thái loading, unavailable và error.',
                },
                {
                  title: 'Theo dõi tiến độ',
                  description:
                    'Phần trăm hiển thị từ fixture/repository, không tự tính trong card.',
                },
              ]}
            />
            <div id="course-grid" className="scroll-mt-6 space-y-4">
              <h3 className="font-display text-xl font-bold">Khóa học có sẵn</h3>
              <CourseGrid
                courses={data.courses}
                loading={isLoading}
                {...(data.error ? { error: data.error.message } : {})}
                onOpenCourse={(course) => {
                  notifications.info(
                    'Đã chọn khóa học',
                    `Đã chọn ${course.code}; phần chi tiết được trình bày ngay bên dưới.`,
                  )
                  jumpTo('course-outline')
                }}
              />
            </div>
            <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_19rem]">
              <div className="space-y-5">
                <CourseDetailHero
                  headingLevel={3}
                  course={A11_COURSE}
                  access={access}
                  primaryAction={{
                    label: 'Xem nội dung khóa học',
                    onClick: () => jumpTo('course-outline'),
                  }}
                  secondaryAction={{ label: 'Xem học phí', onClick: () => jumpTo('course-price') }}
                />
                <CourseOverview description={A11_COURSE.description} />
                <CourseObjectives objectives={A11_COURSE.objectives} />
              </div>
              <div id="course-price" className="scroll-mt-6 space-y-3">
                <CoursePricingSummary
                  priceVnd={A11_COURSE.priceVnd!}
                  durationMonths={A11_COURSE.accessDurationMonths!}
                  note="Giá là dữ liệu fixture, không tạo giao dịch."
                />
                <PricingCard
                  title="Khóa A1.1"
                  priceVnd={A11_COURSE.priceVnd!}
                  durationMonths={A11_COURSE.accessDurationMonths!}
                  description="Mẫu card giá cho trang giới thiệu."
                />
              </div>
            </div>
            <div id="course-outline" className="scroll-mt-6 grid min-w-0 gap-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h3 className="font-display text-xl font-bold">Nội dung khóa học</h3>
                <FreePreviewBadge />
              </div>
              <p className="text-sm leading-6 text-ink-secondary">
                Các chương preview được chọn từ manifest mock bằng ID; thứ tự lesson không quyết
                định quyền xem.
              </p>
              <CourseOutline
                sections={A11_COURSE.sections}
                previewManifest={MOCK_PREVIEW_MANIFEST}
                onLessonSelect={(id) => {
                  setSelectedLessonId(id)
                  jumpTo('course-tree')
                }}
              />
              {A11_COURSE.sections.slice(0, 1).map((section) => (
                <FreePreviewSection
                  key={section.id}
                  section={section}
                  manifest={MOCK_PREVIEW_MANIFEST}
                >
                  <p className="text-sm text-ink-secondary">
                    Section ID: <code>{section.id}</code>
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedLessonId(section.lessons[0]?.id ?? 'a11-lesson-01')
                      jumpTo('course-tree')
                    }}
                    className="min-h-11 rounded-lg px-2 font-semibold text-action-primary underline-offset-4 hover:underline"
                  >
                    Mở nội dung xem trước
                  </button>
                </FreePreviewSection>
              ))}
            </div>
          </section>

          <section id="course-tree" className="scroll-mt-6 space-y-5">
            <SectionHeading
              index="02"
              title="Course tree & bài học"
              description="Điều hướng bài học, trạng thái truy cập và nội dung đọc trên cùng một vùng responsive."
            />
            <div className="grid min-w-0 gap-6 xl:grid-cols-[minmax(17rem,0.8fr)_minmax(0,1.2fr)]">
              <div className="min-w-0 space-y-3">
                <LearningCourseHeader
                  title={A11_COURSE.title}
                  level={A11_COURSE.level}
                  access={access}
                  headingLevel={3}
                />
                <div className="max-h-[40rem] overflow-auto rounded-2xl">
                  <CourseTree
                    tree={
                      lessonTree ?? {
                        courseId: A11_COURSE.id,
                        courseTitle: A11_COURSE.title,
                        sections: A11_COURSE.sections,
                      }
                    }
                    headingLevel={3}
                    previewSectionIds={MOCK_PREVIEW_MANIFEST.sectionIds}
                    onSelectLesson={setSelectedLessonId}
                  />
                </div>
              </div>
              <div className="min-w-0 space-y-5">
                {data.lesson ? (
                  <LessonContent content={data.lesson} headingLevel={3} />
                ) : (
                  <LoadingCard label="Đang tải bài học" />
                )}
                <LearningProgressSummary progress={progress} />
                <LessonCompletionIndicator
                  completed={data.lesson?.lesson.progressStatus === 'COMPLETED'}
                />
                <LessonNavigation
                  items={learningItems}
                  currentId={selectedLessonId}
                  onNavigate={setSelectedLessonId}
                />
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <AccessStatePanel access={access} />
              <LockedContentPanel
                access={
                  access.kind === 'expired-display'
                    ? access
                    : {
                        kind: 'restricted',
                        label: 'Nội dung bị giới hạn',
                        reason: 'Trạng thái truy cập do scenario repository cung cấp.',
                      }
                }
              />
            </div>
          </section>

          <section id="media" className="scroll-mt-6 space-y-5">
            <SectionHeading
              index="03"
              title="Media"
              description="Native keyboard-operable controls, captions/transcript slot, safe links và PDF fallback."
            />
            <div className="grid gap-5 lg:grid-cols-2">
              <VideoPlayer media={MOCK_MEDIA[0]!} />
              <AudioPlayer media={MOCK_MEDIA[1]!} />
              <div className="min-w-0 rounded-2xl border border-border-subtle bg-card-surface p-4 sm:p-5">
                <PDFViewer media={MOCK_MEDIA[2]!} embeddedSupported={false} />
              </div>
              <div className="grid gap-3">
                <MediaLoadingState />
                <MediaErrorState
                  message="URL tạm thời không còn hoạt động."
                  onRetry={() =>
                    notifications.info('Đã thử lại media', 'Callback thử lại đã chạy.')
                  }
                />
                <MediaUnavailableState />
              </div>
            </div>
          </section>

          <section id="file-exercises" className="scroll-mt-6 space-y-5">
            <SectionHeading
              index="04"
              title="Bài tập dạng tệp"
              description="Callback completion gọi repository mock; component chỉ hiển thị capability được trả về."
            />
            {data.exercise ? (
              <>
                <ExerciseHeader exercise={data.exercise} headingLevel={3} />
                <FileExercisePanel
                  exercise={data.exercise}
                  onComplete={async () => {
                    const next = await repository.completeExercise(data.exercise!.id)
                    setData((previous) => (previous ? { ...previous, exercise: next } : previous))
                    notifications.success(
                      'Đã hoàn thành bài tập',
                      'Mock repository trả về trạng thái COMPLETED và capability xem lời giải.',
                    )
                  }}
                />
              </>
            ) : (
              <LoadingCard label="Đang tải bài tập" />
            )}
            {data.exercise && (
              <div className="rounded-2xl border border-border-subtle bg-card-surface p-4">
                <p className="mb-3 text-sm font-semibold">Biến thể completion action</p>
                <ExerciseCompletionAction
                  exercise={data.exercise}
                  onComplete={async () => {
                    const next = await repository.completeExercise(data.exercise!.id)
                    setData((previous) => (previous ? { ...previous, exercise: next } : previous))
                  }}
                />
              </div>
            )}
          </section>

          <section id="quizzes" className="scroll-mt-6 space-y-5">
            <SectionHeading
              index="05"
              title="Quiz"
              description="Attempt không có correct-answer flags. Submit nhận kết quả riêng từ repository mock."
            />
            <QuizIntro
              headingLevel={3}
              title="Chào hỏi và giới thiệu"
              description="Chọn đáp án cho câu hỏi mẫu. Hệ thống demo cung cấp kết quả sau khi submit."
              questionCount={visibleAttempt?.questions.length ?? MOCK_QUIZ_ATTEMPT.questions.length}
            />
            {scenario === 'quiz_submitted' && !isLoading ? (
              <QuizResult
                result={MOCK_QUIZ_RESULT}
                onRetry={() => {
                  setScenario('quiz_in_progress')
                  notifications.info(
                    'Đã mở lượt làm mới',
                    'Đã chuyển sang kịch bản có attempt mới theo capability retry của fixture.',
                  )
                }}
              />
            ) : visibleAttempt ? (
              <QuizRunner
                key={scenario}
                attempt={visibleAttempt}
                currentQuestionIndex={currentQuestionIndex}
                onNavigate={setCurrentQuestionIndex}
                onAnswer={(questionId, optionId) =>
                  setAttempt((previous) =>
                    previous
                      ? {
                          ...previous,
                          selectedAnswers: { ...previous.selectedAnswers, [questionId]: optionId },
                        }
                      : previous,
                  )
                }
                onSubmit={submitQuiz}
                onRetry={() => {
                  setScenario('quiz_in_progress')
                  setCurrentQuestionIndex(0)
                }}
              />
            ) : (
              <LoadingCard label="Đang tải quiz attempt" />
            )}
            <div className="text-sm text-ink-secondary">
              Đáp án đã chọn: {Object.keys(selectedAnswers).length} · Start model không có trường{' '}
              <code>isCorrect</code>.
            </div>
          </section>

          <section id="progress-notes" className="scroll-mt-6 space-y-5">
            <SectionHeading
              index="06"
              title="Tiến độ & ghi chú"
              description="Giá trị tiến độ được cung cấp sẵn; note editor hỗ trợ dirty, saving, saved và retry khi lỗi."
            />
            <div className="grid min-w-0 gap-4 xl:grid-cols-2">
              <CourseProgressCard
                courseTitle={A11_COURSE.title}
                progress={progress}
                href="#course-tree"
                onContinue={() => jumpTo('course-tree')}
              />
              <ContinueLearningCard
                courseTitle={A11_COURSE.code}
                lessonTitle={data.lesson?.lesson.title ?? 'Bài học A1.1'}
                lastAccessedLabel="Nội dung minh họa"
                onContinue={() => jumpTo('course-tree')}
              />
            </div>
            <LearningStatsSummary
              completedLessons={progress.completedLessons}
              activeDaysLabel="Dữ liệu mock"
              coursesInProgress={data.enrollment ? 1 : 0}
            />
            <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(18rem,0.8fr)]">
              <LessonProgressList
                lessons={
                  lessonTree?.sections.flatMap((section) =>
                    section.lessons.map((lesson) => ({
                      lessonId: lesson.id,
                      title: lesson.title,
                      status: lesson.progressStatus,
                    })),
                  ) ?? []
                }
              />
              <div className="space-y-3">
                <LessonNotesEditor
                  key={`${scenario}-${data.note}`}
                  initialValue={data.note}
                  value={noteValue}
                  onChange={setNoteValue}
                  onSave={async (value) => {
                    await repository.saveLessonNote('a11-lesson-01', value)
                  }}
                />
                <NoteSaveStatus state={noteValue === data.note ? 'idle' : 'dirty'} />
              </div>
            </div>
          </section>

          <section id="commerce" className="scroll-mt-6 space-y-5">
            <SectionHeading
              index="07"
              title="Commerce"
              description="Mẫu hiển thị giá, mã ưu đãi, order history và payment state. Không có cổng thanh toán thật."
            />
            <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(17rem,0.8fr)]">
              <div className="space-y-4">
                <CheckoutInformationPanel>
                  <PriceSummary
                    items={[{ label: 'Khóa học A1.1', amountVnd: A11_COURSE.priceVnd! }]}
                    discountVnd="100000"
                    totalVnd="1190000"
                  />
                  <div className="pt-3">
                    <CouponField onValidate={(code) => repository.validateCoupon(code)} />
                  </div>
                </CheckoutInformationPanel>
                <RenewalPlanCard
                  plan={{
                    id: 'renewal-demo-12m',
                    title: 'Gia hạn 12 tháng',
                    durationMonths: 12,
                    priceVnd: '590000',
                    status: 'ACTIVE',
                  }}
                  onSelect={() =>
                    notifications.info(
                      'Đã chọn gói gia hạn',
                      'Gói chỉ được chọn trong giao diện demo; không tạo đơn hàng.',
                    )
                  }
                />
              </div>
              <div className="grid content-start gap-4">
                {data.order ? (
                  <>
                    <OrderSummary order={data.order} />
                    <PaymentStatusPanel
                      order={data.order}
                      canOpenCourse={data.enrollment?.accessState === 'available'}
                      onOpenCourse={() => jumpTo('course-tree')}
                    />
                    <ul aria-label="Lịch sử đơn hàng" className="grid gap-2">
                      <OrderHistoryItem order={data.order} href="#commerce" />
                    </ul>
                  </>
                ) : (
                  <LoadingCard label="Scenario này chưa có đơn hàng" />
                )}
                <PaymentPendingState
                  order={{
                    id: 'pending-demo',
                    orderCode: 'DEMO-PENDING',
                    orderType: 'PURCHASE',
                    status: 'PENDING',
                    itemTitle: A11_COURSE.title,
                    amountVnd: A11_COURSE.priceVnd!,
                    createdAt: '2026-11-02T08:00:00.000Z',
                    paymentStatus: 'PENDING',
                  }}
                />
                <PaymentFailureState
                  order={{
                    id: 'failed-demo',
                    orderCode: 'DEMO-FAILED',
                    orderType: 'PURCHASE',
                    status: 'FAILED',
                    itemTitle: A11_COURSE.title,
                    amountVnd: A11_COURSE.priceVnd!,
                    createdAt: '2026-11-02T08:00:00.000Z',
                    paymentStatus: 'FAILED',
                  }}
                />
                <PaymentSuccessState
                  order={{
                    id: 'paid-demo',
                    orderCode: 'DEMO-PAID',
                    orderType: 'PURCHASE',
                    status: 'PAID',
                    itemTitle: A11_COURSE.title,
                    amountVnd: A11_COURSE.priceVnd!,
                    createdAt: '2026-11-02T08:00:00.000Z',
                    paymentStatus: 'SUCCESS',
                  }}
                  canOpenCourse={false}
                />
              </div>
            </div>
          </section>

          <section id="enrollment" className="scroll-mt-6 space-y-5">
            <SectionHeading
              index="08"
              title="Enrollment & access"
              description="Status backend giữ nguyên ACTIVE/REVOKED; hết hạn là presentation state từ repository."
            />
            <div className="grid gap-4">
              {data.enrollment ? (
                <EnrollmentStatusCard
                  enrollment={data.enrollment}
                  onRenew={() => jumpTo('commerce')}
                />
              ) : (
                <EnrollmentAccessPanel />
              )}
              {data.enrollment && <EnrollmentAccessPanel enrollment={data.enrollment} />}
              <AccessStatePanel access={access} />
              <div className="grid gap-3 sm:grid-cols-2">
                <AccessStatePanel
                  access={{
                    kind: 'customer-preview',
                    label: 'Preview do khách hàng yêu cầu',
                    source: 'customer-requested-demo',
                  }}
                />
                <AccessStatePanel
                  access={{
                    kind: 'restricted',
                    label: 'Cần quyền truy cập',
                    reason: 'Quyết định cuối cùng thuộc backend.',
                  }}
                />
                <AccessStatePanel
                  access={{
                    kind: 'expired-display',
                    label: 'Quyền truy cập đã hết hạn',
                    expiresAt: '2026-10-01T08:00:00.000Z',
                  }}
                />
                <AccessStatePanel
                  access={{
                    kind: 'error',
                    label: 'Không kiểm tra được quyền',
                    message: 'Kết nối mock thất bại.',
                  }}
                />
              </div>
            </div>
          </section>

          <section id="profile" className="scroll-mt-6 space-y-5">
            <SectionHeading
              index="09"
              title="Profile & account"
              description="Chỉ dùng safe presentation fields; không hiển thị token, IP hay raw user-agent."
            />
            <AccountNavigation current="profile" />
            <SecurityNotice />
            <div className="grid gap-5 xl:grid-cols-2">
              {data.profile ? (
                <>
                  <div className="space-y-4">
                    <StudentProfileCard profile={data.profile} />
                    <ProfileForm
                      key={`${scenario}-${data.profile.displayName ?? ''}`}
                      profile={data.profile}
                      onSave={async (values) => {
                        await repository.saveProfile(values.displayName)
                      }}
                    />
                    <AccountSecurityLinks />
                  </div>
                  <div className="space-y-3">
                    <h3 className="font-display text-lg font-bold">Phiên đăng nhập</h3>
                    <SessionList sessions={data.sessions} />
                  </div>
                </>
              ) : (
                <AccountEmptyState
                  title="Chưa có hồ sơ"
                  message="Đăng nhập vào scenario học viên để xem phần account."
                />
              )}
            </div>
          </section>

          <section id="mock-scenarios" className="scroll-mt-6 space-y-5">
            <SectionHeading
              index="10"
              title="Mock scenario explorer"
              description="Đây là công cụ developer-only để chọn fixture hoặc mô phỏng response. Không đại diện API thanh toán/entitlement."
            />
            <Card
              className="grid gap-5 border-warning-foreground/20 bg-warning-surface/30 p-5 sm:p-6"
              data-dev-scenario-controls="true"
            >
              <div className="flex items-start gap-3">
                <ShieldAlert
                  aria-hidden="true"
                  className="mt-0.5 size-5 shrink-0 text-warning-foreground"
                />
                <div>
                  <h3 className="font-semibold">Developer scenario controller</h3>
                  <p className="mt-1 text-sm leading-6 text-ink-secondary">
                    Chỉ thay state trong bộ nhớ demo. Nút checkout không thể chuyển đơn PENDING
                    thành PAID; chọn <code>payment_confirmed</code> mới nạp fixture đã xác nhận.
                  </p>
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                <SelectField
                  id="mock-scenario"
                  label="Kịch bản dữ liệu"
                  value={scenario}
                  onValueChange={(value) => setScenario(value as MockScenarioId)}
                  options={MOCK_SCENARIOS.map((value) => ({
                    value,
                    label: MOCK_SCENARIO_LABELS[value],
                  }))}
                />
                <SelectField
                  id="mock-response-mode"
                  label="Response repository"
                  value={responseMode}
                  onValueChange={(value) => setResponseMode(value as MockResponseMode)}
                  options={[
                    { value: 'success', label: 'Success' },
                    { value: 'empty', label: 'Empty result' },
                    { value: 'network-error', label: 'Network failure' },
                    { value: 'api-error', label: 'API error envelope' },
                  ]}
                />
                <SelectField
                  id="mock-http-status"
                  label="HTTP status mô phỏng"
                  value={String(errorStatus)}
                  onValueChange={(value) => setErrorStatus(Number(value) as SupportedMockStatus)}
                  options={httpStatuses.map((status) => ({
                    value: String(status),
                    label: String(status),
                  }))}
                />
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <Badge tone="info">{MOCK_SCENARIO_LABELS[scenario]}</Badge>
                <span className="text-xs text-ink-secondary">
                  Clock: 2026-11-02 08:00 UTC · timezone hiển thị: Asia/Ho_Chi_Minh
                </span>
                <Button
                  variant="outline"
                  onClick={() => {
                    setScenario('payment_pending')
                    setResponseMode('success')
                    notifications.info('Đã nạp đơn chờ', 'Đơn PENDING chưa có enrollment.')
                  }}
                >
                  Xem đơn đang chờ
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setScenario('payment_confirmed')
                    setResponseMode('success')
                    notifications.success(
                      'Đã nạp đơn đã xác nhận',
                      'Fixture payment_confirmed có enrollment ACTIVE.',
                    )
                  }}
                >
                  Nạp fixture đã xác nhận
                </Button>
              </div>
              {isLoading && (
                <p role="status" className="text-sm text-ink-secondary">
                  Đang tải fixture…
                </p>
              )}
              {data.error && (
                <div
                  role="alert"
                  className="rounded-xl border border-danger-foreground/20 bg-danger-surface p-4"
                >
                  <div className="flex items-start gap-3">
                    <TriangleAlert
                      aria-hidden="true"
                      className="mt-0.5 size-5 shrink-0 text-danger-foreground"
                    />
                    <div>
                      <p className="font-semibold">Repository trả về lỗi</p>
                      <p className="mt-1 text-sm leading-6">{data.error.message}</p>
                      {data.error.kind === 'api' && (
                        <p className="mt-1 text-xs">
                          HTTP {data.error.status} · code:{' '}
                          {data.error.code || 'chưa có mã lỗi xác nhận trong V3'}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </Card>
          </section>
        </Container>
      </main>
      <footer className="border-t border-border-subtle bg-card-surface py-6">
        <Container className="flex flex-wrap justify-between gap-3 text-sm text-ink-secondary">
          <p>Phase 1B · Presentation components + mock repository</p>
          <a
            href="/__dev/ui-kit"
            className="inline-flex min-h-11 items-center gap-2 font-semibold text-action-primary"
          >
            Quay lại UI Kit <ExternalLink aria-hidden="true" className="size-4" />
          </a>
        </Container>
      </footer>
      <BaseDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        title="LMS Kit là showcase dev"
        description="Fixture và scenario switcher không nằm trong production routes."
        footer={<Button onClick={() => setDialogOpen(false)}>Đóng</Button>}
      >
        <p className="text-sm leading-6 text-ink-secondary">
          Các thành phần này nhận model trình bày và callback. Chưa kết nối API, database, video có
          bản quyền hay cổng thanh toán.
        </p>
      </BaseDialog>
    </div>
  )
}

function SectionHeading({
  index,
  title,
  description,
}: {
  index: string
  title: string
  description: string
}) {
  return (
    <header className="grid gap-2 border-b border-border-subtle pb-4 sm:grid-cols-[3.5rem_minmax(0,1fr)] sm:items-start">
      <span className="font-mono text-sm font-bold text-action-primary">{index}</span>
      <div>
        <h2 className="font-display text-2xl font-extrabold tracking-tight">{title}</h2>
        <p className="mt-1 max-w-3xl text-sm leading-6 text-ink-secondary">{description}</p>
      </div>
    </header>
  )
}

function LoadingCard({ label }: { label: string }) {
  return (
    <Card role="status" className="grid min-h-32 place-items-center p-5 text-center">
      <p className="text-sm text-ink-secondary">{label}</p>
    </Card>
  )
}
