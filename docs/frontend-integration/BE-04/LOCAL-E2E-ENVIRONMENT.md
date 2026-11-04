# Local Isolated E2E Environment

## Commands

From `frontend/`:

```powershell
npm run check
npm run e2e:be04
```

`e2e:be04` uses `frontend/playwright.be04.config.ts`. It starts the test API (`backend` script `e2e:server`) on `127.0.0.1:4141` and Vite on `127.0.0.1:4173`, with `VITE_API_BASE_URL=http://127.0.0.1:4141/api/v1`.

## Data isolation

`backend/scripts/be04-e2e-server.ts` creates a MongoMemoryReplSet (MongoDB 8.0.34) and uses database name `paniverse_be04_e2e_test`. The database lives in process memory and is torn down when the test server exits. It seeds only synthetic `.test` Student/Admin identities, a course/section/lesson, FILE_BASED and QUIZ exercises, an answer-asset association, one renewal plan, a test coupon and a clearly labelled test payment configuration.

The email provider is a fake test implementation. The test Admin is provisioned by test bootstrap, not public registration. The reserved `example.test` QR URL is display data only; no funds are sent. No Atlas URI is read, no unrelated MongoDB is used, and no production secret or customer file is stored.

Playwright is configured for one Chromium worker, no server reuse, isolated loopback listeners, trace and screenshot on failure. E2E output goes to `frontend/test-results/be04-isolated/` and the HTML report to `frontend/playwright-report/be04-isolated/`.
