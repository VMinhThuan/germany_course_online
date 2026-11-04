# Deployment and Rollback Plan

For a frontend-only defect, promote the last known-good frontend deployment. For backend defects or an API contract mismatch, restore the known-good frontend/backend deployment pair and verify `/health`, `/ready`, public API and auth refresh. A Git rollback or Vercel Instant Rollback does not revert Mongo indexes or data; preserve the BE-06A index policy and use its separately reviewed backup/restore procedure.

The current frontend production baseline is deployment `dpl_CXtS3GHd6VBb2vScRPn9vjxPrfQu`, alias `germany-course-online-new.vercel.app`, source SHA `019fee34a2bb0c948b6ed9f116de74f02a50a7d5`. Preserve it until the BE-06B frontend deployment is verified. Record the new backend/frontend deployment IDs, source SHAs, aliases and smoke results before any promotion or rollback. No rollback or database restore was performed.
