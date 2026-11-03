# Footer and public contact configuration

## Contact data

`frontend/src/config/site-contact.ts` định nghĩa:

```ts
interface SiteContactConfig {
  email?: string;
  phone?: string;
  address?: string;
  businessHours?: string;
  socialLinks?: readonly { label: string; href: string }[];
}
```

Hiện `siteContact` là object rỗng vì chưa có thông tin công khai được chủ dự án xác nhận. Footer vì vậy không tạo `mailto:`, `tel:`, địa chỉ hoặc social link giả; cột Liên hệ hiển thị câu trung tính về việc bổ sung dữ liệu sau.

## Footer layout

`HomepageFooter` có bốn nhóm desktop và xếp dọc trên mobile:

1. Logo sáng, mô tả ngắn.
2. Khám phá: Trang chủ, Khóa học, Học thử.
3. Hỗ trợ: FAQ, Trợ giúp, Liên hệ, Đăng nhập hoặc Khu vực học viên.
4. Liên hệ: chỉ render trường có giá trị.

Footer cuối trang ghi năm hiện tại, brand và tên khóa học. Không có Terms/Privacy vì chưa có route/chính sách chính thức; không có social links chưa xác nhận.

## Cần chủ dự án cung cấp khi sẵn sàng

Email hỗ trợ, số điện thoại, địa chỉ, giờ hoạt động và URL social chính thức. Chỉ điền thông tin đã duyệt vào config; UI tự ẩn trường bỏ trống.
