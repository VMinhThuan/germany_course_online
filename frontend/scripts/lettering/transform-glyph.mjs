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
  let body
  let outline

  try {
    body = source.offset(LETTERING_STYLE.bodyExpansion, { join: 'round', insert: false })
    outline = body.offset(LETTERING_STYLE.outlineExpansion, { join: 'round', insert: false })
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
  } finally {
    outline?.remove()
    body?.remove()
    source.remove()
  }
}
