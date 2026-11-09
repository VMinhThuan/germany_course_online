import { LETTERING_STYLE } from './source-font.mjs'

function assertFiniteBounds(bounds, character) {
  const values = [bounds.left, bounds.top, bounds.right, bounds.bottom]
  if (!values.every(Number.isFinite) || bounds.width <= 0 || bounds.height <= 0) {
    throw new Error(`Invalid vector bounds for glyph ${JSON.stringify(character)}`)
  }
}

function validateBodyCounters(source, body, character) {
  const counters = source.children.filter((child) => !child.clockwise)
  for (const counter of counters) {
    const sample = counter.interiorPoint
    if (source.contains(sample)) continue
    if (body.contains(sample)) {
      throw new Error(`Contour expansion closed a counter in glyph ${JSON.stringify(character)}`)
    }
  }
}

function hasSegments(path) {
  return Boolean(path?.segments?.length || path?.children?.some((child) => child.segments.length))
}

function createOutline(body, scope, character) {
  const outlineExpansion = LETTERING_STYLE.outlineExpansion
  const counterExpansions = [
    outlineExpansion,
    outlineExpansion * 0.75,
    outlineExpansion * 0.5,
    outlineExpansion * 0.375,
    outlineExpansion * 0.25,
    outlineExpansion * 0.125,
    0,
  ]
  const temporaryContours = []
  const contours = body.children ?? [body]

  try {
    // Keep the outside stroke uniform; cap only the inward expansion of tight counters.
    const contourPaths = contours.map((contour) => {
      if (contour.clockwise) {
        const expanded = contour.offset(outlineExpansion, { join: 'round', insert: false })
        temporaryContours.push(expanded)
        return expanded.getPathData(null, LETTERING_STYLE.pathPrecision)
      }

      const sample = contour.interiorPoint
      let expandedCounter
      for (const expansion of counterExpansions) {
        const candidate =
          expansion === 0
            ? contour.clone({ insert: false })
            : contour.offset(-expansion, { join: 'round', insert: false })
        if (hasSegments(candidate) && candidate.contains(sample)) {
          expandedCounter = candidate
          temporaryContours.push(candidate)
          break
        }
        candidate?.remove()
      }
      if (!expandedCounter) {
        throw new Error(`Could not preserve counter in glyph ${JSON.stringify(character)}`)
      }
      return expandedCounter.getPathData(null, LETTERING_STYLE.pathPrecision)
    })

    const outline = new scope.CompoundPath(contourPaths.join(''))
    return outline
  } finally {
    for (const contour of temporaryContours) contour.remove()
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
    const bodyExpansions = [LETTERING_STYLE.bodyExpansion, 8, 6, 4]

    for (const bodyExpansion of bodyExpansions) {
      let body
      let outline
      try {
        body = source.offset(bodyExpansion, { join: 'round', insert: false })
        validateBodyCounters(source, body, character)
        outline = createOutline(body, scope, character)

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
