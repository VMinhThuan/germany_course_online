# Known Limitations

- No 28 product screens or production routes were built. `/__dev/lms-kit` is a showcase only.
- Research reports do not provide complete API request/response DTOs, route/method coverage, or endpoint-specific error codes. Repository ports are frontend interfaces, not confirmed backend contracts.
- Public catalog filters/pagination, content projections, access decisions, signed-media DTO and preview authorization/provider remain open.
- The preview manifest implements the customer-requested demo presentation for three explicit A1.1 `CHAPTER` IDs. The backend has no preview field/enum; production policy is not implemented.
- Course copy, profile display name, sample price, order code, coupon result, quiz score/result, exercise capabilities and fixture time are mock data, not approved product data.
- Coupon VND discount and checkout totals are supplied strings for display only; no price arithmetic is included.
- Video and audio fixtures do not point to playable media. The UI shows unavailable/fallback states; no licensed course content was embedded. The sample PDF/SVG are original local demo assets.
- `ProfileForm` demonstrates a display-name update callback. Exact editable profile fields and validation remain unconfirmed.
- Retry capability and answer review are explicit result fixture values, not policy assumptions. No retry limit or pass score exists.
- Expiry is displayed from repository view state; there is no end-of-month renewal calculation or front-end access enforcement.
- Browser tests exercise Chromium; they do not establish behavior in every browser/device assistive technology combination.

