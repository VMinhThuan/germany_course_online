# Audit UI tham khảo: German With Max

**URL khảo sát chính:** https://germanwithmax.com/en/order · **Trang liên quan:** /en/course/a1, /en/lessons/a1, /en/worksheets/a1, login, forget-password, lesson 1, free checkout. **Ngày:** 02-11-2026 · **Đăng nhập:** không · **Viewports:** 1440×900, 768×1024, 390×844.

Đã quan sát trực tiếp bằng Computer Use; không vượt paywall, không tải worksheets, không nhập thông tin hay hoàn tất checkout. Checkout quan sát là sản phẩm free 0 EUR. Paid Buy now không có href rõ ràng và không được mở. Vì vậy trang kết quả thanh toán, đăng ký thành công và paid purchase không được xác minh.

## Information architecture và trang được khảo sát

| Trang | Cấu trúc/nội dung quan sát | Trạng thái và ảnh |
|---|---|---|
| Order | Header; các lựa chọn sản phẩm A1, exam, bundle; giá EUR; options; Buy now/Start Free CTA. Ba card mỗi hàng desktop, một cột tablet/mobile. Radio Lifetime cho product_31 đổi giá hiển thị từ 19.50 EUR sang 29.50 EUR. | Chụp default và lifetime; lựa chọn được trả về default. Không mua. |
| Course A1 | Hero/media, mô tả khóa học, lợi ích, nhân vật/story/audio sample, FAQ và CTA. | Course A1 có ảnh desktop/full page/tablet/mobile. |
| Lessons A1 | Tiêu đề, progress 0%, control đếm/search giá trị 96, selector A1/A2, danh sách lesson. Ba lesson đầu có thể vào; từ lesson 4 hiển thị lock/Sign up. | Desktop 4 cột; tablet một card/list lớn; mobile card ngắn với thumbnail ngang. |
| Worksheets A1 | 87 worksheets được nêu; grammar checkup mỗi 10; control hiển thị 96; PDF Download cho ba mục đầu, từ lesson 4 yêu cầu Sign up. | Không tải file; chụp cả 3 kích cỡ và full page. |
| Login / reset | Login hỗ trợ email + password hoặc magic link; Sign up; Recover password. Sign up dẫn /en/order, Recover dẫn /en/forget với email + Send. | Public auth screens; không gửi email/login. |
| Lesson 1 | Overview có timeline; Start Lesson 1 mở được. Các exercise khác có Get full access/lock. Story lesson có media/illustration lớn, text, audio, translation, vocabulary, Explanation/Get full access, comments. | Chụp overview, story và responsive. Không giả định nội dung trả phí truy cập ngoài phiên công khai. |
| Free checkout | Từ Start Free đến /en/checkout?product_id=8&option_id=0&currency=EUR. Nêu 30 ngày, 0.00 EUR, one-time no subscription; code/Search; total; First Name, Email; terms checkbox ràng buộc và checkbox marketing riêng. | Dừng trước nhập dữ liệu/chọn checkbox/submit. |

## Responsive và visual patterns

- **Desktop:** global nav; order cards dạng ba cột; lessons/worksheets dùng grid bốn cột; course detail có hero/media và section nối tiếp.
- **Tablet:** price cards và lesson/worksheet content xếp dọc/ít cột; ảnh hiển thị riêng để đối chiếu.
- **Mobile:** nav drawer vàng mở khi bấm; order cards một cột; lesson cards gọn và thumbnail bên trái; content page dài, CTA/lock gắn với từng lesson.
- **Navigation issue:** menu trigger là div #nav-icon, không có role/aria-label quan sát được trong accessibility tree. Không nên tái tạo; dùng button semantic với tên/expanded state.
- **Access model observation:** phần public thể hiện nội dung xem được và CTA gated cho lesson sau. Đây là logic tham khảo, không áp dụng làm rule cho sản phẩm mới.
- **Progress:** lesson page nêu 0% trước khi có tiến độ. V3 quy định tính course progress theo eligible lessons; UI mới nên lấy phần trăm đã tính từ API.
- **Forms:** checkout chia thông tin người dùng, điều khoản và tổng thanh toán; reset chỉ email. Không submit nên loading/error/success validation không xác nhận được.
- **Media:** lesson có player/illustration; visual controls và text hierarchy rõ. Không suy luận streaming/security từ giao diện.

## Pattern decisions

| Pattern | Quyết định | Lý do |
|---|---|---|
| Nhìn thấy course/lesson tree và trạng thái tiến độ | ADOPT | Giúp người học hiểu phạm vi khóa học và tiếp tục học; dùng dữ liệu V3. |
| Gắn access state và CTA gần nội dung tương ứng | ADAPT | Dùng trạng thái derived từ backend (free preview, active access, unavailable); không biến ba chương free thành lock. |
| Chọn gói trên order page và summary checkout | ADAPT | Hợp với purchase/renewal V3; hiển thị VND, thời hạn và số tiền server trả. Provider/options chưa được quyết định. |
| Course detail có nội dung, lợi ích và sample | ADOPT | Hỗ trợ đánh giá trước mua; sample của dự án phải là nội dung được cấp phép. |
| Mobile cards xếp một cột, thumbnail trái trong lesson list | ADOPT | Scan nhanh trên màn nhỏ; giữ tap target đủ lớn. |
| 3 lesson đầu miễn phí, sau đó lock | REJECT | Đây chỉ là GWM. Khách hàng yêu cầu ba CHƯƠNG đầu free; số bài và quyền preview phải định nghĩa riêng. |
| 30-day trial, free checkout hoặc no-subscription claim | REJECT | Không có trong yêu cầu/V3; không đưa vào copy hoặc checkout dự án. |
| Lifetime product/price | REJECT | Không có tương ứng trong renewal plan V3; chỉ recurring course access theo tháng/thời hạn cần chốt. |
| Comment section trên lesson | REJECT | Không có lesson comments trong schema/API; lesson_notes là ghi chú cá nhân, khác tính năng comment. |
| Hamburger trigger dạng div không tên accessible | REJECT | Không đủ semantic/keyboard affordance; dùng button chuẩn. |

## Screenshot index

- Order: gwm-order-desktop-1440x900.png, gwm-order-fullpage-desktop.png, gwm-order-tablet-768x1024.png, gwm-order-mobile-390x844.png, gwm-order-lifetime-selected-desktop-1440x900.png.
- Course: gwm-course-a1-desktop-1440x900.png, gwm-course-a1-desktop-hero-1440x900.png, gwm-course-a1-fullpage-desktop.png, gwm-course-a1-tablet-768x1024.png, gwm-course-a1-mobile-390x844.png.
- Lessons/worksheets: gwm-lessons-a1-*; gwm-worksheets-a1-*.
- Auth/menu: gwm-login-desktop-1440x900.png, gwm-forgot-password-desktop-1440x900.png, gwm-mobile-nav-open-390x844.png.
- Lesson: gwm-lesson-1-overview-*; gwm-lesson-1-story-*.
- Checkout: gwm-checkout-free-desktop-1440x900.png, gwm-checkout-free-fullpage-desktop.png, gwm-checkout-free-tablet-768x1024.png, gwm-checkout-free-mobile-390x844.png.

## Áp dụng cho dự án

Course detail cần giải thích nội dung, mục tiêu và thời hạn; learning area cần tree theo section/lesson/exercise và progress. Three free chapters là preview access riêng theo yêu cầu, không dùng lesson 1–3 như logic mặc định. Checkout dùng giá/thời lượng VND từ backend, PENDING rõ ràng, không khẳng định quyền học cho tới webhook. Xem [screen inventory](07-SITEMAP-AND-SCREEN-INVENTORY.md) và [rule matrix](05-BUSINESS-RULE-MATRIX.md).
