import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { DecorativeHeading } from './decorative-heading'
import { createLetteringLayout } from './lettering-engine'

describe('Custom vector lettering', () => {
  it('normalizes composed and decomposed Vietnamese text to the same glyph layout', () => {
    const composed = createLetteringLayout('Không gian bài học')
    const decomposed = createLetteringLayout('Không gian bài học'.normalize('NFD'))

    expect(composed).not.toBeNull()
    if (!composed) return
    expect(decomposed).toEqual(composed)
    expect(composed?.glyphs.some((glyph) => glyph.marks.includes('\u0302'))).toBe(true)
    expect(composed?.glyphs.some((glyph) => glyph.marks.includes('\u0323'))).toBe(true)
    expect(composed.baseline).toBeGreaterThan(0)
    expect(composed.bounds).toMatchObject({ x: 0, y: 0, width: composed.width })
    expect(
      composed.glyphs
        .filter((glyph) => glyph.character !== ' ')
        .every((glyph) => glyph.bounds.width > 0),
    ).toBe(true)
  })

  it('supports both approved learning headings and exposes one semantic heading name', () => {
    const { rerender, container } = render(
      <DecorativeHeading text="Không gian bài học" level={1} />,
    )

    expect(screen.getByRole('heading', { level: 1, name: 'Không gian bài học' })).toBeVisible()
    expect(container.querySelector('svg')).toHaveAttribute('aria-hidden', 'true')
    expect(container.querySelector('svg')).toHaveAttribute('viewBox')

    rerender(<DecorativeHeading text="Không gian khóa học" level={2} />)
    expect(screen.getByRole('heading', { level: 2, name: 'Không gian khóa học' })).toBeVisible()
  })

  it('falls back to a semantic text heading for a missing glyph', () => {
    const unsupportedText = 'Không gian bài học z'
    const { container } = render(<DecorativeHeading text={unsupportedText} level={2} />)

    expect(screen.getByRole('heading', { level: 2, name: unsupportedText })).toBeVisible()
    expect(container.querySelector('svg')).toBeNull()
  })
})
