# Paper.js vector transforms

Every generated glyph starts as an OpenType outline expressed in the font's own units and baseline. Paper.js parses the complete outline as a compound path so multiple contours and counters remain part of one glyph.

The current contour settings are in `frontend/scripts/lettering/source-font.mjs`:

- **Body expansion: 12 units**, using Paper.js `offset()` with a rounded join. This changes the cream-filled body geometry itself.
- **Outer expansion: 16 additional units**, also using a rounded join. Its path is filled blue behind the cream body to create a distinct border.
- **Shadow displacement: 12 units horizontally and 18 vertically**, applied only to the outer contour with low opacity.
- **Tracking: 14 font units** between regular characters and 10 around spaces. Real nonzero font kerning is applied where the pilot headings contain a pair.
- **Export precision: 2 decimal places** for paths and stable numeric bounds.

The generator checks each enclosed counter in the pilot glyphs before and after both offsets. A counter that closes or invalid/empty bounds abort generation. The selected setting keeps counters in `a`, `b`, `g`, `o`, `ô`, and `ọ` open. There is no runtime boolean operation and no manually positioned accent path.

Paper.js `Path.offset()` behavior and its support for closed/compound paths is documented in the [official Path reference](https://paperjs.org/reference/path/).
