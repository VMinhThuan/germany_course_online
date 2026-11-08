# Custom lettering engine

The handwritten glyph registry previously used here was replaced in UI-09C by a build-time OpenType and Paper.js pipeline. The current implementation and verification evidence are documented in [UI-09C lettering migration](../UI-09C-LETTERING-MIGRATION/IMPLEMENTATION-SUMMARY.md).

The public `DecorativeHeading` API and its two learning-page headings are unchanged. Production pages now import only generated SVG geometry; font parsing and contour operations run in the generator.
