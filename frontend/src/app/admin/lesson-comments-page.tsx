import { useEffect, useState, type FormEvent, type ReactNode } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router'
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
import { DecorativeHeading } from '@/domains/shared/decorative-heading'
import { Button, DropdownMenu, PageHeader, Pagination, Popover } from '@/shared/ui'
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

function groupCommentsByLesson(comments: readonly ApiAdminLessonComment[]) {
  const groups = new Map<
    string,
    {
      lessonId: string
      courseTitle: string | null
      sectionTitle: string | null
      lessonTitle: string | null
      comments: ApiAdminLessonComment[]
    }
  >()

  for (const comment of comments) {
    if (comment.parentId !== null) continue
    const lessonId = comment.context.lessonId
    const group = groups.get(lessonId) ?? {
      lessonId,
      courseTitle: comment.context.courseTitle,
      sectionTitle: comment.context.sectionTitle,
      lessonTitle: comment.context.lessonTitle,
      comments: [],
    }
    group.comments.push(comment)
    groups.set(lessonId, group)
  }

  return [...groups.values()]
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
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [sort, setSort] = useState<'newest' | 'oldest'>('newest')
  const [page, setPage] = useState(1)
  const [selectedId, setSelectedId] = useState('')
  const [focusedThreadCommentId, setFocusedThreadCommentId] = useState('')
  const [selectionCleared, setSelectionCleared] = useState(false)
  const [mobileDetailOpen, setMobileDetailOpen] = useState(false)
  const [advancedOpen, setAdvancedOpen] = useState(false)
  const [createOpen, setCreateOpen] = useState(false)
  const [replyToId, setReplyToId] = useState('')
  const [editingId, setEditingId] = useState('')
  const [draft, setDraft] = useState('')
  const [editReason, setEditReason] = useState('')
  const [editError, setEditError] = useState('')
  const [deleteCommentId, setDeleteCommentId] = useState('')
  const [historyCommentId, setHistoryCommentId] = useState('')
  const [actionError, setActionError] = useState('')

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setSearch(searchDraft.trim())
      setPage(1)
      setSelectedId('')
      setFocusedThreadCommentId('')
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
    type: 'ROOT' as const,
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
  const inboxGroups = groupCommentsByLesson(list.data?.items ?? [])
  const detail = useQuery({
    queryKey: ['admin', 'lesson-comment', activeSelectedId],
    queryFn: () => lessonCommentsRepository.getAdminComment(activeSelectedId),
    enabled: Boolean(activeSelectedId),
    retry: false,
  })
  const history = useQuery({
    queryKey: ['admin', 'lesson-comment-history', historyCommentId],
    queryFn: () => lessonCommentsRepository.adminHistory(historyCommentId),
    enabled: Boolean(historyCommentId),
    retry: false,
  })

  function resetSelectionForFilter() {
    setPage(1)
    setSelectedId('')
    setFocusedThreadCommentId('')
    setSelectionCleared(false)
    setMobileDetailOpen(false)
  }

  function refresh() {
    void queryClient.invalidateQueries({ queryKey: ['admin', 'lesson-comments'] })
    void queryClient.invalidateQueries({ queryKey: ['admin', 'lesson-comments-summary'] })
    void queryClient.invalidateQueries({ queryKey: ['admin', 'lesson-comment'] })
    void queryClient.invalidateQueries({ queryKey: ['admin', 'lesson-comment-history'] })
  }

  const saveEdit = useMutation({
    mutationFn: (comment: ApiAdminLessonComment) =>
      lessonCommentsRepository.editAdminComment(comment.id, {
        content: draft.trim(),
        expectedRevision: comment.revision,
        ...(editReason.trim() ? { reason: editReason.trim() } : {}),
      }),
    onSuccess: () => {
      setEditingId('')
      setEditReason('')
      setEditError('')
      setActionError('')
      refresh()
    },
    onError: (cause) =>
      setEditError(cause instanceof Error ? cause.message : 'Chưa lưu được nội dung.'),
  })
  const addReply = useMutation({
    mutationFn: (input: { content: string; parentId: string; lessonId: string }) =>
      lessonCommentsRepository.createAdminComment(input.lessonId, input),
    onSuccess: (comment) => {
      setReplyToId('')
      setActionError('')
      setSelectedId(comment.rootId)
      setFocusedThreadCommentId(comment.id)
      setSelectionCleared(false)
      setMobileDetailOpen(true)
      refresh()
    },
    onError: (cause) =>
      setActionError(cause instanceof Error ? cause.message : 'Chưa gửi được phản hồi.'),
  })
  const setReaction = useMutation({
    mutationFn: async (input: {
      commentId: string
      reactionType: ApiLessonCommentReactionType
      currentReaction: ApiLessonCommentReactionType | null
    }) =>
      input.currentReaction === input.reactionType
        ? lessonCommentsRepository.removeAdminReaction(input.commentId)
        : lessonCommentsRepository.setAdminReaction(input.commentId, input.reactionType),
    onSuccess: () => {
      setActionError('')
      refresh()
    },
    onError: (cause) =>
      setActionError(cause instanceof Error ? cause.message : 'Chưa lưu được reaction.'),
  })
  const removeComment = useMutation({
    mutationFn: (commentId: string) => lessonCommentsRepository.deleteAdminComment(commentId),
    onSuccess: (_result, commentId) => {
      setActionError('')
      setDeleteCommentId('')
      setEditingId((value) => (value === commentId ? '' : value))
      setReplyToId((value) => (value === commentId ? '' : value))
      refresh()
    },
    onError: (cause) =>
      setActionError(cause instanceof Error ? cause.message : 'Chưa xóa được bình luận.'),
  })

  const deleteRequest = {
    kind: 'confirm' as const,
    title: 'Xóa bình luận này?',
    description:
      'Chỉ bình luận đã chọn sẽ được gỡ. Các phản hồi bên dưới vẫn được giữ để học viên đọc. Hành động sẽ được ghi vào Audit Log.',
    confirmLabel: 'Xóa bình luận',
    destructive: true,
    onConfirm: async () => {
      if (deleteCommentId) await removeComment.mutateAsync(deleteCommentId)
    },
  }

  const advancedFilterCount = [anonymous, authorId, from, to].filter(Boolean).length
  const hasFilters = Boolean(
    search || courseId || lessonId || authorId || anonymous || status !== 'ALL' || from || to,
  )
  const lessonFilterOptions = catalogLessonOptions(lessons.data)

  return (
    <div className="grid min-w-0 gap-4 sm:gap-5">
      <PageHeader
        eyebrow="Khu vực quản trị"
        title="Quản lý bình luận"
        heading={
          <DecorativeHeading text="Quản lý bình luận" level={1} size="md" className="mt-1" />
        }
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button onClick={() => setCreateOpen(true)} startIcon={<Plus aria-hidden="true" />}>
              Bình luận mới
            </Button>
            <Link
              to="/admin"
              className="inline-flex min-h-10 items-center gap-2 rounded-xl px-3 text-sm font-semibold text-action-primary hover:bg-white"
            >
              <ArrowLeft aria-hidden="true" className="size-4" />
              Tổng quan
            </Link>
          </div>
        }
        className="items-center gap-4 border-b border-border-subtle pb-5"
      />

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
                {list.data
                  ? `${list.data.total.toLocaleString('vi-VN')} bình luận gốc`
                  : 'Đang tải'}
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
                aria-label="Danh sách bình luận gốc theo bài học"
                className="grid min-h-0 content-start gap-3 overflow-y-auto p-2 xl:flex-1"
              >
                {inboxGroups.map((group) => (
                  <li key={group.lessonId}>
                    <section aria-labelledby={`lesson-inbox-${group.lessonId}`}>
                      <header className="px-3 pb-1 pt-2">
                        <h3
                          id={`lesson-inbox-${group.lessonId}`}
                          className="text-sm font-bold text-ink-primary"
                        >
                          {group.lessonTitle ?? 'Bài học không còn khả dụng'}
                        </h3>
                        <p className="mt-0.5 text-xs text-ink-secondary">
                          {group.courseTitle ?? 'Khóa học'} · {group.sectionTitle ?? 'Chương'}
                        </p>
                      </header>
                      <ul className="grid divide-y divide-border-subtle">
                        {group.comments.map((item) => (
                          <li key={item.id}>
                            <button
                              type="button"
                              aria-current={activeSelectedId === item.id ? 'true' : undefined}
                              aria-label={`Mở bình luận của ${item.author?.fullName ?? 'tài khoản đã xóa'}: ${item.content.slice(0, 100)}`}
                              onClick={() => {
                                setSelectedId(item.id)
                                setFocusedThreadCommentId(item.id)
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
                              <span className="flex flex-wrap items-center gap-x-3 gap-y-1 pl-9 text-[11px] text-ink-secondary">
                                {item.isAnonymous && <span>Đăng ẩn danh</span>}
                                {item.replyCount > 0 && <span>{item.replyCount} phản hồi</span>}
                                {item.reactionCount > 0 && (
                                  <span>{item.reactionCount} reaction</span>
                                )}
                                {item.editedAt && <span>Đã chỉnh sửa</span>}
                                {item.deletedAt && (
                                  <span className="font-semibold text-danger-foreground">
                                    Đã xóa
                                  </span>
                                )}
                              </span>
                            </button>
                          </li>
                        ))}
                      </ul>
                    </section>
                  </li>
                ))}
              </ul>
              <div className="grid gap-2 border-t border-border-subtle px-3 py-3">
                <p className="text-center text-xs text-ink-muted">
                  Trang {page} · {list.data.total.toLocaleString('vi-VN')} bình luận gốc
                </p>
                <Pagination
                  page={page}
                  pages={Math.max(1, Math.ceil(list.data.total / list.data.pageSize))}
                  onPageChange={(nextPage) => {
                    setPage(nextPage)
                    setSelectedId('')
                    setFocusedThreadCommentId('')
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
          aria-label="Chi tiết đoạn bình luận"
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
                Chi tiết đoạn bình luận
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
                  Cây thảo luận và thao tác kiểm duyệt theo từng bình luận sẽ hiện tại đây.
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
                selectedCommentId={focusedThreadCommentId || activeSelectedId}
                editingId={editingId}
                draft={draft}
                editReason={editReason}
                editError={editError}
                savingEdit={saveEdit.isPending}
                replyToId={replyToId}
                savingReply={addReply.isPending}
                replyError={actionError}
                reactionPending={setReaction.isPending}
                onDraftChange={setDraft}
                onReasonChange={setEditReason}
                onSaveEdit={(comment) => saveEdit.mutate(comment)}
                onCancelEdit={(comment) => {
                  setEditingId('')
                  setDraft(comment.content)
                  setEditReason('')
                  setEditError('')
                }}
                onStartEdit={(comment) => {
                  setDraft(comment.content)
                  setEditReason('')
                  setEditError('')
                  setActionError('')
                  setEditingId(comment.id)
                  setReplyToId('')
                }}
                onReply={(comment) => {
                  setActionError('')
                  setReplyToId((value) => (value === comment.id ? '' : comment.id))
                  setEditingId('')
                }}
                onSubmitReply={(comment, content) =>
                  addReply.mutateAsync({
                    content,
                    parentId: comment.id,
                    lessonId: comment.lessonId,
                  })
                }
                onCancelReply={(comment) =>
                  setReplyToId((value) => (value === comment.id ? '' : value))
                }
                onReaction={(comment, reactionType) => {
                  setActionError('')
                  setReaction.mutate({
                    commentId: comment.id,
                    reactionType,
                    currentReaction: comment.myReaction,
                  })
                }}
                onDelete={(comment) => {
                  setActionError('')
                  setDeleteCommentId(comment.id)
                }}
                onHistory={(comment) => setHistoryCommentId(comment.id)}
                onSelectThreadComment={(comment) => {
                  setFocusedThreadCommentId(comment.id)
                  setMobileDetailOpen(true)
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
          setFocusedThreadCommentId(comment.id)
          setSelectionCleared(false)
          setMobileDetailOpen(true)
          refresh()
        }}
      />

      <AdminHistoryDialog
        open={Boolean(historyCommentId)}
        onOpenChange={(open) => {
          if (!open) setHistoryCommentId('')
        }}
        items={history.data ?? []}
        loading={history.isPending}
        error={history.isError ? history.error.message : ''}
      />
      <ConfirmDialog
        open={Boolean(deleteCommentId)}
        request={deleteRequest}
        onOpenChange={(open) => {
          if (!open) setDeleteCommentId('')
        }}
      />
    </div>
  )
}

type AdminThreadTreeNode = {
  comment: ApiAdminLessonComment
  children: AdminThreadTreeNode[]
}

function buildAdminThreadTree(comments: readonly ApiAdminLessonComment[]) {
  const nodes = comments.map((comment) => ({ comment, children: [] as AdminThreadTreeNode[] }))
  const byId = new Map(nodes.map((node) => [node.comment.id, node]))
  const roots: AdminThreadTreeNode[] = []

  for (const node of nodes) {
    const parent = node.comment.parentId ? byId.get(node.comment.parentId) : undefined
    if (parent) parent.children.push(node)
    else roots.push(node)
  }

  return roots
}

function AdminCommentDetail({
  detail,
  selectedCommentId,
  editingId,
  draft,
  editReason,
  editError,
  savingEdit,
  replyToId,
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
  selectedCommentId: string
  editingId: string
  draft: string
  editReason: string
  editError: string
  savingEdit: boolean
  replyToId: string
  savingReply: boolean
  replyError: string
  reactionPending: boolean
  onDraftChange: (value: string) => void
  onReasonChange: (value: string) => void
  onSaveEdit: (comment: ApiAdminLessonComment) => void
  onCancelEdit: (comment: ApiAdminLessonComment) => void
  onStartEdit: (comment: ApiAdminLessonComment) => void
  onReply: (comment: ApiAdminLessonComment) => void
  onSubmitReply: (comment: ApiAdminLessonComment, content: string) => Promise<unknown>
  onCancelReply: (comment: ApiAdminLessonComment) => void
  onReaction: (comment: ApiAdminLessonComment, reaction: ApiLessonCommentReactionType) => void
  onDelete: (comment: ApiAdminLessonComment) => void
  onHistory: (comment: ApiAdminLessonComment) => void
  onSelectThreadComment: (comment: ApiAdminLessonComment) => void
}) {
  const comments = detail.thread.some((item) => item.id === detail.comment.id)
    ? detail.thread
    : [...detail.thread, detail.comment]
  const tree = buildAdminThreadTree(comments)
  const [expandedCommentIds, setExpandedCommentIds] = useState<Set<string>>(() => new Set())

  function toggleReplies(commentId: string) {
    setExpandedCommentIds((current) => {
      const next = new Set(current)
      if (next.has(commentId)) next.delete(commentId)
      else next.add(commentId)
      return next
    })
  }

  function renderNode(node: AdminThreadTreeNode, level = 0): ReactNode {
    const item = node.comment
    const isDeleted = Boolean(item.deletedAt)
    const isEditing = editingId === item.id
    const isReplying = replyToId === item.id
    const isExpanded = expandedCommentIds.has(item.id)
    const visibleChildren = isExpanded ? node.children : node.children.slice(-4)
    const isAdmin = item.author?.role === 'ADMIN'

    return (
      <li key={item.id} className="grid min-w-0 gap-1">
        <article
          aria-current={item.id === selectedCommentId ? 'true' : undefined}
          className={`relative grid min-w-0 gap-2 border-b border-border-subtle py-3 ${item.id === selectedCommentId ? 'rounded-xl bg-brand-blue/20 px-3' : ''} ${isAdmin ? 'rounded-r-xl border-l-2 border-l-action-primary bg-surface-blue/35 pl-3 pr-2' : ''} ${level === 0 ? 'first:pt-1' : ''}`}
        >
          <header className="flex min-w-0 items-start justify-between gap-2">
            <button
              type="button"
              onClick={() => onSelectThreadComment(item)}
              aria-current={item.id === selectedCommentId ? 'true' : undefined}
              className="flex min-w-0 items-center gap-2.5 rounded-lg text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-action-focus"
            >
              <span
                aria-hidden="true"
                className={`grid ${level === 0 ? 'size-8' : 'size-7'} shrink-0 place-items-center rounded-full text-xs font-bold ${item.isAnonymous ? 'bg-surface-muted text-ink-secondary' : isAdmin ? 'bg-brand-blue text-action-primary' : 'bg-brand-pink/50 text-ink-primary'}`}
              >
                {isAdmin ? 'Q' : (item.author?.fullName ?? '?').slice(0, 1).toUpperCase()}
              </span>
              <span className="min-w-0">
                <span className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-sm font-semibold">
                  <span className="truncate">{item.author?.fullName ?? 'Tài khoản đã xóa'}</span>
                  {isAdmin && (
                    <span className="rounded-full bg-brand-blue/70 px-2 py-0.5 text-[11px] font-bold text-ink-primary">
                      Quản trị viên
                    </span>
                  )}
                </span>
                <span className="mt-0.5 block text-[11px] leading-4 text-ink-muted">
                  {dateTime(item.createdAt)}
                  {item.editedAt && ` · Đã chỉnh sửa ${dateTime(item.editedAt)}`}
                </span>
              </span>
            </button>
            <DropdownMenu
              label="Thao tác"
              modal={false}
              trigger={
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label={`Thao tác với bình luận của ${item.author?.fullName ?? 'tài khoản đã xóa'}`}
                  className="size-8 min-h-8 shrink-0 rounded-full"
                >
                  <MoreHorizontal aria-hidden="true" className="size-4" />
                </Button>
              }
              items={[
                {
                  label: 'Chỉnh sửa',
                  onSelect: () => onStartEdit(item),
                  disabled: isDeleted || isEditing,
                },
                {
                  label: 'Lịch sử chỉnh sửa',
                  onSelect: () => onHistory(item),
                  disabled: !item.editedAt && !item.moderationEditedAt,
                },
                {
                  label: 'Xóa bình luận',
                  onSelect: () => onDelete(item),
                  disabled: isDeleted,
                  destructive: true,
                },
              ]}
            />
          </header>

          {item.isAnonymous && (
            <p className="w-fit rounded-full bg-surface-muted px-2 py-0.5 text-[11px] font-medium text-ink-secondary">
              Đăng ẩn danh
            </p>
          )}

          {isEditing ? (
            <div className="grid gap-2 rounded-xl border border-border-subtle bg-surface-muted/50 p-3">
              <label className="grid gap-1.5 text-sm font-semibold">
                Nội dung bình luận
                <textarea
                  aria-label="Chỉnh sửa bình luận"
                  value={draft}
                  onChange={(event) => onDraftChange(event.target.value)}
                  rows={3}
                  maxLength={2_000}
                  className="w-full resize-y rounded-xl border border-border-subtle bg-white px-3 py-2.5 font-normal leading-6 outline-none focus-visible:ring-2 focus-visible:ring-action-primary"
                />
              </label>
              <div className="flex items-center justify-between gap-2 text-xs text-ink-muted">
                <span className="tabular-nums">{draft.length}/2.000</span>
                <span>Phiên bản {item.revision}</span>
              </div>
              <label className="grid gap-1.5 text-sm font-semibold">
                Lý do kiểm duyệt <span className="font-normal text-ink-muted">(tùy chọn)</span>
                <input
                  value={editReason}
                  onChange={(event) => onReasonChange(event.target.value)}
                  maxLength={300}
                  className="min-h-10 rounded-xl border border-border-subtle bg-white px-3 font-normal outline-none focus-visible:ring-2 focus-visible:ring-action-primary"
                />
              </label>
              {editError && (
                <p role="alert" className="text-sm text-danger-foreground">
                  {editError}
                </p>
              )}
              <div className="flex justify-end gap-2">
                <Button variant="outline" size="sm" onClick={() => onCancelEdit(item)}>
                  Hủy
                </Button>
                <Button
                  size="sm"
                  loading={savingEdit}
                  disabled={!draft.trim()}
                  onClick={() => onSaveEdit(item)}
                >
                  Lưu nội dung
                </Button>
              </div>
            </div>
          ) : isDeleted ? (
            <div className="grid gap-1">
              <p className="rounded-lg bg-surface-muted px-3 py-1.5 text-sm leading-5 text-ink-secondary">
                Bình luận này đã được gỡ. Các phản hồi còn lại được giữ để tham khảo.
              </p>
              {item.deletionReason && (
                <p className="px-1 text-xs text-ink-secondary">Lý do xóa: {item.deletionReason}</p>
              )}
            </div>
          ) : (
            <p
              className={`whitespace-pre-wrap break-words text-sm leading-5 ${isAdmin ? 'font-medium text-ink-primary' : 'text-ink-primary'}`}
            >
              {item.content}
            </p>
          )}

          {isDeleted && (
            <span className="w-fit rounded-full bg-surface-muted px-2.5 py-1 text-xs font-medium text-ink-secondary">
              Đã xóa {dateTime(item.deletedAt)}
            </span>
          )}

          <div className="flex flex-wrap items-center gap-x-1 gap-y-0.5">
            <CommentReactionControl
              reactions={item.reactions}
              activeReaction={item.myReaction}
              disabled={isDeleted || reactionPending}
              onSelect={(reaction) => onReaction(item, reaction)}
            />
            <Button
              size="sm"
              variant="ghost"
              disabled={isDeleted}
              onClick={() => onReply(item)}
              aria-expanded={isReplying}
            >
              Trả lời
            </Button>
            {item.replyCount > 0 && (
              <span className="text-[11px] text-ink-muted">{item.replyCount} phản hồi</span>
            )}
          </div>

          {isReplying && !isDeleted && (
            <AdminReplyComposer
              onCancel={() => onCancelReply(item)}
              onSubmit={(content) => onSubmitReply(item, content)}
              saving={savingReply}
              error={replyError}
            />
          )}
        </article>

        {visibleChildren.length > 0 && (
          <ol
            aria-label={`Phản hồi của ${item.author?.fullName ?? 'tài khoản đã xóa'}`}
            className="ml-3 grid min-w-0 gap-1 border-l border-border-subtle pl-3 sm:ml-5 sm:pl-4"
          >
            {visibleChildren.map((child) => renderNode(child, level + 1))}
            {node.children.length > 4 && (
              <li className="list-none py-1">
                <Button
                  size="sm"
                  variant="ghost"
                  aria-expanded={isExpanded}
                  onClick={() => toggleReplies(item.id)}
                >
                  {isExpanded ? 'Thu gọn' : 'Hiển thị đầy đủ'}
                </Button>
              </li>
            )}
          </ol>
        )}
      </li>
    )
  }

  return (
    <section aria-label="Nhánh thảo luận" className="grid min-w-0 gap-2 p-3 sm:p-4">
      <div className="flex items-center justify-between gap-3 border-b border-border-subtle pb-2">
        <div>
          <h2 className="text-sm font-bold">Nhánh thảo luận</h2>
          <p className="text-[11px] text-ink-secondary">
            {detail.threadTotal.toLocaleString('vi-VN')} bình luận trong đoạn này
          </p>
        </div>
      </div>
      {replyError && (
        <p
          role="alert"
          className="rounded-lg bg-danger-surface px-3 py-2 text-sm text-danger-foreground"
        >
          {replyError}
        </p>
      )}
      {detail.threadHasMore && (
        <p role="status" className="text-xs leading-5 text-ink-muted">
          Đang hiển thị {detail.thread.length} trong {detail.threadTotal} bình luận. Nhánh này đã
          chạm giới hạn tải hiện tại.
        </p>
      )}
      {tree.length > 0 ? (
        <ol aria-label="Cây bình luận" className="grid min-w-0 gap-1">
          {tree.map((node) => renderNode(node))}
        </ol>
      ) : (
        <p className="rounded-xl bg-surface-muted px-4 py-6 text-sm text-ink-secondary">
          Chưa có bình luận trong nhánh này.
        </p>
      )}
    </section>
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
  loading,
  error,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  items: ApiLessonCommentHistoryItem[]
  loading: boolean
  error: string
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
      {loading ? (
        <AdminLoading />
      ) : error ? (
        <p role="alert" className="text-sm text-danger-foreground">
          {error}
        </p>
      ) : items.length ? (
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
