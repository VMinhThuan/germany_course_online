import type { ReactNode } from 'react'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router'
import { describe, expect, it, vi } from 'vitest'
import { PUBLIC_DEMO_COURSE } from '@/data/public-demo/fixtures'
import { ApiCourseDetailPage } from './api-pages'

vi.mock('@/app/auth/auth-session', () => ({
  useAuthSession: () => ({ session: null, logout: vi.fn() }),
}))

vi.mock('@/data/public-demo', async () => {
  const { PUBLIC_DEMO_COURSE: course } = await import('@/data/public-demo/fixtures')
  return {
    usePublicCourse: () => ({ data: course, isPending: false, isError: false, refetch: vi.fn() }),
    usePublicCourseCatalog: vi.fn(),
    usePublicCourseCatalogPage: vi.fn(),
    usePublicSiteSettings: vi.fn(),
  }
})

vi.mock('@/shared/layouts/shells', () => ({
  PublicShell: ({ children }: { children: ReactNode }) => <>{children}</>,
}))

describe('ApiCourseDetailPage', () => {
  it('shows the course value, requirements and one clear registration action', () => {
    render(
      <MemoryRouter initialEntries={[`/courses/${PUBLIC_DEMO_COURSE.slug}`]}>
        <Routes>
          <Route path="/courses/:slug" element={<ApiCourseDetailPage />} />
        </Routes>
      </MemoryRouter>,
    )

    expect(screen.getByRole('heading', { level: 1, name: PUBLIC_DEMO_COURSE.title })).toBeVisible()
    expect(screen.getByRole('heading', { name: 'Bạn sẽ học gì?' })).toBeVisible()
    expect(screen.getByRole('heading', { name: 'Sau khóa học, bạn có thể' })).toBeVisible()
    expect(screen.getByRole('heading', { name: 'Bạn cần chuẩn bị gì?' })).toBeVisible()
    expect(screen.getAllByRole('button', { name: 'Đăng ký khóa học' })).toHaveLength(1)
    expect(screen.queryByText('enrollment')).not.toBeInTheDocument()
    expect(screen.queryByText(PUBLIC_DEMO_COURSE.level, { exact: true })).not.toBeInTheDocument()
  })
})
