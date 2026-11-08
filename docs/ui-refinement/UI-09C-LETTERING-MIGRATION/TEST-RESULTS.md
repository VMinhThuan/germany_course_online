# Tests and performance

## Automated checks

| Check                        | Result                                                                              |
| ---------------------------- | ----------------------------------------------------------------------------------- |
| `npm run lettering:generate` | PASS; paths regenerated from pinned font                                            |
| `npm run lettering:check`    | PASS; committed generated module is current and deterministic                       |
| `npm run typecheck`          | PASS                                                                                |
| `npm run lint`               | PASS, no warnings                                                                   |
| `npm run format:check`       | PASS                                                                                |
| `npm run test`               | PASS; 32 files, 182 tests                                                           |
| `npm run build`              | PASS                                                                                |
| UI-09C Playwright            | PASS; course and lesson pages at desktop, tablet, mobile, and 200%-equivalent width |
| UI-09B + UI-09C Playwright   | PASS; both learning UI suites passed together after the mobile header adjustment    |
| Full BE04 Playwright suite   | 4/6 PASS; 2 non-lettering checks fail in this run (details below)                   |
| `git diff --check`           | PASS                                                                                |

The repo-wide format check originally surfaced four pre-existing formatting-only differences. Those lines were formatted with Prettier; no behavior was changed in those files.

The two failures in the full BE04 suite are outside the lettering changes: the `be04-live-api` dashboard check expects a greeting that is absent at `/student`, and the public homepage axe scan reports four `Nội dung mẫu` badges at 4.39:1 contrast (`#63747c` on `#edf5f7`, below 4.5:1). The BE04 registration/session tests and both learning UI suites pass. Neither unrelated failure was altered in this typography migration.

## Bundle measurement

Baseline was captured from the clean pre-migration `main` build and compared with the UI-09C production build. Both totals use Python gzip level 9 across the four `dist/assets/*.js` chunks.

| Build            |  JavaScript raw |                   Gzip |
| ---------------- | --------------: | ---------------------: |
| Before migration | 1,252,871 bytes |          353,612 bytes |
| UI-09C           | 1,279,552 bytes |          365,531 bytes |
| Change           |   +26,681 bytes | +11,919 bytes (+3.37%) |

The renderer-bearing `ProductionApp` chunk grew from 453,602 bytes / 128,682 gzip to 480,283 bytes / 140,600 gzip. The OpenType font parser, Paper.js, and the source font are excluded from production chunks; generated SVG paths account for the measured increase.
