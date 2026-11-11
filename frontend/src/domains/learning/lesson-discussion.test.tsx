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
  replyCount: 0,
  reactions: [],
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
})
