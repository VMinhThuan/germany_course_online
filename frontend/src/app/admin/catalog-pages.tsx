import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router'
import { useQuery } from '@tanstack/react-query'
import { Check, ChevronRight, ExternalLink, Plus, Save, Trash2 } from 'lucide-react'
import { adminRepository } from '@/data/api/admin-repository'
import type { ApiAdminCourse, ApiAdminExercise } from '@/lib/api/types'
import { formatVnd } from '@/shared/lib/format'
import { parseYouTubeVideoId, YouTubeLessonPlayer } from '@/domains/learning/youtube-lesson-player'
import { useDialogs } from '@/shared/ui/dialogs'
import { useNotifications } from '@/shared/ui/notifications'
import { Button, EmptyState, Pagination } from '@/shared/ui'
import {
  AdminCard,
  AdminField,
  AdminFeedback,
  AdminLoadError,
  AdminLoading,
  AdminSelect,
  AdminTextArea,
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

function YouTubeLessonField({
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
    <div className="grid min-w-0 gap-2 rounded-xl border border-border-subtle bg-surface-muted p-3">
      <label className="grid gap-1.5 text-sm font-semibold text-ink-primary">
        <span>{label} · YouTube</span>
        <input
          className="min-h-11 w-full rounded-xl border border-border-subtle bg-white px-3 font-normal outline-none focus-visible:ring-2 focus-visible:ring-action-primary"
          type="text"
          inputMode="url"
          autoComplete="off"
          spellCheck={false}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder="https://www.youtube.com/watch?v=…"
          aria-invalid={invalid}
          aria-describedby={invalid ? `${label}-youtube-error` : undefined}
        />
      </label>
      {invalid ? (
        <p id={`${label}-youtube-error`} role="alert" className="text-sm text-danger-foreground">
          Nhập link YouTube hợp lệ hoặc video ID gồm 11 ký tự.
        </p>
      ) : (
        <p className="text-xs leading-5 text-ink-secondary">
          Dán link YouTube để xem trước. Khi lưu, hệ thống chỉ lưu provider YOUTUBE và videoId.
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
function exercisePath(courseId: string, sectionId: string, lessonId: string, exerciseId: string) {
  return `${lessonPath(courseId, sectionId, lessonId)}/exercises/${encodeURIComponent(exerciseId)}`
}

export function AdminCoursesPage() {
  const notifications = useNotifications()
  const [page, setPage] = useState(1)
  const courses = useQuery({
    queryKey: ['admin', 'courses', page],
    queryFn: () => adminRepository.listCourses({ page, pageSize: 20 }),
    retry: false,
  })
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
  const [success, setSuccess] = useState('')
  const [slugTouched, setSlugTouched] = useState(false)
  const navigate = useNavigate()

  function updateTitle(value: string) {
    setTitle(value)
    if (!slugTouched)
      setSlug(
        value
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/(^-|-$)/g, ''),
      )
  }
  async function submit(event: FormEvent) {
    event.preventDefault()
    setSuccess('')
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
      sortOrder: courses.data?.total ?? 0,
    }
    try {
      const course = await create.mutateAsync({ input, key: idempotency.get(input) })
      idempotency.clear()
      setSuccess('Đã tạo khóa học nháp.')
      notifications.success('Đã tạo khóa học nháp.')
      navigate(coursePath(course.id))
    } catch {
      /* The API error is displayed below. */
    }
  }

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(20rem,0.8fr)]">
      <AdminCard
        title="Danh mục khóa học"
        description="Trạng thái, học phí và thứ tự hiển thị do API quản lý."
      >
        {courses.isPending ? (
          <AdminLoading />
        ) : courses.isError ? (
          <AdminLoadError error={courses.error} retry={() => void courses.refetch()} />
        ) : courses.data?.items.length ? (
          <div className="grid gap-2">
            {courses.data.items.map((course) => (
              <Link
                key={course.id}
                to={coursePath(course.id)}
                className="grid gap-2 rounded-xl border border-border-subtle bg-white p-4 hover:border-action-primary sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center"
              >
                <span className="min-w-0">
                  <span className="block truncate font-semibold">{course.title}</span>
                  <span className="mt-1 block text-xs text-ink-secondary">
                    {course.code} · {course.slug} · {course.accessDurationMonths} tháng
                  </span>
                </span>
                <span className="flex items-center gap-3 text-sm">
                  <span className="text-right font-semibold">{formatVnd(course.price)}</span>
                  <span className={`font-semibold ${statusTone(course.status)}`}>
                    {course.status}
                  </span>
                  <ChevronRight aria-hidden="true" className="size-4" />
                </span>
              </Link>
            ))}
          </div>
        ) : (
          <EmptyState
            title="Chưa có khóa học"
            description="Tạo khóa học nháp bằng biểu mẫu bên cạnh."
          />
        )}
        {courses.data && <p className="text-xs text-ink-muted">Tổng số: {courses.data.total}</p>}
        {courses.data && courses.data.total > courses.data.pageSize && (
          <Pagination
            page={courses.data.page}
            pages={Math.ceil(courses.data.total / courses.data.pageSize)}
            onPageChange={setPage}
          />
        )}
      </AdminCard>
      <AdminCard title="Tạo khóa học">
        <form className="grid gap-3" onSubmit={(event) => void submit(event)}>
          <div className="grid gap-3 sm:grid-cols-2">
            <AdminField
              label="Mã khóa học"
              value={code}
              onChange={setCode}
              required
              placeholder="A1-1"
            />
            <AdminField
              label="Slug"
              value={slug}
              onChange={(value) => {
                setSlugTouched(true)
                setSlug(value)
              }}
              required
              placeholder="tieng-duc-a1-1"
            />
          </div>
          <AdminField label="Tên khóa học" value={title} onChange={updateTitle} required />
          <div className="grid gap-3 sm:grid-cols-2">
            <AdminField label="Cấp độ" value={level} onChange={setLevel} required />
            <AdminField
              label="Học phí (VND nguyên)"
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
            label="Mục tiêu (mỗi dòng một mục)"
            value={objectives}
            onChange={setObjectives}
            rows={3}
          />
          <AdminTextArea
            label="Yêu cầu đầu vào (mỗi dòng một mục)"
            value={requirements}
            onChange={setRequirements}
            rows={3}
          />
          <AdminFeedback error={create.error} success={success} />
          <Button
            type="submit"
            loading={create.isPending}
            startIcon={<Plus aria-hidden="true" className="size-4" />}
          >
            Tạo bản nháp
          </Button>
        </form>
      </AdminCard>
    </div>
  )
}

export function AdminCourseEditorPage({ courseId }: { courseId: string }) {
  const dialogs = useDialogs()
  const [sectionPage, setSectionPage] = useState(1)
  const course = useQuery({
    queryKey: ['admin', 'course', courseId],
    queryFn: () => adminRepository.getCourse(courseId),
    retry: false,
  })
  const sections = useQuery({
    queryKey: ['admin', 'sections', courseId, sectionPage],
    queryFn: () => adminRepository.listSections(courseId, { page: sectionPage, pageSize: 20 }),
    retry: false,
  })
  const update = useAdminMutation((input: Record<string, unknown>) =>
    adminRepository.updateCourse(courseId, input),
  )
  const publish = useAdminMutation(() => adminRepository.publishCourse(courseId))
  const remove = useAdminMutation(() => adminRepository.deleteCourse(courseId))
  const createSection = useAdminMutation(
    ({ input, key }: { input: Record<string, unknown>; key: string }) =>
      adminRepository.createSection(courseId, input, key),
  )
  const idempotency = useStableIdempotencyKey()
  const navigate = useNavigate()
  const [form, setForm] = useState<Partial<ApiAdminCourse>>({})
  const [sectionTitle, setSectionTitle] = useState('')
  const [sectionDescription, setSectionDescription] = useState('')
  const [success, setSuccess] = useState('')
  // These editors initialize a local draft from a server-owned document.
  useEffect(() => {
    if (course.data) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setForm(course.data)
    }
  }, [course.data])
  if (course.isPending) return <AdminLoading />
  if (course.isError || !course.data)
    return (
      <AdminLoadError
        error={course.error ?? new Error('Không tìm thấy khóa học.')}
        retry={() => void course.refetch()}
      />
    )

  async function saveCourse(event: FormEvent) {
    event.preventDefault()
    setSuccess('')
    const input = {
      code: form.code,
      slug: form.slug,
      title: form.title,
      description: form.description,
      shortDescription: form.shortDescription,
      objectives: form.objectives ?? [],
      requirements: form.requirements ?? [],
      level: form.level,
      price: form.price,
      accessDurationMonths: form.accessDurationMonths,
      sortOrder: form.sortOrder,
      thumbnailAssetId: form.thumbnailAssetId,
      bannerAssetId: form.bannerAssetId,
      introVideoAssetId: form.introVideoAssetId,
      ...(form.status === 'ARCHIVED' || form.status === 'DRAFT' ? { status: form.status } : {}),
    }
    try {
      await update.mutateAsync(input)
      setSuccess('Đã lưu thông tin khóa học.')
    } catch {
      /* error shown below */
    }
  }
  async function addSection(event: FormEvent) {
    event.preventDefault()
    setSuccess('')
    const input = {
      title: sectionTitle.trim(),
      description: sectionDescription.trim() || null,
      sectionType: 'CHAPTER',
      sortOrder: sections.data?.total ?? 0,
      status: 'DRAFT',
    }
    try {
      await createSection.mutateAsync({ input, key: idempotency.get(input) })
      idempotency.clear()
      setSectionTitle('')
      setSectionDescription('')
      setSuccess('Đã tạo chương nháp.')
    } catch {
      /* error shown below */
    }
  }
  function deleteCourse() {
    dialogs.confirm({
      title: 'Xóa mềm khóa học này?',
      description: 'Lịch sử học viên được giữ nguyên.',
      confirmLabel: 'Xóa mềm',
      destructive: true,
      onConfirm: async () => {
        try {
          await remove.mutateAsync()
          navigate('/admin/courses')
        } catch {
          /* error shown below */
        }
      },
    })
  }

  return (
    <div className="grid gap-5">
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(18rem,0.7fr)]">
        <AdminCard
          title={`Chỉnh sửa · ${course.data.title}`}
          description={`Mã ${course.data.code} · trạng thái ${course.data.status}`}
        >
          <form className="grid gap-3" onSubmit={(event) => void saveCourse(event)}>
            <div className="grid gap-3 sm:grid-cols-2">
              <AdminField
                label="Mã"
                value={form.code ?? ''}
                onChange={(value) => setForm((old) => ({ ...old, code: value }))}
                required
              />
              <AdminField
                label="Slug"
                value={form.slug ?? ''}
                onChange={(value) => setForm((old) => ({ ...old, slug: value }))}
                required
              />
            </div>
            <AdminField
              label="Tên khóa học"
              value={form.title ?? ''}
              onChange={(value) => setForm((old) => ({ ...old, title: value }))}
              required
            />
            <div className="grid gap-3 sm:grid-cols-2">
              <AdminField
                label="Cấp độ"
                value={form.level ?? ''}
                onChange={(value) => setForm((old) => ({ ...old, level: value }))}
                required
              />
              <AdminField
                label="Học phí (VND nguyên)"
                value={form.price ?? ''}
                onChange={(value) => setForm((old) => ({ ...old, price: value }))}
                type="number"
                min={0}
                required
              />
              <AdminField
                label="Thời hạn (tháng)"
                value={String(form.accessDurationMonths ?? '')}
                onChange={(value) =>
                  setForm((old) => ({ ...old, accessDurationMonths: Number(value) }))
                }
                type="number"
                min={1}
                max={120}
                required
              />
              <AdminField
                label="Thứ tự"
                value={String(form.sortOrder ?? 0)}
                onChange={(value) => setForm((old) => ({ ...old, sortOrder: Number(value) }))}
                type="number"
                min={0}
              />
            </div>
            <AdminField
              label="Mô tả ngắn"
              value={form.shortDescription ?? ''}
              onChange={(value) => setForm((old) => ({ ...old, shortDescription: value }))}
            />
            <AdminTextArea
              label="Mô tả"
              value={form.description ?? ''}
              onChange={(value) => setForm((old) => ({ ...old, description: value }))}
              rows={4}
            />
            <AdminTextArea
              label="Mục tiêu (mỗi dòng một mục)"
              value={(form.objectives ?? []).join('\n')}
              onChange={(value) => setForm((old) => ({ ...old, objectives: splitLines(value) }))}
              rows={3}
            />
            <AdminTextArea
              label="Yêu cầu (mỗi dòng một mục)"
              value={(form.requirements ?? []).join('\n')}
              onChange={(value) => setForm((old) => ({ ...old, requirements: splitLines(value) }))}
              rows={3}
            />
            <AdminFeedback error={update.error} success={success} />
            <Button
              type="submit"
              loading={update.isPending}
              startIcon={<Save aria-hidden="true" className="size-4" />}
            >
              Lưu khóa học
            </Button>
          </form>
        </AdminCard>
        <div className="grid content-start gap-4">
          <AdminCard title="Trạng thái xuất bản">
            <p className={`font-semibold ${statusTone(course.data.status)}`}>
              {course.data.status}
            </p>
            <p className="text-sm leading-6 text-ink-secondary">
              Xuất bản sẽ yêu cầu backend kiểm tra nội dung bắt buộc.
            </p>
            <Button
              disabled={course.data.status === 'PUBLISHED'}
              loading={publish.isPending}
              onClick={() =>
                void publish
                  .mutateAsync()
                  .then(() => setSuccess('Khóa học đã được xuất bản.'))
                  .catch(() => undefined)
              }
              startIcon={<Check aria-hidden="true" className="size-4" />}
            >
              Xuất bản khóa học
            </Button>
            <AdminFeedback error={publish.error} />
          </AdminCard>
          <AdminCard
            title="Xóa mềm khóa học"
            description="Giữ lịch sử tiến độ; nội dung không còn hiển thị công khai."
          >
            <Button
              variant="outline"
              disabled={remove.isPending}
              onClick={() => void deleteCourse()}
              startIcon={<Trash2 aria-hidden="true" className="size-4" />}
            >
              Xóa mềm
            </Button>
            <AdminFeedback error={remove.error} />
          </AdminCard>
          <AdminCard
            title="Tài sản khóa học"
            description="Nhập ID media đã hoàn tất upload. Khóa lưu trữ không được hiển thị trong Admin UI."
          >
            <AdminField
              label="Thumbnail Asset ID"
              value={form.thumbnailAssetId ?? ''}
              onChange={(value) => setForm((old) => ({ ...old, thumbnailAssetId: value || null }))}
            />
            <AdminField
              label="Banner Asset ID"
              value={form.bannerAssetId ?? ''}
              onChange={(value) => setForm((old) => ({ ...old, bannerAssetId: value || null }))}
            />
            <AdminField
              label="Intro video Asset ID"
              value={form.introVideoAssetId ?? ''}
              onChange={(value) => setForm((old) => ({ ...old, introVideoAssetId: value || null }))}
            />
            <Link className="text-sm font-semibold text-action-primary" to="/admin/media">
              Mở thư viện media <ExternalLink aria-hidden="true" className="inline size-4" />
            </Link>
          </AdminCard>
        </div>
      </div>
      <AdminCard
        title="Chương học"
        description="Thứ tự được ghi bằng sortOrder; các mục giữ trạng thái nháp hoặc xuất bản của backend."
      >
        {sections.isPending ? (
          <AdminLoading />
        ) : sections.isError ? (
          <AdminLoadError error={sections.error} retry={() => void sections.refetch()} />
        ) : sections.data?.items.length ? (
          <div className="grid gap-2">
            {sections.data.items.map((section) => (
              <Link
                key={section.id}
                to={sectionPath(courseId, section.id)}
                className="flex min-h-14 items-center justify-between gap-3 rounded-xl border border-border-subtle bg-white px-4 py-3 hover:border-action-primary"
              >
                <span>
                  <span className="block font-semibold">{section.title}</span>
                  <span className="text-xs text-ink-secondary">
                    {section.sectionType} · Thứ tự {section.sortOrder} · {section.status}
                  </span>
                </span>
                <ChevronRight aria-hidden="true" className="size-4 text-action-primary" />
              </Link>
            ))}
          </div>
        ) : (
          <EmptyState title="Chưa có chương" description="Tạo chương từ biểu mẫu bên cạnh." />
        )}
        {sections.data && sections.data.total > sections.data.pageSize && (
          <Pagination
            page={sections.data.page}
            pages={Math.ceil(sections.data.total / sections.data.pageSize)}
            onPageChange={setSectionPage}
          />
        )}
        <form
          className="grid gap-3 border-t border-border-subtle pt-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)_auto] sm:items-end"
          onSubmit={(event) => void addSection(event)}
        >
          <AdminField label="Tên chương" value={sectionTitle} onChange={setSectionTitle} required />
          <AdminField label="Mô tả" value={sectionDescription} onChange={setSectionDescription} />
          <Button type="submit" loading={createSection.isPending}>
            Thêm chương
          </Button>
          <AdminFeedback error={createSection.error} />
        </form>
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
  const [lessonPage, setLessonPage] = useState(1)
  const sections = useQuery({
    queryKey: ['admin', 'sections', courseId],
    queryFn: () => adminRepository.listSections(courseId),
    retry: false,
  })
  const lessons = useQuery({
    queryKey: ['admin', 'lessons', sectionId, lessonPage],
    queryFn: () => adminRepository.listLessons(sectionId, { page: lessonPage, pageSize: 20 }),
    retry: false,
  })
  const update = useAdminMutation(({ id, input }: { id: string; input: Record<string, unknown> }) =>
    adminRepository.updateSection(id, input),
  )
  const remove = useAdminMutation((id: string) => adminRepository.deleteSection(id))
  const create = useAdminMutation(
    ({ input, key }: { input: Record<string, unknown>; key: string }) =>
      adminRepository.createLesson(sectionId, input, key),
  )
  const idempotency = useStableIdempotencyKey()
  const navigate = useNavigate()
  const section = sections.data?.items.find((item) => item.id === sectionId)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [sectionType, setSectionType] = useState<'CHAPTER' | 'EXAM_PREP'>('CHAPTER')
  const [status, setStatus] = useState<'DRAFT' | 'PUBLISHED' | 'HIDDEN'>('DRAFT')
  const [sortOrder, setSortOrder] = useState(0)
  const [newLesson, setNewLesson] = useState('')
  const [success, setSuccess] = useState('')
  // These editors initialize a local draft from a server-owned document.
  useEffect(() => {
    if (section) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setTitle(section.title)
      setDescription(section.description ?? '')
      setSectionType(section.sectionType)
      setStatus(section.status)
      setSortOrder(section.sortOrder)
    }
  }, [section])
  if (sections.isPending || lessons.isPending) return <AdminLoading />
  if (sections.isError || lessons.isError || !section)
    return (
      <AdminLoadError
        error={sections.error ?? lessons.error ?? new Error('Không tìm thấy chương.')}
        retry={() => {
          void sections.refetch()
          void lessons.refetch()
        }}
      />
    )
  async function save(event: FormEvent) {
    event.preventDefault()
    setSuccess('')
    try {
      await update.mutateAsync({
        id: sectionId,
        input: { title, description: description || null, sectionType, status, sortOrder },
      })
      setSuccess('Đã lưu chương.')
    } catch {
      /* error shown */
    }
  }
  async function addLesson(event: FormEvent) {
    event.preventDefault()
    const input = {
      title: newLesson.trim(),
      description: null,
      content: { version: 1, paragraphs: [] },
      lessonType: 'LECTURE',
      estimatedMinutes: null,
      countsTowardProgress: true,
      sortOrder: lessons.data?.total ?? 0,
      status: 'DRAFT',
    }
    try {
      const lesson = await create.mutateAsync({ input, key: idempotency.get(input) })
      idempotency.clear()
      setNewLesson('')
      notifications.success('Đã tạo bài học nháp. Thêm video và PDF trong màn hình bài học.')
      navigate(lessonPath(courseId, sectionId, lesson.id))
    } catch {
      /* error shown */
    }
  }
  function deleteSelectedSection() {
    dialogs.confirm({
      title: 'Xóa mềm chương này?',
      description: 'Chương này sẽ không còn xuất hiện trong khóa học.',
      confirmLabel: 'Xóa mềm',
      destructive: true,
      onConfirm: async () => {
        try {
          await remove.mutateAsync(sectionId)
          navigate(coursePath(courseId))
        } catch {
          /* error shown */
        }
      },
    })
  }
  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(20rem,0.7fr)_minmax(0,1.3fr)]">
      <AdminCard title="Chỉnh sửa chương">
        <form className="grid gap-3" onSubmit={(event) => void save(event)}>
          <AdminField label="Tên chương" value={title} onChange={setTitle} required />
          <AdminTextArea label="Mô tả" value={description} onChange={setDescription} rows={3} />
          <div className="grid gap-3 sm:grid-cols-2">
            <AdminSelect
              label="Loại chương"
              value={sectionType}
              onChange={(value) => setSectionType(value as 'CHAPTER' | 'EXAM_PREP')}
              options={[
                { value: 'CHAPTER', label: 'CHAPTER' },
                { value: 'EXAM_PREP', label: 'EXAM_PREP' },
              ]}
            />
            <AdminField
              label="Thứ tự"
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
            options={['DRAFT', 'PUBLISHED', 'HIDDEN'].map((value) => ({ value, label: value }))}
          />
          <AdminFeedback error={update.error} success={success} />
          <Button type="submit" loading={update.isPending}>
            Lưu chương
          </Button>
          <Button variant="outline" onClick={() => void deleteSelectedSection()}>
            Xóa mềm chương
          </Button>
          <AdminFeedback error={remove.error} />
        </form>
      </AdminCard>
      <AdminCard
        title="Bài học"
        description="Nội dung bài học chỉ dùng mô hình paragraphs dạng văn bản thuần; backend từ chối HTML tùy ý."
      >
        {lessons.data?.items.map((lesson) => (
          <Link
            key={lesson.id}
            to={lessonPath(courseId, sectionId, lesson.id)}
            className="flex items-center justify-between gap-3 rounded-xl border border-border-subtle bg-white p-4 hover:border-action-primary"
          >
            <span>
              <strong>{lesson.title}</strong>
              <span className="mt-1 block text-xs text-ink-secondary">
                {lesson.lessonType} · {lesson.status} · thứ tự {lesson.sortOrder}
              </span>
            </span>
            <ChevronRight aria-hidden="true" className="size-4" />
          </Link>
        ))}
        {!lessons.data?.items.length && (
          <EmptyState title="Chưa có bài học" description="Tạo bài đầu tiên từ biểu mẫu." />
        )}
        <form
          className="grid gap-3 border-t border-border-subtle pt-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end"
          onSubmit={(event) => void addLesson(event)}
        >
          <AdminField label="Tên bài học" value={newLesson} onChange={setNewLesson} required />
          <Button type="submit" loading={create.isPending}>
            Thêm bài học
          </Button>
          <AdminFeedback error={create.error} success={success} />
        </form>
      </AdminCard>
      {lessons.data && lessons.data.total > lessons.data.pageSize && (
        <div className="xl:col-start-2">
          <Pagination
            page={lessons.data.page}
            pages={Math.ceil(lessons.data.total / lessons.data.pageSize)}
            onPageChange={setLessonPage}
          />
        </div>
      )}
    </div>
  )
}

export function AdminLessonEditorPage({
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
  const [exercisePage, setExercisePage] = useState(1)
  const lessons = useQuery({
    queryKey: ['admin', 'lessons', sectionId],
    queryFn: () => adminRepository.listLessons(sectionId),
    retry: false,
  })
  const exercises = useQuery({
    queryKey: ['admin', 'exercises', lessonId, exercisePage],
    queryFn: () => adminRepository.listExercises(lessonId, { page: exercisePage, pageSize: 100 }),
    retry: false,
  })
  const update = useAdminMutation(({ id, input }: { id: string; input: Record<string, unknown> }) =>
    adminRepository.updateLesson(id, input),
  )
  const create = useAdminMutation(
    ({ input, key }: { input: Record<string, unknown>; key: string }) =>
      adminRepository.createExercise(lessonId, input, key),
  )
  const remove = useAdminMutation((id: string) => adminRepository.deleteLesson(id))
  const idempotency = useStableIdempotencyKey()
  const navigate = useNavigate()
  const lesson = lessons.data?.items.find((item) => item.id === lessonId)
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
  const [success, setSuccess] = useState('')
  // These editors initialize a local draft from a server-owned document.
  useEffect(() => {
    if (lesson) {
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
    }
  }, [lesson])
  if (lessons.isPending || exercises.isPending) return <AdminLoading />
  if (lessons.isError || exercises.isError || !lesson)
    return (
      <AdminLoadError
        error={lessons.error ?? exercises.error ?? new Error('Không tìm thấy bài học.')}
        retry={() => {
          void lessons.refetch()
          void exercises.refetch()
        }}
      />
    )
  async function save(event: FormEvent) {
    event.preventDefault()
    setSuccess('')
    const lectureVideoId = parseYouTubeVideoId(lectureVideoUrl)
    const solutionVideoId = parseYouTubeVideoId(solutionVideoUrl)
    if (
      (lectureVideoUrl.trim() && !lectureVideoId) ||
      (solutionVideoUrl.trim() && !solutionVideoId)
    )
      return
    const content = {
      version: 1,
      paragraphs: paragraphs
        .split(/\n\s*\n/)
        .map((part) => part.trim())
        .filter(Boolean),
    }
    try {
      await update.mutateAsync({
        id: lessonId,
        input: {
          title,
          description: description || null,
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
      /* error shown */
    }
  }
  async function addExercise(event: FormEvent) {
    event.preventDefault()
    const input = {
      title: newExercise.trim(),
      description: null,
      instructions: newExerciseInstructions.trim(),
      exerciseType,
      completionMode: exerciseType === 'QUIZ' ? 'QUIZ_SUBMISSION' : 'MANUAL',
      isRequired: true,
      sortOrder: exercises.data?.total ?? 0,
      status: 'DRAFT',
    }
    try {
      const result = await create.mutateAsync({ input, key: idempotency.get(input) })
      idempotency.clear()
      setNewExercise('')
      setNewExerciseInstructions('')
      setSuccess('Đã tạo bài tập nháp.')
      if (result.exerciseType === 'QUIZ') {
        notifications.success('Đã tạo bài tập nháp.')
        navigate(exercisePath(courseId, sectionId, lessonId, result.id))
      }
    } catch {
      /* error shown */
    }
  }
  async function createPdfExercise(): Promise<ApiAdminExercise> {
    if (!lesson) throw new Error('Không tìm thấy bài học.')
    const input = {
      title: `Bài tập PDF · ${title.trim() || lesson.title}`,
      description: null,
      instructions: 'Mở tệp PDF và hoàn thành bài tập.',
      exerciseType: 'FILE_BASED',
      completionMode: 'MANUAL',
      isRequired: true,
      sortOrder: exercises.data?.total ?? 0,
      status: 'DRAFT',
    }
    const result = await create.mutateAsync({ input, key: idempotency.get(input) })
    idempotency.clear()
    return result
  }
  function deleteSelectedLesson() {
    dialogs.confirm({
      title: 'Xóa mềm bài học này?',
      description: 'Bài học này sẽ không còn xuất hiện trong chương.',
      confirmLabel: 'Xóa mềm',
      destructive: true,
      onConfirm: async () => {
        try {
          await remove.mutateAsync(lessonId)
          navigate(sectionPath(courseId, sectionId))
        } catch {
          /* error shown */
        }
      },
    })
  }
  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(20rem,0.8fr)_minmax(0,1.2fr)]">
      <AdminCard
        title="Chỉnh sửa bài học"
        description="Nội dung chỉ nhận văn bản thuần, mỗi đoạn nằm trên dòng riêng."
      >
        <form className="grid gap-3" onSubmit={(event) => void save(event)}>
          <AdminField label="Tên bài học" value={title} onChange={setTitle} required />
          <AdminTextArea label="Mô tả" value={description} onChange={setDescription} rows={3} />
          <AdminTextArea
            label="Nội dung bài học (văn bản thuần)"
            value={paragraphs}
            onChange={setParagraphs}
            rows={8}
          />
          <YouTubeLessonField
            label="Video bài giảng"
            value={lectureVideoUrl}
            onChange={setLectureVideoUrl}
            title={`Bài giảng · ${title || lesson.title}`}
          />
          <YouTubeLessonField
            label="Video giải bài tập"
            value={solutionVideoUrl}
            onChange={setSolutionVideoUrl}
            title={`Video chữa bài · ${title || lesson.title}`}
          />
          <div className="grid gap-3 sm:grid-cols-3">
            <AdminSelect
              label="Loại bài"
              value={lessonType}
              onChange={(value) => setLessonType(value as typeof lessonType)}
              options={[
                { value: 'LECTURE', label: 'LECTURE' },
                { value: 'PRACTICE', label: 'PRACTICE' },
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
              label="Thứ tự"
              value={String(sortOrder)}
              onChange={(value) => setSortOrder(Number(value))}
              type="number"
              min={0}
            />
          </div>
          <label className="flex min-h-10 items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={countsTowardProgress}
              onChange={(event) => setCountsTowardProgress(event.target.checked)}
            />
            Tính vào tiến độ khóa học
          </label>
          <AdminSelect
            label="Trạng thái"
            value={status}
            onChange={(value) => setStatus(value as typeof status)}
            options={['DRAFT', 'PUBLISHED', 'HIDDEN'].map((value) => ({ value, label: value }))}
          />
          <AdminFeedback error={update.error} success={success} />
          <Button type="submit" loading={update.isPending}>
            Lưu bài học
          </Button>
          <Button variant="outline" onClick={() => void deleteSelectedLesson()}>
            Xóa mềm bài học
          </Button>
          <AdminFeedback error={remove.error} />
        </form>
      </AdminCard>
      <AdminCard
        title="Bài tập"
        description="FILE_BASED hỗ trợ đánh dấu thủ công; QUIZ hoàn tất khi nộp theo kết quả backend."
      >
        {exercises.data?.items.map((exercise) => (
          <div
            key={exercise.id}
            className="flex items-center justify-between gap-3 rounded-xl border border-border-subtle bg-white p-4"
          >
            <span>
              <strong>{exercise.title}</strong>
              <span className="mt-1 block text-xs text-ink-secondary">
                {exercise.exerciseType} · {exercise.status}
              </span>
            </span>
            <Link
              className="text-sm font-semibold text-action-primary"
              to={exercisePath(courseId, sectionId, lessonId, exercise.id)}
            >
              {exercise.exerciseType === 'QUIZ' ? 'Mở Quiz' : 'Chỉnh sửa'}{' '}
              <ChevronRight aria-hidden="true" className="inline size-4" />
            </Link>
          </div>
        ))}
        {!exercises.data?.items.length && (
          <EmptyState title="Chưa có bài tập" description="Thêm FILE_BASED hoặc QUIZ." />
        )}
        <AdminExercisePdfManager
          lessonTitle={lesson.title}
          exercises={exercises.data?.items ?? []}
          onCreateExercise={createPdfExercise}
        />
        <form
          className="grid gap-3 border-t border-border-subtle pt-4 sm:grid-cols-[minmax(0,1fr)_12rem_auto] sm:items-end"
          onSubmit={(event) => void addExercise(event)}
        >
          <AdminField label="Tên bài tập" value={newExercise} onChange={setNewExercise} required />
          <AdminSelect
            label="Loại"
            value={exerciseType}
            onChange={(value) => setExerciseType(value as typeof exerciseType)}
            options={[
              { value: 'FILE_BASED', label: 'FILE_BASED' },
              { value: 'QUIZ', label: 'QUIZ' },
            ]}
          />
          <div className="sm:col-span-3">
            <AdminTextArea
              label="Hướng dẫn bài tập"
              value={newExerciseInstructions}
              onChange={setNewExerciseInstructions}
              rows={2}
              required
              placeholder="Mô tả ngắn cách học viên hoàn thành bài tập."
            />
          </div>
          <Button type="submit" loading={create.isPending}>
            Thêm bài
          </Button>
          <div className="sm:col-span-3">
            <AdminFeedback error={create.error} success={success} />
          </div>
        </form>
      </AdminCard>
      {exercises.data && exercises.data.total > exercises.data.pageSize && (
        <div className="xl:col-start-2">
          <Pagination
            page={exercises.data.page}
            pages={Math.ceil(exercises.data.total / exercises.data.pageSize)}
            onPageChange={setExercisePage}
          />
        </div>
      )}
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
      title: 'Xóa mềm bài tập này?',
      description: 'Bài tập này sẽ không còn xuất hiện trong bài học.',
      confirmLabel: 'Xóa mềm',
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
    <div className="grid gap-5 xl:grid-cols-[minmax(20rem,0.8fr)_minmax(0,1.2fr)]">
      <AdminCard
        title="Chỉnh sửa bài tập"
        description={`${exercise.exerciseType} · ${exercise.completionMode}`}
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
              label="Thứ tự"
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
            options={['DRAFT', 'PUBLISHED', 'HIDDEN'].map((value) => ({ value, label: value }))}
          />
          <AdminFeedback error={update.error} success={success} />
          <Button type="submit" loading={update.isPending}>
            Lưu bài tập
          </Button>
          <Button variant="outline" onClick={() => void deleteSelected()}>
            Xóa mềm bài tập
          </Button>
          <AdminFeedback error={remove.error} />
        </form>
      </AdminCard>
      {exercise.exerciseType === 'QUIZ' ? (
        <AdminQuizEditor exerciseId={exerciseId} />
      ) : (
        <AdminCard
          title="Tài liệu bài tập"
          description="Quản lý QUESTION_PDF, QUESTION_AUDIO, ANSWER_PDF và SOLUTION_VIDEO tại Thư viện media, gắn theo Exercise ID."
        >
          <Link className="font-semibold text-action-primary" to="/admin/media">
            Mở thư viện media <ExternalLink aria-hidden="true" className="inline size-4" />
          </Link>
        </AdminCard>
      )}
    </div>
  )
}

function AdminQuizEditor({ exerciseId }: { exerciseId: string }) {
  const quiz = useQuery({
    queryKey: ['admin', 'quiz', exerciseId],
    queryFn: () => adminRepository.getQuiz(exerciseId),
    retry: false,
  })
  const save = useAdminMutation((input: Record<string, unknown>) =>
    adminRepository.saveQuiz(exerciseId, input),
  )
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [passScore, setPassScore] = useState('')
  const [showCorrectAnswers, setShowCorrectAnswers] = useState(true)
  const [questionsJson, setQuestionsJson] = useState('[]')
  const [validation, setValidation] = useState('')
  const [success, setSuccess] = useState('')
  // Preserve server question and option IDs by loading the current Quiz into the editor once.
  useEffect(() => {
    if (quiz.data) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setTitle(quiz.data.title)
      setDescription(quiz.data.description ?? '')
      setPassScore(quiz.data.passScorePercent == null ? '' : String(quiz.data.passScorePercent))
      setShowCorrectAnswers(quiz.data.showCorrectAnswers)
      setQuestionsJson(JSON.stringify(quiz.data.questions, null, 2))
    }
  }, [quiz.data])
  function validateQuestions(value: unknown): value is Array<Record<string, unknown>> {
    if (!Array.isArray(value) || value.length === 0) return false
    return value.every((question) => {
      if (
        !question ||
        typeof question !== 'object' ||
        typeof question.questionText !== 'string' ||
        typeof question.points !== 'string' ||
        !Array.isArray(question.options) ||
        question.options.length < 2
      )
        return false
      return (
        question.options.filter((option: { isCorrect?: unknown }) => option?.isCorrect === true)
          .length === 1 &&
        question.options.every(
          (option: { optionText?: unknown }) =>
            typeof option?.optionText === 'string' && option.optionText.trim(),
        )
      )
    })
  }
  async function submit(event: FormEvent) {
    event.preventDefault()
    setValidation('')
    setSuccess('')
    let questions: unknown
    try {
      questions = JSON.parse(questionsJson)
    } catch {
      setValidation('JSON câu hỏi chưa đúng cú pháp.')
      return
    }
    if (!validateQuestions(questions)) {
      setValidation(
        'Cần ít nhất một câu hỏi; mỗi câu có từ hai lựa chọn và đúng chính xác một lựa chọn.',
      )
      return
    }
    const input = {
      title: title.trim(),
      description: description || null,
      passScorePercent: passScore === '' ? null : Number(passScore),
      showCorrectAnswers,
      questions,
    }
    try {
      await save.mutateAsync(input)
      setSuccess('Đã lưu cấu hình Quiz.')
    } catch {
      /* API validation error below */
    }
  }
  return (
    <AdminCard
      title="Biên tập Quiz"
      description="Câu hỏi và lựa chọn được giữ nguyên ID khi chỉnh sửa để bảo toàn liên kết với lịch sử làm bài."
    >
      <form className="grid gap-3" onSubmit={(event) => void submit(event)}>
        <AdminField label="Tên Quiz" value={title} onChange={setTitle} required />
        <AdminTextArea label="Mô tả" value={description} onChange={setDescription} rows={2} />
        <div className="grid gap-3 sm:grid-cols-2">
          <AdminField
            label="Ngưỡng đạt (%) · để trống nếu không có"
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
            Cho xem đáp án sau khi nộp
          </label>
        </div>
        <AdminTextArea
          label="Câu hỏi và lựa chọn (JSON theo schema Quiz)"
          value={questionsJson}
          onChange={setQuestionsJson}
          rows={16}
          required
        />
        <p className="text-xs leading-5 text-ink-secondary">
          Giữ lại id của câu hỏi và lựa chọn đã tồn tại. Mỗi câu có questionText, points, sortOrder,
          options; mỗi lựa chọn có optionText, isCorrect, sortOrder.
        </p>
        <AdminFeedback error={validation || save.error} success={success} />
        <Button type="submit" loading={save.isPending}>
          Lưu Quiz
        </Button>
      </form>
      {quiz.isError && (
        <p className="text-sm leading-6 text-ink-secondary">
          Chưa có cấu hình Quiz hiện tại hoặc API trả lỗi. Có thể lưu cấu hình mới sau khi nhập câu
          hỏi.
        </p>
      )}
    </AdminCard>
  )
}
