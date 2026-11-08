# Known limitations

- Only glyphs present in the two approved headings are emitted to the runtime registry. Other sample strings are verified against the font at generation time, but currently fall back to regular text until deliberately added and regenerated.
- The original Canva example was used only for qualitative style direction. The generated lettering does not trace its logo or claim an exact match.
- The “200% zoom” check is an equivalent reduced CSS layout viewport, not native browser zoom automation.
- At small sizes the custom heading scales down as a single SVG to preserve the full Vietnamese marks and avoid wrapping individual glyphs. The accessible semantic text remains unchanged.
