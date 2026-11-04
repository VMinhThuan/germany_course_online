# Admin Commerce and Enrollment

## Orders

Admin order list/detail shows order snapshots, transfer-report status and amount. Approval is an explicit Admin mutation with review note; only the backend approval result updates the displayed entitlement. A student transfer report is not treated as evidence that funds arrived. Admin cancellation sends reason and reconciliation outcome to the backend.

## Enrollment and student directory

Admin screens support student search/detail/status and enrollment search/detail. Grant, revoke, restore and extend actions collect backend-required duration/reason fields and use idempotency keys where the API supports them. A frontend role choice cannot create an Admin or override server access.

## Renewal plans and coupons

Admin manages renewal plan list/create/update/deactivate and coupon list/create/update/deactivate through API DTOs. Coupon code/status/discount/capacity restrictions remain backend-owned.

## Verification limits

Browser E2E verified Admin order detail and approval on a synthetic PENDING order and observed the resulting student access. It has not performed a full matrix of Admin cancellation, student status change, manual grant/revoke/restore/extend, plan/coupon CRUD or audit events. Backend regression passed 86 tests. Do not treat the screen implementation as evidence that every Admin mutation was exercised against production data.
