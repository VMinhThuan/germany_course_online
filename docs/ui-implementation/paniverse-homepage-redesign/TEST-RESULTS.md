# Test results

Ngày chạy: 2026-11-03 (giờ địa phương của workspace).

| Lệnh                         | Kết quả                                                                                                                                                                                |
| ---------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm run check`              | Pass: TypeScript typecheck, ESLint, 19 file Vitest, 121/121 unit tests, Vite production build. JSDOM có cảnh báo không triển khai `canvas.getContext()` trong Axe test; lệnh vẫn pass. |
| `npm run format:check`       | Pass: tất cả file được kiểm tra đúng Prettier.                                                                                                                                         |
| `npm run e2e -- --workers=1` | Pass: 54/54 Chromium tests, gồm auth, public routes, homepage, LMS, checkout, profile/help và mobile breakpoints. Chạy tuần tự để tránh nhiều test ghi đồng thời vào ảnh chụp.         |
| `npm run e2e:production`     | Pass: 1/1 production route/deep-link/regression test.                                                                                                                                  |
| `npm audit --json`           | Pass: 0 low/moderate/high/critical vulnerabilities trong 374 dependency.                                                                                                               |

## Homepage checks

- Đúng thứ tự section và brand ở viewport 1440×900, 1024×768, 768×1024, 390×844, 320×640.
- Không overflow ngang; header mobile mở và điều hướng tới route thật.
- Ảnh có `naturalWidth > 0`; banner/feature titles có chữ trắng trên overlay.
- Thông tin khóa học, số chương/bài và giá lấy từ model; không hiển thị giá EUR/VND hoặc kỳ hạn tự bịa.
- Footer rỗng không tạo email/phone/legal link giả.
- YouTube chỉ được request sau click; iframe/fallback và ratio được xác nhận.
- Homepage, FAQ mở rộng và menu mobile qua axe-core trong Chromium.
- Logo favicon kiểm tra ở 16 px, 32 px và wordmark ngang.

Test output của các E2E phase cũ hiện lưu trong Playwright `test-results/` theo từng test để tránh ghi đè screenshot tài liệu có sẵn. Bộ ảnh before/after riêng của redesign lưu trong `screenshots/` của tài liệu này.
