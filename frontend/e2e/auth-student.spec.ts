import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'
import { mkdirSync } from 'node:fs'
import path from 'node:path'

const screenshotDir = path.resolve(
  process.cwd(),
  '..',
  'docs',
  'ui-implementation',
  'phase-2b',
  'screenshots',
)
mkdirSync(screenshotDir, { recursive: true })

async function chooseDemoAccount(page: Page, account: RegExp, navigateToLogin = true) {
  if (navigateToLogin) await page.goto('/login')
  await expect(page.getByRole('button', { name: 'Tiếp tục với tài khoản demo' })).toBeVisible()
  const select = page.getByRole('combobox', { name: 'Tài khoản demo' })
  await select.click()
  await page.getByRole('option', { name: account }).click()
  await page.getByRole('button', { name: 'Tiếp tục với tài khoản demo' }).click()
}

async function expectNoHorizontalOverflow(page: Page) {
  const excess = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)
  expect(excess).toBeLessThanOrEqual(1)
}

async function expectAxePass(page: Page, name: string) {
  await page.locator('[data-dev-controls]').evaluateAll((items) => {
    items.forEach((item) => ((item as HTMLElement).style.display = 'none'))
  })
  const result = await new AxeBuilder({ page }).analyze()
  expect(
    result.violations,
    `${name}: ${result.violations.map((item) => `${item.id} (${item.nodes.length})`).join(', ')}`,
  ).toEqual([])
}

async function capture(page: Page, file: string, fullPage = true) {
  await page.locator('[data-dev-controls]').evaluateAll((items) => {
    items.forEach((item) => ((item as HTMLElement).style.display = 'none'))
  })
  await page.screenshot({ path: path.join(screenshotDir, file), fullPage, animations: 'disabled' })
}

test('Flow A: public landing → demo login → dashboard', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  await page.goto('/')
  await page.getByRole('banner').getByRole('link', { name: 'Đăng nhập' }).click()
  await chooseDemoAccount(page, /An Trần/)
  await expect(page).toHaveURL(/\/student$/)
  await expect(
    page.getByRole('heading', { name: 'Chào An Trần, hôm nay mình học gì?' }),
  ).toBeVisible()
  await expect(page.getByText('Tài khoản demo', { exact: true }).first()).toBeVisible()
  expect(errors).toEqual([])
})

test('Flow B: register a fictional account → login without auto-authentication', async ({
  page,
}) => {
  await page.goto('/register')
  await page.getByLabel('Tên hiển thị').fill('Người học mới')
  await page.getByLabel(/Email demo/).fill('new-learner@example.test')
  await page.getByLabel(/Mật khẩu demo/).fill('temporary-demo-password')
  await page.getByLabel('Nhập lại mật khẩu').fill('temporary-demo-password')
  await page.getByRole('button', { name: 'Tạo tài khoản demo' }).click()
  await expect(page.getByText(/Không có email xác minh nào được gửi/)).toBeVisible()
  await expect(page).toHaveURL(/\/register$/)
  await page.getByRole('link', { name: 'Đến trang đăng nhập' }).click()
  await page.getByLabel('Email').fill('new-learner@example.test')
  await page.getByRole('textbox', { name: 'Mật khẩu' }).fill('temporary-demo-password')
  await page.getByRole('button', { name: 'Đăng nhập bằng thông tin demo' }).click()
  await expect(page).toHaveURL(/\/student$/)
  await expect(page.getByText('Bạn có thể khám phá khóa A1.1')).toBeVisible()
})

test('Flow C: forgot password → controlled demo reset → login', async ({ page }) => {
  await page.goto('/forgot-password')
  await page.getByLabel(/Email demo/).fill('linh.demo@learn.test')
  await page.getByRole('button', { name: 'Tạo yêu cầu mô phỏng' }).click()
  await expect(page.getByText(/Không có email thực tế được gửi/)).toBeVisible()
  await page.getByRole('link', { name: 'Tiếp tục đến trang đặt lại demo' }).click()
  await page.getByLabel('Mật khẩu demo mới').fill('new-temporary-password')
  await page.getByLabel('Nhập lại mật khẩu').fill('new-temporary-password')
  await page.getByRole('button', { name: 'Đặt lại mật khẩu demo' }).click()
  await expect(
    page.getByText(/Không có email, backend hoặc tài khoản thật nào bị tác động/),
  ).toBeVisible()
  await page.getByRole('link', { name: 'Quay lại đăng nhập' }).click()
  await page.getByLabel('Email').fill('linh.demo@learn.test')
  await page.getByRole('textbox', { name: 'Mật khẩu' }).fill('new-temporary-password')
  await page.getByRole('button', { name: 'Đăng nhập bằng thông tin demo' }).click()
  await expect(page).toHaveURL(/\/student$/)
})

test('Flow D: protected deep link returns to My Courses after demo login', async ({ page }) => {
  await page.goto('/student/courses')
  await expect(page).toHaveURL(/\/login\?returnTo=/)
  await chooseDemoAccount(page, /Minh Phạm/, false)
  await expect(page).toHaveURL(/\/student\/courses$/)
  await expect(page.getByRole('heading', { name: 'Khóa học của tôi' })).toBeVisible()
})

test('Flow E: new student explores the course and opens the free preview', async ({ page }) => {
  await chooseDemoAccount(page, /Linh Nguyễn/)
  await expect(page.getByRole('heading', { name: 'Chưa có khóa học được kích hoạt' })).toBeVisible()
  await page.getByRole('link', { name: 'Khám phá khóa học' }).first().click()
  await expect(page).toHaveURL('/courses')
  await page.getByRole('link', { name: 'Mở bài học thử' }).click()
  await expect(page).toHaveURL(/\/courses\/tieng-duc-a1-1\/preview/)
  await expect(
    page
      .getByRole('heading', {
        name: 'Tiếng Đức A1.1 · Bắt đầu giao tiếp',
        exact: true,
      })
      .first(),
  ).toBeVisible()
})

test('Flow F: active student views supplied progress and public course detail', async ({
  page,
}) => {
  await chooseDemoAccount(page, /An Trần/)
  await page.getByRole('link', { name: 'Xem tất cả' }).click()
  await expect(page).toHaveURL('/student/courses')
  await expect(page.getByText('0 / 7 bài đã hoàn thành')).toBeVisible()
  await page.getByRole('link', { name: 'Thông tin khóa học' }).click()
  await expect(page).toHaveURL('/courses/tieng-duc-a1-1')
  await expect(
    page
      .getByRole('heading', {
        name: 'Tiếng Đức A1.1 · Bắt đầu giao tiếp',
        exact: true,
      })
      .first(),
  ).toBeVisible()
})

test('Flow G: expired entitlement stays unavailable and links only to public course content', async ({
  page,
}) => {
  await chooseDemoAccount(page, /Mai Lê/)
  await page.getByRole('link', { name: 'Khóa học của tôi' }).click()
  await expect(page.getByText('Đã hết hạn').first()).toBeVisible()
  await expect(page.getByText(/Gia hạn chưa được triển khai/)).toBeVisible()
  await expect(page.locator('a[href*="/learn/"]')).toHaveCount(0)
  await page.getByRole('link', { name: 'Thông tin khóa học' }).click()
  await expect(page).toHaveURL('/courses/tieng-duc-a1-1')
})

test('Flow H: logout clears demo session and protects routes again', async ({ page }) => {
  await chooseDemoAccount(page, /An Trần/)
  await page.getByRole('button', { name: 'An Trần' }).click()
  await page.getByRole('menuitem', { name: 'Đăng xuất' }).click()
  await expect(page).toHaveURL(/\/login\?returnTo=/)
  await page.goto('/student/courses')
  await expect(page).toHaveURL(/\/login\?returnTo=/)
  await expect(page.getByRole('button', { name: 'Tiếp tục với tài khoản demo' })).toBeVisible()
})

test('Flow I: SESSION_REVOKED clears student cache and explains the redirect', async ({ page }) => {
  await chooseDemoAccount(page, /An Trần/)
  await page.getByRole('button', { name: 'Điều khiển demo' }).click()
  await page.getByRole('button', { name: 'Thu hồi phiên hiện tại rồi tải lại' }).click()
  await expect(page).toHaveURL(/\/login\?returnTo=.*sessionRevoked=1/)
  await expect(page.getByText('Phiên demo đã bị thu hồi').first()).toBeVisible()
  await expect(page.getByText(/SESSION_REVOKED/)).toBeVisible()
  await capture(page, 'session-revoked-notification.png')
})

test('Flow J: transient repository failure recovers when the student request is retried', async ({
  page,
}) => {
  await chooseDemoAccount(page, /Minh Phạm/)
  await page.getByRole('button', { name: 'Điều khiển demo' }).click()
  await page.getByRole('button', { name: 'Lần tải học viên tiếp theo bị lỗi' }).click()
  await expect(page.getByText('Chưa tải được tổng quan học tập').first()).toBeVisible()
  await page.getByRole('button', { name: 'Thử lại' }).click()
  await expect(
    page.getByRole('heading', { name: 'Chào Minh Phạm, hôm nay mình học gì?' }),
  ).toBeVisible()
})

test('auth and student routes remain responsive at desktop, tablet, and narrow mobile widths', async ({
  page,
}) => {
  const viewports = [
    { width: 1440, height: 900 },
    { width: 768, height: 1024 },
    { width: 390, height: 844 },
    { width: 320, height: 640 },
  ]
  for (const viewport of viewports) {
    await page.setViewportSize(viewport)
    await page.goto('/')
    await page.evaluate(() => window.sessionStorage.clear())
    await page.goto('/login')
    await expect(page.getByRole('button', { name: 'Tiếp tục với tài khoản demo' })).toBeVisible()
    await expectNoHorizontalOverflow(page)
    await page.goto('/register')
    await expect(page.getByRole('heading', { name: 'Đăng ký' })).toBeVisible()
    await expectNoHorizontalOverflow(page)
    await chooseDemoAccount(page, /Linh Nguyễn/)
    await expect(
      page.getByRole('heading', { name: 'Chào Linh Nguyễn, hôm nay mình học gì?' }),
    ).toBeVisible()
    await expectNoHorizontalOverflow(page)
    if (viewport.width <= 390) {
      await page.getByRole('button', { name: 'Mở điều hướng học viên' }).click()
      await expect(page.getByRole('dialog', { name: 'Khu vực học viên' })).toBeVisible()
      await page.getByRole('link', { name: 'Khóa học của tôi' }).click()
      await expect(page).toHaveURL('/student/courses')
    }
  }
})

test('keyboard auth validation and focus stay available', async ({ page }) => {
  await page.goto('/login')
  const email = page.getByLabel('Email')
  const password = page.getByRole('textbox', { name: 'Mật khẩu' })
  await email.focus()
  await page.keyboard.press('Tab')
  await expect(password).toBeFocused()
  await page.getByRole('button', { name: 'Đăng nhập bằng thông tin demo' }).click()
  await expect(page.getByText('Nhập email của bạn.')).toBeVisible()
  await expect(page.getByText('Nhập mật khẩu demo.')).toBeVisible()
})

test('axe checks and screenshot evidence cover auth, empty, populated, and expired states', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/')
  await expect(
    page.getByRole('heading', { name: 'Nói tiếng Đức bắt đầu từ lời chào.' }),
  ).toBeVisible()
  await expect(page.locator('#hero').getByRole('link', { name: 'Học thử miễn phí' })).toBeVisible()
  await expect(
    page.getByRole('heading', { name: 'Tiếng Đức A1.1 · Bắt đầu giao tiếp' }),
  ).toBeVisible()
  await capture(page, 'landing-1440x900.png')
  await expectAxePass(page, 'landing')
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/')
  await expect(
    page.getByRole('heading', { name: 'Nói tiếng Đức bắt đầu từ lời chào.' }),
  ).toBeVisible()
  await expect(page.locator('#hero').getByRole('link', { name: 'Học thử miễn phí' })).toBeVisible()
  await expect(
    page.getByRole('heading', { name: 'Tiếng Đức A1.1 · Bắt đầu giao tiếp' }),
  ).toBeVisible()
  await capture(page, 'landing-390x844.png')

  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/courses')
  await expect(
    page.getByRole('heading', { name: 'Tiếng Đức A1.1 · Bắt đầu giao tiếp' }).first(),
  ).toBeVisible()
  await capture(page, 'catalog-1440x900.png')
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/courses')
  await expect(
    page.getByRole('heading', { name: 'Tiếng Đức A1.1 · Bắt đầu giao tiếp' }).first(),
  ).toBeVisible()
  await capture(page, 'catalog-390x844.png')

  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/login')
  await expect(page.getByRole('button', { name: 'Tiếp tục với tài khoản demo' })).toBeVisible()
  await capture(page, 'login-1440x900.png')
  await expectAxePass(page, 'login')
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/login')
  await expect(page.getByRole('button', { name: 'Tiếp tục với tài khoản demo' })).toBeVisible()
  await capture(page, 'login-390x844.png')
  await page.getByRole('button', { name: 'Đăng nhập bằng thông tin demo' }).click()
  await expectAxePass(page, 'login validation')
  await capture(page, 'auth-validation.png')

  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/register')
  await expect(page.getByRole('heading', { name: 'Đăng ký' })).toBeVisible()
  await expectAxePass(page, 'registration')
  await capture(page, 'register-1440x900.png')
  await page.goto('/forgot-password')
  await expect(page.getByRole('heading', { name: 'Quên mật khẩu' })).toBeVisible()
  await expectAxePass(page, 'forgot password')
  await capture(page, 'forgot-password-1440x900.png')
  await page.getByLabel(/Email demo/).fill('linh.demo@learn.test')
  await page.getByRole('button', { name: 'Tạo yêu cầu mô phỏng' }).click()
  await page.getByRole('link', { name: 'Tiếp tục đến trang đặt lại demo' }).click()
  await expect(page.getByLabel('Mật khẩu demo mới')).toBeVisible()
  await capture(page, 'reset-password-1440x900.png')
  await expectAxePass(page, 'reset password')

  await chooseDemoAccount(page, /Linh Nguyễn/)
  await expect(
    page.getByRole('heading', { name: 'Chào Linh Nguyễn, hôm nay mình học gì?' }),
  ).toBeVisible()
  await capture(page, 'dashboard-empty-1440x900.png')
  await expectAxePass(page, 'dashboard empty')
  await page.getByRole('button', { name: 'Linh Nguyễn' }).click()
  await page.getByRole('menuitem', { name: 'Đăng xuất' }).click()
  await expect(page).toHaveURL(/\/login/)
  await expect(page.getByRole('button', { name: 'Tiếp tục với tài khoản demo' })).toBeVisible()

  await chooseDemoAccount(page, /Minh Phạm/)
  await expect(
    page.getByRole('heading', { name: 'Chào Minh Phạm, hôm nay mình học gì?' }),
  ).toBeVisible()
  await capture(page, 'dashboard-active-1440x900.png')
  await expectAxePass(page, 'dashboard populated')
  await page.getByRole('link', { name: 'Khóa học của tôi' }).click()
  await expect(page).toHaveURL(/\/student\/courses$/)
  await expect(page.getByText('2 / 7 bài đã hoàn thành')).toBeVisible()
  await expect(page.getByRole('link', { name: 'Thông tin khóa học' })).toBeVisible()
  await capture(page, 'my-courses-active-1440x900.png')
  await expectAxePass(page, 'my courses active')
  await page.getByRole('button', { name: 'Minh Phạm' }).click()
  await page.getByRole('menuitem', { name: 'Đăng xuất' }).click()
  await expect(page).toHaveURL(/\/login/)
  await expect(page.getByRole('button', { name: 'Tiếp tục với tài khoản demo' })).toBeVisible()

  await chooseDemoAccount(page, /Mai Lê/)
  await expect(
    page.getByRole('heading', { name: 'Chào Mai Lê, hôm nay mình học gì?' }),
  ).toBeVisible()
  await capture(page, 'dashboard-expired-1440x900.png')
  await page.getByRole('link', { name: 'Khóa học của tôi' }).click()
  await expect(page).toHaveURL(/\/student\/courses$/)
  await expect(page.getByRole('link', { name: 'Thông tin khóa học' })).toBeVisible()
  await expect(page.getByText('Đã hết hạn').first()).toBeVisible()
  await capture(page, 'my-courses-expired-1440x900.png')
  await expectAxePass(page, 'my courses expired')

  await page.setViewportSize({ width: 390, height: 844 })
  await page.getByRole('button', { name: 'Mở điều hướng học viên' }).click()
  await capture(page, 'student-mobile-navigation-open.png', false)
})
