import { readFile, writeFile } from 'node:fs/promises'
import { log } from 'node:console'
import { argv } from 'node:process'
import { fileURLToPath, URL } from 'node:url'
import opentype from 'opentype.js'
import paper from 'paper'
import prettier from 'prettier'
import { createGeneratedSource } from './lettering/export-paths.mjs'
import { FONT_PATH, PILOT_HEADINGS } from './lettering/source-font.mjs'
import { transformGlyph } from './lettering/transform-glyph.mjs'
import { validateFont } from './lettering/validate-glyphs.mjs'

const outputPath = fileURLToPath(
  new URL('../src/domains/shared/lettering-generated.ts', import.meta.url),
)
const checkOnly = argv.includes('--check')

async function generate() {
  const fontBytes = await readFile(FONT_PATH)
  const font = opentype.parse(
    fontBytes.buffer.slice(fontBytes.byteOffset, fontBytes.byteOffset + fontBytes.byteLength),
  )
  await validateFont(font)

  const scope = new paper.PaperScope()
  scope.setup(new scope.Size(1, 1))
  try {
    const characters = [...new Set(PILOT_HEADINGS.flatMap((heading) => [...heading]))]
      .filter((character) => character !== ' ')
      .sort((left, right) => left.codePointAt(0) - right.codePointAt(0))
    const transformedGlyphs = new Map()
    for (const character of characters) {
      const transformed = transformGlyph(font, character, scope)
      if (!transformed) throw new Error(`Could not generate glyph ${JSON.stringify(character)}`)
      transformedGlyphs.set(character, transformed)
    }
    return createGeneratedSource(font, transformedGlyphs)
  } finally {
    scope.project?.clear()
  }
}

const prettierOptions = (await prettier.resolveConfig(outputPath)) ?? {}
const generated = await prettier.format(await generate(), {
  ...prettierOptions,
  parser: 'typescript',
})
if (checkOnly) {
  let current
  try {
    current = await readFile(outputPath, 'utf8')
  } catch {
    throw new Error('Generated lettering source is missing; run npm run lettering:generate')
  }
  if (current !== generated) {
    throw new Error('Generated lettering source is stale; run npm run lettering:generate')
  }
  log('Lettering source is current and deterministic.')
} else {
  await writeFile(outputPath, generated)
  log(`Generated ${outputPath}`)
}
