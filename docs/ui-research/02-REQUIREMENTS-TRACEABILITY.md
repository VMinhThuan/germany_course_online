# Ma trận truy xuất yêu cầu

## Quy ước nguồn

- **CLIENT** — yêu cầu trực tiếp trong prompt khảo sát.
- **V3** — BACKEND TECHNICAL SPECIFICATION & DATABASE SCHEMA V3.0 - LMS, Google Docs; heading được ghi theo module/phần của tài liệu.
- **OBS-L / OBS-GWM** — quan sát trực quan Lingoni / German With Max ngày 02-11-2026; ảnh trong screenshots/.
- **REC** — khuyến nghị thiết kế, chưa phải yêu cầu đã duyệt.
- **OPEN** — chưa có bằng chứng/định nghĩa; cần người phụ trách quyết định.

| ID | Phát biểu cần truy xuất | Loại / nguồn | Tác động UX/UI | Deliverable | Ghi chú / trạng thái |
|---|---|---|---|---|---|
| R-01 | Sản phẩm học tiếng Đức, ban đầu tập trung A1.1 | CLIENT | Landing, catalog, course detail | 01, 07 | Nêu rõ phạm vi đợt đầu |
| R-02 | Ba chương đầu miễn phí, xem trước trên YouTube | CLIENT | Preview label, lesson access, CTA | 01, 05, 07, 08, 14 | Không đồng nhất với 3 lesson; cách cấp quyền backend OPEN |
| R-03 | Chương miễn phí không hiển thị như nội dung trả phí bị khóa | CLIENT | Access state riêng cho preview | 05, 07, 09 | Cần xác nhận định nghĩa “chương” với SectionType.CHAPTER |
| R-04 | Landing gần Lingoni nhưng ít section, đơn giản hơn | CLIENT + OBS-L | Cấu trúc landing gọn | 03, 07, 13 | Không sao chép thương hiệu/media |
| R-05 | Course access tổ chức gần German With Max | CLIENT + OBS-GWM | Course tree/lesson list | 04, 07 | Điều chỉnh quyền truy cập theo V3 + free preview |
| R-06 | Tone sáng, tươi; xanh đậm không phải màu chủ đạo | CLIENT | Light tokens, pastel surfaces | 09, 10 | Teal dùng điểm nhấn/CTA có kiểm tra contrast |
| R-07 | Dùng #C2E8F5 và #D1F685 làm palette đầu | CLIENT | Surface/highlight tokens | 09 | Trên trắng lần lượt 1.30:1 và 1.22:1, không đủ contrast cho chữ thường |
| R-08 | Public API: courses, detail theo slug, public settings | V3, Phần 6 – REST API | Landing/catalog/detail data | 06, 07 | Method/DTO/pagination không được chỉ định đầy đủ |
| R-09 | Roles STUDENT và ADMIN; guest không xác thực | V3, Phần 2 + Module 02 | Public vs student route guards | 05, 07, 08 | Bảng role có GUEST nhưng UserRole lưu STUDENT/ADMIN; giải thích GUEST là anonymous |
| R-10 | Không trả passwordHash; student không đổi role | V3, Module 01 – Users/Security | Profile forms/API boundary | 05, 06 | Không đưa trường hash vào DTO/view model |
| R-11 | JWT + refresh rotation + database session; một phiên hoạt động | V3, Module 02 | Login, session conflict, forced logout UX | 05, 08, 14 | NEW_LOGIN_WINS; lần gọi API bảo vệ sau đó mới bị từ chối |
| R-12 | Login mới revoke session ACTIVE cũ | V3, Module 02 – Single Session | Session notice, re-auth path | 05, 08 | Transaction và row lock; không giả định push logout thời gian thực |
| R-13 | Session revoked trả SESSION_REVOKED; client xóa auth state và điều hướng | V3, Module 02 – middleware/error | Session error page/toast/login redirect | 05, 08, 10 | HTTP 401; message backend được hiển thị an toàn |
| R-14 | Course states DRAFT/PUBLISHED/ARCHIVED | V3, Phần 2 + Module 03 | Public availability | 05, 06 | ARCHIVED không bán mới; người đã sở hữu còn quyền theo spec |
| R-15 | Hierarchy course→section→lesson→exercise→assets | V3, phần mô hình + Modules 03–08 | Catalog/course tree/learning | 06, 07, 10 | SectionType CHAPTER/EXAM_PREP; LessonType LECTURE/PRACTICE |
| R-16 | Content states DRAFT/PUBLISHED/HIDDEN | V3, Modules 04–07 | Visibility and empty states | 05, 06 | Chính sách public/student cho HIDDEN chưa đủ chi tiết |
| R-17 | Chỉ course PUBLISHED được mua; archived không bán mới | V3, Phần 5 – Purchase flow | CTA/checkout guard | 05, 07 | Backend phải enforce |
| R-18 | Pending order không cấp enrollment | V3, Phần 5 – Payment/webhook | Pending status screen | 05, 08 | Không hiển thị “đã mua” trước xác nhận webhook |
| R-19 | Webhook đúng chữ ký/số tiền, transaction, idempotency mới kích hoạt enrollment | V3, Phần 5 + Phần 8 | Payment result and retry UX | 05, 08 | UI không tự xác nhận thanh toán |
| R-20 | Enrollment unique theo user/course; status ACTIVE/REVOKED | V3, schema/constraints | My courses/access view | 05, 06 | Hết hạn suy từ expiresAt; không có EXPIRED enum |
| R-21 | Hết hạn giữ profile/progress/history nhưng khóa nội dung trả phí | V3, Phần 5 – Renewal | Expired course/renewal screen | 05, 08 | Free preview behavior khi expired OPEN |
| R-22 | Gia hạn đang active: expiry cũ + duration; hết hạn: paidAt + duration | V3, Phần 5 – Renewal | Renewal summary/confirmation | 05, 08 | UI hiển thị ngày mới từ server response |
| R-23 | PDF: xem đề trước; sau completion chỉ mở đáp án của exercise đó | V3, Phần 5 + Phần 8 – Exercise lifecycle | Exercise access states | 05, 07, 08 | Không mở answer asset từ client state giả |
| R-24 | Quiz start không lộ isCorrect; server chấm submit; attempt có trạng thái | V3, Modules 09–13 + Phần 5 | Quiz runner/result | 05, 06, 08 | Retry được nêu; attempt limit chưa nêu |
| R-25 | Lesson hoàn thành theo required exercises; nếu không có thì manual completion | V3, Phần 5 – Progress | Lesson CTA/progress | 05, 08 | Kiểm tra rule cụ thể trong V3 trước implementation |
| R-26 | Course progress = completed eligible lessons / total eligible lessons | V3, Phần 5 – Progress | Progress bar/summary | 05, 06 | Chỉ lessons countsTowardProgress=true |
| R-27 | Một note/user/lesson | V3, Module 18 – Lesson Notes + unique | Lesson note editor | 05, 06, 07 | Conflict/update semantics cần DTO xác nhận |
| R-28 | Coupon server validate; một coupon/order | V3, Phần 5 – Coupon | Checkout coupon state | 05, 08 | Exact error codes/per-user rules OPEN |
| R-29 | Expiry reminder trước 7 ngày; dedupe key | V3, Phần 8 – expiry job | Account/email expectations | 05, 14 | UI không giả lập gửi email |
| R-30 | REST standard success/error envelope | V3, Phần 6 – API conventions | Repository error normalization | 06, 10, 11 | Error details/nullability chưa đồng nhất DTO |
| R-31 | Screen inventory chỉ public/student, không Admin | CLIENT | Scope boundary | 07, 13 | API admin chỉ ghi để phân biệt, không có Admin screen |
| R-32 | 10 demo flows gồm free lesson, checkout, quiz, session, reset | CLIENT | Demo scenario coverage | 08, 11, 13 | Payment scenarios dùng mock, không giao dịch thật |
| R-33 | Typed mock, deterministic fixtures và repository swap | CLIENT | Data architecture | 11, 12 | Không tạo enum/business rule mới |
| R-34 | Khảo sát visual ở 1440×900, 768×1024, 390×844; chụp ảnh | CLIENT | Responsive evidence | 03, 04 | 42 screenshots đã lưu |
| R-35 | Dừng sau phân tích; không triển khai, commit hoặc push | CLIENT | Giới hạn phạm vi | Tất cả | Tuân thủ trong lượt này |

## Các khác biệt cần giữ rõ

1. **Ba chương miễn phí ≠ ba bài học miễn phí.** Khách hàng nói chương; V3 dùng SectionType.CHAPTER nhưng chưa có free flag. Không suy ra số lesson hoặc access rule.
2. **Enrollment hết hạn ≠ status EXPIRED.** Schema chỉ có ACTIVE/REVOKED; expired là suy luận thời gian từ expiresAt.
3. **Guest ≠ UserRole.GUEST trong database.** GUEST là anonymous UX context; enum role lưu STUDENT/ADMIN.
4. **Quan sát tham khảo ≠ requirement.** 30-day free trial, lifetime option, comment và gated lessons của GWM không được đưa vào business logic dự án.
