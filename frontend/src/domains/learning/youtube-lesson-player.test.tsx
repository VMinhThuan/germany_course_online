import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { parseYouTubeVideoId, YouTubeLessonPlayer } from './youtube-lesson-player'

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

  it('renders an eager preview without moving focus', () => {
    const video = { provider: 'YOUTUBE' as const, videoId: 'lamg3tUwct4' }
    render(<YouTubeLessonPlayer eager video={video} title="Preview" />)

    expect(screen.getByTitle('Preview')).toHaveAttribute(
      'src',
      'https://www.youtube-nocookie.com/embed/lamg3tUwct4?rel=0',
    )
    expect(document.activeElement).not.toBe(screen.getByTitle('Preview'))
  })
})

describe('parseYouTubeVideoId', () => {
  it.each([
    ['lamg3tUwct4', 'lamg3tUwct4'],
    ['https://youtu.be/lamg3tUwct4?t=8', 'lamg3tUwct4'],
    ['https://www.youtube.com/watch?v=lamg3tUwct4', 'lamg3tUwct4'],
    ['https://youtube.com/shorts/lamg3tUwct4', 'lamg3tUwct4'],
  ])('extracts a video ID from %s', (input, expected) => {
    expect(parseYouTubeVideoId(input)).toBe(expected)
  })

  it('rejects non-YouTube hosts and malformed IDs', () => {
    expect(parseYouTubeVideoId('https://example.com/watch?v=lamg3tUwct4')).toBeNull()
    expect(parseYouTubeVideoId('https://youtube.com/watch?v=bad')).toBeNull()
  })
})
