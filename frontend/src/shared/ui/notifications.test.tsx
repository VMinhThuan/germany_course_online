import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { Button } from './primitives'
import { NotificationProvider, useNotifications } from './notifications'

function NotificationTrigger() {
  const notifications = useNotifications()
  return (
    <Button
      onClick={() =>
        notifications.notify({
          kind: 'success',
          title: 'Saved',
          description: 'The sample is ready.',
          duration: 0,
        })
      }
    >
      Show notification
    </Button>
  )
}

describe('NotificationProvider', () => {
  it('shows and dismisses a notification', async () => {
    const user = userEvent.setup()
    render(
      <NotificationProvider>
        <NotificationTrigger />
      </NotificationProvider>,
    )

    await user.click(screen.getByRole('button', { name: 'Show notification' }))
    expect(screen.getByRole('status')).toHaveTextContent('Saved')
    expect(screen.getByText('The sample is ready.')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Đóng thông báo: Saved' }))
    expect(screen.queryByText('Saved')).not.toBeInTheDocument()
  })
})
