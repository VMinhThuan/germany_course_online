# Phase 2D — Data and state architecture

- `StudentCommerceRepository` owns checkout context, coupon validation, order creation/list/detail, renewal plans and the mock payment transition.
- Orders, renewal plan ID, amount, original expiry and granted enrollment reference are persisted in the same user-scoped product state as learning and profile data.
- `OrderType` and terminal/order/payment statuses follow V3 literals. The repository stores money as decimal integer strings; `BigInt` performs coupon arithmetic and calendar month calculations avoid floating-point rounding.
- TanStack Query checkout keys include session, context, plan and validated coupon. Previous quote data is retained while a coupon quote refreshes so form state and status messages remain mounted.
- A mock successful transition updates the order, enrollment, expiry and access state atomically within the repository operation. Failure updates the order only and keeps access unchanged.

The UI is a client demo. The repository is the single coherent source for this browser session, not a financial ledger.
