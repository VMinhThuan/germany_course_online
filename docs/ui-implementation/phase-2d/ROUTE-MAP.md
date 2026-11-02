# Phase 2D — Route map

| ID  | Route                              | Screen / behavior                                                        |
| --- | ---------------------------------- | ------------------------------------------------------------------------ |
| D01 | `/checkout/:orderContext`          | Purchase/renewal quote, coupon check and demo order creation.            |
| D02 | `/orders/:id/pending`              | `PENDING` order, no entitlement, mock success/failure controls.          |
| D03 | `/orders/:id/result`               | Final payment state and repository-returned entitlement.                 |
| I01 | `/student/orders`                  | Current account order history.                                           |
| I02 | `/student/orders/:id`              | Account-owned order detail.                                              |
| I03 | `/student/courses/:courseId/renew` | Expired/active enrollment renewal plans, with hypothetical pricing copy. |

Purchase navigation from a guest returns through the sanitized login `returnTo`. Checkout and order routes require a student session; an order ID belonging to another account does not resolve.
