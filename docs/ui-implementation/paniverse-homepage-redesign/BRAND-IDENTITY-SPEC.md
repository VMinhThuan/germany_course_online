# PAniverseDeutsch brand identity

## Tên và cách dùng

- Brand: `PAniverseDeutsch` — giữ nguyên chữ hoa/thường.
- Khóa học: `Tiếng Đức A1.1`.
- Đổi brand không làm đổi `public-demo-a11`, slug `tieng-duc-a1-1`, các lesson/section ID hoặc API.

Tên, tagline, mô tả, đường dẫn logo và bộ tạo title dùng chung nằm tại `frontend/src/config/brand.ts`. `formatDocumentTitle()` dùng dạng `Tên trang | PAniverseDeutsch`; title mặc định phân biệt rõ brand với tên khóa học.

## Hướng thị giác

Biểu tượng là nét chữ P được tạo riêng, mở về phía phải như một lối vào/hành trình học, với một điểm xanh lime nhỏ. Logo tránh icon thư viện, cờ trang trí và phong cách hoạt hình. Wordmark dùng nét đậm, rõ ở header và footer.

| Token đang dùng    |   Giá trị | Vai trò                                             |
| ------------------ | --------: | --------------------------------------------------- |
| `--brand-blue`     | `#C2E8F5` | Nền xanh nhẹ và hình khối hero.                     |
| `--brand-lime`     | `#D1F685` | Điểm nhấn nhỏ trong biểu tượng và một vài chi tiết. |
| `--action-primary` | `#006B70` | CTA và hành động chính.                             |
| `--ink-primary`    | `#203039` | Chữ tiêu đề/nội dung chính.                         |
| `--page-surface`   | `#F6FBFC` | Nền trang.                                          |

Typography giữ nguyên font local của dự án: Manrope cho display/heading và Source Sans 3 cho body/UI. Không thêm theme system.

## Asset logo

- `frontend/public/assets/brand/logo-primary.svg` — wordmark ngang cho header sáng.
- `frontend/public/assets/brand/logo-mark.svg` — biểu tượng riêng dùng ở compact contexts.
- `frontend/public/assets/brand/logo-light.svg` — wordmark cho nền tối/footer.
- `frontend/public/assets/brand/logo-dark.svg` — biến thể wordmark trên nền sáng.
- `frontend/public/assets/brand/favicon.svg`, `favicon-32x32.png`, `favicon.ico`, `apple-touch-icon.png` — biến thể favicon hình vuông; không thu nhỏ wordmark dài.
- `frontend/public/favicon.svg` — favicon hiện tại trỏ theo biểu tượng thương hiệu mới.

`BrandLogo` ở `frontend/src/shared/brand/BrandLogo.tsx` quản lý biến thể/alt text; component được dùng lại trong public, auth, student, learning, footer và showcase. E2E xác nhận ảnh ở cỡ 16 px, 32 px và wordmark header; xem [ảnh kiểm tra logo](screenshots/after-brand-scales-16-32-header.png).

## Title và metadata

`frontend/index.html` cập nhật title mặc định, description, Open Graph, Twitter title và favicon. Hook title ở các route public, auth và student dùng cùng `brandConfig`.
