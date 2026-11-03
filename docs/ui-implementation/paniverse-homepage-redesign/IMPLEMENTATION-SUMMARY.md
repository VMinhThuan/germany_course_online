# PAniverseDeutsch homepage redesign

## Kết quả

**PASS — phần homepage và đổi nhận diện thương hiệu đã hoàn thành trong frontend.** Không thay đổi backend, database, API contract, khóa học ID/slug, thanh toán, enrollment hay logic học tập. Không tạo commit, push hoặc deploy.

Homepage mới dùng brand `PAniverseDeutsch`, ảnh học tập photorealistic được tạo riêng, giới thiệu khóa học song ngữ, video YouTube tải khi người dùng bấm, một card khóa học lấy từ public repository, bốn lợi ích, sáu FAQ và footer bốn nhóm. Header, CTA, menu mobile và các route hiện có được giữ lại.

## Section order

1. Header dùng `PublicShell` và `PublicHeader` hiện có.
2. Hero ảnh học viên, tiêu đề tiếng Việt, câu tiếng Đức và hai CTA.
3. Giới thiệu khóa học với tiêu đề Việt, câu dịch Đức và mô tả.
4. Video giới thiệu khóa học.
5. Bốn thẻ tính năng có ảnh.
6. Card Tiếng Đức A1.1 lấy từ repository.
7. Bốn lợi ích trong lưới 2×2.
8. Sáu câu hỏi thường gặp dùng Radix Accordion sẵn có.
9. Footer gồm thương hiệu, khám phá, hỗ trợ và liên hệ.

## Các vùng mã nguồn chính

- Brand/config: `frontend/src/config/brand.ts`, `frontend/src/config/site-contact.ts`, `frontend/src/shared/brand/BrandLogo.tsx`.
- Homepage: `frontend/src/features/homepage/` — content, component dùng lại, từng section và CSS giới hạn trong homepage.
- Shared app branding/title: `frontend/src/shared/layouts/shells.tsx`, `frontend/src/app/`, `frontend/src/main.tsx`, `frontend/index.html`.
- Ảnh và logo: `frontend/public/assets/homepage/`, `frontend/public/assets/brand/`, `frontend/public/favicon.svg`.
- Test: unit test của YouTube/pricing/footer; E2E homepage, public routes, production và các luồng hồi quy.

Các section cũ `HeroSection`, `QuickEntrySection`, `LearningIntroSection`, `ValuePropositionSection`, `PricingSection` cùng test cũ đã được thay bằng cấu trúc mới. Không tạo design system hoặc framework CSS thứ hai.

## Kết quả xác minh

- `npm run check`: typecheck, lint, 19 file unit test (121/121), production build — pass.
- `npm run format:check`: pass.
- `npm run e2e -- --workers=1`: 54/54 Chromium — pass. Chạy một worker vì các test trước đó cùng ghi ảnh vào các thư mục docs; screenshot của test cũ hiện lưu theo từng test trong `frontend/test-results/`, không ghi đè bằng chứng phase cũ.
- `npm run e2e:production`: 1/1 — pass.
- `npm audit --json`: 0 lỗ hổng.
- Homepage có Axe pass ở desktop, FAQ mở rộng, mobile FAQ và menu mobile; ảnh được kiểm tra trực quan ở 1440, 1024, 768, 390 và 320 px.

Chi tiết và giới hạn nằm trong các tài liệu còn lại của thư mục này.

## Files changed

### Brand/config và app

- `frontend/index.html`
- `frontend/public/favicon.svg`
- `frontend/src/config/brand.ts` (mới)
- `frontend/src/config/site-contact.ts` (mới)
- `frontend/src/main.tsx`
- `frontend/src/vite-env.d.ts`
- `frontend/src/shared/brand/BrandLogo.tsx` (mới)
- `frontend/src/shared/layouts/shells.tsx`
- `frontend/src/app/auth/pages.tsx`
- `frontend/src/app/layout-preview.tsx`
- `frontend/src/app/lms-kit.tsx`
- `frontend/src/app/public-site/pages.tsx`
- `frontend/src/app/student-lms/shared.tsx`
- `frontend/src/app/student/pages.tsx`
- `frontend/src/app/ui-kit.tsx`

### Homepage

- `frontend/src/features/homepage/content/homepage-content.ts`
- `frontend/src/features/homepage/homepage.css`
- `frontend/src/features/homepage/index.ts`
- `frontend/src/features/homepage/components/BilingualSectionHeading.tsx` (mới)
- `frontend/src/features/homepage/components/PhotographicFeatureTile.tsx` (mới)
- `frontend/src/features/homepage/components/YouTubeEmbed.tsx` và `.test.tsx` (mới)
- `frontend/src/features/homepage/sections/PhotographicHero.tsx` (mới)
- `frontend/src/features/homepage/sections/CourseIntroduction.tsx` (mới)
- `frontend/src/features/homepage/sections/CourseOverviewVideo.tsx` (mới)
- `frontend/src/features/homepage/sections/LearningFeaturesGrid.tsx` (mới)
- `frontend/src/features/homepage/sections/CoursePricingSection.tsx` và `.test.tsx` (mới)
- `frontend/src/features/homepage/sections/LearningBenefitsSection.tsx` (mới)
- `frontend/src/features/homepage/sections/FAQSection.tsx`
- `frontend/src/features/homepage/sections/HomepageFooter.tsx` và `.test.tsx` (mới)
- Đã xóa: `HeroSection.tsx`, `QuickEntrySection.tsx`, `LearningIntroSection.tsx`, `ValuePropositionSection.tsx`, `PricingSection.tsx`, `PricingSection.test.tsx`.

### Ảnh và test

- Mới: 5 ảnh homepage WebP, `frontend/public/assets/brand/` với SVG/PNG/ICO; thay `frontend/public/favicon.svg`.
- E2E đã cập nhật: `auth-student.spec.ts`, `foundation.spec.ts`, `homepage-redesign.spec.ts`, `lms-kit.spec.ts`, `production.spec.ts`, `public-site.spec.ts`, `student-product.spec.ts`.
- Ảnh before/after và các tài liệu chi tiết được đặt trong `docs/ui-implementation/paniverse-homepage-redesign/`.
