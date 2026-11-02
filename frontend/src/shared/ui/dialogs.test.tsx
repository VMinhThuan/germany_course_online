import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { DialogExamples, DialogProvider } from './dialogs'

describe('DialogProvider', () => {
  it('opens and closes a confirmation when it is cancelled', async () => {
    const user = userEvent.setup()
    render(
      <DialogProvider>
        <DialogExamples />
      </DialogProvider>,
    )

    const trigger = screen.getByRole('button', { name: 'Xác nhận thao tác' })
    await user.click(trigger)
    expect(screen.getByRole('alertdialog', { name: 'Lưu thay đổi?' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Hủy' }))
    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument())
    expect(trigger).toBeInTheDocument()
  })
})
