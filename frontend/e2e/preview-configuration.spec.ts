import { expect, test, type Page } from '@playwright/test'

const courseId = '660000000000000000000003'
const courseSlug = 'be04-e2e-a1'
const adminEmail = 'admin.be04@example.test'
const password = 'BE04-Isolated-Test-123!'

async function login(page: Page) {
  await page.goto('/login')
  await page.getByLabel('Email').fill(adminEmail)
  await page.locator('#login-password').fill(password)
  await page.getByRole('button', { name: 'Đăng nhập' }).click()
  await expect(page).not.toHaveURL(/\/login/)
}

test('public preview and Admin configuration use the live backend', async ({
  page,
  browser,
}, testInfo) => {
  await page.goto(`/courses/${courseSlug}`)
  await expect(page.getByRole('heading', { name: 'Khóa học E2E tiếng Đức A1' })).toBeVisible()
  await expect(page.getByText('Học thử miễn phí', { exact: true }).first()).toBeVisible()
  await expect(page.getByText('Nội dung đầy đủ · cần quyền truy cập')).toBeVisible()

  await page.screenshot({
    path: testInfo.outputPath('germany-course-preview-desktop.png'),
    fullPage: true,
  })

  const mobile = await browser.newPage({ viewport: { width: 390, height: 844 } })
  await mobile.goto(`/courses/${courseSlug}`)
  await expect(mobile.getByRole('heading', { name: 'Khóa học E2E tiếng Đức A1' })).toBeVisible()
  await mobile.screenshot({
    path: testInfo.outputPath('germany-course-preview-mobile.png'),
    fullPage: true,
  })
  await mobile.close()

  await page.getByRole('link', { name: 'Học thử miễn phí' }).first().click()
  await expect(page).toHaveURL(/\/courses\/be04-e2e-a1\/preview/)
  await expect(page.getByRole('heading', { name: /Guten Tag · bài học E2E/ })).toBeVisible()

  await page.goto(`/courses/${courseSlug}`)
  await page.getByRole('button', { name: /Giới thiệu bản thân/ }).click()
  await page.getByRole('button', { name: /Ich heiße/ }).click()
  await expect(page.getByRole('dialog')).toContainText('Học thử 1 chương đầu miễn phí')
  await expect(page.getByRole('dialog')).toContainText('Đăng ký khóa học')

  await login(page)
  await page.goto(`/admin/courses/${courseId}`)
  const previewInput = page.getByLabel('Số chương học thử miễn phí')
  await expect(previewInput).toHaveValue('1')

  await previewInput.fill('0')
  await page.getByRole('button', { name: 'Lưu thay đổi' }).click()
  await expect(page.getByText('Đã lưu thông tin khóa học.')).toBeVisible()
  await expect(previewInput).toHaveValue('0')

  await previewInput.fill('1')
  await page.getByRole('button', { name: 'Lưu thay đổi' }).click()
  await expect(page.getByText('Đã lưu thông tin khóa học.')).toBeVisible()
  await expect(previewInput).toHaveValue('1')
  await page.screenshot({
    path: testInfo.outputPath('germany-course-admin-preview-desktop.png'),
    fullPage: true,
  })
})
