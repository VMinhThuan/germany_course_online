# Glyph coverage

The production vector registry is generated from NFC text. NFD input is normalized to NFC before character lookup, so precomposed Vietnamese and German glyphs stay with the selected font's own contours and metrics.

| Sample                 | Source font coverage | Runtime status                                            |
| ---------------------- | -------------------- | --------------------------------------------------------- |
| `Không gian bài học`   | Complete             | Generated custom SVG                                      |
| `Không gian khóa học`  | Complete             | Generated custom SVG                                      |
| `Khóa học tiếng Đức`   | Complete             | Coverage verified; not added to the pilot render registry |
| `Ngữ pháp tiếng Đức`   | Complete             | Coverage verified; not added to the pilot render registry |
| `Grüße aus München`    | Complete             | Coverage verified; not added to the pilot render registry |
| `Übungen für Anfänger` | Complete             | Coverage verified; not added to the pilot render registry |
| `Straße`               | Complete             | Coverage verified; not added to the pilot render registry |

The production headings are rendered as independent per-character paths with font advances, kerning, per-glyph bounds, and generated space width. Unsupported characters use the normal semantic heading instead of partial text, character substitution, or mixed-font accents. Extend the source registry and regenerate to promote more phrases.
