import { useState, type FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { BookOpenText, MessageCircle, ShieldCheck, Trash2 } from 'lucide-react'
import { lessonCommentsRepository } from '@/data/api/lesson-comments-repository'
import type { ApiAdminLessonComment, ApiLessonCommentReactionType } from '@/lib/api/types'
import { Button, Card, Pagination } from '@/shared/ui'
import { BaseDialog, ConfirmDialog } from '@/shared/ui/dialogs'
import { AdminCard, AdminField, AdminLoadError, AdminLoading, AdminSelect } from './shared'

const reactions: Array<{ type: ApiLessonCommentReactionType; emoji: string; label: string }> = [
  { type: 'LIKE', emoji: '👍', label: 'Thích' },
  { type: 'LOVE', emoji: '❤️', label: 'Yêu thích' },
  { type: 'HAHA', emoji: '😂', label: 'Buồn cười' },
  { type: 'WOW', emoji: '😮', label: 'Ngạc nhiên' },
  { type: 'CLAP', emoji: '👏', label: 'Vỗ tay' },
]

const dateTime = (value: string | null) =>
  value ? new Date(value).toLocaleString('vi-VN', { dateStyle: 'medium', timeStyle: 'short' }) : '—'

function SummaryMetric({
  label,
  value,
  icon,
}: {
  label: string
  value: number
  icon: React.ReactNode
}) {
  return (
    <Card className="flex items-center gap-3 p-4">
      <span className="grid size-10 place-items-center rounded-xl bg-brand-blue/55 text-action-primary">
        {icon}
      </span>
      <span>
        <strong className="block text-xl">{value.toLocaleString('vi-VN')}</strong>
        <span className="text-xs text-ink-secondary">{label}</span>
      </span>
    </Card>
  )
}

function AdminTopLevelComposer({
  onCreated,
}: {
  onCreated: (comment: ApiAdminLessonComment) => void
}) {
  const [lessonId, setLessonId] = useState('')
  const [content, setContent] = useState('')
  const [error, setError] = useState('')
  const create = useMutation({
    mutationFn: () =>
      lessonCommentsRepository.createAdminComment(lessonId.trim(), {
        content: content.trim(),
        parentId: null,
      }),
    onSuccess: (comment) => {
      setContent('')
      setError('')
      onCreated(comment)
    },
    onError: (cause) =>
      setError(cause instanceof Error ? cause.message : 'Chưa tạo được bình luận.'),
  })

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!lessonId.trim() || !content.trim()) return
    create.mutate()
  }

  return (
    <form
      onSubmit={submit}
      className="grid gap-3 rounded-xl border border-border-subtle bg-surface-muted p-4"
    >
      <div className="grid gap-3 sm:grid-cols-[minmax(12rem,0.5fr)_minmax(0,1.5fr)]">
        <AdminField
          label="Lesson ID"
          value={lessonId}
          onChange={setLessonId}
          placeholder="ObjectId của bài học"
        />
        <label className="grid gap-1.5 text-sm font-semibold">
          <span>Bình luận quản trị viên</span>
          <textarea
            value={content}
            onChange={(event) => setContent(event.target.value)}
            maxLength={2_000}
            rows={3}
            className="w-full rounded-xl border border-border-subtle bg-white px-3 py-2.5 font-normal outline-none focus-visible:ring-2 focus-visible:ring-action-primary"
          />
        </label>
      </div>
      {error && (
        <p role="alert" className="text-sm text-danger-foreground">
          {error}
        </p>
      )}
      <div className="flex justify-end">
        <Button
          type="submit"
          loading={create.isPending}
          disabled={!lessonId.trim() || !content.trim()}
        >
          Đăng bình luận quản trị viên
        </Button>
      </div>
    </form>
  )
}

export function AdminLessonCommentsPage() {
  const [search, setSearch] = useState('')
  const [courseId, setCourseId] = useState('')
  const [lessonId, setLessonId] = useState('')
  const [authorId, setAuthorId] = useState('')
  const [anonymous, setAnonymous] = useState('')
  const [status, setStatus] = useState('ALL')
  const [type, setType] = useState('ALL')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [sort, setSort] = useState('newest')
  const [page, setPage] = useState(1)
  const [selectedId, setSelectedId] = useState('')
  const [createReply, setCreateReply] = useState(false)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')
  const [editReason, setEditReason] = useState('')
  const [editError, setEditError] = useState('')
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [historyOpen, setHistoryOpen] = useState(false)
  const [actionError, setActionError] = useState('')
  const queryClient = useQueryClient()

  const filters = {
    page,
    pageSize: 20,
    search: search.trim() || undefined,
    courseId: courseId.trim() || undefined,
    lessonId: lessonId.trim() || undefined,
    authorId: authorId.trim() || undefined,
    anonymous: anonymous || undefined,
    status,
    type,
    from: from ? new Date(from).toISOString() : undefined,
    to: to ? new Date(to).toISOString() : undefined,
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
  const activeSelectedId = selectedId || list.data?.items[0]?.id || ''
  const detail = useQuery({
    queryKey: ['admin', 'lesson-comment', activeSelectedId],
    queryFn: () => lessonCommentsRepository.getAdminComment(activeSelectedId),
    enabled: Boolean(activeSelectedId),
    retry: false,
  })

  function refresh() {
    void queryClient.invalidateQueries({ queryKey: ['admin', 'lesson-comments'] })
    void queryClient.invalidateQueries({ queryKey: ['admin', 'lesson-comments-summary'] })
    if (activeSelectedId)
      void queryClient.invalidateQueries({
        queryKey: ['admin', 'lesson-comment', activeSelectedId],
      })
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

  return (
    <div className="grid gap-5">
      {summary.isError ? (
        <AdminLoadError error={summary.error} retry={() => void summary.refetch()} />
      ) : summary.isPending ? (
        <AdminLoading />
      ) : (
        <section
          aria-label="Thống kê bình luận"
          className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5"
        >
          <SummaryMetric
            label="Tổng bình luận"
            value={summary.data.total}
            icon={<MessageCircle aria-hidden="true" className="size-5" />}
          />
          <SummaryMetric
            label="7 ngày gần đây"
            value={summary.data.recent}
            icon={<BookOpenText aria-hidden="true" className="size-5" />}
          />
          <SummaryMetric
            label="Ẩn danh"
            value={summary.data.anonymous}
            icon={<ShieldCheck aria-hidden="true" className="size-5" />}
          />
          <SummaryMetric
            label="Đã chỉnh sửa"
            value={summary.data.edited}
            icon={<MessageCircle aria-hidden="true" className="size-5" />}
          />
          <SummaryMetric
            label="Đã xóa"
            value={summary.data.deleted}
            icon={<Trash2 aria-hidden="true" className="size-5" />}
          />
        </section>
      )}

      <AdminCard
        title="Đăng bình luận quản trị viên"
        description="Bình luận hiển thị với nhãn Quản trị viên và lưu tác giả Admin trong hệ thống."
      >
        <AdminTopLevelComposer
          onCreated={(comment) => {
            setSelectedId(comment.id)
            refresh()
          }}
        />
      </AdminCard>

      <AdminCard
        title="Tìm và kiểm duyệt bình luận"
        description="Tìm theo nội dung, khóa học, bài học, tác giả, chế độ ẩn danh, trạng thái và thời gian."
      >
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <AdminField
            label="Tìm nội dung"
            value={search}
            onChange={(value) => {
              setSearch(value)
              setPage(1)
            }}
            placeholder="Từ khóa"
          />
          <AdminField
            label="Course ID"
            value={courseId}
            onChange={(value) => {
              setCourseId(value)
              setPage(1)
            }}
          />
          <AdminField
            label="Lesson ID"
            value={lessonId}
            onChange={(value) => {
              setLessonId(value)
              setPage(1)
            }}
          />
          <AdminField
            label="Author User ID"
            value={authorId}
            onChange={(value) => {
              setAuthorId(value)
              setPage(1)
            }}
          />
          <AdminSelect
            label="Ẩn danh"
            value={anonymous}
            onChange={(value) => {
              setAnonymous(value)
              setPage(1)
            }}
            options={[
              { value: '', label: 'Tất cả' },
              { value: 'true', label: 'Ẩn danh' },
              { value: 'false', label: 'Công khai' },
            ]}
          />
          <AdminSelect
            label="Trạng thái"
            value={status}
            onChange={(value) => {
              setStatus(value)
              setPage(1)
            }}
            options={[
              { value: 'ALL', label: 'Tất cả' },
              { value: 'ACTIVE', label: 'Đang hiển thị' },
              { value: 'DELETED', label: 'Đã xóa' },
            ]}
          />
          <AdminSelect
            label="Loại bình luận"
            value={type}
            onChange={(value) => {
              setType(value)
              setPage(1)
            }}
            options={[
              { value: 'ALL', label: 'Tất cả' },
              { value: 'ROOT', label: 'Bình luận gốc' },
              { value: 'REPLY', label: 'Phản hồi' },
            ]}
          />
          <AdminSelect
            label="Sắp xếp"
            value={sort}
            onChange={(value) => {
              setSort(value)
              setPage(1)
            }}
            options={[
              { value: 'newest', label: 'Mới nhất' },
              { value: 'oldest', label: 'Cũ nhất' },
            ]}
          />
          <AdminField
            label="Từ ngày"
            type="date"
            value={from}
            onChange={(value) => {
              setFrom(value)
              setPage(1)
            }}
          />
          <AdminField
            label="Đến ngày"
            type="date"
            value={to}
            onChange={(value) => {
              setTo(value)
              setPage(1)
            }}
          />
        </div>
        {list.isPending ? (
          <AdminLoading />
        ) : list.isError ? (
          <AdminLoadError error={list.error} retry={() => void list.refetch()} />
        ) : list.data.items.length ? (
          <>
            <div className="overflow-x-auto rounded-xl border border-border-subtle">
              <table className="w-full min-w-[1040px] text-left text-sm">
                <thead className="bg-brand-pink/35 text-xs uppercase text-ink-secondary">
                  <tr>
                    <th className="p-3">Nội dung</th>
                    <th className="p-3">Khóa học / bài học</th>
                    <th className="p-3">Tác giả thật</th>
                    <th className="p-3">Chế độ</th>
                    <th className="p-3">Phản hồi</th>
                    <th className="p-3">Reaction</th>
                    <th className="p-3">Thời gian</th>
                    <th className="p-3">Trạng thái</th>
                  </tr>
                </thead>
                <tbody>
                  {list.data.items.map((item) => (
                    <tr
                      key={item.id}
                      className={`cursor-pointer border-t border-border-subtle ${activeSelectedId === item.id ? 'bg-brand-blue/30' : 'bg-white hover:bg-surface-muted'}`}
                      onClick={() => setSelectedId(item.id)}
                    >
                      <td className="max-w-72 p-3">
                        <button
                          type="button"
                          onClick={() => setSelectedId(item.id)}
                          className="line-clamp-2 text-left font-medium hover:underline"
                        >
                          {item.content}
                        </button>
                      </td>
                      <td className="p-3">
                        <span className="block max-w-64 truncate">
                          {item.context.courseTitle ?? item.context.courseId ?? '—'}
                        </span>
                        <span className="block max-w-64 truncate text-xs text-ink-secondary">
                          {item.context.lessonTitle ?? item.lessonId}
                        </span>
                      </td>
                      <td className="p-3">
                        <span className="block font-medium">
                          {item.author?.fullName ?? 'Tài khoản đã xóa'}
                        </span>
                        <span className="block text-xs text-ink-secondary">
                          {item.author?.email ?? item.author?.id}
                        </span>
                      </td>
                      <td className="p-3">
                        {item.isAnonymous ? (
                          <span className="rounded-full bg-brand-lime/60 px-2 py-1 text-xs font-semibold">
                            Được đăng ẩn danh
                          </span>
                        ) : (
                          'Công khai'
                        )}
                      </td>
                      <td className="p-3">{item.replyCount}</td>
                      <td className="p-3">{item.reactionCount}</td>
                      <td className="p-3">{dateTime(item.createdAt)}</td>
                      <td className="p-3">
                        {item.deletedAt
                          ? 'Đã xóa'
                          : item.editedAt
                            ? 'Đã chỉnh sửa'
                            : 'Đang hiển thị'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-ink-secondary">Tổng số: {list.data.total}</p>
              <Pagination
                page={page}
                pages={Math.max(1, Math.ceil(list.data.total / list.data.pageSize))}
                onPageChange={setPage}
              />
            </div>
          </>
        ) : (
          <div className="rounded-xl bg-surface-muted p-8 text-center text-sm text-ink-secondary">
            Không có bình luận phù hợp.
          </div>
        )}
      </AdminCard>

      <AdminCard
        title="Chi tiết cuộc thảo luận"
        description="Danh tính thật, nhánh phản hồi, reaction, lịch sử và thao tác moderation."
      >
        {!activeSelectedId ? (
          <p className="text-sm text-ink-secondary">
            Chọn một bình luận hoặc đăng bình luận mới để xem chi tiết.
          </p>
        ) : detail.isPending ? (
          <AdminLoading />
        ) : detail.isError ? (
          <AdminLoadError error={detail.error} retry={() => void detail.refetch()} />
        ) : (
          <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(18rem,0.7fr)]">
            <div className="grid content-start gap-4">
              <div className="rounded-xl border border-border-subtle bg-white p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold">
                      {detail.data.comment.author?.fullName ?? 'Tài khoản đã xóa'}
                    </p>
                    <p className="text-sm text-ink-secondary">
                      {detail.data.comment.author?.email ?? '—'} ·{' '}
                      {detail.data.comment.author?.role ?? '—'}
                    </p>
                  </div>
                  {detail.data.comment.isAnonymous && (
                    <span className="rounded-full bg-brand-lime/60 px-2.5 py-1 text-xs font-bold">
                      Được đăng dưới chế độ ẩn danh
                    </span>
                  )}
                </div>
                <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-6">
                  {detail.data.comment.content}
                </p>
                <p className="mt-3 text-xs text-ink-muted">
                  {detail.data.comment.context.courseTitle ??
                    detail.data.comment.context.courseId ??
                    '—'}{' '}
                  · {detail.data.comment.context.sectionTitle ?? '—'} ·{' '}
                  {detail.data.comment.context.lessonTitle ?? detail.data.comment.lessonId}
                </p>
                <p className="mt-1 text-xs text-ink-muted">
                  Tạo {dateTime(detail.data.comment.createdAt)} · Sửa{' '}
                  {dateTime(detail.data.comment.editedAt)} ·{' '}
                  {detail.data.comment.deletedAt
                    ? `Xóa ${dateTime(detail.data.comment.deletedAt)} bởi ${detail.data.comment.deletedBy ?? '—'}`
                    : 'Đang hiển thị'}
                </p>
                {detail.data.comment.deletionReason && (
                  <p className="mt-2 text-xs text-ink-secondary">
                    Lý do xóa: {detail.data.comment.deletionReason}
                  </p>
                )}
              </div>

              {editing ? (
                <div className="grid gap-3 rounded-xl border border-border-subtle bg-white p-4">
                  <label className="grid gap-1.5 text-sm font-semibold">
                    Nội dung
                    <textarea
                      value={draft}
                      onChange={(event) => setDraft(event.target.value)}
                      rows={5}
                      maxLength={2_000}
                      className="w-full rounded-xl border border-border-subtle px-3 py-2.5 font-normal outline-none focus-visible:ring-2 focus-visible:ring-action-primary"
                    />
                  </label>
                  <AdminField
                    label="Lý do kiểm duyệt (tùy chọn)"
                    value={editReason}
                    onChange={setEditReason}
                    maxLength={300}
                  />
                  {editError && (
                    <p role="alert" className="text-sm text-danger-foreground">
                      {editError}
                    </p>
                  )}
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setEditing(false)
                        setDraft(detail.data.comment.content)
                      }}
                    >
                      Hủy
                    </Button>
                    <Button
                      loading={saveEdit.isPending}
                      disabled={!draft.trim()}
                      onClick={() => saveEdit.mutate()}
                    >
                      Lưu nội dung
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    disabled={Boolean(detail.data.comment.deletedAt)}
                    onClick={() => {
                      setDraft(detail.data!.comment.content)
                      setEditing(true)
                    }}
                  >
                    Sửa bình luận
                  </Button>
                  <Button
                    variant="destructive"
                    disabled={Boolean(detail.data.comment.deletedAt)}
                    onClick={() => setDeleteOpen(true)}
                  >
                    Xóa toàn bộ nhánh
                  </Button>
                  <Button variant="outline" onClick={() => setHistoryOpen(true)}>
                    Xem lịch sử chỉnh sửa ({detail.data.history.length})
                  </Button>
                </div>
              )}

              <div className="flex flex-wrap items-center gap-2">
                {reactions.map((reaction) => (
                  <button
                    key={reaction.type}
                    type="button"
                    aria-pressed={detail.data.comment.myReaction === reaction.type}
                    aria-label={`${detail.data.comment.myReaction === reaction.type ? 'Bỏ reaction' : 'Thả reaction'} ${reaction.label}`}
                    disabled={Boolean(detail.data.comment.deletedAt) || setReaction.isPending}
                    onClick={() => setReaction.mutate(reaction.type)}
                    className={`inline-flex min-h-10 items-center gap-1.5 rounded-full border px-3 text-sm ${detail.data.comment.myReaction === reaction.type ? 'border-action-primary bg-brand-blue/40' : 'border-border-subtle bg-white hover:bg-surface-muted'}`}
                  >
                    <span aria-hidden="true">{reaction.emoji}</span>
                    <span>
                      {detail.data.comment.reactions.find(
                        (item) => item.reactionType === reaction.type,
                      )?.count ?? 0}
                    </span>
                  </button>
                ))}
              </div>

              {createReply ? (
                <AdminReplyComposer
                  onCancel={() => setCreateReply(false)}
                  onSubmit={(content) =>
                    addReply.mutateAsync({ content, parentId: detail.data!.comment.id })
                  }
                  saving={addReply.isPending}
                  error={actionError}
                />
              ) : (
                <Button
                  variant="outline"
                  onClick={() => {
                    setActionError('')
                    setCreateReply(true)
                  }}
                >
                  Trả lời với tư cách quản trị viên
                </Button>
              )}
              {actionError && (
                <p role="alert" className="text-sm text-danger-foreground">
                  {actionError}
                </p>
              )}
            </div>

            <aside className="grid content-start gap-3">
              <h3 className="font-display text-base font-bold">
                Nhánh thảo luận ({detail.data.threadTotal})
              </h3>
              {detail.data.threadHasMore && (
                <p className="text-xs text-ink-secondary">
                  Chỉ 500 mục đầu được tải trong phần chi tiết; dùng bộ lọc để mở từng bình luận còn
                  lại.
                </p>
              )}
              <div className="grid gap-2">
                {detail.data.thread.map((item) => (
                  <ThreadCommentButton
                    key={item.id}
                    item={item}
                    selected={item.id === activeSelectedId}
                    onClick={() => setSelectedId(item.id)}
                  />
                ))}
              </div>
            </aside>
          </div>
        )}
      </AdminCard>

      <BaseDialog
        open={historyOpen}
        onOpenChange={setHistoryOpen}
        title="Toàn bộ lịch sử chỉnh sửa"
        description="Nội dung trước/sau, tác giả thao tác và lý do kiểm duyệt."
        size="wide"
        footer={
          <Button variant="outline" onClick={() => setHistoryOpen(false)}>
            Đóng
          </Button>
        }
      >
        {detail.data?.history.length ? (
          <ol className="grid gap-3">
            {detail.data.history.map((item) => (
              <li key={item.id} className="rounded-xl border border-border-subtle bg-white p-4">
                <p className="text-xs font-semibold text-ink-secondary">
                  Phiên bản {item.previousRevision} → {item.newRevision} · {dateTime(item.editedAt)}
                </p>
                <p className="mt-1 text-xs text-ink-secondary">
                  {item.editedBy
                    ? `${item.editedBy.fullName} · ${item.editedBy.email} · ${item.editedBy.role}`
                    : 'Tài khoản đã xóa'}
                  {item.reason ? ` · Lý do: ${item.reason}` : ''}
                </p>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <p className="whitespace-pre-wrap rounded-lg bg-surface-muted p-3 text-sm">
                    {item.previousContent}
                  </p>
                  <p className="whitespace-pre-wrap rounded-lg bg-brand-blue/25 p-3 text-sm">
                    {item.newContent}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        ) : (
          <p className="text-sm text-ink-secondary">Chưa có lịch sử chỉnh sửa.</p>
        )}
      </BaseDialog>
      <ConfirmDialog open={deleteOpen} request={deleteRequest} onOpenChange={setDeleteOpen} />
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
      className={`grid gap-1 rounded-xl border p-3 text-left text-sm ${selected ? 'border-action-primary bg-brand-blue/30' : 'border-border-subtle bg-white hover:bg-surface-muted'}`}
      style={{ marginLeft: `${depth * 0.5}rem` }}
    >
      <span className="flex flex-wrap items-center gap-2 font-semibold">
        {item.author?.fullName ?? 'Tài khoản đã xóa'}
        {item.isAnonymous && (
          <span className="rounded-full bg-brand-lime/60 px-2 py-0.5 text-[10px]">
            Ẩn danh với học viên
          </span>
        )}
        {item.deletedAt && <span className="text-xs text-danger-foreground">Đã xóa</span>}
      </span>
      <span className="line-clamp-3 whitespace-pre-wrap text-ink-secondary">{item.content}</span>
      <span className="text-xs text-ink-muted">
        {dateTime(item.createdAt)} · {item.replyCount} phản hồi · {item.reactionCount} reaction
      </span>
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
    if (!content.trim()) return
    setLocalError('')
    try {
      await onSubmit(content.trim())
    } catch {
      setLocalError('Phản hồi chưa được lưu.')
    }
  }
  return (
    <form
      onSubmit={(event) => void submit(event)}
      className="grid gap-3 rounded-xl border border-border-subtle bg-white p-4"
    >
      <label className="grid gap-1.5 text-sm font-semibold">
        Phản hồi
        <textarea
          aria-label="Phản hồi với tư cách quản trị viên"
          value={content}
          onChange={(event) => setContent(event.target.value)}
          rows={3}
          maxLength={2_000}
          className="w-full rounded-xl border border-border-subtle px-3 py-2.5 font-normal outline-none focus-visible:ring-2 focus-visible:ring-action-primary"
        />
      </label>
      {(error || localError) && (
        <p role="alert" className="text-sm text-danger-foreground">
          {error || localError}
        </p>
      )}
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Hủy
        </Button>
        <Button type="submit" loading={saving} disabled={!content.trim()}>
          Gửi phản hồi
        </Button>
      </div>
    </form>
  )
}
