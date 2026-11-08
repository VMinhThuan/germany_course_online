# Glyph library

The registry is custom vector geometry in `frontend/src/domains/shared/lettering-engine.ts`. It currently covers the characters needed by **Không gian bài học** and **Không gian khóa học**.

| Base glyph              | Geometry                                       | Use                                |
| ----------------------- | ---------------------------------------------- | ---------------------------------- |
| `K`, `k`                | Separate uppercase and lowercase rounded paths | First word and “không/khóa”        |
| `a`, `b`, `c`           | Rounded counters and open curves               | “bài”, “khóa”, “học”, “không gian” |
| `g`, `h`, `i`, `n`, `o` | Custom rounded paths; `g` includes a descender | Remaining phrase letters           |
| ` `                     | Fixed word-space advance                       | Word separation                    |

Supported combining marks are grave (`U+0300`), acute (`U+0301`), circumflex (`U+0302`), and dot below (`U+0323`). The circumflex and tone mark share the base glyph anchor, and dot below is positioned beneath the baseline.

Kerning pairs currently include `g:a`, `h:o`, `k:h`, `o:c`, and `a:i`. Glyphs not present in this table are not approximated with an unrelated font; the complete heading falls back to the normal semantic text renderer.

This is a focused phrase library, not a complete Vietnamese or German alphabet. Extending it requires new custom paths and regression screenshots.
