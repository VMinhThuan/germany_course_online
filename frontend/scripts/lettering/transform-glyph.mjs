import { LETTERING_STYLE } from './source-font.mjs'

function assertFiniteBounds(bounds, character) {
  const values = [bounds.left, bounds.top, bounds.right, bounds.bottom]
  if (!values.every(Number.isFinite) || bounds.width <= 0 || bounds.height <= 0) {
    throw new Error(`Invalid vector bounds for glyph ${JSON.stringify(character)}`)
  }
}

function validateCounters(source, body, outline, character) {
  const counters = source.children.filter((child) => !child.clockwise)
  for (const counter of counters) {
    const sample = counter.interiorPoint
    if (source.contains(sample)) continue
    if (body.contains(sample) || outline.contains(sample)) {
      throw new Error(`Contour expansion closed a counter in glyph ${JSON.stringify(character)}`)
    }
  }
}

export function transformGlyph(font, character, scope) {
  const glyph = font.charToGlyph(character)
  if (!glyph || glyph.index === 0 || !glyph.path.commands.length) return null

  const sourceData = glyph
    .getPath(0, font.ascender, font.unitsPerEm)
    .toPathData(LETTERING_STYLE.pathPrecision)
  const source = new scope.CompoundPath(sourceData)
  try {
    const expansionOptions = [
      [LETTERING_STYLE.bodyExpansion, LETTERING_STYLE.outlineExpansion],
      [LETTERING_STYLE.bodyExpansion, 24],
      [LETTERING_STYLE.bodyExpansion, 16],
      [8, 16],
      [8, 12],
      [6, 10],
      [4, 8],
    ]

    for (const [bodyExpansion, outlineExpansion] of expansionOptions) {
      let body
      let outline
      try {
        body = source.offset(bodyExpansion, { join: 'round', insert: false })
        outline = body.offset(outlineExpansion, { join: 'round', insert: false })
        validateCounters(source, body, outline, character)

        const bounds = outline.bounds
        assertFiniteBounds(bounds, character)
        const bodyPath = body.getPathData(null, LETTERING_STYLE.pathPrecision)
        const outlinePath = outline.getPathData(null, LETTERING_STYLE.pathPrecision)
        if (!bodyPath || !outlinePath || /NaN|Infinity/.test(`${bodyPath}${outlinePath}`)) {
          throw new Error(`Invalid SVG path data for glyph ${JSON.stringify(character)}`)
        }

        return {
          bodyPath,
          outlinePath,
          advance: glyph.advanceWidth,
          bounds: {
            xMin: bounds.left,
            yMin: bounds.top,
            xMax: bounds.right,
            yMax: bounds.bottom,
          },
        }
      } catch (error) {
        if (
          !(error instanceof Error) ||
          !error.message.startsWith('Contour expansion closed a counter')
        ) {
          throw error
        }
      } finally {
        outline?.remove()
        body?.remove()
      }
    }

    throw new Error(`Could not preserve counters in glyph ${JSON.stringify(character)}`)
  } finally {
    source.remove()
  }
}
