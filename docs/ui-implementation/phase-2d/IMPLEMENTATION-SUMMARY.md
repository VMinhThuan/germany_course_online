# Phase 2D — Commerce demo

Implemented a checkout and order lifecycle on the shared student product repository: public course detail leads to demo checkout, coupon validation updates the quote, order creation remains `PENDING`, and a clearly labeled mock gateway can return success or failure. Order history/detail/result screens share the same user-scoped records. Renewal choices appear only for an existing non-revoked enrollment; after a successful mock renewal the lesson access state is restored.

All VND amounts use integer strings and repository `BigInt` arithmetic. The purchase price, 12-month term, `DEMO10` discount and renewal plan prices are provisional display assumptions called out in UI copy. No payment SDK, backend or database was added.

Implementation is centered in `frontend/src/app/student-lms/commerce-pages.tsx` and the `commerce` port in `frontend/src/data/student-demo/product-repository.ts`.
