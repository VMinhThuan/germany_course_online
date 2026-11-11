# Known limitations

- The Admin detail response displays at most 500 comments from one thread at a time. The table remains paginated and can locate individual comments in larger discussions.
- Admin content search requires the new MongoDB text index. Production index state has not been checked and no index migration was applied.
- Production BE-10 indexes were not inspected or applied. Verify the reaction and rate-limit unique indexes before the first production release.
- Student discussions are enabled by default. Production Vercel environment values were not changed; explicitly set both flags to `false` to pause discussions.
- A live browser E2E run against staging and responsive screenshots were not produced; component and backend integration tests provide local verification.
- Deletion uses a single MongoDB transaction across the full descendant set. Extremely large threads can exceed database transaction limits; failed transactions leave the branch undeleted rather than partially hidden.
