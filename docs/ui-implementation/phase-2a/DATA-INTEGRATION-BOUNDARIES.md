# Phase 2A — Data Integration Boundaries

## Current UI boundary

`src/data/public-demo/types.ts` defines a UI-owned port, not a backend DTO:

- `listCourses(): Promise<readonly CourseSummaryModel[]>`
- `getCourseBySlug(slug): Promise<CourseDetailModel | null>`
- `getPreviewManifest(courseSlug): Promise<PublicPreviewManifest | null>`
- `getPreviewLesson(courseSlug, sectionId, lessonId): Promise<PublicPreviewLessonContent | null>`

Page data flows through `usePublicCourseCatalog`, `usePublicCourse`, `usePublicPreviewManifest`, and `usePreviewExperience`. Pages do not import fixture constants. `loadPreviewExperience` validates slug, manifest, section type/status, section membership, lesson membership, then content availability before returning a view state.

## Demo adapter and content

`createPublicDemoRepository` reads only `src/data/public-demo/fixtures.ts`. This contains one public course outline, a three-section preview manifest, and three fictional sample lecture records. It contains no student identity, password/session fields, enrollments, order/payment data, exercises, quiz answers, or private asset URLs. The sample video has no `src`; it renders the unavailable state.

The production entry intentionally imports this safe public demo adapter so the requested routes work in the production demo build. It does not import `src/data/mock/repository.ts`, `src/data/mock/fixtures.ts`, `/__dev` pages, or the scenario controller.

## Backend contracts remain open

The V3 research specifies public course endpoints but not HTTP methods/response DTOs. It also has no public-preview field, preview endpoint, guest permission matrix, or approved video URL contract. Do not convert these client models into assumed DTOs or treat this preview manifest as backend policy. Phase 2B must confirm actual OpenAPI/DTO shapes and create a validating HTTP adapter at this boundary.

No price or access-duration values are supplied to public screens. No currency arithmetic, account state, progress, enrollment, or purchase authorization is derived in the browser.
