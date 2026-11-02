# Student/Public User Journeys

**Nguyên tắc:** Mô tả UI theo các rule đã xác nhận của V3 hoặc customer requirement. Các chỗ V3 chưa có behavior được ghi **OPEN**; mock demo không được giả làm backend guarantee. Không thao tác payment thật.

## Journey map tổng quan

~~~mermaid
flowchart TD
  G[Guest landing/catalog] --> D[Course detail]
  D --> P[Three free chapter preview - customer requirement]
  D -->|Need purchase| A[Register/Login]
  A --> S[Student dashboard]
  S --> C[Course tree]
  C --> L[Lesson]
  L --> X[Exercise]
  X -->|FILE_BASED: complete| SOL[Solutions for same exercise]
  X -->|QUIZ: start and submit| Q[Server graded result]
  S --> O[Create order]
  O --> W[Pending; no access]
  W -->|Valid payment webhook| E[PAID + ACTIVE enrollment]
  E --> C
  E -->|expiresAt <= now| R[Paid assets blocked; renew available]
  R --> O
~~~

## Demo flow 1 — Guest → Course Detail → Free Lesson

1. Guest mở public landing/catalog; lấy course summary từ public API nếu có.
2. Guest mở course A1.1 detail và outline.
3. Chọn một trong ba chương đầu được khách hàng chỉ định miễn phí; hiển thị rõ “Học thử miễn phí”, không hiển thị trạng thái paid-locked.
4. Mở video YouTube preview được cho phép; media lỗi có fallback link/CTA, không tự chuyển sang paid asset.
5. **Customer requirement:** ba chương. **OPEN:** Section CHAPTER IDs, video URL/provider, public endpoint/access permission và rule khi course archived/expired chưa có trong V3.

## Demo flow 2 — Guest → Register → Login → Student Dashboard

1. Guest chọn đăng ký; form gửi fields theo register DTO sau khi backend xác nhận.
2. Backend tạo user STUDENT theo default role/status nếu hợp lệ.
3. User login; tạo session ACTIVE. Frontend không lưu hoặc hiển thị passwordHash/refreshTokenHash.
4. Điều hướng dashboard và lấy /api/v1/me, /me/courses.
5. Trạng thái lỗi: duplicate email/validation/rate limit hiển thị theo error envelope thực tế. DTO chưa có nên demo dùng fixture, không tạo rules.

## Demo flow 3 — Student → Buy Course → Payment → Enrollment Active

1. Student chọn course PUBLISHED và chưa có enrollment còn hạn.
2. UI hiển thị giá, duration, coupon result từ server; gửi request tạo order.
3. Order ở PENDING; hiển thị chờ xử lý, không mở course access.
4. Provider gửi webhook; backend xác thực chữ ký/số tiền, idempotently đánh PAID, tạo enrollment + GRANT + email job.
5. Frontend đọc trạng thái server; chỉ khi API xác nhận PAID/enrollment mới mở course.
6. Payment provider, callback/return URL và student status endpoint cần API contract.

## Demo flow 4 — Student → Course → Section → Lesson → Exercise → Quiz

1. Student session ACTIVE và enrollment đủ quyền; mở course tree.
2. Chọn section CHAPTER hoặc EXAM_PREP, lesson LECTURE hoặc PRACTICE.
3. Mở exercise FILE_BASED: tải/link đề và audio có quyền; hoàn thành xong mới gọi solutions cho exercise đó.
4. Mở QUIZ: start tạo attempt IN_PROGRESS; response không chứa isCorrect.
5. Submit selection; backend chấm, lưu snapshot, SUBMITTED và đặt exercise progress COMPLETED.
6. Result lấy từ backend. Pass threshold, hiển thị đáp án, retry limit chưa có đầy đủ định nghĩa.

## Demo flow 5 — Student → Save Progress → Continue Learning

1. Bắt đầu lesson/attempt/exercise; các trạng thái progress được server ghi nhận.
2. Required exercises: lesson chỉ complete khi tất cả exercise bắt buộc COMPLETED. Lesson không có exercise: có thể manual complete.
3. Course percent lấy từ API theo completed eligible lessons / eligible lessons có countsTowardProgress.
4. Dashboard Continue Learning mở lesson phù hợp theo dữ liệu được trả; tie-break rule/last lesson endpoint chưa có.

## Demo flow 6 — Student → Wrong Voucher / Failed Payment

1. Student nhập coupon; backend validate active/window/type/limits. UI dùng exact code/message server trả; không tự phán đoán mức giảm cuối.
2. Invalid coupon: giữ code đã nhập, báo lỗi gần field và tổng giá vẫn theo server.
3. Failed payment: order/payment status hiển thị FAILED; không tạo/không giả định enrollment.
4. Retry policy, lỗi coupon cụ thể, giới hạn theo user và payment attempt semantics đều OPEN. Demo dùng deterministic fixtures.

## Demo flow 7 — Student → Locked Lesson → Purchase CTA

1. Guest hoặc student không có access mở nội dung paid; server từ chối access protected.
2. UI giữ lại public outline nếu API cho phép và hiển thị CTA mua/renew theo trường hợp.
3. Với ba chương đầu, customer requirement override presentation: đó là free preview, không hiển thị như nội dung trả phí bị khóa.
4. UI không quyết định access và không phát signed URL nếu backend chưa cấp.

## Demo flow 8 — Student → Expired Enrollment → Renewal

1. Khi expiresAt <= server now, giữ profile, progress, quiz history; khóa video/tài liệu trả phí; renewal được phép.
2. UI hiển thị trạng thái “Đã hết hạn” dưới dạng derived view model, không giả rằng enum enrollment là EXPIRED.
3. Lấy active renewal plans. Khi paid renewal xác nhận: active enrollment cộng calendar months trên old expiry; expired enrollment tính từ paidAt.
4. Chờ webhook trước khi cập nhật quyền/expiry; hiển thị ngày kết thúc do backend trả.

## Demo flow 9 — Student → New Login Session → Previous Session Invalidated

1. Session A đang ACTIVE; login thành công từ device B.
2. Backend transaction + row lock revoke A với NEW_LOGIN, tạo session B ACTIVE.
3. Khi A gửi request bảo vệ kế tiếp, nhận 401 SESSION_REVOKED.
4. A dừng refresh, xóa auth state và điều hướng login kèm thông báo; không khẳng định server push logout tức thì.

## Demo flow 10 — Student → Forgot Password → Reset Password

1. User nhập email vào forgot form; backend tạo reset token có expiry/hash theo schema.
2. Response UI cần anti-enumeration policy; V3 không nêu nên demo chỉ cho một generic confirmation theo giả định UI, chờ backend xác nhận.
3. User mở link token, nhập mật khẩu mới; reset endpoint kiểm tra expiry/used token.
4. Thành công điều hướng login. Rate limit 429 được ánh xạ thành thông báo. Exact validation/error codes OPEN.

## Mermaid screen-flow cho auth, commerce, learning

~~~mermaid
flowchart LR
  subgraph Public
    Home[Landing] --> Catalog[Catalog]
    Catalog --> Detail[Course detail]
    Detail --> Preview[Free chapter preview]
    Detail --> Login[Login / Register]
  end
  subgraph Purchase
    Login --> Checkout[Checkout]
    Checkout --> Pending[Order PENDING]
    Pending --> Paid[Webhook confirms PAID]
    Paid --> Enrolled[Enrollment active]
  end
  subgraph Learning
    Enrolled --> Tree[Course tree]
    Tree --> Lesson[Lesson]
    Lesson --> File[PDF exercise]
    File -->|complete| Answers[Answers for exercise]
    Lesson --> Quiz[Quiz attempt]
    Quiz --> Result[Server result]
    Enrolled -->|expiresAt <= now| Expired[Paid assets locked]
    Expired --> Renewal[Renewal checkout]
    Renewal --> Pending
  end
~~~

## Journey acceptance notes for a mock demo

- Mỗi bước lấy fixture nhất quán giữa course, section, lesson, exercise, assets, progress, enrollment và order.
- `PENDING` không cấp quyền; chỉ scenario webhook-success mới chuyển trạng thái fixture sang PAID/enrolled.
- Login mới làm session cũ revoked; lần gọi protected tiếp theo mới mô phỏng SESSION_REVOKED.
- Error case lấy từ list status chuẩn V3; chi tiết code chưa được bịa.
- Ba free chapters được gắn rõ là CLIENT requirement và mock-only cho đến khi API/schema có hợp đồng.
