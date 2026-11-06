import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { StudentTestimonialsSection } from './StudentTestimonialsSection'

describe('StudentTestimonialsSection', () => {
  it('shows ten sample reviews with avatars in a continuously looping carousel without controls', () => {
    const { container } = render(<StudentTestimonialsSection />)

    expect(screen.getAllByRole('article')).toHaveLength(10)
    expect(
      screen.getByRole('region', { name: 'Chia sẻ về hành trình học tiếng Đức' }),
    ).toHaveAttribute('aria-roledescription', 'carousel')
    const originalReviews = container.querySelector(
      '.homepage-testimonial-group:not([aria-hidden])',
    )
    expect(originalReviews).not.toBeNull()
    expect(within(originalReviews as HTMLElement).getAllByText('Nội dung mẫu')).toHaveLength(10)
    expect(container.querySelectorAll('.lucide-circle-user-round')).toHaveLength(20)
    expect(container.querySelectorAll('.homepage-testimonial-card')).toHaveLength(20)
    expect(container.querySelector('.homepage-testimonials-track')).toBeInTheDocument()
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
    expect(screen.queryByText(/đánh giá minh họa/i)).not.toBeInTheDocument()
  })
})
