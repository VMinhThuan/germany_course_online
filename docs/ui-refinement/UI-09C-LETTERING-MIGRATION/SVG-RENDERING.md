# SVG rendering and accessibility

The generated record stores two path layers and font-unit bounds per glyph: the cream body path and the expanded blue outline path. The React renderer paints the low-opacity blue shadow first, then the blue contour, then the cream fill. It does not use `<text>`, SVG stroke-width to thicken the glyph, browser font parsing, Canvas, or a per-glyph network request.

`lettering-engine.ts` lays glyphs out using generated advance widths, source kerning, tracking, and actual contour bounds. It computes the combined viewBox from all outline bounds plus the shadow displacement, so Vietnamese marks above or below the baseline are included. Width and height scale together with the SVG and remain vector at browser zoom.

The public heading element remains an `h1`–`h6`. Its readable accessible name is the original text; the decorative SVG and its shadow are `aria-hidden`. If characters are unsupported or layout geometry throws, the component renders normal text without the SVG.
