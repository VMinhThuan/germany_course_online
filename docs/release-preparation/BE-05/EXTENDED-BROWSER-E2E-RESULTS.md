# Extended Browser E2E Results

**Result: PASS — 7/7 tests in the final BE-05 run.** Command: `cd frontend; npm run e2e:be05`. The Playwright config starts the actual Express app plus a MongoDB Memory Server replica set and the Vite frontend on loopback. The fixture server seeds synthetic accounts and course data, injects a fake email transport, and configures explicitly test-only bank instructions.

|   # | Browser journey                                                                                                    | Result |
| --: | ------------------------------------------------------------------------------------------------------------------ | ------ |
|   1 | Checkout pricing, coupons, reservations, cancellation, bank-report state, Admin approval/reconciliation            | PASS   |
|   2 | Active/expired/revoked enrollment renewal, expiry extension, no duplicate enrollment, progress/history retention   | PASS   |
|   3 | Two-student resource isolation, direct API/URL authorization, Admin RBAC, account block and reactivation           | PASS   |
|   4 | Admin renewal-plan lifecycle, enrollment grant/revoke/restore/extend and partial site-settings update              | PASS   |
|   5 | CMS course/section/lesson/FILE_BASED/required Quiz creation, publish, student completion and quiz-attempt snapshot | PASS   |
|   6 | Representative public/student/Admin axe scans and responsive overflow at desktop/tablet/mobile                     | PASS   |
|   7 | Backend outage and unavailable media error states                                                                  | PASS   |

The existing `npm run e2e:be04` suite remains intact and passed 4/4 after the BE-05 changes.

## Failure-driven fixes retained

Earlier runs exposed a rejected browser DELETE preflight; CORS now permits DELETE and a backend OPTIONS regression test checks the preflight contract. The CMS browser flow exposed missing required instructions in the exercise-create form and generic rendering of string validation errors; both UI issues were fixed and the browser test verifies the invalid Quiz message. The test also now waits for the persisted Quiz payload before editing it. Admin contexts are closed between tests so reset remains isolated. No test was skipped or weakened.

The outage test simulates a failed HTTP request. It does not establish behavior for every 400/401/403/404/409/429 response, a request timeout, upload interruption, or production network failure. See [RELEASE-BLOCKERS.md](RELEASE-BLOCKERS.md).
