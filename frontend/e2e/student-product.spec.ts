import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'
import path from 'node:path'

const phase2cShots = 'phase-2c'
const phase2dShots = 'phase-2d'
const phase2eShots = 'phase-2e'

async function login(page: Page, persona: RegExp) {
  await page.goto('/login')
  await page.getByRole('combobox', { name: 'Tài khoản demo' }).click()
  await page.getByRole('option', { name: persona }).click()
  await page.getByRole('button', { name: 'Tiếp tục với tài khoản demo' }).click()
  await expect(page).toHaveURL(/\/student$/)
}

async function expectAxePass(page: Page, label: string) {
  const result = await new AxeBuilder({ page }).analyze()
  expect(
    result.violations,
    `${label}: ${result.violations.map((item) => item.id).join(', ')}`,
  ).toEqual([])
}

async function expectNoOverflow(page: Page) {
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth - innerWidth),
  ).toBeLessThanOrEqual(1)
}

async function captureProductScreenshot(page: Page, directory: string, filename: string) {
  await page.screenshot({
    path: test.info().outputPath(`${path.basename(directory)}-${filename}`),
    fullPage: true,
    style: '[data-dev-controls] { display: none !important; }',
  })
}

test('Phase 2C: chapter, lesson notes, file solution, quiz lifecycle and shared progress', async ({
  page,
}) => {
  await login(page, /An Trần/)
  await page.goto('/learn/courses/course-a11-demo')
  await expect(page.getByRole('heading', { name: 'Lộ trình khóa học' })).toBeVisible()
  await expectAxePass(page, 'course overview')
  await page.getByRole('button', { name: 'Mở chương' }).first().click()
  await expect(page).toHaveURL(/\/learn\/courses\/course-a11-demo\/sections\//)
  await expectAxePass(page, 'course chapter')
  await page.getByRole('button', { name: /Guten Tag/ }).click()
  await expect(page).toHaveURL(/\/learn\/lessons\/a11-lesson-01/)
  await expect(page.getByRole('heading', { name: 'Guten Tag!' })).toBeVisible()
  await expectAxePass(page, 'lesson workspace')
  await captureProductScreenshot(page, phase2cShots, 'lesson-workspace-1440x900.png')

  await page.getByLabel('Nội dung ghi chú').fill('Guten Tag! là lời chào ban ngày.')
  await page.getByRole('button', { name: 'Lưu ghi chú' }).click()
  await expect(page.getByText('Đã lưu')).toBeVisible()
  await page.getByRole('link', { name: /Luyện nghe lời chào/ }).click()
  await expect(page.getByRole('heading', { name: 'Luyện nghe lời chào' })).toBeVisible()
  await expectAxePass(page, 'file exercise')
  await captureProductScreenshot(page, phase2cShots, 'exercise-file-before-complete.png')
  await page.getByRole('button', { name: 'Đánh dấu hoàn thành' }).click()
  await expect(page.getByRole('heading', { name: 'Lời giải của bài tập này' })).toBeVisible()

  await page.goto('/learn/exercises/exercise-a11-greeting-quiz')
  await expect(page.getByRole('heading', { name: 'Bài kiểm tra lời chào', level: 2 })).toBeVisible()
  await expectAxePass(page, 'quiz introduction')
  await page.getByRole('button', { name: 'Bắt đầu làm bài' }).click()
  await expect(page).toHaveURL(/\/learn\/quizzes\/demo-attempt-/)
  await page.getByLabel('Guten Morgen!').check()
  await page.getByRole('button', { name: 'Câu 2, chưa trả lời' }).click()
  await page.getByLabel('Ich heiße …').check()
  await expectAxePass(page, 'quiz in progress')
  await captureProductScreenshot(page, phase2cShots, 'quiz-in-progress-390x844.png')
  await page.getByRole('button', { name: 'Nộp bài' }).first().click()
  await expect(page.getByRole('alertdialog').getByText('Nộp bài kiểm tra?')).toBeVisible()
  await page.getByRole('alertdialog').getByRole('button', { name: 'Nộp bài' }).click()
  await expect(page).toHaveURL(/\/learn\/quizzes\/demo-attempt-.*\/result/)
  await expect(page.getByText('2 / 2 câu đúng')).toBeVisible()
  await expectAxePass(page, 'quiz result')
  const oldAttempt = page.url()
  await page.getByRole('button', { name: 'Làm bài mới' }).click()
  await expect(page).toHaveURL(/\/learn\/quizzes\/demo-attempt-[^/]+$/)
  expect(page.url()).not.toBe(oldAttempt)

  await page.goto('/student/progress')
  await expect(page.getByText('1 / 7 bài đã hoàn thành', { exact: true }).first()).toBeVisible()
  await expectAxePass(page, 'learning progress')
  await captureProductScreenshot(page, phase2cShots, 'progress-1440x900.png')
  await page.goto('/student')
  await expect(page.getByText('1 / 7 bài đã hoàn thành', { exact: true }).first()).toBeVisible()
  await page.goto('/learn/lessons/a11-lesson-01#notes')
  await expect(page.getByLabel('Nội dung ghi chú')).toHaveValue('Guten Tag! là lời chào ban ngày.')
})

test('Phase 2C: mobile learner can navigate from courses through quiz to progress', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await login(page, /An Trần/)
  await page.getByRole('button', { name: 'Mở điều hướng học viên' }).click()
  const navigation = page.getByRole('dialog', { name: 'Khu vực học viên' })
  await navigation.getByRole('link', { name: 'Khóa học của tôi' }).click()
  await expect(page).toHaveURL('/student/courses')
  await page.getByRole('link', { name: 'Vào không gian học' }).click()
  await expect(page).toHaveURL('/learn/courses/course-a11-demo')
  await page.getByRole('button', { name: 'Mở chương' }).first().click()
  await page.getByRole('button', { name: /Guten Tag/ }).click()
  await expect(page).toHaveURL('/learn/lessons/a11-lesson-01')
  await page.getByRole('link', { name: /Luyện nghe lời chào/ }).click()
  await page.getByRole('button', { name: 'Đánh dấu hoàn thành' }).click()
  await expect(page.getByRole('heading', { name: 'Lời giải của bài tập này' })).toBeVisible()
  await page.getByRole('link', { name: 'Quay lại bài học' }).click()
  await page.getByRole('link', { name: /Bài kiểm tra lời chào/ }).click()
  await page.getByRole('button', { name: 'Bắt đầu làm bài' }).click()
  await page.getByLabel('Guten Morgen!').check()
  await page.getByRole('button', { name: 'Câu 2, chưa trả lời' }).click()
  await page.getByLabel('Ich heiße …').check()
  await page.getByRole('button', { name: 'Nộp bài' }).first().click()
  await page.getByRole('alertdialog').getByRole('button', { name: 'Nộp bài' }).click()
  await expect(page.getByText('2 / 2 câu đúng')).toBeVisible()
  await page.getByRole('button', { name: 'Mở điều hướng học viên' }).click()
  await page
    .getByRole('dialog', { name: 'Khu vực học viên' })
    .getByRole('link', { name: 'Tiến độ' })
    .click()
  await expect(page).toHaveURL('/student/progress')
  await expect(page.getByText('1 / 7 bài đã hoàn thành', { exact: true }).first()).toBeVisible()
  await expectNoOverflow(page)
})

test('Phase 2C: invalid product deep links show recoverable errors and browser history restores routes', async ({
  page,
}) => {
  await login(page, /An Trần/)
  await page.goto('/learn/courses/course-a11-demo/sections/not-a-section')
  await expect(page.getByRole('alert').getByText('Chưa tải được dữ liệu demo')).toBeVisible()
  await expectAxePass(page, 'invalid section recovery')
  await page.goto('/student/orders/not-an-order')
  await expect(page.getByRole('alert').getByText('Chưa tải được dữ liệu demo')).toBeVisible()
  await page.goto('/learn/lessons/a11-lesson-01')
  await expect(page.getByRole('heading', { name: 'Guten Tag!' })).toBeVisible()
  await page.reload()
  await expect(page.getByRole('heading', { name: 'Guten Tag!' })).toBeVisible()
  await page.goBack()
  await expect(page).toHaveURL('/student/orders/not-an-order')
  await page.goForward()
  await expect(page.getByRole('heading', { name: 'Guten Tag!' })).toBeVisible()
})

test('Phase 2D: purchase, coupon, pending isolation and successful mock gateway transition', async ({
  page,
}) => {
  await login(page, /Linh Nguyễn/)
  await page.goto('/courses/tieng-duc-a1-1')
  await page.getByRole('button', { name: 'Thử quy trình mua demo' }).click()
  await expect(page).toHaveURL('/checkout/purchase-course-a11-demo')
  await expect(page.getByText('Giá và thời hạn này chỉ dùng để thử giao diện.')).toBeVisible()
  await page.getByLabel('Mã ưu đãi').fill('DEMO10')
  await page.getByRole('button', { name: 'Kiểm tra mã' }).click()
  await expect(page.getByText(/mức giảm này chỉ dùng để minh họa/)).toBeVisible()
  await expectAxePass(page, 'checkout')
  await captureProductScreenshot(page, phase2dShots, 'checkout-coupon-valid-1440x900.png')
  await page.getByRole('button', { name: 'Tạo đơn demo · trạng thái chờ' }).click()
  await expect(page).toHaveURL(/\/orders\/demo-order-.*\/pending/)
  await expect(page.getByText(/Quyền truy cập khóa học chưa được cấp/)).toBeVisible()
  await expectAxePass(page, 'pending order')
  await captureProductScreenshot(page, phase2dShots, 'order-pending.png')
  await page.getByRole('button', { name: 'Mô phỏng xác nhận thành công' }).click()
  await expect(page).toHaveURL(/\/orders\/demo-order-.*\/result/)
  await expect(page.getByRole('heading', { name: 'Thanh toán đã được xác nhận' })).toBeVisible()
  await expectAxePass(page, 'successful payment result')
  await captureProductScreenshot(page, phase2dShots, 'payment-success.png')
  await expect(page.getByRole('button', { name: 'Mở khóa học' })).toBeVisible()
  await page.getByRole('link', { name: 'Chi tiết đơn hàng' }).click()
  await expect(page).toHaveURL(/\/student\/orders\/demo-order-/)
  await expect(page.getByText('DEMO10')).toBeVisible()
  await page.goto('/student/orders')
  await expect(page.getByText('DEMO-A11-001')).toBeVisible()
})

test('Phase 2D: failed payment grants no access', async ({ page }) => {
  await login(page, /Linh Nguyễn/)
  await page.goto('/checkout/purchase-course-a11-demo')
  await page.getByRole('button', { name: 'Tạo đơn demo · trạng thái chờ' }).click()
  await page.getByRole('button', { name: 'Mô phỏng thất bại' }).click()
  await expect(page.getByRole('heading', { name: 'Chưa hoàn tất thanh toán' })).toBeVisible()
  await expect(page.getByText('Chưa có quyền truy cập khóa học')).toBeVisible()
  await expectAxePass(page, 'failed payment result')
  await captureProductScreenshot(page, phase2dShots, 'payment-failed.png')
})

test('Phase 2D: expired learner can renew from returned entitlement', async ({ page }) => {
  await login(page, /Mai Lê/)
  await page.goto('/learn/lessons/a11-lesson-01')
  await expect(page.getByRole('heading', { name: 'Quyền truy cập đã hết hạn' })).toBeVisible()
  await page.goto('/student/courses/course-a11-demo/renew')
  await expect(page.getByText(/Gói và giá bên dưới là giả định demo/)).toBeVisible()
  await expectAxePass(page, 'renewal choices')
  await captureProductScreenshot(page, phase2dShots, 'renewal-expired-390x844.png')
  await page.getByRole('button', { name: 'Chọn gói này' }).first().click()
  await expect(page).toHaveURL(/\/checkout\/renewal-course-a11-demo\?plan=/)
  await page.getByRole('button', { name: 'Tạo đơn demo · trạng thái chờ' }).click()
  await page.getByRole('button', { name: 'Mô phỏng xác nhận thành công' }).click()
  await expect(page.getByRole('heading', { name: 'Thanh toán đã được xác nhận' })).toBeVisible()
  await expect(page.getByText('Đang học · quyền truy cập demo còn hạn')).toBeVisible()
  await expectAxePass(page, 'renewal payment result')
  await captureProductScreenshot(page, phase2dShots, 'renewal-success.png')
  await page.goto('/learn/lessons/a11-lesson-01')
  await expect(page.getByRole('heading', { name: 'Guten Tag!' })).toBeVisible()
})

test('Phase 2E: profile, password session invalidation, safe session list and public help', async ({
  page,
}) => {
  await login(page, /Linh Nguyễn/)
  await page.goto('/student/profile')
  await expect(page.getByRole('heading', { name: 'Tài khoản học viên', level: 1 })).toBeVisible()
  await expectAxePass(page, 'profile')
  await captureProductScreenshot(page, phase2eShots, 'profile-1440x900.png')
  await page.getByLabel('Tên hiển thị').fill('Linh Demo Mới')
  await page.getByRole('button', { name: 'Lưu thay đổi' }).click()
  await expect(page.getByText('Đã lưu hồ sơ.')).toBeVisible()
  await page.goto('/student/security/password')
  await expect(page.getByRole('heading', { name: 'Đổi mật khẩu demo', level: 1 })).toBeVisible()
  await expectAxePass(page, 'password change')
  await captureProductScreenshot(page, phase2eShots, 'password-change-1440x900.png')
  await page.getByLabel('Mật khẩu hiện tại').fill('DemoPass123!')
  await page.getByLabel('Mật khẩu mới', { exact: true }).fill('DemoPassword456!')
  await page.getByLabel('Xác nhận mật khẩu mới', { exact: true }).fill('DemoPassword456!')
  await page.getByRole('button', { name: 'Đổi mật khẩu và kết thúc phiên' }).click()
  await expect(page).toHaveURL(/\/login\?.*sessionRevoked=1/)
  await expect(page.getByRole('status').getByText('Phiên demo đã bị thu hồi')).toBeVisible()
  await page.getByLabel('Email').fill('linh.demo@learn.test')
  await page.getByRole('textbox', { name: 'Mật khẩu' }).fill('DemoPassword456!')
  await page.getByRole('button', { name: 'Đăng nhập bằng thông tin demo' }).click()
  await expect(page).toHaveURL(/\/student\/security\/password$/)
  await page.goto('/student/security/sessions')
  await expect(page.getByRole('heading', { name: 'Phiên hiện tại' })).toBeVisible()
  await expectAxePass(page, 'sessions')
  await captureProductScreenshot(page, phase2eShots, 'sessions-1440x900.png')
  await page.goto('/help')
  await expect(page.getByRole('heading', { name: 'Trợ giúp & câu hỏi thường gặp' })).toBeVisible()
  await expectAxePass(page, 'public help')
  await page.getByRole('button', { name: 'Checkout và thanh toán có thu tiền không?' }).click()
  await expect(page.getByText(/Không. Giá và thời hạn trong checkout/)).toBeVisible()
  await expectAxePass(page, 'expanded public help FAQ')
  await captureProductScreenshot(page, phase2eShots, 'public-help-1440x900.png')
})

test('student and help routes have no horizontal overflow at 1440, 768, 390 and 320 pixels', async ({
  page,
}) => {
  await login(page, /An Trần/)
  for (const viewport of [
    { width: 1440, height: 900 },
    { width: 768, height: 1024 },
    { width: 390, height: 844 },
    { width: 320, height: 640 },
  ]) {
    await page.setViewportSize(viewport)
    for (const route of [
      '/learn/courses/course-a11-demo',
      '/learn/lessons/a11-lesson-01',
      '/learn/exercises/exercise-a11-greeting',
      '/student/progress',
      '/student/profile',
      '/student/security/sessions',
      '/help',
    ]) {
      await page.goto(route)
      await expectNoOverflow(page)
    }
  }
})
