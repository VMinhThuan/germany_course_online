# Visual reference mapping

## Nguyên tắc

Hai website tham khảo được dùng để định hướng bố cục và thứ bậc thông tin. Không lấy logo, ảnh, copy quảng cáo, đánh giá hay tài liệu học tập của họ. Ảnh trong bản triển khai được tạo riêng.

## Lingoni — hero và nhóm tính năng

| Tham khảo                                  | Áp dụng trong bản mới                                                                                                 |
| ------------------------------------------ | --------------------------------------------------------------------------------------------------------------------- |
| Nội dung hero trái, người học lớn bên phải | `PhotographicHero`: lưới desktop gần tỷ lệ 46/54, H1 ngắn, câu tiếng Đức, mô tả và CTA ở trái; ảnh học viên bên phải. |
| Ranh giới hình học giữa text và ảnh        | Nền hero dùng hai token xanh nhạt và một mặt chéo; ảnh vẫn có crop riêng, không đặt badge nổi lên mặt người.          |
| Giới thiệu đặt trên nền rộng, chữ căn giữa | `CourseIntroduction` là một section riêng, tiêu đề Việt, một dòng dịch Đức và đoạn mô tả ngắn.                        |
| Feature grid dựa trên ảnh, nhãn ngắn       | Bốn ảnh cùng tỷ lệ 16:10, lớp phủ tối phía dưới và nhãn trắng. Chỉ dùng bốn tính năng hiện có trong sản phẩm.         |
| Khoảng trắng và nhịp section rõ            | Từng section có nền trắng/xanh nhạt luân phiên nhẹ, dùng spacing từ token/utilities đang có.                          |

## German With Max — course/pricing card

| Tham khảo                      | Áp dụng trong bản mới                                                                                                                                                 |
| ------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Banner ảnh lớn ở đầu card      | Một banner ảnh thật, nhãn A1.1 và tiêu đề khóa học màu trắng trên lớp phủ tối.                                                                                        |
| Course name và mô tả ngắn      | Tiêu đề và mô tả dùng trực tiếp từ `PUBLIC_DEMO_COURSE`.                                                                                                              |
| Benefit checklist              | Bốn ý ngắn: cấu trúc theo chương, học thử, luyện tập, và tổng số chương/bài theo model.                                                                               |
| Price, access term, CTA ở cuối | Học phí/thời hạn lấy từ model; hiện không có giá và thời hạn được xác nhận nên UI hiện trạng thái cập nhật, không tạo số liệu. CTA dẫn đến trang khóa học và học thử. |

## Before/after

- Before: [Homepage desktop](screenshots/before-homepage-full-desktop-1440x900.png), [hero desktop](screenshots/before-hero-desktop-1440x900.png), [pricing](screenshots/before-pricing-desktop-1440x900.png), [benefits](screenshots/before-benefits-desktop-1440x900.png), [FAQ](screenshots/before-faq-desktop-1440x900.png), [footer](screenshots/before-footer-desktop-1440x900.png), [homepage mobile](screenshots/before-homepage-full-mobile-390x844.png).
- After: [Homepage desktop](screenshots/after-homepage-full-desktop-1440x900.png), [hero](screenshots/after-hero-desktop-1440x900.png), [feature grid](screenshots/after-learning-features-desktop-1440x900.png), [pricing](screenshots/after-pricing-desktop-1440x900.png), [benefits](screenshots/after-benefits-desktop-1440x900.png), [FAQ expanded](screenshots/after-faq-desktop-expanded-1440x900.png), [footer](screenshots/after-footer-desktop-1440x900.png), [homepage mobile](screenshots/after-homepage-mobile-full-390x844.png).

Kết quả giảm các khối nội dung lặp, thay hình minh họa chính bằng ảnh học tập, giữ một card khóa học thay vì nhiều card phức tạp, và tách FAQ/footer thành khu vực dễ quét.
