# Thành phần tái sử dụng và mới

## Tái sử dụng

- `PublicShell`, header/menu mobile và public navigation/footer trong `shared/layouts/shells.tsx`.
- `Container`, `LinkButton`, `Button` và `Accordion` / `AccordionItem` / `AccordionTrigger` / `AccordionContent` từ `shared/ui`.
- `usePublicCourseCatalog()` và trạng thái domain `DomainState`.
- `CourseSummaryModel` làm hợp đồng dữ liệu, `formatVnd` để định dạng giá khi catalog cung cấp.
- Token màu, typography, border, shadow và breakpoint hiện có.

## Mới trong feature homepage

- `HeroSection`, `QuickEntrySection`, `LearningIntroSection`, `PricingSection`, `ValuePropositionSection`, `FAQSection`.
- `homepage-content.ts` cho nội dung tĩnh, `index.ts` cho exports và `homepage.css` cho các hình dạng đặc thù của hero.
- `PricingSection.test.tsx` cho dữ liệu một/nhiều khóa, thiếu giá/thời hạn, loading, lỗi và trạng thái rỗng.
- `homepage-redesign.spec.ts` cho điều hướng, responsive, trạng thái guest/student, menu, FAQ, axe và ảnh chụp.

## Thay đổi dùng chung có giới hạn

`PublicShell` thêm các props tùy chọn `footerNavItems`, `footerCopyright`, `wideNavigation`. Homepage bật `wideNavigation` để chuyển sang menu mobile ở chiều rộng phù hợp; các trang khác giữ mặc định cũ. Một tiêu đề ẩn theo thị giác được thêm cho thứ tự heading của trang catalog để sửa lỗi axe đã phát hiện, không đổi nội dung nhìn thấy hoặc nghiệp vụ.
