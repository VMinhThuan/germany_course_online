import { LETTERING_GLYPHS, LETTERING_KERNING, LETTERING_METRICS } from './lettering-generated'

export interface LetteringBounds {
  x: number
  y: number
  width: number
  height: number
}

export interface LetteringGlyph {
  character: string
  bodyPath: string
  outlinePath: string
  advance: number
  bounds: LetteringBounds
  x: number
  y: number
}

export interface LetteringLayout {
  width: number
  height: number
  baseline: number
  bounds: LetteringBounds
  glyphs: readonly LetteringGlyph[]
}

function kerningKey(left: string, right: string) {
  return `${left.codePointAt(0)},${right.codePointAt(0)}`
}

export function createLetteringLayout(text: string): LetteringLayout | null {
  const characters = Array.from(text.normalize('NFC'))
  if (characters.length === 0) return null

  const positioned: Array<{ character: string; x: number; advance: number }> = []
  let cursor = 0
  let previous = ''
  let minX = Number.POSITIVE_INFINITY
  let minY = Number.POSITIVE_INFINITY
  let maxX = Number.NEGATIVE_INFINITY
  let maxY = Number.NEGATIVE_INFINITY
  let hasVisibleGlyph = false

  for (const character of characters) {
    if (character !== ' ' && !LETTERING_GLYPHS[character]) return null

    if (previous) {
      cursor +=
        previous === ' ' || character === ' '
          ? LETTERING_METRICS.spaceTracking
          : LETTERING_METRICS.tracking
      if (previous !== ' ' && character !== ' ') {
        cursor += LETTERING_KERNING[kerningKey(previous, character)] ?? 0
      }
    }

    const generated = LETTERING_GLYPHS[character]
    const advance = character === ' ' ? LETTERING_METRICS.spaceAdvance : (generated?.advance ?? 0)
    positioned.push({ character, x: cursor, advance })

    if (generated) {
      hasVisibleGlyph = true
      minX = Math.min(minX, cursor + generated.bounds.xMin)
      minY = Math.min(minY, generated.bounds.yMin)
      maxX = Math.max(maxX, cursor + generated.bounds.xMax)
      maxY = Math.max(maxY, generated.bounds.yMax)
      minX = Math.min(minX, cursor + generated.bounds.xMin + LETTERING_METRICS.shadowX)
      maxX = Math.max(maxX, cursor + generated.bounds.xMax + LETTERING_METRICS.shadowX)
      maxY = Math.max(maxY, generated.bounds.yMax + LETTERING_METRICS.shadowY)
    }

    cursor += advance
    previous = character
  }

  if (!hasVisibleGlyph) return null
  minX = Math.min(minX, 0)
  maxX = Math.max(maxX, cursor)
  const width = maxX - minX
  const height = maxY - minY
  if (![width, height].every(Number.isFinite) || width <= 0 || height <= 0) return null

  const xOffset = -minX
  const yOffset = -minY
  const glyphs = positioned.map(({ character, x, advance }) => {
    const generated = LETTERING_GLYPHS[character]
    const left = generated?.bounds.xMin ?? 0
    const top = generated?.bounds.yMin ?? 0
    const right = generated?.bounds.xMax ?? 0
    const bottom = generated?.bounds.yMax ?? 0

    return {
      character,
      bodyPath: generated?.bodyPath ?? '',
      outlinePath: generated?.outlinePath ?? '',
      advance,
      x: x + xOffset,
      y: yOffset,
      bounds: {
        x: x + xOffset + left,
        y: yOffset + top,
        width: right - left,
        height: bottom - top,
      },
    }
  })

  return {
    width,
    height,
    baseline: LETTERING_METRICS.ascender + yOffset,
    bounds: { x: 0, y: 0, width, height },
    glyphs,
  }
}
