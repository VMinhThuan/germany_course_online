import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
  Button,
  Pagination,
} from './primitives'

describe('Button', () => {
  it('disables itself and announces busy state while loading', () => {
    render(<Button loading>Saving</Button>)
    expect(screen.getByRole('button', { name: 'Saving' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Saving' })).toHaveAttribute('aria-busy', 'true')
  })
})

describe('Accordion', () => {
  it('opens its associated content from the trigger', async () => {
    const user = userEvent.setup()
    render(
      <Accordion type="single" collapsible>
        <AccordionItem value="one">
          <AccordionTrigger>Open details</AccordionTrigger>
          <AccordionContent>Details are visible.</AccordionContent>
        </AccordionItem>
      </Accordion>,
    )

    await user.click(screen.getByRole('button', { name: 'Open details' }))
    expect(screen.getByText('Details are visible.')).toBeVisible()
  })
})

describe('Pagination', () => {
  it('updates the requested page and disables boundary actions', async () => {
    const user = userEvent.setup()
    const onPageChange = vi.fn()
    render(<Pagination page={1} pages={3} onPageChange={onPageChange} />)

    expect(screen.getByRole('button', { name: /Trang trước/ })).toBeDisabled()
    await user.click(screen.getByRole('button', { name: /Trang sau/ }))
    expect(onPageChange).toHaveBeenCalledWith(2)
  })
})
