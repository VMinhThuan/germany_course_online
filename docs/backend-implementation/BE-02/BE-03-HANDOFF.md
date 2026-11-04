# BE-03 Handoff

BE-02 stops at the learning-core boundary. The source now contains all 18 student learning APIs, nine new models, entitlement/media authorization, server-side quiz grading, progress/notes, synchronized OpenAPI, and passing local regression gates. Do not infer or begin BE-03 scope from this handoff.

## Decisions needed before dependent work

1. Confirm whether a quiz exercise completes on any submitted attempt or only after the learner passes `passScorePercent`.
2. Confirm that `showCorrectAnswers=false` suppresses answer review after submission. Current result behavior follows the BE-00 recommendation and is provisional.
3. Confirm the 10,000-character lesson-note limit or replace the technical recommendation with an official product limit.
4. Define how approved commercial/enrollment workflows create and revoke `enrollments`; BE-02 deliberately has no enrollment-creation API.
5. Select and provision the S3-compatible media provider, bucket/IAM policy, endpoint/region, secret-delivery method, allowed object types, and production signed-URL TTL.

## Operational setup still required

- Provision an approved MongoDB replica-set target, database name, network/TLS policy, credentials, backups, and production indexes.
- Set production JWT secret/issuer/audience, frontend origin allowlist, secure cookie policy, and approved secret management.
- Provision media storage and validate a real signed read URL in an isolated production-like environment before enabling learner media.
- Review deployment/runtime constraints for the existing Express application. BE-02 did not deploy to Vercel.

## Suggested follow-up after approval

- Add the chosen quiz completion transition transactionally and test lesson completion for required/optional quizzes.
- Add authorized enrollment lifecycle writes only in the separately approved order/commerce or admin phase.
- Exercise the configured media provider with private test objects and verify TTL, content type, cache headers, access policy, and revocation expectations.
- Connect frontend adapters only in a separately authorized frontend phase; keep DTOs aligned with `docs/backend-design/BE-00/openapi.yaml`.
- Re-run `npm run check`, both npm audit commands, and the deployment's own build/runtime checks after the dependent changes.

## Workspace handoff

Changes are local and uncommitted. No push, deployment, Atlas connection, production data mutation, or BE-03 implementation was performed.
