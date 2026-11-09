import { expect, test, type Page } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

const studentEmail = 'student.be04@example.test'
const adminEmail = 'admin.be04@example.test'
const password = 'BE04-Isolated-Test-123!'
const courseId = '660000000000000000000003'
const lessonId = '660000000000000000000005'
const fileExerciseId = '660000000000000000000006'
const quizExerciseId = '660000000000000000000007'

async function login(page: Page, email: string) {
  if (!page.url().includes('/login')) await page.goto('/login')
  await page.getByLabel('Email').fill(email)
  await page.locator('#login-password').fill(password)
  await page.getByRole('button', { name: 'Đăng nhập' }).click()
  await expect(page).not.toHaveURL(/\/login/)
}

test('guest, student purchase, admin reconciliation and learning use isolated Express + MongoDB', async ({
  page,
  browser,
}) => {
  const apiOperations: string[] = []
  page.on('request', (request) => {
    if (request.url().includes('/api/v1/'))
      apiOperations.push(`${request.method()} ${new URL(request.url()).pathname}`)
  })

  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Học tiếng Đức cùng fixture E2E' })).toBeVisible()
  await page.goto('/courses')
  await expect(page.getByText('Khóa học E2E tiếng Đức A1', { exact: true })).toBeVisible()
  await page.goto('/courses/be04-e2e-a1')
  await expect(page.getByRole('heading', { name: 'Khóa học E2E tiếng Đức A1' })).toBeVisible()
  await page.getByRole('button', { name: 'Đăng ký khóa học' }).first().click()
  await expect(page).toHaveURL(/\/login\?returnTo=/)

  await login(page, studentEmail)
  await expect(page).toHaveURL(new RegExp(`/checkout/${courseId}`))
  const refreshed = page.waitForResponse(
    (response) =>
      response.request().method() === 'POST' &&
      new URL(response.url()).pathname === '/api/v1/auth/refresh',
  )
  await page.reload()
  expect((await refreshed).ok()).toBe(true)
  const dashboardResponse = page.waitForResponse(
    (response) =>
      response.request().method() === 'GET' &&
      new URL(response.url()).pathname === '/api/v1/me/dashboard',
  )
  await page.goto('/student')
  expect((await dashboardResponse).ok()).toBe(true)
  await expect(page.getByRole('heading', { name: 'Tổng quan học tập' })).toBeVisible()
  await page.goto(`/checkout/${courseId}`)
  await expect(page.getByRole('heading', { name: 'Khóa học E2E tiếng Đức A1' })).toBeVisible()
  await page.getByLabel('Mã coupon').fill('BE04E2E10')
  await page.getByRole('button', { name: 'Áp dụng' }).click()
  await expect(page.getByText('Coupon can be applied.')).toBeVisible()
  await page.getByRole('button', { name: 'Tạo đơn PENDING' }).click()
  await expect(page).toHaveURL(/\/orders\/[^/]+\/pending$/)
  const pendingUrl = new URL(page.url())
  const orderId = pendingUrl.pathname.split('/')[2]!
  await expect(page.getByText('BANK E2E · TEST ONLY')).toBeVisible()
  await expect(page.getByText('Đang chờ chuyển khoản')).toBeVisible()

  const deniedLesson = page.waitForResponse(
    (response) =>
      response.request().method() === 'GET' &&
      new URL(response.url()).pathname === `/api/v1/learn/lessons/${lessonId}`,
  )
  await page.goto(`/learn/lessons/${lessonId}`)
  expect((await deniedLesson).status()).toBe(404)
  await expect(page.getByText('Chưa tải được dữ liệu')).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Guten Tag · bài học E2E' })).toHaveCount(0)

  await page.goto(`/orders/${orderId}/pending`)
  await page.getByRole('button', { name: 'Tôi đã chuyển khoản' }).click()
  await expect(page.getByText('Đã báo chuyển khoản · chờ Admin đối soát')).toBeVisible()
  await expect(page.getByText(/đơn vẫn PENDING/i).first()).toBeVisible()

  const adminPage = await browser.newPage()
  const adminOperations: string[] = []
  adminPage.on('request', (request) => {
    if (request.url().includes('/api/v1/'))
      adminOperations.push(`${request.method()} ${new URL(request.url()).pathname}`)
  })
  await login(adminPage, adminEmail)
  await adminPage.goto(`/admin/orders/${orderId}`)
  await expect(adminPage.getByRole('heading', { name: /Đơn / })).toBeVisible()
  await expect(adminPage.getByText('Đã báo chuyển khoản', { exact: false }).first()).toBeVisible()
  await adminPage.getByRole('button', { name: 'Duyệt đã nhận tiền' }).click()
  const approveDialog = adminPage.getByRole('alertdialog', { name: 'Duyệt đơn đã nhận tiền?' })
  await approveDialog.getByRole('button', { name: 'Duyệt đơn và cấp quyền học' }).click()
  await expect(
    adminPage.getByText('Backend đã duyệt đơn và cập nhật quyền học.').first(),
  ).toBeVisible()

  await page.goto(`/learn/lessons/${lessonId}`)
  await expect(page.getByRole('heading', { name: 'Guten Tag · bài học E2E' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Tài liệu bài tập E2E' })).toBeVisible()
  const unavailableMedia = page.waitForResponse(
    (response) =>
      response.request().method() === 'POST' &&
      new URL(response.url()).pathname === '/api/v1/learn/media-access',
  )
  await page.goto(`/learn/exercises/${fileExerciseId}`)
  await expect(page.getByRole('heading', { name: 'Lời giải của bài tập này' })).toBeVisible()
  await expect(page.getByText('Đáp án PDF (fixture E2E)')).toBeVisible()
  expect((await unavailableMedia).status()).toBe(503)
  await expect(
    page.getByText(
      'Kho lưu trữ media chưa được cấu hình. Nội dung chữ và bài quiz vẫn sử dụng được.',
    ),
  ).toBeVisible()
  await page.getByRole('button', { name: 'Đánh dấu hoàn thành' }).click()
  await expect(page.getByText('Bài tập đã hoàn thành')).toBeVisible()

  await page.goto(`/learn/lessons/${lessonId}`)
  await expect(page.getByText('Quiz E2E · lời chào')).toBeVisible()
  await page.goto(`/learn/exercises/${quizExerciseId}`)
  await page.getByRole('button', { name: 'Bắt đầu làm bài' }).click()
  await expect(page.getByText('Chọn cách nói “Tạm biệt”.')).toBeVisible()
  await page.getByRole('radio').first().check()
  await page.getByRole('button', { name: 'Nộp bài' }).click()
  await page.getByRole('alertdialog').getByRole('button', { name: 'Nộp bài' }).click()
  await expect(page).toHaveURL(/\/learn\/quizzes\/[^/]+\/result/)
  await expect(page.getByText('0 / 1 câu đúng')).toBeVisible()
  await expect(page.getByText('Đáp án đúng: Auf Wiedersehen')).toBeVisible()
  await expect(page.getByText('Bạn chưa trả lời đúng câu này.')).toBeVisible()

  await page.goto(`/learn/lessons/${lessonId}`)
  await expect(page.getByRole('button', { name: 'Hoàn thành bài học' })).toBeEnabled()
  await page.getByLabel('Nội dung ghi chú').fill('Ghi chú lưu từ E2E BE-04.')
  await page.getByRole('button', { name: 'Lưu ghi chú' }).click()
  await expect(page.getByText('Đã lưu', { exact: true })).toBeVisible()
  await page.reload()
  await expect(page.getByLabel('Nội dung ghi chú')).toHaveValue('Ghi chú lưu từ E2E BE-04.')
  await page.getByRole('button', { name: 'Hoàn thành bài học' }).click()
  await expect(page.getByRole('button', { name: 'Đã hoàn thành bài học' })).toBeVisible()

  await expect
    .poll(() => apiOperations.some((operation) => operation.includes('/checkout/quote')))
    .toBe(true)
  expect(apiOperations).toContain('POST /api/v1/orders')
  expect(apiOperations).toContain('POST /api/v1/orders/' + orderId + '/confirm-transfer')
  expect(apiOperations).toContain('GET /api/v1/me/dashboard')
  expect(apiOperations.some((operation) => operation.includes('/quiz-attempts/'))).toBe(true)
  expect(adminOperations).toContain(`POST /api/v1/admin/orders/${orderId}/approve`)
  await adminPage.close()
  await page.getByRole('button', { name: 'Tài khoản' }).click()
  await page.getByRole('menuitem', { name: 'Đăng xuất' }).click()
  await expect(page).toHaveURL(/\/login\?returnTo=/)
  expect(apiOperations).toContain('POST /api/v1/auth/logout')
})

test('registration stores a Student without creating an authenticated session', async ({
  page,
}) => {
  await page.goto('/register')
  await page.getByLabel('Họ và tên').fill('Học viên đăng ký BE-04')
  await page.getByLabel('Email').fill(`registration-${Date.now()}@example.test`)
  await page.locator('#register-password').fill(password)
  await page.locator('#register-confirm').fill(password)
  await page.getByRole('button', { name: 'Tạo tài khoản' }).click()
  await expect(page.getByRole('status').getByText('Tài khoản đã được tạo')).toBeVisible()
  await expect(page).toHaveURL(/\/register$/)
  await expect(page.getByRole('region', { name: 'Điều khiển học viên' })).toHaveCount(0)
})

test('a later login revokes the prior Student session and redirects its protected browser', async ({
  page,
  browser,
}) => {
  await login(page, studentEmail)
  const replacementPage = await browser.newPage()
  await login(replacementPage, studentEmail)
  const revokedRequest = page.waitForResponse(
    (response) =>
      response.request().method() === 'GET' &&
      new URL(response.url()).pathname === '/api/v1/me/courses',
  )
  await page.getByRole('link', { name: 'Khóa học của tôi' }).click()
  const response = await revokedRequest
  expect(response.status()).toBe(401)
  expect((await response.json()).error.code).toBe('SESSION_REVOKED')
  await expect(page).toHaveURL(/\/login\?returnTo=.*sessionRevoked=1/)
  await expect(page.getByText('Phiên đăng nhập đã bị thay thế hoặc thu hồi').first()).toBeVisible()
  await replacementPage.close()
})

test('public, authentication and Admin entry pages have no critical or serious axe violations', async ({
  page,
}) => {
  const scans: Array<{ route: string; violations: string[] }> = []
  const scan = async (route: string) => {
    const result = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze()
    scans.push({
      route,
      violations: result.violations.map(
        (violation) =>
          `${violation.impact ?? 'unknown'} ${violation.id}: ${violation.nodes.length} node(s)`,
      ),
    })
    return result.violations.filter(
      (violation) => violation.impact === 'critical' || violation.impact === 'serious',
    )
  }

  await page.goto('/')
  let severe = await scan('/')
  expect(severe, JSON.stringify(scans, null, 2)).toEqual([])

  await page.goto('/login')
  severe = await scan('/login')
  expect(severe, JSON.stringify(scans, null, 2)).toEqual([])

  await login(page, adminEmail)
  await page.goto('/admin')
  await expect(page.getByRole('heading', { name: 'Tổng quan' })).toBeVisible()
  severe = await scan('/admin')
  expect(severe, JSON.stringify(scans, null, 2)).toEqual([])
})
