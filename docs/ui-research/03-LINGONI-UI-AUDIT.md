# Audit UI tham khảo: Lingoni German landing

**URL:** https://lingoni.com/german/ · **Thời điểm:** 02-11-2026, khoảng 13:40–13:52 Asia/Ho_Chi_Minh · **Đăng nhập:** không · **Viewports:** 1440×900, 768×1024, 390×844.

Khảo sát dùng Computer Use trên trang đã render. Chụp full page, desktop/tablet/mobile, mobile menu, FAQ mở, login và password reset. Screenshots nằm ở docs/ui-research/screenshots/.

## Information architecture và thứ tự trang

1. Header: logo; Live Courses, Languages, Pricing, Blog, Useful Links; CTA Start Trial; Sign in.
2. Hero nền teal: nội dung giới thiệu ở trái, hình giáo viên/sản phẩm thiết bị ở phải, Trustpilot proof, CTA màu cam.
3. Giới thiệu/video.
4. App/product và team.
5. Ba pricing cards.
6. Bốn lợi ích/benefit blocks.
7. Testimonials.
8. FAQ dạng accordion với 11 mục.
9. Contact form: First Name bắt buộc, Last Name tùy chọn, Email bắt buộc, Message bắt buộc.
10. Footer: pháp lý, mạng xã hội và liên kết hỗ trợ.

Đây là landing dài với nhiều bằng chứng và nội dung thuyết phục. Phù hợp để học cách kể giá trị và dùng social proof; không phù hợp để bê nguyên độ dài sang sản phẩm giai đoạn đầu.

## Quan sát theo viewport

| Viewport | Bố cục / hành vi quan sát được | Bằng chứng |
|---|---|---|
| Desktop 1440×900 | Header ngang; hero chia cột; CTA và Trustpilot ở vùng đầu; các section full-width nối tiếp. | lingoni-home-desktop-1440x900.png, lingoni-home-fullpage-desktop.png |
| Tablet 768×1024 | Nội dung chuyển sang bố cục hẹp, hình và text chiếm không gian dọc; kiểm tra được trang và thứ tự section. | lingoni-home-tablet-768x1024.png |
| Mobile 390×844 | Header rút gọn; menu mở thành drawer tối với mục con accordion; hero xếp dọc, hình sản phẩm ở trước/đầu; cookie banner fixed che vùng nội dung đáng kể. | lingoni-home-mobile-390x844.png, lingoni-mobile-menu-open-390x844.png |

## Visual system, layout và interaction

- **Visual hierarchy:** headline và CTA rõ; social proof đặt gần hero; section heading chia nội dung dài.
- **Grid:** hero desktop hai cột; card pricing theo hàng; mobile xếp thành một cột. Tài liệu không suy đoán kích thước spacing chính xác từ screenshot.
- **Color:** teal hero, nền sáng, CTA cam; palette khác brand khách hàng.
- **Typography:** headline lớn, mô tả ngắn và CTA nổi bật; không trích font/size chưa xác minh.
- **Buttons/cards:** primary CTA màu tương phản; pricing card so sánh gói; lợi ích/testimonial tạo nhịp nội dung.
- **FAQ:** accordion hoạt động; mở được một câu trả lời trên desktop.
- **Navigation:** mobile drawer có submenu; semantic button state không được kiểm định bằng screen reader.
- **Forms/feedback:** contact form có trường bắt buộc/không bắt buộc nhìn thấy; không submit nên không xác nhận validation server, loading hoặc success/error states.
- **Auth:** login riêng của Lingoni có email/password và liên kết forgot password. Trang reset có email input. Chỉ quan sát, không gửi thông tin.
- **Loading/error:** embedded YouTube ở trạng thái lỗi 152 tại thời điểm khảo sát; ghi nhận là trạng thái tạm thời, không phải đánh giá ổn định.
- **Cookie:** banner lớn cố định trên mobile, làm giảm diện tích nhìn thấy; đánh giá là vấn đề UX quan sát được, không kết luận tính tuân thủ pháp lý.

## Pattern decisions

| Pattern | Quyết định | Lý do |
|---|---|---|
| Hero có headline, mô tả, CTA, social proof | ADOPT | Truyền giá trị và hành động chính ngay đầu trang. Dùng nội dung/ảnh của dự án, không lấy asset Lingoni. |
| Giới thiệu sản phẩm và nội dung khóa học bằng section dễ quét | ADAPT | Giữ cách kể chuyện, rút gọn thành tối đa một vài khối giúp người học hiểu nội dung A1.1. |
| Ba pricing cards / benefits / testimonial | ADAPT | Chỉ dùng khi có dữ liệu giá và bằng chứng thật; tránh lặp thông điệp và claim không được kiểm chứng. |
| FAQ accordion | ADOPT | Hợp với thắc mắc về chương miễn phí, access duration, thanh toán; cần keyboard, focus, aria-expanded và heading semantics. |
| Contact form dài ở cuối landing | ADAPT | Dùng CTA hỗ trợ đơn giản hơn; không mở contact form mới nếu backend chưa có endpoint. |
| Mobile menu drawer | ADOPT | Mô hình gọn cho nhiều mục, phải đóng bằng Escape, trả focus về trigger, quản lý focus và có semantic button. |
| Trang dài với nhiều section gần nghĩa | REJECT | Khách hàng yêu cầu ít section và đơn giản; giảm cognitive load. |
| Cookie banner che lớn trên mobile | REJECT | Không để overlay che CTA/nội dung chính; cookie behavior vẫn cần policy thực tế. |
| Sao chép màu sắc, hình, copy hoặc video | REJECT | Bản quyền/nhận diện riêng và yêu cầu không sao chép. |

## Accessibility review (quan sát và tiêu chí cần áp dụng)

Đã quan sát trực quan, chưa audit DOM/screen reader đầy đủ. Khi thiết kế mới: đảm bảo nav/accordion/form là controls semantic; tên accessible cho icon-only controls; error gắn với field; focus visible; menu hoạt động keyboard; không dựa vào màu đơn lẻ. Tránh chữ pastel trên nền trắng: #C2E8F5/white = 1.30:1; #D1F685/white = 1.22:1.

## Screenshot index

- lingoni-home-desktop-1440x900.png — trang đầu desktop.
- lingoni-home-fullpage-desktop.png — full page.
- lingoni-home-tablet-768x1024.png — tablet.
- lingoni-home-mobile-390x844.png — mobile.
- lingoni-mobile-menu-open-390x844.png — drawer mobile mở.
- lingoni-faq-expanded-desktop-1440x900.png — FAQ mở.
- lingoni-login-desktop-1440x900.png — login.
- lingoni-password-reset-desktop-1440x900.png — reset form.

## Áp dụng cho dự án

Landing đề xuất theo chuỗi: Hero + proof ngắn → nội dung/cách học A1.1 (kèm 3 chương preview) → lợi ích hoặc sample lesson → gói học/CTA khi giá đã chốt → FAQ → footer. Phần cuối có thể gọn hơn nếu không có contact API. Chi tiết UI cần ánh xạ với R-01–R-07, R-34 trong [traceability](02-REQUIREMENTS-TRACEABILITY.md).
