# Student and authentication route map

The product route table remains in `src/app/public-site/routes.tsx` and uses the existing `BrowserRouter`. Authentication and student route definitions are contributed by `src/app/auth/routes.tsx`.

| Route                    | Screen              | Access                          | Main behavior                                                    |
| ------------------------ | ------------------- | ------------------------------- | ---------------------------------------------------------------- |
| `/`                      | Public Landing      | Guest or demo student           | A1.1 catalog summary and free-preview entry.                     |
| `/courses`               | Course Catalog      | Guest or demo student           | One featured A1.1 course, public details and preview links.      |
| `/courses/:slug`         | Course Detail       | Guest or demo student           | Public course information; no purchase creates access.           |
| `/courses/:slug/preview` | Free Preview        | Guest or demo student           | Existing public preview content.                                 |
| `/login`                 | B01 Login           | Anonymous                       | Demo credentials or explicit demo persona; sanitized `returnTo`. |
| `/register`              | B02 Register        | Anonymous                       | In-memory fictional account creation; success links to login.    |
| `/forgot-password`       | B03 Forgot Password | Anonymous                       | Simulated request and controlled reset continuation.             |
| `/reset-password`        | B04 Reset Password  | Anonymous with mock token state | Repository checks token state before accepting a reset.          |
| `/student`               | E01 Dashboard       | Demo session required           | Welcome, safe continuation, progress/enrollment summary.         |
| `/student/courses`       | E02 My Courses      | Demo session required           | Enrollment/access/progress list or empty/error state.            |
| `*`                      | Public not-found    | Guest or demo student           | Existing not-found presentation.                                 |

## Route behavior

- Guests opening either student route are redirected to `/login?returnTo=...`.
- Only the two internal student destinations can be encoded into `returnTo`.
- Successful demo login returns to the intended student route; otherwise it uses `/student`.
- Auth routes remain public and already-authenticated users are forwarded to the sanitized destination.
- Logout clears the demo session and protected student query cache.
- Browser history, direct navigation, and deep-link reloads are covered by Playwright.
- Development-only `/__dev/ui-kit`, `/__dev/lms-kit`, and `/__dev/layouts/:layout` are outside `ProductionApp`; production resolves them to not-found.

No `/learn/...`, profile editor, checkout, payment, renewal, quiz, full lesson, or Admin routes are implemented.
