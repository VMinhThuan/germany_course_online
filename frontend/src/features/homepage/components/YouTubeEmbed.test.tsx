import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { getYouTubeEmbedUrl, getYouTubeVideoId, YouTubeEmbed } from './YouTubeEmbed'

const videoId = 'L-lkjyMArwE'
const title = 'Video giới thiệu khóa học A1.1'

describe('YouTubeEmbed', () => {
  it('extracts IDs from supported YouTube URL formats', () => {
    expect(getYouTubeVideoId(`https://www.youtube.com/watch?v=${videoId}`)).toBe(videoId)
    expect(getYouTubeVideoId(`https://youtu.be/${videoId}`)).toBe(videoId)
    expect(getYouTubeVideoId(`https://youtube.com/embed/${videoId}`)).toBe(videoId)
    expect(getYouTubeVideoId(`https://m.youtube.com/shorts/${videoId}`)).toBe(videoId)
  })

  it('rejects arbitrary hosts and malformed video IDs', () => {
    expect(getYouTubeVideoId(`https://youtube.com.evil.example/watch?v=${videoId}`)).toBeNull()
    expect(getYouTubeVideoId(`https://example.com/watch?v=${videoId}`)).toBeNull()
    expect(getYouTubeVideoId('https://youtube.com/watch?v=short')).toBeNull()
    expect(getYouTubeVideoId('not a URL')).toBeNull()
  })

  it('builds a privacy-enhanced embed URL without autoplay', () => {
    expect(getYouTubeEmbedUrl(videoId)).toBe(
      `https://www.youtube-nocookie.com/embed/${videoId}?rel=0`,
    )
    expect(getYouTubeEmbedUrl('bad-id')).toBeNull()
  })

  it('loads the actual iframe only after the keyboard-accessible play button is activated', () => {
    render(
      <YouTubeEmbed
        url={`https://www.youtube.com/watch?v=${videoId}`}
        title={title}
        poster="/assets/homepage/feature-interactive.webp"
      />,
    )

    expect(screen.queryByTitle(title)).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Xem trên YouTube' })).toHaveAttribute(
      'href',
      `https://www.youtube.com/watch?v=${videoId}`,
    )
    fireEvent.click(screen.getByRole('button', { name: `Tải video: ${title}` }))

    const frame = screen.getByTitle(title)
    expect(frame).toHaveAttribute('src', `https://www.youtube-nocookie.com/embed/${videoId}?rel=0`)
    expect(frame.getAttribute('src')).not.toContain('autoplay')
    expect(frame).toHaveAttribute('allowfullscreen')
  })

  it('shows a safe unavailable state for an invalid URL', () => {
    render(<YouTubeEmbed url="https://example.com/video" title={title} />)

    expect(screen.getByRole('group', { name: title })).toHaveTextContent(
      'Video giới thiệu hiện chưa sẵn sàng.',
    )
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
    expect(screen.queryByRole('link')).not.toBeInTheDocument()
  })
})
