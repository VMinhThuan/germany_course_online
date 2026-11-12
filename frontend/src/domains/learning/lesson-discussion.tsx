import { useEffect, useRef, useState, type FormEvent } from 'react'
import { useInfiniteQuery, useQuery, useQueryClient } from '@tanstack/react-query'
import { MessageCircle, MoreHorizontal, Reply, UserRound } from 'lucide-react'
import { ApiError } from '@/lib/api/client'
import { lessonCommentsRepository } from '@/data/api/lesson-comments-repository'
import { CommentReactionControl } from './comment-reaction-control'
import type {
  ApiLessonCommentHistoryItem,
  ApiLessonCommentReactionType,
  ApiStudentLessonComment,
} from '@/lib/api/types'
import { BaseDialog, Button, DropdownMenu, ErrorState } from '@/shared/ui'
import { ConfirmDialog } from '@/shared/ui/dialogs'

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
  const [focused, setFocused] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
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
      if (textareaRef.current) textareaRef.current.style.height = ''
      setIsAnonymous(false)
      await queryClient.invalidateQueries({
        queryKey: parentId ? ['lesson-comment-replies', parentId] : ['lesson-comments', lessonId],
      })
      onSent()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Chưa gửi được bình luận. Hãy thử lại.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form
      onSubmit={(event) => void submit(event)}
      className={`grid gap-3 ${compact ? 'rounded-xl bg-surface-muted/70 p-3 sm:p-4' : 'rounded-2xl border border-brand-pink/65 bg-surface-pink/70 p-3 sm:p-4'}`}
    >
      <label className="grid gap-1.5 text-sm font-semibold text-ink-primary">
        <span className="sr-only">{parentId ? 'Viết phản hồi' : 'Viết bình luận'}</span>
        <textarea
          ref={textareaRef}
          value={content}
          onChange={(event) => {
            event.currentTarget.style.height = 'auto'
            event.currentTarget.style.height = `${event.currentTarget.scrollHeight}px`
            setContent(event.currentTarget.value)
          }}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          maxLength={2_000}
          rows={compact ? 2 : 3}
          placeholder={
            parentId ? 'Viết phản hồi của bạn…' : 'Chia sẻ câu hỏi hoặc trao đổi về bài học…'
          }
          aria-label={parentId ? 'Nội dung phản hồi' : 'Nội dung bình luận'}
          className="min-h-20 w-full resize-none overflow-hidden rounded-xl border border-border-subtle bg-white px-3 py-2.5 font-normal leading-6 outline-none focus-visible:ring-2 focus-visible:ring-action-primary"
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
        {(focused || content.length > 0) && (
          <span className="text-xs tabular-nums text-ink-muted">{content.length}/2.000</span>
        )}
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
        limit: pageParam ? 20 : 4,
        sort: 'newest',
        ...(pageParam ? { cursor: pageParam } : {}),
      }),
    initialPageParam: '' as string,
    getNextPageParam: (page) => page.nextCursor ?? undefined,
    enabled: comment.replyCount > 0,
    retry: false,
  })
  const {
    fetchNextPage: fetchNextRepliesPage,
    hasNextPage: hasNextReplyPage,
    isFetchingNextPage: isFetchingNextReplyPage,
    isFetchNextPageError: fetchNextReplyPageError,
  } = replies
  const nestedReplies = replies.data?.pages.flatMap((page) => page.items).reverse() ?? []
  const visibleReplies = expanded ? nestedReplies : nestedReplies.slice(-4)
  const threadLocked = comment.isThreadLocked
  const isAdminComment = comment.author.role === 'ADMIN'

  useEffect(() => {
    if (!expanded || !hasNextReplyPage || isFetchingNextReplyPage || fetchNextReplyPageError) {
      return
    }
    void fetchNextRepliesPage()
  }, [
    expanded,
    fetchNextRepliesPage,
    hasNextReplyPage,
    isFetchingNextReplyPage,
    fetchNextReplyPageError,
  ])

  function refreshCommentContainer() {
    void queryClient.invalidateQueries({
      queryKey: comment.parentId
        ? ['lesson-comment-replies', comment.parentId]
        : ['lesson-comments', lessonId],
    })
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
      refreshCommentContainer()
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
      refreshCommentContainer()
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
      refreshCommentContainer()
    },
  }

  return (
    <article
      className={`grid min-w-0 gap-2 ${level === 0 ? 'border-b border-border-subtle py-5 first:pt-1 last:border-b-0' : 'py-1'} ${isAdminComment ? 'rounded-r-xl border-l-2 border-action-primary bg-surface-blue/35 px-3 py-3' : ''}`}
      style={{ marginInlineStart: `${Math.min(level, 4) * 0.5}rem` }}
    >
      <header className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex min-w-0 items-start gap-3">
          <span
            aria-hidden="true"
            className={`grid ${level > 0 ? 'size-8' : 'size-10'} shrink-0 place-items-center rounded-full text-sm font-bold ${comment.author.isAnonymous ? 'bg-surface-muted text-ink-secondary' : comment.author.role === 'ADMIN' ? 'bg-brand-blue text-action-primary' : 'bg-brand-pink/50 text-ink-primary'}`}
          >
            {comment.author.isAnonymous ? (
              <UserRound aria-hidden="true" className="size-4" />
            ) : comment.author.role === 'ADMIN' ? (
              'Q'
            ) : (
              comment.author.displayName.slice(0, 1).toUpperCase()
            )}
          </span>
          <div className="min-w-0">
            <p className={`truncate font-semibold ${isAdminComment ? 'text-action-primary' : ''}`}>
              {comment.author.displayName}
              {comment.author.role === 'ADMIN' && (
                <span className="ml-2 rounded-full bg-brand-blue px-2 py-0.5 text-xs font-bold text-action-primary">
                  Quản trị viên
                </span>
              )}
            </p>
            <p className="mt-0.5 text-xs text-ink-muted">
              {displayTime(comment.createdAt)}
              {comment.editedAt && !threadLocked && (
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
          <span className="rounded-full bg-surface-muted px-2.5 py-1 text-xs font-medium text-ink-secondary">
            Đăng ẩn danh
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
            className="w-full rounded-xl border border-border-subtle bg-white px-3 py-2.5 text-sm leading-6 outline-none focus-visible:ring-2 focus-visible:ring-action-primary"
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
      ) : comment.isDeleted ? (
        <p className="rounded-lg bg-surface-muted px-3 py-2 text-xs leading-5 text-ink-secondary">
          Bình luận này đã được gỡ. Các phản hồi còn lại được giữ để tham khảo.
        </p>
      ) : (
        <p className="whitespace-pre-wrap break-words text-sm leading-6 text-ink-primary">
          {comment.content}
        </p>
      )}

      {!comment.isDeleted && threadLocked && (
        <span className="w-fit rounded-full bg-surface-muted px-2.5 py-1 text-xs font-medium text-ink-secondary">
          Nhánh thảo luận đã khóa
        </span>
      )}

      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <CommentReactionControl
          reactions={comment.reactions}
          activeReaction={
            comment.reactions.find((reaction) => reaction.isMine)?.reactionType ?? null
          }
          disabled={threadLocked}
          onSelect={(reactionType) => {
            const active = comment.reactions.find((reaction) => reaction.isMine)?.reactionType
            void react(reactionType, active === reactionType)
          }}
        />
        <Button
          size="sm"
          variant="ghost"
          startIcon={<Reply aria-hidden="true" className="size-4" />}
          disabled={threadLocked}
          onClick={() => setReplying((value) => !value)}
        >
          Trả lời
        </Button>
        {(comment.canEdit || comment.canDelete) && !editing && (
          <DropdownMenu
            label="Thao tác"
            modal={false}
            trigger={
              <Button
                type="button"
                size="icon"
                variant="ghost"
                aria-label="Thao tác bình luận"
                className="size-9 min-h-9 rounded-full"
              >
                <MoreHorizontal aria-hidden="true" className="size-4" />
              </Button>
            }
            items={[
              ...(comment.canEdit
                ? [
                    {
                      label: 'Chỉnh sửa',
                      onSelect: () => {
                        setDraft(comment.content)
                        setEditing(true)
                      },
                    },
                  ]
                : []),
              ...(comment.canDelete
                ? [
                    {
                      label: 'Xóa bình luận',
                      onSelect: () => setDeleteOpen(true),
                      destructive: true,
                    },
                  ]
                : []),
            ]}
          />
        )}
      </div>
      {actionError && (
        <p role="alert" className="text-sm text-danger-foreground">
          {actionError}
        </p>
      )}
      {replying && !threadLocked && (
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
      )}

      {comment.replyCount > 0 && (
        <section
          aria-label={`Phản hồi của ${comment.author.displayName}`}
          className="relative grid gap-2 border-l border-border-subtle pl-3 sm:pl-4"
        >
          {replies.isPending ? (
            <p className="px-2 text-sm text-ink-secondary">Đang tải phản hồi…</p>
          ) : replies.isError && !replies.data ? (
            <ErrorState
              title="Chưa tải được phản hồi"
              description="Kiểm tra kết nối rồi thử lại."
              onRetry={() => void replies.refetch()}
            />
          ) : nestedReplies.length ? (
            <>
              {visibleReplies.map((reply) => (
                <StudentCommentCard
                  key={reply.id}
                  lessonId={lessonId}
                  comment={reply}
                  level={level + 1}
                />
              ))}
              {!expanded && (replies.hasNextPage || nestedReplies.length > 4) && (
                <Button
                  size="sm"
                  variant="ghost"
                  aria-expanded={false}
                  onClick={() => setExpanded(true)}
                >
                  Hiển thị đầy đủ
                </Button>
              )}
              {expanded && replies.hasNextPage && !replies.isFetchNextPageError && (
                <p role="status" className="px-2 text-xs text-ink-muted">
                  Đang tải đầy đủ nhánh thảo luận…
                </p>
              )}
              {expanded && replies.isFetchNextPageError && (
                <ErrorState
                  title="Chưa tải hết nhánh thảo luận"
                  description="Kiểm tra kết nối rồi thử tải tiếp."
                  onRetry={() => void replies.fetchNextPage()}
                />
              )}
              {expanded && !replies.hasNextPage && nestedReplies.length > 4 && (
                <Button size="sm" variant="ghost" onClick={() => setExpanded(false)}>
                  Thu gọn
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
  const [sort, setSort] = useState<'newest' | 'oldest'>('newest')
  const comments = useInfiniteQuery({
    queryKey: ['lesson-comments', lessonId, sort],
    queryFn: ({ pageParam }) =>
      lessonCommentsRepository.listLessonComments(lessonId, {
        limit: 20,
        sort,
        ...(pageParam ? { cursor: pageParam } : {}),
      }),
    initialPageParam: '' as string,
    getNextPageParam: (page) => page.nextCursor ?? undefined,
    enabled: Boolean(lessonId),
    retry: false,
  })
  const items = comments.data?.pages.flatMap((page) => page.items) ?? []
  const rootCommentCount = comments.data?.pages[0]?.total ?? 0

  if (
    comments.isError &&
    comments.error instanceof ApiError &&
    comments.error.code === 'FEATURE_DISABLED'
  )
    return null

  return (
    <section aria-labelledby="lesson-discussion-heading" className="grid gap-4 scroll-mt-24">
      <header className="flex flex-wrap items-end justify-between gap-3 border-b border-border-subtle pb-3">
        <div className="flex items-start gap-2.5">
          <MessageCircle aria-hidden="true" className="mt-1 size-5 shrink-0 text-action-primary" />
          <div>
            <h2
              id="lesson-discussion-heading"
              className="text-lg font-bold tracking-tight sm:text-xl"
            >
              Thảo luận bài học
            </h2>
            <p className="mt-0.5 text-sm text-ink-secondary">
              Trao đổi câu hỏi và chia sẻ kinh nghiệm cùng học viên.
            </p>
          </div>
        </div>
        <label className="flex min-h-9 items-center gap-2 text-sm text-ink-secondary">
          <span>Sắp xếp</span>
          <select
            value={sort}
            onChange={(event) => setSort(event.target.value as 'newest' | 'oldest')}
            className="min-h-9 rounded-lg border border-border-subtle bg-white px-2.5 font-medium text-ink-primary outline-none focus-visible:ring-2 focus-visible:ring-action-primary"
          >
            <option value="newest">Mới nhất</option>
            <option value="oldest">Cũ nhất</option>
          </select>
        </label>
      </header>
      <p className="-mt-2 text-xs text-ink-muted">
        {comments.isSuccess ? `${rootCommentCount} bình luận gốc` : 'Thảo luận của bài học'}
      </p>
      <StudentCommentComposer lessonId={lessonId} parentId={null} onSent={() => undefined} />
      {comments.isPending ? (
        <p className="py-4 text-sm text-ink-secondary">Đang tải thảo luận…</p>
      ) : comments.isError ? (
        <ErrorState
          title="Chưa tải được phần thảo luận"
          description="Bạn vẫn có thể tiếp tục nội dung bài học."
          onRetry={() => void comments.refetch()}
        />
      ) : items.length ? (
        <>
          <div className="grid">
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
        <div className="grid justify-items-center gap-2 py-8 text-center">
          <MessageCircle aria-hidden="true" className="size-8 text-action-primary" />
          <p className="font-semibold">Chưa có bình luận</p>
          <p className="text-sm text-ink-secondary">
            Hãy bắt đầu cuộc thảo luận đầu tiên cho bài học này.
          </p>
        </div>
      )}
    </section>
  )
}

export function LessonDiscussion({ lessonId }: { lessonId: string }) {
  if (import.meta.env['VITE_LESSON_COMMENTS_ENABLED'] === 'false') return null
  return <LessonDiscussionContent lessonId={lessonId} />
}
