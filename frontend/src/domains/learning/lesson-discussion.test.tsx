import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { ApiAdminLessonComment, ApiStudentLessonComment } from '@/lib/api/types'
import { LessonDiscussion } from './lesson-discussion'

const mocks = vi.hoisted(() => ({
  listLessonComments: vi.fn(),
  listReplies: vi.fn(),
  createStudentComment: vi.fn(),
  editStudentComment: vi.fn(),
  deleteStudentComment: vi.fn(),
  setStudentReaction: vi.fn(),
  removeStudentReaction: vi.fn(),
  studentHistory: vi.fn(),
  listAdminComments: vi.fn(),
  adminSummary: vi.fn(),
  getAdminComment: vi.fn(),
  createAdminComment: vi.fn(),
  editAdminComment: vi.fn(),
  deleteAdminComment: vi.fn(),
  setAdminReaction: vi.fn(),
  removeAdminReaction: vi.fn(),
  adminHistory: vi.fn(),
}))

vi.mock('@/data/api/lesson-comments-repository', () => ({
  lessonCommentsRepository: mocks,
}))

const comment: ApiStudentLessonComment = {
  id: 'a'.repeat(24),
  lessonId: 'b'.repeat(24),
  parentId: null,
  rootId: 'a'.repeat(24),
  content: 'Mình chưa hiểu câu này.',
  isAnonymous: true,
  isModerated: false,
  revision: 1,
  editedAt: null,
  createdAt: '2026-11-11T00:00:00.000Z',
  updatedAt: '2026-11-11T00:00:00.000Z',
  author: { displayName: 'Học viên ẩn danh', avatarUrl: null, isAnonymous: true, role: 'STUDENT' },
  isMine: false,
  canEdit: false,
  canDelete: false,
  isDeleted: false,
  isThreadLocked: false,
  replyCount: 0,
  reactions: [],
}

const reply: ApiStudentLessonComment = {
  ...comment,
  id: 'f'.repeat(24),
  parentId: comment.id,
  rootId: comment.id,
  content: 'Bạn có thể xem lại ví dụ thứ hai.',
  isAnonymous: false,
  author: { displayName: 'Minh Anh', avatarUrl: null, isAnonymous: false, role: 'STUDENT' },
  replyCount: 0,
}

const adminComment: ApiAdminLessonComment = {
  ...comment,
  depth: 0,
  author: {
    id: 'c'.repeat(24),
    fullName: 'Nguyễn An',
    email: 'an@example.test',
    role: 'STUDENT',
    status: 'ACTIVE',
  },
  moderationEditedAt: null,
  deletedAt: null,
  deletedBy: null,
  deletionReason: null,
  reactionCount: 0,
  myReaction: null,
  context: {
    courseId: 'd'.repeat(24),
    courseTitle: 'Niveau A1.1',
    sectionId: 'e'.repeat(24),
    sectionTitle: 'Kapitel 1',
    lessonId: 'b'.repeat(24),
    lessonTitle: 'Begrüßung',
  },
}

function wrapper({ children }: { children: React.ReactNode }) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
}

describe('lesson discussion UI', () => {
  beforeEach(() => {
    vi.stubEnv('VITE_LESSON_COMMENTS_ENABLED', 'true')
    vi.clearAllMocks()
    mocks.listLessonComments.mockResolvedValue({
      items: [comment],
      total: 1,
      hasMore: false,
      nextCursor: null,
    })
    mocks.listReplies.mockResolvedValue({ items: [], total: 0, hasMore: false, nextCursor: null })
    mocks.createStudentComment.mockResolvedValue(comment)
    mocks.studentHistory.mockResolvedValue({ items: [] })
    mocks.listAdminComments.mockResolvedValue({
      items: [adminComment],
      page: 1,
      pageSize: 20,
      total: 1,
      hasMore: false,
    })
    mocks.adminSummary.mockResolvedValue({
      total: 1,
      recent: 1,
      anonymous: 1,
      edited: 0,
      deleted: 0,
    })
    mocks.getAdminComment.mockResolvedValue({
      comment: adminComment,
      thread: [adminComment],
      threadTotal: 1,
      threadHasMore: false,
      history: [],
    })
  })

  it('hides the discussion only when explicitly disabled', () => {
    vi.stubEnv('VITE_LESSON_COMMENTS_ENABLED', 'false')
    render(<LessonDiscussion lessonId={comment.lessonId} />)
    expect(screen.queryByRole('heading', { name: 'Thảo luận bài học' })).not.toBeInTheDocument()
    expect(mocks.listLessonComments).not.toHaveBeenCalled()
  })

  it('renders the anonymous public label and submits a student comment', async () => {
    const user = userEvent.setup()
    render(<LessonDiscussion lessonId={comment.lessonId} />, { wrapper })

    expect(await screen.findByText('Học viên ẩn danh')).toBeInTheDocument()
    expect(screen.getByText(comment.content)).toBeInTheDocument()
    expect(screen.queryByText('an@example.test')).not.toBeInTheDocument()

    await user.type(screen.getByLabelText('Nội dung bình luận'), ' Câu hỏi mới ')
    await user.click(screen.getByRole('checkbox', { name: 'Đăng ẩn danh' }))
    await user.click(screen.getByRole('button', { name: 'Gửi bình luận' }))

    await waitFor(() =>
      expect(mocks.createStudentComment).toHaveBeenCalledWith(comment.lessonId, {
        content: 'Câu hỏi mới',
        isAnonymous: true,
        parentId: null,
      }),
    )
  })

  it('uses a compact reaction picker and sends the selected reaction', async () => {
    const user = userEvent.setup()
    render(<LessonDiscussion lessonId={comment.lessonId} />, { wrapper })

    await user.click(await screen.findByRole('button', { name: 'Thêm reaction' }))
    await user.click(screen.getByRole('button', { name: 'Yêu thích' }))

    await waitFor(() => expect(mocks.setStudentReaction).toHaveBeenCalledWith(comment.id, 'LOVE'))
  })

  it('opens replies inline and preserves the nested reply relationship', async () => {
    const user = userEvent.setup()
    mocks.listLessonComments.mockResolvedValue({
      items: [{ ...comment, replyCount: 1 }],
      total: 1,
      hasMore: false,
      nextCursor: null,
    })
    mocks.listReplies.mockImplementation(async (parentId: string) => ({
      items: parentId === comment.id ? [reply] : [],
      total: parentId === comment.id ? 1 : 0,
      hasMore: false,
      nextCursor: null,
    }))
    render(<LessonDiscussion lessonId={comment.lessonId} />, { wrapper })

    await user.click(await screen.findByRole('button', { name: 'Xem 1 phản hồi' }))
    expect(await screen.findByText(reply.content)).toBeInTheDocument()
    expect(mocks.listReplies).toHaveBeenCalledWith(
      comment.id,
      expect.objectContaining({ limit: 20 }),
    )
  })

  it('opens the inline reply composer and creates a reply under the selected comment', async () => {
    const user = userEvent.setup()
    render(<LessonDiscussion lessonId={comment.lessonId} />, { wrapper })

    await user.click((await screen.findAllByRole('button', { name: 'Trả lời' }))[0]!)
    await user.type(screen.getByLabelText('Nội dung phản hồi'), 'Mình sẽ giải thích ví dụ này.')
    await user.click(screen.getByRole('button', { name: 'Gửi phản hồi' }))

    await waitFor(() =>
      expect(mocks.createStudentComment).toHaveBeenCalledWith(comment.lessonId, {
        content: 'Mình sẽ giải thích ví dụ này.',
        isAnonymous: false,
        parentId: comment.id,
      }),
    )
  })

  it('keeps edit and delete in the contextual menu', async () => {
    const user = userEvent.setup()
    const ownedComment = { ...comment, isMine: true, canEdit: true, canDelete: true }
    mocks.listLessonComments.mockResolvedValue({
      items: [ownedComment],
      total: 1,
      hasMore: false,
      nextCursor: null,
    })
    render(<LessonDiscussion lessonId={comment.lessonId} />, { wrapper })

    await user.click(await screen.findByRole('button', { name: 'Thao tác bình luận' }))
    await user.click(screen.getByRole('menuitem', { name: 'Chỉnh sửa' }))
    expect(screen.getByRole('textbox', { name: 'Chỉnh sửa bình luận' })).toHaveValue(
      comment.content,
    )
    await user.click(screen.getByRole('button', { name: 'Hủy' }))

    await user.click(screen.getByRole('button', { name: 'Thao tác bình luận' }))
    await user.click(screen.getByRole('menuitem', { name: 'Xóa bình luận' }))
    expect(await screen.findByText(/ẩn toàn bộ phản hồi bên dưới/)).toBeInTheDocument()
  })
})
