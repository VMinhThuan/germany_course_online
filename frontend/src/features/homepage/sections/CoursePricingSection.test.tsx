import { fireEvent, render, screen } from '@testing-library/react'
import axe from 'axe-core'
import { MemoryRouter } from 'react-router'
import { describe, expect, it, vi } from 'vitest'
import { PUBLIC_DEMO_COURSE } from '@/data/public-demo/fixtures'
import { CoursePricingSection } from './CoursePricingSection'

function renderPricing(props: Partial<Parameters<typeof CoursePricingSection>[0]> = {}) {
  return render(
    <MemoryRouter>
      <CoursePricingSection courses={props.courses ?? [PUBLIC_DEMO_COURSE]} {...props} />
    </MemoryRouter>,
  )
}

describe('CoursePricingSection', () => {
  it('shows the supplied course price, duration and outline without a preview entitlement', () => {
    const { container } = renderPricing()

    expect(screen.getByRole('article')).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 3 })).toHaveTextContent('Tiếng Đức A1.1')
    expect(screen.getByText(/1\.290\.000/)).toBeInTheDocument()
    expect(screen.getByText('12 tháng truy cập')).toBeInTheDocument()
    expect(screen.getByText('4 chương')).toBeInTheDocument()
    expect(screen.getByText('7 bài học')).toBeInTheDocument()
    expect(screen.queryByText(/học thử/i)).not.toBeInTheDocument()
    expect(
      container.querySelector('img[src="/assets/homepage/course-banner-a11.webp"]'),
    ).not.toBeNull()
  })

  it('shows an uploaded banner at its original ratio without covering it with card labels', () => {
    const { container } = renderPricing()
    const banner = container.querySelector<HTMLImageElement>(
      'img[src="/assets/homepage/course-banner-a11.webp"]',
    )

    expect(banner).toHaveClass('block', 'h-auto', 'w-full')
    expect(banner?.parentElement).not.toHaveClass('homepage-course-banner')
    expect(screen.getByRole('heading', { level: 3, name: PUBLIC_DEMO_COURSE.title })).toBeVisible()
    expect(screen.queryByText(PUBLIC_DEMO_COURSE.level, { exact: true })).not.toBeInTheDocument()
    expect(
      screen.getByRole('link', {
        name: `Xem khóa học ${PUBLIC_DEMO_COURSE.title}`,
      }),
    ).toHaveAttribute('href', '/courses/tieng-duc-a1-1')
  })

  it('keeps the level and title overlay for the built-in fallback artwork', () => {
    const course = { ...PUBLIC_DEMO_COURSE }
    delete course.thumbnailUrl
    const { container } = renderPricing({ courses: [course] })

    expect(
      container.querySelector('img[src="/assets/homepage/paniverse-hero.webp"]'),
    ).not.toBeNull()
    expect(screen.getByRole('heading', { level: 3, name: course.title })).toBeVisible()
    expect(screen.getByText(course.level, { exact: true })).toBeVisible()
  })

  it('shows one level label when the title does not already include it', () => {
    const course = { ...PUBLIC_DEMO_COURSE, title: 'Tiếng Đức cho người mới' }
    renderPricing({ courses: [course] })

    expect(screen.getByText(course.level, { exact: true })).toBeVisible()
  })

  it('formats only the supplied course price and access duration', () => {
    renderPricing({
      courses: [{ ...PUBLIC_DEMO_COURSE, priceVnd: '1290000', accessDurationMonths: 12 }],
    })

    expect(screen.getByText(/1\.290\.000/)).toBeInTheDocument()
    expect(screen.getByText('12 tháng truy cập')).toBeInTheDocument()
    expect(screen.queryByText('Đang cập nhật')).not.toBeInTheDocument()
  })

  it('renders one card per catalog result and links only to real course details', () => {
    renderPricing({
      courses: [
        PUBLIC_DEMO_COURSE,
        {
          ...PUBLIC_DEMO_COURSE,
          id: 'public-demo-a2',
          slug: 'tieng-duc-a2',
          title: 'Tiếng Đức A2 · Giao tiếp tiếp nối',
          level: 'A2',
          chapterCount: 8,
          lessonCount: 15,
        },
      ],
    })

    expect(screen.getAllByRole('article')).toHaveLength(2)
    expect(screen.getByText('8 chương')).toBeInTheDocument()
    expect(screen.getByText('15 bài học')).toBeInTheDocument()
    expect(
      screen.getByRole('link', { name: 'Xem khóa học Tiếng Đức A2 · Giao tiếp tiếp nối' }),
    ).toHaveAttribute('href', '/courses/tieng-duc-a2')
    expect(screen.getAllByRole('link', { name: /Xem nội dung khóa Tiếng Đức/ })).toHaveLength(2)
  })

  it('renders loading, error and empty states from repository state', () => {
    const retry = vi.fn()
    const { rerender } = renderPricing({ courses: [], loading: true })
    expect(screen.getByRole('status')).toHaveTextContent('Đang tải khóa học')

    rerender(
      <MemoryRouter>
        <CoursePricingSection courses={[]} error="Danh mục chưa tải được." onRetry={retry} />
      </MemoryRouter>,
    )
    expect(screen.getByRole('alert')).toHaveTextContent('Danh mục chưa tải được.')
    fireEvent.click(screen.getByRole('button', { name: 'Thử tải lại' }))
    expect(retry).toHaveBeenCalledOnce()

    rerender(
      <MemoryRouter>
        <CoursePricingSection courses={[]} />
      </MemoryRouter>,
    )
    expect(screen.getByRole('status')).toHaveTextContent('Chưa có khóa học')
  })

  it('has no automated accessibility violations in the pricing error state', async () => {
    const { container } = renderPricing({
      courses: [],
      error: 'Danh mục chưa tải được.',
      onRetry: vi.fn(),
    })

    const result = await axe.run(container)
    expect(result.violations).toEqual([])
  })
})
