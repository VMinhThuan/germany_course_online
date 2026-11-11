import { useEffect, useState, type FormEvent, type ReactNode } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  ArrowLeft,
  BookOpenText,
  CalendarDays,
  MessageCircle,
  MoreHorizontal,
  Plus,
  Search,
  ShieldCheck,
  Trash2,
} from 'lucide-react'
import { adminRepository } from '@/data/api/admin-repository'
import { lessonCommentsRepository } from '@/data/api/lesson-comments-repository'
import type {
  ApiAdminCourse,
  ApiAdminLesson,
  ApiAdminLessonComment,
  ApiAdminSection,
  ApiAdminStudent,
  ApiLessonCommentHistoryItem,
  ApiLessonCommentReactionType,
  ApiPage,
} from '@/lib/api/types'
import { Button, DropdownMenu, Pagination, Popover } from '@/shared/ui'
import { BaseDialog, ConfirmDialog } from '@/shared/ui/dialogs'
import { AdminField, AdminLoadError, AdminLoading, AdminSearchSelect, AdminSelect } from './shared'
import { CommentReactionControl } from '@/domains/learning/comment-reaction-control'

const PAGE_SIZE = 20

const commentCatalogKeys = {
  courses: ['admin', 'comment-catalog', 'courses'] as const,
  sections: (courseId: string) => ['admin', 'comment-catalog', 'sections', courseId] as const,
  lessons: (sectionId: string) => ['admin', 'comment-catalog', 'lessons', sectionId] as const,
}

async function loadAllPages<T>(loadPage: (page: number, pageSize: number) => Promise<ApiPage<T>>) {
  const items: T[] = []
  let pageNumber = 1
  let hasMore = true

  while (hasMore) {
    const page = await loadPage(pageNumber, 100)
    items.push(...page.items)
    hasMore = page.hasMore && page.items.length > 0
    pageNumber += 1
  }

  return items
}

function catalogCourseOptions(courses: readonly ApiAdminCourse[] | undefined) {
  return (courses ?? []).map((course) => ({
    value: course.id,
    label: course.title,
    description: `${course.code} · ${course.level}`,
  }))
}

function catalogSectionOptions(sections: readonly ApiAdminSection[] | undefined) {
  return (sections ?? []).map((section) => ({
    value: section.id,
    label: section.title,
    description: section.sectionType === 'CHAPTER' ? 'Chương học' : 'Ôn tập',
  }))
}

function catalogLessonOptions(lessons: readonly ApiAdminLesson[] | undefined) {
  return (lessons ?? []).map((lesson) => ({
    value: lesson.id,
    label: lesson.title,
    description: lesson.lessonType === 'LECTURE' ? 'Bài giảng' : 'Luyện tập',
  }))
}

function dateTime(value: string | null) {
  return value
    ? new Date(value).toLocaleString('vi-VN', { dateStyle: 'medium', timeStyle: 'short' })
    : '—'
}

function SummaryMetric({ label, value, icon }: { label: string; value: number; icon: ReactNode }) {
  return (
    <div className="flex min-w-0 items-center gap-2.5 px-3 py-2 first:pl-0 xl:border-r xl:border-border-subtle xl:last:border-r-0">
      <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-surface-blue text-action-primary">
        {icon}
      </span>
      <span className="min-w-0">
        <strong className="block text-lg leading-5 tabular-nums">
          {value.toLocaleString('vi-VN')}
        </strong>
        <span className="block truncate text-xs text-ink-secondary">{label}</span>
      </span>
    </div>
  )
}

function AdminCreateCommentDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreated: (comment: ApiAdminLessonComment) => void
}) {
  const [courseId, setCourseId] = useState('')
  const [sectionId, setSectionId] = useState('')
  const [lessonId, setLessonId] = useState('')
  const [content, setContent] = useState('')
  const [error, setError] = useState('')

  const courses = useQuery({
    queryKey: commentCatalogKeys.courses,
    queryFn: () =>
      loadAllPages((page, pageSize) => adminRepository.listCourses({ page, pageSize })),
    enabled: open,
    retry: false,
  })
  const sections = useQuery({
    queryKey: commentCatalogKeys.sections(courseId),
    queryFn: () =>
      loadAllPages((page, pageSize) => adminRepository.listSections(courseId, { page, pageSize })),
    enabled: open && Boolean(courseId),
    retry: false,
  })
  const lessons = useQuery({
    queryKey: commentCatalogKeys.lessons(sectionId),
    queryFn: () =>
      loadAllPages((page, pageSize) => adminRepository.listLessons(sectionId, { page, pageSize })),
    enabled: open && Boolean(sectionId),
    retry: false,
  })

  const create = useMutation({
    mutationFn: () =>
      lessonCommentsRepository.createAdminComment(lessonId, {
        content: content.trim(),
        parentId: null,
      }),
    onSuccess: (comment) => {
      setContent('')
      setError('')
      onCreated(comment)
      onOpenChange(false)
    },
    onError: (cause) =>
      setError(cause instanceof Error ? cause.message : 'Chưa tạo được bình luận.'),
  })

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!lessonId || !content.trim()) return
    setError('')
    create.mutate()
  }

  return (
    <BaseDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Đăng bình luận quản trị viên"
      description="Chọn bài học từ danh mục. Bình luận sẽ hiển thị với nhãn Quản trị viên."
      size="wide"
    >
      <form id="admin-comment-create-form" onSubmit={submit} className="grid gap-4">
        <div className="grid gap-3 md:grid-cols-3">
          <div className="grid content-start gap-2">
            <AdminSearchSelect
              label="Khóa học"
              value={courseId}
              onChange={(value) => {
                setCourseId(value)
                setSectionId('')
                setLessonId('')
              }}
              options={catalogCourseOptions(courses.data)}
              placeholder="Tìm tên hoặc mã khóa học…"
              disabled={courses.isPending || courses.isError}
            />
            {courses.isPending && <p className="text-xs text-ink-muted">Đang tải khóa học…</p>}
            {courses.isError && (
              <p role="alert" className="text-xs text-danger-foreground">
                Chưa tải được danh sách khóa học.
              </p>
            )}
          </div>
          <div className="grid content-start gap-2">
            <AdminSearchSelect
              label="Chương"
              value={sectionId}
              onChange={(value) => {
                setSectionId(value)
                setLessonId('')
              }}
              options={catalogSectionOptions(sections.data)}
              placeholder="Tìm chương…"
              disabled={!courseId || sections.isPending || sections.isError}
            />
            {sections.isPending && <p className="text-xs text-ink-muted">Đang tải chương…</p>}
            {sections.isError && (
              <p role="alert" className="text-xs text-danger-foreground">
                Chưa tải được danh sách chương.
              </p>
            )}
          </div>
          <div className="grid content-start gap-2">
            <AdminSearchSelect
              label="Bài học"
              value={lessonId}
              onChange={setLessonId}
              options={catalogLessonOptions(lessons.data)}
              placeholder="Tìm bài học…"
              disabled={!sectionId || lessons.isPending || lessons.isError}
            />
            {lessons.isPending && <p className="text-xs text-ink-muted">Đang tải bài học…</p>}
            {lessons.isError && (
              <p role="alert" className="text-xs text-danger-foreground">
                Chưa tải được danh sách bài học.
              </p>
            )}
          </div>
        </div>
        {courseId && !sections.isPending && sections.data?.length === 0 && (
          <p className="text-sm text-ink-secondary">Khóa học này chưa có chương để chọn.</p>
        )}
        {sectionId && !lessons.isPending && lessons.data?.length === 0 && (
          <p className="text-sm text-ink-secondary">Chương này chưa có bài học để chọn.</p>
        )}
        <label className="grid gap-1.5 text-sm font-semibold text-ink-primary">
          Nội dung bình luận
          <textarea
            aria-label="Nội dung bình luận"
            value={content}
            onChange={(event) => setContent(event.target.value)}
            maxLength={2_000}
            rows={4}
            className="min-h-28 w-full rounded-xl border border-border-subtle bg-white px-3 py-2.5 font-normal leading-6 outline-none focus-visible:ring-2 focus-visible:ring-action-primary"
          />
          <span className="text-right text-xs font-normal tabular-nums text-ink-muted">
            {content.length}/2.000
          </span>
        </label>
        {error && (
          <p role="alert" className="text-sm text-danger-foreground">
            {error}
          </p>
        )}
        <div className="flex flex-col-reverse justify-end gap-2 border-t border-border-subtle pt-4 sm:flex-row">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Hủy
          </Button>
          <Button type="submit" loading={create.isPending} disabled={!lessonId || !content.trim()}>
            Đăng bình luận
          </Button>
        </div>
      </form>
    </BaseDialog>
  )
}

type CommentStatus = 'ALL' | 'ACTIVE' | 'DELETED'
type CommentType = 'ALL' | 'ROOT' | 'REPLY'

export function AdminLessonCommentsPage() {
  const queryClient = useQueryClient()
  const [searchDraft, setSearchDraft] = useState('')
  const [search, setSearch] = useState('')
  const [courseId, setCourseId] = useState('')
  const [sectionId, setSectionId] = useState('')
  const [lessonId, setLessonId] = useState('')
  const [authorSearchDraft, setAuthorSearchDraft] = useState('')
  const [authorSearch, setAuthorSearch] = useState('')
  const [authorId, setAuthorId] = useState('')
  const [authorLabel, setAuthorLabel] = useState('')
  const [anonymous, setAnonymous] = useState('')
  const [status, setStatus] = useState<CommentStatus>('ALL')
  const [type, setType] = useState<CommentType>('ALL')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [sort, setSort] = useState<'newest' | 'oldest'>('newest')
  const [page, setPage] = useState(1)
  const [selectedId, setSelectedId] = useState('')
  const [selectionCleared, setSelectionCleared] = useState(false)
  const [mobileDetailOpen, setMobileDetailOpen] = useState(false)
  const [advancedOpen, setAdvancedOpen] = useState(false)
  const [createOpen, setCreateOpen] = useState(false)
  const [createReply, setCreateReply] = useState(false)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')
  const [editReason, setEditReason] = useState('')
  const [editError, setEditError] = useState('')
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [historyOpen, setHistoryOpen] = useState(false)
  const [actionError, setActionError] = useState('')

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setSearch(searchDraft.trim())
      setPage(1)
      setSelectedId('')
      setSelectionCleared(false)
      setMobileDetailOpen(false)
    }, 300)
    return () => window.clearTimeout(timer)
  }, [searchDraft])

  useEffect(() => {
    const timer = window.setTimeout(() => setAuthorSearch(authorSearchDraft.trim()), 250)
    return () => window.clearTimeout(timer)
  }, [authorSearchDraft])

  const courses = useQuery({
    queryKey: commentCatalogKeys.courses,
    queryFn: () =>
      loadAllPages((pageNumber, pageSize) =>
        adminRepository.listCourses({ page: pageNumber, pageSize }),
      ),
    retry: false,
  })
  const sections = useQuery({
    queryKey: commentCatalogKeys.sections(courseId),
    queryFn: () =>
      loadAllPages((pageNumber, pageSize) =>
        adminRepository.listSections(courseId, { page: pageNumber, pageSize }),
      ),
    enabled: Boolean(courseId),
    retry: false,
  })
  const lessons = useQuery({
    queryKey: commentCatalogKeys.lessons(sectionId),
    queryFn: () =>
      loadAllPages((pageNumber, pageSize) =>
        adminRepository.listLessons(sectionId, { page: pageNumber, pageSize }),
      ),
    enabled: Boolean(sectionId),
    retry: false,
  })
  const authors = useQuery({
    queryKey: ['admin', 'lesson-comment-authors', authorSearch],
    queryFn: () => adminRepository.listStudents({ page: 1, pageSize: 50, q: authorSearch }),
    enabled: advancedOpen && authorSearch.length >= 2,
    retry: false,
  })

  const filters = {
    page,
    pageSize: PAGE_SIZE,
    search: search || undefined,
    courseId: lessonId ? undefined : courseId || undefined,
    lessonId: lessonId || undefined,
    authorId: authorId || undefined,
    anonymous: anonymous || undefined,
    status,
    type,
    from: from ? new Date(`${from}T00:00:00.000Z`).toISOString() : undefined,
    to: to ? new Date(`${to}T23:59:59.999Z`).toISOString() : undefined,
    sort,
  }
  const list = useQuery({
    queryKey: ['admin', 'lesson-comments', filters],
    queryFn: () => lessonCommentsRepository.listAdminComments(filters),
    retry: false,
  })
  const summary = useQuery({
    queryKey: ['admin', 'lesson-comments-summary'],
    queryFn: lessonCommentsRepository.adminSummary,
    retry: false,
  })
  const activeSelectedId = selectionCleared ? '' : selectedId || list.data?.items[0]?.id || ''
  const detail = useQuery({
    queryKey: ['admin', 'lesson-comment', activeSelectedId],
    queryFn: () => lessonCommentsRepository.getAdminComment(activeSelectedId),
    enabled: Boolean(activeSelectedId),
    retry: false,
  })

  function resetSelectionForFilter() {
    setPage(1)
    setSelectedId('')
    setSelectionCleared(false)
    setMobileDetailOpen(false)
  }

  function refresh() {
    void queryClient.invalidateQueries({ queryKey: ['admin', 'lesson-comments'] })
    void queryClient.invalidateQueries({ queryKey: ['admin', 'lesson-comments-summary'] })
    if (activeSelectedId) {
      void queryClient.invalidateQueries({
        queryKey: ['admin', 'lesson-comment', activeSelectedId],
      })
    }
  }

  const saveEdit = useMutation({
    mutationFn: () =>
      lessonCommentsRepository.editAdminComment(activeSelectedId, {
        content: draft.trim(),
        expectedRevision: detail.data!.comment.revision,
        ...(editReason.trim() ? { reason: editReason.trim() } : {}),
      }),
    onSuccess: () => {
      setEditing(false)
      setEditReason('')
      setEditError('')
      refresh()
    },
    onError: (cause) =>
      setEditError(cause instanceof Error ? cause.message : 'Chưa lưu được nội dung.'),
  })
  const addReply = useMutation({
    mutationFn: (input: { content: string; parentId: string }) =>
      lessonCommentsRepository.createAdminComment(detail.data!.comment.lessonId, input),
    onSuccess: (comment) => {
      setCreateReply(false)
      setSelectedId(comment.id)
      setSelectionCleared(false)
      setMobileDetailOpen(true)
      refresh()
    },
    onError: (cause) =>
      setActionError(cause instanceof Error ? cause.message : 'Chưa gửi được phản hồi.'),
  })
  const setReaction = useMutation({
    mutationFn: async (reactionType: ApiLessonCommentReactionType) =>
      detail.data?.comment.myReaction === reactionType
        ? lessonCommentsRepository.removeAdminReaction(activeSelectedId)
        : lessonCommentsRepository.setAdminReaction(activeSelectedId, reactionType),
    onSuccess: refresh,
    onError: (cause) =>
      setActionError(cause instanceof Error ? cause.message : 'Chưa lưu được reaction.'),
  })
  const removeComment = useMutation({
    mutationFn: () => lessonCommentsRepository.deleteAdminComment(activeSelectedId),
    onSuccess: () => {
      setDeleteOpen(false)
      setSelectedId('')
      setSelectionCleared(true)
      setMobileDetailOpen(false)
      setCreateReply(false)
      setEditing(false)
      refresh()
    },
    onError: (cause) =>
      setActionError(cause instanceof Error ? cause.message : 'Chưa xóa được bình luận.'),
  })

  const deleteRequest = {
    kind: 'confirm' as const,
    title: 'Xóa toàn bộ nhánh thảo luận?',
    description:
      'Bình luận này và toàn bộ phản hồi bên dưới sẽ được ẩn với học viên. Hành động sẽ được ghi vào Audit Log.',
    confirmLabel: 'Xóa nhánh',
    destructive: true,
    onConfirm: async () => {
      await removeComment.mutateAsync()
    },
  }

  const advancedFilterCount = [anonymous, type !== 'ALL' ? type : '', authorId, from, to].filter(
    Boolean,
  ).length
  const hasFilters = Boolean(
    search ||
    courseId ||
    lessonId ||
    authorId ||
    anonymous ||
    status !== 'ALL' ||
    type !== 'ALL' ||
    from ||
    to,
  )
  const lessonFilterOptions = catalogLessonOptions(lessons.data)

  return (
    <div className="grid min-w-0 gap-4 sm:gap-5">
      <header className="flex flex-wrap items-end justify-between gap-3 border-b border-border-subtle pb-4">
        <div className="min-w-0">
          <p className="mb-1 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-action-primary">
            <MessageCircle aria-hidden="true" className="size-4" /> Hộp thư kiểm duyệt
          </p>
          <h1 className="!font-sans text-2xl font-bold tracking-tight text-ink-primary sm:text-3xl">
            Quản lý bình luận
          </h1>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-ink-secondary">
            Theo dõi và xử lý thảo luận trong các bài học.
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)} startIcon={<Plus aria-hidden="true" />}>
          Bình luận mới
        </Button>
      </header>

      <section
        aria-label="Thống kê bình luận"
        className={`flex flex-wrap gap-x-2 gap-y-1 border-b border-border-subtle pb-3 xl:flex-nowrap ${mobileDetailOpen ? 'hidden xl:flex' : ''}`}
      >
        {summary.isPending ? (
          <p className="py-2 text-sm text-ink-secondary">Đang tải thống kê…</p>
        ) : summary.isError ? (
          <AdminLoadError error={summary.error} retry={() => void summary.refetch()} />
        ) : (
          <>
            <SummaryMetric
              label="Tất cả"
              value={summary.data.total}
              icon={<MessageCircle aria-hidden="true" className="size-4" />}
            />
            <SummaryMetric
              label="7 ngày gần đây"
              value={summary.data.recent}
              icon={<CalendarDays aria-hidden="true" className="size-4" />}
            />
            <SummaryMetric
              label="Ẩn danh"
              value={summary.data.anonymous}
              icon={<ShieldCheck aria-hidden="true" className="size-4" />}
            />
            <SummaryMetric
              label="Đã chỉnh sửa"
              value={summary.data.edited}
              icon={<BookOpenText aria-hidden="true" className="size-4" />}
            />
            <SummaryMetric
              label="Đã xóa"
              value={summary.data.deleted}
              icon={<Trash2 aria-hidden="true" className="size-4" />}
            />
          </>
        )}
      </section>

      <section
        aria-label="Bộ lọc bình luận"
        className={`grid gap-3 ${mobileDetailOpen ? 'hidden xl:grid' : ''}`}
      >
        <div className="grid gap-2 sm:grid-cols-[repeat(2,minmax(0,1fr))] xl:grid-cols-[minmax(14rem,1.4fr)_repeat(3,minmax(9rem,1fr))]">
          <label className="relative grid min-w-0 gap-1.5 text-sm font-semibold text-ink-primary sm:col-span-2 xl:col-span-1">
            <span>Tìm bình luận hoặc tác giả</span>
            <span className="relative">
              <Search
                aria-hidden="true"
                className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-ink-muted"
              />
              <input
                type="search"
                value={searchDraft}
                onChange={(event) => setSearchDraft(event.target.value)}
                placeholder="Từ khóa trong nội dung…"
                className="min-h-11 w-full rounded-xl border border-border-subtle bg-white pr-3 pl-9 font-normal outline-none focus-visible:ring-2 focus-visible:ring-action-primary"
              />
            </span>
          </label>
          <AdminSearchSelect
            label="Khóa học"
            value={courseId}
            onChange={(value) => {
              setCourseId(value)
              setSectionId('')
              setLessonId('')
              resetSelectionForFilter()
            }}
            options={catalogCourseOptions(courses.data)}
            placeholder="Tìm khóa học…"
            disabled={courses.isPending || courses.isError}
          />
          <div className="grid content-start gap-1.5">
            <AdminSelect
              label="Chương"
              value={sectionId}
              onChange={(value) => {
                setSectionId(value)
                setLessonId('')
                resetSelectionForFilter()
              }}
              options={[
                { value: '', label: courseId ? 'Tất cả chương' : 'Chọn khóa học trước' },
                ...catalogSectionOptions(sections.data),
              ]}
              disabled={!courseId || sections.isPending || sections.isError}
            />
            {sectionId && (
              <p className="text-[11px] leading-4 text-ink-muted">
                Chương chỉ thu hẹp danh sách bài học bên cạnh; kết quả được lọc theo bài học đã
                chọn.
              </p>
            )}
          </div>
          <AdminSearchSelect
            label="Bài học"
            value={lessonId}
            onChange={(value) => {
              setLessonId(value)
              resetSelectionForFilter()
            }}
            options={lessonFilterOptions}
            placeholder="Tìm bài học…"
            disabled={!sectionId || lessons.isPending || lessons.isError}
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <AdminSelect
            label="Trạng thái"
            value={status}
            onChange={(value) => {
              setStatus(value as CommentStatus)
              resetSelectionForFilter()
            }}
            options={[
              { value: 'ALL', label: 'Mọi trạng thái' },
              { value: 'ACTIVE', label: 'Đang hiển thị' },
              { value: 'DELETED', label: 'Đã xóa' },
            ]}
          />
          <AdminSelect
            label="Sắp xếp"
            value={sort}
            onChange={(value) => {
              setSort(value as 'newest' | 'oldest')
              resetSelectionForFilter()
            }}
            options={[
              { value: 'newest', label: 'Mới nhất' },
              { value: 'oldest', label: 'Cũ nhất' },
            ]}
          />
          <div className="grid gap-1.5 text-sm font-semibold text-ink-primary">
            <span>Bộ lọc khác</span>
            <Popover
              open={advancedOpen}
              onOpenChange={setAdvancedOpen}
              title="Bộ lọc nâng cao"
              className="max-h-[min(75dvh,36rem)] w-[min(25rem,calc(100vw-2rem))] overflow-y-auto"
              trigger={
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  aria-expanded={advancedOpen}
                  aria-haspopup="dialog"
                  className="min-h-11 justify-between font-medium"
                >
                  <span>Bộ lọc nâng cao</span>
                  {advancedFilterCount > 0 && (
                    <span className="grid size-5 place-items-center rounded-full bg-brand-blue text-[11px] font-bold">
                      {advancedFilterCount}
                    </span>
                  )}
                </Button>
              }
            >
              <div className="grid gap-3">
                <AdminSelect
                  label="Người đăng"
                  value={authorId}
                  onChange={(value) => {
                    const author = authors.data?.items.find((student) => student.id === value)
                    setAuthorId(value)
                    setAuthorLabel(author ? `${author.fullName} · ${author.email}` : '')
                    resetSelectionForFilter()
                  }}
                  options={[
                    { value: '', label: authorId ? authorLabel : 'Tìm tên hoặc email bên dưới' },
                    ...(authorId &&
                    authorLabel &&
                    !authors.data?.items.some((item) => item.id === authorId)
                      ? [{ value: authorId, label: authorLabel }]
                      : []),
                    ...(authors.data?.items ?? []).map((student: ApiAdminStudent) => ({
                      value: student.id,
                      label: `${student.fullName} · ${student.email}`,
                    })),
                  ]}
                  disabled={authorSearch.length < 2 || authors.isPending || authors.isError}
                />
                <AdminField
                  label="Tìm tên hoặc email học viên"
                  value={authorSearchDraft}
                  onChange={(value) => {
                    setAuthorSearchDraft(value)
                    if (authorId) {
                      setAuthorId('')
                      setAuthorLabel('')
                      resetSelectionForFilter()
                    }
                  }}
                  placeholder="Nhập ít nhất 2 ký tự"
                />
                {authors.isPending && authorSearch.length >= 2 && (
                  <p className="text-xs text-ink-muted">Đang tìm học viên…</p>
                )}
                {authors.isError && (
                  <p role="alert" className="text-xs text-danger-foreground">
                    Chưa tìm được danh sách học viên.
                  </p>
                )}
                <AdminSelect
                  label="Danh tính với học viên"
                  value={anonymous}
                  onChange={(value) => {
                    setAnonymous(value)
                    resetSelectionForFilter()
                  }}
                  options={[
                    { value: '', label: 'Ẩn danh và công khai' },
                    { value: 'true', label: 'Đăng ẩn danh' },
                    { value: 'false', label: 'Đăng công khai' },
                  ]}
                />
                <AdminSelect
                  label="Loại bình luận"
                  value={type}
                  onChange={(value) => {
                    setType(value as CommentType)
                    resetSelectionForFilter()
                  }}
                  options={[
                    { value: 'ALL', label: 'Bình luận và phản hồi' },
                    { value: 'ROOT', label: 'Bình luận gốc' },
                    { value: 'REPLY', label: 'Phản hồi' },
                  ]}
                />
                <div className="grid grid-cols-2 gap-2">
                  <AdminField
                    label="Từ ngày"
                    type="date"
                    value={from}
                    onChange={(value) => {
                      setFrom(value)
                      resetSelectionForFilter()
                    }}
                  />
                  <AdminField
                    label="Đến ngày"
                    type="date"
                    value={to}
                    onChange={(value) => {
                      setTo(value)
                      resetSelectionForFilter()
                    }}
                  />
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="justify-start"
                  onClick={() => {
                    setAnonymous('')
                    setType('ALL')
                    setAuthorId('')
                    setAuthorLabel('')
                    setAuthorSearchDraft('')
                    setFrom('')
                    setTo('')
                    resetSelectionForFilter()
                  }}
                >
                  Xóa bộ lọc nâng cao
                </Button>
              </div>
            </Popover>
          </div>
          {hasFilters && (
            <Button
              variant="ghost"
              size="sm"
              className="mt-6 text-ink-secondary"
              onClick={() => {
                setSearchDraft('')
                setSearch('')
                setCourseId('')
                setSectionId('')
                setLessonId('')
                setAuthorSearchDraft('')
                setAuthorSearch('')
                setAuthorId('')
                setAuthorLabel('')
                setAnonymous('')
                setStatus('ALL')
                setType('ALL')
                setFrom('')
                setTo('')
                setSort('newest')
                resetSelectionForFilter()
              }}
            >
              Xóa tất cả bộ lọc
            </Button>
          )}
          <p className="ml-auto self-end pb-2 text-xs text-ink-secondary">
            {hasFilters ? 'Đang áp dụng bộ lọc' : 'Hiển thị thảo luận mới nhất'}
          </p>
        </div>
      </section>

      <div className="grid min-w-0 gap-4 xl:grid-cols-[minmax(21rem,0.4fr)_minmax(0,0.6fr)] xl:items-start">
        <section
          aria-labelledby="comment-inbox-heading"
          className={`min-w-0 overflow-hidden rounded-2xl border border-border-subtle bg-white ${mobileDetailOpen ? 'hidden xl:block' : 'block'} xl:sticky xl:top-24 xl:flex xl:max-h-[calc(100dvh-8rem)] xl:flex-col`}
        >
          <header className="flex items-center justify-between gap-3 border-b border-border-subtle px-4 py-3">
            <div>
              <h2 id="comment-inbox-heading" className="font-semibold">
                Hộp thư
              </h2>
              <p className="text-xs text-ink-muted">
                {list.data ? `${list.data.total.toLocaleString('vi-VN')} kết quả` : 'Đang tải'}
              </p>
            </div>
            {hasFilters && (
              <span className="rounded-full bg-surface-blue px-2.5 py-1 text-xs font-medium text-ink-primary">
                Đã lọc
              </span>
            )}
          </header>

          {list.isPending ? (
            <div className="p-4">
              <AdminLoading />
            </div>
          ) : list.isError ? (
            <div className="p-4">
              <AdminLoadError error={list.error} retry={() => void list.refetch()} />
            </div>
          ) : list.data.items.length ? (
            <>
              <ul
                aria-label="Danh sách bình luận"
                className="grid min-h-0 divide-y divide-border-subtle overflow-y-auto p-2 xl:flex-1"
              >
                {list.data.items.map((item) => (
                  <li key={item.id}>
                    <button
                      type="button"
                      aria-current={activeSelectedId === item.id ? 'true' : undefined}
                      aria-label={`Mở bình luận của ${item.author?.fullName ?? 'tài khoản đã xóa'}: ${item.content.slice(0, 100)}`}
                      onClick={() => {
                        setSelectedId(item.id)
                        setSelectionCleared(false)
                        setMobileDetailOpen(true)
                      }}
                      className={`relative grid w-full min-w-0 gap-1.5 rounded-xl px-3 py-3 text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-action-focus ${activeSelectedId === item.id ? 'bg-brand-blue/35 before:absolute before:inset-y-2 before:left-0 before:w-1 before:rounded-full before:bg-action-primary' : 'hover:bg-surface-muted'}`}
                    >
                      <span className="flex min-w-0 items-center justify-between gap-3">
                        <span className="flex min-w-0 items-center gap-2 font-semibold">
                          <span
                            aria-hidden="true"
                            className="grid size-7 shrink-0 place-items-center rounded-full bg-surface-blue text-xs text-action-primary"
                          >
                            {(item.author?.fullName ?? '?').slice(0, 1).toUpperCase()}
                          </span>
                          <span className="truncate">
                            {item.author?.fullName ?? 'Tài khoản đã xóa'}
                          </span>
                        </span>
                        <time
                          dateTime={item.createdAt}
                          className="shrink-0 text-xs text-ink-secondary"
                        >
                          {dateTime(item.createdAt)}
                        </time>
                      </span>
                      <span className="line-clamp-2 whitespace-pre-wrap break-words pl-9 text-sm leading-5 text-ink-secondary">
                        {item.content}
                      </span>
                      <span className="truncate pl-9 text-xs text-ink-secondary">
                        {item.context.courseTitle ?? 'Khóa học'} ·{' '}
                        {item.context.lessonTitle ?? 'Bài học'}
                      </span>
                      <span className="flex flex-wrap items-center gap-x-3 gap-y-1 pl-9 text-[11px] text-ink-secondary">
                        {item.isAnonymous && <span>Đăng ẩn danh</span>}
                        {item.replyCount > 0 && <span>{item.replyCount} phản hồi</span>}
                        {item.reactionCount > 0 && <span>{item.reactionCount} reaction</span>}
                        {item.editedAt && <span>Đã chỉnh sửa</span>}
                        {item.deletedAt && (
                          <span className="font-semibold text-danger-foreground">Đã xóa</span>
                        )}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
              <div className="grid gap-2 border-t border-border-subtle px-3 py-3">
                <p className="text-center text-xs text-ink-muted">
                  Trang {page} · {list.data.total.toLocaleString('vi-VN')} bình luận
                </p>
                <Pagination
                  page={page}
                  pages={Math.max(1, Math.ceil(list.data.total / list.data.pageSize))}
                  onPageChange={(nextPage) => {
                    setPage(nextPage)
                    setSelectedId('')
                    setSelectionCleared(false)
                    setMobileDetailOpen(false)
                  }}
                />
              </div>
            </>
          ) : (
            <div className="grid min-h-48 content-center justify-items-center gap-2 px-6 py-8 text-center">
              <MessageCircle aria-hidden="true" className="size-7 text-ink-muted" />
              <p className="font-semibold">Không tìm thấy bình luận</p>
              <p className="text-sm text-ink-secondary">Thử đổi từ khóa hoặc xóa bớt bộ lọc.</p>
            </div>
          )}
        </section>

        <section
          aria-label="Chi tiết bình luận đã chọn"
          className={`min-w-0 ${mobileDetailOpen ? 'block' : 'hidden'} xl:block`}
        >
          <div className="min-w-0 overflow-hidden rounded-2xl border border-border-subtle bg-white xl:sticky xl:top-24 xl:max-h-[calc(100dvh-8rem)] xl:overflow-y-auto">
            <div className="border-b border-border-subtle px-4 py-3 sm:px-5">
              <Button
                variant="ghost"
                size="sm"
                className="-ml-2 mb-2 xl:hidden"
                startIcon={<ArrowLeft aria-hidden="true" />}
                onClick={() => setMobileDetailOpen(false)}
              >
                Trở lại hộp thư
              </Button>
              <p className="text-xs font-bold uppercase tracking-[0.12em] text-action-primary">
                Chi tiết bình luận
              </p>
              {activeSelectedId && detail.data && (
                <p className="mt-1 text-sm text-ink-secondary">
                  {detail.data.comment.context.courseTitle ?? 'Khóa học'} ·{' '}
                  {detail.data.comment.context.lessonTitle ?? 'Bài học'}
                </p>
              )}
            </div>

            {!activeSelectedId ? (
              <div className="grid min-h-72 content-center justify-items-center gap-2 px-6 py-8 text-center">
                <MessageCircle aria-hidden="true" className="size-8 text-ink-muted" />
                <p className="font-semibold">Chọn một bình luận để xem chi tiết</p>
                <p className="max-w-sm text-sm text-ink-secondary">
                  Danh tính tác giả, nhánh trao đổi và các thao tác kiểm duyệt sẽ hiện tại đây.
                </p>
              </div>
            ) : detail.isPending ? (
              <div className="p-5">
                <AdminLoading />
              </div>
            ) : detail.isError ? (
              <div className="p-5">
                <AdminLoadError error={detail.error} retry={() => void detail.refetch()} />
              </div>
            ) : (
              <AdminCommentDetail
                detail={detail.data}
                editing={editing}
                draft={draft}
                editReason={editReason}
                editError={editError}
                savingEdit={saveEdit.isPending}
                creatingReply={createReply}
                savingReply={addReply.isPending}
                replyError={actionError}
                reactionPending={setReaction.isPending}
                onDraftChange={setDraft}
                onReasonChange={setEditReason}
                onSaveEdit={() => saveEdit.mutate()}
                onCancelEdit={() => {
                  setEditing(false)
                  setDraft(detail.data.comment.content)
                  setEditReason('')
                  setEditError('')
                }}
                onStartEdit={() => {
                  setDraft(detail.data.comment.content)
                  setEditing(true)
                  setCreateReply(false)
                }}
                onReply={() => {
                  setActionError('')
                  setCreateReply((value) => !value)
                  setEditing(false)
                }}
                onSubmitReply={(content) =>
                  addReply.mutateAsync({ content, parentId: detail.data.comment.id })
                }
                onCancelReply={() => setCreateReply(false)}
                onReaction={(reaction) => setReaction.mutate(reaction)}
                onDelete={() => setDeleteOpen(true)}
                onHistory={() => setHistoryOpen(true)}
                onSelectThreadComment={(comment) => {
                  setSelectedId(comment.id)
                  setSelectionCleared(false)
                }}
              />
            )}
          </div>
        </section>
      </div>

      <AdminCreateCommentDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={(comment) => {
          setSelectedId(comment.id)
          setSelectionCleared(false)
          setMobileDetailOpen(true)
          refresh()
        }}
      />

      <AdminHistoryDialog
        open={historyOpen}
        onOpenChange={setHistoryOpen}
        items={detail.data?.history ?? []}
      />
      <ConfirmDialog open={deleteOpen} request={deleteRequest} onOpenChange={setDeleteOpen} />
    </div>
  )
}

function AdminCommentDetail({
  detail,
  editing,
  draft,
  editReason,
  editError,
  savingEdit,
  creatingReply,
  savingReply,
  replyError,
  reactionPending,
  onDraftChange,
  onReasonChange,
  onSaveEdit,
  onCancelEdit,
  onStartEdit,
  onReply,
  onSubmitReply,
  onCancelReply,
  onReaction,
  onDelete,
  onHistory,
  onSelectThreadComment,
}: {
  detail: {
    comment: ApiAdminLessonComment
    thread: ApiAdminLessonComment[]
    threadTotal: number
    threadHasMore: boolean
    history: ApiLessonCommentHistoryItem[]
  }
  editing: boolean
  draft: string
  editReason: string
  editError: string
  savingEdit: boolean
  creatingReply: boolean
  savingReply: boolean
  replyError: string
  reactionPending: boolean
  onDraftChange: (value: string) => void
  onReasonChange: (value: string) => void
  onSaveEdit: () => void
  onCancelEdit: () => void
  onStartEdit: () => void
  onReply: () => void
  onSubmitReply: (content: string) => Promise<unknown>
  onCancelReply: () => void
  onReaction: (reaction: ApiLessonCommentReactionType) => void
  onDelete: () => void
  onHistory: () => void
  onSelectThreadComment: (comment: ApiAdminLessonComment) => void
}) {
  const comment = detail.comment
  const isDeleted = Boolean(comment.deletedAt)
  const visibleThread = detail.thread.slice(0, 100)
  const threadItems =
    visibleThread.some((item) => item.id === comment.id) ||
    visibleThread.length >= detail.thread.length
      ? visibleThread
      : [...visibleThread, comment]

  return (
    <div className="grid min-w-0 gap-5 p-4 sm:p-5">
      <div className="grid min-w-0 gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(15rem,0.48fr)]">
        <div className="grid min-w-0 content-start gap-4">
          <section aria-labelledby="selected-comment-content" className="grid gap-3">
            <div className="flex min-w-0 items-start justify-between gap-3">
              <div className="flex min-w-0 items-start gap-3">
                <span
                  aria-hidden="true"
                  className="grid size-10 shrink-0 place-items-center rounded-full bg-surface-blue font-semibold text-action-primary"
                >
                  {(comment.author?.fullName ?? '?').slice(0, 1).toUpperCase()}
                </span>
                <div className="min-w-0">
                  <h2 id="selected-comment-content" className="truncate font-semibold">
                    {comment.author?.fullName ?? 'Tài khoản đã xóa'}
                  </h2>
                  <p className="break-all text-xs text-ink-secondary">
                    {comment.author?.email ?? 'Không còn email'} ·{' '}
                    {comment.author?.role ?? 'Không rõ vai trò'}
                  </p>
                </div>
              </div>
              <DropdownMenu
                label="Thao tác"
                trigger={
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label="Thao tác kiểm duyệt"
                    className="size-9 min-h-9 rounded-full"
                  >
                    <MoreHorizontal aria-hidden="true" />
                  </Button>
                }
                items={[
                  {
                    label: 'Chỉnh sửa',
                    onSelect: onStartEdit,
                    disabled: isDeleted || editing,
                  },
                  {
                    label: `Lịch sử chỉnh sửa (${detail.history.length})`,
                    onSelect: onHistory,
                    disabled: detail.history.length === 0,
                  },
                  {
                    label: 'Xóa toàn bộ nhánh',
                    onSelect: onDelete,
                    disabled: isDeleted,
                    destructive: true,
                  },
                ]}
              />
            </div>
            {comment.isAnonymous && (
              <p className="w-fit rounded-full bg-surface-muted px-2.5 py-1 text-xs font-medium text-ink-secondary">
                Được đăng ẩn danh với học viên
              </p>
            )}
            <p className="text-xs text-ink-muted">
              <span className="font-medium text-ink-secondary">
                {comment.author?.role === 'ADMIN' ? 'Quản trị viên' : 'Học viên'}
              </span>
              {' · '}Tạo {dateTime(comment.createdAt)}
              {comment.editedAt && ` · Đã sửa ${dateTime(comment.editedAt)}`}
              {comment.deletedAt && ` · Đã xóa ${dateTime(comment.deletedAt)}`}
            </p>
            <nav
              aria-label="Vị trí bài học"
              className="flex flex-wrap items-center gap-x-1.5 text-xs text-ink-secondary"
            >
              <span>{comment.context.courseTitle ?? 'Khóa học không còn khả dụng'}</span>
              <span aria-hidden="true">/</span>
              <span>{comment.context.sectionTitle ?? 'Chương'}</span>
              <span aria-hidden="true">/</span>
              <span className="font-semibold text-ink-primary">
                {comment.context.lessonTitle ?? 'Bài học không còn khả dụng'}
              </span>
            </nav>

            {editing ? (
              <div className="grid gap-3 border-y border-border-subtle py-4">
                <label className="grid gap-1.5 text-sm font-semibold">
                  Nội dung bình luận
                  <textarea
                    aria-label="Chỉnh sửa bình luận"
                    value={draft}
                    onChange={(event) => onDraftChange(event.target.value)}
                    rows={5}
                    maxLength={2_000}
                    className="w-full resize-y rounded-xl border border-border-subtle bg-white px-3 py-2.5 font-normal leading-6 outline-none focus-visible:ring-2 focus-visible:ring-action-primary"
                  />
                </label>
                <div className="flex items-center justify-between gap-2 text-xs text-ink-muted">
                  <span className="tabular-nums">{draft.length}/2.000</span>
                  <span>expectedRevision: {comment.revision}</span>
                </div>
                <label className="grid gap-1.5 text-sm font-semibold">
                  Lý do kiểm duyệt <span className="font-normal text-ink-muted">(tùy chọn)</span>
                  <input
                    value={editReason}
                    onChange={(event) => onReasonChange(event.target.value)}
                    maxLength={300}
                    className="min-h-10 rounded-xl border border-border-subtle px-3 font-normal outline-none focus-visible:ring-2 focus-visible:ring-action-primary"
                  />
                </label>
                {editError && (
                  <p role="alert" className="text-sm text-danger-foreground">
                    {editError}
                  </p>
                )}
                <div className="flex justify-end gap-2">
                  <Button variant="outline" size="sm" onClick={onCancelEdit}>
                    Hủy
                  </Button>
                  <Button
                    size="sm"
                    loading={savingEdit}
                    disabled={!draft.trim()}
                    onClick={onSaveEdit}
                  >
                    Lưu nội dung
                  </Button>
                </div>
              </div>
            ) : (
              <p
                className={`whitespace-pre-wrap break-words border-y border-border-subtle py-4 text-[15px] leading-6 ${isDeleted ? 'text-ink-secondary line-through' : 'text-ink-primary'}`}
              >
                {comment.content}
              </p>
            )}

            {comment.deletionReason && (
              <p className="text-xs text-ink-secondary">Lý do xóa: {comment.deletionReason}</p>
            )}
          </section>

          <section aria-label="Thao tác bình luận" className="grid gap-3">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <CommentReactionControl
                reactions={comment.reactions}
                activeReaction={comment.myReaction}
                disabled={isDeleted || reactionPending}
                onSelect={onReaction}
              />
              <Button
                size="sm"
                variant="ghost"
                disabled={isDeleted}
                onClick={onReply}
                aria-expanded={creatingReply}
              >
                Trả lời
              </Button>
            </div>
            {creatingReply && (
              <AdminReplyComposer
                onCancel={onCancelReply}
                onSubmit={onSubmitReply}
                saving={savingReply}
                error={replyError}
              />
            )}
            {!creatingReply && replyError && (
              <p role="alert" className="text-sm text-danger-foreground">
                {replyError}
              </p>
            )}
          </section>
        </div>

        <aside aria-label="Nhánh thảo luận" className="grid min-w-0 content-start gap-2">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-sm font-semibold">Nhánh thảo luận</h3>
            <span className="text-xs tabular-nums text-ink-muted">{detail.threadTotal}</span>
          </div>
          {detail.threadHasMore && (
            <p className="text-xs leading-5 text-ink-muted">
              Danh sách API bị giới hạn. Dùng bộ lọc để tìm phản hồi cụ thể nếu không thấy trong
              nhánh này.
            </p>
          )}
          {detail.thread.length > 100 && (
            <p className="text-xs leading-5 text-ink-muted">
              Hiển thị 100 mục đầu để giữ phần chi tiết gọn.
            </p>
          )}
          <div className="max-h-80 overflow-y-auto border-l border-border-subtle pl-2">
            <ul className="grid gap-1">
              {threadItems.map((item) => (
                <li key={item.id}>
                  <ThreadCommentButton
                    item={item}
                    selected={item.id === comment.id}
                    onClick={() => onSelectThreadComment(item)}
                  />
                </li>
              ))}
            </ul>
          </div>
        </aside>
      </div>
    </div>
  )
}

function ThreadCommentButton({
  item,
  selected,
  onClick,
}: {
  item: ApiAdminLessonComment
  selected: boolean
  onClick: () => void
}) {
  const depth = Math.min(item.depth, 4)
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={selected ? 'true' : undefined}
      className={`grid w-full min-w-0 gap-1 rounded-lg border-l-2 px-2 py-2 text-left text-sm focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-action-focus ${selected ? 'border-action-primary bg-brand-blue/30' : 'border-transparent hover:bg-surface-muted'}`}
      style={{ marginInlineStart: `${depth * 0.5}rem`, maxWidth: `calc(100% - ${depth * 0.5}rem)` }}
    >
      <span className="flex min-w-0 items-center gap-2 font-medium">
        <span className="truncate">{item.author?.fullName ?? 'Tài khoản đã xóa'}</span>
        {item.isAnonymous && (
          <span className="shrink-0 text-[10px] text-ink-secondary">Ẩn danh</span>
        )}
        {item.deletedAt && (
          <span className="shrink-0 text-[10px] text-danger-foreground">Đã xóa</span>
        )}
      </span>
      <span className="line-clamp-2 whitespace-pre-wrap break-words text-xs leading-5 text-ink-secondary">
        {item.content}
      </span>
      <span className="text-[10px] text-ink-secondary">{dateTime(item.createdAt)}</span>
    </button>
  )
}

function AdminReplyComposer({
  onCancel,
  onSubmit,
  saving,
  error,
}: {
  onCancel: () => void
  onSubmit: (content: string) => Promise<unknown>
  saving: boolean
  error: string
}) {
  const [content, setContent] = useState('')
  const [localError, setLocalError] = useState('')

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!content.trim() || content.trim().length > 2_000) return
    setLocalError('')
    try {
      await onSubmit(content.trim())
    } catch (cause) {
      setLocalError(cause instanceof Error ? cause.message : 'Phản hồi chưa được lưu.')
    }
  }

  return (
    <form
      onSubmit={(event) => void submit(event)}
      className="grid gap-2 rounded-xl bg-surface-muted/70 p-3"
    >
      <label className="grid gap-1.5 text-sm font-semibold">
        Phản hồi với tư cách quản trị viên
        <textarea
          aria-label="Phản hồi với tư cách quản trị viên"
          value={content}
          onChange={(event) => setContent(event.target.value)}
          rows={3}
          maxLength={2_000}
          className="w-full rounded-lg border border-border-subtle bg-white px-3 py-2.5 font-normal leading-6 outline-none focus-visible:ring-2 focus-visible:ring-action-primary"
        />
      </label>
      <div className="flex items-center justify-between gap-2 text-xs text-ink-muted">
        <span className="tabular-nums">{content.length}/2.000</span>
        <div className="flex gap-2">
          <Button type="button" variant="outline" size="sm" onClick={onCancel}>
            Hủy
          </Button>
          <Button type="submit" size="sm" loading={saving} disabled={!content.trim()}>
            Gửi phản hồi
          </Button>
        </div>
      </div>
      {(error || localError) && (
        <p role="alert" className="text-sm text-danger-foreground">
          {error || localError}
        </p>
      )}
    </form>
  )
}

function AdminHistoryDialog({
  open,
  onOpenChange,
  items,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  items: ApiLessonCommentHistoryItem[]
}) {
  return (
    <BaseDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Lịch sử chỉnh sửa"
      description="Nội dung trước/sau, người sửa và lý do kiểm duyệt."
      size="wide"
      footer={
        <Button variant="outline" onClick={() => onOpenChange(false)}>
          Đóng
        </Button>
      }
    >
      {items.length ? (
        <ol className="grid gap-4">
          {items.map((item, index) => (
            <li
              key={item.id ?? `${item.newRevision}-${index}`}
              className="border-b border-border-subtle pb-4 last:border-b-0"
            >
              <p className="text-xs font-semibold text-ink-secondary">
                Phiên bản {item.previousRevision} → {item.newRevision} · {dateTime(item.editedAt)}
              </p>
              <p className="mt-1 text-xs text-ink-muted">
                {item.editedBy
                  ? `${item.editedBy.fullName} · ${item.editedBy.email} · ${item.editedBy.role}`
                  : 'Tài khoản đã xóa'}
                {item.reason ? ` · Lý do: ${item.reason}` : ''}
              </p>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <div>
                  <p className="mb-1 text-xs font-semibold text-ink-secondary">Nội dung trước</p>
                  <p className="whitespace-pre-wrap break-words rounded-lg bg-surface-muted p-3 text-sm leading-6">
                    {item.previousContent}
                  </p>
                </div>
                <div>
                  <p className="mb-1 text-xs font-semibold text-ink-secondary">Nội dung sau</p>
                  <p className="whitespace-pre-wrap break-words rounded-lg bg-surface-blue p-3 text-sm leading-6">
                    {item.newContent}
                  </p>
                </div>
              </div>
            </li>
          ))}
        </ol>
      ) : (
        <p className="text-sm text-ink-secondary">Chưa có lịch sử chỉnh sửa.</p>
      )}
    </BaseDialog>
  )
}
