import { zodResolver } from '@hookform/resolvers/zod'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { describe, expect, it } from 'vitest'
import { Button } from './primitives'
import { PasswordInput, RHFTextInput } from './forms'

const schema = z.object({ email: z.string().email('Enter a valid email address.') })
type Values = z.infer<typeof schema>

function ValidationHarness() {
  const form = useForm<Values>({ resolver: zodResolver(schema), defaultValues: { email: '' } })
  return (
    <form onSubmit={form.handleSubmit(() => undefined)} noValidate>
      <RHFTextInput control={form.control} name="email" label="Email address" required />
      <Button type="submit">Validate</Button>
    </form>
  )
}

describe('PasswordInput', () => {
  it('toggles visibility with an accessible pressed state', async () => {
    const user = userEvent.setup()
    render(<PasswordInput aria-label="Password" />)
    const input = screen.getByLabelText('Password')

    expect(input).toHaveAttribute('type', 'password')
    await user.click(screen.getByRole('button', { name: 'Hiện mật khẩu' }))
    expect(input).toHaveAttribute('type', 'text')
    expect(screen.getByRole('button', { name: 'Ẩn mật khẩu' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
  })
})

describe('RHFTextInput', () => {
  it('shows validation feedback and connects it to the input', async () => {
    const user = userEvent.setup()
    render(<ValidationHarness />)
    await user.click(screen.getByRole('button', { name: 'Validate' }))

    const input = screen.getByRole('textbox', { name: 'Email address' })
    await waitFor(() => expect(input).toHaveAttribute('aria-invalid', 'true'))
    expect(screen.getByRole('alert')).toHaveTextContent('Enter a valid email address.')
    expect(input.getAttribute('aria-describedby')).toContain('email-error')
  })
})
