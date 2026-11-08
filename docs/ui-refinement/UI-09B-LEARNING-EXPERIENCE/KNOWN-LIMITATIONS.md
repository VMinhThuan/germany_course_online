# Known limitations

- The path registry covers only the letters and marks needed for the two approved headings. Other phrases render as standard semantic headings until their custom paths are designed.
- A single “Canva” reference wordmark cannot specify a complete Vietnamese/German typeface. The letter shapes are an original, focused interpretation and are not pixel-identical to the reference.
- UI screenshots and API-backed E2E use the repository's isolated BE-04 MongoDB fixtures. They verify real HTTP serialization and rendering in an isolated environment, but do not prove the current production/staging catalog contains the same exercises or videos.
- The long German title screenshot changes text only in the browser DOM to exercise wrapping; it is not saved to the backend.
- Full repository formatting checks remain blocked by the unchanged files listed in [test results](TEST-RESULTS.md). No unrelated formatting was applied.
- No production/staging deployment, commit, or push was performed.
