import { useState } from 'react'
import { BookOpenText, Check, ChevronLeft, ChevronRight, ListTree } from 'lucide-react'
import { useNavigate, useParams, useSearchParams } from 'react-router'
import { useAuthSession } from '@/app/auth/auth-session'
import {
  useCompleteExercise,
  useCompleteLesson,
  useProductCourse,
  useProductExercise,
  useProductLesson,
  useProductLessonNote,
  useProductProgress,
  useProductQuizAttempt,
  useProductQuizResult,
  useProductSection,
  useRetryQuiz,
  useSaveLessonNote,
  useSelectQuizAnswer,
  useStartQuiz,
  useSubmitQuiz,
} from '@/data/student-demo/product-queries'
import type {
  StudentLearningCourseViewModel,
  StudentLessonWorkspaceViewModel,
} from '@/data/student-demo/product-types'
import { useStudentDashboard } from '@/data/student-demo/queries'
import {
  ChapterItem,
  CourseProgressCard,
  DecorativeHeading,
  ExerciseStatusBadge,
  FileExercisePanel,
  LearningCourseHeader,
  LearningProgressSummary,
  LessonCompletionIndicator,
  LessonContent,
  LessonNotesEditor,
  LessonProgressList,
  YouTubeLessonPlayer,
  LessonOutlineAccordion,
  QuizIntro,
  QuizExerciseCard,
  QuizResult,
  QuizRunner,
} from '@/domains'
import { AudioPlayer, PDFViewer, VideoPlayer } from '@/domains/media'
import { DomainState } from '@/domains/shared/presentation'
import {
  Button,
  Card,
  ErrorState,
  LinkButton,
  Progress,
  SectionHeader,
  Sheet,
  useNotifications,
} from '@/shared/ui'
import { ProductError, ProductLoading, ProductNotFound, ProductPage } from './shared'

export function LearningCoursePage() {
  const { courseId = '' } = useParams()
  const { session } = useAuthSession()
  const course = useProductCourse(session?.id ?? '', courseId)
  const navigate = useNavigate()
  const trackedLessons =
    course.data?.tree.sections
      .flatMap((section) => section.lessons)
      .filter((lesson) => lesson.countsTowardProgress) ?? []
  const completedLessons = trackedLessons.filter(
    (lesson) => lesson.progressStatus === 'COMPLETED',
  ).length
  const progressPercent = trackedLessons.length
    ? (completedLessons / trackedLessons.length) * 100
    : 0

  return (
    <ProductPage
      title={
        course.data ? `Không gian khóa học: ${course.data.course.title}` : 'Không gian khóa học'
      }
      heading={
        <div className="grid gap-2">
          <DecorativeHeading text="Không gian khóa học" level={1} size="lg" />
          {course.data && (
            <p className="text-base font-semibold text-ink-secondary sm:text-lg">
              {course.data.course.title}
            </p>
          )}
        </div>
      }
      eyebrow=""
      backTo="/student/courses"
    >
      {course.isPending ? (
        <ProductLoading title="Đang tải khóa học" />
      ) : course.isError ? (
        <ProductError onRetry={() => void course.refetch()} />
      ) : !course.data ? (
        <ProductNotFound message="Khóa học này không có trong danh sách khóa học được cấp cho tài khoản." />
      ) : (
        <div className="grid min-w-0 gap-4">
          <SectionHeader title="Lộ trình khóa học" />
          <div className="rounded-2xl border border-brand-pink/70 bg-brand-pink/30 p-4 sm:p-5">
            <Progress
              value={progressPercent}
              label={`${completedLessons}/${trackedLessons.length} bài học hoàn thành`}
              indicatorClassName="bg-brand-lime"
            />
          </div>
          <LessonOutlineAccordion
            tree={course.data.tree}
            onSelectLesson={(lessonId) => navigate(`/learn/lessons/${lessonId}`)}
            onSelectSection={(sectionId) =>
              navigate(`/learn/courses/${courseId}/sections/${sectionId}`)
            }
          />
        </div>
      )}
    </ProductPage>
  )
}

export function LearningSectionPage() {
  const { courseId = '', sectionId = '' } = useParams()
  const { session } = useAuthSession()
  const section = useProductSection(session?.id ?? '', courseId, sectionId)
  const navigate = useNavigate()

  return (
    <ProductPage title="Chương học" backTo={`/learn/courses/${courseId}`}>
      {section.isPending ? (
        <ProductLoading title="Đang tải chương học" />
      ) : section.isError ? (
        <ProductError onRetry={() => void section.refetch()} />
      ) : !section.data ? (
        <ProductNotFound message="Chương này không thuộc khóa học hoặc tài khoản hiện tại." />
      ) : (
        <div className="grid gap-5">
          <LearningCourseHeader
            title={section.data.courseTitle}
            level={section.data.courseLevel}
            access={section.data.access}
            onBack={() => navigate(`/learn/courses/${courseId}`)}
            headingLevel={2}
          />
          <Card className="p-4 sm:p-6">
            <ChapterItem
              section={section.data.section}
              headingLevel={2}
              onSelectLesson={(lessonId) => navigate(`/learn/lessons/${lessonId}`)}
            />
          </Card>
          {section.data.access.kind !== 'available' && (
            <Card className="flex flex-wrap items-center justify-between gap-3 p-4">
              <p className="text-sm text-ink-secondary">
                Chọn một bài để xem trạng thái quyền truy cập.
              </p>
              <LinkButton to="/courses" variant="outline">
                Về khóa học công khai
              </LinkButton>
            </Card>
          )}
        </div>
      )}
    </ProductPage>
  )
}

function LessonOutlineTree({
  course,
  lesson,
  onSelectLesson,
}: {
  course: StudentLearningCourseViewModel
  lesson: StudentLessonWorkspaceViewModel
  onSelectLesson: (lessonId: string) => void
}) {
  return (
    <LessonOutlineAccordion
      tree={course.tree}
      currentLessonId={lesson.lesson.id}
      compact
      onSelectLesson={onSelectLesson}
    />
  )
}

export function LearningLessonPage() {
  const { lessonId = '' } = useParams()
  const { session } = useAuthSession()
  const lesson = useProductLesson(session?.id ?? '', lessonId)
  const course = useProductCourse(session?.id ?? '', lesson.data?.courseId ?? '')
  const note = useProductLessonNote(session?.id ?? '', lessonId)
  const saveNote = useSaveLessonNote(session?.id ?? '', lessonId)
  const completeLesson = useCompleteLesson(session?.id ?? '')
  const completeExercise = useCompleteExercise(session?.id ?? '')
  const [noteValue, setNoteValue] = useState<string>()
  const [outlineOpen, setOutlineOpen] = useState(false)
  const navigate = useNavigate()
  const notifications = useNotifications()

  async function markLessonComplete() {
    try {
      await completeLesson.mutateAsync(lessonId)
      notifications.success('Bài học đã hoàn thành')
    } catch {
      notifications.error(
        'Chưa hoàn thành được bài học',
        'Hãy hoàn tất bài tập bắt buộc rồi thử lại.',
      )
    }
  }

  return (
    <ProductPage
      title="Không gian bài học"
      heading={<DecorativeHeading text="Không gian bài học" level={1} size="lg" />}
      eyebrow=""
      backTo={lesson.data ? `/learn/courses/${lesson.data.courseId}` : '/student/courses'}
      wide
    >
      {lesson.isPending ? (
        <ProductLoading title="Đang tải bài học" />
      ) : lesson.isError ? (
        <ProductError onRetry={() => void lesson.refetch()} />
      ) : !lesson.data ? (
        <ProductNotFound message="Bài học này không tồn tại hoặc tài khoản chưa được cấp quyền truy cập." />
      ) : (
        <div className="grid min-w-0 gap-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Button
              variant="outline"
              className="lg:hidden"
              startIcon={<ListTree aria-hidden="true" />}
              onClick={() => setOutlineOpen(true)}
            >
              Nội dung khóa học
            </Button>
            <LessonCompletionIndicator
              completed={lesson.data.isCompleted}
              label="Bài học đã hoàn thành"
            />
          </div>
          <div className="grid min-w-0 items-start gap-6 lg:grid-cols-[minmax(0,1fr)_20rem] xl:grid-cols-[minmax(0,1fr)_23rem]">
            <div className="grid min-w-0 gap-6">
              <section
                id="lesson-video"
                aria-label="Bài giảng của bài học"
                className="grid min-w-0 gap-3 rounded-2xl border border-brand-blue/60 bg-surface-blue/30 p-3 sm:p-5"
              >
                <SectionHeader title="Bài giảng" />
                <LessonContent
                  content={{ ...lesson.data, media: [] }}
                  headingLevel={3}
                  fullWidth
                  showLessonType={false}
                />
                {lesson.data.access.kind === 'available' && (
                  <div className="grid w-full gap-4">
                    <YouTubeLessonPlayer
                      video={lesson.data.video}
                      title={lesson.data.lesson.title}
                    />
                    {lesson.data.media.map((media) =>
                      media.mediaType === 'VIDEO' ? (
                        <VideoPlayer key={media.id} media={media} />
                      ) : media.mediaType === 'AUDIO' ? (
                        <AudioPlayer key={media.id} media={media} />
                      ) : media.mediaType === 'PDF' ? (
                        <PDFViewer key={media.id} media={media} />
                      ) : null,
                    )}
                  </div>
                )}
              </section>
              {lesson.data.exercises.length > 0 && (
                <section
                  aria-label="Bài tập của bài học"
                  className="grid gap-3 rounded-2xl border border-brand-pink bg-brand-pink/20 p-3 sm:p-5"
                >
                  <SectionHeader title="Bài tập" />
                  <div className="grid min-w-0 gap-3">
                    {lesson.data.exercises.map((exercise) =>
                      exercise.exerciseType === 'FILE_BASED' ? (
                        <FileExercisePanel
                          key={exercise.id}
                          exercise={exercise}
                          showSolutions={false}
                          onComplete={async () => {
                            await completeExercise.mutateAsync(exercise.id)
                            notifications.success('Bài tập đã hoàn thành')
                          }}
                        />
                      ) : (
                        <QuizExerciseCard key={exercise.id} exercise={exercise} />
                      ),
                    )}
                  </div>
                </section>
              )}
              {Boolean(lesson.data.solutionVideo || lesson.data.solutionVideos?.length) && (
                <section aria-label="Đáp án bài tập" className="grid gap-3">
                  <SectionHeader title="Đáp án" />
                  <div className="grid min-w-0 gap-5">
                    {lesson.data.solutionVideo && (
                      <YouTubeLessonPlayer
                        video={lesson.data.solutionVideo}
                        title={`Video chữa bài · ${lesson.data.lesson.title}`}
                      />
                    )}
                    {(lesson.data.solutionVideos ?? []).map((solution) => (
                      <div
                        key={`${solution.exerciseId}-${solution.media.id}`}
                        className="grid gap-2"
                      >
                        <p className="font-semibold">{solution.exerciseTitle}</p>
                        <VideoPlayer media={solution.media} />
                      </div>
                    ))}
                  </div>
                </section>
              )}
              <section
                id="notes"
                className="scroll-mt-24 grid gap-3"
                aria-labelledby="lesson-notes-heading"
              >
                <h2 id="lesson-notes-heading" className="sr-only">
                  Ghi chú bài học
                </h2>
                {note.isPending ? (
                  <ProductLoading title="Đang tải ghi chú" />
                ) : note.isError ? (
                  <ProductError onRetry={() => void note.refetch()} />
                ) : (
                  <LessonNotesEditor
                    initialValue={note.data ?? ''}
                    value={noteValue ?? note.data ?? ''}
                    onChange={setNoteValue}
                    onSave={async (value) => {
                      await saveNote.mutateAsync(value)
                    }}
                  />
                )}
              </section>
              <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.25fr)_minmax(0,1fr)] gap-2 border-t border-border-subtle pt-4">
                <Button
                  variant="outline"
                  disabled={!lesson.data.previousLessonId}
                  aria-label="Bài trước"
                  className="min-w-0 gap-1 px-2 text-xs sm:text-sm"
                  onClick={() =>
                    lesson.data.previousLessonId &&
                    navigate(`/learn/lessons/${lesson.data.previousLessonId}`)
                  }
                >
                  <ChevronLeft aria-hidden="true" className="size-4 shrink-0" />
                  <span className="truncate">Bài trước</span>
                </Button>
                <Button
                  disabled={!lesson.data.canCompleteLesson || completeLesson.isPending}
                  loading={completeLesson.isPending}
                  aria-label={
                    lesson.data.isCompleted ? 'Đã hoàn thành bài học' : 'Hoàn thành bài học'
                  }
                  className="min-w-0 gap-1 px-2 text-xs sm:text-sm"
                  onClick={() => void markLessonComplete()}
                  startIcon={lesson.data.isCompleted ? <Check aria-hidden="true" /> : undefined}
                >
                  <span className="truncate sm:hidden">
                    {lesson.data.isCompleted ? 'Đã xong' : 'Hoàn thành'}
                  </span>
                  <span className="hidden truncate sm:inline">
                    {lesson.data.isCompleted ? 'Đã hoàn thành' : 'Hoàn thành bài học'}
                  </span>
                </Button>
                <Button
                  variant="outline"
                  disabled={!lesson.data.nextLessonId}
                  aria-label="Bài tiếp"
                  className="min-w-0 gap-1 px-2 text-xs sm:text-sm"
                  onClick={() =>
                    lesson.data.nextLessonId &&
                    navigate(`/learn/lessons/${lesson.data.nextLessonId}`)
                  }
                >
                  <span className="truncate">Bài tiếp</span>
                  <ChevronRight aria-hidden="true" className="size-4 shrink-0" />
                </Button>
              </div>
              {completeLesson.isError && (
                <ErrorState
                  title="Chưa hoàn thành được bài học"
                  description="Hãy hoàn tất bài tập bắt buộc rồi thử lại."
                  onRetry={() => void markLessonComplete()}
                />
              )}
            </div>
            <aside
              aria-label="Nội dung khóa học"
              className="sticky top-[4.5rem] hidden max-h-[calc(100dvh-5rem)] min-w-0 self-start overflow-y-auto rounded-2xl border border-border-subtle bg-card-surface p-4 lg:block"
            >
              <h2 className="mb-3 flex items-center gap-2 font-display text-base font-bold">
                <BookOpenText aria-hidden="true" className="size-4 text-action-primary" />
                {lesson.data.courseTitle}
              </h2>
              {course.isPending ? (
                <ProductLoading title="Đang tải nội dung khóa học" />
              ) : course.data ? (
                <LessonOutlineTree
                  course={course.data}
                  lesson={lesson.data}
                  onSelectLesson={(nextLessonId) => navigate(`/learn/lessons/${nextLessonId}`)}
                />
              ) : (
                <p className="text-sm text-ink-secondary">Chưa tải được nội dung khóa học.</p>
              )}
            </aside>
          </div>
          <Sheet
            open={outlineOpen}
            onOpenChange={setOutlineOpen}
            side="right"
            title={lesson.data.courseTitle}
            className="w-[min(24rem,calc(100vw-1.5rem))] lg:hidden"
          >
            {course.isPending ? (
              <ProductLoading title="Đang tải nội dung khóa học" />
            ) : course.data ? (
              <LessonOutlineTree
                course={course.data}
                lesson={lesson.data}
                onSelectLesson={(nextLessonId) => {
                  setOutlineOpen(false)
                  if (nextLessonId !== lessonId) navigate(`/learn/lessons/${nextLessonId}`)
                }}
              />
            ) : (
              <p className="text-sm text-ink-secondary">Chưa tải được nội dung khóa học.</p>
            )}
          </Sheet>
        </div>
      )}
    </ProductPage>
  )
}

export function LearningExercisePage() {
  const { exerciseId = '' } = useParams()
  const { session } = useAuthSession()
  const exercise = useProductExercise(session?.id ?? '', exerciseId)
  const completeExercise = useCompleteExercise(session?.id ?? '')
  const startQuiz = useStartQuiz(session?.id ?? '')
  const navigate = useNavigate()

  async function beginQuiz() {
    const existingAttempt = exercise.data?.latestAttempt
    const params = new URLSearchParams({
      exerciseId,
      ...(exercise.data?.lessonId ? { lessonId: exercise.data.lessonId } : {}),
    })
    if (existingAttempt) {
      const destination =
        existingAttempt.status === 'SUBMITTED'
          ? `/learn/quizzes/${existingAttempt.id}/result`
          : `/learn/quizzes/${existingAttempt.id}`
      navigate(`${destination}?${params.toString()}`)
      return
    }
    try {
      const attempt = await startQuiz.mutateAsync(exerciseId)
      navigate(`/learn/quizzes/${attempt.id}?${params.toString()}`)
    } catch {
      // The mutation error is presented inline.
    }
  }

  return (
    <ProductPage
      title="Bài tập"
      backTo={
        exercise.data?.lessonId ? `/learn/lessons/${exercise.data.lessonId}` : '/student/courses'
      }
    >
      {exercise.isPending ? (
        <ProductLoading title="Đang tải bài tập" />
      ) : exercise.isError ? (
        <ProductError onRetry={() => void exercise.refetch()} />
      ) : !exercise.data ? (
        <ProductNotFound message="Bài tập này không tồn tại hoặc tài khoản chưa được cấp quyền truy cập." />
      ) : exercise.data.exerciseType === 'FILE_BASED' ? (
        <div className="mx-auto grid w-full max-w-3xl gap-4">
          {!exercise.data.capabilities.canMarkComplete && exercise.data.status !== 'COMPLETED' && (
            <DomainState
              kind="error"
              title="Chưa có quyền truy cập bài tập"
              message="Enrollment hiện không cấp quyền xem hoặc hoàn thành nội dung trả phí."
            >
              <LinkButton to="/courses" variant="outline">
                Về trang khóa học
              </LinkButton>
            </DomainState>
          )}
          <FileExercisePanel
            exercise={exercise.data}
            onComplete={async () => {
              await completeExercise.mutateAsync(exerciseId)
            }}
          />
          {completeExercise.isError && (
            <ErrorState
              title="Chưa ghi nhận được bài tập"
              description="Máy chủ chưa xác nhận hoàn tất bài tập. Hãy kiểm tra kết nối rồi thử lại."
              onRetry={() => void completeExercise.mutate(exerciseId)}
            />
          )}
          <LinkButton
            to={
              exercise.data.lessonId
                ? `/learn/lessons/${exercise.data.lessonId}`
                : '/student/courses'
            }
            variant="outline"
          >
            Quay lại bài học
          </LinkButton>
        </div>
      ) : (
        <div className="mx-auto grid w-full max-w-3xl gap-4">
          <Card className="grid gap-4 p-5 sm:p-7">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm font-semibold text-action-primary">
                Bài tập quiz · {exercise.data.isRequired ? 'Bắt buộc' : 'Tùy chọn'}
              </p>
              <ExerciseStatusBadge status={exercise.data.status} />
            </div>
            <QuizIntro
              title={exercise.data.quiz?.title ?? exercise.data.title}
              description={
                exercise.data.quiz?.description ??
                exercise.data.description ??
                'Chọn một đáp án cho mỗi câu hỏi. Kết quả sẽ được chấm sau khi nộp bài.'
              }
              {...(exercise.data.quiz ? { questionCount: exercise.data.quiz.questionCount } : {})}
              status={exercise.data.latestAttempt?.status ?? 'NOT_STARTED'}
              onStart={() => void beginQuiz()}
              headingLevel={2}
            />
            {startQuiz.isError && (
              <ErrorState
                title="Chưa bắt đầu được bài kiểm tra"
                description="Hãy kiểm tra quyền truy cập rồi thử lại."
                onRetry={() => void beginQuiz()}
              />
            )}
          </Card>
          <LinkButton
            to={
              exercise.data.lessonId
                ? `/learn/lessons/${exercise.data.lessonId}`
                : '/student/courses'
            }
            variant="outline"
          >
            Quay lại bài học
          </LinkButton>
        </div>
      )}
    </ProductPage>
  )
}

export function LearningQuizPage() {
  const { attemptId = '' } = useParams()
  const [searchParams] = useSearchParams()
  const exerciseId = searchParams.get('exerciseId') ?? ''
  const lessonId = searchParams.get('lessonId') ?? ''
  const { session } = useAuthSession()
  const attempt = useProductQuizAttempt(session?.id ?? '', attemptId)
  const selectAnswer = useSelectQuizAnswer(session?.id ?? '', attemptId)
  const submitQuiz = useSubmitQuiz(session?.id ?? '', attemptId)
  const retryQuiz = useRetryQuiz(session?.id ?? '')
  const navigate = useNavigate()
  const [optimisticAnswers, setOptimisticAnswers] = useState<Record<string, string>>({})
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [answerSaved, setAnswerSaved] = useState(false)

  return (
    <ProductPage
      title="Bài kiểm tra"
      backTo={lessonId ? `/learn/lessons/${lessonId}` : '/student/courses'}
    >
      {attempt.isPending ? (
        <ProductLoading title="Đang tải lượt làm bài" />
      ) : attempt.isError ? (
        <ProductError onRetry={() => void attempt.refetch()} />
      ) : !attempt.data ? (
        <ProductNotFound message="Không tìm thấy lượt làm bài trong tài khoản hiện tại." />
      ) : attempt.data.status === 'SUBMITTED' ? (
        <Card className="mx-auto grid w-full max-w-3xl gap-4 p-5">
          <DomainState
            kind="empty"
            title="Lượt làm bài đã nộp"
            message="Mở trang kết quả để xem phần giải thích."
          />
          <LinkButton to={`/learn/quizzes/${attemptId}/result?${searchParams.toString()}`}>
            Mở kết quả
          </LinkButton>
        </Card>
      ) : (
        <div className="grid gap-4">
          <QuizRunner
            attempt={{
              ...attempt.data,
              selectedAnswers: { ...attempt.data.selectedAnswers, ...optimisticAnswers },
              capabilities: {
                canSubmit: attempt.data.capabilities.canSubmit && !selectAnswer.isPending,
              },
            }}
            currentQuestionIndex={currentQuestionIndex}
            answerSaving={selectAnswer.isPending}
            onNavigate={setCurrentQuestionIndex}
            onAnswer={(questionId, optionId) => {
              if (selectAnswer.isPending || !attempt.data) return
              const previous = attempt.data.selectedAnswers[questionId]
              setAnswerSaved(false)
              setOptimisticAnswers((previous) => ({ ...previous, [questionId]: optionId }))
              selectAnswer.mutate(
                { questionId, optionId },
                {
                  onSuccess: () => setAnswerSaved(true),
                  onError: () => {
                    setOptimisticAnswers((current) => {
                      const next = { ...current }
                      if (previous) next[questionId] = previous
                      else delete next[questionId]
                      return next
                    })
                  },
                },
              )
            }}
            onSubmit={async () => {
              const result = await submitQuiz.mutateAsync()
              navigate(`/learn/quizzes/${attemptId}/result?${searchParams.toString()}`)
              return result
            }}
            {...(exerciseId
              ? {
                  onRetry: () =>
                    void retryQuiz
                      .mutateAsync(attemptId)
                      .then((next) =>
                        navigate(`/learn/quizzes/${next.id}?${searchParams.toString()}`),
                      ),
                }
              : {})}
            confirmBeforeSubmit
          />
          {answerSaved && !selectAnswer.isPending && !selectAnswer.isError && (
            <p
              role="status"
              aria-live="polite"
              className="mx-auto w-full max-w-3xl text-sm text-success-foreground"
            >
              Đã lưu đáp án.
            </p>
          )}
          {selectAnswer.isError && (
            <ErrorState
              title="Chưa lưu lựa chọn"
              description="Chưa lưu được lựa chọn trên máy chủ. Hãy thử lại khi kết nối ổn định."
              onRetry={() => attempt.refetch()}
            />
          )}
          {submitQuiz.isError && (
            <ErrorState
              title="Chưa nộp được bài kiểm tra"
              description="Lượt làm vẫn còn mở. Bạn có thể thử nộp lại."
              onRetry={() => void submitQuiz.mutate()}
            />
          )}
        </div>
      )}
    </ProductPage>
  )
}

export function LearningQuizResultPage() {
  const { attemptId = '' } = useParams()
  const [searchParams] = useSearchParams()
  const lessonId = searchParams.get('lessonId') ?? ''
  const { session } = useAuthSession()
  const result = useProductQuizResult(session?.id ?? '', attemptId)
  const attempt = useProductQuizAttempt(session?.id ?? '', attemptId)
  const retryQuiz = useRetryQuiz(session?.id ?? '')
  const navigate = useNavigate()

  return (
    <ProductPage
      title="Kết quả bài kiểm tra"
      backTo={lessonId ? `/learn/lessons/${lessonId}` : '/student/courses'}
      wide
    >
      {result.isPending ? (
        <ProductLoading title="Đang tải kết quả" />
      ) : result.isError ? (
        attempt.data?.status === 'IN_PROGRESS' ? (
          <Card className="mx-auto grid max-w-2xl gap-4 p-5">
            <DomainState
              kind="empty"
              title="Bài kiểm tra chưa được nộp"
              message="Bạn vẫn có thể tiếp tục lượt đang làm."
            />
            <LinkButton to={`/learn/quizzes/${attemptId}?${searchParams.toString()}`}>
              Tiếp tục bài kiểm tra
            </LinkButton>
          </Card>
        ) : (
          <ProductError onRetry={() => void result.refetch()} />
        )
      ) : !result.data ? (
        <ProductNotFound message="Không tìm thấy kết quả cho lượt làm này." />
      ) : (
        <div className="grid w-full gap-4">
          <QuizResult
            result={result.data}
            onRetry={() =>
              void retryQuiz
                .mutateAsync(attemptId)
                .then((next) => navigate(`/learn/quizzes/${next.id}?${searchParams.toString()}`))
            }
          />
          {retryQuiz.isError && (
            <ErrorState
              title="Chưa tạo được lượt mới"
              description="Kết quả cũ vẫn được giữ nguyên."
              onRetry={() => void retryQuiz.mutate(attemptId)}
            />
          )}
          {lessonId && (
            <LinkButton to={`/learn/lessons/${lessonId}`} variant="outline">
              Quay lại bài học
            </LinkButton>
          )}
        </div>
      )}
    </ProductPage>
  )
}

export function StudentProgressPage() {
  const { session } = useAuthSession()
  const [searchParams] = useSearchParams()
  const dashboard = useStudentDashboard(session?.id ?? '')
  const requestedCourseId = searchParams.get('courseId')
  const selectedCourse =
    dashboard.data?.courses.find((record) => record.courseId === requestedCourseId) ??
    dashboard.data?.courses[0]
  const courseId = selectedCourse?.courseId ?? ''
  const progress = useProductProgress(session?.id ?? '', courseId)
  const course = useProductCourse(session?.id ?? '', courseId)
  const navigate = useNavigate()
  const continueLesson = selectedCourse?.continueLessonId ?? course.data?.continueLessonId

  return (
    <ProductPage
      title="Tiến độ học tập"
      description="Một nguồn tiến độ duy nhất cho bảng điều khiển, khóa học và bài học."
      backTo="/student"
    >
      {dashboard.isPending ? (
        <ProductLoading title="Đang tải tiến độ" />
      ) : dashboard.isError ? (
        <ProductError onRetry={() => void dashboard.refetch()} />
      ) : !selectedCourse ? (
        <DomainState
          kind="empty"
          title="Chưa có khóa học được cấp"
          message="Khi tài khoản có enrollment, tiến độ và danh sách bài học sẽ xuất hiện tại đây."
        >
          <LinkButton to="/courses" variant="outline">
            Khám phá khóa học
          </LinkButton>
        </DomainState>
      ) : progress.isPending || course.isPending ? (
        <ProductLoading title="Đang tải tiến độ" />
      ) : progress.isError || course.isError ? (
        <ProductError
          onRetry={() => {
            void progress.refetch()
            void course.refetch()
          }}
        />
      ) : !progress.data || !course.data ? (
        <ProductNotFound message="Chưa có dữ liệu tiến độ cho khóa học." />
      ) : (
        <div className="grid gap-6">
          <LearningProgressSummary progress={progress.data} headingLevel={2} />
          <CourseProgressCard
            courseTitle={course.data.course.title}
            progress={progress.data}
            href={`/learn/courses/${courseId}`}
            {...(continueLesson
              ? {
                  onContinue: () => navigate(`/learn/lessons/${continueLesson}`),
                }
              : {})}
          />
          <section className="grid gap-3">
            <SectionHeader
              title="Tiến độ từng bài"
              description="Tiến độ chỉ tính những bài mà máy chủ đánh dấu là có tham gia tổng tiến độ."
            />
            <LessonProgressList
              lessons={course.data.tree.sections.flatMap((section) =>
                section.lessons.map((lesson) => ({
                  lessonId: lesson.id,
                  title: lesson.title,
                  status: lesson.progressStatus,
                  href: `/learn/lessons/${lesson.id}`,
                })),
              )}
            />
          </section>
        </div>
      )}
    </ProductPage>
  )
}
