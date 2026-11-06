import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { StudentTestimonialsSection } from './StudentTestimonialsSection'

describe('StudentTestimonialsSection', () => {
  it('shows ten clearly labeled sample reviews with accessible carousel controls', () => {
    render(<StudentTestimonialsSection />)

    expect(screen.getByText('Đánh giá minh họa · sẽ thay bằng chia sẻ đã xác nhận')).toBeVisible()
    expect(screen.getAllByRole('article')).toHaveLength(10)
    expect(
      screen.getByRole('region', { name: 'Các đánh giá minh họa của học viên' }),
    ).toHaveAttribute('aria-roledescription', 'carousel')
    expect(screen.getByRole('button', { name: 'Tạm dừng tự chạy đánh giá' })).toBeVisible()
    expect(screen.getByRole('button', { name: 'Đánh giá trước' })).toBeVisible()
    expect(screen.getByRole('button', { name: 'Đánh giá tiếp theo' })).toBeVisible()
  })
})
