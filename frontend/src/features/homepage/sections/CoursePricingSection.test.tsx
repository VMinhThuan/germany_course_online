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
  it('shows the catalog course without inventing a price or access duration', () => {
    const { container } = renderPricing()

    expect(screen.getByRole('article')).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 3 })).toHaveTextContent('Tiếng Đức A1.1')
    expect(screen.getByText('Học phí đang cập nhật')).toBeInTheDocument()
    expect(screen.getByText('Thời hạn truy cập đang cập nhật')).toBeInTheDocument()
    expect(screen.getByText('4 chương · 7 bài học')).toBeInTheDocument()
    expect(
      container.querySelector('img[src="/assets/homepage/course-banner-a11.webp"]'),
    ).not.toBeNull()
    expect(screen.queryByText(/EUR|Lifetime|€|\b\d+\.\d{2}\b/)).not.toBeInTheDocument()
  })

  it('formats only the supplied course price and access duration', () => {
    renderPricing({
      courses: [{ ...PUBLIC_DEMO_COURSE, priceVnd: '1290000', accessDurationMonths: 12 }],
    })

    expect(screen.getByText(/1\.290\.000/)).toBeInTheDocument()
    expect(screen.getByText('12 tháng truy cập')).toBeInTheDocument()
    expect(screen.queryByText('Học phí đang cập nhật')).not.toBeInTheDocument()
  })

  it('renders one card for each catalog result and exposes real course and preview routes', () => {
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
    expect(screen.getByText('Nội dung theo 8 chương')).toBeInTheDocument()
    expect(screen.getByText('Khám phá 15 bài học')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Tiếng Đức A2/ })).toHaveAttribute(
      'href',
      '/courses/tieng-duc-a2',
    )
    expect(screen.getAllByRole('link', { name: 'Mở nội dung học thử' })).toHaveLength(2)
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
