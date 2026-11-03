# Homepage redesign — implementation summary

## Kết quả

Trang chủ `/` được tổ chức lại thành hành trình khám phá khóa A1.1: giới thiệu → chọn điểm bắt đầu → xem giao diện học thử → xem khóa học hiện có → tìm hiểu cách học → câu hỏi thường gặp. Giao diện dùng tiếng Việt, màu sắc và font của design system hiện tại.

Pricing lấy dữ liệu qua `usePublicCourseCatalog()` và `CourseSummaryModel`. Danh mục hiện có một khóa A1.1; giá và thời hạn truy cập chưa được xác nhận nên trang ghi rõ đang cập nhật. Không thêm khóa, giá, lời chứng thực hay kết quả học tập giả định.

## Phạm vi

- Chỉ thay đổi trang chủ và các tùy chọn trình bày dùng riêng cho trang chủ trong `PublicShell`.
- Không thay đổi backend, database, API, xác thực, thanh toán hay dữ liệu demo.
- Không commit, push hoặc deploy.

## Thành phần chính

- Hero bất đối xứng với minh họa A1.1, hai CTA và ghi chú học thử.
- Hai lối vào thật: trang khóa A1.1 và học thử.
- Ảnh chụp giao diện LMS, thẻ khóa học từ catalog, nhóm giá trị và FAQ dùng Radix Accordion.
- Footer gọn với liên kết tới các route hiện có.

## QA

Kết quả chi tiết nằm trong [TEST-RESULTS.md](./TEST-RESULTS.md), ảnh ở [screenshots/](./screenshots/). So sánh trước/sau tại [BEFORE-AFTER-COMPARISON.md](./BEFORE-AFTER-COMPARISON.md). Giới hạn nội dung được ghi ở [KNOWN-LIMITATIONS.md](./KNOWN-LIMITATIONS.md).
