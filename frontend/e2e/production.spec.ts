import { expect, test } from '@playwright/test'

const course = '/courses/tieng-duc-a1-1'
const preview = `${course}/preview?sectionId=a11-chapter-02&lessonId=a11-lesson-03`

test('production build serves public routes, deep links and excludes development tools', async ({
  page,
  request,
}) => {
  const runtimeErrors: string[] = []
  page.on('pageerror', (error) => runtimeErrors.push(error.message))
  page.on('console', (message) => {
    if (message.type() === 'error') runtimeErrors.push(message.text())
  })
  await page.goto('/')
  await expect(
    page.getByRole('heading', { name: 'Bắt đầu giao tiếp bằng tiếng Đức, từng bước một.' }),
  ).toBeVisible()
  await expect(
    page.getByText('Bản demo sản phẩm · Nội dung và thông tin khóa học đang được cập nhật'),
  ).toBeVisible()
  await expect(page).toHaveTitle(/Học tiếng Đức A1.1/)

  await page.goto('/courses')
  await expect(page.getByRole('heading', { name: 'Chọn điểm bắt đầu của bạn' })).toBeVisible()
  await page.reload()
  await expect(page.getByRole('heading', { name: 'Chọn điểm bắt đầu của bạn' })).toBeVisible()

  await page.goto('/login')
  await expect(page.getByRole('heading', { name: 'Đăng nhập' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Tiếp tục với tài khoản demo' })).toBeVisible()
  await expect(page.getByText('Điều khiển demo')).toHaveCount(0)
  await page.goto('/register')
  await expect(page.getByRole('heading', { name: 'Đăng ký' })).toBeVisible()
  await page.goto('/forgot-password')
  await expect(page.getByRole('heading', { name: 'Quên mật khẩu' })).toBeVisible()
  await page.getByLabel(/Email demo/).fill('linh.demo@learn.test')
  await page.getByRole('button', { name: 'Tạo yêu cầu mô phỏng' }).click()
  await page.getByRole('link', { name: 'Tiếp tục đến trang đặt lại demo' }).click()
  await expect(page.getByLabel('Mật khẩu demo mới')).toBeVisible()

  await page.goto('/student')
  await expect(page).toHaveURL(/\/login\?returnTo=/)
  await page.getByRole('combobox', { name: 'Tài khoản demo' }).click()
  await page.getByRole('option', { name: /An Trần/ }).click()
  await page.getByRole('button', { name: 'Tiếp tục với tài khoản demo' }).click()
  await expect(page).toHaveURL(/\/student$/)
  await expect(
    page.getByRole('heading', { name: 'Chào An Trần, hôm nay mình học gì?' }),
  ).toBeVisible()
  await page.reload()
  await expect(
    page.getByRole('heading', { name: 'Chào An Trần, hôm nay mình học gì?' }),
  ).toBeVisible()
  await page.goto('/student/courses')
  await expect(page.getByRole('heading', { name: 'Khóa học của tôi' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Điều khiển demo' })).toHaveCount(0)
  await page.goto('/learn/courses/course-a11-demo')
  await expect(page.getByRole('heading', { name: 'Lộ trình khóa học' })).toBeVisible()
  await page.goto('/learn/lessons/a11-lesson-01')
  await expect(page.getByRole('heading', { name: 'Guten Tag!' })).toBeVisible()
  await page.goto('/learn/exercises/exercise-a11-greeting')
  await expect(page.getByRole('heading', { name: 'Luyện nghe lời chào' })).toBeVisible()
  await page.goto('/student/progress')
  await expect(page.getByRole('heading', { name: 'Tiến độ học tập' })).toBeVisible()
  await page.goto('/student/profile')
  await expect(page.getByRole('heading', { name: 'Tài khoản học viên' })).toBeVisible()
  await page.goto('/student/security/sessions')
  await expect(page.getByRole('heading', { name: 'Phiên đăng nhập' })).toBeVisible()
  await page.goto('/student/orders')
  await expect(page.getByRole('heading', { name: 'Đơn hàng của tôi' })).toBeVisible()
  await page.getByRole('button', { name: 'An Trần' }).click()
  await page.getByRole('menuitem', { name: 'Đăng xuất' }).click()
  await expect(page).toHaveURL(/\/login/)

  await page.goto('/help')
  await expect(page.getByRole('heading', { name: 'Trợ giúp & câu hỏi thường gặp' })).toBeVisible()
  await page.goto('/login')
  await page.getByRole('combobox', { name: 'Tài khoản demo' }).click()
  await page.getByRole('option', { name: /Linh Nguyễn/ }).click()
  await page.getByRole('button', { name: 'Tiếp tục với tài khoản demo' }).click()
  await expect(page).toHaveURL(/\/student$/)
  await page.goto('/checkout/purchase-course-a11-demo')
  await expect(page.getByRole('heading', { name: 'Xác nhận đơn hàng' })).toBeVisible()
  await page.getByRole('button', { name: 'Tạo đơn demo · trạng thái chờ' }).click()
  await expect(page).toHaveURL(/\/orders\/demo-order-.*\/pending/)
  await page.getByRole('button', { name: 'Mô phỏng xác nhận thành công' }).click()
  await expect(page).toHaveURL(/\/orders\/demo-order-.*\/result/)
  await expect(page.getByRole('heading', { name: 'Thanh toán đã được xác nhận' })).toBeVisible()

  await page.goto(course)
  await expect(
    page.getByRole('heading', { name: 'Tiếng Đức A1.1 · Bắt đầu giao tiếp' }),
  ).toBeVisible()
  await page.goto(preview)
  await expect(page.getByRole('heading', { name: 'Tên của tôi là …' })).toBeVisible()
  await expect(page).toHaveURL(/sectionId=a11-chapter-02/)
  await page.reload()
  await expect(page.getByRole('heading', { name: 'Tên của tôi là …' })).toBeVisible()

  await page.setViewportSize({ width: 390, height: 844 })
  await expect(page.getByLabel('Chọn chương học thử')).toBeVisible()
  await expect(
    page.evaluate(() => document.documentElement.scrollWidth - innerWidth),
  ).resolves.toBeLessThanOrEqual(1)

  await page.goto('/__dev/ui-kit')
  await expect(page.getByRole('heading', { name: 'Không tìm thấy nội dung này' })).toBeVisible()
  await expect(page.getByText('Component showcase')).toHaveCount(0)
  await page.goto('/__dev/lms-kit')
  await expect(page.getByRole('heading', { name: 'Không tìm thấy nội dung này' })).toBeVisible()
  await expect(page.getByText('Developer scenario controller')).toHaveCount(0)

  const scriptUrls = await page.evaluate(() =>
    performance
      .getEntriesByType('resource')
      .map((entry) => entry.name)
      .filter((url) => url.includes('/assets/') && url.endsWith('.js')),
  )
  expect(scriptUrls.length).toBeGreaterThan(0)
  const bundles = await Promise.all(
    [...new Set(scriptUrls)].map(async (url) => {
      const response = await request.get(url)
      expect(response.ok()).toBeTruthy()
      return response.text()
    }),
  )
  const builtCode = bundles.join('\n')
  expect(builtCode).not.toContain('Hệ thống giao diện, sẵn sàng mở rộng.')
  expect(builtCode).not.toContain('MOCK_SCENARIO_FIXTURES')
  expect(builtCode).not.toContain('anonymous_guest')
  expect(builtCode).not.toContain('Developer scenario controller')
  expect(builtCode).not.toContain('Response repository')
  expect(builtCode).not.toContain('student-demo:scenario')
  expect(builtCode).not.toContain('student-demo:reset-state')
  expect(builtCode).not.toContain('student-demo:revoke-current-session')
  expect(builtCode).not.toContain('student-demo:invalidate-current-session')
  expect(runtimeErrors).toEqual([])
})
