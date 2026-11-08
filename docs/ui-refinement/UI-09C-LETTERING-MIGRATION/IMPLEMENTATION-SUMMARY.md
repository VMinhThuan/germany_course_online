# UI-09C — Custom lettering migration

## Result

The existing hand-authored glyph engine has been replaced with one build-time vector pipeline:

```text
Coiny Regular (OFL 1.1) → opentype.js metrics and glyph contours
→ Paper.js rounded contour expansion → generated TypeScript SVG paths
→ DecorativeHeading
```

`DecorativeHeading` keeps its `text`, `level`, `size`, and `className` API. It still renders semantic headings and provides a regular-text fallback when a requested character has no generated geometry. Only the existing “Không gian bài học” and “Không gian khóa học” headings use custom lettering. Dynamic course names and other headings remain normal text.

The cream fill, blue outline, and blue shadow remain separate vector layers; the follow-up UI refinement increases the outline expansion and places each rendered title in a pink, raised card sized to the lettering rather than the full title column. Lesson controls, course tree, and learning API behavior remain unchanged. On mobile, the two custom headings take a full row and the Back link moves below it, aligned right, so the lettering does not shrink beside the control. The cream body is a separate expanded path; a second path creates the outer blue contour. There is no SVG stroke expansion or runtime Canvas rendering.

## Evidence

- [Font source, candidates, and license](FONT-SOURCE-AND-LICENSE.md)
- [OpenType generator](OPENTYPE-PIPELINE.md)
- [Paper.js contour transforms](PAPERJS-VECTOR-TRANSFORMS.md)
- [Glyph coverage](GLYPH-COVERAGE.md)
- [SVG runtime](SVG-RENDERING.md)
- [Visual comparison](VISUAL-COMPARISON.md)
- [Responsive results](RESPONSIVE-RESULTS.md)
- [Tests and bundle impact](TEST-RESULTS.md)
- [Known limitations](KNOWN-LIMITATIONS.md)

## Files

- `frontend/scripts/lettering/`: pinned font, license, source metadata, geometry transform, and validators.
- `frontend/scripts/generate-lettering.mjs`: deterministic generation and stale-output check.
- `frontend/src/domains/shared/lettering-generated.ts`: committed SVG path and metric registry.
- `frontend/src/domains/shared/lettering-engine.ts`: small layout and fallback resolver.
- `frontend/src/domains/shared/decorative-heading.tsx`: accessible semantic heading with separate vector layers.
- `frontend/e2e/learning-ui-09c-lettering.spec.ts`: responsive screenshots and rendered-bound checks.
- `docs/ui-refinement/UI-09C-LETTERING-MIGRATION/screenshots/`: Playwright screenshots.
