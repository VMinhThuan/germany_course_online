# Known limitations

- This deliverable is a UI foundation and preview only. It contains no API client, backend/database change, authentication, payment flow, course entitlement, student account data, or persisted state.
- The Auth and Checkout shells contain only geometric placeholders. They do not submit credentials, create an order, calculate a price, or invoke a payment provider.
- Student and Learning samples contain illustrative labels and static layout blocks; they do not reflect real progress, access, lessons, or enrollment state.
- Production deliberately renders a foundation status screen. No product route is available in production yet.
- Only Chromium was used for browser automation. Safari, Firefox, mobile hardware, and assistive technology combinations were not tested.
- axe scans covered six route entry states, not every overlay state. No manual WCAG audit or screen-reader certification was performed.
- `formatDate` returns an em dash for invalid dates and formats with UTC; `formatCurrency` expects a finite number and a valid ISO currency code. Domain-specific rounding, timezone, and money rules remain out of scope.
- There is no `.env` file in the project; `.env.example` contains only the optional application title. No secrets or service URLs are configured.
- The npm tree pins `minimatch` 11.0.1+ via an override to address its advisory. Re-run `npm audit`, lint, and tests when upgrading ESLint or typescript-eslint.
- No commit, push, or deployment was performed.
