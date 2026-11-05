import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { YouTubeLessonPlayer } from './youtube-lesson-player'

describe('YouTubeLessonPlayer', () => {
  it('renders the API video ID in a privacy-enhanced, lazy iframe after activation', () => {
    const video = { provider: 'YOUTUBE' as const, videoId: 'lamg3tUwct4' }
    render(<YouTubeLessonPlayer video={video} title="Begrüßung und Abschied" />)

    expect(screen.queryByTitle('Begrüßung und Abschied')).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Tải video: Begrüßung und Abschied' }))

    expect(screen.getByTitle('Begrüßung und Abschied')).toHaveAttribute(
      'src',
      'https://www.youtube-nocookie.com/embed/lamg3tUwct4?rel=0',
    )
  })

  it('does not render an iframe for an invalid API video ID', () => {
    const video = { provider: 'YOUTUBE' as const, videoId: 'bad-id' }
    const { container } = render(<YouTubeLessonPlayer video={video} title="Lesson" />)

    expect(container).toBeEmptyDOMElement()
  })
})
