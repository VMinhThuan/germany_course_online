# Rà soát responsive và accessibility

## Responsive

Playwright kiểm tra homepage tại 1440×900, 1024×768, 768×1024, 390×844 và 320×640; xác nhận không tràn ngang. Header dùng điều hướng rộng từ desktop và menu mobile ở các viewport dưới 1024px. Thẻ nhanh, pricing, preview, FAQ và footer chuyển sang bố cục hẹp theo không gian.

Ảnh kết quả: `after-homepage-desktop-full-1440x900.png`, `after-homepage-laptop-1024x768.png`, `after-homepage-tablet-768x1024.png`, `after-homepage-mobile-full-390x844.png`, `after-homepage-small-mobile-320x640.png`.

## Accessibility

- Heading có cấp bậc, landmark main/navigation/footer và nhãn section rõ ràng.
- FAQ dùng Radix Accordion; bài kiểm tra bàn phím mở bằng Enter và kiểm tra `aria-expanded`.
- Menu mobile được kiểm tra như dialog và đóng/chuyển route khi chọn liên kết.
- Icon trang trí được ẩn khỏi cây trợ năng; ảnh nội dung có alt tiếng Việt.
- Các trạng thái đầu trang, pricing, FAQ mở, menu mobile và loading được quét bằng axe; trạng thái pricing lỗi được kiểm tra trong component test.
- Rà bằng ảnh chụp và keyboard focus thực tế; ảnh chỉ là bằng chứng bố cục, không thay thế toàn bộ kiểm thử người dùng/screen reader.

Kết quả automation cụ thể trong [TEST-RESULTS.md](./TEST-RESULTS.md).
