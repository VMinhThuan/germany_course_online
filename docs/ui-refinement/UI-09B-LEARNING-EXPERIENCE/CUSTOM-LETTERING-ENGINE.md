# Custom lettering engine

The renderer lives in `frontend/src/domains/shared/lettering-engine.ts` and `frontend/src/domains/shared/decorative-heading.tsx`.

## Rendering flow

1. Normalize input to NFD and split it into grapheme clusters.
2. Resolve each base character against the custom SVG path registry.
3. Position Vietnamese circumflex, grave, acute, and dot-below marks using per-glyph anchors.
4. Apply fixed advance widths and a small set of pair kerning adjustments.
5. Render vector paths with the cream fill, rounded blue outline, and a low-opacity offset shadow.
6. Use normal semantic heading text if any glyph or mark is unsupported.

The component uses SVG path geometry as its visible lettering. It does not paint normal font glyphs with a CSS stroke, use SVG `<text>`, or use canvas `fillText()`.

## Public component

```tsx
<DecorativeHeading text="Không gian bài học" level={1} size="lg" />
```

`level` selects the semantic heading element. `size` constrains the fluid SVG width. The accessible heading name is the supplied text; the visible SVG is hidden from assistive technology to avoid duplicate reading.

## Unicode and fallback

NFC and NFD forms resolve to the same glyph layout. Unsupported letters or combining marks return a normal text heading instead of dropping or substituting a character. The current glyph coverage is intentionally limited to the two approved phrases; see [glyph library](GLYPH-LIBRARY.md).

## Geometry

Each glyph defines its own path, advance width, geometric bounds, and accent anchor. The layout publishes its overall bounds and a baseline at 101 vector units; its 132-unit viewBox leaves room below the baseline for descenders and tone marks. SVG scales with its container and remains vector at browser zoom levels.
