import { useState, type FormEvent } from 'react'
import { useInfiniteQuery, useQuery, useQueryClient } from '@tanstack/react-query'
import { MessageCircle, Pencil, Reply, Smile, Trash2 } from 'lucide-react'
import { ApiError } from '@/lib/api/client'
import { lessonCommentsRepository } from '@/data/api/lesson-comments-repository'
import type {
  ApiLessonCommentHistoryItem,
  ApiLessonCommentReactionType,
  ApiStudentLessonComment,
} from '@/lib/api/types'
import { BaseDialog, Button, Card, ErrorState } from '@/shared/ui'
import { ConfirmDialog } from '@/shared/ui/dialogs'

const reactionOptions: Array<{
  type: ApiLessonCommentReactionType
  emoji: string
  label: string
}> = [
  { type: 'LIKE', emoji: '👍', label: 'Thích' },
  { type: 'LOVE', emoji: '❤️', label: 'Yêu thích' },
  { type: 'HAHA', emoji: '😂', label: 'Buồn cười' },
  { type: 'WOW', emoji: '😮', label: 'Ngạc nhiên' },
  { type: 'CLAP', emoji: '👏', label: 'Vỗ tay' },
]

function displayTime(value: string) {
  return new Date(value).toLocaleString('vi-VN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  })
}

function StudentCommentComposer({
  lessonId,
  parentId,
  onSent,
  onCancel,
  compact = false,
}: {
  lessonId: string
  parentId: string | null
  onSent: () => void
  onCancel?: () => void
  compact?: boolean
}) {
  const [content, setContent] = useState('')
  const [isAnonymous, setIsAnonymous] = useState(false)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const queryClient = useQueryClient()

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const normalized = content.trim()
    if (!normalized || normalized.length > 2_000) {
      setError('Nội dung cần có từ 1 đến 2.000 ký tự.')
      return
    }
    setSaving(true)
    setError('')
    try {
      await lessonCommentsRepository.createStudentComment(lessonId, {
        content: normalized,
        isAnonymous,
        parentId,
      })
      setContent('')
      setIsAnonymous(false)
      await queryClient.invalidateQueries({ queryKey: ['lesson-comments', lessonId] })
      await queryClient.invalidateQueries({ queryKey: ['lesson-comment-replies'] })
      onSent()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Chưa gửi được bình luận. Hãy thử lại.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={(event) => void submit(event)} className="grid gap-3">
      <label className="grid gap-1.5 text-sm font-semibold text-ink-primary">
        <span className="sr-only">{parentId ? 'Viết phản hồi' : 'Viết bình luận'}</span>
        <textarea
          value={content}
          onChange={(event) => setContent(event.target.value)}
          maxLength={2_000}
          rows={compact ? 3 : 4}
          placeholder={
            parentId ? 'Viết phản hồi của bạn…' : 'Chia sẻ câu hỏi hoặc trao đổi về bài học…'
          }
          aria-label={parentId ? 'Nội dung phản hồi' : 'Nội dung bình luận'}
          className="min-h-24 w-full resize-y rounded-xl border border-border-subtle bg-white px-3 py-2.5 font-normal outline-none focus-visible:ring-2 focus-visible:ring-action-primary"
        />
      </label>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <label className="flex min-h-10 cursor-pointer items-center gap-2 text-sm text-ink-secondary">
          <input
            type="checkbox"
            checked={isAnonymous}
            onChange={(event) => setIsAnonymous(event.target.checked)}
            className="size-4 accent-action-primary"
          />
          Đăng ẩn danh
        </label>
        <span className="text-xs text-ink-muted">{content.length}/2.000</span>
      </div>
      {isAnonymous && (
        <p className="rounded-xl bg-brand-blue/35 px-3 py-2 text-xs leading-5 text-ink-secondary">
          Học viên khác sẽ không thấy danh tính của bạn. Quản trị viên vẫn có thể xem thông tin tài
          khoản.
        </p>
      )}
      {error && (
        <p role="alert" className="text-sm text-danger-foreground">
          {error}
        </p>
      )}
      <div className="flex justify-end gap-2">
        {onCancel && (
          <Button type="button" variant="outline" size="sm" onClick={onCancel}>
            Hủy
          </Button>
        )}
        <Button type="submit" size="sm" loading={saving} disabled={!content.trim()}>
          {parentId ? 'Gửi phản hồi' : 'Gửi bình luận'}
        </Button>
      </div>
    </form>
  )
}

function CommentHistory({
  commentId,
  open,
  onOpenChange,
}: {
  commentId: string
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const history = useQuery({
    queryKey: ['lesson-comment-history', commentId],
    queryFn: () => lessonCommentsRepository.studentHistory(commentId),
    enabled: open,
    retry: false,
  })

  return (
    <BaseDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Lịch sử chỉnh sửa"
      description="Các phiên bản công khai của bình luận này."
      size="wide"
      footer={
        <Button variant="outline" onClick={() => onOpenChange(false)}>
          Đóng
        </Button>
      }
    >
      {history.isPending ? (
        <p className="text-sm text-ink-secondary">Đang tải lịch sử…</p>
      ) : history.isError ? (
        <p role="alert" className="text-sm text-ink-secondary">
          Lịch sử này không còn được chia sẻ công khai.
        </p>
      ) : history.data.items.length ? (
        <ol className="grid gap-3">
          {history.data.items.map((item: ApiLessonCommentHistoryItem) => (
            <li
              key={`${item.newRevision}-${item.editedAt}`}
              className="rounded-xl border border-border-subtle bg-white p-4"
            >
              <p className="text-xs font-semibold text-ink-secondary">
                Phiên bản {item.previousRevision} → {item.newRevision} ·{' '}
                {displayTime(item.editedAt)}
              </p>
              <p className="mt-3 whitespace-pre-wrap text-sm">{item.previousContent}</p>
            </li>
          ))}
        </ol>
      ) : (
        <p className="text-sm text-ink-secondary">Không có phiên bản trước để hiển thị.</p>
      )}
    </BaseDialog>
  )
}

function StudentCommentCard({
  lessonId,
  comment,
  level,
}: {
  lessonId: string
  comment: ApiStudentLessonComment
  level: number
}) {
  const [expanded, setExpanded] = useState(false)
  const [replying, setReplying] = useState(false)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(comment.content)
  const [editError, setEditError] = useState('')
  const [historyOpen, setHistoryOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [actionError, setActionError] = useState('')
  const [savingEdit, setSavingEdit] = useState(false)
  const queryClient = useQueryClient()
  const replies = useInfiniteQuery({
    queryKey: ['lesson-comment-replies', comment.id],
    queryFn: ({ pageParam }) =>
      lessonCommentsRepository.listReplies(comment.id, {
        limit: 20,
        ...(pageParam ? { cursor: pageParam } : {}),
      }),
    initialPageParam: '' as string,
    getNextPageParam: (page) => page.nextCursor ?? undefined,
    enabled: expanded,
    retry: false,
  })
  const nestedReplies = replies.data?.pages.flatMap((page) => page.items) ?? []

  function refreshDiscussion() {
    void queryClient.invalidateQueries({ queryKey: ['lesson-comments', lessonId] })
    void queryClient.invalidateQueries({ queryKey: ['lesson-comment-replies'] })
  }

  async function saveEdit() {
    const normalized = draft.trim()
    if (!normalized || normalized.length > 2_000) {
      setEditError('Nội dung cần có từ 1 đến 2.000 ký tự.')
      return
    }
    setSavingEdit(true)
    setEditError('')
    try {
      await lessonCommentsRepository.editStudentComment(comment.id, {
        content: normalized,
        expectedRevision: comment.revision,
      })
      setEditing(false)
      refreshDiscussion()
    } catch (cause) {
      setEditError(
        cause instanceof ApiError && cause.code === 'EDIT_WINDOW_EXPIRED'
          ? 'Đã hết 10 phút chỉnh sửa. Bản nháp của bạn vẫn được giữ lại.'
          : cause instanceof ApiError && cause.code === 'REVISION_CONFLICT'
            ? 'Bình luận vừa được cập nhật ở nơi khác. Hãy tải lại trước khi lưu.'
            : cause instanceof Error
              ? cause.message
              : 'Chưa lưu được thay đổi. Bản nháp của bạn vẫn được giữ lại.',
      )
    } finally {
      setSavingEdit(false)
    }
  }

  async function react(reactionType: ApiLessonCommentReactionType, isMine: boolean) {
    setActionError('')
    try {
      if (isMine) await lessonCommentsRepository.removeStudentReaction(comment.id)
      else await lessonCommentsRepository.setStudentReaction(comment.id, reactionType)
      refreshDiscussion()
    } catch (cause) {
      setActionError(cause instanceof Error ? cause.message : 'Chưa lưu được reaction.')
    }
  }

  const deleteRequest = {
    kind: 'confirm' as const,
    title: 'Xóa bình luận này?',
    description:
      'Xóa bình luận này sẽ ẩn toàn bộ phản hồi bên dưới. Bạn có chắc chắn muốn tiếp tục?',
    confirmLabel: 'Xóa bình luận',
    destructive: true,
    onConfirm: async () => {
      await lessonCommentsRepository.deleteStudentComment(comment.id)
      setDeleteOpen(false)
      refreshDiscussion()
    },
  }

  return (
    <article className="grid gap-3" style={{ marginLeft: `${Math.min(level, 4) * 0.75}rem` }}>
      <Card className="grid gap-3 border-brand-blue/70 p-4 sm:p-5">
        <header className="flex flex-wrap items-start justify-between gap-2">
          <div className="flex min-w-0 items-start gap-3">
            <span
              aria-hidden="true"
              className={`grid size-10 shrink-0 place-items-center rounded-full text-sm font-bold ${comment.author.isAnonymous ? 'bg-surface-muted text-ink-secondary' : 'bg-brand-pink/50 text-ink-primary'}`}
            >
              {comment.author.role === 'ADMIN'
                ? 'Q'
                : comment.author.isAnonymous
                  ? '?'
                  : comment.author.displayName.slice(0, 1).toUpperCase()}
            </span>
            <div className="min-w-0">
              <p className="truncate font-semibold">
                {comment.author.displayName}
                {comment.author.role === 'ADMIN' && (
                  <span className="ml-2 rounded-full bg-brand-lime/60 px-2 py-0.5 text-xs font-semibold">
                    Quản trị viên
                  </span>
                )}
              </p>
              <p className="mt-0.5 text-xs text-ink-muted">
                {displayTime(comment.createdAt)}
                {comment.editedAt && (
                  <>
                    {' · '}
                    {comment.isModerated ? (
                      <span className="font-medium text-ink-secondary">
                        Đã được quản trị viên chỉnh sửa
                      </span>
                    ) : (
                      <button
                        type="button"
                        className="underline underline-offset-2 hover:text-action-primary"
                        onClick={() => setHistoryOpen(true)}
                      >
                        Đã chỉnh sửa
                      </button>
                    )}
                  </>
                )}
              </p>
            </div>
          </div>
          {comment.author.isAnonymous && (
            <span className="rounded-full bg-surface-muted px-2.5 py-1 text-xs font-semibold text-ink-secondary">
              Ẩn danh
            </span>
          )}
        </header>

        {editing ? (
          <div className="grid gap-2">
            <textarea
              aria-label="Chỉnh sửa bình luận"
              rows={4}
              maxLength={2_000}
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              className="w-full rounded-xl border border-border-subtle bg-white px-3 py-2.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-action-primary"
            />
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs text-ink-muted">{draft.length}/2.000</span>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setEditing(false)
                    setDraft(comment.content)
                    setEditError('')
                  }}
                >
                  Hủy
                </Button>
                <Button size="sm" loading={savingEdit} onClick={() => void saveEdit()}>
                  Lưu
                </Button>
              </div>
            </div>
            {editError && (
              <p role="alert" className="text-sm text-danger-foreground">
                {editError}
              </p>
            )}
          </div>
        ) : (
          <p className="whitespace-pre-wrap break-words text-sm leading-6 text-ink-primary">
            {comment.content}
          </p>
        )}

        <div className="flex flex-wrap items-center gap-1.5 border-t border-border-subtle pt-3">
          {reactionOptions.map((reaction) => {
            const summary = comment.reactions.find((item) => item.reactionType === reaction.type)
            const isMine = summary?.isMine ?? false
            return (
              <button
                key={reaction.type}
                type="button"
                aria-label={`${isMine ? 'Bỏ reaction' : 'Thả reaction'} ${reaction.label}${summary ? `, ${summary.count} lượt` : ''}`}
                aria-pressed={isMine}
                onClick={() => void react(reaction.type, isMine)}
                className={`inline-flex min-h-9 items-center gap-1 rounded-full border px-2.5 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-action-primary ${isMine ? 'border-action-primary bg-brand-blue/45' : 'border-border-subtle bg-white hover:bg-surface-muted'}`}
              >
                <span aria-hidden="true">{reaction.emoji}</span>
                {summary && <span>{summary.count}</span>}
              </button>
            )
          })}
          <Button
            size="sm"
            variant="ghost"
            startIcon={<Reply aria-hidden="true" className="size-4" />}
            onClick={() => setReplying((value) => !value)}
          >
            Trả lời
          </Button>
          {comment.replyCount > 0 && (
            <Button
              size="sm"
              variant="ghost"
              startIcon={<MessageCircle aria-hidden="true" className="size-4" />}
              onClick={() => setExpanded((value) => !value)}
            >
              {expanded ? 'Ẩn phản hồi' : `Xem ${comment.replyCount} phản hồi`}
            </Button>
          )}
          {comment.canEdit && !editing && (
            <Button
              size="sm"
              variant="ghost"
              startIcon={<Pencil aria-hidden="true" className="size-4" />}
              onClick={() => {
                setDraft(comment.content)
                setEditing(true)
              }}
            >
              Chỉnh sửa
            </Button>
          )}
          {comment.canDelete && (
            <Button
              size="sm"
              variant="ghost"
              startIcon={<Trash2 aria-hidden="true" className="size-4" />}
              onClick={() => setDeleteOpen(true)}
            >
              Xóa
            </Button>
          )}
        </div>
        {actionError && (
          <p role="alert" className="text-sm text-danger-foreground">
            {actionError}
          </p>
        )}
      </Card>

      {replying && (
        <div className="rounded-2xl border border-border-subtle bg-white p-3 sm:p-4">
          <StudentCommentComposer
            lessonId={lessonId}
            parentId={comment.id}
            compact
            onSent={() => {
              setReplying(false)
              setExpanded(true)
            }}
            onCancel={() => setReplying(false)}
          />
        </div>
      )}

      {expanded && (
        <section aria-label={`Phản hồi của ${comment.author.displayName}`} className="grid gap-3">
          {replies.isPending ? (
            <p className="px-2 text-sm text-ink-secondary">Đang tải phản hồi…</p>
          ) : replies.isError ? (
            <ErrorState
              title="Chưa tải được phản hồi"
              description="Kiểm tra kết nối rồi thử lại."
              onRetry={() => void replies.refetch()}
            />
          ) : nestedReplies.length ? (
            <>
              {nestedReplies.map((reply) => (
                <StudentCommentCard
                  key={reply.id}
                  lessonId={lessonId}
                  comment={reply}
                  level={level + 1}
                />
              ))}
              {replies.hasNextPage && (
                <Button
                  size="sm"
                  variant="outline"
                  loading={replies.isFetchingNextPage}
                  onClick={() => void replies.fetchNextPage()}
                >
                  Tải thêm phản hồi
                </Button>
              )}
            </>
          ) : (
            <p className="px-2 text-sm text-ink-secondary">Chưa có phản hồi hiển thị.</p>
          )}
        </section>
      )}

      <CommentHistory commentId={comment.id} open={historyOpen} onOpenChange={setHistoryOpen} />
      <ConfirmDialog open={deleteOpen} request={deleteRequest} onOpenChange={setDeleteOpen} />
    </article>
  )
}

function LessonDiscussionContent({ lessonId }: { lessonId: string }) {
  const comments = useInfiniteQuery({
    queryKey: ['lesson-comments', lessonId],
    queryFn: ({ pageParam }) =>
      lessonCommentsRepository.listLessonComments(lessonId, {
        limit: 20,
        sort: 'newest',
        ...(pageParam ? { cursor: pageParam } : {}),
      }),
    initialPageParam: '' as string,
    getNextPageParam: (page) => page.nextCursor ?? undefined,
    enabled: Boolean(lessonId),
    retry: false,
  })
  const items = comments.data?.pages.flatMap((page) => page.items) ?? []

  if (
    comments.isError &&
    comments.error instanceof ApiError &&
    comments.error.code === 'FEATURE_DISABLED'
  )
    return null

  return (
    <section aria-labelledby="lesson-discussion-heading" className="grid gap-4">
      <div className="flex items-center gap-2">
        <span className="grid size-10 place-items-center rounded-2xl bg-brand-pink/45 text-action-primary">
          <Smile aria-hidden="true" className="size-5" />
        </span>
        <div>
          <h2 id="lesson-discussion-heading" className="font-display text-xl font-bold">
            Thảo luận bài học
          </h2>
          <p className="text-sm text-ink-secondary">
            Trao đổi câu hỏi và chia sẻ kinh nghiệm cùng học viên.
          </p>
        </div>
      </div>
      <Card className="p-4 sm:p-5">
        <StudentCommentComposer lessonId={lessonId} parentId={null} onSent={() => undefined} />
      </Card>
      {comments.isPending ? (
        <Card className="p-5 text-sm text-ink-secondary">Đang tải thảo luận…</Card>
      ) : comments.isError ? (
        <ErrorState
          title="Chưa tải được phần thảo luận"
          description="Bạn vẫn có thể tiếp tục nội dung bài học."
          onRetry={() => void comments.refetch()}
        />
      ) : items.length ? (
        <>
          <div className="grid gap-4">
            {items.map((comment) => (
              <StudentCommentCard
                key={comment.id}
                lessonId={lessonId}
                comment={comment}
                level={0}
              />
            ))}
          </div>
          {comments.hasNextPage && (
            <Button
              variant="outline"
              loading={comments.isFetchingNextPage}
              onClick={() => void comments.fetchNextPage()}
            >
              Tải bình luận cũ hơn
            </Button>
          )}
        </>
      ) : (
        <Card className="grid justify-items-center gap-2 p-8 text-center">
          <MessageCircle aria-hidden="true" className="size-8 text-action-primary" />
          <p className="font-semibold">Chưa có bình luận</p>
          <p className="text-sm text-ink-secondary">
            Hãy bắt đầu cuộc thảo luận đầu tiên cho bài học này.
          </p>
        </Card>
      )}
    </section>
  )
}

export function LessonDiscussion({ lessonId }: { lessonId: string }) {
  if (import.meta.env['VITE_LESSON_COMMENTS_ENABLED'] === 'false') return null
  return <LessonDiscussionContent lessonId={lessonId} />
}
