# Font source and license

## Selected source

**Coiny Regular**, designed by Marcelo Magalhães, is used as the licensed geometric source for the custom lettering. The source font is pinned from Google Fonts commit [`0341b95f0c79f0e0b33ab7b5404cf9265be88516`](https://github.com/google/fonts/tree/0341b95f0c79f0e0b33ab7b5404cf9265be88516/ofl/coiny). The upstream metadata identifies Coiny as a display family, regular weight, and lists Latin, Latin Extended, and Vietnamese subsets.

The font is distributed under the [SIL Open Font License 1.1](https://github.com/google/fonts/blob/0341b95f0c79f0e0b33ab7b5404cf9265be88516/ofl/coiny/OFL.txt). The full OFL text is included beside the font at `frontend/scripts/lettering/fonts/OFL.txt`; the source font is retained there for reproducible generation. OFL permits modification and redistribution with the license notice. The font is not shipped to browsers, sold by itself, or identified as a PAniverse typeface. The generated paths are described as PAniverse custom lettering.

## Candidate screening

Coverage was inspected from the actual downloaded font cmap against all seven required sample strings, not inferred from a subset label.

| Candidate     | Required Vietnamese and German samples | Visual fit                                                          | Decision    |
| ------------- | -------------------------------------- | ------------------------------------------------------------------- | ----------- |
| Coiny Regular | Complete                               | Heavy, rounded display shapes with an irregular, friendly character | Selected    |
| Baloo 2       | Complete                               | Rounded and readable, but more regular in the inspected sample      | Alternative |
| Fredoka       | Missing `Đ`, `ế`, `ọ`, `ứ`, `ữ`        | Rounded, but incomplete for this Vietnamese set                     | Rejected    |
| Lilita One    | Missing `Đ`, `ế`, `ọ`, `ứ`, `ữ`        | Heavy, but incomplete for this Vietnamese set                       | Rejected    |

Coiny contains the complete glyph set for both production headings, Vietnamese sample strings, German umlauts, and `ß`. The generator verifies the source font SHA-256 (`EF02D723A54ABE4819BEA54EA8B2ECF72D77D258010BB336CD4862A37705EAC7`) and rejects missing codepoints before it writes output.
