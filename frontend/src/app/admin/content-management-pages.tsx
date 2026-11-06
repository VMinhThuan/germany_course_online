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
import { BaseDialog } from '@/shared/ui/dialogs'
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
  AdminSortableTable,
  AdminSelect,
  AdminTextArea,
  type AdminTableColumn,
  useAdminMutation,
  useStableIdempotencyKey,
} from './shared'
import {
  AdminExerciseMediaPicker,
  uploadAndAttachExerciseMedia,
  type ExerciseMediaSelection,
} from './exercise-media-manager'
import { CourseBannerField, uploadCourseBanner } from './course-banner-field'

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

async function mapConcurrent<T, TResult>(
  items: readonly T[],
  limit: number,
  mapItem: (item: T) => Promise<TResult>,
) {
  const results = new Array<TResult>(items.length)
  let nextIndex = 0
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (nextIndex < items.length) {
        const index = nextIndex++
        results[index] = await mapItem(items[index]!)
      }
    }),
  )
  return results
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

type SectionManagementRow = { section: ApiAdminSection; course: ApiAdminCourse }
type LessonManagementRow = {
  lesson: ApiAdminLesson
  section: ApiAdminSection
  course: ApiAdminCourse
}
type ExerciseManagementRow = {
  exercise: ApiAdminExercise
  lesson: ApiAdminLesson
  section: ApiAdminSection
  course: ApiAdminCourse
}

function useAllSections(courses: ApiAdminCourse[] | undefined) {
  const courseIds = courses?.map((course) => course.id) ?? []
  return useQuery({
    queryKey: ['admin', 'content-all-sections', courseIds],
    queryFn: async () => {
      const sectionsByCourse = await mapConcurrent(courses ?? [], 6, async (course) => ({
        course,
        sections: await loadAllPages((page) =>
          adminRepository.listSections(course.id, { page, pageSize: 100 }),
        ),
      }))
      return sectionsByCourse.flatMap(({ course, sections }) =>
        sections.map((section) => ({ section, course })),
      )
    },
    enabled: Boolean(courses),
    retry: false,
  })
}

function useAllLessons(sections: SectionManagementRow[] | undefined) {
  const sectionIds = sections?.map(({ section }) => section.id) ?? []
  return useQuery({
    queryKey: ['admin', 'content-all-lessons', sectionIds],
    queryFn: async () => {
      const lessonsBySection = await mapConcurrent(sections ?? [], 6, async (parent) => ({
        parent,
        lessons: await loadAllPages((page) =>
          adminRepository.listLessons(parent.section.id, { page, pageSize: 100 }),
        ),
      }))
      return lessonsBySection.flatMap(({ parent, lessons }) =>
        lessons.map((lesson) => ({ lesson, ...parent })),
      )
    },
    enabled: Boolean(sections),
    retry: false,
  })
}

function useAllExercises(lessons: LessonManagementRow[] | undefined) {
  const lessonIds = lessons?.map(({ lesson }) => lesson.id) ?? []
  return useQuery({
    queryKey: ['admin', 'content-all-exercises', lessonIds],
    queryFn: async () => {
      const exercisesByLesson = await mapConcurrent(lessons ?? [], 6, async (parent) => ({
        parent,
        exercises: await loadAllPages((page) =>
          adminRepository.listExercises(parent.lesson.id, { page, pageSize: 100 }),
        ),
      }))
      return exercisesByLesson.flatMap(({ parent, exercises }) =>
        exercises.map((exercise) => ({ exercise, ...parent })),
      )
    },
    enabled: Boolean(lessons),
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

export function AdminSectionsPage() {
  const dialogs = useDialogs()
  const notifications = useNotifications()
  const idempotency = useStableIdempotencyKey()
  const courses = useCourseOptions()
  const [courseId, setCourseId] = useState('')
  const [search, setSearch] = useState('')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [createOpen, setCreateOpen] = useState(false)
  const sections = useAllSections(courses.data)
  const create = useAdminMutation(
    ({ parentId, input, key }: { parentId: string; input: Record<string, unknown>; key: string }) =>
      adminRepository.createSection(parentId, input, key),
  )
  const update = useAdminMutation(
    ({ id, status }: { id: string; status: ApiAdminSection['status'] }) =>
      adminRepository.updateSection(id, { status }),
  )
  const remove = useAdminMutation((id: string) => adminRepository.deleteSection(id))
  const filtered = (sections.data ?? []).filter((section) =>
    normalizeSearch(
      `${section.section.title} ${section.section.description ?? ''} ${section.course.title} ${section.course.code}`,
    ).includes(normalizeSearch(search)),
  )

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (!courseId) return
    const input = {
      title: title.trim(),
      description: description.trim() || null,
      sectionType: 'CHAPTER',
      sortOrder: sections.data?.filter((row) => row.section.courseId === courseId).length ?? 0,
      status: 'DRAFT',
    }
    try {
      await create.mutateAsync({ parentId: courseId, input, key: idempotency.get(input) })
      idempotency.clear()
      setTitle('')
      setDescription('')
      setCreateOpen(false)
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

  const columns: AdminTableColumn<SectionManagementRow>[] = [
    {
      key: 'title',
      label: 'Tên chương',
      sortValue: (row) => row.section.title,
      render: (row) => (
        <Link
          to={sectionPath(row.course.id, row.section.id)}
          className="font-semibold text-action-primary outline-none hover:underline focus-visible:ring-2 focus-visible:ring-action-primary"
        >
          {row.section.title}
        </Link>
      ),
    },
    {
      key: 'course',
      label: 'Khóa học',
      sortValue: (row) => row.course.title,
      render: (row) => (
        <span>
          <span className="block font-medium text-ink-primary">{row.course.title}</span>
          <span className="text-xs text-ink-secondary">{row.course.code}</span>
        </span>
      ),
    },
    {
      key: 'order',
      label: 'Thứ tự',
      sortValue: (row) => row.section.sortOrder,
      render: (row) => `Chương ${row.section.sortOrder + 1}`,
    },
    {
      key: 'status',
      label: 'Trạng thái',
      sortValue: (row) => statusLabel(row.section.status),
      render: (row) => <ContentStatus status={row.section.status} />,
    },
    {
      key: 'actions',
      label: 'Thao tác',
      className: 'text-right',
      render: (row) => (
        <div className="flex justify-end gap-2">
          <VisibilityButton
            status={row.section.status}
            onClick={() => toggle(row.section)}
            loading={update.isPending && update.variables?.id === row.section.id}
          />
          <Button
            type="button"
            size="sm"
            variant="outline"
            loading={remove.isPending && remove.variables === row.section.id}
            onClick={() => confirmDelete(row.section)}
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
        title="Danh sách chương"
        description="Các chương thuộc mọi khóa học. Dùng ô tìm kiếm hoặc nhấn tiêu đề cột để sắp xếp."
      >
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="w-full max-w-lg">
            <SearchInput
              label="Tìm chương hoặc khóa học"
              value={search}
              onChange={setSearch}
              placeholder="Nhập tên chương, tên hoặc mã khóa học"
            />
          </div>
          <Button
            type="button"
            disabled={!courses.data?.length}
            onClick={() => {
              setCourseId(courses.data?.[0]?.id ?? '')
              setCreateOpen(true)
            }}
            startIcon={<Plus aria-hidden="true" className="size-4" />}
          >
            Tạo chương
          </Button>
        </div>
        {courses.isPending || sections.isPending ? (
          <AdminLoading label="Đang tải chương" />
        ) : courses.isError ? (
          <AdminLoadError error={courses.error} retry={() => void courses.refetch()} />
        ) : sections.isError ? (
          <AdminLoadError error={sections.error} retry={() => void sections.refetch()} />
        ) : (
          <AdminSortableTable
            rows={filtered}
            columns={columns}
            rowKey={(row) => row.section.id}
            emptyContent={
              <EmptyState
                title={search ? 'Không tìm thấy chương' : 'Chưa có chương'}
                description={
                  search ? 'Thử từ khóa khác.' : 'Tạo chương đầu tiên bằng nút phía trên.'
                }
              />
            }
          />
        )}
        <AdminFeedback error={update.error ?? remove.error} />
      </AdminCard>

      <BaseDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        title="Tạo chương mới"
        description="Chọn khóa học chứa chương này rồi nhập tên. Chương mới sẽ được lưu ở trạng thái bản nháp."
        footer={
          <>
            <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>
              Hủy
            </Button>
            <Button type="submit" form="admin-create-section" loading={create.isPending}>
              Tạo chương
            </Button>
          </>
        }
      >
        <form
          id="admin-create-section"
          className="grid gap-3"
          onSubmit={(event) => void submit(event)}
        >
          {courses.isPending ? (
            <AdminLoading label="Đang tải khóa học" />
          ) : courses.isError ? (
            <AdminLoadError error={courses.error} retry={() => void courses.refetch()} />
          ) : courses.data?.length ? (
            <AdminSearchSelect
              label="Khóa học"
              value={courseId}
              onChange={setCourseId}
              options={(courses.data ?? []).map((course) => ({
                value: course.id,
                label: course.title,
                description: `${course.code} · ${course.level}`,
              }))}
            />
          ) : (
            <p className="rounded-xl bg-surface-muted p-3 text-sm leading-6 text-ink-secondary">
              Tạo một khóa học trước khi thêm chương.
            </p>
          )}
          <AdminField label="Tên chương" value={title} onChange={setTitle} required />
          <AdminTextArea
            label="Mô tả ngắn"
            value={description}
            onChange={setDescription}
            rows={2}
          />
          <AdminFeedback error={create.error} />
        </form>
      </BaseDialog>
    </div>
  )
}

export function AdminLessonsPage() {
  const dialogs = useDialogs()
  const notifications = useNotifications()
  const navigate = useNavigate()
  const courses = useCourseOptions()
  const [search, setSearch] = useState('')
  const sections = useAllSections(courses.data)
  const lessons = useAllLessons(sections.data)
  const update = useAdminMutation(
    ({ id, status }: { id: string; status: ApiAdminLesson['status'] }) =>
      adminRepository.updateLesson(id, { status }),
  )
  const remove = useAdminMutation((id: string) => adminRepository.deleteLesson(id))
  const filtered = (lessons.data ?? []).filter((row) =>
    normalizeSearch(
      `${row.lesson.title} ${row.lesson.description ?? ''} ${row.section.title} ${row.course.title} ${row.course.code}`,
    ).includes(normalizeSearch(search)),
  )

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

  const columns: AdminTableColumn<LessonManagementRow>[] = [
    {
      key: 'title',
      label: 'Tên bài học',
      sortValue: (row) => row.lesson.title,
      render: (row) => (
        <Link
          to={lessonPath(row.course.id, row.section.id, row.lesson.id)}
          className="font-semibold text-action-primary outline-none hover:underline focus-visible:ring-2 focus-visible:ring-action-primary"
        >
          {row.lesson.title}
        </Link>
      ),
    },
    {
      key: 'course',
      label: 'Khóa học',
      sortValue: (row) => row.course.title,
      render: (row) => row.course.title,
    },
    {
      key: 'section',
      label: 'Chương',
      sortValue: (row) => row.section.title,
      render: (row) => row.section.title,
    },
    {
      key: 'order',
      label: 'Vị trí',
      sortValue: (row) => row.lesson.sortOrder,
      render: (row) => `Bài ${row.lesson.sortOrder + 1}`,
    },
    {
      key: 'type',
      label: 'Loại',
      sortValue: (row) => (row.lesson.lessonType === 'LECTURE' ? 'Bài giảng' : 'Luyện tập'),
      render: (row) => (row.lesson.lessonType === 'LECTURE' ? 'Bài giảng' : 'Luyện tập'),
    },
    {
      key: 'status',
      label: 'Trạng thái',
      sortValue: (row) => statusLabel(row.lesson.status),
      render: (row) => <ContentStatus status={row.lesson.status} />,
    },
    {
      key: 'actions',
      label: 'Thao tác',
      className: 'text-right',
      render: (row) => (
        <div className="flex justify-end gap-2">
          <VisibilityButton
            status={row.lesson.status}
            onClick={() => toggle(row.lesson)}
            loading={update.isPending && update.variables?.id === row.lesson.id}
          />
          <Button
            type="button"
            size="sm"
            variant="outline"
            loading={remove.isPending && remove.variables === row.lesson.id}
            onClick={() => confirmDelete(row.lesson)}
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
        title="Danh sách bài học"
        description="Tất cả bài học trong hệ thống. Bạn có thể tìm, sắp xếp và mở bài học để chỉnh sửa."
      >
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="w-full max-w-lg">
            <SearchInput
              label="Tìm bài học"
              value={search}
              onChange={setSearch}
              placeholder="Nhập tên bài, chương hoặc khóa học"
            />
          </div>
          <Button
            type="button"
            onClick={() => navigate('/admin/lessons/new')}
            startIcon={<Plus aria-hidden="true" className="size-4" />}
          >
            Tạo bài học
          </Button>
        </div>
        {courses.isPending || sections.isPending || lessons.isPending ? (
          <AdminLoading label="Đang tải bài học" />
        ) : courses.isError ? (
          <AdminLoadError error={courses.error} retry={() => void courses.refetch()} />
        ) : sections.isError ? (
          <AdminLoadError error={sections.error} retry={() => void sections.refetch()} />
        ) : lessons.isError ? (
          <AdminLoadError error={lessons.error} retry={() => void lessons.refetch()} />
        ) : (
          <AdminSortableTable
            rows={filtered}
            columns={columns}
            rowKey={(row) => row.lesson.id}
            emptyContent={
              <EmptyState
                title={search ? 'Không tìm thấy bài học' : 'Chưa có bài học'}
                description={
                  search ? 'Thử từ khóa khác.' : 'Tạo bài học đầu tiên bằng nút phía trên.'
                }
              />
            }
          />
        )}
        <AdminFeedback error={update.error ?? remove.error} />
      </AdminCard>
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
  const [mediaSelections, setMediaSelections] = useState<ExerciseMediaSelection[]>([])
  const [mediaProgress, setMediaProgress] = useState<number | null>(null)
  const [isSavingExercise, setIsSavingExercise] = useState(false)
  const [createOpen, setCreateOpen] = useState(false)
  const [validation, setValidation] = useState('')
  const sections = useSectionOptions(courseId)
  const lessons = useLessonOptions(sectionId)
  const allSections = useAllSections(courses.data)
  const allLessons = useAllLessons(allSections.data)
  const exercises = useAllExercises(allLessons.data)
  const create = useAdminMutation(
    ({ parentId, input, key }: { parentId: string; input: Record<string, unknown>; key: string }) =>
      adminRepository.createExercise(parentId, input, key),
  )
  const update = useAdminMutation(
    ({ id, status }: { id: string; status: ApiAdminExercise['status'] }) =>
      adminRepository.updateExercise(id, { status }),
  )
  const remove = useAdminMutation((id: string) => adminRepository.deleteExercise(id))
  const filtered = (exercises.data ?? []).filter((row) =>
    normalizeSearch(
      `${row.exercise.title} ${row.exercise.instructions} ${row.lesson.title} ${row.section.title} ${row.course.title} ${row.course.code}`,
    ).includes(normalizeSearch(search)),
  )
  async function submit(event: FormEvent) {
    event.preventDefault()
    setValidation('')
    if (!courseId || !sectionId || !lessonId) {
      setValidation('Chọn khóa học, chương và bài học chứa bài tập này.')
      return
    }
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
      if (mediaSelections.length > 0) {
        try {
          await uploadAndAttachExerciseMedia(exercise.id, mediaSelections, setMediaProgress)
          notifications.success('Đã tạo bài tập và gắn tệp.')
        } catch (error) {
          notifications.error(
            'Bài tập đã tạo nhưng chưa gắn được tệp',
            error instanceof Error
              ? `${error.message} Bạn có thể mở bài tập để thử lại.`
              : 'Mở bài tập để thử tải hoặc chọn tệp lại.',
          )
        }
      } else {
        notifications.success('Đã tạo bài tập.')
      }
      setTitle('')
      setInstructions('')
      setMediaSelections([])
      setCourseId('')
      setSectionId('')
      setLessonId('')
      setCreateOpen(false)
      setExerciseType('FILE_BASED')
      setValidation('')
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

  const columns: AdminTableColumn<ExerciseManagementRow>[] = [
    {
      key: 'title',
      label: 'Tên bài tập',
      sortValue: (row) => row.exercise.title,
      render: (row) => (
        <Link
          to={exercisePath(row.course.id, row.section.id, row.lesson.id, row.exercise.id)}
          className="font-semibold text-action-primary outline-none hover:underline focus-visible:ring-2 focus-visible:ring-action-primary"
        >
          {row.exercise.title}
        </Link>
      ),
    },
    {
      key: 'course',
      label: 'Khóa học',
      sortValue: (row) => row.course.title,
      render: (row) => row.course.title,
    },
    {
      key: 'section',
      label: 'Chương',
      sortValue: (row) => row.section.title,
      render: (row) => row.section.title,
    },
    {
      key: 'lesson',
      label: 'Bài học',
      sortValue: (row) => row.lesson.title,
      render: (row) => row.lesson.title,
    },
    {
      key: 'type',
      label: 'Loại',
      sortValue: (row) =>
        row.exercise.exerciseType === 'FILE_BASED' ? 'Bài tập PDF' : 'Trắc nghiệm',
      render: (row) => (row.exercise.exerciseType === 'FILE_BASED' ? 'Bài tập PDF' : 'Trắc nghiệm'),
    },
    {
      key: 'status',
      label: 'Trạng thái',
      sortValue: (row) => statusLabel(row.exercise.status),
      render: (row) => <ContentStatus status={row.exercise.status} />,
    },
    {
      key: 'actions',
      label: 'Thao tác',
      className: 'text-right',
      render: (row) => (
        <div className="flex justify-end gap-2">
          <VisibilityButton
            status={row.exercise.status}
            onClick={() => toggle(row.exercise)}
            loading={update.isPending && update.variables?.id === row.exercise.id}
          />
          <Button
            type="button"
            size="sm"
            variant="outline"
            loading={remove.isPending && remove.variables === row.exercise.id}
            onClick={() => confirmDelete(row.exercise)}
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
        title="Danh sách bài tập"
        description="Tất cả bài tập trong hệ thống. Tên khóa học, chương và bài học giúp bạn nhận ra vị trí của từng bài."
      >
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="w-full max-w-lg">
            <SearchInput
              label="Tìm bài tập"
              value={search}
              onChange={setSearch}
              placeholder="Nhập tên bài tập, bài học hoặc khóa học"
            />
          </div>
          <Button
            type="button"
            onClick={() => setCreateOpen(true)}
            startIcon={<Plus aria-hidden="true" className="size-4" />}
          >
            Tạo bài tập
          </Button>
        </div>
        {courses.isPending ||
        allSections.isPending ||
        allLessons.isPending ||
        exercises.isPending ? (
          <AdminLoading label="Đang tải bài tập" />
        ) : courses.isError ? (
          <AdminLoadError error={courses.error} retry={() => void courses.refetch()} />
        ) : allSections.isError ? (
          <AdminLoadError error={allSections.error} retry={() => void allSections.refetch()} />
        ) : allLessons.isError ? (
          <AdminLoadError error={allLessons.error} retry={() => void allLessons.refetch()} />
        ) : exercises.isError ? (
          <AdminLoadError error={exercises.error} retry={() => void exercises.refetch()} />
        ) : (
          <AdminSortableTable
            rows={filtered}
            columns={columns}
            rowKey={(row) => row.exercise.id}
            emptyContent={
              <EmptyState
                title={search ? 'Không tìm thấy bài tập' : 'Chưa có bài tập'}
                description={
                  search ? 'Thử từ khóa khác.' : 'Tạo bài tập đầu tiên bằng nút phía trên.'
                }
              />
            }
          />
        )}
        <AdminFeedback error={update.error ?? remove.error} />
      </AdminCard>

      <BaseDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        title="Tạo bài tập mới"
        description="Chọn khóa học, chương và bài học để đặt bài tập đúng chỗ. Với bài tập PDF, có thể tải tệp hoặc chọn tệp đã có."
        footer={
          <>
            <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>
              Hủy
            </Button>
            <Button
              type="submit"
              form="admin-create-exercise"
              loading={isSavingExercise || create.isPending || mediaProgress !== null}
            >
              Tạo bài tập
            </Button>
          </>
        }
      >
        <form
          id="admin-create-exercise"
          className="grid gap-3"
          onSubmit={(event) => void submit(event)}
        >
          {courses.isPending ? (
            <AdminLoading label="Đang tải khóa học" />
          ) : courses.isError ? (
            <AdminLoadError error={courses.error} retry={() => void courses.refetch()} />
          ) : courses.data?.length ? (
            <AdminSearchSelect
              label="1. Khóa học"
              value={courseId}
              onChange={(value) => {
                setCourseId(value)
                setSectionId('')
                setLessonId('')
                setValidation('')
              }}
              options={(courses.data ?? []).map((course) => ({
                value: course.id,
                label: course.title,
                description: `${course.code} · ${course.level}`,
              }))}
            />
          ) : (
            <p className="rounded-xl bg-surface-muted p-3 text-sm leading-6 text-ink-secondary">
              Cần có khóa học, chương và bài học trước khi thêm bài tập.
            </p>
          )}
          <AdminSearchSelect
            label="2. Chương"
            value={sectionId}
            onChange={(value) => {
              setSectionId(value)
              setLessonId('')
              setValidation('')
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
              setValidation('')
            }}
            disabled={!sectionId || lessons.isPending}
            options={(lessons.data ?? []).map((lesson) => ({
              value: lesson.id,
              label: lesson.title,
              description: `Bài ${lesson.sortOrder + 1}`,
            }))}
          />
          {sections.isError && (
            <AdminLoadError error={sections.error} retry={() => void sections.refetch()} />
          )}
          {courseId && !sections.isPending && !sections.isError && !sections.data?.length && (
            <p className="text-sm leading-6 text-ink-secondary">Khóa học này chưa có chương.</p>
          )}
          {lessons.isError && (
            <AdminLoadError error={lessons.error} retry={() => void lessons.refetch()} />
          )}
          {sectionId && !lessons.isPending && !lessons.isError && !lessons.data?.length && (
            <p className="text-sm leading-6 text-ink-secondary">Chương này chưa có bài học.</p>
          )}
          <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_14rem]">
            <AdminField label="Tên bài tập" value={title} onChange={setTitle} required />
            <AdminSelect
              label="Loại bài tập"
              value={exerciseType}
              onChange={(value) => {
                setExerciseType(value as typeof exerciseType)
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
          <AdminExerciseMediaPicker
            value={mediaSelections}
            onChange={setMediaSelections}
            disabled={isSavingExercise || mediaProgress !== null}
          />
          {mediaProgress !== null && (
            <div className="rounded-xl bg-surface-muted p-3 text-sm" role="status">
              <p>Đang tải tệp lên {mediaProgress}%</p>
              <progress className="mt-2 block w-full" value={mediaProgress} max={100} />
            </div>
          )}
          {validation && (
            <p
              role="alert"
              className="rounded-xl bg-danger-surface p-3 text-sm text-danger-foreground"
            >
              {validation}
            </p>
          )}
          <AdminFeedback error={create.error} />
        </form>
      </BaseDialog>
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

export function AdminLessonCreatePage() {
  const courses = useCourseOptions()
  const [courseId, setCourseId] = useState('')
  const [sectionId, setSectionId] = useState('')
  const sections = useSectionOptions(courseId)
  const lessons = useLessonOptions(sectionId)
  const create = useAdminMutation(
    ({ parentId, input, key }: { parentId: string; input: Record<string, unknown>; key: string }) =>
      adminRepository.createLesson(parentId, input, key),
  )
  const createExercise = useAdminMutation(
    ({ parentId, input, key }: { parentId: string; input: Record<string, unknown>; key: string }) =>
      adminRepository.createExercise(parentId, input, key),
  )
  const idempotency = useStableIdempotencyKey()
  const notifications = useNotifications()
  const navigate = useNavigate()
  const course = courses.data?.find((item) => item.id === courseId)
  const section = sections.data?.find((item) => item.id === sectionId)
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
  const [exerciseMedia, setExerciseMedia] = useState<ExerciseMediaSelection[]>([])
  const [exerciseMediaProgress, setExerciseMediaProgress] = useState<number | null>(null)
  const [validation, setValidation] = useState('')

  useEffect(() => {
    // Keep the new lesson's default position after existing lessons in the selected chapter.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSortOrder(lessons.data?.length ?? 0)
  }, [lessons.data?.length])

  async function submit(event: FormEvent) {
    event.preventDefault()
    setValidation('')
    if (!courseId || !sectionId) {
      setValidation('Chọn khóa học và chương trước khi lưu bài học.')
      return
    }
    const lectureVideoId = parseYouTubeVideoId(lectureVideoUrl)
    const solutionVideoId = parseYouTubeVideoId(solutionVideoUrl)
    if (
      (lectureVideoUrl.trim() && !lectureVideoId) ||
      (solutionVideoUrl.trim() && !solutionVideoId)
    ) {
      setValidation('Hãy kiểm tra lại liên kết YouTube trước khi lưu.')
      return
    }
    if (Boolean(newExercise.trim()) !== Boolean(newExerciseInstructions.trim())) {
      setValidation(
        'Để thêm bài tập cùng lúc, hãy nhập cả tên và hướng dẫn. Bạn cũng có thể thêm bài tập sau khi tạo bài học.',
      )
      return
    }
    const input = {
      title: title.trim(),
      description: description.trim() || null,
      content: {
        version: 1,
        paragraphs: paragraphs
          .split(/\n\s*\n/)
          .map((part) => part.trim())
          .filter(Boolean),
      },
      video: lectureVideoId ? { provider: 'YOUTUBE', videoId: lectureVideoId } : null,
      solutionVideo: solutionVideoId ? { provider: 'YOUTUBE', videoId: solutionVideoId } : null,
      lessonType,
      estimatedMinutes: estimatedMinutes ? Number(estimatedMinutes) : null,
      countsTowardProgress,
      status,
      sortOrder,
    }
    try {
      const lesson = await create.mutateAsync({
        parentId: sectionId,
        input,
        key: idempotency.get(input),
      })
      idempotency.clear()
      notifications.success('Đã tạo bài học.')
      if (newExercise.trim() && newExerciseInstructions.trim()) {
        const exerciseInput = {
          title: newExercise.trim(),
          description: null,
          instructions: newExerciseInstructions.trim(),
          exerciseType,
          completionMode: exerciseType === 'QUIZ' ? 'QUIZ_SUBMISSION' : 'MANUAL',
          isRequired: true,
          sortOrder: 0,
          status: 'DRAFT',
        }
        try {
          const exercise = await createExercise.mutateAsync({
            parentId: lesson.id,
            input: exerciseInput,
            key: idempotency.get(exerciseInput),
          })
          idempotency.clear()
          if (exerciseMedia.length > 0) {
            try {
              await uploadAndAttachExerciseMedia(
                exercise.id,
                exerciseMedia,
                setExerciseMediaProgress,
              )
              notifications.success('Đã tạo bài tập và gắn tệp.')
            } catch (error) {
              notifications.error(
                'Bài học đã tạo nhưng chưa gắn được tệp',
                error instanceof Error
                  ? `${error.message} Bạn có thể mở bài học để thử lại.`
                  : 'Mở bài học để thử tải hoặc chọn tệp lại.',
              )
            }
          } else {
            notifications.success('Đã tạo bài tập.')
          }
          if (exercise.exerciseType === 'QUIZ') {
            navigate(exercisePath(courseId, sectionId, lesson.id, exercise.id))
            return
          }
        } catch {
          notifications.error(
            'Bài học đã tạo nhưng bài tập chưa được thêm',
            'Mở bài học vừa tạo để thêm bài tập sau.',
          )
        }
      }
      navigate(lessonPath(courseId, sectionId, lesson.id))
    } catch {
      /* Error is displayed in the form. */
    }
  }

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-surface-muted px-4 py-3 text-sm">
        <p className="min-w-0 truncate text-ink-secondary">
          {course?.title ?? 'Chưa chọn khóa học'}
          {section && (
            <>
              <ChevronRight aria-hidden="true" className="mx-1 inline size-4" />
              {section.title}
            </>
          )}
        </p>
        <Link
          to="/admin/lessons"
          className="inline-flex items-center gap-1 font-semibold text-action-primary"
        >
          <ArrowLeft aria-hidden="true" className="size-4" />
          Danh sách bài học
        </Link>
      </div>

      {courses.isError ? (
        <AdminLoadError error={courses.error} retry={() => void courses.refetch()} />
      ) : (
        <AdminCard
          title="Chọn khóa học và chương"
          description="Chọn khóa học trước. Danh sách chương sẽ tự đổi theo khóa học bạn chọn."
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <AdminSearchSelect
              label="Khóa học"
              value={courseId}
              onChange={(value) => {
                setCourseId(value)
                setSectionId('')
              }}
              disabled={courses.isPending}
              options={(courses.data ?? []).map((item) => ({
                value: item.id,
                label: item.title,
                description: `${item.code} · ${item.level}`,
              }))}
            />
            <AdminSearchSelect
              label="Chương"
              value={sectionId}
              onChange={setSectionId}
              disabled={!courseId || sections.isPending}
              options={(sections.data ?? []).map((item) => ({
                value: item.id,
                label: item.title,
                description: `Chương ${item.sortOrder + 1}`,
              }))}
            />
          </div>
          {sections.isError && (
            <AdminLoadError error={sections.error} retry={() => void sections.refetch()} />
          )}
          {courseId && !sections.isPending && !sections.isError && !sections.data?.length && (
            <p className="text-sm leading-6 text-ink-secondary">
              Khóa học này chưa có chương. Hãy thêm chương trước khi tạo bài học.
            </p>
          )}
        </AdminCard>
      )}

      <form className="grid gap-4" onSubmit={(event) => void submit(event)}>
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
            title={`Bài giảng · ${title || 'Bài học mới'}`}
          />
        </AdminCard>

        <AdminCard
          title="Bài tập của bài học"
          description="Có thể nhập một bài tập để tạo cùng lúc, hoặc thêm bài tập khác sau khi lưu."
        >
          <div className="grid gap-3">
            <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_14rem]">
              <AdminField
                label="Tên bài tập (không bắt buộc)"
                value={newExercise}
                onChange={setNewExercise}
                placeholder="Ví dụ: Bài tập giới thiệu bản thân"
              />
              <AdminSelect
                label="Loại bài tập"
                value={exerciseType}
                onChange={(value) => {
                  setExerciseType(value as typeof exerciseType)
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
            <AdminExerciseMediaPicker
              value={exerciseMedia}
              onChange={setExerciseMedia}
              disabled={
                create.isPending || createExercise.isPending || exerciseMediaProgress !== null
              }
            />
            {exerciseMediaProgress !== null && (
              <div className="rounded-xl bg-surface-muted p-3 text-sm" role="status">
                <p>Đang tải tệp lên {exerciseMediaProgress}%</p>
                <progress className="mt-2 block w-full" value={exerciseMediaProgress} max={100} />
              </div>
            )}
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
            title={`Video chữa bài · ${title || 'Bài học mới'}`}
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
          <AdminFeedback error={create.error} />
          <Button
            type="submit"
            loading={create.isPending || createExercise.isPending || exerciseMediaProgress !== null}
            startIcon={<Plus aria-hidden="true" className="size-4" />}
          >
            Tạo bài học
          </Button>
        </AdminCard>
      </form>
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
  const [exerciseMedia, setExerciseMedia] = useState<ExerciseMediaSelection[]>([])
  const [exerciseMediaProgress, setExerciseMediaProgress] = useState<number | null>(null)
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
      status: 'PUBLISHED',
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
      if (exerciseMedia.length > 0) {
        try {
          await uploadAndAttachExerciseMedia(exercise.id, exerciseMedia, setExerciseMediaProgress)
          notifications.success('Đã tạo bài tập và gắn tệp.')
        } catch (error) {
          setExerciseError(
            error instanceof Error
              ? `Bài tập đã được tạo nhưng chưa gắn hết tệp. ${error.message} Hãy mở bài tập để thử lại.`
              : 'Bài tập đã được tạo nhưng chưa gắn hết tệp. Hãy mở bài tập để thử lại.',
          )
          notifications.error(
            'Chưa gắn được hết tệp',
            'Bài tập đã tạo. Mở phần chỉnh sửa để thử lại.',
          )
        }
      } else {
        notifications.success('Đã tạo bài tập.')
      }
      setExerciseMedia([])
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
            <p className="text-xs leading-5 text-ink-secondary">
              {exerciseType === 'FILE_BASED'
                ? 'Bài tập PDF sẽ hiển thị ngay sau khi được tạo.'
                : 'Bài trắc nghiệm sẽ hiển thị sau khi hoàn thiện câu hỏi.'}
            </p>
            <AdminExerciseMediaPicker
              value={exerciseMedia}
              onChange={setExerciseMedia}
              disabled={
                isAddingExercise || createExercise.isPending || exerciseMediaProgress !== null
              }
            />
            {exerciseMediaProgress !== null && (
              <div className="rounded-xl bg-surface-muted p-3 text-sm" role="status">
                <p>Đang tải tệp lên {exerciseMediaProgress}%</p>
                <progress className="mt-2 block w-full" value={exerciseMediaProgress} max={100} />
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
              loading={
                isAddingExercise || createExercise.isPending || exerciseMediaProgress !== null
              }
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
  const [bannerFile, setBannerFile] = useState<File | null>(null)
  const [bannerProgress, setBannerProgress] = useState<number | null>(null)

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
    let uploadedBannerAssetId: string | undefined
    try {
      if (bannerFile)
        uploadedBannerAssetId = await uploadCourseBanner(bannerFile, setBannerProgress)
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
        bannerAssetId: uploadedBannerAssetId ?? form.bannerAssetId ?? null,
      })
      if (uploadedBannerAssetId)
        setForm((old) => ({ ...old, bannerAssetId: uploadedBannerAssetId! }))
      setBannerFile(null)
      setSuccess('Đã lưu thông tin khóa học.')
    } catch {
      if (uploadedBannerAssetId)
        await adminRepository.deleteMedia(uploadedBannerAssetId).catch(() => undefined)
      /* Error is shown below the form. */
    } finally {
      setBannerProgress(null)
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
            placeholder="Ví dụ: Bắt đầu từ lời chào, rồi tự tin giới thiệu bản thân bằng tiếng Đức."
          />
          <AdminTextArea
            label="Mô tả khóa học"
            value={form.description ?? ''}
            onChange={(value) => setForm((old) => ({ ...old, description: value }))}
            rows={4}
            placeholder="Ví dụ: Làm quen với lời chào, giới thiệu bản thân, bảng chữ cái, số đếm và thông tin cá nhân thường dùng."
          />
          <AdminTextArea
            label="Sau khóa học, học viên có thể (mỗi ý một dòng)"
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
            placeholder={
              'Tự chào hỏi và giới thiệu tên bằng tiếng Đức.\nĐánh vần tên, nói số điện thoại và email.\nHỏi đáp ngắn về nơi ở và thông tin cá nhân.'
            }
          />
          <AdminTextArea
            label="Học viên cần chuẩn bị gì? (mỗi ý một dòng)"
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
            placeholder={
              'Không cần biết tiếng Đức trước khi bắt đầu.\nChuẩn bị điện thoại hoặc máy tính có kết nối internet.'
            }
          />
          <CourseBannerField
            assetId={form.bannerAssetId}
            file={bannerFile}
            onFileChange={setBannerFile}
            disabled={update.isPending || bannerProgress !== null}
          />
          {bannerProgress !== null && (
            <div role="status" className="rounded-xl bg-surface-muted p-3 text-sm">
              Đang tải ảnh bìa lên {bannerProgress}%
              <progress className="mt-2 block w-full" value={bannerProgress} max={100} />
            </div>
          )}
          <AdminFeedback error={update.error} success={success} />
          <Button type="submit" loading={update.isPending || bannerProgress !== null}>
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
