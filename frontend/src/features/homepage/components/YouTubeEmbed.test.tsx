import { render, screen } from '@testing-library/react'
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

  it('builds a privacy-enhanced inline embed URL without autoplay', () => {
    expect(getYouTubeEmbedUrl(videoId)).toBe(
      `https://www.youtube-nocookie.com/embed/${videoId}?rel=0&playsinline=1`,
    )
    expect(getYouTubeEmbedUrl('bad-id')).toBeNull()
  })

  it('shows the native YouTube preview immediately without an extra play layer', () => {
    render(<YouTubeEmbed url={`https://www.youtube.com/watch?v=${videoId}`} title={title} />)

    const frame = screen.getByTitle(title)
    expect(frame).toHaveAttribute(
      'src',
      `https://www.youtube-nocookie.com/embed/${videoId}?rel=0&playsinline=1`,
    )
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Xem trên YouTube' })).toHaveAttribute(
      'href',
      `https://www.youtube.com/watch?v=${videoId}`,
    )
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
