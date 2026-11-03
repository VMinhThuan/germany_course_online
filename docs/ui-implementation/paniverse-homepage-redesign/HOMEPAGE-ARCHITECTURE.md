# Homepage architecture

## Composition

Route composition tại `frontend/src/app/public-site/pages.tsx` điều phối public catalog hook rồi render section theo thứ tự, không đặt fetch/data access trong component trình bày:

```text
PublicLandingPage
└─ SitePage (PublicShell, nav, auth state, homepage footer)
   └─ main
      ├─ PhotographicHero
      ├─ CourseIntroduction
      ├─ CourseOverviewVideo
      ├─ LearningFeaturesGrid
      ├─ CoursePricingSection (catalog data)
      ├─ LearningBenefitsSection
      └─ FAQSection
```

`HomepageFooter` được truyền vào shared shell để dùng footer đầy đủ trên homepage trong khi các trang public khác vẫn giữ footer hiện có.

## Trách nhiệm module

- `content/homepage-content.ts`: copy, feature, FAQ và link tĩnh.
- `components/BilingualSectionHeading.tsx`: heading Việt, bản dịch Đức và mô tả dùng lại.
- `components/PhotographicFeatureTile.tsx`: ảnh, overlay và label; không tạo affordance click giả.
- `components/YouTubeEmbed.tsx`: parse URL, poster, trạng thái tải, iframe và fallback.
- `sections/*`: layout riêng từng phần; card khóa học vẫn lấy data typed.
- `src/config/brand.ts`: brand, khóa học, logo, metadata title.
- `src/config/site-contact.ts`: các trường liên hệ tùy chọn, chỉ chứa thông tin đã xác nhận.
- `homepage.css`: quy tắc custom có prefix homepage; phần còn lại dùng token và utility hiện tại.

## Data và route

`CoursePricingSection` nhận `CourseSummaryModel[]` từ hook catalog trong route. Catalog hiện trả public demo repository, với `PUBLIC_DEMO_COURSE` trong `frontend/src/data/public-demo/fixtures.ts`. ID, slug, chapter/lesson và checkout flow không đổi. Giá và thời hạn chỉ render nếu model cung cấp.

Header anchor `/#course-intro`, `/#footer-contact`, CTA preview `/courses/tieng-duc-a1-1/preview`, course `/courses/tieng-duc-a1-1`; footer dùng `/courses`, `/help`, `/login` hoặc route student khi đã đăng nhập.

## Không đổi

Không sửa backend, database, API contract, auth business logic, enrollment, payment lifecycle, grading hoặc progress calculation. Không thêm thư viện UI/CSS framework.
