# YouTubeEmbed

## API

`frontend/src/features/homepage/components/YouTubeEmbed.tsx` nhận `url`, `title`, `poster?`, `className?`.

## URL an toàn

- Hỗ trợ `youtube.com/watch?v=`, `youtu.be/`, `/embed/`, `/shorts/`, `/live/` trên danh sách hostname YouTube cho phép.
- Chỉ nhận ID đúng biểu thức 11 ký tự `[A-Za-z0-9_-]`.
- Không chuyển URL tùy ý vào iframe và không dùng `dangerouslySetInnerHTML`.
- URL iframe tạo từ ID đã xác thực: `https://www.youtube-nocookie.com/embed/{id}?rel=0`.

## Hành vi

- Ban đầu chỉ tải poster cục bộ và nút bấm có nhãn truy cập được; chưa có request tới YouTube.
- Khi click hoặc kích hoạt bằng bàn phím, mount iframe 16:9 với `loading="lazy"`, title, `allowFullScreen` và quyền cần cho player. Không thêm autoplay.
- Sau khi mount, focus được chuyển sang iframe.
- Link “Xem trên YouTube” luôn đi tới URL watch chuẩn.
- URL không hợp lệ cho trạng thái “Video giới thiệu hiện chưa sẵn sàng.” và không tạo iframe/link giả.

## Xác minh

Unit tests kiểm tra URL các dạng, host giả mạo, ID sai, URL embed, click-to-load, iframe src, fullscreen, link ngoài và không có autoplay. Chromium E2E xác nhận không có request YouTube trước click, request phát sinh sau click, iframe đúng title/src, frame ratio `16 / 9` và chụp ảnh player:

- [Poster trước khi tải](screenshots/after-youtube-overview-desktop-1440x900.png)
- [Player sau khi tải trong Chromium](screenshots/after-youtube-player-loaded-1440x900.png)

Player shell YouTube đã render trong iframe khi kiểm tra. Video không autoplay; lần xác minh này không chờ/khẳng định phát hết stream. Link xem trực tiếp được giữ làm fallback.
