import { createHash } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import {
  COVERAGE_SAMPLES,
  FONT_LICENSE_PATH,
  FONT_PATH,
  FONT_SHA256,
  PILOT_HEADINGS,
} from './source-font.mjs'

export async function validateFont(font) {
  const fontBytes = await readFile(FONT_PATH)
  const actualHash = createHash('sha256').update(fontBytes).digest('hex').toUpperCase()
  if (actualHash !== FONT_SHA256) throw new Error(`Source font checksum mismatch: ${actualHash}`)

  const license = await readFile(FONT_LICENSE_PATH, 'utf8')
  if (!license.includes('SIL OPEN FONT LICENSE Version 1.1')) {
    throw new Error('Coiny SIL OFL 1.1 license is missing or invalid')
  }

  for (const sample of COVERAGE_SAMPLES) {
    for (const character of sample.normalize('NFC')) {
      if (character === ' ') continue
      const glyph = font.charToGlyph(character)
      if (!glyph || glyph.index === 0) {
        throw new Error(
          `Source font is missing ${JSON.stringify(character)} in ${JSON.stringify(sample)}`,
        )
      }
    }
  }

  for (const heading of PILOT_HEADINGS) {
    if (heading !== heading.normalize('NFC'))
      throw new Error('Pilot headings must be stored in NFC')
  }
}
