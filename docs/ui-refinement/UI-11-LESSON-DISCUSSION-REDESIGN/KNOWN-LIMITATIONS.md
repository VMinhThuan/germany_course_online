# Known limitations

- E2E states use deterministic synthetic API fixtures; live API, session permissions, real comment records, and database persistence were not verified.
- Admin branch detail renders up to 100 thread items. When the API reports more, the UI explains the limit; use inbox filters to locate a particular reply.
- Admin course/section/lesson selectors load catalog pages through the existing repository before filtering. Very large catalogs may take longer to populate.
- At 768 × 1024, Admin uses a single-pane list/detail flow. Side-by-side inbox and detail start at the wide-screen breakpoint.
- Responsive evidence uses Chromium viewport emulation rather than physical devices. Automated accessibility scans do not replace assistive-technology acceptance.
- The successful production build still emits a bundle-size warning for chunks above 500 kB. UI-11 did not alter code splitting.
