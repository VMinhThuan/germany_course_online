# API Contract Changes

## BE-00 operations implemented

| Group | Operations |
| --- | ---: |
| Course/section/lesson/exercise/quiz Admin CMS | 20 |
| Media upload intent, completion and delete | 3 |
| Student profile/password/session | 5 |
| Admin Student management | 3 |
| Admin enrollment reads | 2 |
| Admin audit reads | 1 |
| **Total BE-03B baseline** | **34** |

## Minimum media extensions

Seven operations were added because BE-00 had upload/delete but no functional library query or asset-link management: list media; list/link/unlink lesson assets; list/link/unlink exercise assets. Unlink operations require the exact `assetRole` query. No payment, renewal, coupon, enrollment mutation, or frontend operations were added.

## DTO and validation changes

OpenAPI now describes closed CMS, quiz, media, Student, session, enrollment, audit, and association payloads. Course PATCH is partial and course create always returns DRAFT. `UserProfile` remains the safe response DTO; media delivery may yield `avatarUrl: null` when unavailable. Quiz admin output may contain correct-answer keys; it remains ADMIN-secured.

`docs/backend-design/BE-00/openapi.yaml` is canonical. `backend/openapi.yaml` matches byte-for-byte. `npm run check:openapi` verifies the parse, references, phase operation IDs/security and synchronization.
