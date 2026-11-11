import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { DecorativeHeading } from './decorative-heading'
import { SemanticHeading } from './heading'
import { LETTERING_GLYPHS } from './lettering-generated'
import { createLetteringLayout } from './lettering-engine'

describe('OpenType and Paper.js decorative lettering', () => {
  it('normalizes composed and decomposed Vietnamese text to the same path layout', () => {
    const composed = createLetteringLayout('Không gian bài học')
    const decomposed = createLetteringLayout('Không gian bài học'.normalize('NFD'))

    expect(composed).not.toBeNull()
    if (!composed) return
    expect(decomposed).toEqual(composed)
    expect(composed?.glyphs.some((glyph) => glyph.character === 'ô')).toBe(true)
    expect(composed?.glyphs.some((glyph) => glyph.character === 'ọ')).toBe(true)
    expect(composed?.baseline).toBeGreaterThan(0)
    expect(composed?.bounds).toMatchObject({ x: 0, y: 0, width: composed.width })
    expect(
      composed?.glyphs
        .filter((glyph) => glyph.character !== ' ')
        .every((glyph) => glyph.bodyPath.length > 0 && glyph.outlinePath.length > 0),
    ).toBe(true)
  })

  it('includes stable vector geometry and positive metrics for both production headings', () => {
    for (const text of ['Không gian bài học', 'Không gian khóa học']) {
      const layout = createLetteringLayout(text)
      expect(layout).not.toBeNull()
      expect(layout?.width).toBeGreaterThan(0)
      expect(layout?.height).toBeGreaterThan(0)
      expect(layout?.glyphs.every((glyph) => Number.isFinite(glyph.x + glyph.y))).toBe(true)
      expect(layout?.glyphs.filter((glyph) => glyph.character !== ' ')).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ bodyPath: expect.stringMatching(/^M/) }),
          expect.objectContaining({ outlinePath: expect.stringMatching(/^M/) }),
        ]),
      )
    }

    expect(Object.keys(LETTERING_GLYPHS).length).toBeGreaterThan(10)
    expect(Object.values(LETTERING_GLYPHS).every((glyph) => glyph.advance > 0)).toBe(true)
    expect(JSON.stringify(LETTERING_GLYPHS)).not.toMatch(/NaN|Infinity/)
  })

  it('supports both approved learning headings with one accessible semantic name', () => {
    const { rerender, container } = render(
      <DecorativeHeading text="Không gian bài học" level={1} />,
    )

    expect(screen.getByRole('heading', { level: 1, name: 'Không gian bài học' })).toBeVisible()
    expect(container.querySelectorAll('h1')).toHaveLength(1)
    expect(container.querySelector('svg')).toHaveAttribute('aria-hidden', 'true')
    expect(container.querySelector('svg')).toHaveAttribute('viewBox')
    expect(container.querySelectorAll('svg text')).toHaveLength(0)
    expect(container.querySelector('.decorative-heading-card')).toHaveClass('w-fit', 'max-w-full')
    const artwork = container.querySelector('.decorative-heading-art') as HTMLElement
    expect(artwork.style.getPropertyValue('--decorative-heading-artwork-width')).toMatch(/^\d+px$/)

    rerender(<DecorativeHeading text="Không gian khóa học" level={2} />)
    expect(screen.getByRole('heading', { level: 2, name: 'Không gian khóa học' })).toBeVisible()
  })

  it('falls back to a regular semantic heading when a glyph is not generated', () => {
    const unsupportedText = 'Không gian bài học ✨'
    const { container } = render(<DecorativeHeading text={unsupportedText} level={2} />)

    expect(screen.getByRole('heading', { level: 2, name: unsupportedText })).toBeVisible()
    expect(container.querySelector('svg')).toBeNull()
    expect(container.querySelector('h2')).toHaveClass('font-display')
    expect(container.querySelector('.decorative-heading-card')).toHaveTextContent(unsupportedText)
  })

  it('uses the shared renderer for semantic page headings', () => {
    const { container } = render(
      <div>
        <SemanticHeading level={1}>Trang tổng quan</SemanticHeading>
      </div>,
    )
    expect(screen.getByRole('heading', { level: 1, name: 'Trang tổng quan' })).toBeVisible()
    expect(container.querySelector('.decorative-heading-card')).toBeVisible()
  })
})
