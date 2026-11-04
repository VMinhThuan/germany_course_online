# Performance and Pagination

## Pagination changes

Where list APIs already support `page` and `pageSize`, large interfaces now use server pagination with 20 rows per page and a reusable `Pagination` control. This covers Admin courses, sections, lessons, exercises, orders, renewal plans, coupons, students, enrollments, media assets and audit history, plus the public catalog and learner course/order lists. The UI derives page count from the API `total` and `pageSize`; it does not fetch an unbounded collection to paginate in the browser.

## Build measurement

Frontend production build passed and emitted:

| Chunk           |  Minified |      Gzip |
| --------------- | --------: | --------: |
| `ProductionApp` | 429.23 kB | 121.76 kB |
| `index`         | 222.60 kB |  70.02 kB |
| `pages`         |  93.88 kB |  21.47 kB |

The BE-04 handoff reported a 427.64 kB `ProductionApp` chunk. The current build is 1.59 kB larger minified (about 0.4%); no targeted bundle-splitting change was made because the measured increase is small and no benchmark showed a benefit. Existing Admin lazy loading remains. Vite emitted no chunk-size warning.

No production traffic, large collection, latency, Core Web Vitals, request-count, or re-render benchmark was run. Pagination reduces initial rows by contract but is not a measured production performance result.
