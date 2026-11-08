export interface LetteringGlyph {
  character: string
  path: string
  advance: number
  anchorX: number
  bounds: LetteringBounds
  marks: readonly string[]
  x: number
}

export interface LetteringBounds {
  x: number
  y: number
  width: number
  height: number
}

export interface LetteringLayout {
  width: number
  height: number
  baseline: number
  bounds: LetteringBounds
  glyphs: readonly LetteringGlyph[]
}

interface GlyphDefinition {
  path: string
  advance: number
  anchorX: number
  bounds: Omit<LetteringBounds, 'x'>
}

const GLYPHS: Readonly<Record<string, GlyphDefinition>> = {
  K: {
    path: 'M12 17 Q12 12 17 12 H22 Q27 12 27 17 V49 L58 16 Q61 12 66 12 H73 Q80 12 76 19 L49 51 L80 91 Q84 98 76 98 H68 Q64 98 61 94 L38 66 L27 78 V93 Q27 98 22 98 H17 Q12 98 12 93 Z',
    advance: 91,
    anchorX: 45,
    bounds: { y: 12, width: 72, height: 86 },
  },
  a: {
    path: 'M68 43 C62 34 53 29 41 29 C21 29 8 43 8 65 C8 87 22 101 42 101 C55 101 64 95 69 84 L69 96 H84 V34 H68 Z M42 44 C53 44 59 52 59 65 C59 78 53 86 42 86 C31 86 24 78 24 65 C24 52 31 44 42 44 Z',
    advance: 91,
    anchorX: 45,
    bounds: { y: 29, width: 76, height: 72 },
  },
  b: {
    path: 'M10 16 Q10 11 15 11 H21 Q26 11 26 16 V43 C32 34 41 29 52 29 C72 29 84 44 84 65 C84 87 71 101 51 101 C39 101 31 96 25 87 V97 H10 Z M49 44 C38 44 30 52 30 65 C30 78 38 86 49 86 C60 86 68 78 68 65 C68 52 60 44 49 44 Z',
    advance: 91,
    anchorX: 45,
    bounds: { y: 11, width: 74, height: 90 },
  },
  c: {
    path: 'M76 43 C70 34 60 29 47 29 C24 29 9 43 9 65 C9 87 24 101 47 101 C61 101 72 95 78 84 L65 76 C61 83 55 87 47 87 C34 87 25 78 25 65 C25 52 34 44 47 44 C55 44 61 48 65 55 Z',
    advance: 87,
    anchorX: 44,
    bounds: { y: 29, width: 69, height: 72 },
  },
  g: {
    path: 'M68 43 C62 34 53 29 41 29 C21 29 8 43 8 64 C8 85 22 99 42 99 C53 99 62 94 68 85 V96 C68 107 61 113 49 113 C40 113 32 110 25 104 L16 115 C25 123 37 127 50 127 C73 127 84 115 84 93 V34 H68 Z M42 44 C53 44 59 51 59 64 C59 76 53 84 42 84 C31 84 24 76 24 64 C24 51 31 44 42 44 Z',
    advance: 91,
    anchorX: 45,
    bounds: { y: 29, width: 76, height: 98 },
  },
  h: {
    path: 'M10 16 Q10 11 15 11 H21 Q26 11 26 16 V43 C33 34 42 29 53 29 C71 29 82 41 82 61 V92 Q82 97 77 97 H71 Q66 97 66 92 V63 C66 51 61 44 50 44 C38 44 26 54 26 67 V92 Q26 97 21 97 H15 Q10 97 10 92 Z',
    advance: 89,
    anchorX: 44,
    bounds: { y: 11, width: 72, height: 86 },
  },
  i: {
    path: 'M14 39 Q14 34 19 34 H25 Q30 34 30 39 V92 Q30 97 25 97 H19 Q14 97 14 92 Z M14 17 C14 11 18 7 23 7 C29 7 33 11 33 17 C33 23 29 27 23 27 C18 27 14 23 14 17 Z',
    advance: 45,
    anchorX: 22,
    bounds: { y: 7, width: 19, height: 90 },
  },
  k: {
    path: 'M10 16 Q10 11 15 11 H21 Q26 11 26 16 V62 L56 35 Q59 32 63 32 H70 Q77 32 72 39 L49 60 L76 90 Q81 97 73 97 H66 Q62 97 59 93 L38 72 L26 83 V92 Q26 97 21 97 H15 Q10 97 10 92 Z',
    advance: 84,
    anchorX: 42,
    bounds: { y: 11, width: 71, height: 86 },
  },
  n: {
    path: 'M10 39 Q10 34 15 34 H21 Q26 34 26 39 V44 C33 34 42 29 54 29 C72 29 83 41 83 61 V92 Q83 97 78 97 H72 Q67 97 67 92 V63 C67 51 62 44 51 44 C39 44 26 54 26 67 V92 Q26 97 21 97 H15 Q10 97 10 92 Z',
    advance: 90,
    anchorX: 45,
    bounds: { y: 29, width: 73, height: 68 },
  },
  o: {
    path: 'M47 29 C70 29 85 43 85 65 C85 87 70 101 47 101 C24 101 9 87 9 65 C9 43 24 29 47 29 Z M47 44 C34 44 25 52 25 65 C25 78 34 86 47 86 C60 86 69 78 69 65 C69 52 60 44 47 44 Z',
    advance: 94,
    anchorX: 47,
    bounds: { y: 29, width: 76, height: 72 },
  },
}

const MARKS = new Set(['\u0300', '\u0301', '\u0302', '\u0323'])
const BASELINE = 101
const LAYOUT_HEIGHT = 132
const KERNING: Readonly<Record<string, number>> = {
  'g:a': -5,
  'h:o': -4,
  'k:h': -3,
  'o:c': -4,
  'a:i': -5,
}

function splitGraphemes(text: string) {
  const clusters: string[] = []
  for (const character of text.normalize('NFD')) {
    if (/\p{M}/u.test(character) && clusters.length > 0) {
      clusters[clusters.length - 1] += character
    } else {
      clusters.push(character)
    }
  }
  return clusters
}

function resolveCluster(cluster: string) {
  if (cluster === ' ')
    return {
      character: ' ',
      path: '',
      advance: 36,
      anchorX: 0,
      bounds: { y: 0, width: 0, height: 0 },
      marks: [],
    }

  const parts = Array.from(cluster.normalize('NFD'))
  const character = parts[0]
  if (!character) return null
  const definition = GLYPHS[character] ?? GLYPHS[character.toLowerCase()]
  if (!definition) return null

  const marks = parts.slice(1)
  if (marks.some((mark) => !MARKS.has(mark))) return null
  return { character, ...definition, marks }
}

export function createLetteringLayout(text: string): LetteringLayout | null {
  const clusters = splitGraphemes(text)
  const resolved = clusters.map(resolveCluster)
  if (resolved.length === 0 || resolved.some((glyph) => glyph === null)) return null

  const glyphs: LetteringGlyph[] = []
  let width = 0
  let previous = ''
  for (const glyph of resolved) {
    if (!glyph) return null
    if (previous && glyph.character !== ' ' && previous !== ' ') {
      width += KERNING[`${previous.toLowerCase()}:${glyph.character.toLowerCase()}`] ?? 0
      width += 6
    }
    glyphs.push({
      ...glyph,
      x: width,
      bounds: { ...glyph.bounds, x: width },
    })
    width += glyph.advance
    previous = glyph.character
  }
  return {
    width,
    height: LAYOUT_HEIGHT,
    baseline: BASELINE,
    bounds: { x: 0, y: 0, width, height: LAYOUT_HEIGHT },
    glyphs,
  }
}
