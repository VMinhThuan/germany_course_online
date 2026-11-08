# OpenType build pipeline

The generator is `frontend/scripts/generate-lettering.mjs`. It runs with repository-installed Node dependencies; it does not require a global binary.

1. Read the pinned Coiny TTF and validate its SHA-256 and accompanying OFL text.
2. Parse the font with `opentype.js` 2.0.0.
3. Check codepoint coverage for the two pilot headings and five Vietnamese/German extension samples.
4. Read each used glyph outline, advance width, and OpenType kerning pair.
5. Pass outlines through Paper.js 0.17.0 and validate resulting geometry/counters.
6. Emit sorted, fixed-precision path data and metrics into `lettering-generated.ts` using Prettier.

`npm run lettering:generate` regenerates the committed artifact. `npm run lettering:check` repeats validation and fails if the generated TypeScript differs, catching stale output and nondeterminism. The set of rendered characters is intentionally the unique characters in the two pilot headings; source-font coverage samples do not silently expand the production registry. Add a new heading to `PILOT_HEADINGS` to generate its required paths in a later expansion.

The production application imports only the generated TypeScript module. `opentype.js`, Paper.js, and the font file are development/build assets, not page-load dependencies.
