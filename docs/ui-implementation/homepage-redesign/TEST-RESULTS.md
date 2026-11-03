# Kết quả kiểm tra

| Lệnh/kiểm tra                                | Kết quả                                                                                                                                                                        |
| -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `npm run check`                              | PASS — typecheck, lint, 17 file test với 114 test và production build. JSDOM phát cảnh báo `HTMLCanvasElement.getContext()` khi axe chạy; không làm test thất bại.             |
| `npm run format:check`                       | PASS — Prettier cho source và E2E. Markdown bàn giao cũng được kiểm tra riêng bằng Prettier.                                                                                   |
| `npm audit`                                  | PASS — 0 lỗ hổng.                                                                                                                                                              |
| `npm run e2e -- --workers=1 --retries=2`     | PASS — exit code 0; 51 passed, 1 flaky nhưng qua ở lần retry. Lần đầu Playwright không mở được một ảnh screenshot Phase 2A (`UNKNOWN: unknown error, open`); retry thành công. |
| `npm run e2e -- --grep homepage --workers=1` | PASS — 5/5 test sau khi thêm chờ catalog tải xong trước khi lưu ảnh responsive.                                                                                                |
| `npm run e2e:production`                     | PASS — 1/1 test, production build phục vụ được public routes và deep links.                                                                                                    |
| Axe                                          | PASS — homepage ban đầu, pricing, FAQ mở, menu mobile và trạng thái loading; trạng thái pricing lỗi được kiểm tra trong component test.                                        |

E2E kiểm tra CTA/route, catalog không có giá giả, trạng thái khách/đăng nhập, FAQ bằng bàn phím, menu mobile, axe và không tràn ngang tại 1440×900, 1024×768, 768×1024, 390×844, 320×640. Các ảnh responsive chờ khóa học từ catalog hiển thị để không ghi nhầm trạng thái tải vào ảnh toàn trang.

Ảnh được xem trực tiếp sau khi tạo: trang desktop 1440, tablet 768, mobile 390 và 320; pricing, hero, FAQ mở và menu mobile. Một lần chạy full E2E trước đó có lỗi I/O ảnh rời rạc trong screenshot của Phase 2A; lượt cuối có retry đã kết thúc với exit code 0. Không dùng kết quả test thay cho bằng chứng deploy; không deploy trong phạm vi này.
