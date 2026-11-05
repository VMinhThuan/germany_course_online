import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router'
import { useQuery } from '@tanstack/react-query'
import {
  ArrowLeft,
  ChevronRight,
  Eye,
  EyeOff,
  ExternalLink,
  Plus,
  Search,
  Trash2,
} from 'lucide-react'
import { adminRepository } from '@/data/api/admin-repository'
import type {
  ApiAdminCourse,
  ApiAdminExercise,
  ApiAdminLesson,
  ApiAdminSection,
  ApiPage,
} from '@/lib/api/types'
import { Button, EmptyState } from '@/shared/ui'
import { useDialogs } from '@/shared/ui/dialogs'
import { useNotifications } from '@/shared/ui/notifications'
import { parseYouTubeVideoId, YouTubeLessonPlayer } from '@/domains/learning/youtube-lesson-player'
import {
  AdminCard,
  AdminFeedback,
  AdminField,
  AdminLoadError,
  AdminLoading,
  AdminSearchSelect,
  AdminSelect,
  AdminTextArea,
  useAdminMutation,
  useStableIdempotencyKey,
} from './shared'
import {
  AdminExercisePdfPicker,
  uploadAndAttachExercisePdf,
  type ExercisePdfSelection,
} from './media-exercise-manager'

function coursePath(courseId: string) {
  return `/admin/courses/${encodeURIComponent(courseId)}`
}

function sectionPath(courseId: string, sectionId: string) {
  return `${coursePath(courseId)}/sections/${encodeURIComponent(sectionId)}`
}

function lessonPath(courseId: string, sectionId: string, lessonId: string) {
  return `${sectionPath(courseId, sectionId)}/lessons/${encodeURIComponent(lessonId)}`
}

function exercisePath(courseId: string, sectionId: string, lessonId: string, exerciseId: string) {
  return `${lessonPath(courseId, sectionId, lessonId)}/exercises/${encodeURIComponent(exerciseId)}`
}

async function loadAllPages<T>(loadPage: (page: number) => Promise<ApiPage<T>>) {
  const first = await loadPage(1)
  const pageCount = Math.ceil(first.total / first.pageSize)
  if (pageCount <= 1) return first.items
  const rest = await Promise.all(
    Array.from({ length: pageCount - 1 }, (_, index) => loadPage(index + 2)),
  )
  return first.items.concat(...rest.map((page) => page.items))
}

function useCourseOptions() {
  return useQuery({
    queryKey: ['admin', 'content-course-options'],
    queryFn: () => loadAllPages((page) => adminRepository.listCourses({ page, pageSize: 100 })),
    retry: false,
  })
}

function useSectionOptions(courseId: string) {
  return useQuery({
    queryKey: ['admin', 'content-section-options', courseId],
    queryFn: () =>
      loadAllPages((page) => adminRepository.listSections(courseId, { page, pageSize: 100 })),
    enabled: Boolean(courseId),
    retry: false,
  })
}

function useLessonOptions(sectionId: string) {
  return useQuery({
    queryKey: ['admin', 'content-lesson-options', sectionId],
    queryFn: () =>
      loadAllPages((page) => adminRepository.listLessons(sectionId, { page, pageSize: 100 })),
    enabled: Boolean(sectionId),
    retry: false,
  })
}

function statusLabel(status: string) {
  if (status === 'PUBLISHED') return 'Đang hiển thị'
  if (status === 'HIDDEN' || status === 'ARCHIVED') return 'Đã ẩn'
  return 'Bản nháp'
}

function statusClass(status: string) {
  if (status === 'PUBLISHED') return 'bg-success-surface text-success-foreground'
  if (status === 'HIDDEN' || status === 'ARCHIVED') return 'bg-surface-muted text-ink-secondary'
  return 'bg-warning-surface text-warning-foreground'
}

function normalizeSearch(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[đĐ]/g, 'd')
    .toLocaleLowerCase('vi')
}

function SearchInput({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  placeholder: string
}) {
  return (
    <label className="relative grid gap-1.5 text-sm font-semibold text-ink-primary">
      <span>{label}</span>
      <Search aria-hidden="true" className="absolute bottom-3 left-3 size-4 text-ink-muted" />
      <input
        className="min-h-11 w-full rounded-xl border border-border-subtle bg-white pl-10 pr-3 font-normal outline-none focus-visible:ring-2 focus-visible:ring-action-primary"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
      />
    </label>
  )
}

function ContentStatus({ status }: { status: string }) {
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${statusClass(status)}`}
    >
      {statusLabel(status)}
    </span>
  )
}

function VisibilityButton({
  status,
  onClick,
  loading,
}: {
  status: ApiAdminSection['status'] | ApiAdminLesson['status'] | ApiAdminExercise['status']
  onClick: () => void
  loading: boolean
}) {
  const label = status === 'PUBLISHED' ? 'Ẩn' : status === 'HIDDEN' ? 'Hiện' : 'Xuất bản'
  return (
    <Button
      type="button"
      size="sm"
      variant="outline"
      loading={loading}
      onClick={onClick}
      startIcon={
        status === 'PUBLISHED' ? (
          <EyeOff aria-hidden="true" className="size-4" />
        ) : (
          <Eye aria-hidden="true" className="size-4" />
        )
      }
    >
      {label}
    </Button>
  )
}

function ContentRow({
  title,
  description,
  status,
  editHref,
  editLabel,
  onToggle,
  onDelete,
  busy,
}: {
  title: string
  description: string
  status: ApiAdminSection['status'] | ApiAdminLesson['status'] | ApiAdminExercise['status']
  editHref: string
  editLabel: string
  onToggle: () => void
  onDelete: () => void
  busy: boolean
}) {
  return (
    <div className="grid gap-3 rounded-2xl border border-border-subtle bg-white p-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
      <Link
        to={editHref}
        className="min-w-0 rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-action-primary"
      >
        <strong className="block truncate text-ink-primary">{title}</strong>
        <span className="mt-1 flex flex-wrap items-center gap-2 text-xs text-ink-secondary">
          <ContentStatus status={status} />
          {description && <span>{description}</span>}
          <span className="font-semibold text-action-primary">{editLabel}</span>
        </span>
      </Link>
      <div className="flex flex-wrap gap-2 sm:justify-end">
        <VisibilityButton status={status} onClick={onToggle} loading={busy} />
        <Button
          type="button"
          size="sm"
          variant="outline"
          loading={busy}
          onClick={onDelete}
          startIcon={<Trash2 aria-hidden="true" className="size-4" />}
        >
          Xóa
        </Button>
      </div>
    </div>
  )
}

export function AdminSectionsPage() {
  const dialogs = useDialogs()
  const notifications = useNotifications()
  const idempotency = useStableIdempotencyKey()
  const courses = useCourseOptions()
  const [courseId, setCourseId] = useState('')
  const [search, setSearch] = useState('')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const sections = useSectionOptions(courseId)
  const create = useAdminMutation(
    ({ input, key }: { input: Record<string, unknown>; key: string }) =>
      adminRepository.createSection(courseId, input, key),
  )
  const update = useAdminMutation(
    ({ id, status }: { id: string; status: ApiAdminSection['status'] }) =>
      adminRepository.updateSection(id, { status }),
  )
  const remove = useAdminMutation((id: string) => adminRepository.deleteSection(id))
  const selectedCourse = courses.data?.find((course) => course.id === courseId)
  const filtered = (sections.data ?? []).filter((section) =>
    normalizeSearch(`${section.title} ${section.description ?? ''}`).includes(
      normalizeSearch(search),
    ),
  )

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (!courseId) return
    const input = {
      title: title.trim(),
      description: description.trim() || null,
      sectionType: 'CHAPTER',
      sortOrder: sections.data?.length ?? 0,
      status: 'DRAFT',
    }
    try {
      await create.mutateAsync({ input, key: idempotency.get(input) })
      idempotency.clear()
      setTitle('')
      setDescription('')
      notifications.success('Đã tạo chương mới.')
    } catch {
      /* Error is shown below the form. */
    }
  }

  function toggle(section: ApiAdminSection) {
    const nextStatus = section.status === 'PUBLISHED' ? 'HIDDEN' : 'PUBLISHED'
    void update
      .mutateAsync({ id: section.id, status: nextStatus })
      .then(() =>
        notifications.success(nextStatus === 'HIDDEN' ? 'Đã ẩn chương.' : 'Đã hiển thị chương.'),
      )
      .catch(() => undefined)
  }

  function confirmDelete(section: ApiAdminSection) {
    dialogs.confirm({
      title: `Xóa chương “${section.title}”?`,
      description: 'Các bài học trong chương sẽ không còn hiển thị cho học viên.',
      confirmLabel: 'Xóa chương',
      destructive: true,
      onConfirm: async () => {
        try {
          await remove.mutateAsync(section.id)
          notifications.success('Đã xóa chương.')
        } catch {
          /* Error is shown below the list. */
        }
      },
    })
  }

  return (
    <div className="grid gap-5">
      <AdminCard
        title="Chọn khóa học trước"
        description="Chọn khóa học để xem, tạo và sắp xếp các chương bên trong. Có thể gõ tên khóa học để tìm nhanh."
      >
        {courses.isPending ? (
          <AdminLoading label="Đang tải khóa học" />
        ) : courses.isError ? (
          <AdminLoadError error={courses.error} retry={() => void courses.refetch()} />
        ) : (
          <AdminSearchSelect
            label="Khóa học"
            value={courseId}
            onChange={(value) => {
              setCourseId(value)
              setSearch('')
            }}
            options={(courses.data ?? []).map((course) => ({
              value: course.id,
              label: course.title,
              description: `${course.code} · ${course.level}`,
            }))}
          />
        )}
      </AdminCard>

      {courseId && (
        <>
          <AdminCard
            title={selectedCourse ? `Chương · ${selectedCourse.title}` : 'Danh sách chương'}
            description="Tìm chương theo tên, sửa nội dung hoặc ẩn chương khỏi trang học viên."
          >
            <SearchInput
              label="Tìm chương"
              value={search}
              onChange={setSearch}
              placeholder="Nhập tên chương"
            />
            {sections.isPending ? (
              <AdminLoading label="Đang tải chương" />
            ) : sections.isError ? (
              <AdminLoadError error={sections.error} retry={() => void sections.refetch()} />
            ) : filtered.length ? (
              <div className="grid gap-2">
                {filtered.map((section) => (
                  <ContentRow
                    key={section.id}
                    title={section.title}
                    description={`Chương ${section.sortOrder + 1}`}
                    status={section.status}
                    editHref={sectionPath(courseId, section.id)}
                    editLabel="Sửa chương"
                    onToggle={() => toggle(section)}
                    onDelete={() => confirmDelete(section)}
                    busy={update.isPending || remove.isPending}
                  />
                ))}
              </div>
            ) : (
              <EmptyState
                title={search ? 'Không tìm thấy chương' : 'Khóa học chưa có chương'}
                description={
                  search ? 'Thử một tên khác.' : 'Tạo chương đầu tiên ở biểu mẫu bên dưới.'
                }
              />
            )}
            <AdminFeedback error={update.error ?? remove.error} />
          </AdminCard>

          <AdminCard title="Tạo chương mới">
            <p className="text-sm leading-6 text-ink-secondary">
              Chương sẽ được lưu ở trạng thái bản nháp. Bạn có thể chỉnh sửa hoặc hiển thị sau.
            </p>
            <form className="grid gap-3" onSubmit={(event) => void submit(event)}>
              <AdminField label="Tên chương" value={title} onChange={setTitle} required />
              <AdminTextArea
                label="Mô tả ngắn"
                value={description}
                onChange={setDescription}
                rows={2}
              />
              <AdminFeedback error={create.error} />
              <Button
                type="submit"
                loading={create.isPending}
                startIcon={<Plus aria-hidden="true" className="size-4" />}
              >
                Tạo chương
              </Button>
            </form>
          </AdminCard>
        </>
      )}
    </div>
  )
}

export function AdminLessonsPage() {
  const dialogs = useDialogs()
  const notifications = useNotifications()
  const navigate = useNavigate()
  const idempotency = useStableIdempotencyKey()
  const courses = useCourseOptions()
  const [courseId, setCourseId] = useState('')
  const [sectionId, setSectionId] = useState('')
  const [search, setSearch] = useState('')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const sections = useSectionOptions(courseId)
  const lessons = useLessonOptions(sectionId)
  const create = useAdminMutation(
    ({ parentId, input, key }: { parentId: string; input: Record<string, unknown>; key: string }) =>
      adminRepository.createLesson(parentId, input, key),
  )
  const update = useAdminMutation(
    ({ id, status }: { id: string; status: ApiAdminLesson['status'] }) =>
      adminRepository.updateLesson(id, { status }),
  )
  const remove = useAdminMutation((id: string) => adminRepository.deleteLesson(id))
  const selectedCourse = courses.data?.find((course) => course.id === courseId)
  const selectedSection = sections.data?.find((section) => section.id === sectionId)
  const filtered = (lessons.data ?? []).filter((lesson) =>
    normalizeSearch(`${lesson.title} ${lesson.description ?? ''}`).includes(
      normalizeSearch(search),
    ),
  )

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (!sectionId) return
    const input = {
      title: title.trim(),
      description: description.trim() || null,
      content: { version: 1, paragraphs: [] },
      video: null,
      solutionVideo: null,
      lessonType: 'LECTURE',
      estimatedMinutes: null,
      countsTowardProgress: true,
      sortOrder: lessons.data?.length ?? 0,
      status: 'DRAFT',
    }
    try {
      const lesson = await create.mutateAsync({
        parentId: sectionId,
        input,
        key: idempotency.get(input),
      })
      idempotency.clear()
      notifications.success('Đã tạo bài học. Thêm video và bài tập trong trang chỉnh sửa.')
      navigate(lessonPath(courseId, sectionId, lesson.id))
    } catch {
      /* Error is shown below the form. */
    }
  }

  function toggle(lesson: ApiAdminLesson) {
    const nextStatus = lesson.status === 'PUBLISHED' ? 'HIDDEN' : 'PUBLISHED'
    void update
      .mutateAsync({ id: lesson.id, status: nextStatus })
      .then(() =>
        notifications.success(nextStatus === 'HIDDEN' ? 'Đã ẩn bài học.' : 'Đã hiển thị bài học.'),
      )
      .catch(() => undefined)
  }

  function confirmDelete(lesson: ApiAdminLesson) {
    dialogs.confirm({
      title: `Xóa bài học “${lesson.title}”?`,
      description: 'Bài học sẽ được gỡ khỏi danh sách học viên. Tiến độ đã ghi nhận vẫn được giữ.',
      confirmLabel: 'Xóa bài học',
      destructive: true,
      onConfirm: async () => {
        try {
          await remove.mutateAsync(lesson.id)
          notifications.success('Đã xóa bài học.')
        } catch {
          /* Error is shown below the list. */
        }
      },
    })
  }

  return (
    <div className="grid gap-5">
      <AdminCard
        title="Chọn vị trí bài học"
        description="Chọn khóa học trước, sau đó chọn chương. Danh sách bài học sẽ hiện ra để bạn tìm và chỉnh sửa."
      >
        {courses.isPending ? (
          <AdminLoading label="Đang tải khóa học" />
        ) : courses.isError ? (
          <AdminLoadError error={courses.error} retry={() => void courses.refetch()} />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            <AdminSearchSelect
              label="1. Khóa học"
              value={courseId}
              onChange={(value) => {
                setCourseId(value)
                setSectionId('')
                setSearch('')
              }}
              options={(courses.data ?? []).map((course) => ({
                value: course.id,
                label: course.title,
                description: `${course.code} · ${course.level}`,
              }))}
            />
            <AdminSearchSelect
              label="2. Chương"
              value={sectionId}
              onChange={(value) => {
                setSectionId(value)
                setSearch('')
              }}
              disabled={!courseId || sections.isPending}
              options={(sections.data ?? []).map((section) => ({
                value: section.id,
                label: section.title,
                description: `Chương ${section.sortOrder + 1}`,
              }))}
            />
          </div>
        )}
        {sections.isError && (
          <AdminLoadError error={sections.error} retry={() => void sections.refetch()} />
        )}
      </AdminCard>

      {sectionId && (
        <>
          <AdminCard
            title={`Bài học · ${selectedSection?.title ?? ''}`}
            description={`Khóa học: ${selectedCourse?.title ?? '—'}. Chọn “Sửa bài học” để thêm video, bài tập và nội dung.`}
          >
            <SearchInput
              label="Tìm bài học"
              value={search}
              onChange={setSearch}
              placeholder="Nhập tên bài học"
            />
            {lessons.isPending ? (
              <AdminLoading label="Đang tải bài học" />
            ) : lessons.isError ? (
              <AdminLoadError error={lessons.error} retry={() => void lessons.refetch()} />
            ) : filtered.length ? (
              <div className="grid gap-2">
                {filtered.map((lesson) => (
                  <ContentRow
                    key={lesson.id}
                    title={lesson.title}
                    description={`Bài ${lesson.sortOrder + 1} · ${lesson.estimatedMinutes ? `${lesson.estimatedMinutes} phút` : 'chưa đặt thời lượng'}`}
                    status={lesson.status}
                    editHref={lessonPath(courseId, sectionId, lesson.id)}
                    editLabel="Sửa bài học"
                    onToggle={() => toggle(lesson)}
                    onDelete={() => confirmDelete(lesson)}
                    busy={update.isPending || remove.isPending}
                  />
                ))}
              </div>
            ) : (
              <EmptyState
                title={search ? 'Không tìm thấy bài học' : 'Chương chưa có bài học'}
                description={
                  search ? 'Thử một tên khác.' : 'Tạo bài học đầu tiên ở biểu mẫu bên dưới.'
                }
              />
            )}
            <AdminFeedback error={update.error ?? remove.error} />
          </AdminCard>

          <AdminCard title="Tạo bài học mới">
            <p className="text-sm leading-6 text-ink-secondary">
              Sau khi tạo, bạn sẽ thêm video bài giảng, bài tập và video chữa bài ở một màn hình duy
              nhất.
            </p>
            <form className="grid gap-3" onSubmit={(event) => void submit(event)}>
              <AdminField label="Tên bài học" value={title} onChange={setTitle} required />
              <AdminTextArea
                label="Mô tả nội dung"
                value={description}
                onChange={setDescription}
                rows={2}
              />
              <AdminFeedback error={create.error} />
              <Button
                type="submit"
                loading={create.isPending}
                startIcon={<Plus aria-hidden="true" className="size-4" />}
              >
                Tạo bài học
              </Button>
            </form>
          </AdminCard>
        </>
      )}
    </div>
  )
}

export function AdminExercisesPage() {
  const dialogs = useDialogs()
  const notifications = useNotifications()
  const idempotency = useStableIdempotencyKey()
  const courses = useCourseOptions()
  const [courseId, setCourseId] = useState('')
  const [sectionId, setSectionId] = useState('')
  const [lessonId, setLessonId] = useState('')
  const [search, setSearch] = useState('')
  const [title, setTitle] = useState('')
  const [instructions, setInstructions] = useState('')
  const [exerciseType, setExerciseType] = useState<'FILE_BASED' | 'QUIZ'>('FILE_BASED')
  const [pdf, setPdf] = useState<ExercisePdfSelection | null>(null)
  const [pdfProgress, setPdfProgress] = useState<number | null>(null)
  const [isSavingExercise, setIsSavingExercise] = useState(false)
  const sections = useSectionOptions(courseId)
  const lessons = useLessonOptions(sectionId)
  const exercises = useQuery({
    queryKey: ['admin', 'content-exercise-options', lessonId],
    queryFn: () =>
      loadAllPages((page) => adminRepository.listExercises(lessonId, { page, pageSize: 100 })),
    enabled: Boolean(lessonId),
    retry: false,
  })
  const create = useAdminMutation(
    ({ parentId, input, key }: { parentId: string; input: Record<string, unknown>; key: string }) =>
      adminRepository.createExercise(parentId, input, key),
  )
  const update = useAdminMutation(
    ({ id, status }: { id: string; status: ApiAdminExercise['status'] }) =>
      adminRepository.updateExercise(id, { status }),
  )
  const remove = useAdminMutation((id: string) => adminRepository.deleteExercise(id))
  const selectedCourse = courses.data?.find((course) => course.id === courseId)
  const selectedSection = sections.data?.find((section) => section.id === sectionId)
  const selectedLesson = lessons.data?.find((lesson) => lesson.id === lessonId)
  const filtered = (exercises.data ?? []).filter((exercise) =>
    normalizeSearch(`${exercise.title} ${exercise.instructions}`).includes(normalizeSearch(search)),
  )
  const navigate = useNavigate()

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (!lessonId) return
    const input = {
      title: title.trim(),
      description: null,
      instructions: instructions.trim(),
      exerciseType,
      completionMode: exerciseType === 'QUIZ' ? 'QUIZ_SUBMISSION' : 'MANUAL',
      isRequired: true,
      sortOrder: exercises.data?.length ?? 0,
      status: 'DRAFT',
    }
    setIsSavingExercise(true)
    try {
      const exercise = await create.mutateAsync({
        parentId: lessonId,
        input,
        key: idempotency.get(input),
      })
      idempotency.clear()
      if (exercise.exerciseType === 'FILE_BASED' && pdf) {
        try {
          await uploadAndAttachExercisePdf(exercise.id, pdf, setPdfProgress)
          notifications.success('Đã tạo bài tập và gắn PDF.')
        } catch (error) {
          notifications.error(
            'Bài tập đã tạo nhưng chưa gắn được PDF',
            error instanceof Error
              ? `${error.message} Bạn có thể mở bài tập để thử lại.`
              : 'Mở bài tập để thử tải hoặc chọn PDF lại.',
          )
        }
      } else {
        notifications.success('Đã tạo bài tập.')
      }
      setTitle('')
      setInstructions('')
      setPdf(null)
      if (exercise.exerciseType === 'QUIZ')
        navigate(exercisePath(courseId, sectionId, lessonId, exercise.id))
    } catch {
      /* Error is shown below the form. */
    } finally {
      setIsSavingExercise(false)
    }
  }

  function toggle(exercise: ApiAdminExercise) {
    const nextStatus = exercise.status === 'PUBLISHED' ? 'HIDDEN' : 'PUBLISHED'
    void update
      .mutateAsync({ id: exercise.id, status: nextStatus })
      .then(() =>
        notifications.success(nextStatus === 'HIDDEN' ? 'Đã ẩn bài tập.' : 'Đã hiển thị bài tập.'),
      )
      .catch(() => undefined)
  }

  function confirmDelete(exercise: ApiAdminExercise) {
    dialogs.confirm({
      title: `Xóa bài tập “${exercise.title}”?`,
      description: 'Bài tập sẽ được gỡ khỏi bài học. Lịch sử học viên đã làm vẫn được giữ.',
      confirmLabel: 'Xóa bài tập',
      destructive: true,
      onConfirm: async () => {
        try {
          await remove.mutateAsync(exercise.id)
          notifications.success('Đã xóa bài tập.')
        } catch {
          /* Error is shown below the list. */
        }
      },
    })
  }

  return (
    <div className="grid gap-5">
      <AdminCard
        title="Chọn vị trí bài tập"
        description="Chọn khóa học, chương rồi bài học. Sau đó bạn có thể tìm, tạo và chỉnh sửa bài tập."
      >
        {courses.isPending ? (
          <AdminLoading label="Đang tải khóa học" />
        ) : courses.isError ? (
          <AdminLoadError error={courses.error} retry={() => void courses.refetch()} />
        ) : (
          <div className="grid gap-3 sm:grid-cols-3">
            <AdminSearchSelect
              label="1. Khóa học"
              value={courseId}
              onChange={(value) => {
                setCourseId(value)
                setSectionId('')
                setLessonId('')
                setSearch('')
              }}
              options={(courses.data ?? []).map((course) => ({
                value: course.id,
                label: course.title,
                description: `${course.code} · ${course.level}`,
              }))}
            />
            <AdminSearchSelect
              label="2. Chương"
              value={sectionId}
              onChange={(value) => {
                setSectionId(value)
                setLessonId('')
                setSearch('')
              }}
              disabled={!courseId || sections.isPending}
              options={(sections.data ?? []).map((section) => ({
                value: section.id,
                label: section.title,
                description: `Chương ${section.sortOrder + 1}`,
              }))}
            />
            <AdminSearchSelect
              label="3. Bài học"
              value={lessonId}
              onChange={(value) => {
                setLessonId(value)
                setSearch('')
              }}
              disabled={!sectionId || lessons.isPending}
              options={(lessons.data ?? []).map((lesson) => ({
                value: lesson.id,
                label: lesson.title,
                description: `Bài ${lesson.sortOrder + 1}`,
              }))}
            />
          </div>
        )}
        {sections.isError && (
          <AdminLoadError error={sections.error} retry={() => void sections.refetch()} />
        )}
        {lessons.isError && (
          <AdminLoadError error={lessons.error} retry={() => void lessons.refetch()} />
        )}
      </AdminCard>

      {lessonId && (
        <>
          <AdminCard
            title={`Bài tập · ${selectedLesson?.title ?? ''}`}
            description={`${selectedCourse?.title ?? ''} · ${selectedSection?.title ?? ''}. Tìm bài tập theo tên hoặc hướng dẫn.`}
          >
            <SearchInput
              label="Tìm bài tập"
              value={search}
              onChange={setSearch}
              placeholder="Nhập tên bài tập"
            />
            {exercises.isPending ? (
              <AdminLoading label="Đang tải bài tập" />
            ) : exercises.isError ? (
              <AdminLoadError error={exercises.error} retry={() => void exercises.refetch()} />
            ) : filtered.length ? (
              <div className="grid gap-2">
                {filtered.map((exercise) => (
                  <ContentRow
                    key={exercise.id}
                    title={exercise.title}
                    description={
                      exercise.exerciseType === 'FILE_BASED' ? 'Bài tập PDF' : 'Trắc nghiệm'
                    }
                    status={exercise.status}
                    editHref={exercisePath(courseId, sectionId, lessonId, exercise.id)}
                    editLabel="Sửa bài tập"
                    onToggle={() => toggle(exercise)}
                    onDelete={() => confirmDelete(exercise)}
                    busy={update.isPending || remove.isPending}
                  />
                ))}
              </div>
            ) : (
              <EmptyState
                title={search ? 'Không tìm thấy bài tập' : 'Bài học chưa có bài tập'}
                description={
                  search ? 'Thử một tên khác.' : 'Tạo bài tập đầu tiên ở biểu mẫu bên dưới.'
                }
              />
            )}
            <AdminFeedback error={update.error ?? remove.error} />
          </AdminCard>

          <AdminCard title="Tạo bài tập mới">
            <p className="text-sm leading-6 text-ink-secondary">
              Bài tập PDF có thể tải tệp từ máy hoặc chọn PDF đã có. Tệp sẽ được tải và gắn tự động
              khi tạo bài.
            </p>
            <form className="grid gap-3" onSubmit={(event) => void submit(event)}>
              <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_14rem]">
                <AdminField label="Tên bài tập" value={title} onChange={setTitle} required />
                <AdminSelect
                  label="Loại bài tập"
                  value={exerciseType}
                  onChange={(value) => {
                    setExerciseType(value as typeof exerciseType)
                    if (value === 'QUIZ') setPdf(null)
                  }}
                  options={[
                    { value: 'FILE_BASED', label: 'Bài tập PDF' },
                    { value: 'QUIZ', label: 'Trắc nghiệm' },
                  ]}
                />
              </div>
              <AdminTextArea
                label="Hướng dẫn cho học viên"
                value={instructions}
                onChange={setInstructions}
                rows={3}
                required
                placeholder="Ví dụ: Mở tệp, hoàn thành bài rồi đánh dấu đã làm."
              />
              {exerciseType === 'FILE_BASED' && (
                <AdminExercisePdfPicker
                  value={pdf}
                  onChange={setPdf}
                  disabled={isSavingExercise || pdfProgress !== null}
                />
              )}
              {pdfProgress !== null && (
                <div className="rounded-xl bg-surface-muted p-3 text-sm" role="status">
                  <p>Đang tải PDF lên {pdfProgress}%</p>
                  <progress className="mt-2 block w-full" value={pdfProgress} max={100} />
                </div>
              )}
              <AdminFeedback error={create.error} />
              <Button
                type="submit"
                loading={isSavingExercise || create.isPending || pdfProgress !== null}
                startIcon={<Plus aria-hidden="true" className="size-4" />}
              >
                {exerciseType === 'QUIZ' ? 'Tạo bài tập và mở câu hỏi' : 'Tạo bài tập'}
              </Button>
            </form>
          </AdminCard>
        </>
      )}
    </div>
  )
}

function LessonYouTubeField({
  label,
  value,
  onChange,
  title,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  title: string
}) {
  const videoId = parseYouTubeVideoId(value)
  const invalid = Boolean(value.trim()) && !videoId
  return (
    <div className="grid min-w-0 gap-2">
      <label className="grid gap-1.5 text-sm font-semibold text-ink-primary">
        <span>{label}</span>
        <input
          className="min-h-11 w-full rounded-xl border border-border-subtle bg-white px-3 font-normal outline-none focus-visible:ring-2 focus-visible:ring-action-primary"
          type="text"
          inputMode="url"
          autoComplete="off"
          spellCheck={false}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder="Dán liên kết video YouTube"
          aria-invalid={invalid}
        />
      </label>
      {invalid ? (
        <p role="alert" className="text-sm text-danger-foreground">
          Liên kết chưa đúng. Hãy kiểm tra lại video YouTube.
        </p>
      ) : (
        <p className="text-xs leading-5 text-ink-secondary">
          Dán liên kết để xem trước video ngay bên dưới.
        </p>
      )}
      {videoId && (
        <YouTubeLessonPlayer
          key={videoId}
          eager
          video={{ provider: 'YOUTUBE', videoId }}
          title={title}
        />
      )}
    </div>
  )
}

export function AdminLessonDetailPage({
  courseId,
  sectionId,
  lessonId,
}: {
  courseId: string
  sectionId: string
  lessonId: string
}) {
  const dialogs = useDialogs()
  const notifications = useNotifications()
  const navigate = useNavigate()
  const idempotency = useStableIdempotencyKey()
  const courses = useCourseOptions()
  const sections = useSectionOptions(courseId)
  const lessons = useLessonOptions(sectionId)
  const exercises = useQuery({
    queryKey: ['admin', 'lesson-editor-exercises', lessonId],
    queryFn: () =>
      loadAllPages((page) => adminRepository.listExercises(lessonId, { page, pageSize: 100 })),
    retry: false,
  })
  const update = useAdminMutation(({ input }: { input: Record<string, unknown> }) =>
    adminRepository.updateLesson(lessonId, input),
  )
  const createExercise = useAdminMutation(
    ({ input, key }: { input: Record<string, unknown>; key: string }) =>
      adminRepository.createExercise(lessonId, input, key),
  )
  const remove = useAdminMutation(() => adminRepository.deleteLesson(lessonId))
  const course = courses.data?.find((item) => item.id === courseId)
  const section = sections.data?.find((item) => item.id === sectionId)
  const lesson = lessons.data?.find((item) => item.id === lessonId)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [paragraphs, setParagraphs] = useState('')
  const [lectureVideoUrl, setLectureVideoUrl] = useState('')
  const [solutionVideoUrl, setSolutionVideoUrl] = useState('')
  const [lessonType, setLessonType] = useState<'LECTURE' | 'PRACTICE'>('LECTURE')
  const [estimatedMinutes, setEstimatedMinutes] = useState('')
  const [sortOrder, setSortOrder] = useState(0)
  const [countsTowardProgress, setCountsTowardProgress] = useState(true)
  const [status, setStatus] = useState<'DRAFT' | 'PUBLISHED' | 'HIDDEN'>('DRAFT')
  const [newExercise, setNewExercise] = useState('')
  const [newExerciseInstructions, setNewExerciseInstructions] = useState('')
  const [exerciseType, setExerciseType] = useState<'FILE_BASED' | 'QUIZ'>('FILE_BASED')
  const [exercisePdf, setExercisePdf] = useState<ExercisePdfSelection | null>(null)
  const [exercisePdfProgress, setExercisePdfProgress] = useState<number | null>(null)
  const [isAddingExercise, setIsAddingExercise] = useState(false)
  const [exerciseError, setExerciseError] = useState('')
  const [validation, setValidation] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    if (!lesson) return
    // Editors initialize a local draft from the server-owned lesson.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTitle(lesson.title)
    setDescription(lesson.description ?? '')
    setParagraphs(lesson.content?.paragraphs.join('\n\n') ?? '')
    setLectureVideoUrl(
      lesson.video?.provider === 'YOUTUBE'
        ? `https://www.youtube.com/watch?v=${lesson.video.videoId}`
        : '',
    )
    setSolutionVideoUrl(
      lesson.solutionVideo?.provider === 'YOUTUBE'
        ? `https://www.youtube.com/watch?v=${lesson.solutionVideo.videoId}`
        : '',
    )
    setLessonType(lesson.lessonType)
    setEstimatedMinutes(lesson.estimatedMinutes == null ? '' : String(lesson.estimatedMinutes))
    setSortOrder(lesson.sortOrder)
    setCountsTowardProgress(lesson.countsTowardProgress)
    setStatus(lesson.status)
  }, [lesson])

  if (courses.isPending || sections.isPending || lessons.isPending || exercises.isPending)
    return <AdminLoading />
  if (courses.isError || sections.isError || lessons.isError || exercises.isError || !lesson)
    return (
      <AdminLoadError
        error={
          courses.error ??
          sections.error ??
          lessons.error ??
          exercises.error ??
          new Error('Không tìm thấy bài học.')
        }
        retry={() => {
          void courses.refetch()
          void sections.refetch()
          void lessons.refetch()
          void exercises.refetch()
        }}
      />
    )
  const currentLesson = lesson

  async function saveLesson(event: FormEvent) {
    event.preventDefault()
    setValidation('')
    setSuccess('')
    const lectureVideoId = parseYouTubeVideoId(lectureVideoUrl)
    const solutionVideoId = parseYouTubeVideoId(solutionVideoUrl)
    if (
      (lectureVideoUrl.trim() && !lectureVideoId) ||
      (solutionVideoUrl.trim() && !solutionVideoId)
    ) {
      setValidation('Hãy kiểm tra lại liên kết YouTube trước khi lưu.')
      return
    }
    const content = {
      version: 1,
      paragraphs: paragraphs
        .split(/\n\s*\n/)
        .map((part) => part.trim())
        .filter(Boolean),
    }
    try {
      await update.mutateAsync({
        input: {
          title: title.trim(),
          description: description.trim() || null,
          content,
          video: lectureVideoId ? { provider: 'YOUTUBE', videoId: lectureVideoId } : null,
          solutionVideo: solutionVideoId ? { provider: 'YOUTUBE', videoId: solutionVideoId } : null,
          lessonType,
          estimatedMinutes: estimatedMinutes ? Number(estimatedMinutes) : null,
          countsTowardProgress,
          status,
          sortOrder,
        },
      })
      setSuccess('Đã lưu bài học.')
    } catch {
      /* Error is shown below the form. */
    }
  }

  async function addExercise() {
    setExerciseError('')
    if (!newExercise.trim() || !newExerciseInstructions.trim()) {
      setExerciseError('Nhập tên bài tập và hướng dẫn cho học viên.')
      return
    }
    const input = {
      title: newExercise.trim(),
      description: null,
      instructions: newExerciseInstructions.trim(),
      exerciseType,
      completionMode: exerciseType === 'QUIZ' ? 'QUIZ_SUBMISSION' : 'MANUAL',
      isRequired: true,
      sortOrder: exercises.data?.length ?? 0,
      status: 'DRAFT',
    }
    setIsAddingExercise(true)
    try {
      const exercise = await createExercise.mutateAsync({
        input,
        key: idempotency.get(input),
      })
      idempotency.clear()
      setNewExercise('')
      setNewExerciseInstructions('')
      if (exercise.exerciseType === 'FILE_BASED' && exercisePdf) {
        try {
          await uploadAndAttachExercisePdf(exercise.id, exercisePdf, setExercisePdfProgress)
          notifications.success('Đã tạo bài tập và gắn PDF.')
        } catch (error) {
          setExerciseError(
            error instanceof Error
              ? `Bài tập đã được tạo nhưng PDF chưa gắn được. ${error.message} Hãy mở bài tập để thử lại.`
              : 'Bài tập đã được tạo nhưng PDF chưa gắn được. Hãy mở bài tập để thử lại.',
          )
          notifications.error('Chưa gắn được PDF', 'Bài tập đã tạo. Mở phần chỉnh sửa để thử lại.')
        }
      } else {
        notifications.success('Đã tạo bài tập.')
      }
      if (exercise.exerciseType === 'FILE_BASED') setExercisePdf(null)
      if (exercise.exerciseType === 'QUIZ')
        navigate(exercisePath(courseId, sectionId, lessonId, exercise.id))
    } catch {
      /* Error is shown below the form. */
    } finally {
      setIsAddingExercise(false)
    }
  }

  function confirmDelete() {
    dialogs.confirm({
      title: `Xóa bài học “${currentLesson.title}”?`,
      description: 'Bài học sẽ được gỡ khỏi khóa học. Lịch sử học viên đã ghi nhận vẫn được giữ.',
      confirmLabel: 'Xóa bài học',
      destructive: true,
      onConfirm: async () => {
        try {
          await remove.mutateAsync()
          notifications.success('Đã xóa bài học.')
          navigate('/admin/lessons')
        } catch {
          /* Error is shown below the form. */
        }
      },
    })
  }

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-surface-muted px-4 py-3 text-sm">
        <p className="min-w-0 truncate text-ink-secondary">
          <span className="font-semibold text-ink-primary">{course?.title}</span>
          <ChevronRight aria-hidden="true" className="mx-1 inline size-4" />
          <span>{section?.title}</span>
          <ChevronRight aria-hidden="true" className="mx-1 inline size-4" />
          <span className="font-semibold text-ink-primary">{lesson.title}</span>
        </p>
        <Link
          to="/admin/lessons"
          className="inline-flex items-center gap-1 font-semibold text-action-primary"
        >
          <ArrowLeft aria-hidden="true" className="size-4" />
          Danh sách bài học
        </Link>
      </div>

      <form className="grid gap-4" onSubmit={(event) => void saveLesson(event)}>
        <AdminCard
          title="Thông tin bài học"
          description="Đặt tên rõ ràng và ghi ngắn gọn học viên sẽ học được gì trong bài này."
        >
          <AdminField label="Tên bài học" value={title} onChange={setTitle} required />
          <AdminTextArea
            label="Mô tả nội dung bài học"
            value={description}
            onChange={setDescription}
            rows={3}
            placeholder="Tóm tắt nội dung và mục tiêu của bài học"
          />
        </AdminCard>

        <AdminCard
          title="Video bài giảng"
          description="Dán liên kết YouTube. Bạn sẽ thấy bản xem trước ngay khi nhập liên kết."
        >
          <LessonYouTubeField
            label="Liên kết video bài giảng"
            value={lectureVideoUrl}
            onChange={setLectureVideoUrl}
            title={`Bài giảng · ${title || lesson.title}`}
          />
        </AdminCard>

        <AdminCard
          title="Bài tập của bài học"
          description="Tạo bài tập PDF hoặc trắc nghiệm ngay tại đây. Với bài tập PDF, tải tệp lên hoặc chọn tệp có sẵn; hệ thống sẽ tự gắn vào bài tập."
        >
          {exercises.data.length ? (
            <div className="grid gap-2">
              {exercises.data.map((exercise) => (
                <div
                  key={exercise.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border-subtle bg-white p-3"
                >
                  <Link
                    to={exercisePath(courseId, sectionId, lessonId, exercise.id)}
                    className="min-w-0 rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-action-primary"
                  >
                    <strong className="block truncate">{exercise.title}</strong>
                    <span className="text-xs text-ink-secondary">
                      {exercise.exerciseType === 'FILE_BASED' ? 'Bài tập PDF' : 'Trắc nghiệm'} ·{' '}
                      {statusLabel(exercise.status)}
                    </span>
                  </Link>
                  <Link
                    to={exercisePath(courseId, sectionId, lessonId, exercise.id)}
                    className="text-sm font-semibold text-action-primary"
                  >
                    Chỉnh sửa <ExternalLink aria-hidden="true" className="inline size-4" />
                  </Link>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              title="Chưa có bài tập"
              description="Thêm bài tập ở biểu mẫu ngay bên dưới."
            />
          )}
          <div className="grid gap-3 border-t border-border-subtle pt-4">
            <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_14rem]">
              <AdminField
                label="Tên bài tập"
                value={newExercise}
                onChange={setNewExercise}
                placeholder="Ví dụ: Bài tập giới thiệu bản thân"
              />
              <AdminSelect
                label="Loại bài tập"
                value={exerciseType}
                onChange={(value) => {
                  setExerciseType(value as typeof exerciseType)
                  setExerciseError('')
                  if (value === 'QUIZ') setExercisePdf(null)
                }}
                options={[
                  { value: 'FILE_BASED', label: 'Bài tập PDF' },
                  { value: 'QUIZ', label: 'Trắc nghiệm' },
                ]}
              />
            </div>
            <AdminTextArea
              label="Hướng dẫn cho học viên"
              value={newExerciseInstructions}
              onChange={setNewExerciseInstructions}
              rows={2}
              placeholder="Nêu rõ học viên cần làm gì"
            />
            {exerciseType === 'FILE_BASED' && (
              <AdminExercisePdfPicker
                value={exercisePdf}
                onChange={setExercisePdf}
                disabled={
                  isAddingExercise || createExercise.isPending || exercisePdfProgress !== null
                }
              />
            )}
            {exercisePdfProgress !== null && (
              <div className="rounded-xl bg-surface-muted p-3 text-sm" role="status">
                <p>Đang tải PDF lên {exercisePdfProgress}%</p>
                <progress className="mt-2 block w-full" value={exercisePdfProgress} max={100} />
              </div>
            )}
            {exerciseError && (
              <p
                role="alert"
                className="rounded-xl bg-danger-surface p-3 text-sm text-danger-foreground"
              >
                {exerciseError}
              </p>
            )}
            <AdminFeedback error={createExercise.error} />
            <Button
              type="button"
              loading={isAddingExercise || createExercise.isPending || exercisePdfProgress !== null}
              onClick={() => void addExercise()}
              startIcon={<Plus aria-hidden="true" className="size-4" />}
            >
              {exerciseType === 'QUIZ' ? 'Tạo bài tập và mở câu hỏi' : 'Tạo bài tập'}
            </Button>
          </div>
        </AdminCard>

        <AdminCard
          title="Video chữa bài"
          description="Thêm video để học viên đối chiếu cách làm. Có thể để trống nếu chưa có video."
        >
          <LessonYouTubeField
            label="Liên kết video chữa bài"
            value={solutionVideoUrl}
            onChange={setSolutionVideoUrl}
            title={`Video chữa bài · ${title || lesson.title}`}
          />
        </AdminCard>

        <AdminCard title="Thông tin bổ sung">
          <AdminTextArea
            label="Nội dung ghi chú cho học viên"
            value={paragraphs}
            onChange={setParagraphs}
            rows={5}
            placeholder="Mỗi đoạn cách nhau một dòng trống"
          />
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <AdminSelect
              label="Loại bài học"
              value={lessonType}
              onChange={(value) => setLessonType(value as typeof lessonType)}
              options={[
                { value: 'LECTURE', label: 'Bài giảng' },
                { value: 'PRACTICE', label: 'Luyện tập' },
              ]}
            />
            <AdminField
              label="Thời lượng (phút)"
              value={estimatedMinutes}
              onChange={setEstimatedMinutes}
              type="number"
              min={0}
              max={1440}
            />
            <AdminField
              label="Vị trí trong chương"
              value={String(sortOrder)}
              onChange={(value) => setSortOrder(Number(value))}
              type="number"
              min={0}
            />
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
          </div>
          <label className="flex min-h-10 items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={countsTowardProgress}
              onChange={(event) => setCountsTowardProgress(event.target.checked)}
            />
            Tính bài học này vào tiến độ khóa học
          </label>
          {validation && (
            <p
              role="alert"
              className="rounded-xl bg-danger-surface p-3 text-sm text-danger-foreground"
            >
              {validation}
            </p>
          )}
          <AdminFeedback error={update.error} success={success} />
          <div className="flex flex-wrap gap-2">
            <Button type="submit" loading={update.isPending}>
              Lưu thay đổi
            </Button>
            <Button
              type="button"
              variant="outline"
              loading={remove.isPending}
              onClick={confirmDelete}
              startIcon={<Trash2 aria-hidden="true" className="size-4" />}
            >
              Xóa bài học
            </Button>
          </div>
          <AdminFeedback error={remove.error} />
        </AdminCard>
      </form>
    </div>
  )
}

export function AdminCourseEditorPage({ courseId }: { courseId: string }) {
  const dialogs = useDialogs()
  const notifications = useNotifications()
  const navigate = useNavigate()
  const course = useQuery({
    queryKey: ['admin', 'course', courseId],
    queryFn: () => adminRepository.getCourse(courseId),
    retry: false,
  })
  const update = useAdminMutation((input: Record<string, unknown>) =>
    adminRepository.updateCourse(courseId, input),
  )
  const publish = useAdminMutation(() => adminRepository.publishCourse(courseId))
  const remove = useAdminMutation(() => adminRepository.deleteCourse(courseId))
  const [form, setForm] = useState<Partial<ApiAdminCourse>>({})
  const [success, setSuccess] = useState('')

  useEffect(() => {
    if (!course.data) return
    // Editors initialize a local draft from the server-owned course.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setForm(course.data)
  }, [course.data])

  if (course.isPending) return <AdminLoading />
  if (course.isError || !course.data)
    return (
      <AdminLoadError
        error={course.error ?? new Error('Không tìm thấy khóa học.')}
        retry={() => void course.refetch()}
      />
    )
  const currentCourse = course.data

  async function save(event: FormEvent) {
    event.preventDefault()
    setSuccess('')
    try {
      await update.mutateAsync({
        code: form.code,
        title: form.title,
        description: form.description,
        shortDescription: form.shortDescription,
        objectives: form.objectives ?? [],
        requirements: form.requirements ?? [],
        level: form.level,
        price: form.price,
        accessDurationMonths: form.accessDurationMonths,
        sortOrder: form.sortOrder,
      })
      setSuccess('Đã lưu thông tin khóa học.')
    } catch {
      /* Error is shown below the form. */
    }
  }

  function confirmDelete() {
    dialogs.confirm({
      title: `Xóa khóa học “${currentCourse.title}”?`,
      description: 'Khóa học sẽ được gỡ khỏi danh sách học viên. Lịch sử học tập vẫn được giữ lại.',
      confirmLabel: 'Xóa khóa học',
      destructive: true,
      onConfirm: async () => {
        try {
          await remove.mutateAsync()
          notifications.success('Đã xóa khóa học.')
          navigate('/admin/courses')
        } catch {
          /* Error is shown below the form. */
        }
      },
    })
  }

  async function changeVisibility() {
    try {
      if (currentCourse.status === 'PUBLISHED') {
        await update.mutateAsync({ status: 'ARCHIVED' })
        notifications.success('Đã ẩn khóa học.')
      } else {
        await publish.mutateAsync()
        notifications.success('Đã hiển thị khóa học.')
      }
    } catch {
      /* Error is shown below the status controls. */
    }
  }

  return (
    <div className="grid gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-surface-muted p-4">
        <p className="min-w-0">
          <span className="block font-semibold">{currentCourse.title}</span>
          <span className="text-sm text-ink-secondary">
            {currentCourse.code} · {statusLabel(currentCourse.status)}
          </span>
        </p>
        <Link
          to="/admin/courses"
          className="inline-flex items-center gap-1 text-sm font-semibold text-action-primary"
        >
          <ArrowLeft aria-hidden="true" className="size-4" />
          Danh sách khóa học
        </Link>
      </div>

      <AdminCard
        title="Thông tin khóa học"
        description="Tên, mô tả và học phí sẽ được học viên nhìn thấy khi xem khóa học."
      >
        <form className="grid gap-3" onSubmit={(event) => void save(event)}>
          <AdminField
            label="Tên khóa học"
            value={form.title ?? ''}
            onChange={(value) => setForm((old) => ({ ...old, title: value }))}
            required
          />
          <div className="grid gap-3 sm:grid-cols-2">
            <AdminField
              label="Mã khóa học"
              value={form.code ?? ''}
              onChange={(value) => setForm((old) => ({ ...old, code: value }))}
              required
            />
            <AdminField
              label="Cấp độ"
              value={form.level ?? ''}
              onChange={(value) => setForm((old) => ({ ...old, level: value }))}
              required
            />
            <AdminField
              label="Học phí (đồng)"
              value={form.price ?? ''}
              onChange={(value) => setForm((old) => ({ ...old, price: value }))}
              type="number"
              min={0}
              required
            />
            <AdminField
              label="Thời hạn học (tháng)"
              value={String(form.accessDurationMonths ?? '')}
              onChange={(value) =>
                setForm((old) => ({ ...old, accessDurationMonths: Number(value) }))
              }
              type="number"
              min={1}
              max={120}
              required
            />
          </div>
          <AdminField
            label="Mô tả ngắn"
            value={form.shortDescription ?? ''}
            onChange={(value) => setForm((old) => ({ ...old, shortDescription: value }))}
          />
          <AdminTextArea
            label="Mô tả khóa học"
            value={form.description ?? ''}
            onChange={(value) => setForm((old) => ({ ...old, description: value }))}
            rows={4}
          />
          <AdminTextArea
            label="Học viên sẽ đạt được gì? (mỗi ý một dòng)"
            value={(form.objectives ?? []).join('\n')}
            onChange={(value) =>
              setForm((old) => ({
                ...old,
                objectives: value
                  .split('\n')
                  .map((line) => line.trim())
                  .filter(Boolean),
              }))
            }
            rows={3}
          />
          <AdminTextArea
            label="Điều kiện đầu vào (mỗi ý một dòng)"
            value={(form.requirements ?? []).join('\n')}
            onChange={(value) =>
              setForm((old) => ({
                ...old,
                requirements: value
                  .split('\n')
                  .map((line) => line.trim())
                  .filter(Boolean),
              }))
            }
            rows={3}
          />
          <p className="rounded-xl bg-surface-muted p-3 text-sm leading-6 text-ink-secondary">
            Ảnh bìa khóa học sẽ được thêm sau khi hoàn tất cách lưu ảnh.
          </p>
          <AdminFeedback error={update.error} success={success} />
          <Button type="submit" loading={update.isPending}>
            Lưu thay đổi
          </Button>
        </form>
      </AdminCard>

      <AdminCard title="Hiển thị với học viên">
        <p className="text-sm leading-6 text-ink-secondary">
          {currentCourse.status === 'PUBLISHED'
            ? 'Khóa học hiện đang hiển thị. Ẩn khóa học sẽ tạm thời gỡ khóa khỏi danh sách mua.'
            : 'Khóa học hiện chưa hiển thị. Khi xuất bản, hệ thống sẽ kiểm tra nội dung trước.'}
        </p>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant={currentCourse.status === 'PUBLISHED' ? 'outline' : 'primary'}
            loading={update.isPending || publish.isPending}
            onClick={() => void changeVisibility()}
            startIcon={
              currentCourse.status === 'PUBLISHED' ? (
                <EyeOff aria-hidden="true" className="size-4" />
              ) : (
                <Eye aria-hidden="true" className="size-4" />
              )
            }
          >
            {currentCourse.status === 'PUBLISHED' ? 'Ẩn khóa học' : 'Hiển thị khóa học'}
          </Button>
          <Button
            type="button"
            variant="outline"
            loading={remove.isPending}
            onClick={confirmDelete}
          >
            <Trash2 aria-hidden="true" className="mr-2 size-4" />
            Xóa khóa học
          </Button>
        </div>
        <AdminFeedback error={update.error ?? publish.error ?? remove.error} />
      </AdminCard>
    </div>
  )
}

export function AdminSectionEditorPage({
  courseId,
  sectionId,
}: {
  courseId: string
  sectionId: string
}) {
  const dialogs = useDialogs()
  const notifications = useNotifications()
  const navigate = useNavigate()
  const courses = useCourseOptions()
  const sections = useSectionOptions(courseId)
  const update = useAdminMutation((input: Record<string, unknown>) =>
    adminRepository.updateSection(sectionId, input),
  )
  const remove = useAdminMutation(() => adminRepository.deleteSection(sectionId))
  const section = sections.data?.find((item) => item.id === sectionId)
  const course = courses.data?.find((item) => item.id === courseId)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [sectionType, setSectionType] = useState<'CHAPTER' | 'EXAM_PREP'>('CHAPTER')
  const [status, setStatus] = useState<ApiAdminSection['status']>('DRAFT')
  const [sortOrder, setSortOrder] = useState(0)
  const [success, setSuccess] = useState('')

  useEffect(() => {
    if (!section) return
    // Editors initialize a local draft from the server-owned chapter.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTitle(section.title)
    setDescription(section.description ?? '')
    setSectionType(section.sectionType)
    setStatus(section.status)
    setSortOrder(section.sortOrder)
  }, [section])

  if (courses.isPending || sections.isPending) return <AdminLoading />
  if (courses.isError || sections.isError || !section)
    return (
      <AdminLoadError
        error={courses.error ?? sections.error ?? new Error('Không tìm thấy chương.')}
        retry={() => {
          void courses.refetch()
          void sections.refetch()
        }}
      />
    )
  const currentSection = section

  async function save(event: FormEvent) {
    event.preventDefault()
    setSuccess('')
    try {
      await update.mutateAsync({
        title: title.trim(),
        description: description.trim() || null,
        sectionType,
        status,
        sortOrder,
      })
      setSuccess('Đã lưu chương.')
    } catch {
      /* Error is shown below the form. */
    }
  }

  function confirmDelete() {
    dialogs.confirm({
      title: `Xóa chương “${currentSection.title}”?`,
      description: 'Các bài học trong chương sẽ không còn hiển thị cho học viên.',
      confirmLabel: 'Xóa chương',
      destructive: true,
      onConfirm: async () => {
        try {
          await remove.mutateAsync()
          notifications.success('Đã xóa chương.')
          navigate('/admin/sections')
        } catch {
          /* Error is shown below the form. */
        }
      },
    })
  }

  return (
    <div className="grid gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-surface-muted p-4">
        <p>
          <span className="block font-semibold">{section.title}</span>
          <span className="text-sm text-ink-secondary">{course?.title}</span>
        </p>
        <Link
          to="/admin/sections"
          className="inline-flex items-center gap-1 text-sm font-semibold text-action-primary"
        >
          <ArrowLeft aria-hidden="true" className="size-4" />
          Danh sách chương
        </Link>
      </div>
      <AdminCard
        title="Thông tin chương"
        description="Tên và mô tả giúp học viên hiểu các bài học trong chương này nói về điều gì."
      >
        <form className="grid gap-3" onSubmit={(event) => void save(event)}>
          <AdminField label="Tên chương" value={title} onChange={setTitle} required />
          <AdminTextArea
            label="Mô tả ngắn"
            value={description}
            onChange={setDescription}
            rows={3}
          />
          <div className="grid gap-3 sm:grid-cols-3">
            <AdminSelect
              label="Nội dung chương"
              value={sectionType}
              onChange={(value) => setSectionType(value as typeof sectionType)}
              options={[
                { value: 'CHAPTER', label: 'Bài học' },
                { value: 'EXAM_PREP', label: 'Ôn tập' },
              ]}
            />
            <AdminField
              label="Vị trí trong khóa học"
              value={String(sortOrder)}
              onChange={(value) => setSortOrder(Number(value))}
              type="number"
              min={0}
            />
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
          </div>
          <AdminFeedback error={update.error} success={success} />
          <div className="flex flex-wrap gap-2">
            <Button type="submit" loading={update.isPending}>
              Lưu thay đổi
            </Button>
            <Button
              type="button"
              variant="outline"
              loading={remove.isPending}
              onClick={confirmDelete}
            >
              <Trash2 aria-hidden="true" className="mr-2 size-4" />
              Xóa chương
            </Button>
          </div>
          <AdminFeedback error={remove.error} />
        </form>
      </AdminCard>
    </div>
  )
}
