# Phase 2D — E2E journeys

Playwright covers:

1. Guest course detail → login with a no-enrollment demo persona → purchase checkout.
2. Validate `DEMO10` → compare quote → create `PENDING` order → verify no access → mock success → verify active access → open order detail and history.
3. Create a separate order → mock failure → verify failure copy and no enrollment.
4. Start with expired entitlement → verify lesson remains locked → select a renewal plan → create pending renewal → mock success → verify renewed access and return to lesson.
5. Invalid order deep link stays in an error state; order reads are scoped to the current account in repository tests.

Screenshots of valid coupon checkout, pending order, payment success/failure, expired renewal choice and renewal success are saved under `screenshots/`.
