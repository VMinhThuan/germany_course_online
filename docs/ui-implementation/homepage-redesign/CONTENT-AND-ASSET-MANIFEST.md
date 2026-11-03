# Nội dung và tài sản

## Nội dung

- Copy trang chủ tiếng Việt đặt tại `frontend/src/features/homepage/content/homepage-content.ts`.
- Khóa học, cấp độ, mô tả, số chương/bài, thumbnail, giá và thời hạn lấy từ catalog công khai có kiểu `CourseSummaryModel`.
- A1.1 là khóa hiện có. Ba chương học thử và cấu trúc 4 chương/7 bài được trình bày theo trạng thái demo hiện tại.
- FAQ nói rõ học phí/thời hạn chưa được công bố và video chưa sẵn sàng.
- Không có lời chứng thực, thống kê học viên, cam kết đỗ thi hay giá mới được tạo.

## Tài sản hình ảnh

| Tệp                                                     | Dùng ở đâu             | Nguồn và xử lý                                                                            |
| ------------------------------------------------------- | ---------------------- | ----------------------------------------------------------------------------------------- |
| `frontend/public/demo-assets/a11-course-card.svg`       | Hero và banner pricing | Minh họa khóa A1.1 đã có trong dự án; alt text mô tả đúng cụm từ trên ảnh.                |
| `frontend/public/assets/homepage/free-preview-ui.png`   | Preview sản phẩm       | Ảnh chụp giao diện học thử của chính LMS; alt text tiếng Việt; lazy-load dưới nếp gấp.    |
| `docs/ui-implementation/homepage-redesign/screenshots/` | Bằng chứng QA          | Ảnh trước/sau do Playwright chụp ở kích thước và trạng thái được liệt kê trong test spec. |

Không hotlink tài sản từ Lingoni hoặc German With Max. Ảnh chụp tài khoản demo có thông tin định danh đã không được giữ làm tài sản homepage.

## Typography và màu

Dùng font Manrope và Source Sans 3 cùng token global. Các màu chính kế thừa pastel blue `#C2E8F5`, lime `#D1F685`, teal `#006B70`, ink `#203039` và nền `#F6FBFC`; không thêm theme hay stylesheet toàn cục mới.
