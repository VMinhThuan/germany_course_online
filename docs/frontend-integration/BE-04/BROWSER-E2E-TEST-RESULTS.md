# Browser E2E Test Results

## Run

Command: `npm run e2e:be04` from `frontend/`. Browser: Playwright Chromium, Desktop Chrome viewport. The browser used real HTTP requests to Express backed by the isolated MongoDB replica set described in [LOCAL-E2E-ENVIRONMENT.md](LOCAL-E2E-ENVIRONMENT.md).

| Case                                                 | Status | Verified behavior                                                                                                                                                                                                                                                                                                                                                |
| ---------------------------------------------------- | ------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Guest → Student purchase → Admin approval → learning | PASS   | Public landing/catalog/detail, protected redirect, login, refresh after reload, dashboard, coupon quote, PENDING order, transfer report remains pending, paid lesson denied before approval, Admin approval, media `503` state, answer association visible, manual exercise completion, low-score quiz result labels, persistent note, lesson completion, logout |
| Registration session semantics                       | PASS   | New synthetic Student is created; browser remains signed out and stays on registration success                                                                                                                                                                                                                                                                   |
| Student session replacement                          | PASS   | New login revokes old session; old protected request returns 401 `SESSION_REVOKED`; browser clears access and routes to login                                                                                                                                                                                                                                    |
| Axe scan: `/`, `/login`, `/admin`                    | PASS   | No `critical` or `serious` axe violations for WCAG 2.1 A/AA tags on these three entry pages                                                                                                                                                                                                                                                                      |

**Result: 4/4 Playwright tests passed (3 API business/security journeys + 1 accessibility scan).** There were no mocked repository responses in the E2E harness.

## Not covered by this run

Renewal approval/expiry extension, every cancellation/coupon-reservation edge, two-user order isolation, exhaustive Admin CMS CRUD and account/status/enrollment mutations, SMTP delivery, and real media upload/playback are not demonstrated by these four browser tests. Backend regression and typed UI/API integration are separate evidence; they do not replace missing browser journeys. Axe scan scope is limited to the three scanned pages and severe impacts; it is not a full WCAG audit.

Successful run does not produce a failure screenshot/trace. Test artifacts are retained for future failures only. Production origins and external services were not involved.
