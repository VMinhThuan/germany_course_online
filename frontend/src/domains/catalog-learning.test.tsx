import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import {
  CourseCard,
  CourseGrid,
  CourseSectionAccordion,
  FreePreviewSection,
} from '@/domains/catalog'
import { CourseTree, LessonRow, LockedContentPanel } from '@/domains/learning'
import { A11_COURSE, MOCK_PREVIEW_MANIFEST } from '@/data/mock'

describe('catalog components', () => {
  it('avoids repeating the level when it is already part of the course title', () => {
    const { container } = render(<CourseCard course={A11_COURSE} onOpen={() => undefined} />)
    const courseImage = container.querySelector<HTMLImageElement>(
      `img[src="${A11_COURSE.thumbnailUrl}"]`,
    )

    expect(courseImage).toHaveClass('block', 'h-auto', 'w-full')
    expect(courseImage?.parentElement).not.toHaveClass('relative')
    expect(screen.queryByText(A11_COURSE.level, { exact: true })).not.toBeInTheDocument()
    expect(screen.getByRole('heading', { name: A11_COURSE.title })).toBeVisible()
    expect(screen.getByText(/1\.290\.000/)).toBeVisible()
    expect(screen.getByRole('button', { name: /Xem khóa học/ })).toBeVisible()
  })

  it('shows the level when the course title does not include it', () => {
    render(
      <CourseCard
        course={{ ...A11_COURSE, title: 'Tiếng Đức cho người mới' }}
        onOpen={() => undefined}
      />,
    )

    expect(screen.getByText(A11_COURSE.level, { exact: true })).toHaveClass('bg-brand-pink')
  })

  it('shows catalog loading, empty, and error states', () => {
    const { rerender } = render(<CourseGrid courses={[]} loading />)
    expect(screen.getByRole('status')).toHaveTextContent('Đang tải khóa học')
    rerender(<CourseGrid courses={[]} />)
    expect(screen.getByRole('status')).toHaveTextContent('Chưa có khóa học')
    rerender(<CourseGrid courses={[]} error="HTTP 500" />)
    expect(screen.getByRole('alert')).toHaveTextContent('HTTP 500')
  })

  it('expands the course section accordion to show its lessons', async () => {
    const user = userEvent.setup()
    render(<CourseSectionAccordion section={A11_COURSE.sections[0]!} />)
    await user.click(screen.getByRole('button', { name: /Hallo! · Chào hỏi/ }))
    expect(screen.getByRole('button', { name: /Guten Tag!/ })).toBeVisible()
  })

  it('only displays a preview section whose chapter ID exists in the mock manifest', () => {
    const { rerender } = render(
      <FreePreviewSection section={A11_COURSE.sections[0]!} manifest={MOCK_PREVIEW_MANIFEST}>
        Preview content
      </FreePreviewSection>,
    )
    expect(screen.getByText('Preview content')).toBeVisible()
    rerender(
      <FreePreviewSection section={A11_COURSE.sections[3]!} manifest={MOCK_PREVIEW_MANIFEST}>
        Hidden preview
      </FreePreviewSection>,
    )
    expect(screen.queryByText('Hidden preview')).not.toBeInTheDocument()
  })
})

describe('learning navigation and access', () => {
  it('renders lesson navigation as a link and marks the current lesson', () => {
    render(
      <LessonRow
        lesson={A11_COURSE.sections[0]!.lessons[0]!}
        href="/learn/a11-lesson-01"
        current
      />,
    )
    const link = screen.getByRole('link', { name: /Guten Tag!/ })
    expect(link).toHaveAttribute('aria-current', 'page')
    expect(link.querySelector('button')).toBeNull()
  })

  it('calls the course tree lesson callback from a native button', async () => {
    const user = userEvent.setup()
    const onSelect = vi.fn()
    render(
      <CourseTree
        tree={{
          courseId: A11_COURSE.id,
          courseTitle: A11_COURSE.title,
          sections: A11_COURSE.sections,
        }}
        onSelectLesson={onSelect}
      />,
    )
    await user.click(screen.getByRole('button', { name: /Guten Tag!/ }))
    expect(onSelect).toHaveBeenCalledWith('a11-lesson-01')
  })

  it('explains restricted access without creating an interactive nested control', () => {
    render(
      <LockedContentPanel
        access={{
          kind: 'restricted',
          label: 'Cần quyền truy cập',
          reason: 'Scenario chưa có enrollment.',
        }}
      />,
    )
    expect(screen.getByRole('heading', { name: 'Cần quyền truy cập' })).toBeVisible()
    expect(screen.getByText('Scenario chưa có enrollment.')).toBeVisible()
  })
})
