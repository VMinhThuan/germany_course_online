import { useState } from 'react'
import { ArrowRight, Check, LockKeyhole } from 'lucide-react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router'
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
import { useStudentDashboard } from '@/data/student-demo/queries'
import {
  AccessStatePanel,
  ChapterItem,
  CourseProgressCard,
  CourseTree,
  ExerciseStatusBadge,
  FileExercisePanel,
  LearningCourseHeader,
  LearningProgressSummary,
  LessonCompletionIndicator,
  LessonContent,
  LessonNotesEditor,
  LessonProgressList,
  YouTubeLessonPlayer,
  QuizIntro,
  QuizResult,
  QuizRunner,
} from '@/domains'
import { AudioPlayer, PDFViewer, VideoPlayer } from '@/domains/media'
import { DomainState } from '@/domains/shared/presentation'
import { Button, Card, ErrorState, LinkButton, SectionHeader } from '@/shared/ui'
import { ProductError, ProductLoading, ProductNotFound, ProductPage } from './shared'

export function LearningCoursePage() {
  const { courseId = '' } = useParams()
  const { session } = useAuthSession()
  const course = useProductCourse(session?.id ?? '', courseId)
  const navigate = useNavigate()

  return (
    <ProductPage title="Không gian khóa học" backTo="/student/courses">
      {course.isPending ? (
        <ProductLoading title="Đang tải khóa học" />
      ) : course.isError ? (
        <ProductError onRetry={() => void course.refetch()} />
      ) : !course.data ? (
        <ProductNotFound message="Khóa học này không có trong danh sách khóa học được cấp cho tài khoản." />
      ) : (
        <div className="grid min-w-0 gap-6">
          <LearningCourseHeader
            title={course.data.course.title}
            level={course.data.course.level}
            access={course.data.access}
            onBack={() => navigate('/student/courses')}
            headingLevel={2}
          />
          <div className="grid min-w-0 gap-6 xl:grid-cols-[minmax(0,1fr)_20rem]">
            <section className="grid min-w-0 gap-4" aria-labelledby="course-map-title">
              <SectionHeader
                title="Lộ trình khóa học"
                description="Khóa học → chương → bài học → bài tập. Máy chủ kiểm tra quyền truy cập trước khi trả nội dung học."
              />
              <CourseTree
                tree={course.data.tree}
                onSelectLesson={(lessonId) => navigate(`/learn/lessons/${lessonId}`)}
                onSelectSection={(sectionId) =>
                  navigate(`/learn/courses/${courseId}/sections/${sectionId}`)
                }
              />
            </section>
            <aside aria-label="Tiến độ khóa học" className="grid content-start gap-4">
              <CourseProgressCard
                courseTitle={course.data.course.title}
                progress={course.data.progress}
                href="/student/progress"
                onContinue={() =>
                  navigate(
                    `/learn/lessons/${course.data.continueLessonId ?? course.data.tree.sections[0]?.lessons[0]?.id ?? ''}`,
                  )
                }
              />
              <AccessStatePanel access={course.data.access} />
              {course.data.access.kind !== 'available' && (
                <Card className="p-4">
                  <p className="text-sm leading-6 text-ink-secondary">
                    Nội dung bài học, media và đáp án được máy chủ kiểm tra cho từng yêu cầu.
                  </p>
                  <LinkButton
                    to={`/courses/${course.data.course.slug}`}
                    variant="outline"
                    className="mt-3 w-full"
                  >
                    Xem thông tin khóa học
                  </LinkButton>
                </Card>
              )}
            </aside>
          </div>
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

export function LearningLessonPage() {
  const { lessonId = '' } = useParams()
  const { session } = useAuthSession()
  const lesson = useProductLesson(session?.id ?? '', lessonId)
  const note = useProductLessonNote(session?.id ?? '', lessonId)
  const saveNote = useSaveLessonNote(session?.id ?? '', lessonId)
  const completeLesson = useCompleteLesson(session?.id ?? '')
  const [noteValue, setNoteValue] = useState<string>()
  const navigate = useNavigate()

  return (
    <ProductPage
      title="Không gian bài học"
      backTo={lesson.data ? `/learn/courses/${lesson.data.courseId}` : '/student/courses'}
    >
      {lesson.isPending ? (
        <ProductLoading title="Đang tải bài học" />
      ) : lesson.isError ? (
        <ProductError onRetry={() => void lesson.refetch()} />
      ) : !lesson.data ? (
        <ProductNotFound message="Bài học này không tồn tại hoặc tài khoản chưa được cấp quyền truy cập." />
      ) : (
        <div className="grid min-w-0 gap-7">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <LinkButton to={`/learn/courses/${lesson.data.courseId}`} variant="outline">
              {lesson.data.courseTitle}
            </LinkButton>
            <LessonCompletionIndicator completed={lesson.data.isCompleted} />
          </div>
          <div className="grid min-w-0 gap-7 xl:grid-cols-[minmax(0,1fr)_18rem]">
            <div className="grid min-w-0 gap-6">
              <div className="min-w-0">
                <LessonContent content={{ ...lesson.data, media: [] }} headingLevel={2} />
                {lesson.data.access.kind === 'available' && (
                  <div className="mx-auto mt-6 grid w-full max-w-3xl gap-4">
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
              </div>
              <section aria-labelledby="lesson-exercises-title" className="grid gap-3">
                <SectionHeader
                  title="Bài tập của bài học"
                  description="Bài bắt buộc cần hoàn thành để mở trạng thái hoàn tất bài học."
                />
                {lesson.data.exercises.length ? (
                  <ul className="grid gap-3 sm:grid-cols-2">
                    {lesson.data.exercises.map((exercise) => (
                      <li key={exercise.id}>
                        <Link
                          to={exercise.href}
                          className="flex min-h-24 items-center justify-between gap-3 rounded-2xl border border-border-subtle bg-card-surface p-4 hover:border-action-primary"
                        >
                          <span className="min-w-0">
                            <span className="block font-semibold">{exercise.title}</span>
                            <span className="mt-1 block text-xs text-ink-secondary">
                              {exercise.isRequired ? 'Bắt buộc' : 'Tùy chọn'} ·{' '}
                              {exercise.status === 'COMPLETED'
                                ? 'Đã hoàn thành'
                                : exercise.status === 'IN_PROGRESS'
                                  ? 'Đang làm'
                                  : 'Chưa bắt đầu'}
                            </span>
                          </span>
                          <ArrowRight
                            aria-hidden="true"
                            className="size-4 shrink-0 text-action-primary"
                          />
                        </Link>
                      </li>
                    ))}
                  </ul>
                ) : lesson.data.access.kind !== 'available' ? (
                  <Card className="flex items-center gap-3 p-4">
                    <LockKeyhole aria-hidden="true" className="size-5 text-warning-foreground" />
                    <p className="text-sm text-ink-secondary">
                      Bài tập sẽ xuất hiện khi máy chủ xác nhận quyền học còn hiệu lực.
                    </p>
                  </Card>
                ) : (
                  <Card className="p-4 text-sm text-ink-secondary">Bài này chưa có bài tập.</Card>
                )}
              </section>
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
              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border-subtle pt-5">
                <Button
                  variant="outline"
                  disabled={!lesson.data.previousLessonId}
                  onClick={() =>
                    lesson.data.previousLessonId &&
                    navigate(`/learn/lessons/${lesson.data.previousLessonId}`)
                  }
                >
                  Bài trước
                </Button>
                <Button
                  disabled={!lesson.data.canCompleteLesson || completeLesson.isPending}
                  loading={completeLesson.isPending}
                  onClick={() => void completeLesson.mutateAsync(lessonId)}
                  startIcon={lesson.data.isCompleted ? <Check aria-hidden="true" /> : undefined}
                >
                  {lesson.data.isCompleted ? 'Đã hoàn thành' : 'Hoàn thành bài học'}
                </Button>
                <Button
                  variant="outline"
                  disabled={!lesson.data.nextLessonId}
                  onClick={() =>
                    lesson.data.nextLessonId &&
                    navigate(`/learn/lessons/${lesson.data.nextLessonId}`)
                  }
                >
                  Bài tiếp
                </Button>
              </div>
              {completeLesson.isError && (
                <ErrorState
                  title="Chưa hoàn thành được bài học"
                  description="Hãy hoàn tất bài tập bắt buộc rồi thử lại."
                  onRetry={() => void completeLesson.mutate(lessonId)}
                />
              )}
            </div>
            <aside aria-label="Điều hướng bài học" className="grid content-start gap-4">
              <AccessStatePanel access={lesson.data.access} />
              <Card className="grid gap-3 p-4">
                <h2 className="font-semibold">Trong bài này</h2>
                <nav aria-label="Các bài trong khóa học" className="grid gap-2">
                  {lesson.data.progressItems.map((item) =>
                    item.href ? (
                      <Link
                        key={item.lessonId}
                        to={item.href}
                        aria-current={item.lessonId === lessonId ? 'page' : undefined}
                        className="rounded-xl px-3 py-2 text-sm text-ink-secondary hover:bg-surface-muted"
                      >
                        {item.title}
                        <span className="ml-2 text-xs text-ink-muted">
                          {item.status === 'COMPLETED' ? '✓' : ''}
                        </span>
                      </Link>
                    ) : null,
                  )}
                </nav>
              </Card>
              <LinkButton to={`/learn/courses/${lesson.data.courseId}`} variant="outline">
                Về lộ trình
              </LinkButton>
            </aside>
          </div>
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
    try {
      const attempt = await startQuiz.mutateAsync(exerciseId)
      const params = new URLSearchParams({
        exerciseId,
        ...(exercise.data?.lessonId ? { lessonId: exercise.data.lessonId } : {}),
      })
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
              title={exercise.data.title}
              description={`${exercise.data.description ? `${exercise.data.description} ` : ''}Câu hỏi được tải từ máy chủ; đáp án chỉ hiển thị nếu cấu hình bài kiểm tra cho phép.`}
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
          <Card className="mx-auto w-full max-w-3xl bg-surface-blue p-4 text-sm leading-6 text-ink-secondary">
            Lựa chọn và trạng thái bài làm được lưu trực tiếp trên máy chủ.
          </Card>
          <QuizRunner
            attempt={{
              ...attempt.data,
              selectedAnswers: { ...attempt.data.selectedAnswers, ...optimisticAnswers },
              capabilities: {
                canSubmit: attempt.data.capabilities.canSubmit && !selectAnswer.isPending,
              },
            }}
            currentQuestionIndex={currentQuestionIndex}
            onNavigate={setCurrentQuestionIndex}
            onAnswer={(questionId, optionId) => {
              setOptimisticAnswers((previous) => ({ ...previous, [questionId]: optionId }))
              selectAnswer.mutate({ questionId, optionId })
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
    <ProductPage title="Kết quả bài kiểm tra" backTo="/student/progress">
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
        <div className="mx-auto grid w-full max-w-3xl gap-4">
          <Card className="bg-surface-lime p-4 text-sm leading-6 text-pastel-lime-ink">
            Kết quả và quyền xem đáp án do cấu hình bài kiểm tra trên máy chủ quyết định.
          </Card>
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
