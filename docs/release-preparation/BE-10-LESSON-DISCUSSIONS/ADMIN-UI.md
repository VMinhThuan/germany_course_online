# Admin moderation UI

The Admin navigation includes **Quản lý bình luận** at `/admin/lesson-comments`. The page loads database-backed counters, bounded search/filter controls, a responsive horizontally scrollable table, a selected discussion detail and the thread tree.

The table supports content search, course/lesson/author IDs, anonymous status, active/deleted status, root/reply type, time range, order and pagination. Admin sees the real author's identity and a visible “Được đăng dưới chế độ ẩn danh” marker.

Admin can post a root comment using a lesson ID, reply to the selected thread item, react, edit with an optional reason, delete a subtree with confirmation, and inspect full previous/new content with editor identity. Admin actions are recorded by the backend Audit Log.
