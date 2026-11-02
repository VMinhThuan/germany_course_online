# Tóm tắt khảo sát UI/UX và kiến trúc frontend

**Trạng thái:** RESEARCH & ANALYSIS ONLY · **Ngày khảo sát:** 02-11-2026 · **Phạm vi:** Student-facing và Public-facing; không bao gồm Admin UI.

## Kết luận điều hành

Nên tạo một trải nghiệm học A1.1 có ba lớp rõ ràng: landing page nhẹ và thuyết phục; danh mục/cấu trúc khóa học cho phép nhìn thấy trước nội dung; khu vực học tập thể hiện quyền truy cập và tiến độ. Ba chương đầu là **chương học thử miễn phí theo yêu cầu khách hàng**, không được trình bày như chương trả phí bị khóa. Backend V3.0 chưa định nghĩa cách cấp quyền hoặc đánh dấu ba chương này, nên cần chốt hợp đồng trước khi nối dữ liệu thật.

V3.0 mô tả mô hình LMS và nhiều luồng nghiệp vụ đủ để dựng bản demo có type, nhưng chưa phải API contract đầy đủ: phần lớn schema thiếu kiểu/nullability; danh sách endpoint không nêu method cho nhiều route, request/response DTO, pagination, filtering hay sorting. UI cần nhận view model từ tầng mapper/repository, không đọc trực tiếp Prisma/database entity.

## Bằng chứng và phạm vi

- **REQUIREMENT:** Toàn văn BACKEND TECHNICAL SPECIFICATION & DATABASE SCHEMA V3.0 - LMS đã được đọc, gồm enums, 30 entity nghiệp vụ, quan hệ, business logic, API, bảo mật và out-of-scope. Tài liệu tham chiếu: [Google Docs V3.0](https://docs.google.com/document/d/1LZo_L3l6phZsPwev63zVcH5-0g7PW2TXYAkEoiRgR7g/edit).
- **OBSERVATION:** Lingoni được khảo sát trực quan ở desktop 1440×900, tablet 768×1024, mobile 390×844; German With Max được khảo sát ở các viewport tương tự trên trang order, course A1, lessons, worksheets, login/reset, lesson và free checkout. Trang công khai; không đăng nhập, không vượt paywall, không tải tài liệu và không gửi biểu mẫu/thanh toán.
- **OBSERVATION:** 42 ảnh chụp được lưu tại docs/ui-research/screenshots/. Thời điểm và URL cụ thể nằm trong hai báo cáo audit.
- **OBSERVATION:** Workspace hiện chỉ có thư mục backend/ và frontend/ rỗng; không thấy framework, mã nguồn, package manifest hay hướng dẫn repo. Vì vậy đề xuất stack trong báo cáo là phương án khởi tạo mới theo V3.0, chưa phải mô tả implementation hiện hữu.

## Học từ các website tham khảo

| Tham khảo | ADOPT | ADAPT | REJECT |
|---|---|---|---|
| Lingoni | Hero có thông điệp, CTA, bằng chứng tin cậy; FAQ; mô tả khóa học theo nhóm lợi ích. | Rút gọn chuỗi section thành: giá trị → nội dung học → cách học → giá/CTA → FAQ. Dùng brand palette khách hàng. | Sao chép thương hiệu/media; trang quá dài; cookie overlay che nhiều nội dung; không dựa vào video nhúng lỗi thời điểm khảo sát. |
| German With Max | Cấu trúc course/lesson nhìn thấy được; thẻ khóa học và trang chi tiết; hiển thị access gate/CTA; checkout công khai có tổng tiền. | Hiển thị 3 chương A1.1 miễn phí như preview thật; có trạng thái tiến độ và access riêng; tối ưu card cho mobile. | Sao chép nội dung, tài sản, lifetime pricing, 30-day trial, logic ba lesson đầu không khóa, comment, hoặc hamburger không có semantic role. |

## Số màn hình trong inventory

Đề xuất **28 màn hình logic**, phân nhóm theo deliverable: A Public 2; B Authentication 4; C Catalog/Details 3; D Checkout/Enrollment 3; E Dashboard 2; F Learning 3; G Exercises/Quiz 3; H Progress/Notes 2; I Orders/Renewal/Account 6. Các route là đề xuất; xem [07-SITEMAP-AND-SCREEN-INVENTORY.md](07-SITEMAP-AND-SCREEN-INVENTORY.md).

## Hành trình đề xuất

1. Guest mở landing/catalog, xem course detail và ba chương học thử theo customer requirement.
2. Register → login → dashboard; khi login mới, phiên cũ mất quyền ở request bảo vệ kế tiếp.
3. Student tạo purchase/renewal order; PENDING không cấp quyền. Chỉ webhook hợp lệ xác nhận thanh toán và cấp enrollment.
4. Enrollment ACTIVE → course tree → section → lesson → exercise; tiến độ được server ghi nhận.
5. PDF exercise: xem đề trước, đánh dấu hoàn thành, sau đó mới yêu cầu đáp án của đúng exercise.
6. Quiz: start không lộ đáp án; server chấm submit; result endpoint trả kết quả. Retry mới được phép theo mô hình nhiều attempt, nhưng giới hạn/thời điểm retry chưa nêu.
7. Enrollment hết hạn vẫn giữ profile/progress/history, khóa nội dung trả phí, hiển thị renewal; cách phân biệt free preview vẫn cần quyết định.

## Design System cần xây dựng

- Light theme, pastel blue #C2E8F5 và soft lime #D1F685 làm nền/điểm nhấn; không dùng chúng làm màu chữ trên nền trắng.
- Màu chữ chính #203039; teal CTA #006B70; semantic success #2E7D32, warning #7A5A00 trên #FFF4CC, error #B42318 trên #FEF3F2, info #1F5E85 trên #EAF4FF.
- Typography, spacing, radius, shadow, breakpoints; shell public/student; accessible navigation; form controls; cards/badges; dialogs/toasts; loading/empty/error; PDF/media, learning, commerce và access-state components.
- Yêu cầu WCAG: keyboard, focus rõ, label/error liên kết, contrast text đạt ngưỡng, trạng thái không chỉ biểu đạt bằng màu, và mobile target đủ lớn.

## Rủi ro tích hợp dữ liệu/API

1. Schema chỉ ghi chi tiết kiểu cho login_events và payment_webhook_events; 28 entity còn lại chủ yếu là danh sách field, không có nullability/type đầy đủ.
2. API list gộp route, thiếu method, DTO và quy tắc phân trang/lọc/sắp xếp.
3. Chưa có contract rõ cho free-chapter preview, course/section visibility, các response access state, quiz result/pass/retry, coupon errors và payment return.
4. EnrollmentStatus chỉ ACTIVE/REVOKED; hết hạn suy ra từ expiresAt <= now, không được thêm enum EXPIRED.
5. GUEST là trạng thái chưa xác thực, không nằm trong UserRole; không tạo guest account.

## Thứ tự triển khai đề xuất

1. Chốt các P0 ở tài liệu 14 và API DTO/schema cùng backend team.
2. Chuẩn hóa route map, view models, design tokens và component contracts.
3. Dựng demo bằng mock repositories cho public/catalog và course preview.
4. Bổ sung auth/session, dashboard và learning/progress.
5. Bổ sung quiz/exercise, checkout/renewal và account.
6. Thay mock repository bằng API adapter theo contract, giữ nguyên component/presentation layer.

**Dừng tại phân tích.** Chưa tạo ứng dụng, sửa business logic, backend, database, hay commit/push.
