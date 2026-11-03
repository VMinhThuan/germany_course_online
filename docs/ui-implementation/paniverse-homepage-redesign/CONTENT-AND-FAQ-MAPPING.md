# Content and FAQ mapping

## Nội dung homepage

Copy tĩnh tập trung trong `frontend/src/features/homepage/content/homepage-content.ts`.

- Hero: “Học tiếng Đức từ những bước đầu tiên.”; “Deutsch lernen – Schritt für Schritt.”; mô tả một câu và hai CTA.
- Giới thiệu: tiêu đề tiếng Việt, bản dịch Đức, mô tả A1.1 gọn.
- Feature: học theo chương, luyện tập tương tác, nghe và ghi chú, học liệu thực hành. Đây là các hành vi thể hiện trong ứng dụng hiện tại, không có tile nào giả làm liên kết.
- Lợi ích: xem cấu trúc theo chương, thực hành gắn với bài, xem trạng thái hoàn thành, giao diện thích ứng thiết bị.
- Course card: thông tin từ `PUBLIC_DEMO_COURSE`, không tạo sản phẩm trả phí mới.

## FAQ (6 câu)

| Câu hỏi                                             | Cơ sở trả lời                                                                                        |
| --------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| Tôi có thể học thử trước khi đăng ký không?         | Ba chương được đánh dấu học thử mở trực tiếp không cần đăng nhập.                                    |
| Khóa học A1.1 gồm những nội dung nào?               | Catalog model hiện có 4 chương, 7 bài; nội dung đầy đủ vẫn cần đội ngũ xác nhận.                     |
| Tôi có thể học trên điện thoại không?               | Giao diện học thử responsive; điều này không tuyên bố mọi tài liệu bên ngoài đều có ứng dụng native. |
| Tôi xem tiến độ học tập ở đâu?                      | Không gian học viên có khu vực tiến độ; dữ liệu hiện tại thuộc bản demo.                             |
| Học phí và thời hạn truy cập đã được xác nhận chưa? | Public model chưa cung cấp hai trường; trang ghi rõ đang cập nhật.                                   |
| Khi quyền truy cập hết hạn thì sao?                 | Chính sách gia hạn chưa xác nhận nên câu trả lời không hứa kết quả/quyền lợi cụ thể.                 |

Accordion dùng Radix hiện có, một câu hỏi mở tại một thời điểm, keyboard/focus và expanded state được kiểm tra trong unit/E2E/Axe.
