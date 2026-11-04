# OpenAPI Contract Changes

`docs/backend-design/BE-00/openapi.yaml` is canonical. `backend/openapi.yaml` must remain byte-for-byte identical; `npm run check:openapi` verifies synchronization and every internal reference.

The 12 BE-00 operations in scope include Student coupon validation and renewal-plan listing; Admin renewal-plan CRUD and coupon CRUD; and Admin enrollment revoke/restore. Four additions are explicitly marked as BE-03C contract extensions: Student pending-order cancel, Admin pending-order cancel, Admin enrollment grant, and Admin enrollment extend.

Schemas now cover the public renewal-plan list, plan price and strict create/patch request shapes, coupon admin/list/reservation DTOs, coupon validation and selected discount source, Order renewal and cancellation snapshots, Admin coupon reservation context, and Admin enrollment mutation requests. Student coupon validation omits private usage/capacity metadata. Admin enrollment writes declare required `Idempotency-Key` headers. Quiz submission documents that a valid submitted result completes the Exercise regardless of score while Lesson completion remains explicit.
