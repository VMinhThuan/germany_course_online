import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { describe, expect, it, vi } from 'vitest'
import type { CourseTreeViewModel } from './models'
import { LessonOutlineAccordion } from './lesson-outline-accordion'

const tree: CourseTreeViewModel = {
  courseId: 'course-1',
  courseTitle: 'Niveau A1.1',
  sections: [
    {
      id: 'chapter-1',
      courseId: 'course-1',
      title: 'Lektion 1',
      sectionType: 'CHAPTER',
      contentStatus: 'PUBLISHED',
      sortOrder: 1,
      lessons: [
        {
          id: 'lesson-1',
          title: 'Begrüßung und Abschied',
          lessonType: 'LECTURE',
          contentStatus: 'PUBLISHED',
          countsTowardProgress: true,
          progressStatus: 'COMPLETED',
          hasVideo: true,
          exercises: [
            { id: 'exercise-1', title: 'Arbeitsblatt', sortOrder: 1 },
            { id: 'exercise-2', title: 'Wortschatzübung', sortOrder: 2 },
          ],
        },
        {
          id: 'lesson-2',
          title: 'Sich vorstellen',
          lessonType: 'LECTURE',
          contentStatus: 'PUBLISHED',
          countsTowardProgress: true,
          progressStatus: 'IN_PROGRESS',
          hasVideo: true,
          exercises: [],
        },
        {
          id: 'lesson-3',
          title: 'Nach dem Befinden fragen (Sie) – ein langer Lektionstitel',
          lessonType: 'PRACTICE',
          contentStatus: 'PUBLISHED',
          countsTowardProgress: true,
          progressStatus: 'NOT_STARTED',
          hasVideo: false,
          exercises: [],
        },
      ],
    },
  ],
}

function renderOutline(props: Partial<React.ComponentProps<typeof LessonOutlineAccordion>> = {}) {
  return render(
    <MemoryRouter>
      <LessonOutlineAccordion tree={tree} {...props} />
    </MemoryRouter>,
  )
}

describe('LessonOutlineAccordion', () => {
  it('supports Enter and Space from the keyboard', async () => {
    const user = userEvent.setup()
    renderOutline()

    const button = screen.getByRole('button', { name: /Begrüßung und Abschied/ })
    await user.tab()
    expect(button).toHaveFocus()

    await user.keyboard('{Enter}')
    expect(button).toHaveAttribute('aria-expanded', 'true')
    await user.keyboard(' ')
    expect(button).toHaveAttribute('aria-expanded', 'false')
  })

  it('expands one lesson at a time and lists only its real video and exercises', async () => {
    const user = userEvent.setup()
    renderOutline()

    await user.click(screen.getByRole('button', { name: /Begrüßung und Abschied/ }))
    expect(screen.getByRole('button', { name: /Begrüßung und Abschied/ })).toHaveAttribute(
      'aria-expanded',
      'true',
    )
    expect(screen.getByRole('link', { name: /Video bài giảng/ })).toHaveAttribute(
      'href',
      '/learn/lessons/lesson-1',
    )
    expect(screen.getByRole('link', { name: /Arbeitsblatt/ })).toHaveAttribute(
      'href',
      '/learn/exercises/exercise-1',
    )
    expect(screen.getByRole('link', { name: /Arbeitsblatt/ })).toHaveClass('bg-brand-pink/30')
    expect(screen.getByRole('link', { name: /Wortschatzübung/ })).toHaveAttribute(
      'href',
      '/learn/exercises/exercise-2',
    )

    await user.click(screen.getByRole('button', { name: /Sich vorstellen/ }))
    expect(screen.getByRole('button', { name: /Begrüßung und Abschied/ })).toHaveAttribute(
      'aria-expanded',
      'false',
    )
    expect(screen.getByRole('button', { name: /Sich vorstellen/ })).toHaveAttribute(
      'aria-expanded',
      'true',
    )
    expect(screen.getByRole('link', { name: /Video bài giảng/ })).toHaveAttribute(
      'href',
      '/learn/lessons/lesson-2',
    )
    expect(screen.queryByRole('link', { name: /Arbeitsblatt/ })).not.toBeInTheDocument()
  })

  it('does not invent exercise entries for a lesson with no published children', async () => {
    const user = userEvent.setup()
    renderOutline()

    await user.click(screen.getByRole('button', { name: /Nach dem Befinden fragen/ }))
    const button = screen.getByRole('button', { name: /Nach dem Befinden fragen/ })
    const panel = document.getElementById('lesson-3-outline-items')

    expect(button).toHaveAttribute('aria-expanded', 'true')
    expect(panel).toHaveTextContent('Chưa có video hoặc bài tập được công bố.')
    expect(within(panel as HTMLElement).queryByRole('link')).toBeNull()
    expect(screen.queryByText(/Bài tập \(1\)/)).toBeNull()
  })

  it('keeps a full German lesson title available and shows child items only for the current lesson in compact mode', async () => {
    const onSelectLesson = vi.fn()
    renderOutline({ compact: true, currentLessonId: 'lesson-1', onSelectLesson })

    const longTitle = 'Nach dem Befinden fragen (Sie) – ein langer Lektionstitel'
    const longTitleButton = screen.getByRole('button', {
      name: /Nach dem Befinden fragen.*Chưa bắt đầu/,
    })
    expect(longTitleButton).toHaveAttribute('title', longTitle)
    expect(longTitleButton.querySelector('span:nth-child(2)')).toHaveClass('line-clamp-2')
    expect(screen.getByRole('link', { name: /Arbeitsblatt/ })).toBeVisible()

    await userEvent.setup().click(longTitleButton)
    expect(onSelectLesson).toHaveBeenCalledWith('lesson-3')
    expect(screen.queryByText(/Chưa có video hoặc bài tập được công bố/)).toBeNull()
  })
})
