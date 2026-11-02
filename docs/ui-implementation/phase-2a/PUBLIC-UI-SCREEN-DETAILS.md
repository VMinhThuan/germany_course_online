# Phase 2A — Public UI Screen Details

## A01 — Landing (`/`)

- Hero introduces the A1.1 course and offers catalog and preview actions.
- Course highlight renders the single safe public course record.
- “Cách học” describes the sample's chapter/lesson structure without student counts, reviews, or instructor claims.
- Preview panel links to the guest learning route.
- FAQ covers login, unannounced price/term, and unavailable video. The page ends with a catalog CTA and public footer.

## C01 — Catalog (`/courses`)

- One feature card links to C02. It shows no price because no price has been confirmed.
- Copy says the catalog currently contains one course in the demo. There is no search box or filter UI with implied behavior.

## C02 — Course detail (`/courses/:slug`)

- Course hero explains the A1.1 preview and says price/access duration are unannounced.
- Course overview and learning objectives are visibly labeled as demo content.
- Accordion outline lists sections and lessons. The three validated preview chapters carry “Học thử miễn phí” links. Other chapters and exam-prep content say “Nội dung đầy đủ · cần quyền truy cập.”
- Selecting a preview lesson opens C03 with query state. Selecting a full-course lesson opens an access explanation. The purchase action opens a not-ready dialog, with no payment link.

## C03 — Free preview (`/courses/:slug/preview`)

- Desktop: fixed-width chapter navigation next to lesson content. Mobile: native chapter selector above the content; the public navigation uses the existing sheet.
- Lesson selection changes `lessonId`; chapter selection changes `sectionId` and selects the first listed lesson.
- Demo copy and sample phrases are separated from video. Video uses the `VideoPlayer` unavailable state with the exact message “Video học thử đang được cập nhật.” No video URL or player source is present.
- Missing sample content, invalid query values, and paid chapters have distinct states and return paths to C02.

## Reused components

- Phase 1A `PublicShell`, `Container`, `Button`, `LinkButton`, `Card`, `Badge`, `Sheet`, and dialog provider.
- Phase 1B `LandingHero`, `CourseGrid`, `CourseCard`, `CourseDetailHero`, `CourseOverview`, `CourseObjectives`, `CourseOutline`, `CourseSectionAccordion`, `LearningBenefits`, `FreePreviewBadge`, `DomainState`, and `VideoPlayer`.
- New public data layer: `PublicCourseRepository`, `createPublicDemoRepository`, `loadPreviewExperience`, manifest validation, and React Query hooks.
- New product routes and pages: A01, C01, C02, C03, 404, and route scroll/title behavior.
