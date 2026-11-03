# Asset and license manifest

## Ảnh homepage

Sáu ảnh WebP được tạo mới bằng công cụ image generation cho giao diện này, sau đó được tối ưu và lưu cục bộ. Đây là hình ảnh học tập đại diện, không phải ảnh stock lấy từ website tham khảo và không đại diện cho giáo viên/học viên thật của PAniverseDeutsch. Không hotlink ảnh ngoài.

| Tệp                                                        | Dùng ở đâu                                            | Kích thước tệp |
| ---------------------------------------------------------- | ----------------------------------------------------- | -------------: |
| `frontend/public/assets/homepage/paniverse-hero.webp`      | Hero người học ghi chú trong lúc xem bài trên laptop. |      118,028 B |
| `frontend/public/assets/homepage/feature-progress.webp`    | Feature “Học theo chương”.                            |      128,682 B |
| `frontend/public/assets/homepage/feature-interactive.webp` | Feature luyện tập và poster video.                    |      177,174 B |
| `frontend/public/assets/homepage/feature-listening.webp`   | Feature nghe và ghi chú.                              |      133,716 B |
| `frontend/public/assets/homepage/feature-worksheet.webp`   | Feature học liệu thực hành.                           |      183,286 B |
| `frontend/public/assets/homepage/course-banner-a11.webp`   | Banner card Tiếng Đức A1.1.                           |      144,852 B |

Tổng sáu WebP được homepage tải: khoảng 0.85 MB. Hero tải ưu tiên; poster và feature ảnh tải lazy. UI dùng `object-fit: cover` với crop responsive.

## Nguồn và attribution

- Nguồn: ảnh được tạo riêng bằng OpenAI image generation trong quá trình thực hiện phase.
- Không dùng ảnh, logo hoặc nội dung sở hữu bởi Lingoni hay German With Max.
- Không có thư viện ảnh stock hoặc URL ảnh bên ngoài trong homepage.
- Attribution ngoài: không áp dụng. Ảnh mang tính minh họa; không gán danh tính, chuyên môn, lời chứng thực hoặc thành tích cho người trong ảnh. Quyền sử dụng cuối cùng tuân theo điều khoản của công cụ tạo ảnh và yêu cầu của chủ dự án.
- Logo SVG/PNG/ICO là artwork mới tạo cho brand này; không có attribution bên thứ ba.

`frontend/public/assets/homepage/free-preview-ui.png` là asset demo có sẵn trước phase; homepage mới không dùng nó làm ảnh chính. Các hình trên laptop là ảnh minh họa, không cam kết nội dung giao diện thật.

## Logo/favicons

Các tệp mới nằm trong `frontend/public/assets/brand/`: `logo-primary.svg`, `logo-mark.svg`, `logo-light.svg`, `logo-dark.svg`, `favicon.svg`, `favicon-32x32.png`, `favicon.ico`, `apple-touch-icon.png`. Tất cả favicon dùng biểu tượng độc lập, không thu nhỏ wordmark.
