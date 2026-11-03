# Known limitations and owner input

## Dữ liệu cần xác nhận

- **Học phí và thời hạn:** public course model hiện không có `priceVnd` hoặc `accessDurationMonths`; giao diện giữ trạng thái “Học phí đang cập nhật” và “Thời hạn truy cập đang cập nhật”. Không dùng giá demo commerce làm giá công khai.
- **Thông tin khóa học:** model hiện có 4 chương/7 bài; mô tả cho biết một phần nội dung vẫn chờ xác nhận. FAQ không khẳng định đây là syllabus cuối cùng.
- **Liên hệ:** `site-contact.ts` hiện trống. Cần chủ dự án cung cấp email, phone, địa chỉ, giờ hoạt động và social URL trước khi cột Liên hệ có thông tin thật.
- **Chính sách:** chưa có điều khoản/chính sách route được xác nhận nên footer không thêm link pháp lý giả.

## Media

- Các hình người là ảnh AI-generated minh họa, không phải giáo viên/học viên thật của thương hiệu. Màn hình thiết bị trong ảnh là hình gợi ý, không phải ảnh chụp sản phẩm.
- Chromium tải được YouTube iframe và render player shell sau click. E2E không autoplay và không xác nhận phát hết stream; link “Xem trên YouTube” là đường dự phòng.
- Chưa thêm Open Graph social preview image; không bắt buộc để dùng homepage.

## Phạm vi

Homepage và global brand update đã dừng ở giao diện, title/metadata, logo, contact config và test/docs. Backend/database/API, auth behavior, payment lifecycle, enrollment và logic tiến độ không bị thay đổi. Không có commit, push hoặc deployment.
