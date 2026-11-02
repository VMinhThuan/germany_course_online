import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { ExerciseCompletionAction, ExerciseSolutionPanel } from '@/domains/exercises'
import { MediaErrorState, MediaLoadingState, PDFViewer, VideoPlayer } from '@/domains/media'
import { MOCK_EXERCISE, MOCK_MEDIA } from '@/data/mock'

describe('media components', () => {
  it('announces loading and media error feedback', () => {
    const { rerender } = render(<MediaLoadingState />)
    expect(screen.getByRole('status')).toHaveTextContent('Đang tải nội dung')
    rerender(<MediaErrorState message="Link tạm thời hết hạn." />)
    expect(screen.getByRole('alert')).toHaveTextContent('Link tạm thời hết hạn.')
  })

  it('does not render an unsafe or unavailable video source', () => {
    render(
      <VideoPlayer
        media={{ ...MOCK_MEDIA[0]!, availability: 'ready', src: 'javascript:alert(1)' }}
      />,
    )
    expect(screen.getByRole('status')).toHaveTextContent('Nội dung chưa sẵn sàng')
    expect(document.querySelector('video')).not.toBeInTheDocument()
  })

  it('provides a link when PDF embedding is unsupported', () => {
    render(<PDFViewer media={MOCK_MEDIA[2]!} embeddedSupported={false} />)
    expect(screen.getByText(/PDF không được nhúng/)).toBeVisible()
    expect(screen.getByRole('link', { name: /Mở Phiếu bài tập mẫu/ })).toHaveAttribute(
      'href',
      expect.stringContaining('/demo-assets/a11-worksheet.pdf'),
    )
  })
})

describe('exercise controls', () => {
  it('calls the supplied completion callback and leaves status to the caller', async () => {
    const user = userEvent.setup()
    const onComplete = vi.fn().mockResolvedValue(undefined)
    render(<ExerciseCompletionAction exercise={MOCK_EXERCISE} onComplete={onComplete} />)
    await user.click(screen.getByRole('button', { name: 'Đánh dấu hoàn thành' }))
    await waitFor(() => expect(onComplete).toHaveBeenCalledOnce())
    expect(screen.getByRole('button', { name: 'Đánh dấu hoàn thành' })).toBeVisible()
  })

  it('hides solution assets until the repository supplied capability permits review', () => {
    const { rerender } = render(<ExerciseSolutionPanel exercise={MOCK_EXERCISE} />)
    expect(screen.queryByRole('link', { name: /Lời giải bài luyện nghe/ })).not.toBeInTheDocument()
    const authorized = {
      ...MOCK_EXERCISE,
      capabilities: { ...MOCK_EXERCISE.capabilities, canViewSolutions: true },
    }
    rerender(<ExerciseSolutionPanel exercise={authorized} />)
    expect(screen.getByRole('link', { name: /Tải Lời giải bài luyện nghe/ })).toBeVisible()
  })
})
