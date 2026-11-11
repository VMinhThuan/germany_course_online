import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AdminLessonCommentsPage } from './lesson-comments-page'

const mocks = vi.hoisted(() => ({
  listAdminComments: vi.fn(),
  adminSummary: vi.fn(),
  getAdminComment: vi.fn(),
  listCourses: vi.fn(),
  listSections: vi.fn(),
  listLessons: vi.fn(),
  listStudents: vi.fn(),
  createAdminComment: vi.fn(),
}))

vi.mock('@/data/api/admin-repository', () => ({
  adminRepository: {
    listCourses: mocks.listCourses,
    listSections: mocks.listSections,
    listLessons: mocks.listLessons,
    listStudents: mocks.listStudents,
  },
}))

vi.mock('@/data/api/lesson-comments-repository', () => ({
  lessonCommentsRepository: {
    listAdminComments: mocks.listAdminComments,
    adminSummary: mocks.adminSummary,
    getAdminComment: mocks.getAdminComment,
    createAdminComment: mocks.createAdminComment,
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
    mocks.createAdminComment.mockResolvedValue(comment)
    mocks.listCourses.mockResolvedValue({
      items: [{ id: 'd'.repeat(24), code: 'A1.1', level: 'A1', title: 'Niveau A1.1' }],
      page: 1,
      pageSize: 100,
      total: 1,
      hasMore: false,
    })
    mocks.listSections.mockResolvedValue({
      items: [
        {
          id: 'e'.repeat(24),
          courseId: 'd'.repeat(24),
          title: 'Kapitel 1',
          sectionType: 'CHAPTER',
        },
      ],
      page: 1,
      pageSize: 100,
      total: 1,
      hasMore: false,
    })
    mocks.listLessons.mockResolvedValue({
      items: [
        {
          id: 'b'.repeat(24),
          sectionId: 'e'.repeat(24),
          title: 'Begrüßung',
          lessonType: 'LECTURE',
        },
      ],
      page: 1,
      pageSize: 100,
      total: 1,
      hasMore: false,
    })
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

    expect(await screen.findByText(/an@example\.test/)).toBeInTheDocument()
    expect(await screen.findByText('Đăng ẩn danh')).toBeInTheDocument()
    await waitFor(() => expect(mocks.getAdminComment).toHaveBeenCalledWith(comment.id))
    expect(await screen.findByText('Được đăng ẩn danh với học viên')).toBeInTheDocument()
    expect(screen.getAllByText('Một câu hỏi ẩn danh.').length).toBeGreaterThan(0)
    expect(screen.queryByLabelText('Lesson ID')).not.toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Quản lý bình luận' })).toBeInTheDocument()
  })

  it('creates an admin comment using course, section, and lesson choices', async () => {
    const user = userEvent.setup()
    const created = { ...comment, id: 'f'.repeat(24), isAnonymous: false }
    mocks.createAdminComment.mockResolvedValue(created)
    render(<AdminLessonCommentsPage />, { wrapper })

    await user.click(await screen.findByRole('button', { name: 'Bình luận mới' }))
    const dialog = await screen.findByRole('dialog')
    await user.click(within(dialog).getByRole('combobox', { name: 'Khóa học' }))
    await user.click(within(dialog).getByRole('option', { name: /Niveau A1\.1/ }))
    await user.click(within(dialog).getByRole('combobox', { name: 'Chương' }))
    await user.click(await within(dialog).findByRole('option', { name: /Kapitel 1/ }))
    await user.click(within(dialog).getByRole('combobox', { name: 'Bài học' }))
    await user.click(await within(dialog).findByRole('option', { name: /Begrüßung/ }))
    await user.type(within(dialog).getByLabelText('Nội dung bình luận'), 'Câu trả lời từ giáo viên')
    await user.click(within(dialog).getByRole('button', { name: 'Đăng bình luận' }))

    await waitFor(() =>
      expect(mocks.createAdminComment).toHaveBeenCalledWith('b'.repeat(24), {
        content: 'Câu trả lời từ giáo viên',
        parentId: null,
      }),
    )
    expect(await screen.findByText('Được đăng ẩn danh với học viên')).toBeInTheDocument()
  })

  it('keeps advanced filters collapsed until requested and resolves authors by name or email', async () => {
    const user = userEvent.setup()
    mocks.listStudents.mockResolvedValue({
      items: [{ id: 'c'.repeat(24), fullName: 'Nguyễn An', email: 'an@example.test' }],
      page: 1,
      pageSize: 50,
      total: 1,
      hasMore: false,
    })
    render(<AdminLessonCommentsPage />, { wrapper })

    expect(screen.queryByLabelText('Tìm tên hoặc email học viên')).not.toBeInTheDocument()
    await user.click(await screen.findByRole('button', { name: /Bộ lọc nâng cao/ }))
    const dialog = await screen.findByRole('dialog', { name: 'Bộ lọc nâng cao' })
    await user.type(within(dialog).getByLabelText('Tìm tên hoặc email học viên'), 'nguyen')
    expect(
      await within(dialog).findByRole('option', { name: /Nguyễn An · an@example.test/ }),
    ).toBeInTheDocument()
  })

  it('shows thread details beside the inbox and returns from the detail view on mobile', async () => {
    const user = userEvent.setup()
    render(<AdminLessonCommentsPage />, { wrapper })

    const inboxItem = await screen.findByRole('button', { name: /Mở bình luận của Nguyễn An/ })
    await user.click(inboxItem)
    expect(await screen.findByRole('button', { name: 'Trở lại hộp thư' })).toBeInTheDocument()
    expect(await screen.findByText('Kapitel 1')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Trở lại hộp thư' }))
    expect(screen.getByRole('heading', { name: 'Hộp thư' })).toBeInTheDocument()
  })
})
