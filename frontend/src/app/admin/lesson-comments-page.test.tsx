import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AdminLessonCommentsPage } from './lesson-comments-page'

const mocks = vi.hoisted(() => ({
  listAdminComments: vi.fn(),
  adminSummary: vi.fn(),
  getAdminComment: vi.fn(),
}))

vi.mock('@/data/api/lesson-comments-repository', () => ({
  lessonCommentsRepository: {
    listAdminComments: mocks.listAdminComments,
    adminSummary: mocks.adminSummary,
    getAdminComment: mocks.getAdminComment,
    createAdminComment: vi.fn(),
    editAdminComment: vi.fn(),
    deleteAdminComment: vi.fn(),
    setAdminReaction: vi.fn(),
    removeAdminReaction: vi.fn(),
    adminHistory: vi.fn(),
  },
}))

const comment = {
  id: 'a'.repeat(24),
  lessonId: 'b'.repeat(24),
  parentId: null,
  rootId: 'a'.repeat(24),
  depth: 0,
  content: 'Một câu hỏi ẩn danh.',
  isAnonymous: true,
  author: {
    id: 'c'.repeat(24),
    fullName: 'Nguyễn An',
    email: 'an@example.test',
    role: 'STUDENT' as const,
    status: 'ACTIVE' as const,
  },
  revision: 1,
  editedAt: null,
  moderationEditedAt: null,
  deletedAt: null,
  deletedBy: null,
  deletionReason: null,
  createdAt: '2026-11-11T00:00:00.000Z',
  updatedAt: '2026-11-11T00:00:00.000Z',
  replyCount: 0,
  reactionCount: 0,
  reactions: [],
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
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
}

describe('Admin lesson comment management page', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.listAdminComments.mockResolvedValue({
      items: [comment],
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
      comment,
      thread: [comment],
      threadTotal: 1,
      threadHasMore: false,
      history: [],
    })
  })

  it('shows author identity to Admin and clearly marks anonymous posts', async () => {
    render(<AdminLessonCommentsPage />, { wrapper })

    expect(await screen.findByText('an@example.test')).toBeInTheDocument()
    expect(await screen.findByText('Được đăng ẩn danh')).toBeInTheDocument()
    await waitFor(() => expect(mocks.getAdminComment).toHaveBeenCalledWith(comment.id))
    expect(await screen.findByText('Được đăng dưới chế độ ẩn danh')).toBeInTheDocument()
    expect(screen.getAllByText('Một câu hỏi ẩn danh.').length).toBeGreaterThan(0)
  })
})
