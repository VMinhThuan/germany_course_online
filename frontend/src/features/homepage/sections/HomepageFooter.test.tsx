import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { describe, expect, it } from 'vitest'
import { HomepageFooter } from './HomepageFooter'

describe('HomepageFooter', () => {
  it('shows the brand and real navigation while omitting unconfigured contact methods', () => {
    const { container } = render(
      <MemoryRouter>
        <HomepageFooter />
      </MemoryRouter>,
    )

    expect(screen.getByRole('img', { name: 'PAniverseDeutsch' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Khóa học' })).toHaveAttribute('href', '/courses')
    expect(screen.getByRole('link', { name: 'Liên hệ' })).toHaveAttribute(
      'href',
      '/#footer-contact',
    )
    expect(
      screen.getByText('Thông tin liên hệ sẽ được bổ sung khi đã được xác nhận.'),
    ).toBeVisible()
    expect(container.querySelector('a[href^="mailto:"]')).toBeNull()
    expect(container.querySelector('a[href^="tel:"]')).toBeNull()
    expect(
      screen.queryByRole('link', { name: /Điều khoản|Chính sách bảo mật/ }),
    ).not.toBeInTheDocument()
  })

  it('points signed-in learners to their course area', () => {
    render(
      <MemoryRouter>
        <HomepageFooter signedIn />
      </MemoryRouter>,
    )

    expect(screen.getByRole('link', { name: 'Khu vực học viên' })).toHaveAttribute(
      'href',
      '/student/courses',
    )
  })
})
