import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router'
import { useQuery } from '@tanstack/react-query'
import { Eye, EyeOff, Plus, Search, Trash2 } from 'lucide-react'
import { adminRepository } from '@/data/api/admin-repository'
import type { ApiAdminCourse, ApiAdminQuiz } from '@/lib/api/types'
import { ApiError } from '@/lib/api/client'
import { formatVnd } from '@/shared/lib/format'
import { BaseDialog, useDialogs } from '@/shared/ui/dialogs'
import { useNotifications } from '@/shared/ui/notifications'
import { Button, EmptyState } from '@/shared/ui'
import {
  AdminCard,
  AdminSortableTable,
  AdminField,
  AdminFeedback,
  AdminLoadError,
  AdminLoading,
  AdminSelect,
  useDebouncedValue,
  AdminTextArea,
  type AdminTableColumn,
  useAdminMutation,
  useStableIdempotencyKey,
} from './shared'
import { AdminExercisePdfManager } from './media-exercise-manager'

function splitLines(value: string) {
  return value
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
}

function statusTone(status: string) {
  return status === 'PUBLISHED' || status === 'ACTIVE'
    ? 'text-success-foreground'
    : status === 'ARCHIVED' || status === 'INACTIVE' || status === 'HIDDEN'
      ? 'text-ink-muted'
      : 'text-warning-foreground'
}
function coursePath(courseId: string) {
  return `/admin/courses/${encodeURIComponent(courseId)}`
}
function sectionPath(courseId: string, sectionId: string) {
  return `${coursePath(courseId)}/sections/${encodeURIComponent(sectionId)}`
}
function lessonPath(courseId: string, sectionId: string, lessonId: string) {
  return `${sectionPath(courseId, sectionId)}/lessons/${encodeURIComponent(lessonId)}`
}

async function loadAllCoursePages(query: string) {
  const filters = query ? { q: query } : {}
  const first = await adminRepository.listCourses({ page: 1, pageSize: 100, ...filters })
  const pageCount = Math.ceil(first.total / first.pageSize)
  if (pageCount <= 1) return first.items
  const rest = await Promise.all(
    Array.from({ length: pageCount - 1 }, (_, index) =>
      adminRepository.listCourses({ page: index + 2, pageSize: first.pageSize, ...filters }),
    ),
  )
  return first.items.concat(...rest.map((page) => page.items))
}

function courseStatusLabel(status: ApiAdminCourse['status']) {
  if (status === 'PUBLISHED') return 'Đang hiển thị'
  if (status === 'ARCHIVED') return 'Đã ẩn'
  return 'Bản nháp'
}

export function AdminCoursesPage() {
  const notifications = useNotifications()
  const dialogs = useDialogs()
  const [search, setSearch] = useState('')
  const searchQuery = useDebouncedValue(search.trim())
  const courses = useQuery({
    queryKey: ['admin', 'courses', searchQuery],
    queryFn: () => loadAllCoursePages(searchQuery),
    retry: false,
  })
  const toggleStatus = useAdminMutation(
    ({ courseId, status }: { courseId: string; status: ApiAdminCourse['status'] }) =>
      status === 'PUBLISHED'
        ? adminRepository.updateCourse(courseId, { status: 'ARCHIVED' })
        : adminRepository.publishCourse(courseId),
  )
  const remove = useAdminMutation((courseId: string) => adminRepository.deleteCourse(courseId))
  const create = useAdminMutation(
    ({ input, key }: { input: Record<string, unknown>; key: string }) =>
      adminRepository.createCourse(input, key),
  )
  const idempotency = useStableIdempotencyKey()
  const [code, setCode] = useState('')
  const [slug, setSlug] = useState('')
  const [title, setTitle] = useState('')
  const [level, setLevel] = useState('A1')
  const [shortDescription, setShortDescription] = useState('')
  const [description, setDescription] = useState('')
  const [objectives, setObjectives] = useState('')
  const [requirements, setRequirements] = useState('')
  const [price, setPrice] = useState('')
  const [duration, setDuration] = useState('12')
  const [createOpen, setCreateOpen] = useState(false)

  function updateTitle(value: string) {
    setTitle(value)
    setSlug(
      value
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[đĐ]/g, 'd')
        .replace(/ß/g, 'ss')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, ''),
    )
  }

  function confirmDelete(course: ApiAdminCourse) {
    dialogs.confirm({
      title: `Xóa khóa học “${course.title}”?`,
      description: 'Khóa học sẽ được gỡ khỏi danh sách học viên. Lịch sử học tập vẫn được giữ lại.',
      confirmLabel: 'Xóa khóa học',
      destructive: true,
      onConfirm: async () => {
        try {
          await remove.mutateAsync(course.id)
          notifications.success('Đã xóa khóa học.')
        } catch {
          /* Error is shown below the list. */
        }
      },
    })
  }

  async function changeVisibility(course: ApiAdminCourse) {
    try {
      await toggleStatus.mutateAsync({ courseId: course.id, status: course.status })
      notifications.success(
        course.status === 'PUBLISHED' ? 'Đã ẩn khóa học.' : 'Đã hiển thị khóa học.',
      )
    } catch {
      /* Error is shown below the list. */
    }
  }
  async function submit(event: FormEvent) {
    event.preventDefault()
    const input = {
      code: code.trim(),
      slug: slug.trim(),
      title: title.trim(),
      level: level.trim(),
      shortDescription: shortDescription.trim(),
      description,
      objectives: splitLines(objectives),
      requirements: splitLines(requirements),
      price: price.trim(),
      accessDurationMonths: Number(duration),
      sortOrder: courses.data?.length ?? 0,
    }
    try {
      await create.mutateAsync({ input, key: idempotency.get(input) })
      idempotency.clear()
      setCreateOpen(false)
      setCode('')
      setSlug('')
      setTitle('')
      setLevel('A1')
      setShortDescription('')
      setDescription('')
      setObjectives('')
      setRequirements('')
      setPrice('')
      setDuration('12')
      notifications.success('Đã tạo khóa học nháp.')
    } catch {
      /* The API error is displayed below. */
    }
  }

  const columns: AdminTableColumn<ApiAdminCourse>[] = [
    {
      key: 'course',
      label: 'Khóa học',
      sortValue: (course) => course.title,
      render: (course) => (
        <Link
          to={coursePath(course.id)}
          className="rounded-lg outline-none hover:text-action-primary focus-visible:ring-2 focus-visible:ring-action-primary"
        >
          <span className="block font-semibold">{course.title}</span>
          <span className="block text-xs text-ink-secondary">{course.code}</span>
        </Link>
      ),
    },
    {
      key: 'level',
      label: 'Cấp độ',
      sortValue: (course) => course.level,
      render: (course) => course.level,
    },
    {
      key: 'price',
      label: 'Học phí',
      sortValue: (course) => Number(course.price),
      render: (course) => formatVnd(course.price),
    },
    {
      key: 'duration',
      label: 'Thời hạn',
      sortValue: (course) => course.accessDurationMonths,
      render: (course) => `${course.accessDurationMonths} tháng`,
    },
    {
      key: 'status',
      label: 'Trạng thái',
      sortValue: (course) => courseStatusLabel(course.status),
      render: (course) => (
        <span className={`font-semibold ${statusTone(course.status)}`}>
          {courseStatusLabel(course.status)}
        </span>
      ),
    },
    {
      key: 'actions',
      label: 'Thao tác',
      className: 'text-right',
      render: (course) => (
        <div className="flex justify-end gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            loading={toggleStatus.isPending && toggleStatus.variables?.courseId === course.id}
            onClick={() => void changeVisibility(course)}
            startIcon={
              course.status === 'PUBLISHED' ? (
                <EyeOff aria-hidden="true" className="size-4" />
              ) : (
                <Eye aria-hidden="true" className="size-4" />
              )
            }
          >
            {course.status === 'PUBLISHED'
              ? 'Ẩn'
              : course.status === 'ARCHIVED'
                ? 'Hiện'
                : 'Xuất bản'}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            loading={remove.isPending && remove.variables === course.id}
            onClick={() => confirmDelete(course)}
            startIcon={<Trash2 aria-hidden="true" className="size-4" />}
          >
            Xóa
          </Button>
        </div>
      ),
    },
  ]

  return (
    <div className="grid gap-4">
      <AdminCard
        title="Danh sách khóa học"
        description="Tìm khóa học hoặc nhấn tiêu đề cột để sắp xếp. Chọn tên khóa học để chỉnh sửa."
      >
        <div className="flex flex-wrap items-end justify-between gap-3">
          <label className="relative grid w-full max-w-lg gap-1.5 text-sm font-semibold text-ink-primary">
            <span>Tìm khóa học</span>
            <Search aria-hidden="true" className="absolute bottom-3 left-3 size-4 text-ink-muted" />
            <input
              className="min-h-11 w-full rounded-xl border border-border-subtle bg-white pl-10 pr-3 font-normal outline-none focus-visible:ring-2 focus-visible:ring-action-primary"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Nhập tên hoặc mã khóa học"
            />
          </label>
          <Button
            type="button"
            onClick={() => setCreateOpen(true)}
            startIcon={<Plus aria-hidden="true" className="size-4" />}
          >
            Tạo khóa học
          </Button>
        </div>
        {courses.isPending ? (
          <AdminLoading />
        ) : courses.isError ? (
          <AdminLoadError error={courses.error} retry={() => void courses.refetch()} />
        ) : (
          <AdminSortableTable
            rows={courses.data ?? []}
            columns={columns}
            rowKey={(course) => course.id}
            emptyContent={
              <EmptyState
                title={searchQuery ? 'Không tìm thấy khóa học' : 'Chưa có khóa học'}
                description={
                  searchQuery
                    ? 'Thử một tên hoặc mã khác.'
                    : 'Tạo khóa học đầu tiên bằng nút phía trên.'
                }
              />
            }
          />
        )}
        <AdminFeedback error={toggleStatus.error ?? remove.error} />
      </AdminCard>

      <BaseDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        title="Tạo khóa học mới"
        description="Nhập thông tin cơ bản. Ảnh bìa sẽ được bổ sung sau khi chốt cách lưu ảnh."
        footer={
          <>
            <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>
              Hủy
            </Button>
            <Button type="submit" form="admin-create-course" loading={create.isPending}>
              Tạo khóa học
            </Button>
          </>
        }
      >
        <form
          id="admin-create-course"
          className="grid gap-3"
          onSubmit={(event) => void submit(event)}
        >
          <AdminField
            label="Mã khóa học"
            value={code}
            onChange={setCode}
            required
            placeholder="A1-1"
          />
          <AdminField label="Tên khóa học" value={title} onChange={updateTitle} required />
          <div className="grid gap-3 sm:grid-cols-2">
            <AdminField label="Cấp độ" value={level} onChange={setLevel} required />
            <AdminField
              label="Học phí (đồng)"
              value={price}
              onChange={setPrice}
              type="number"
              min={0}
              required
            />
            <AdminField
              label="Thời hạn truy cập (tháng)"
              value={duration}
              onChange={setDuration}
              type="number"
              min={1}
              max={120}
              required
            />
          </div>
          <AdminField
            label="Mô tả ngắn"
            value={shortDescription}
            onChange={setShortDescription}
            required
          />
          <AdminTextArea
            label="Mô tả"
            value={description}
            onChange={setDescription}
            rows={4}
            required
          />
          <AdminTextArea
            label="Nội dung học viên sẽ nắm được (mỗi ý một dòng)"
            value={objectives}
            onChange={setObjectives}
            rows={3}
          />
          <AdminTextArea
            label="Điều kiện đầu vào (mỗi ý một dòng)"
            value={requirements}
            onChange={setRequirements}
            rows={3}
          />
          <p className="rounded-xl bg-surface-muted p-3 text-xs leading-5 text-ink-secondary">
            Khóa học mới ở trạng thái bản nháp. Ảnh bìa sẽ được thêm sau khi hoàn tất cách lưu ảnh.
          </p>
          <AdminFeedback error={create.error} />
        </form>
      </BaseDialog>
    </div>
  )
}

export function AdminExerciseEditorPage({
  courseId,
  sectionId,
  lessonId,
  exerciseId,
}: {
  courseId: string
  sectionId: string
  lessonId: string
  exerciseId: string
}) {
  const dialogs = useDialogs()
  const exercises = useQuery({
    queryKey: ['admin', 'exercises', lessonId],
    queryFn: () => adminRepository.listExercises(lessonId),
    retry: false,
  })
  const update = useAdminMutation(({ id, input }: { id: string; input: Record<string, unknown> }) =>
    adminRepository.updateExercise(id, input),
  )
  const remove = useAdminMutation((id: string) => adminRepository.deleteExercise(id))
  const navigate = useNavigate()
  const exercise = exercises.data?.items.find((item) => item.id === exerciseId)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [instructions, setInstructions] = useState('')
  const [required, setRequired] = useState(true)
  const [sortOrder, setSortOrder] = useState(0)
  const [status, setStatus] = useState<'DRAFT' | 'PUBLISHED' | 'HIDDEN'>('DRAFT')
  const [success, setSuccess] = useState('')
  // These editors initialize a local draft from a server-owned document.
  useEffect(() => {
    if (exercise) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setTitle(exercise.title)
      setDescription(exercise.description ?? '')
      setInstructions(exercise.instructions)
      setRequired(exercise.isRequired)
      setSortOrder(exercise.sortOrder)
      setStatus(exercise.status)
    }
  }, [exercise])
  if (exercises.isPending) return <AdminLoading />
  if (exercises.isError || !exercise)
    return (
      <AdminLoadError
        error={exercises.error ?? new Error('Không tìm thấy bài tập.')}
        retry={() => void exercises.refetch()}
      />
    )
  async function save(event: FormEvent) {
    event.preventDefault()
    try {
      await update.mutateAsync({
        id: exerciseId,
        input: {
          title,
          description: description || null,
          instructions,
          isRequired: required,
          status,
          exerciseType: exercise?.exerciseType,
          completionMode: exercise?.completionMode,
          sortOrder,
        },
      })
      setSuccess('Đã lưu bài tập.')
    } catch {
      /* error shown */
    }
  }
  function deleteSelected() {
    dialogs.confirm({
      title: 'Xóa bài tập này?',
      description: 'Bài tập này sẽ không còn xuất hiện trong bài học.',
      confirmLabel: 'Xóa bài tập',
      destructive: true,
      onConfirm: async () => {
        try {
          await remove.mutateAsync(exerciseId)
          navigate(lessonPath(courseId, sectionId, lessonId))
        } catch {
          /* error shown */
        }
      },
    })
  }
  return (
    <div className="grid gap-5">
      <AdminCard
        title="Chỉnh sửa bài tập"
        description="Cập nhật tên, hướng dẫn cho học viên và trạng thái bài tập."
      >
        <form className="grid gap-3" onSubmit={(event) => void save(event)}>
          <AdminField label="Tên bài tập" value={title} onChange={setTitle} required />
          <AdminTextArea label="Mô tả" value={description} onChange={setDescription} rows={3} />
          <AdminTextArea
            label="Hướng dẫn"
            value={instructions}
            onChange={setInstructions}
            rows={5}
            required
          />
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="flex min-h-10 items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={required}
                onChange={(event) => setRequired(event.target.checked)}
              />
              Bài tập bắt buộc
            </label>
            <AdminField
              label="Vị trí trong bài học"
              value={String(sortOrder)}
              onChange={(value) => setSortOrder(Number(value))}
              type="number"
              min={0}
            />
          </div>
          <AdminSelect
            label="Trạng thái"
            value={status}
            onChange={(value) => setStatus(value as typeof status)}
            options={[
              { value: 'DRAFT', label: 'Bản nháp' },
              { value: 'PUBLISHED', label: 'Đang hiển thị' },
              { value: 'HIDDEN', label: 'Đã ẩn' },
            ]}
          />
          <AdminFeedback error={update.error} success={success} />
          <Button type="submit" loading={update.isPending}>
            Lưu bài tập
          </Button>
          <Button type="button" variant="outline" onClick={() => void deleteSelected()}>
            Xóa bài tập
          </Button>
          <AdminFeedback error={remove.error} />
        </form>
      </AdminCard>
      {exercise.exerciseType === 'QUIZ' ? (
        <AdminQuizEditor
          key={exerciseId}
          exerciseId={exerciseId}
          initialTitle={title || exercise.title}
        />
      ) : (
        <AdminExercisePdfManager exercises={[exercise]} selectedExerciseId={exercise.id} />
      )}
    </div>
  )
}

type QuizQuestionDraft = {
  id?: string
  questionText: string
  explanation: string
  points: string
  options: Array<{ id?: string; optionText: string; isCorrect: boolean }>
}

function blankQuestion(): QuizQuestionDraft {
  return {
    questionText: '',
    explanation: '',
    points: '1',
    options: [
      { optionText: '', isCorrect: true },
      { optionText: '', isCorrect: false },
    ],
  }
}

function quizQuestionDraft(question: ApiAdminQuiz['questions'][number]): QuizQuestionDraft {
  return {
    id: question.id,
    questionText: question.questionText,
    explanation: question.explanation ?? '',
    points: question.points,
    options: question.options.map((option) => ({
      id: option.id,
      optionText: option.optionText,
      isCorrect: option.isCorrect,
    })),
  }
}

function AdminQuizEditor({
  exerciseId,
  initialTitle,
}: {
  exerciseId: string
  initialTitle: string
}) {
  const quiz = useQuery({
    queryKey: ['admin', 'quiz', exerciseId],
    queryFn: () => adminRepository.getQuiz(exerciseId),
    retry: false,
  })
  const save = useAdminMutation((input: Record<string, unknown>) =>
    adminRepository.saveQuiz(exerciseId, input),
  )
  const [title, setTitle] = useState(initialTitle)
  const [description, setDescription] = useState('')
  const [passScore, setPassScore] = useState('')
  const [showCorrectAnswers, setShowCorrectAnswers] = useState(true)
  const [questions, setQuestions] = useState<QuizQuestionDraft[]>([blankQuestion()])
  const [validation, setValidation] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    if (quiz.data) {
      // This editor initializes a local draft from the server-owned quiz.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setTitle(quiz.data.title)
      setDescription(quiz.data.description ?? '')
      setPassScore(quiz.data.passScorePercent == null ? '' : String(quiz.data.passScorePercent))
      setShowCorrectAnswers(quiz.data.showCorrectAnswers)
      setQuestions(
        quiz.data.questions.length ? quiz.data.questions.map(quizQuestionDraft) : [blankQuestion()],
      )
    }
  }, [quiz.data])

  const quizMissing =
    quiz.error instanceof ApiError && quiz.error.status === 404 && quiz.error.code === 'NOT_FOUND'

  function changeQuestion(
    index: number,
    update: (question: QuizQuestionDraft) => QuizQuestionDraft,
  ) {
    setQuestions((current) =>
      current.map((question, currentIndex) =>
        currentIndex === index ? update(question) : question,
      ),
    )
  }

  function changeOption(
    questionIndex: number,
    optionIndex: number,
    update: (option: QuizQuestionDraft['options'][number]) => QuizQuestionDraft['options'][number],
  ) {
    changeQuestion(questionIndex, (question) => ({
      ...question,
      options: question.options.map((option, currentIndex) =>
        currentIndex === optionIndex ? update(option) : option,
      ),
    }))
  }

  function markCorrectOption(questionIndex: number, optionIndex: number) {
    changeQuestion(questionIndex, (question) => ({
      ...question,
      options: question.options.map((option, currentIndex) => ({
        ...option,
        isCorrect: currentIndex === optionIndex,
      })),
    }))
  }

  async function submit(event: FormEvent) {
    event.preventDefault()
    setValidation('')
    setSuccess('')
    if (!questions.length) {
      setValidation('Thêm ít nhất một câu hỏi trước khi lưu.')
      return
    }
    const invalidQuestion = questions.findIndex(
      (question) =>
        !question.questionText.trim() ||
        question.options.length < 2 ||
        question.options.some((option) => !option.optionText.trim()) ||
        question.options.filter((option) => option.isCorrect).length !== 1,
    )
    if (invalidQuestion >= 0) {
      setValidation(
        `Kiểm tra câu ${invalidQuestion + 1}: nhập nội dung, ít nhất hai lựa chọn và đánh dấu một đáp án đúng.`,
      )
      return
    }
    if (passScore && (Number(passScore) < 0 || Number(passScore) > 100)) {
      setValidation('Điểm đạt cần nằm trong khoảng từ 0 đến 100%.')
      return
    }
    const input = {
      title: title.trim(),
      description: description.trim() || null,
      passScorePercent: passScore === '' ? null : Number(passScore),
      showCorrectAnswers,
      questions: questions.map((question, questionIndex) => ({
        ...(question.id ? { id: question.id } : {}),
        questionText: question.questionText.trim(),
        questionType: 'SINGLE_CHOICE',
        explanation: question.explanation.trim() || null,
        points: question.points || '1',
        sortOrder: questionIndex,
        options: question.options.map((option, optionIndex) => ({
          ...(option.id ? { id: option.id } : {}),
          optionText: option.optionText.trim(),
          isCorrect: option.isCorrect,
          sortOrder: optionIndex,
        })),
      })),
    }
    try {
      await save.mutateAsync(input)
      setSuccess('Đã lưu bài trắc nghiệm.')
    } catch {
      /* API validation error below */
    }
  }

  if (quiz.isPending) return <AdminLoading label="Đang tải bài trắc nghiệm" />
  if (quiz.isError && !quizMissing)
    return <AdminLoadError error={quiz.error} retry={() => void quiz.refetch()} />

  return (
    <AdminCard
      title="Nội dung bài trắc nghiệm"
      description="Thêm câu hỏi, nhập các lựa chọn và đánh dấu đáp án đúng."
    >
      {quizMissing && (
        <p className="rounded-xl bg-surface-muted p-3 text-sm leading-6 text-ink-secondary">
          Bài trắc nghiệm này chưa có câu hỏi. Thêm câu đầu tiên ở bên dưới.
        </p>
      )}
      <form className="grid gap-3" onSubmit={(event) => void submit(event)}>
        <AdminField label="Tên bài trắc nghiệm" value={title} onChange={setTitle} required />
        <AdminTextArea label="Mô tả ngắn" value={description} onChange={setDescription} rows={2} />
        <div className="grid gap-3 sm:grid-cols-2">
          <AdminField
            label="Điểm đạt (%) · để trống nếu không áp dụng"
            value={passScore}
            onChange={setPassScore}
            type="number"
            min={0}
            max={100}
          />
          <label className="flex min-h-11 items-center gap-2 rounded-xl border border-border-subtle bg-white px-3 text-sm">
            <input
              type="checkbox"
              checked={showCorrectAnswers}
              onChange={(event) => setShowCorrectAnswers(event.target.checked)}
            />
            Hiện đáp án sau khi nộp
          </label>
        </div>
        <div className="grid gap-3 border-t border-border-subtle pt-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="font-semibold">Câu hỏi</h3>
              <p className="text-sm text-ink-secondary">
                Mỗi câu cần có ít nhất hai lựa chọn và một đáp án đúng.
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              onClick={() => setQuestions((current) => [...current, blankQuestion()])}
              startIcon={<Plus aria-hidden="true" className="size-4" />}
            >
              Thêm câu hỏi
            </Button>
          </div>
          {questions.map((question, questionIndex) => (
            <section
              key={question.id ?? `new-question-${questionIndex}`}
              className="grid gap-3 rounded-2xl border border-border-subtle bg-surface-muted p-4"
            >
              <div className="flex items-center justify-between gap-3">
                <h4 className="font-semibold">Câu {questionIndex + 1}</h4>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={questions.length === 1}
                  onClick={() =>
                    setQuestions((current) => current.filter((_, index) => index !== questionIndex))
                  }
                >
                  Xóa câu
                </Button>
              </div>
              <AdminTextArea
                label="Nội dung câu hỏi"
                value={question.questionText}
                onChange={(value) =>
                  changeQuestion(questionIndex, (current) => ({ ...current, questionText: value }))
                }
                rows={2}
                required
              />
              <AdminField
                label="Điểm của câu"
                value={question.points}
                onChange={(value) =>
                  changeQuestion(questionIndex, (current) => ({ ...current, points: value }))
                }
                type="number"
                min={0}
                step={0.01}
                required
              />
              <div className="grid gap-2">
                <p className="text-sm font-semibold">Các lựa chọn</p>
                {question.options.map((option, optionIndex) => (
                  <div
                    key={option.id ?? `new-option-${questionIndex}-${optionIndex}`}
                    className="grid gap-2 rounded-xl border border-border-subtle bg-white p-3 sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:items-center"
                  >
                    <label className="grid gap-1.5 text-sm font-semibold">
                      <span>Lựa chọn {optionIndex + 1}</span>
                      <input
                        className="min-h-10 w-full rounded-xl border border-border-subtle bg-white px-3 font-normal outline-none focus-visible:ring-2 focus-visible:ring-action-primary"
                        value={option.optionText}
                        onChange={(event) =>
                          changeOption(questionIndex, optionIndex, (current) => ({
                            ...current,
                            optionText: event.target.value,
                          }))
                        }
                        required
                      />
                    </label>
                    <label className="flex min-h-10 items-center gap-2 text-sm">
                      <input
                        type="radio"
                        name={`quiz-question-${questionIndex}-correct`}
                        checked={option.isCorrect}
                        onChange={() => markCorrectOption(questionIndex, optionIndex)}
                      />
                      Đáp án đúng
                    </label>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={question.options.length <= 2}
                      aria-label={`Xóa lựa chọn ${optionIndex + 1} của câu ${questionIndex + 1}`}
                      onClick={() => {
                        const nextOptions = question.options.filter(
                          (_, index) => index !== optionIndex,
                        )
                        if (!nextOptions.some((item) => item.isCorrect))
                          nextOptions[0] = { ...nextOptions[0]!, isCorrect: true }
                        changeQuestion(questionIndex, (current) => ({
                          ...current,
                          options: nextOptions,
                        }))
                      }}
                    >
                      Xóa lựa chọn
                    </Button>
                  </div>
                ))}
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="justify-self-start"
                  onClick={() =>
                    changeQuestion(questionIndex, (current) => ({
                      ...current,
                      options: [...current.options, { optionText: '', isCorrect: false }],
                    }))
                  }
                >
                  Thêm lựa chọn
                </Button>
              </div>
              <AdminTextArea
                label="Giải thích đáp án (không bắt buộc)"
                value={question.explanation}
                onChange={(value) =>
                  changeQuestion(questionIndex, (current) => ({ ...current, explanation: value }))
                }
                rows={2}
              />
            </section>
          ))}
        </div>
        <AdminFeedback error={validation || save.error} success={success} />
        <Button type="submit" loading={save.isPending}>
          Lưu bài trắc nghiệm
        </Button>
      </form>
    </AdminCard>
  )
}
